use crate::util::error::AppError;
use std::path::PathBuf;
use tokio::fs;

#[tauri::command]
pub async fn read_text_file(path: String) -> Result<String, AppError> {
    let p = PathBuf::from(&path);
    let bytes = fs::read(&p).await.map_err(AppError::from)?;
    String::from_utf8(bytes).map_err(|e| AppError::Other(e.to_string()))
}

#[tauri::command]
pub async fn write_text_file(path: String, contents: String) -> Result<(), AppError> {
    let p = PathBuf::from(&path);
    if let Some(parent) = p.parent() {
        fs::create_dir_all(parent).await.map_err(AppError::from)?;
    }
    let tmp = p.with_extension("tmp");
    fs::write(&tmp, contents.as_bytes()).await.map_err(AppError::from)?;
    fs::rename(&tmp, &p).await.map_err(AppError::from)?;
    Ok(())
}

#[tauri::command]
pub async fn create_dir(path: String) -> Result<(), AppError> {
    fs::create_dir_all(&path).await.map_err(AppError::from)
}

#[tauri::command]
pub async fn move_path(from: String, to: String) -> Result<(), AppError> {
    let to_pb = PathBuf::from(&to);
    if let Some(parent) = to_pb.parent() {
        fs::create_dir_all(parent).await.map_err(AppError::from)?;
    }
    fs::rename(&from, &to).await.map_err(AppError::from)
}

#[tauri::command]
pub async fn delete_path(path: String) -> Result<(), AppError> {
    let p = PathBuf::from(&path);
    let meta = fs::metadata(&p).await.map_err(AppError::from)?;
    if meta.is_dir() {
        fs::remove_dir_all(&p).await.map_err(AppError::from)
    } else {
        fs::remove_file(&p).await.map_err(AppError::from)
    }
}
