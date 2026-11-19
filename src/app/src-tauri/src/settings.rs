//! Settings export and import between computers and operating systems
//! (MASTER_PLAN 2.7, P5.3 to P5.5). One readable JSON file: vault config
//! sections, a few machine settings, and optionally the AI key encrypted
//! with a passphrase. It never contains absolute paths, and import never
//! touches `.md` content.

use crate::machine::MachineStore;
use crate::secrets::{self, SecretStore};
use crate::settings_crypto as crypto;
use crate::vault::guard::VaultRoot;
use serde::Serialize;
use serde_json::{json, Map, Value};
use sha2::{Digest, Sha256};

pub const FORMAT: &str = "kanso-settings";
pub const FORMAT_VERSION: u64 = 1;
const CONFIG_DIR: &str = "_Team/_Config";
const MAX_FILE_BYTES: u64 = 2 * 1024 * 1024;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Section {
    Preferences,
    StudioProfile,
    App,
    License,
}

impl Section {
    pub const ALL: [Section; 4] = [
        Self::Preferences,
        Self::StudioProfile,
        Self::App,
        Self::License,
    ];

    pub fn id(self) -> &'static str {
        match self {
            Self::Preferences => "preferences",
            Self::StudioProfile => "studio_profile",
            Self::App => "app",
            Self::License => "license",
        }
    }

    pub fn parse_list(ids: &[String]) -> Result<Vec<Section>, String> {
        ids.iter()
            .map(|id| {
                Self::ALL
                    .into_iter()
                    .find(|s| s.id() == id)
                    .ok_or_else(|| format!("\"{id}\" is not a settings section."))
            })
            .collect()
    }

    /// Vault-relative config file, or None for the machine section.
    fn vault_file(self) -> Option<String> {
        match self {
            Self::App => None,
            s => Some(format!("{CONFIG_DIR}/{}.json", s.id())),
        }
    }
}

/// A string that names a file on one computer: `C:\..`, `\\server\..`, or a
/// Unix home, volume or mount path. URLs and short values like `/hr` pass.
pub fn looks_like_abs_path(s: &str) -> bool {
    let b = s.as_bytes();
    let drive = b.len() >= 3
        && b[0].is_ascii_alphabetic()
        && b[1] == b':'
        && (b[2] == b'\\' || b[2] == b'/');
    let unc = s.starts_with("\\\\") || s.starts_with("//");
    let unix = [
        "/Users/",
        "/home/",
        "/Volumes/",
        "/media/",
        "/mnt/",
        "/run/media/",
        "/var/",
        "/tmp/",
        "/opt/",
        "/private/",
    ]
    .iter()
    .any(|p| s.starts_with(p));
    drive || unc || unix
}

/// Removes values that are absolute paths; returns their dotted names.
pub fn strip_paths(value: &mut Value, prefix: &str, removed: &mut Vec<String>) {
    match value {
        Value::Object(map) => {
            let gone: Vec<String> = map
                .iter()
                .filter(|(_, v)| v.as_str().is_some_and(looks_like_abs_path))
                .map(|(k, _)| k.clone())
                .collect();
            for k in gone {
                map.remove(&k);
                removed.push(format!("{prefix}.{k}"));
            }
            for (k, v) in map.iter_mut() {
                strip_paths(v, &format!("{prefix}.{k}"), removed);
            }
        }
        Value::Array(items) => {
            let before = items.len();
            items.retain(|v| !v.as_str().is_some_and(looks_like_abs_path));
            if items.len() != before {
                removed.push(format!("{prefix}[]"));
            }
            for (i, v) in items.iter_mut().enumerate() {
                strip_paths(v, &format!("{prefix}[{i}]"), removed);
            }
        }
        _ => {}
    }
}

fn read_vault_json(root: &VaultRoot, rel: &str) -> Option<Value> {
    let path = root.resolve(rel).ok()?;
    let text = std::fs::read_to_string(path).ok()?;
    serde_json::from_str::<Value>(text.trim_start_matches('\u{FEFF}'))
        .ok()
        .filter(Value::is_object)
}

