use crate::services::watcher::WatcherRegistry;
use crate::util::error::AppError;
use serde::Serialize;
use std::path::PathBuf;
use tauri::{AppHandle, State};
use walkdir::WalkDir;

#[derive(Debug, Serialize)]
pub struct WorkspaceEntry {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
}

#[derive(Debug, Serialize)]
pub struct WorkspaceNode {
    pub path: String,
    pub name: String,
    pub is_dir: bool,
    pub size: u64,
    pub mtime_ms: i64,
    pub children: Vec<WorkspaceNode>,
}

const MAX_DEPTH: usize = 12;

#[tauri::command]
pub async fn open_workspace(path: String) -> Result<String, AppError> {
    let p = PathBuf::from(&path);
    if !p.exists() || !p.is_dir() {
        return Err(AppError::Other(format!("Not a directory: {path}")));
    }
    Ok(p.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn list_workspace(path: String) -> Result<Vec<WorkspaceEntry>, AppError> {
    let mut entries = Vec::new();
    let mut rd = tokio::fs::read_dir(&path).await.map_err(AppError::from)?;
    while let Some(e) = rd.next_entry().await.map_err(AppError::from)? {
        let meta = e.metadata().await.map_err(AppError::from)?;
        let p = e.path();
        let name = e.file_name().to_string_lossy().to_string();
        if name.starts_with('.') {
            continue;
        }
        entries.push(WorkspaceEntry {
            path: p.to_string_lossy().to_string(),
            name,
            is_dir: meta.is_dir(),
        });
    }
    entries.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.cmp(&b.name)));
    Ok(entries)
}

#[tauri::command]
pub async fn workspace_tree(path: String) -> Result<WorkspaceNode, AppError> {
    let root = PathBuf::from(&path);
    let root_meta = std::fs::metadata(&root).map_err(AppError::from)?;
    if !root_meta.is_dir() {
        return Err(AppError::Other(format!("Not a directory: {path}")));
    }

    // Walk lazily and assemble a tree. We pre-collect entries (skipping hidden
    // and common heavy dirs) and then build the structure.
    let mut node = WorkspaceNode {
        path: root.to_string_lossy().to_string(),
        name: root
            .file_name()
            .map(|s| s.to_string_lossy().to_string())
            .unwrap_or_else(|| "/".into()),
        is_dir: true,
        size: 0,
        mtime_ms: mtime_ms_of(&root_meta),
        children: Vec::new(),
    };

    build_children(&root, &mut node, 0)?;
    Ok(node)
}

fn build_children(dir: &PathBuf, parent: &mut WorkspaceNode, depth: usize) -> Result<(), AppError> {
    if depth >= MAX_DEPTH {
        return Ok(());
    }
    let walker = WalkDir::new(dir).min_depth(1).max_depth(1).follow_links(false);
    let mut entries: Vec<_> = walker
        .into_iter()
        .filter_map(Result::ok)
        .filter(|e| {
            let name = e.file_name().to_string_lossy();
            !name.starts_with('.')
                && name != "node_modules"
                && name != "target"
                && name != "dist"
                && name != "build"
        })
        .collect();
    entries.sort_by(|a, b| {
        let ad = a.file_type().is_dir();
        let bd = b.file_type().is_dir();
        bd.cmp(&ad).then(a.file_name().cmp(b.file_name()))
    });
    for e in entries {
        let meta = match e.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let mut child = WorkspaceNode {
            path: e.path().to_string_lossy().to_string(),
            name: e.file_name().to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
            size: meta.len(),
            mtime_ms: mtime_ms_of(&meta),
            children: Vec::new(),
        };
        if child.is_dir {
            let child_path = e.path().to_path_buf();
            build_children(&child_path, &mut child, depth + 1)?;
        }
        parent.children.push(child);
    }
    Ok(())
}

fn mtime_ms_of(meta: &std::fs::Metadata) -> i64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}

#[tauri::command]
pub async fn watch_workspace(
    path: String,
    app: AppHandle,
    registry: State<'_, WatcherRegistry>,
) -> Result<(), AppError> {
    let p = PathBuf::from(&path);
    registry
        .start(p, app)
        .map_err(|e| AppError::Other(format!("watch failed: {e}")))
}

#[tauri::command]
pub async fn unwatch_workspace(
    path: String,
    registry: State<'_, WatcherRegistry>,
) -> Result<(), AppError> {
    let p = PathBuf::from(&path);
    registry.stop(&p);
    Ok(())
}
