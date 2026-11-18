//! Machine tier: `app.json` in the machine directory (OS config dir, or
//! `Data/` beside the app in portable mode). Never synced, never in the vault.
//!
//! Secret keys are never returned to the webview and cannot be written from
//! it. Only `secrets.rs` reaches them, through `secret_get` / `secret_set`:
//! the AI key lives here only as the Linux fallback when no Secret Service
//! is running, or until the one-time move into the OS keychain.

use crate::paths::AppPaths;
use serde_json::{Map, Value};
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::State;

const FILE_NAME: &str = "app.json";
const SECRET_KEYS: &[&str] = &["aiApiKey", "serverSecret"];

pub struct MachineStore {
    path: PathBuf,
    lock: Mutex<()>,
}

impl MachineStore {
    pub fn new(machine_dir: &Path) -> Self {
        Self {
            path: machine_dir.join(FILE_NAME),
            lock: Mutex::new(()),
        }
    }

    fn load(&self) -> Map<String, Value> {
        fs::read(&self.path)
            .ok()
            .and_then(|b| serde_json::from_slice::<Value>(&b).ok())
            .and_then(|v| match v {
                Value::Object(map) => Some(map),
                _ => None,
            })
            .unwrap_or_default()
    }

    fn save(&self, map: &Map<String, Value>) -> Result<(), String> {
        let dir = self.path.parent().unwrap_or(Path::new("."));
        create_private_dir(dir).map_err(|e| format!("Could not create {}: {e}", dir.display()))?;
        let json = serde_json::to_vec_pretty(map).map_err(|e| e.to_string())?;
        let temp = self
            .path
            .with_extension(format!("json.tmp-{}", std::process::id()));
        let result = (|| -> std::io::Result<()> {
            let mut file = open_private(&temp)?;
            file.write_all(&json)?;
            file.sync_all()?;
            drop(file);
            fs::rename(&temp, &self.path)
        })();
        if result.is_err() {
            let _ = fs::remove_file(&temp);
        }
        result.map_err(|e| format!("Could not save machine settings: {e}"))
    }

    pub fn get(&self, key: &str) -> Result<Option<Value>, String> {
        check_key(key)?;
        let _guard = self
            .lock
            .lock()
            .map_err(|_| "Machine settings are busy.".to_string())?;
        Ok(self.load().get(key).cloned())
    }

    /// Sets a key, or removes it when `value` is null.
    pub fn set(&self, key: &str, value: Value) -> Result<(), String> {
        check_key(key)?;
        let _guard = self
            .lock
            .lock()
            .map_err(|_| "Machine settings are busy.".to_string())?;
        let mut map = self.load();
        if value.is_null() {
            map.remove(key);
        } else {
            map.insert(key.to_string(), value);
        }
        self.save(&map)
    }

    /// Reads a secret key (Rust only; never exposed as a command).
    pub(crate) fn secret_get(&self, key: &str) -> Result<Option<Value>, String> {
        let _guard = self
            .lock
            .lock()
            .map_err(|_| "Machine settings are busy.".to_string())?;
        Ok(self.load().get(key).cloned())
    }

    /// Writes or (with `None`) removes a secret key (Rust only).
    pub(crate) fn secret_set(&self, key: &str, value: Option<Value>) -> Result<(), String> {
        let _guard = self
            .lock
            .lock()
            .map_err(|_| "Machine settings are busy.".to_string())?;
        let mut map = self.load();
        match value {
            Some(v) => {
                map.insert(key.to_string(), v);
            }
            None if !map.contains_key(key) => return Ok(()),
            None => {
                map.remove(key);
            }
        }
        self.save(&map)
    }
}

fn check_key(key: &str) -> Result<(), String> {
    if key.is_empty()
        || key.len() > 64
        || !key.chars().all(|c| c.is_ascii_alphanumeric() || c == '_')
    {
        return Err(format!("\"{key}\" is not a valid setting name."));
    }
    if SECRET_KEYS.contains(&key) {
        return Err(format!(
            "\"{key}\" is a secret and cannot be read or written here."
        ));
    }
    Ok(())
}

#[cfg(unix)]
fn create_private_dir(dir: &Path) -> std::io::Result<()> {
    use std::os::unix::fs::DirBuilderExt;
    if dir.is_dir() {
        return Ok(());
    }
    fs::DirBuilder::new()
        .recursive(true)
        .mode(0o700)
        .create(dir)
}

