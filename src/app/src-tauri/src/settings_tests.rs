//! Tests for settings.rs and settings_import.rs (P5.5). Sample identities only.

use super::*;
use crate::secrets::test_support::MemoryStore;
use crate::settings_import::{apply, inspect, ImportInput};
use crate::vault::guard::test_support::TempDir;
use std::fs;
use std::path::Path;

const KEY: &str = "AIzaSettingsTestKey000000000000000000";
const PASS: &str = "acme studio passphrase";

struct Side {
    _tmp: TempDir,
    root: VaultRoot,
    machine: MachineStore,
    store: MemoryStore,
}

fn side(tag: &str, with_config: bool) -> Side {
    let tmp = TempDir::new(tag);
    let vault = tmp.path().join("ACME Vault");
    fs::create_dir_all(vault.join("_Team/_Config")).unwrap();
    if with_config {
        let cfg = vault.join("_Team/_Config");
        fs::write(
            cfg.join("preferences.json"),
            r#"{"theme":"dark","hourly_rate":150.5,"currency":"MYR"}"#,
        )
        .unwrap();
        fs::write(
            cfg.join("studio_profile.json"),
            r#"{"studio_name":"Acme Design Studio","bank_name":"Acme Federal Bank","logo_url":"C:\\Users\\ana\\logo.png","tagline":"Rates /hr"}"#,
        )
        .unwrap();
        fs::write(
            cfg.join("license.json"),
            r#"{"license_status":"community"}"#,
        )
        .unwrap();
    }
    let root = VaultRoot::open(&vault).unwrap();
    let machine = MachineStore::new(&tmp.path().join("Machine"));
    let store = MemoryStore::new(true);
    Side {
        _tmp: tmp,
        root,
        machine,
        store,
    }
}

fn export(from: &Side, sections: &[Section], pass: Option<&str>) -> String {
    let input = ExportInput {
        sections,
        passphrase: pass,
        now_secs: 1_789_000_000,
        platform: "windows",
    };
    let (doc, _) = build_export(Some(&from.root), &from.machine, &from.store, &input).unwrap();
    serde_json::to_string_pretty(&doc).unwrap()
}

fn import(
    to: &Side,
    text: &str,
    sections: &[Section],
    pass: Option<&str>,
) -> Result<crate::settings_import::ImportReport, String> {
    let doc = parse_doc(text)?;
    apply(
        &doc,
        Some(&to.root),
        &to.machine,
        &to.store,
        &ImportInput {
            sections,
            passphrase: pass,
            linux: false,
        },
    )
}

fn config(s: &Side, name: &str) -> Value {
    serde_json::from_str(
        &fs::read_to_string(s.root.path().join("_Team/_Config").join(name)).unwrap(),
    )
    .unwrap()
}

fn setup_source() -> Side {
    let a = side("settings-a", true);
    a.machine.set("aiModel", json!("gemini-2.5-pro")).unwrap();
    a.machine.set("deviceLabel", json!("Studio PC")).unwrap();
    a.machine
        .set(
            "recentVaults",
            json!([r"D:\Work\ACME Vault", "/home/ana/Nexus Studio"]),
        )
        .unwrap();
    secrets::save_key(&a.store, &a.machine, KEY, false).unwrap();
    a
}

#[test]
fn round_trip_moves_sections_and_key_without_paths() {
    let a = setup_source();
    let text = export(&a, &Section::ALL, Some(PASS));
    for bad in [r"D:\\Work", "/home/ana", r"C:\\Users", KEY] {
        assert!(!text.contains(bad), "export must not contain {bad}");
    }
    assert!(text.contains("\"recent_vault_names\""));
    assert!(
        text.contains("Rates /hr"),
        "short slash values are not paths"
    );

    let b = side("settings-b", false);
    let doc = parse_doc(&text).unwrap();
    let preview = inspect(&doc, Some(&b.root), &b.machine);
    assert!(preview.has_ai_key && preview.vault_open);
    assert_eq!(
        preview.recent_vault_names,
        vec!["ACME Vault", "Nexus Studio"]
    );
    let prefs = &preview.sections[0];
    assert_eq!((prefs.id, prefs.present), ("preferences", true));
    assert_eq!(
        prefs.changes.added,
        vec!["currency", "hourly_rate", "theme"]
    );

    let report = import(&b, &text, &Section::ALL, Some(PASS)).unwrap();
    assert_eq!(
        report.applied,
        vec!["preferences", "studio_profile", "app", "license"]
    );
    assert!(report.ai_key);
    assert_eq!(
        config(&b, "preferences.json"),
        config(&a, "preferences.json")
    );
    assert_eq!(
        config(&b, "studio_profile.json")["bank_name"],
        json!("Acme Federal Bank")
    );
    assert!(config(&b, "studio_profile.json").get("logo_url").is_none());
    assert_eq!(secrets::read_key(&b.store, &b.machine).unwrap().0, KEY);
    assert_eq!(
        b.machine.get("aiModel").unwrap(),
        Some(json!("gemini-2.5-pro"))
    );
    assert_eq!(
        b.machine.get("deviceLabel").unwrap(),
        Some(json!("Studio PC"))
    );
}

#[test]
fn wrong_passphrase_changes_nothing() {
    let a = setup_source();
    let text = export(&a, &[Section::Preferences, Section::App], Some(PASS));
    let b = side("settings-wrong", false);
    let err = import(
        &b,
        &text,
        &[Section::Preferences, Section::App],
        Some("not the passphrase"),
    )
    .unwrap_err();
    assert!(err.contains("passphrase is wrong"), "{err}");
    assert!(!b
        .root
        .path()
        .join("_Team/_Config/preferences.json")
        .exists());
    assert_eq!(b.machine.get("aiModel").unwrap(), None);
    assert!(secrets::read_key(&b.store, &b.machine).is_none());
}

