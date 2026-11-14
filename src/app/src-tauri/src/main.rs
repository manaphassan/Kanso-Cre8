// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod paths;
#[allow(dead_code)] // Commands that use the guard arrive in P1.4.
mod vault;

use std::sync::Mutex;
use tauri::{State, WebviewWindowBuilder};

// Transitional: removed with the Node server in MASTER_PLAN Phase 4.
struct BackendState {
    port: Mutex<u16>,
}

#[tauri::command]
fn get_backend_port(state: State<BackendState>) -> u16 {
    *state.port.lock().unwrap()
}

#[tauri::command]
fn get_backend_url(state: State<BackendState>) -> String {
    let port = *state.port.lock().unwrap();
    format!("http://127.0.0.1:{}", port)
}

fn get_free_port() -> u16 {
    std::net::TcpListener::bind("127.0.0.1:0")
        .and_then(|listener| listener.local_addr())
        .map(|addr| addr.port())
        .unwrap_or(4000)
}

fn resolve_backend_port() -> u16 {
    if let Ok(p_str) = std::env::var("KANSO_PORT") {
        if let Ok(p) = p_str.parse::<u16>() {
            return p;
        }
    }
    if std::net::TcpStream::connect("127.0.0.1:4000").is_ok() {
        return 4000;
    }
    get_free_port()
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
    let initial_port = resolve_backend_port();
    let app_paths = paths::detect();

    tauri::Builder::default()
        .manage(BackendState {
            port: Mutex::new(initial_port),
        })
        .manage(app_paths.clone())
        .invoke_handler(tauri::generate_handler![
            get_backend_port,
            get_backend_url,
            paths::app_mode
        ])
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .setup(move |app| {
            create_main_window(app, &app_paths)?;
            if let Some(reason) = &app_paths.portable_refused {
                eprintln!("[paths] {reason}");
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Kanso Cre8 application");
}