#[cfg(not(unix))]
fn create_private_dir(dir: &Path) -> std::io::Result<()> {
    fs::create_dir_all(dir)
}

#[cfg(unix)]
fn open_private(path: &Path) -> std::io::Result<fs::File> {
    use std::os::unix::fs::OpenOptionsExt;
    fs::OpenOptions::new()
        .write(true)
        .create(true)
        .truncate(true)
        .mode(0o600)
        .open(path)
}

/// On Windows the per-user profile folders are already private to the user.
#[cfg(not(unix))]
fn open_private(path: &Path) -> std::io::Result<fs::File> {
    fs::File::create(path)
}

#[tauri::command]
pub fn machine_get(key: String, store: State<'_, MachineStore>) -> Result<Option<Value>, String> {
    store.get(&key)
}

#[tauri::command]
pub fn machine_set(
    key: String,
    value: Value,
    store: State<'_, MachineStore>,
) -> Result<(), String> {
    store.set(&key, value)
}

pub fn store_for(paths: &AppPaths) -> MachineStore {
    MachineStore::new(&paths.machine_dir)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vault::guard::test_support::TempDir;
    use serde_json::json;

    #[test]
    fn round_trips_values_and_creates_the_directory() {
        let tmp = TempDir::new("machine");
        let store = MachineStore::new(&tmp.path().join("KansoCre8"));
        assert_eq!(store.get("workspaceRoot").unwrap(), None);
        store.set("workspaceRoot", json!("D:/Vault")).unwrap();
        store
            .set("recentVaults", json!(["D:/Vault", "E:/Other"]))
            .unwrap();
        assert_eq!(store.get("workspaceRoot").unwrap(), Some(json!("D:/Vault")));
        store.set("workspaceRoot", Value::Null).unwrap();
        assert_eq!(store.get("workspaceRoot").unwrap(), None);
        assert_eq!(
            store.get("recentVaults").unwrap(),
            Some(json!(["D:/Vault", "E:/Other"]))
        );
    }

    #[test]
    fn secrets_are_neither_returned_nor_overwritten() {
        let tmp = TempDir::new("machine-secret");
        let dir = tmp.path().join("KansoCre8");
        fs::create_dir_all(&dir).unwrap();
        fs::write(
            dir.join(FILE_NAME),
            r#"{"aiApiKey":"k-123","serverSecret":"s","aiModel":"m"}"#,
        )
        .unwrap();
        let store = MachineStore::new(&dir);
        assert!(store.get("aiApiKey").is_err());
        assert!(store.set("serverSecret", json!("x")).is_err());
        store.set("deviceLabel", json!("Studio PC")).unwrap();
        let raw: Value = serde_json::from_slice(&fs::read(dir.join(FILE_NAME)).unwrap()).unwrap();
        assert_eq!(raw["aiApiKey"], json!("k-123"), "secret preserved on write");
        assert_eq!(raw["serverSecret"], json!("s"));
        assert_eq!(raw["deviceLabel"], json!("Studio PC"));
        assert_eq!(store.get("aiModel").unwrap(), Some(json!("m")));
    }

    #[test]
    fn rejects_odd_keys_and_survives_a_corrupt_file() {
        let tmp = TempDir::new("machine-corrupt");
        let dir = tmp.path().join("KansoCre8");
        fs::create_dir_all(&dir).unwrap();
        fs::write(dir.join(FILE_NAME), "{ not json").unwrap();
        let store = MachineStore::new(&dir);
        for key in ["", "../x", "a.b", "with space"] {
            assert!(store.get(key).is_err(), "{key:?}");
        }
        assert_eq!(store.get("theme").unwrap(), None);
        store.set("theme", json!("dark")).unwrap();
        assert_eq!(store.get("theme").unwrap(), Some(json!("dark")));
    }

    #[cfg(unix)]
    #[test]
    fn file_is_user_only_on_unix() {
        use std::os::unix::fs::PermissionsExt;
        let tmp = TempDir::new("machine-perm");
        let dir = tmp.path().join("KansoCre8");
        let store = MachineStore::new(&dir);
        store.set("theme", json!("dark")).unwrap();
        let mode = fs::metadata(dir.join(FILE_NAME))
            .unwrap()
            .permissions()
            .mode();
        assert_eq!(mode & 0o777, 0o600);
    }
}
