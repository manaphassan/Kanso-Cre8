//! Update checks (P6.3, D20). Opt-in: the window asks once on first run and
//! only checks when the user agreed (machine setting `updateChecks`).
//! Installed builds download, verify (minisign signature against the public
//! key in tauri.conf.json) and install in place. Portable builds never
//! replace their own exe; they only offer the releases page.

use crate::paths::{AppPaths, Mode};
use serde::Serialize;
use tauri::{AppHandle, Runtime, State};
use tauri_plugin_updater::UpdaterExt;

pub const RELEASES_URL: &str = "https://github.com/manaphassan/Kanso-Cre8/releases/latest";

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    pub available: bool,
    pub current_version: String,
    pub version: Option<String>,
    pub notes: Option<String>,
    /// False in portable mode: show the releases page instead.
    pub can_install: bool,
    pub releases_url: &'static str,
}

/// Plain sentences for the errors a user can act on.
fn sentence(e: &tauri_plugin_updater::Error) -> String {
    use tauri_plugin_updater::Error as E;
    let text = e.to_string();
    let lower = text.to_ascii_lowercase();
    match e {
        E::Reqwest(_)
            if lower.contains("dns")
                || lower.contains("connect")
                || lower.contains("timed out") =>
        {
            "Could not reach the update server. Check your internet connection.".into()
        }
        E::Minisign(_) | E::SignatureUtf8(_) => {
            "The downloaded update is not signed by Kanso Cre8, so it was not installed.".into()
        }
        _ if lower.contains("valid release json") || lower.contains("404") => {
            "No update information is published yet. Try again later.".into()
        }
        _ => format!("The update check failed: {text}"),
    }
}

fn portable(paths: &AppPaths) -> bool {
    paths.mode == Mode::Portable
}

#[tauri::command]
pub async fn update_check<R: Runtime>(
    app: AppHandle<R>,
    paths: State<'_, AppPaths>,
) -> Result<UpdateInfo, String> {
    let current = app.package_info().version.to_string();
    let found = app
        .updater()
        .map_err(|e| sentence(&e))?
        .check()
        .await
        .map_err(|e| sentence(&e))?;
    Ok(UpdateInfo {
        available: found.is_some(),
        current_version: current,
        version: found.as_ref().map(|u| u.version.clone()),
        notes: found.and_then(|u| u.body),
        can_install: !portable(&paths),
        releases_url: RELEASES_URL,
    })
}

/// Downloads, verifies and installs the update, then restarts the app.
#[tauri::command]
pub async fn update_install<R: Runtime>(
    app: AppHandle<R>,
    paths: State<'_, AppPaths>,
) -> Result<(), String> {
    if portable(&paths) {
        return Err("The portable edition updates by replacing the app folder. Download the new version from the releases page.".into());
    }
    let update = app
        .updater()
        .map_err(|e| sentence(&e))?
        .check()
        .await
        .map_err(|e| sentence(&e))?
        .ok_or("Kanso Cre8 is already up to date.")?;
    update
        .download_and_install(|_, _| {}, || {})
        .await
        .map_err(|e| sentence(&e))?;
    app.restart();
}

/// Opens the releases page in the default browser. The URL is fixed, so
/// the window cannot open arbitrary links through this command.
#[tauri::command]
pub fn open_releases_page() -> Result<(), String> {
    let mut cmd = if cfg!(target_os = "windows") {
        let mut c = std::process::Command::new("explorer");
        c.arg(RELEASES_URL);
        c
    } else if cfg!(target_os = "macos") {
        let mut c = std::process::Command::new("open");
        c.arg(RELEASES_URL);
        c
    } else {
        let mut c = std::process::Command::new("xdg-open");
        c.arg(RELEASES_URL);
        c
    };
    cmd.spawn()
        .map(|_| ())
        .map_err(|e| format!("Could not open the browser: {e}"))
}
