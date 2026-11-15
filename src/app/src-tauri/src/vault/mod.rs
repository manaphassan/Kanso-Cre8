//! The open vault and the Tauri commands that operate on it.

pub mod guard;
pub mod ops;
pub mod retire;

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

/// Why a folder could not be opened as the vault. `code` drives the startup
/// gate (`missing_root`, `not_a_folder`, `not_writable`).
#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
pub struct OpenError {
    pub code: &'static str,
    pub message: String,
}

impl OpenError {
    fn new(code: &'static str, message: String) -> Self {
        Self { code, message }
    }
}

/// Resolves `path` (absolute, or relative to the app folder in portable mode),
/// optionally creates it, and checks it is a writable folder.
pub fn open_checked(path: &str, create: bool, app_dir: &Path) -> Result<VaultRoot, OpenError> {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return Err(OpenError::new(
            "missing_root",
            "Choose a folder for the vault.".into(),
        ));
    }
    let target = {
        let p = PathBuf::from(trimmed);
        if p.is_absolute() {
            p
        } else {
            app_dir.join(p)
        }
    };
    if !target.exists() {
        if !create {
            return Err(OpenError::new(
                "missing_root",
                format!("Vault folder not found: {}", target.display()),
            ));
        }
        std::fs::create_dir_all(&target).map_err(|e| {
            OpenError::new(
                "missing_root",
                format!("Could not create {}: {e}", target.display()),
            )
        })?;
    }
    if !target.is_dir() {
        return Err(OpenError::new(
            "not_a_folder",
            format!("{} is a file, not a folder.", target.display()),
        ));
    }
    let probe = target.join(format!(".kanso-probe-{}", std::process::id()));
    std::fs::write(&probe, b"ok")
        .and_then(|_| std::fs::remove_file(&probe))
        .map_err(|e| {
            OpenError::new(
                "not_writable",
                format!("The vault folder is not writable: {e}"),
            )
        })?;
    VaultRoot::open(&target).map_err(|e| OpenError::new("missing_root", e.to_string()))
}

/// Opens a folder as the vault and starts watching it. `root` is the
/// canonical absolute path for display (machine-local, never written to the
/// vault).
#[tauri::command]
pub fn vault_open(
    path: String,
    create: Option<bool>,
    app: AppHandle,
    paths: State<'_, crate::paths::AppPaths>,
    state: State<'_, VaultState>,
    watch_state: State<'_, crate::watch::WatchState>,
) -> Result<Opened, OpenError> {
    let root = open_checked(&path, create.unwrap_or(false), &paths.app_dir)?;
    let display = display_path(root.path());
    allow_previews(&app, root.path()).map_err(|m| OpenError::new("not_writable", m))?;
    let watch = crate::watch::start(&app, &watch_state, &root);
    state
        .set(root)
        .map_err(|m| OpenError::new("missing_root", m))?;
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

/// Raw-body command: the webview sends the bytes as the IPC body and the
/// vault-relative path (URI-encoded) in the `x-vault-path` header, so large
/// uploads are not inflated into JSON or base64.
#[tauri::command]
pub fn write_bytes_atomic(
    request: tauri::ipc::Request<'_>,
    state: State<'_, VaultState>,
) -> Result<Written, String> {
    let tauri::ipc::InvokeBody::Raw(bytes) = request.body() else {
        return Err("Expected the file bytes as the request body.".into());
    };
    let header = |name: &str| {
        request
            .headers()
            .get(name)
            .and_then(|v| v.to_str().ok())
            .map(percent_decode)
    };
    let path = header("x-vault-path").ok_or("Missing x-vault-path header.")??;
    let overwrite = header("x-overwrite").and_then(Result::ok).as_deref() == Some("true");
    state.with(|r| ops::write_bytes(r, &path, bytes, overwrite))
}

#[tauri::command]
pub fn copy_within(
    from: String,
    to: String,
    overwrite: Option<bool>,
    state: State<'_, VaultState>,
) -> Result<Written, String> {
    state.with(|r| ops::copy_within(r, &from, &to, overwrite.unwrap_or(false)))
}

/// Decodes `%XX` escapes (what `encodeURIComponent` produces) as UTF-8.
pub fn percent_decode(s: &str) -> Result<String, String> {
    let bytes = s.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' {
            let hex = s.get(i + 1..i + 3).ok_or("Bad escape in path.")?;
            out.push(u8::from_str_radix(hex, 16).map_err(|_| "Bad escape in path.")?);
            i += 3;
        } else {
            out.push(bytes[i]);
            i += 1;
        }
    }
    String::from_utf8(out).map_err(|_| "Path is not valid UTF-8.".to_string())
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
    fn open_checked_creates_resolves_and_reports_codes() {
        let tmp = guard::test_support::TempDir::new("open");
        let app_dir = tmp.path().join("App");
        std::fs::create_dir_all(&app_dir).unwrap();

        let missing = open_checked("Vault", false, &app_dir).unwrap_err();
        assert_eq!(missing.code, "missing_root");
        let created = open_checked("Vault", true, &app_dir).unwrap();
        assert!(created.path().ends_with("Vault"));
        assert!(
            app_dir.join("Vault").is_dir(),
            "relative paths resolve against the app folder"
        );
        let probe_left = std::fs::read_dir(app_dir.join("Vault")).unwrap().count();
        assert_eq!(probe_left, 0, "probe file must be removed");

        let abs = tmp.path().join("Elsewhere");
        let opened = open_checked(&abs.display().to_string(), true, &app_dir).unwrap();
        assert!(opened.path().ends_with("Elsewhere"));

        std::fs::write(tmp.path().join("file.txt"), "x").unwrap();
        let file = open_checked(
            &tmp.path().join("file.txt").display().to_string(),
            false,
            &app_dir,
        );
        assert_eq!(file.unwrap_err().code, "not_a_folder");
        assert_eq!(
            open_checked("  ", true, &app_dir).unwrap_err().code,
            "missing_root"
        );
    }

    #[test]
    fn percent_decode_handles_utf8_and_rejects_garbage() {
        assert_eq!(
            percent_decode("_Projects%2F2026%2FCaf%C3%A9.png").unwrap(),
            "_Projects/2026/Caf\u{e9}.png"
        );
        assert_eq!(percent_decode("plain").unwrap(), "plain");
        assert!(percent_decode("%G1").is_err());
        assert!(percent_decode("%2").is_err());
        assert!(percent_decode("%FF").is_err());
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
