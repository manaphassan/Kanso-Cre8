//! App mode and per-machine paths.
//!
//! Installed mode keeps machine data in the OS config directory. Portable mode
//! (Windows, Linux AppImage) is switched on by a `portable.ini` file next to the
//! executable and keeps machine and webview data in `Data/` beside the app, so
//! the app can run from a USB drive. Portable mode is refused on macOS and when
//! the app folder sits inside a cloud sync folder, because syncing webview data
//! corrupts it.

use serde::Serialize;
use std::path::{Path, PathBuf};

pub const PORTABLE_MARKER: &str = "portable.ini";
const PORTABLE_DATA_DIR: &str = "Data";
const WEBVIEW_DIR: &str = "webview";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Installed,
    Portable,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Platform {
    Windows,
    Mac,
    Linux,
}

impl Platform {
    pub fn current() -> Self {
        if cfg!(target_os = "windows") {
            Platform::Windows
        } else if cfg!(target_os = "macos") {
            Platform::Mac
        } else {
            Platform::Linux
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppPaths {
    pub mode: Mode,
    pub app_dir: PathBuf,
    pub machine_dir: PathBuf,
    pub webview_data_dir: Option<PathBuf>,
    /// Set when `portable.ini` exists but portable mode was refused.
    pub portable_refused: Option<String>,
    /// In portable mode, the drive or mount the app runs from when it is not
    /// the system drive (for example `E:` or `/media/ana/USB`): the app asks
    /// to eject it before unplugging when it closes.
    pub external_drive: Option<String>,
}

type EnvFn<'a> = &'a dyn Fn(&str) -> Option<String>;

/// Detects the mode for the running executable.
pub fn detect() -> AppPaths {
    let os = Platform::current();
    let env = |key: &str| std::env::var(key).ok();
    let app_dir = current_app_dir(os, &env).unwrap_or_else(|| PathBuf::from("."));
    let marker_present = app_dir.join(PORTABLE_MARKER).is_file();
    resolve(os, &app_dir, marker_present, &env)
}

/// Folder that holds the executable. For a Linux AppImage this is the folder
/// that holds the `.AppImage` file, not the temporary mount point.
fn current_app_dir(os: Platform, env: EnvFn) -> Option<PathBuf> {
    if os == Platform::Linux {
        if let Some(appimage) = env("APPIMAGE").filter(|v| !v.is_empty()) {
            return Path::new(&appimage).parent().map(Path::to_path_buf);
        }
    }
    std::env::current_exe()
        .ok()?
        .parent()
        .map(Path::to_path_buf)
}

pub fn resolve(os: Platform, app_dir: &Path, marker_present: bool, env: EnvFn) -> AppPaths {
    let installed = |refused: Option<String>| AppPaths {
        mode: Mode::Installed,
        app_dir: app_dir.to_path_buf(),
        machine_dir: installed_machine_dir(os, env),
        webview_data_dir: None,
        portable_refused: refused,
        external_drive: None,
    };

    if !marker_present {
        return installed(None);
    }
    if os == Platform::Mac {
        return installed(Some("Portable mode is not available on macOS.".to_string()));
    }
    if let Some(provider) = cloud_sync_provider(app_dir, env) {
        return installed(Some(format!(
            "Portable mode is off because the app folder is inside {provider}. \
             Move the app out of the sync folder; your vault can stay there."
        )));
    }

    let data_dir = app_dir.join(PORTABLE_DATA_DIR);
    AppPaths {
        mode: Mode::Portable,
        app_dir: app_dir.to_path_buf(),
        webview_data_dir: Some(data_dir.join(WEBVIEW_DIR)),
        machine_dir: data_dir,
        portable_refused: None,
        external_drive: external_drive(os, app_dir, env),
    }
}

/// The drive letter (Windows) or mount point (Linux) of `app_dir` when it is
/// not the system drive. Decided from the path alone: no OS calls.
pub fn external_drive(os: Platform, app_dir: &Path, env: EnvFn) -> Option<String> {
    let p = app_dir.to_string_lossy().replace('\\', "/");
    let p = p.strip_prefix("//?/").unwrap_or(&p);
    match os {
        Platform::Windows => {
            let b = p.as_bytes();
            if b.len() < 2 || !b[0].is_ascii_alphabetic() || b[1] != b':' {
                return None;
            }
            let drive = p[..2].to_ascii_uppercase();
            let system = env("SystemDrive")
                .unwrap_or_else(|| "C:".into())
                .to_ascii_uppercase();
            (drive != system).then_some(drive)
        }
        Platform::Linux => {
            let parts: Vec<&str> = p.split('/').filter(|s| !s.is_empty()).collect();
            let depth = if parts.starts_with(&["run", "media"]) {
                4
            } else if parts.first() == Some(&"media") {
                3
            } else if parts.first() == Some(&"mnt") {
                2
            } else {
                return None;
            };
            (parts.len() >= depth).then(|| format!("/{}", parts[..depth].join("/")))
        }
        Platform::Mac => None,
    }
}

/// Machine directory in installed mode. Windows and Linux match the paths the
/// v0.8 Node server used, so existing `app.json` files are found.
pub fn installed_machine_dir(os: Platform, env: EnvFn) -> PathBuf {
    let home = || {
        env("HOME")
            .or_else(|| env("USERPROFILE"))
            .filter(|v| !v.is_empty())
            .map(PathBuf::from)
            .unwrap_or_else(|| PathBuf::from("."))
    };
    match os {
        Platform::Windows => env("APPDATA")
            .filter(|v| !v.is_empty())
            .map(PathBuf::from)
            .or_else(|| {
                env("USERPROFILE")
                    .filter(|v| !v.is_empty())
                    .map(|p| PathBuf::from(p).join("AppData").join("Roaming"))
            })
            .unwrap_or_else(|| PathBuf::from("."))
            .join("KansoCre8"),
        Platform::Mac => home()
            .join("Library")
            .join("Application Support")
            .join("KansoCre8"),
        Platform::Linux => env("XDG_CONFIG_HOME")
            .filter(|v| !v.is_empty())
            .map(PathBuf::from)
            .unwrap_or_else(|| home().join(".config"))
            .join("kansocre8"),
    }
}

/// Best-effort detection of a cloud sync folder from the path and the OneDrive
/// environment variables. Returns the provider name for the user message.
pub fn cloud_sync_provider(path: &Path, env: EnvFn) -> Option<&'static str> {
    for var in ["OneDrive", "OneDriveConsumer", "OneDriveCommercial"] {
        if let Some(root) = env(var).filter(|v| !v.is_empty()) {
            if is_within_ci(path, Path::new(&root)) {
                return Some("OneDrive");
            }
        }
    }

    // Split on both separators so a Windows path (for example from an imported
    // settings file or a test) is recognized on macOS and Linux too.
    for name in path.to_string_lossy().split(['/', '\\']) {
        if name.is_empty() {
            continue;
        }
        let name = name.to_lowercase();
        if name == "dropbox" || name.starts_with("dropbox (") {
            return Some("Dropbox");
        }
        if name == "onedrive" || name.starts_with("onedrive - ") || name.starts_with("onedrive-") {
            return Some("OneDrive");
        }
        if name == "google drive"
            || name == "my drive"
            || name == "googledrive"
            || name.starts_with("googledrive-")
        {
            return Some("Google Drive");
        }
        if name == "synologydrive" || name.starts_with("synologydrive-") {
            return Some("Synology Drive");
        }
    }
    None
}

fn normalized(path: &Path) -> String {
    path.to_string_lossy()
        .replace('\\', "/")
        .trim_end_matches('/')
        .to_lowercase()
}

fn is_within_ci(path: &Path, root: &Path) -> bool {
    let path = normalized(path);
    let root = normalized(root);
    !root.is_empty() && (path == root || path.starts_with(&format!("{root}/")))
}

#[tauri::command]
pub fn app_mode(paths: tauri::State<'_, AppPaths>) -> AppPaths {
    paths.inner().clone()
}

/// This computer's name, used as the default device label.
#[tauri::command(async)]
pub fn device_name() -> String {
    let clean = |s: String| {
        let s = s
            .trim()
            .chars()
            .filter(|c| !c.is_control())
            .take(64)
            .collect::<String>();
        (!s.is_empty()).then_some(s)
    };
    ["COMPUTERNAME", "HOSTNAME"]
        .iter()
        .find_map(|v| std::env::var(v).ok().and_then(clean))
        .or_else(|| {
            std::fs::read_to_string("/etc/hostname")
                .ok()
                .and_then(clean)
        })
        .or_else(|| {
            std::process::Command::new("hostname")
                .output()
                .ok()
                .and_then(|o| clean(String::from_utf8_lossy(&o.stdout).into_owned()))
        })
        .unwrap_or_else(|| "This computer".to_string())
}

#[cfg(test)]
#[path = "paths_tests.rs"]
mod tests;
