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

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn env_of(pairs: &[(&str, &str)]) -> impl Fn(&str) -> Option<String> {
        let map: HashMap<String, String> = pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();
        move |key: &str| map.get(key).cloned()
    }

    #[test]
    fn installed_without_marker() {
        let env = env_of(&[("APPDATA", r"C:\Users\a\AppData\Roaming")]);
        let p = resolve(
            Platform::Windows,
            Path::new(r"C:\Program Files\Kanso Cre8"),
            false,
            &env,
        );
        assert_eq!(p.mode, Mode::Installed);
        assert_eq!(
            p.machine_dir,
            PathBuf::from(r"C:\Users\a\AppData\Roaming").join("KansoCre8")
        );
        assert_eq!(p.webview_data_dir, None);
        assert_eq!(p.portable_refused, None);
    }

    #[test]
    fn portable_on_usb_drive() {
        let env = env_of(&[]);
        let app = Path::new(r"E:\KansoCre8");
        let p = resolve(Platform::Windows, app, true, &env);
        assert_eq!(p.mode, Mode::Portable);
        assert_eq!(p.machine_dir, app.join("Data"));
        assert_eq!(p.webview_data_dir, Some(app.join("Data").join("webview")));
    }

    #[test]
    fn portable_on_linux_appimage_folder() {
        let env = env_of(&[("HOME", "/home/a")]);
        let app = Path::new("/media/a/USB/KansoCre8");
        let p = resolve(Platform::Linux, app, true, &env);
        assert_eq!(p.mode, Mode::Portable);
        assert_eq!(p.machine_dir, app.join("Data"));
    }

    #[test]
    fn portable_refused_on_macos() {
        let env = env_of(&[("HOME", "/Users/a")]);
        let p = resolve(Platform::Mac, Path::new("/Volumes/USB/Kanso"), true, &env);
        assert_eq!(p.mode, Mode::Installed);
        assert!(p.portable_refused.is_some());
        assert_eq!(
            p.machine_dir,
            PathBuf::from("/Users/a")
                .join("Library")
                .join("Application Support")
                .join("KansoCre8")
        );
    }

    #[test]
    fn portable_refused_inside_cloud_folders() {
        let cases = [
            (r"C:\Users\a\Dropbox\Apps\KansoCre8", "Dropbox"),
            (r"C:\Users\a\Dropbox (Studio)\KansoCre8", "Dropbox"),
            (r"C:\Users\a\OneDrive - Acme Corp\KansoCre8", "OneDrive"),
            (r"G:\My Drive\KansoCre8", "Google Drive"),
            (
                "/Users/a/Library/CloudStorage/GoogleDrive-a@example.com/My Drive/K",
                "Google Drive",
            ),
            ("/home/a/SynologyDrive/KansoCre8", "Synology Drive"),
        ];
        let env = env_of(&[]);
        for (path, provider) in cases {
            let p = resolve(Platform::Windows, Path::new(path), true, &env);
            assert_eq!(p.mode, Mode::Installed, "{path}");
            assert!(
                p.portable_refused.as_deref().unwrap().contains(provider),
                "{path}"
            );
        }
    }

    #[test]
    fn onedrive_detected_from_env_with_custom_folder_name() {
        let env = env_of(&[("OneDriveCommercial", r"D:\Sync\WorkFiles")]);
        assert_eq!(
            cloud_sync_provider(Path::new(r"d:\sync\workfiles\Apps\Kanso"), &env),
            Some("OneDrive")
        );
        assert_eq!(
            cloud_sync_provider(Path::new(r"D:\Sync\WorkFilesOther"), &env),
            None
        );
    }

    #[test]
    fn local_folders_are_not_cloud() {
        let env = env_of(&[]);
        for path in [
            r"C:\Program Files\Kanso Cre8",
            "/opt/kansocre8",
            r"E:\Tools\DropboxExport",
        ] {
            assert_eq!(cloud_sync_provider(Path::new(path), &env), None, "{path}");
        }
    }

    #[test]
    fn detects_windows_paths_on_any_host() {
        let env = env_of(&[]);
        assert_eq!(
            cloud_sync_provider(Path::new(r"C:\Users\a\Dropbox\Vault"), &env),
            Some("Dropbox")
        );
        assert_eq!(
            cloud_sync_provider(Path::new("/Users/a/Dropbox/Vault"), &env),
            Some("Dropbox")
        );
    }

    #[test]
    fn linux_machine_dir_prefers_xdg() {
        let env = env_of(&[("HOME", "/home/a"), ("XDG_CONFIG_HOME", "/home/a/.cfg")]);
        assert_eq!(
            installed_machine_dir(Platform::Linux, &env),
            PathBuf::from("/home/a/.cfg").join("kansocre8")
        );
        let env = env_of(&[("HOME", "/home/a")]);
        assert_eq!(
            installed_machine_dir(Platform::Linux, &env),
            PathBuf::from("/home/a").join(".config").join("kansocre8")
        );
    }
}