fn folder_name(path: &str) -> Option<String> {
    path.split(['/', '\\'])
        .rfind(|s| !s.is_empty() && *s != ".." && *s != ".")
        .map(str::to_string)
}

/// The machine settings that travel: AI provider and model, device label,
/// and the names (never paths) of recent vault folders.
pub fn app_section(machine: &MachineStore) -> Value {
    let label = match machine.get("deviceLabel").ok().flatten() {
        Some(Value::String(s)) if !s.trim().is_empty() => s,
        _ => crate::paths::device_name(),
    };
    let names: Vec<String> = match machine.get("recentVaults").ok().flatten() {
        Some(Value::Array(a)) => a
            .iter()
            .filter_map(Value::as_str)
            .filter_map(folder_name)
            .collect(),
        _ => vec![],
    };
    json!({
        "ai_provider": secrets::PROVIDER,
        "ai_model": secrets::current_model(machine),
        "device_label": label,
        "recent_vault_names": names,
    })
}

fn current(section: Section, root: Option<&VaultRoot>, machine: &MachineStore) -> Option<Value> {
    match section.vault_file() {
        Some(rel) => root.and_then(|r| read_vault_json(r, &rel)),
        None => Some(app_section(machine)),
    }
}

/// Binds the encrypted key to the exact sections it was exported with.
pub fn aad_for(sections: &Value) -> Vec<u8> {
    let digest = Sha256::digest(
        serde_json::to_string(sections)
            .unwrap_or_default()
            .as_bytes(),
    );
    let hex: String = digest.iter().map(|b| format!("{b:02x}")).collect();
    format!("{FORMAT}/{FORMAT_VERSION}\n{hex}").into_bytes()
}

pub fn iso_now(unix_secs: u64) -> String {
    let (y, m, d) = crate::names::civil_from_days((unix_secs / 86_400) as i64);
    let s = unix_secs % 86_400;
    format!(
        "{y:04}-{m:02}-{d:02}T{:02}:{:02}:{:02}Z",
        s / 3600,
        (s % 3600) / 60,
        s % 60
    )
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ExportReport {
    pub sections: Vec<&'static str>,
    /// Requested but not found (for example no vault open, or no file yet).
    pub missing: Vec<&'static str>,
    pub removed_paths: Vec<String>,
    pub ai_key: bool,
}

pub struct ExportInput<'a> {
    pub sections: &'a [Section],
    /// Set to include the AI key, encrypted with this passphrase.
    pub passphrase: Option<&'a str>,
    pub now_secs: u64,
    pub platform: &'a str,
}

pub fn build_export(
    root: Option<&VaultRoot>,
    machine: &MachineStore,
    store: &dyn SecretStore,
    input: &ExportInput,
) -> Result<(Value, ExportReport), String> {
    let mut report = ExportReport {
        sections: vec![],
        missing: vec![],
        removed_paths: vec![],
        ai_key: false,
    };
    let mut sections = Map::new();
    for &s in input.sections {
        match current(s, root, machine) {
            Some(mut v) => {
                strip_paths(&mut v, s.id(), &mut report.removed_paths);
                sections.insert(s.id().to_string(), v);
                report.sections.push(s.id());
            }
            None => report.missing.push(s.id()),
        }
    }
    let sections = Value::Object(sections);
    let mut doc = json!({
        "format": FORMAT,
        "format_version": FORMAT_VERSION,
        "app_version": env!("CARGO_PKG_VERSION"),
        "exported_at": iso_now(input.now_secs),
        "source_platform": input.platform,
        "sections": sections,
        "secrets": null,
    });
    if let Some(pass) = input.passphrase {
        let (key, _) = secrets::read_key(store, machine).ok_or(
            "There is no AI key on this computer to include. Save one in Settings > AI first.",
        )?;
        let plain = serde_json::to_vec(&json!({ "provider": secrets::PROVIDER, "key": key }))
            .map_err(|e| e.to_string())?;
        let block = crypto::seal(&plain, pass, &aad_for(&doc["sections"]))?;
        doc["secrets"] = serde_json::to_value(block).map_err(|e| e.to_string())?;
        report.ai_key = true;
    }
    Ok((doc, report))
}

