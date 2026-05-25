use notify::{
    event::{ModifyKind, RenameMode},
    Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher,
};
use parking_lot::Mutex;
use serde::Serialize;
use std::{collections::HashMap, path::PathBuf, sync::Arc};
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, Serialize)]
#[serde(tag = "kind", rename_all = "snake_case")]
pub enum WatchEvent {
    Created { path: String },
    Modified { path: String },
    Deleted { path: String },
    Renamed { from: String, to: String },
}

/// Tauri-managed state holding active watchers keyed by workspace root.
#[derive(Default)]
pub struct WatcherRegistry {
    inner: Mutex<HashMap<PathBuf, RecommendedWatcher>>,
}

impl WatcherRegistry {
    pub fn start(&self, root: PathBuf, app: AppHandle) -> notify::Result<()> {
        if self.inner.lock().contains_key(&root) {
            return Ok(());
        }
        let app = Arc::new(app);
        let watcher_app = app.clone();
        let mut watcher = notify::recommended_watcher(move |res: notify::Result<Event>| {
            if let Ok(event) = res {
                for ev in translate(&event) {
                    let _ = watcher_app.emit("inkstone://fs-event", &ev);
                }
            }
        })?;
        watcher.configure(Config::default().with_compare_contents(false))?;
        watcher.watch(&root, RecursiveMode::Recursive)?;
        self.inner.lock().insert(root, watcher);
        Ok(())
    }

    pub fn stop(&self, root: &PathBuf) {
        if let Some(mut w) = self.inner.lock().remove(root) {
            let _ = w.unwatch(root);
        }
    }
}

fn translate(event: &Event) -> Vec<WatchEvent> {
    let paths: Vec<String> = event
        .paths
        .iter()
        .map(|p| p.to_string_lossy().to_string())
        .collect();
    match event.kind {
        EventKind::Create(_) => paths
            .into_iter()
            .map(|p| WatchEvent::Created { path: p })
            .collect(),
        EventKind::Modify(ModifyKind::Name(RenameMode::Both)) if paths.len() >= 2 => {
            vec![WatchEvent::Renamed {
                from: paths[0].clone(),
                to: paths[1].clone(),
            }]
        }
        EventKind::Modify(_) => paths
            .into_iter()
            .map(|p| WatchEvent::Modified { path: p })
            .collect(),
        EventKind::Remove(_) => paths
            .into_iter()
            .map(|p| WatchEvent::Deleted { path: p })
            .collect(),
        _ => Vec::new(),
    }
}
