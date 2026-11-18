//! The AI key (P3.1). Stored by Rust in the OS keychain (Windows Credential
//! Manager, macOS Keychain, Linux Secret Service) and never returned to the
//! webview: `ai_status` only says whether a key is configured. On Linux
//! without a Secret Service the key falls back to `app.json` (mode 0600) and
//! Settings > AI shows a warning (MASTER_PLAN 2.3).

use crate::machine::MachineStore;
use serde::Serialize;
use serde_json::Value;
use tauri::State;

pub const PROVIDER: &str = "gemini";
pub const DEFAULT_MODEL: &str = "gemini-2.5-flash";
pub const MODELS: &[&str] = &[
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.5-pro",
];

const SERVICE: &str = "com.kansocre8.desktop";
const ACCOUNT: &str = "ai-gemini";
/// The `app.json` key: legacy v0.8 location, and the Linux fallback.
const FILE_KEY: &str = "aiApiKey";
const MODEL_KEY: &str = "aiModel";

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum StoreError {
    /// No keychain on this system (for example Linux without a Secret Service).
    Unavailable(String),
    Failed(String),
}

/// Where the key lives. Implemented by the OS keychain and, in tests, memory.
pub trait SecretStore {
    fn get(&self) -> Result<Option<String>, StoreError>;
    fn set(&self, secret: &str) -> Result<(), StoreError>;
    fn clear(&self) -> Result<(), StoreError>;
}

pub struct Keychain;

impl Keychain {
    fn entry() -> Result<keyring::Entry, StoreError> {
        keyring::Entry::new(SERVICE, ACCOUNT).map_err(map_keyring)
    }
}

fn map_keyring(e: keyring::Error) -> StoreError {
    match e {
        keyring::Error::NoStorageAccess(_) | keyring::Error::PlatformFailure(_) => {
            StoreError::Unavailable(e.to_string())
        }
        other => StoreError::Failed(other.to_string()),
    }
}

impl SecretStore for Keychain {
    fn get(&self) -> Result<Option<String>, StoreError> {
        match Self::entry()?.get_password() {
            Ok(s) => Ok(Some(s)),
            Err(keyring::Error::NoEntry) => Ok(None),
            Err(e) => Err(map_keyring(e)),
        }
    }

    fn set(&self, secret: &str) -> Result<(), StoreError> {
        Self::entry()?.set_password(secret).map_err(map_keyring)
    }

    fn clear(&self) -> Result<(), StoreError> {
        match Self::entry()?.delete_credential() {
            Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
            Err(e) => Err(map_keyring(e)),
        }
    }
}

pub fn keychain_name() -> &'static str {
    if cfg!(target_os = "windows") {
        "Windows Credential Manager"
    } else if cfg!(target_os = "macos") {
        "macOS Keychain"
    } else {
        "the system keyring"
    }
}

#[derive(Debug, Clone, Copy, Serialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Storage {
    Keychain,
    File,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AiStatus {
    pub provider: &'static str,
    pub model: String,
    pub models: Vec<&'static str>,
    pub configured: bool,
    /// Where the key is kept, or null when none is saved.
    pub storage: Option<Storage>,
    pub keychain_name: &'static str,
}

/// A model id safe to put in the request URL.
pub fn valid_model(model: &str) -> bool {
    let mut chars = model.chars();
    matches!(chars.next(), Some(c) if c.is_ascii_lowercase() || c.is_ascii_digit())
        && model.len() <= 64
        && chars.all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '.' || c == '-')
}

/// The saved model; retired Gemini 1.x ids from v0.8 read as the default.
pub fn current_model(machine: &MachineStore) -> String {
    match machine.get(MODEL_KEY).ok().flatten() {
        Some(Value::String(m)) if valid_model(&m) && !m.starts_with("gemini-1.") => m,
        _ => DEFAULT_MODEL.to_string(),
    }
}

fn file_key(machine: &MachineStore) -> Option<String> {
    match machine.secret_get(FILE_KEY).ok().flatten() {
        Some(Value::String(k)) if !k.trim().is_empty() => Some(k.trim().to_string()),
        _ => None,
    }
}

/// The key and where it came from. The keychain wins over the file.
pub fn read_key(store: &dyn SecretStore, machine: &MachineStore) -> Option<(String, Storage)> {
    if let Ok(Some(k)) = store.get() {
        if !k.trim().is_empty() {
            return Some((k.trim().to_string(), Storage::Keychain));
        }
    }
    file_key(machine).map(|k| (k, Storage::File))
}

fn check_key(key: &str) -> Result<&str, String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("Paste your API key first.".into());
    }
    if key.len() < 10 || key.len() > 256 || !key.chars().all(|c| c.is_ascii_graphic()) {
        return Err(
            "That does not look like an API key. Copy it again from Google AI Studio.".into(),
        );
    }
    Ok(key)
}

fn check_provider(provider: &str) -> Result<(), String> {
    if provider == PROVIDER {
        Ok(())
    } else {
        Err(format!("\"{provider}\" is not a supported AI provider."))
    }
}

