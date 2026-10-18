// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::sync::Mutex;
use tauri::State;

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

fn main() {
    let initial_port = resolve_backend_port();

    tauri::Builder::default()
        .manage(BackendState {
            port: Mutex::new(initial_port),
        })
        .invoke_handler(tauri::generate_handler![get_backend_port, get_backend_url])
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .run(tauri::generate_context!())
        .expect("error while running Kanso Cre8 application");
}
