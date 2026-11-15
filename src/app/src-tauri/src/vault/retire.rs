//! Retires legacy config files from the vault (kanso-vault-schema migration
//! rules): each file is first copied to `<machine dir>/backups/` (never
//! synced) and only then removed from the vault. Only the names below can be
//! retired, so this cannot be used to delete user content.

use super::guard::VaultRoot;
use super::VaultState;
use crate::names::{now_millis, utc_stamp};
use crate::paths::AppPaths;
use serde::Serialize;
use std::fs;
use std::path::Path;
use tauri::State;

/// Retired file names, looked up in `_Team/_Config/` and `_Team/`.
pub const RETIRED_FILES: &[&str] = &[
    "user_passwords.json",
    "staff_directory.json",
    "team-notes.json",
    "companies.json",
    "timer.json",
    "theme.txt",
    "license.key",
    "ai-config.json",
    "audit-log.jsonl",
    "share-tokens.json",
];
/// Global comments folder replaced by per-project `_review.md`.
pub const RETIRED_DIR: &str = "_Team/comments";

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Retired {
    pub path: String,
    pub backup: String,
}

fn backup_name(vault: &Path, rel: &str, stamp: &str) -> String {
    let vault_name = vault
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_else(|| "vault".into());
    format!(
        "{vault_name}-{stamp}-{}.migrated.bak",
        rel.replace('/', "_")
    )
}

pub fn retire(
    root: &VaultRoot,
    machine_dir: &Path,
    names: &[String],
) -> Result<Vec<Retired>, String> {
    let backups = machine_dir.join("backups");
    let stamp = utc_stamp(now_millis() / 1000);
    let mut out = Vec::new();
    let ensure_backups = || {
        fs::create_dir_all(&backups)
            .map_err(|e| format!("Could not create {}: {e}", backups.display()))
    };

    for name in names {
        if name == RETIRED_DIR {
            let dir = root.resolve(RETIRED_DIR).map_err(|e| e.to_string())?;
            if !dir.is_dir() {
                continue;
            }
            ensure_backups()?;
            for item in fs::read_dir(&dir).map_err(|e| e.to_string())?.flatten() {
                let file = item.path();
                if file.is_file() {
                    let rel = format!("{RETIRED_DIR}/{}", item.file_name().to_string_lossy());
                    let dest = backups.join(backup_name(root.path(), &rel, &stamp));
                    fs::copy(&file, &dest).map_err(|e| format!("Could not back up {rel}: {e}"))?;
                    out.push(Retired {
                        path: rel,
                        backup: dest.display().to_string(),
                    });
                }
            }
            fs::remove_dir_all(&dir).map_err(|e| format!("Could not remove {RETIRED_DIR}: {e}"))?;
            continue;
        }
        if !RETIRED_FILES.contains(&name.as_str()) {
            return Err(format!("\"{name}\" is not a retired config file."));
        }
        for folder in ["_Team/_Config", "_Team"] {
            let rel = format!("{folder}/{name}");
            let file = root.resolve(&rel).map_err(|e| e.to_string())?;
            if !file.is_file() {
                continue;
            }
            ensure_backups()?;
            let dest = backups.join(backup_name(root.path(), &rel, &stamp));
            fs::copy(&file, &dest).map_err(|e| format!("Could not back up {rel}: {e}"))?;
            fs::remove_file(&file).map_err(|e| format!("Could not remove {rel}: {e}"))?;
            out.push(Retired {
                path: rel,
                backup: dest.display().to_string(),
            });
        }
    }
    Ok(out)
}

#[tauri::command]
pub fn retire_vault_files(
    names: Vec<String>,
    paths: State<'_, AppPaths>,
    state: State<'_, VaultState>,
) -> Result<Vec<Retired>, String> {
    state.with(|r| retire(r, &paths.machine_dir, &names))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vault::guard::test_support::TempDir;

    #[test]
    fn backs_up_then_removes_only_allowed_files() {
        let tmp = TempDir::new("retire");
        let vault = tmp.path().join("Vault");
        let machine = tmp.path().join("Machine");
        fs::create_dir_all(vault.join("_Team/_Config")).unwrap();
        fs::create_dir_all(vault.join("_Team/comments")).unwrap();
        fs::write(
            vault.join("_Team/_Config/user_passwords.json"),
            "{\"alex\":\"x\"}",
        )
        .unwrap();
        fs::write(vault.join("_Team/audit-log.jsonl"), "{}\n").unwrap();
        fs::write(vault.join("_Team/comments/P1.jsonl"), "{}\n").unwrap();
        fs::write(vault.join("_Team/_Config/studio_profile.json"), "{}").unwrap();
        let root = VaultRoot::open(&vault).unwrap();

        let names: Vec<String> = [
            "user_passwords.json",
            "audit-log.jsonl",
            "timer.json",
            RETIRED_DIR,
        ]
        .iter()
        .map(|s| s.to_string())
        .collect();
        let retired = retire(&root, &machine, &names).unwrap();
        let paths: Vec<&str> = retired.iter().map(|r| r.path.as_str()).collect();
        assert_eq!(
            paths,
            vec![
                "_Team/_Config/user_passwords.json",
                "_Team/audit-log.jsonl",
                "_Team/comments/P1.jsonl"
            ]
        );
        assert!(!vault.join("_Team/_Config/user_passwords.json").exists());
        assert!(!vault.join("_Team/comments").exists());
        assert!(vault.join("_Team/_Config/studio_profile.json").exists());
        for r in &retired {
            assert!(Path::new(&r.backup).is_file(), "{}", r.backup);
        }
        let backup = fs::read_to_string(&retired[0].backup).unwrap();
        assert_eq!(backup, "{\"alex\":\"x\"}");

        assert!(retire(&root, &machine, &["studio_profile.json".to_string()]).is_err());
        assert!(retire(&root, &machine, &["../x".to_string()]).is_err());
        assert!(
            retire(&root, &machine, &names).unwrap().is_empty(),
            "idempotent"
        );
    }
}