#[test]
fn tampered_sections_lock_the_key_but_still_import() {
    let a = setup_source();
    let text = export(&a, &[Section::Preferences], Some(PASS)).replace("\"dark\"", "\"light\"");
    let b = side("settings-tamper", false);
    assert!(import(&b, &text, &[Section::Preferences], Some(PASS))
        .unwrap_err()
        .contains("changed after export"));
    import(&b, &text, &[Section::Preferences], None).unwrap();
    assert_eq!(config(&b, "preferences.json")["theme"], json!("light"));
}

#[test]
fn rejects_other_files_and_newer_formats() {
    assert!(parse_doc("not json")
        .unwrap_err()
        .contains("not valid JSON"));
    assert!(parse_doc(r#"{"format":"other"}"#)
        .unwrap_err()
        .contains("not a Kanso Cre8"));
    let newer = r#"{"format":"kanso-settings","format_version":2,"sections":{}}"#;
    assert!(parse_doc(newer)
        .unwrap_err()
        .contains("newer Kanso Cre8 (format 2)"));
    assert!(parse_doc(&format!(
        "\u{FEFF}{}",
        r#"{"format":"kanso-settings","format_version":1}"#
    ))
    .is_ok());
}

#[test]
fn missing_sections_are_skipped_and_vault_sections_need_a_vault() {
    let text = r#"{"format":"kanso-settings","format_version":1,"sections":{"preferences":{"theme":"eink"}},"secrets":null}"#;
    let b = side("settings-missing", false);
    let doc = parse_doc(text).unwrap();
    let p = inspect(&doc, Some(&b.root), &b.machine);
    assert_eq!(p.sections.iter().filter(|s| s.present).count(), 1);
    assert!(!p.has_ai_key);
    let report = import(
        &b,
        text,
        &[Section::Preferences, Section::StudioProfile],
        None,
    )
    .unwrap();
    assert_eq!(report.applied, vec!["preferences"]);
    let no_vault = apply(
        &doc,
        None,
        &b.machine,
        &b.store,
        &ImportInput {
            sections: &[Section::Preferences],
            passphrase: None,
            linux: false,
        },
    );
    assert!(no_vault.unwrap_err().contains("Open the vault"));
    assert!(import(&b, text, &[], Some(PASS))
        .unwrap_err()
        .contains("does not contain an AI key"));
}

#[test]
fn windows_paths_are_dropped_on_any_os() {
    let text = r#"{"format":"kanso-settings","format_version":1,"source_platform":"windows","sections":{
      "studio_profile":{"studio_name":"Nexus Studio","logo_url":"C:\\Users\\ana\\Pictures\\logo.png",
        "signature_url":"\\\\nas\\share\\sig.png","site":"https://example.com/a","assets":["E:/brand/a.svg","ok"]}}}"#;
    let b = side("settings-winpaths", false);
    let report = import(&b, text, &[Section::StudioProfile], None).unwrap();
    assert_eq!(
        report.removed_paths,
        vec![
            "studio_profile.logo_url",
            "studio_profile.signature_url",
            "studio_profile.assets[]"
        ]
    );
    let written = config(&b, "studio_profile.json");
    assert_eq!(written["site"], json!("https://example.com/a"));
    assert_eq!(written["assets"], json!(["ok"]));
}

/// Made on Windows by `write_windows_fixture`; every CI OS must import it.
const FIXTURE: &str = include_str!("../tests/fixtures/settings-v1-windows.json");
const FIXTURE_PASS: &str = "lumina fixture passphrase";
const FIXTURE_KEY: &str = "AIzaFixtureKeyLumina000000000000000000";

#[test]
fn imports_the_windows_fixture_on_every_os() {
    let b = side("settings-fixture", false);
    let preview = inspect(&parse_doc(FIXTURE).unwrap(), Some(&b.root), &b.machine);
    assert_eq!(preview.source_platform, "windows");
    import(&b, FIXTURE, &Section::ALL, Some(FIXTURE_PASS)).unwrap();
    assert_eq!(
        secrets::read_key(&b.store, &b.machine).unwrap().0,
        FIXTURE_KEY
    );
    assert_eq!(
        config(&b, "studio_profile.json")["studio_name"],
        json!("Lumina Labs")
    );
}

#[test]
#[ignore = "run once on Windows to refresh the fixture"]
fn write_windows_fixture() {
    let a = side("settings-fixture-src", false);
    let cfg = a.root.path().join("_Team/_Config");
    fs::write(
        cfg.join("preferences.json"),
        r#"{"theme":"neumorphic","currency":"USD","hourly_rate":125}"#,
    )
    .unwrap();
    fs::write(
        cfg.join("studio_profile.json"),
        r#"{"studio_name":"Lumina Labs","email":"studio@example.com"}"#,
    )
    .unwrap();
    a.machine
        .set("recentVaults", json!([r"E:\Vaults\Lumina Labs"]))
        .unwrap();
    a.machine
        .set("deviceLabel", json!("Lumina Studio PC"))
        .unwrap();
    secrets::save_key(&a.store, &a.machine, FIXTURE_KEY, false).unwrap();
    let text = export(
        &a,
        &[Section::Preferences, Section::StudioProfile, Section::App],
        Some(FIXTURE_PASS),
    );
    let out = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/settings-v1-windows.json");
    fs::create_dir_all(out.parent().unwrap()).unwrap();
    fs::write(out, text + "\n").unwrap();
}
