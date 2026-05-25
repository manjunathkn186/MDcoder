use std::path::{Path, PathBuf};

/// Resolve an arbitrary input path against the workspace root, refusing any
/// path that escapes the root after canonicalization.
pub fn ensure_in_root(root: &Path, candidate: &Path) -> std::io::Result<PathBuf> {
    let candidate = if candidate.is_absolute() {
        candidate.to_path_buf()
    } else {
        root.join(candidate)
    };
    let canon = dunce_canonicalize(&candidate)?;
    let canon_root = dunce_canonicalize(root)?;
    if !canon.starts_with(&canon_root) {
        return Err(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            format!("Path {canon:?} escapes workspace root {canon_root:?}"),
        ));
    }
    Ok(canon)
}

fn dunce_canonicalize(p: &Path) -> std::io::Result<PathBuf> {
    // `std::fs::canonicalize` returns UNC paths on Windows; tolerate but keep simple.
    std::fs::canonicalize(p)
}
