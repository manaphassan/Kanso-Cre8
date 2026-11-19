//! Tests for paths.rs, kept apart so paths.rs stays under 400 lines.

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
    assert_eq!(p.external_drive.as_deref(), Some("E:"));
    let on_c = resolve(
        Platform::Windows,
        Path::new(r"C:\Tools\KansoCre8"),
        true,
        &env,
    );
    assert_eq!(on_c.external_drive, None);
}

#[test]
fn external_drive_from_the_path() {
    let env = env_of(&[("SystemDrive", "D:")]);
    let ext = |os, p: &str| external_drive(os, Path::new(p), &env);
    assert_eq!(ext(Platform::Windows, r"\\?\c:\Apps"), Some("C:".into()));
    assert_eq!(ext(Platform::Windows, r"D:\Apps"), None);
    assert_eq!(ext(Platform::Windows, r"\\nas\share"), None);
    assert_eq!(
        ext(Platform::Linux, "/media/ana/USB/KansoCre8"),
        Some("/media/ana/USB".into())
    );
    assert_eq!(
        ext(Platform::Linux, "/run/media/ana/USB/K"),
        Some("/run/media/ana/USB".into())
    );
    assert_eq!(ext(Platform::Linux, "/mnt/usb/K"), Some("/mnt/usb".into()));
    assert_eq!(ext(Platform::Linux, "/home/ana/K"), None);
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