/// Parses and validates a settings file; older versions would migrate here.
pub fn parse_doc(text: &str) -> Result<Value, String> {
    let doc: Value = serde_json::from_str(text.trim_start_matches('\u{FEFF}')).map_err(|_| {
        "This file is not a Kanso Cre8 settings file (it is not valid JSON).".to_string()
    })?;
    if doc["format"] != FORMAT {
        return Err("This file is not a Kanso Cre8 settings file.".into());
    }
    match doc["format_version"].as_u64() {
        Some(FORMAT_VERSION) => {}
        Some(v) if v > FORMAT_VERSION => {
            return Err(format!(
                "This settings file was made by a newer Kanso Cre8 (format {v}). Update the app to import it."
            ))
        }
        _ => return Err("This settings file has an unknown format version.".into()),
    }
    if !doc["sections"].is_object() && !doc["sections"].is_null() {
        return Err("The sections of this settings file are damaged.".into());
    }
    Ok(doc)
}

pub fn read_doc(path: &std::path::Path) -> Result<Value, String> {
    let meta =
        std::fs::metadata(path).map_err(|e| format!("Could not open the settings file: {e}"))?;
    if meta.len() > MAX_FILE_BYTES {
        return Err("This file is too large to be a settings file.".into());
    }
    parse_doc(
        &std::fs::read_to_string(path)
            .map_err(|e| format!("Could not read the settings file: {e}"))?,
    )
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportArgs {
    dest: String,
    sections: Vec<String>,
    passphrase: Option<String>,
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportArgs {
    path: String,
    sections: Vec<String>,
    passphrase: Option<String>,
}

fn platform_id() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    }
}

fn open_root(vault: &crate::vault::VaultState) -> Option<VaultRoot> {
    vault.with(|r| Ok(r.clone())).ok()
}

/// Writes the settings file to `dest`, a path from a save dialog.
#[tauri::command(async)]
pub fn settings_export<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    input: ExportArgs,
    vault: tauri::State<'_, crate::vault::VaultState>,
    machine: tauri::State<'_, MachineStore>,
) -> Result<ExportReport, String> {
    let dest = crate::saveas::picked(&app, &input.dest)?;
    let sections = Section::parse_list(&input.sections)?;
    let args = ExportInput {
        sections: &sections,
        passphrase: input.passphrase.as_deref(),
        now_secs: crate::names::now_millis() / 1000,
        platform: platform_id(),
    };
    let (doc, report) = build_export(
        open_root(&vault).as_ref(),
        &machine,
        &secrets::Keychain,
        &args,
    )?;
    let text = serde_json::to_string_pretty(&doc).map_err(|e| e.to_string())? + "\n";
    crate::saveas::write_text_to(&dest, &text)?;
    Ok(report)
}

/// Previews a settings file picked in an open dialog.
#[tauri::command(async)]
pub fn settings_inspect<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    path: String,
    vault: tauri::State<'_, crate::vault::VaultState>,
    machine: tauri::State<'_, MachineStore>,
) -> Result<crate::settings_import::Preview, String> {
    let doc = read_doc(&crate::saveas::picked(&app, &path)?)?;
    Ok(crate::settings_import::inspect(
        &doc,
        open_root(&vault).as_ref(),
        &machine,
    ))
}

#[tauri::command(async)]
pub fn settings_import<R: tauri::Runtime>(
    app: tauri::AppHandle<R>,
    input: ImportArgs,
    vault: tauri::State<'_, crate::vault::VaultState>,
    machine: tauri::State<'_, MachineStore>,
) -> Result<crate::settings_import::ImportReport, String> {
    let doc = read_doc(&crate::saveas::picked(&app, &input.path)?)?;
    let sections = Section::parse_list(&input.sections)?;
    let args = crate::settings_import::ImportInput {
        sections: &sections,
        passphrase: input.passphrase.as_deref().filter(|p| !p.is_empty()),
        linux: cfg!(target_os = "linux"),
    };
    crate::settings_import::apply(
        &doc,
        open_root(&vault).as_ref(),
        &machine,
        &secrets::Keychain,
        &args,
    )
}

#[cfg(test)]
#[path = "settings_tests.rs"]
mod tests;
