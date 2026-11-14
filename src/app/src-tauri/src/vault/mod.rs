//! The open vault and the Tauri commands that operate on it.

pub mod guard;
pub mod ops;

use guard::VaultRoot;
use ops::{Entry, Written};
use std::path::PathBuf;
use std::sync::RwLock;
use tauri::State;

#[derive(Default)]
pub struct VaultState {
    root: RwLock<Option<VaultRoot>>,
}

impl VaultState {
    pub fn with<T>(&self, f: impl FnOnce(&VaultRoot) -> Result<T, String>) -> Result<T, String> {
        let guard = self
            .root
            .read()
            .map_err(|_| "The vault state is unavailable.".to_string())?;
        match guard.as_ref() {
            Some(root) => f(root),
            None => Err("No vault is open.".to_string()),
        }
    }

    pub fn set(&self, root: VaultRoot) -> Result<(), String> {
        let mut guard = self
            .root
            .write()
            .map_err(|_| "The vault state is unavailable.".to_string())?;
        *guard = Some(root);
        Ok(())
    }
}

/// Opens an existing folder as the vault. Returns the canonical absolute path
/// for display (machine-local, never written to the vault).
#[tauri::command]
pub fn vault_open(path: String, state: State<'_, VaultState>) -> Result<String, String> {
    let root = VaultRoot::open(&PathBuf::from(&path)).map_err(|e| e.to_string())?;
    let display = display_path(root.path());
    state.set(root)?;
    Ok(display)
}

#[tauri::command]
pub fn vault_root(state: State<'_, VaultState>) -> Option<String> {
    state.with(|r| Ok(display_path(r.path()))).ok()
}

#[tauri::command]
pub fn vault_scan(
    prefix: Option<String>,
    state: State<'_, VaultState>,
) -> Result<Vec<Entry>, String> {
    state.with(|r| ops::scan(r, prefix.as_deref().unwrap_or("")))
}

#[tauri::command]
pub fn list_dir(path: String, state: State<'_, VaultState>) -> Result<Vec<Entry>, String> {
    state.with(|r| ops::list_dir(r, &path))
}

#[tauri::command]
pub fn read_text(path: String, state: State<'_, VaultState>) -> Result<String, String> {
    state.with(|r| ops::read_text(r, &path))
}

#[tauri::command]
pub fn write_text_atomic(
    path: String,
    content: String,
    state: State<'_, VaultState>,
) -> Result<Written, String> {
    state.with(|r| ops::write_text_atomic(r, &path, &content))
}

#[tauri::command]
pub fn ensure_dirs(
    paths: Vec<String>,
    state: State<'_, VaultState>,
) -> Result<Vec<String>, String> {
    state.with(|r| ops::ensure_dirs(r, &paths))
}

#[tauri::command]
pub fn move_to_archive(path: String, state: State<'_, VaultState>) -> Result<String, String> {
    state.with(|r| ops::move_to_archive(r, &path))
}

#[tauri::command]
pub fn copy_into_vault(
    source: String,
    dest: String,
    overwrite: Option<bool>,
    state: State<'_, VaultState>,
) -> Result<Written, String> {
    state.with(|r| {
        ops::copy_into_vault(
            r,
            &PathBuf::from(&source),
            &dest,
            overwrite.unwrap_or(false),
        )
    })
}

/// Strips the Windows `\\?\` verbatim prefix that canonicalize adds, so the UI
/// shows the path the user recognizes.
pub fn display_path(path: &std::path::Path) -> String {
    let s = path.display().to_string();
    if let Some(rest) = s.strip_prefix(r"\\?\UNC\") {
        format!(r"\\{rest}")
    } else if let Some(rest) = s.strip_prefix(r"\\?\") {
        rest.to_string()
    } else {
        s
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    #[test]
    fn display_path_strips_verbatim_prefixes() {
        assert_eq!(display_path(Path::new(r"\\?\D:\Vault")), r"D:\Vault");
        assert_eq!(
            display_path(Path::new(r"\\?\UNC\nas\share\Vault")),
            r"\\nas\share\Vault"
        );
        assert_eq!(display_path(Path::new("/home/a/Vault")), "/home/a/Vault");
    }

    #[test]
    fn state_requires_an_open_vault() {
        let state = VaultState::default();
        assert_eq!(state.with(|_| Ok(1)), Err("No vault is open.".to_string()));
        let tmp = guard::test_support::TempDir::new("state");
        state.set(VaultRoot::open(tmp.path()).unwrap()).unwrap();
        assert_eq!(state.with(|_| Ok(1)), Ok(1));
    }
}