/// Saves the key in the keychain (or the Linux file fallback) and removes
/// any copy left in `app.json`.
pub fn save_key(
    store: &dyn SecretStore,
    machine: &MachineStore,
    key: &str,
    linux: bool,
) -> Result<Storage, String> {
    let key = check_key(key)?;
    match store.set(key) {
        Ok(()) => {
            machine.secret_set(FILE_KEY, None)?;
            Ok(Storage::Keychain)
        }
        Err(StoreError::Unavailable(_)) if linux => {
            machine.secret_set(FILE_KEY, Some(Value::String(key.to_string())))?;
            Ok(Storage::File)
        }
        Err(StoreError::Unavailable(e) | StoreError::Failed(e)) => Err(format!(
            "Could not save the key in {}: {e}",
            keychain_name()
        )),
    }
}

pub fn clear_key(store: &dyn SecretStore, machine: &MachineStore) -> Result<(), String> {
    match store.clear() {
        Ok(()) | Err(StoreError::Unavailable(_)) => {}
        Err(StoreError::Failed(e)) => {
            return Err(format!(
                "Could not remove the key from {}: {e}",
                keychain_name()
            ))
        }
    }
    machine.secret_set(FILE_KEY, None)
}

pub fn status(store: &dyn SecretStore, machine: &MachineStore) -> AiStatus {
    let storage = read_key(store, machine).map(|(_, s)| s);
    AiStatus {
        provider: PROVIDER,
        model: current_model(machine),
        models: MODELS.to_vec(),
        configured: storage.is_some(),
        storage,
        keychain_name: keychain_name(),
    }
}

/// P3.5: moves a v0.8 key out of `app.json` into the keychain. Leaves it in
/// the file only when there is no keychain on Linux (the fallback).
pub fn migrate_legacy(
    store: &dyn SecretStore,
    machine: &MachineStore,
    linux: bool,
) -> Result<bool, String> {
    let legacy = machine.secret_get("gemini").ok().flatten();
    let nested = legacy
        .as_ref()
        .and_then(|g| g.get("apiKey"))
        .and_then(Value::as_str)
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let Some(key) = file_key(machine).or(nested.clone()) else {
        return Ok(false);
    };
    if read_key(store, machine).is_some_and(|(_, s)| s == Storage::Keychain) {
        // Already in the keychain: just drop the file copies.
        machine.secret_set(FILE_KEY, None)?;
    } else {
        let saved = save_key(store, machine, &key, linux)?;
        if saved == Storage::File && nested.is_none() {
            return Ok(false);
        }
    }
    if let Some(Value::Object(mut g)) = legacy {
        if g.remove("apiKey").is_some() {
            machine.secret_set(
                "gemini",
                if g.is_empty() {
                    None
                } else {
                    Some(Value::Object(g))
                },
            )?;
        }
    }
    Ok(true)
}

const LINUX: bool = cfg!(target_os = "linux");

#[tauri::command(async)]
pub fn ai_status(machine: State<'_, MachineStore>) -> AiStatus {
    status(&Keychain, &machine)
}

#[tauri::command(async)]
pub fn ai_set_key(
    provider: String,
    key: String,
    machine: State<'_, MachineStore>,
) -> Result<AiStatus, String> {
    check_provider(&provider)?;
    save_key(&Keychain, &machine, &key, LINUX)?;
    Ok(status(&Keychain, &machine))
}

#[tauri::command(async)]
pub fn ai_clear_key(
    provider: String,
    machine: State<'_, MachineStore>,
) -> Result<AiStatus, String> {
    check_provider(&provider)?;
    clear_key(&Keychain, &machine)?;
    Ok(status(&Keychain, &machine))
}

#[tauri::command(async)]
pub fn ai_set_model(model: String, machine: State<'_, MachineStore>) -> Result<AiStatus, String> {
    if !valid_model(&model) {
        return Err(format!("\"{model}\" is not a valid model name."));
    }
    machine.set(MODEL_KEY, Value::String(model))?;
    Ok(status(&Keychain, &machine))
}

#[cfg(test)]
pub mod test_support {
    use super::*;
    use std::sync::Mutex;

    /// An in-memory keychain; `available: false` behaves like Linux without a Secret Service.
    pub struct MemoryStore {
        pub secret: Mutex<Option<String>>,
        pub available: bool,
    }

    impl MemoryStore {
        pub fn new(available: bool) -> Self {
            Self {
                secret: Mutex::new(None),
                available,
            }
        }
        fn check(&self) -> Result<(), StoreError> {
            if self.available {
                Ok(())
            } else {
                Err(StoreError::Unavailable("no secret service".into()))
            }
        }
    }

    impl SecretStore for MemoryStore {
        fn get(&self) -> Result<Option<String>, StoreError> {
            self.check()?;
            Ok(self.secret.lock().unwrap().clone())
        }
        fn set(&self, secret: &str) -> Result<(), StoreError> {
            self.check()?;
            *self.secret.lock().unwrap() = Some(secret.to_string());
            Ok(())
        }
        fn clear(&self) -> Result<(), StoreError> {
            self.check()?;
            *self.secret.lock().unwrap() = None;
            Ok(())
        }
    }
}

#[cfg(test)]
#[path = "secrets_tests.rs"]
mod tests;
