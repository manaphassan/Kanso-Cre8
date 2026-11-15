//! Saves a generated text file, or a copy of a vault file, to a location the
//! user chose in a save dialog (invoice HTML export, deliverable download).

use crate::vault::guard::VaultRoot;
use crate::vault::ops::write_bytes_atomic;
use crate::vault::VaultState;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Runtime, State};
use tauri_plugin_fs::FsExt;

/// The dialog plugin adds every path the user picks to the fs scope, so a
/// destination outside that scope did not come from a save dialog.
fn picked<R: Runtime>(app: &AppHandle<R>, dest: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(dest);
    let allowed = app
        .try_fs_scope()
        .is_some_and(|scope| scope.is_allowed(&path));
    if !path.is_absolute() || !allowed {
        return Err("Choose where to save the file first.".to_string());
    }
    Ok(path)
}

fn check_parent(dest: &Path) -> Result<(), String> {
    match dest.parent() {
        Some(parent) if parent.is_dir() => Ok(()),
        _ => Err(format!(
            "The folder for \"{}\" does not exist.",
            dest.display()
        )),
    }
}

/// Writes `text` to `dest` atomically. Returns the number of bytes written.
pub fn write_text_to(dest: &Path, text: &str) -> Result<u64, String> {
    check_parent(dest)?;
    write_bytes_atomic(dest, text.as_bytes(), &dest.display().to_string())?;
    Ok(text.len() as u64)
}

/// Copies the vault file `rel` to `dest` atomically. Returns its size.
pub fn copy_out(root: &VaultRoot, rel: &str, dest: &Path) -> Result<u64, String> {
    let source = root.resolve(rel).map_err(|e| e.to_string())?;
    if !source.is_file() {
        return Err(format!("\"{rel}\" is not a file."));
    }
    check_parent(dest)?;
    let bytes = fs::read(&source).map_err(|e| format!("Could not read \"{rel}\": {e}"))?;
    write_bytes_atomic(dest, &bytes, &dest.display().to_string())?;
    Ok(bytes.len() as u64)
}

#[tauri::command]
pub fn save_text_as<R: Runtime>(
    app: AppHandle<R>,
    dest: String,
    text: String,
) -> Result<u64, String> {
    write_text_to(&picked(&app, &dest)?, &text)
}

#[tauri::command]
pub fn save_file_as<R: Runtime>(
    app: AppHandle<R>,
    path: String,
    dest: String,
    state: State<'_, VaultState>,
) -> Result<u64, String> {
    let dest = picked(&app, &dest)?;
    state.with(|root| copy_out(root, &path, &dest))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vault::guard::test_support::TempDir;

    #[test]
    fn writes_text_and_copies_vault_files_out() {
        let tmp = TempDir::new("saveas");
        let vault = tmp.path().join("Vault");
        fs::create_dir_all(vault.join("_Projects/P1/05_DELIVERABLES")).unwrap();
        fs::write(
            vault.join("_Projects/P1/05_DELIVERABLES/hero.png"),
            [7u8; 32],
        )
        .unwrap();
        let root = VaultRoot::open(&vault).unwrap();
        let out = tmp.path().join("Out");
        fs::create_dir_all(&out).unwrap();

        assert_eq!(
            write_text_to(&out.join("INV-1.html"), "<p>x</p>").unwrap(),
            8
        );
        assert_eq!(
            fs::read_to_string(out.join("INV-1.html")).unwrap(),
            "<p>x</p>"
        );

        let size = copy_out(
            &root,
            "_Projects/P1/05_DELIVERABLES/hero.png",
            &out.join("hero.png"),
        )
        .unwrap();
        assert_eq!(size, 32);
        assert_eq!(fs::read(out.join("hero.png")).unwrap(), vec![7u8; 32]);
    }

    #[test]
    fn refuses_missing_folders_and_paths_outside_the_vault() {
        let tmp = TempDir::new("saveas-bad");
        let vault = tmp.path().join("Vault");
        fs::create_dir_all(&vault).unwrap();
        fs::write(tmp.path().join("secret.txt"), "x").unwrap();
        let root = VaultRoot::open(&vault).unwrap();
        assert!(write_text_to(&tmp.path().join("no/dir/a.html"), "x").is_err());
        assert!(copy_out(&root, "../secret.txt", &tmp.path().join("b.txt")).is_err());
        assert!(copy_out(&root, "", &tmp.path().join("c.txt")).is_err());
    }
}
