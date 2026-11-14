//! The open vault and the Tauri commands that operate on it.

pub mod guard;
pub mod ops;

use guard::VaultRoot;
use ops::{Entry, Written};
use serde::Serialize;
use std::path::{Path, PathBuf};
use std::sync::RwLock;
use tauri::{AppHandle, Manager, Runtime, State};

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

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Opened {
    pub root: String,
    pub watch: crate::watch::WatchMode,
}

/// Opens an existing folder as the vault and starts watching it. `root` is the
/// canonical absolute path for display (machine-local, never written to the
/// vault).
#[tauri::command]
pub fn vault_open(
    path: String,
    app: AppHandle,
    state: State<'_, VaultState>,
    watch_state: State<'_, crate::watch::WatchState>,
) -> Result<Opened, String> {
    let root = VaultRoot::open(&PathBuf::from(&path)).map_err(|e| e.to_string())?;
    let display = display_path(root.path());
    allow_previews(&app, root.path())?;
    let watch = crate::watch::start(&app, &watch_state, &root);
    state.set(root)?;
    Ok(Opened {
        root: display,
        watch,
    })
}

/// Lets the webview load images and video from the open vault through the
/// asset protocol (`convertFileSrc`). Nothing outside the vault is allowed.
/// Tauri's scope has no "un-allow", so a vault opened earlier in the same
/// session stays previewable until restart.
pub fn allow_previews<R: Runtime, M: Manager<R>>(app: &M, root: &Path) -> Result<(), String> {
    app.asset_protocol_scope()
        .allow_directory(root, true)
        .map_err(|e| format!("Could not enable previews for the vault: {e}"))
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
    fn previews_are_limited_to_the_open_vault() {
        let tmp = guard::test_support::TempDir::new("assets");
        let vault = tmp.path().join("Vault");
        let outside = tmp.path().join("Outside");
        std::fs::create_dir_all(vault.join("_Projects/P/04_WIP")).unwrap();
        std::fs::create_dir_all(&outside).unwrap();
        std::fs::write(vault.join("_Projects/P/04_WIP/draft.png"), "png").unwrap();
        std::fs::write(outside.join("secret.png"), "png").unwrap();

        let app = tauri::test::mock_app();
        let root = VaultRoot::open(&vault).unwrap();
        let scope = app.asset_protocol_scope();
        assert!(!scope.is_allowed(vault.join("_Projects/P/04_WIP/draft.png")));
        allow_previews(&app, root.path()).unwrap();
        assert!(scope.is_allowed(vault.join("_Projects/P/04_WIP/draft.png")));
        assert!(scope.is_allowed(display_path(
            &root.path().join("_Projects/P/04_WIP/draft.png")
        )));
        assert!(!scope.is_allowed(outside.join("secret.png")));
        assert!(!scope.is_allowed(vault.join("../Outside/secret.png")));

        #[cfg(windows)]
        {
            let link = vault.join("junction");
            let ok = std::process::Command::new("cmd")
                .args(["/C", "mklink", "/J"])
                .arg(&link)
                .arg(&outside)
                .output()
                .unwrap()
                .status
                .success();
            assert!(ok);
            assert!(!scope.is_allowed(link.join("secret.png")));
        }
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
