//! ZIP export and file hashing for handover packages and full-vault export.

use crate::vault::guard::VaultRoot;
use crate::vault::ops::TEMP_MARKER;
use crate::vault::VaultState;
use serde::Serialize;
use sha2::{Digest, Sha256};
use std::fs;
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use tauri::State;
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;
use zip::{CompressionMethod, ZipWriter};

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct ZipSummary {
    pub files: u32,
    pub bytes: u64,
}

/// Collects vault-relative file paths for the requested files and folders.
fn collect(root: &VaultRoot, rels: &[String]) -> Result<Vec<(String, PathBuf)>, String> {
    let mut out = Vec::new();
    for rel in rels {
        let abs = root.resolve(rel).map_err(|e| e.to_string())?;
        if abs.is_file() {
            out.push((root.relative(&abs).unwrap_or_else(|| rel.clone()), abs));
        } else if abs.is_dir() {
            for item in WalkDir::new(&abs).follow_links(false).into_iter().flatten() {
                let name = item.file_name().to_string_lossy();
                if item.file_type().is_file() && !name.contains(TEMP_MARKER) {
                    if let Some(r) = root.relative(item.path()) {
                        out.push((r, item.path().to_path_buf()));
                    }
                }
            }
        } else {
            return Err(format!("\"{rel}\" does not exist."));
        }
    }
    out.sort_by(|a, b| a.0.cmp(&b.0));
    out.dedup_by(|a, b| a.0 == b.0);
    Ok(out)
}

/// A generated file to add to an export (for example DELIVERY.md).
#[derive(Debug, Clone, serde::Deserialize, PartialEq, Eq)]
pub struct ZipExtra {
    pub name: String,
    pub text: String,
}

fn check_entry_name(name: &str) -> Result<(), String> {
    crate::vault::guard::parse_relative(name)
        .map_err(|e| e.to_string())
        .and_then(|s| {
            if s.is_empty() {
                Err("An export entry needs a name.".into())
            } else {
                Ok(())
            }
        })
}

/// Writes a ZIP of the given vault paths to `dest` (an absolute path the user
/// chose in a save dialog). Entry names are vault-relative with forward
/// slashes; `prefix` (if set) is stripped from them. `extras` are generated
/// text files added at the given names. The archive is staged next to `dest`
/// and renamed when complete.
pub fn build_zip(
    root: &VaultRoot,
    rels: &[String],
    dest: &Path,
    prefix: Option<&str>,
    extras: &[ZipExtra],
) -> Result<ZipSummary, String> {
    if dest.extension().map(|e| e.to_ascii_lowercase()) != Some("zip".into()) {
        return Err("The export file must end in .zip.".to_string());
    }
    for extra in extras {
        check_entry_name(&extra.name)?;
    }
    let dest_abs = dest
        .parent()
        .and_then(|p| fs::canonicalize(p).ok())
        .map(|p| p.join(dest.file_name().unwrap_or_default()))
        .ok_or_else(|| format!("The folder for \"{}\" does not exist.", dest.display()))?;
    let files = collect(root, rels)?;
    let strip = prefix.map(|p| format!("{}/", p.trim_matches('/')));
    let temp = dest_abs.with_extension(format!("zip{TEMP_MARKER}{}", std::process::id()));

    let result = (|| -> io::Result<ZipSummary> {
        let mut zip = ZipWriter::new(fs::File::create(&temp)?);
        let mut summary = ZipSummary { files: 0, bytes: 0 };
        let deflate = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
        for (name, abs) in &files {
            if abs == &dest_abs {
                continue; // never zip the archive into itself
            }
            let size = fs::metadata(abs)?.len();
            let entry = match &strip {
                Some(s) => name.strip_prefix(s.as_str()).unwrap_or(name),
                None => name,
            };
            zip.start_file(entry, deflate.large_file(size >= u64::from(u32::MAX)))
                .map_err(io::Error::other)?;
            io::copy(&mut fs::File::open(abs)?, &mut zip)?;
            summary.files += 1;
            summary.bytes += size;
        }
        for extra in extras {
            zip.start_file(extra.name.as_str(), deflate)
                .map_err(io::Error::other)?;
            zip.write_all(extra.text.as_bytes())?;
            summary.files += 1;
            summary.bytes += extra.text.len() as u64;
        }
        let mut file = zip.finish().map_err(io::Error::other)?;
        file.flush()?;
        file.sync_all()?;
        Ok(summary)
    })();

    match result {
        Ok(summary) => {
            fs::rename(&temp, &dest_abs).map_err(|e| {
                let _ = fs::remove_file(&temp);
                format!("Could not save \"{}\": {e}", dest.display())
            })?;
            Ok(summary)
        }
        Err(e) => {
            let _ = fs::remove_file(&temp);
            Err(format!("Could not create \"{}\": {e}", dest.display()))
        }
    }
}

pub fn hash_file(path: &Path) -> io::Result<String> {
    let mut file = fs::File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buf = vec![0u8; 64 * 1024];
    loop {
        let n = file.read(&mut buf)?;
        if n == 0 {
            break;
        }
        hasher.update(&buf[..n]);
    }
    Ok(hasher
        .finalize()
        .iter()
        .map(|b| format!("{b:02x}"))
        .collect())
}

