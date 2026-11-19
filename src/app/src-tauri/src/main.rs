// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod ai;
mod archive;
mod machine;
mod names;
mod net;
mod paths;
mod saveas;
mod secrets;
mod settings;
mod settings_crypto;
mod settings_import;
mod vault;
mod vaultpath;
mod watch;

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Manager, WebviewWindowBuilder};
use tauri_plugin_dialog::{DialogExt, MessageDialogKind};

/// Portable mode on a USB drive: remind once, when the window closes, to
/// eject the drive so the last writes finish before it is unplugged.
fn remind_to_eject(window: &tauri::Window, event: &tauri::WindowEvent, drive: &str) {
    static SHOWN: AtomicBool = AtomicBool::new(false);
    let tauri::WindowEvent::CloseRequested { api, .. } = event else {
        return;
    };
    if SHOWN.swap(true, Ordering::SeqCst) {
        return;
    }
    api.prevent_close();
    let target = window.clone();
    window
        .dialog()
        .message(format!(
            "Eject {drive} before you unplug it, so your last changes finish writing."
        ))
        .title("Before you unplug the drive")
        .kind(MessageDialogKind::Info)
        .parent(window)
        .show(move |_| {
            let _ = target.destroy();
        });
}

/// Creates the main window from `tauri.conf.json` (where `create` is false) so
/// portable mode can move the webview data directory beside the app.
fn create_main_window(app: &tauri::App, app_paths: &paths::AppPaths) -> tauri::Result<()> {
    let config = app
        .config()
        .app
        .windows
        .iter()
        .find(|w| w.label == "main")
        .cloned()
        .expect("tauri.conf.json must define the main window");

    let mut builder = WebviewWindowBuilder::from_config(app.handle(), &config)?;
    if let Some(dir) = &app_paths.webview_data_dir {
        std::fs::create_dir_all(dir)?;
        builder = builder.data_directory(dir.clone());
    }
    builder.build()?;
    Ok(())
}

fn main() {
    let app_paths = paths::detect();
    let eject_drive = app_paths.external_drive.clone();

    tauri::Builder::default()
        .on_window_event(move |window, event| {
            if let Some(drive) = &eject_drive {
                remind_to_eject(window, event, drive);
            }
        })
        .manage(app_paths.clone())
        .manage(machine::store_for(&app_paths))
        .manage(vault::VaultState::default())
        .manage(watch::WatchState::default())
        .invoke_handler(tauri::generate_handler![
            paths::app_mode,
            paths::device_name,
            vault::vault_open,
            vault::vault_root,
            vault::vault_scan,
            vault::list_dir,
            vault::read_text,
            vault::write_text_atomic,
            vault::ensure_dirs,
            vault::move_to_archive,
            vault::copy_into_vault,
            vault::write_bytes_atomic,
            vault::copy_within,
            vault::retire::retire_vault_files,
            archive::export_zip,
            archive::sha256_file,
            saveas::save_text_as,
            saveas::save_file_as,
            machine::machine_get,
            machine::machine_set,
            net::radio_now_playing,
            secrets::ai_status,
            secrets::ai_set_key,
            secrets::ai_clear_key,
            secrets::ai_set_model,
            ai::ai_test,
            ai::ai_complete,
            settings::settings_export,
            settings::settings_inspect,
            settings::settings_import,
            watch::watch_status
        ])
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(move |app| {
            create_main_window(app, &app_paths)?;
            // One-time move of a v0.8 AI key from app.json into the keychain,
            // off the main thread in case the keychain asks to be unlocked.
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let store = handle.state::<machine::MachineStore>();
                match secrets::migrate_legacy(&secrets::Keychain, &store, cfg!(target_os = "linux"))
                {
                    Ok(true) => eprintln!(
                        "[secrets] Moved the AI key into {}.",
                        secrets::keychain_name()
                    ),
                    Ok(false) => {}
                    Err(e) => eprintln!("[secrets] AI key migration skipped: {e}"),
                }
            });
            if let Some(reason) = &app_paths.portable_refused {
                eprintln!("[paths] {reason}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Kanso Cre8 application");
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;

    fn read(rel: &str) -> String {
        std::fs::read_to_string(std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join(rel)).unwrap()
    }

    fn between<'a>(text: &'a str, start: &str, end: &str) -> &'a str {
        let from = text.find(start).unwrap() + start.len();
        &text[from..from + text[from..].find(end).unwrap()]
    }

    fn quoted(text: &str) -> BTreeSet<String> {
        text.split('"')
            .skip(1)
            .step_by(2)
            .map(str::to_string)
            .collect()
    }

    /// The handler list, the build.rs manifest and the permission set must name
    /// the same commands, or a command is either unreachable or unguarded.
    #[test]
    fn command_lists_agree() {
        let main_rs = read("src/main.rs");
        let handler: BTreeSet<String> = between(&main_rs, "generate_handler![", "]")
            .split(',')
            .map(|s| s.trim().rsplit("::").next().unwrap().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        let manifest = quoted(between(&read("build.rs"), "COMMANDS: &[&str] = &[", "];"));
        let permitted: BTreeSet<String> = quoted(&read("permissions/kanso.toml"))
            .into_iter()
            .filter_map(|p| p.strip_prefix("allow-").map(|c| c.replace('-', "_")))
            .collect();
        assert_eq!(handler, manifest, "main.rs vs build.rs");
        assert_eq!(handler, permitted, "main.rs vs permissions/kanso.toml");
    }

    #[tauri::command]
    fn not_in_manifest() -> &'static str {
        "should never run"
    }

    fn invoke(
        webview: &tauri::WebviewWindow<tauri::test::MockRuntime>,
        cmd: &str,
    ) -> Result<tauri::ipc::InvokeResponseBody, serde_json::Value> {
        tauri::test::get_ipc_response(
            webview,
            tauri::webview::InvokeRequest {
                cmd: cmd.into(),
                callback: tauri::ipc::CallbackFn(0),
                error: tauri::ipc::CallbackFn(1),
                url: if cfg!(windows) {
                    "http://tauri.localhost"
                } else {
                    "tauri://localhost"
                }
                .parse()
                .unwrap(),
                body: tauri::ipc::InvokeBody::default(),
                headers: Default::default(),
                invoke_key: tauri::test::INVOKE_KEY.to_string(),
            },
        )
    }

    /// Uses the real capability files: granted commands run, anything outside
    /// the manifest is refused by the runtime.
    #[test]
    fn runtime_enforces_the_capability() {
        let mut context = tauri::generate_context!(test = true);
        // macOS only builds tray icons on the main thread; tests run on others.
        context.config_mut().app.tray_icon = None;
        let app = tauri::test::mock_builder()
            .manage(crate::vault::VaultState::default())
            .invoke_handler(tauri::generate_handler![
                crate::vault::vault_root,
                not_in_manifest
            ])
            .build(context)
            .unwrap();
        let webview = tauri::WebviewWindowBuilder::new(&app, "main", tauri::WebviewUrl::default())
            .build()
            .unwrap();

        let granted = invoke(&webview, "vault_root").expect("vault_root is granted");
        assert_eq!(granted.deserialize::<Option<String>>().unwrap(), None);

        let denied = invoke(&webview, "not_in_manifest").expect_err("must be refused");
        assert!(denied.to_string().contains("not allowed"), "{denied}");
    }
}
