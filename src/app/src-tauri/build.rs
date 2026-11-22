// Every app command is listed here, so Tauri only allows the ones a
// capability grants (`permissions/kanso.toml`, `capabilities/default.json`).
const COMMANDS: &[&str] = &[
    // Transitional: removed with the Node server in MASTER_PLAN Phase 4.
    "app_mode",
    "device_name",
    "vault_open",
    "vault_root",
    "vault_scan",
    "list_dir",
    "read_text",
    "write_text_atomic",
    "ensure_dirs",
    "move_to_archive",
    "copy_into_vault",
    "write_bytes_atomic",
    "copy_within",
    "retire_vault_files",
    "export_zip",
    "sha256_file",
    "save_text_as",
    "save_file_as",
    "machine_get",
    "machine_set",
    "radio_now_playing",
    "ai_status",
    "ai_set_key",
    "ai_clear_key",
    "ai_set_model",
    "ai_test",
    "ai_complete",
    "settings_export",
    "settings_inspect",
    "settings_import",
    "license_status",
    "license_activate",
    "license_deactivate",
    "watch_status",
];

fn main() {
    println!("cargo:rerun-if-changed=permissions");
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("failed to run tauri-build");
}
