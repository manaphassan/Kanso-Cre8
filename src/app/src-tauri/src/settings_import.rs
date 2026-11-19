//! Settings import (P5.4): `inspect` previews what each section would change,
//! `apply` writes the chosen sections. Everything is checked first (sections,
//! passphrase), so a wrong passphrase leaves this computer untouched.

use crate::machine::MachineStore;
use crate::secrets::{self, SecretStore};
use crate::settings::{aad_for, app_section, strip_paths, Section};
use crate::settings_crypto::{self as crypto, SecretsBlock};
use crate::vault::guard::VaultRoot;
use serde::Serialize;
use serde_json::{Map, Value};

#[derive(Debug, Clone, Serialize, PartialEq, Eq, Default)]
pub struct Changes {
    pub added: Vec<String>,
    pub changed: Vec<String>,
    pub removed: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SectionPreview {
    pub id: &'static str,
    pub present: bool,
    pub changes: Changes,
    /// Absolute paths in the file that will not be imported.
    pub removed_paths: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Preview {
    pub app_version: String,
    pub exported_at: String,
    pub source_platform: String,
    pub sections: Vec<SectionPreview>,
    pub has_ai_key: bool,
    pub vault_open: bool,
    pub recent_vault_names: Vec<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ImportReport {
    pub applied: Vec<&'static str>,
    pub ai_key: bool,
    pub removed_paths: Vec<String>,
}

fn diff(current: Option<&Value>, incoming: &Value) -> Changes {
    let empty = Map::new();
    let cur = current.and_then(Value::as_object).unwrap_or(&empty);
    let inc = incoming.as_object().unwrap_or(&empty);
    let mut c = Changes::default();
    for (k, v) in inc {
        match cur.get(k) {
            None => c.added.push(k.clone()),
            Some(old) if old != v => c.changed.push(k.clone()),
            _ => {}
        }
    }
    c.removed = cur
        .keys()
        .filter(|k| !inc.contains_key(*k))
        .cloned()
        .collect();
    c
}

fn current(section: Section, root: Option<&VaultRoot>, machine: &MachineStore) -> Option<Value> {
    match section {
        Section::App => Some(app_section(machine)),
        s => {
            let path = root?
                .resolve(&format!("_Team/_Config/{}.json", s.id()))
                .ok()?;
            serde_json::from_str(
                std::fs::read_to_string(path)
                    .ok()?
                    .trim_start_matches('\u{FEFF}'),
            )
            .ok()
        }
    }
}

/// The incoming section with absolute paths stripped, or None when absent.
fn incoming(doc: &Value, section: Section, removed: &mut Vec<String>) -> Option<Value> {
    let mut v = doc["sections"].get(section.id())?.clone();
    if !v.is_object() {
        return None;
    }
    strip_paths(&mut v, section.id(), removed);
    Some(v)
}

pub fn inspect(doc: &Value, root: Option<&VaultRoot>, machine: &MachineStore) -> Preview {
    let text = |k: &str| doc[k].as_str().unwrap_or_default().to_string();
    let sections = Section::ALL
        .into_iter()
        .map(|s| {
            let mut removed_paths = vec![];
            match incoming(doc, s, &mut removed_paths) {
                Some(v) => {
                    let mut changes = diff(current(s, root, machine).as_ref(), &v);
                    if s == Section::App {
                        // Informational only; never applied (see apply_app).
                        changes.added.retain(|k| k != "recent_vault_names");
                        changes.changed.retain(|k| k != "recent_vault_names");
                    }
                    SectionPreview {
                        id: s.id(),
                        present: true,
                        changes,
                        removed_paths,
                    }
                }
                None => SectionPreview {
                    id: s.id(),
                    present: false,
                    changes: Changes::default(),
                    removed_paths,
                },
            }
        })
        .collect();
    Preview {
        app_version: text("app_version"),
        exported_at: text("exported_at"),
        source_platform: text("source_platform"),
        sections,
        has_ai_key: doc["secrets"].is_object(),
        vault_open: root.is_some(),
        recent_vault_names: doc["sections"]["app"]["recent_vault_names"]
            .as_array()
            .map(|a| {
                a.iter()
                    .filter_map(Value::as_str)
                    .map(str::to_string)
                    .collect()
            })
            .unwrap_or_default(),
    }
}

/// The AI model always; the device label only when this computer has none,
/// so two computers in use do not end up with the same name.
fn apply_app(v: &Value, machine: &MachineStore) -> Result<(), String> {
    if v["ai_provider"] == secrets::PROVIDER {
        if let Some(m) = v["ai_model"].as_str().filter(|m| secrets::valid_model(m)) {
            machine.set("aiModel", Value::String(m.to_string()))?;
        }
    }
    let has_label =
        matches!(machine.get("deviceLabel")?, Some(Value::String(s)) if !s.trim().is_empty());
    if let Some(label) = v["device_label"]
        .as_str()
        .map(str::trim)
        .filter(|l| !l.is_empty() && l.len() <= 64)
    {
        if !has_label {
            machine.set("deviceLabel", Value::String(label.to_string()))?;
        }
    }
    Ok(())
}

pub struct ImportInput<'a> {
    pub sections: &'a [Section],
    /// Set to import the encrypted AI key.
    pub passphrase: Option<&'a str>,
    pub linux: bool,
}

pub fn apply(
    doc: &Value,
    root: Option<&VaultRoot>,
    machine: &MachineStore,
    store: &dyn SecretStore,
    input: &ImportInput,
) -> Result<ImportReport, String> {
    let mut report = ImportReport {
        applied: vec![],
        ai_key: false,
        removed_paths: vec![],
    };
    let mut writes = vec![];
    for &s in input.sections {
        let Some(v) = incoming(doc, s, &mut report.removed_paths) else {
            continue;
        };
        if s != Section::App && root.is_none() {
            return Err(
                "Open the vault on this computer first, then import the vault sections.".into(),
            );
        }
        writes.push((s, v));
    }
    let key = match input.passphrase {
        None => None,
        Some(pass) => {
            let block: SecretsBlock = serde_json::from_value(doc["secrets"].clone())
                .map_err(|_| "This settings file does not contain an AI key.".to_string())?;
            let plain = crypto::open(&block, pass, &aad_for(&doc["sections"]))?;
            let inner: Value = serde_json::from_slice(&plain)
                .map_err(|_| "The AI key in this file is damaged.".to_string())?;
            Some(
                inner["key"]
                    .as_str()
                    .ok_or("The AI key in this file is damaged.")?
                    .to_string(),
            )
        }
    };
    for (s, v) in writes {
        match s {
            Section::App => apply_app(&v, machine)?,
            _ => {
                let text = serde_json::to_string_pretty(&v).map_err(|e| e.to_string())? + "\n";
                let rel = format!("_Team/_Config/{}.json", s.id());
                crate::vault::ops::write_text_atomic(root.expect("checked above"), &rel, &text)?;
            }
        }
        report.applied.push(s.id());
    }
    if let Some(k) = key {
        secrets::save_key(store, machine, &k, input.linux)?;
        report.ai_key = true;
    }
    Ok(report)
}
