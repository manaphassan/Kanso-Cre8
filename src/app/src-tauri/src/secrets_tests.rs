//! Tests for secrets.rs, kept apart so secrets.rs stays under 400 lines.

use super::test_support::MemoryStore;
use super::*;
use crate::vault::guard::test_support::TempDir;
use serde_json::json;
use std::fs;

const KEY: &str = "AIzaTestKey0123456789abcdefghijklmnop";

fn machine(tmp: &TempDir, json: &str) -> (MachineStore, std::path::PathBuf) {
    let dir = tmp.path().join("KansoCre8");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("app.json"), json).unwrap();
    (MachineStore::new(&dir), dir.join("app.json"))
}

fn raw(path: &std::path::Path) -> Value {
    serde_json::from_slice(&fs::read(path).unwrap()).unwrap()
}

#[test]
fn saves_in_the_keychain_and_never_reports_the_key() {
    let tmp = TempDir::new("secrets");
    let (m, path) = machine(&tmp, r#"{"theme":"dark"}"#);
    let kc = MemoryStore::new(true);
    assert!(!status(&kc, &m).configured);
    assert_eq!(
        save_key(&kc, &m, &format!("  {KEY} \n"), false).unwrap(),
        Storage::Keychain
    );
    let s = status(&kc, &m);
    assert!(s.configured);
    assert_eq!(s.storage, Some(Storage::Keychain));
    assert!(
        !serde_json::to_string(&s).unwrap().contains("AIza"),
        "status must not carry the key"
    );
    assert!(!fs::read_to_string(&path).unwrap().contains("AIza"));
    assert_eq!(read_key(&kc, &m).unwrap().0, KEY);
    clear_key(&kc, &m).unwrap();
    assert!(!status(&kc, &m).configured);
}

#[test]
fn rejects_empty_or_odd_keys_and_unknown_providers() {
    let tmp = TempDir::new("secrets-bad");
    let (m, _) = machine(&tmp, "{}");
    let kc = MemoryStore::new(true);
    assert!(save_key(&kc, &m, "  ", false).is_err());
    assert!(save_key(&kc, &m, "short", false).is_err());
    assert!(save_key(&kc, &m, "has a space in the middle", false).is_err());
    assert!(check_provider("openai").is_err());
}

#[test]
fn falls_back_to_the_file_only_on_linux() {
    let tmp = TempDir::new("secrets-linux");
    let (m, path) = machine(&tmp, "{}");
    let none = MemoryStore::new(false);
    assert!(
        save_key(&none, &m, KEY, false).is_err(),
        "Windows and macOS need the keychain"
    );
    assert_eq!(save_key(&none, &m, KEY, true).unwrap(), Storage::File);
    assert_eq!(raw(&path)["aiApiKey"], json!(KEY));
    assert_eq!(status(&none, &m).storage, Some(Storage::File));
    clear_key(&none, &m).unwrap();
    assert!(raw(&path).get("aiApiKey").is_none());
}

#[test]
fn migrates_the_v08_key_out_of_app_json() {
    let tmp = TempDir::new("secrets-migrate");
    let (m, path) = machine(
        &tmp,
        &format!(r#"{{"aiApiKey":"{KEY}","aiModel":"gemini-1.5-flash","theme":"dark"}}"#),
    );
    let kc = MemoryStore::new(true);
    assert!(migrate_legacy(&kc, &m, false).unwrap());
    assert!(raw(&path).get("aiApiKey").is_none());
    assert_eq!(raw(&path)["theme"], json!("dark"));
    assert_eq!(
        read_key(&kc, &m).unwrap(),
        (KEY.to_string(), Storage::Keychain)
    );
    assert_eq!(
        current_model(&m),
        DEFAULT_MODEL,
        "retired 1.x model reads as the default"
    );
    assert!(
        !migrate_legacy(&kc, &m, false).unwrap(),
        "second run does nothing"
    );

    let tmp2 = TempDir::new("secrets-migrate-nested");
    let (m2, path2) = machine(&tmp2, &format!(r#"{{"gemini":{{"apiKey":"{KEY}"}}}}"#));
    assert!(migrate_legacy(&kc, &m2, false).unwrap());
    assert!(raw(&path2).get("gemini").is_none());
}

#[test]
fn keeps_the_file_key_when_linux_has_no_keychain() {
    let tmp = TempDir::new("secrets-migrate-linux");
    let (m, path) = machine(&tmp, &format!(r#"{{"aiApiKey":"{KEY}"}}"#));
    let none = MemoryStore::new(false);
    assert!(!migrate_legacy(&none, &m, true).unwrap());
    assert_eq!(raw(&path)["aiApiKey"], json!(KEY));
}

#[test]
fn model_names_are_url_safe() {
    assert!(valid_model("gemini-2.5-flash"));
    assert!(!valid_model("gemini/../x"));
    assert!(!valid_model("Gemini"));
    assert!(!valid_model(""));
    assert!(!valid_model("gemini-2.5-flash?key=x"));
}