#[tauri::command]
pub fn export_zip(
    paths: Vec<String>,
    dest: String,
    prefix: Option<String>,
    extras: Option<Vec<ZipExtra>>,
    state: State<'_, VaultState>,
) -> Result<ZipSummary, String> {
    state.with(|r| {
        build_zip(
            r,
            &paths,
            Path::new(&dest),
            prefix.as_deref(),
            &extras.unwrap_or_default(),
        )
    })
}

#[tauri::command]
pub fn sha256_file(path: String, state: State<'_, VaultState>) -> Result<String, String> {
    state.with(|r| {
        let abs = r.resolve(&path).map_err(|e| e.to_string())?;
        hash_file(&abs).map_err(|e| format!("Could not read \"{path}\": {e}"))
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vault::guard::test_support::TempDir;
    use zip::ZipArchive;

    fn vault() -> (TempDir, VaultRoot) {
        let tmp = TempDir::new("archive");
        let root = tmp.path().join("Vault");
        let deliver = root.join("_Projects/2026/P1/05_DELIVERABLES");
        fs::create_dir_all(&deliver).unwrap();
        fs::write(deliver.join("hero.png"), vec![1u8; 5000]).unwrap();
        fs::write(deliver.join(format!("x{TEMP_MARKER}1")), "tmp").unwrap();
        fs::write(root.join("_Projects/2026/P1/README.md"), "# P1\n").unwrap();
        let v = VaultRoot::open(&root).unwrap();
        (tmp, v)
    }

    #[test]
    fn exports_files_and_folders_with_forward_slash_names() {
        let (tmp, v) = vault();
        let dest = tmp.path().join("handover.zip");
        let summary = build_zip(
            &v,
            &[
                "_Projects/2026/P1/05_DELIVERABLES".into(),
                "_Projects/2026/P1/README.md".into(),
            ],
            &dest,
            None,
            &[],
        )
        .unwrap();
        assert_eq!(
            summary,
            ZipSummary {
                files: 2,
                bytes: 5005
            }
        );

        let mut zip = ZipArchive::new(fs::File::open(&dest).unwrap()).unwrap();
        let mut names: Vec<String> = (0..zip.len())
            .map(|i| zip.by_index(i).unwrap().name().unwrap().to_string())
            .collect();
        names.sort();
        assert_eq!(
            names,
            vec![
                "_Projects/2026/P1/05_DELIVERABLES/hero.png",
                "_Projects/2026/P1/README.md"
            ]
        );
        let mut readme = String::new();
        zip.by_name("_Projects/2026/P1/README.md")
            .unwrap()
            .read_to_string(&mut readme)
            .unwrap();
        assert_eq!(readme, "# P1\n");
        let leftovers = fs::read_dir(tmp.path())
            .unwrap()
            .flatten()
            .filter(|e| e.file_name().to_string_lossy().contains(TEMP_MARKER))
            .count();
        assert_eq!(leftovers, 0);
    }

    #[test]
    fn export_rejects_bad_destinations_and_paths() {
        let (tmp, v) = vault();
        assert!(build_zip(
            &v,
            &["_Projects".into()],
            &tmp.path().join("out.txt"),
            None,
            &[]
        )
        .is_err());
        assert!(build_zip(
            &v,
            &["_Projects".into()],
            &tmp.path().join("no/dir/out.zip"),
            None,
            &[]
        )
        .is_err());
        assert!(build_zip(&v, &["../x".into()], &tmp.path().join("out.zip"), None, &[]).is_err());
        assert!(build_zip(
            &v,
            &["missing".into()],
            &tmp.path().join("out.zip"),
            None,
            &[]
        )
        .is_err());
        let bad = [ZipExtra {
            name: "../evil.txt".into(),
            text: "x".into(),
        }];
        assert!(build_zip(&v, &[], &tmp.path().join("out.zip"), None, &bad).is_err());
    }

    #[test]
    fn strips_the_prefix_and_adds_generated_files() {
        let (tmp, v) = vault();
        let dest = tmp.path().join("P1-handover.zip");
        let extras = [ZipExtra {
            name: "DELIVERY.md".into(),
            text: "# Delivery\n".into(),
        }];
        let summary = build_zip(
            &v,
            &["_Projects/2026/P1/05_DELIVERABLES".into()],
            &dest,
            Some("_Projects/2026/P1"),
            &extras,
        )
        .unwrap();
        assert_eq!(summary.files, 2);
        let mut zip = ZipArchive::new(fs::File::open(&dest).unwrap()).unwrap();
        let mut names: Vec<String> = (0..zip.len())
            .map(|i| zip.by_index(i).unwrap().name().unwrap().to_string())
            .collect();
        names.sort();
        assert_eq!(names, vec!["05_DELIVERABLES/hero.png", "DELIVERY.md"]);
        let mut text = String::new();
        zip.by_name("DELIVERY.md")
            .unwrap()
            .read_to_string(&mut text)
            .unwrap();
        assert_eq!(text, "# Delivery\n");
    }

    #[test]
    fn sha256_matches_known_vectors() {
        let (tmp, _v) = vault();
        let empty = tmp.path().join("empty.txt");
        fs::write(&empty, "").unwrap();
        assert_eq!(
            hash_file(&empty).unwrap(),
            "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
        );
        let abc = tmp.path().join("abc.txt");
        fs::write(&abc, "abc").unwrap();
        assert_eq!(
            hash_file(&abc).unwrap(),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }
}
