//! File operations on the open vault. Every path is vault-relative and goes
//! through `VaultRoot::resolve`. Writes are atomic (temp file in the same
//! folder, flush, rename) so cloud sync clients never see half-written files,
//! and no file handle is held between calls.

use super::guard::{parse_relative, VaultRoot};
use crate::names::{case_collision, millis_of, now_millis, utc_stamp, validate_new_name};
use serde::Serialize;
use std::fs;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU32, Ordering};
use walkdir::WalkDir;

pub const TEMP_MARKER: &str = ".kanso-tmp-";
pub const ARCHIVE_DIR: &str = "_Archive";
const TEXT_EXTENSIONS: &[&str] = &["md", "json", "txt", "yml", "yaml"];
const MAX_TEXT_BYTES: u64 = 1024 * 1024;
const SKIPPED_DIRS: &[&str] = &["node_modules"];

static TEMP_COUNTER: AtomicU32 = AtomicU32::new(0);

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Entry {
    pub path: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub text: Option<String>,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Written {
    pub path: String,
    pub size: u64,
}

fn io_err(action: &str, rel: &str, e: std::io::Error) -> String {
    format!("Could not {action} \"{rel}\": {e}")
}

/// Every segment the app is about to create must be valid on all three OS.
/// Existing folders are left alone, whatever their names.
fn validate_new_segments(root: &VaultRoot, rel: &str) -> Result<(), String> {
    let mut current = root.path().to_path_buf();
    for segment in parse_relative(rel).map_err(|e| e.to_string())? {
        current.push(&segment);
        if !current.exists() {
            validate_new_name(&segment)?;
        }
    }
    Ok(())
}

fn is_temp_name(name: &str) -> bool {
    name.contains(TEMP_MARKER)
}

/// Lists every file and folder under `prefix` (empty = whole vault) in one
/// call. Text of small `.md`/`.json`/`.txt`/`.yml` files is included so the
/// domain layer does not need one IPC round trip per file. Symlinks are not
/// followed, dot-folders (`.git`, `.obsidian`) and our temp files are skipped.
pub fn scan(root: &VaultRoot, prefix: &str) -> Result<Vec<Entry>, String> {
    let start = root.resolve(prefix).map_err(|e| e.to_string())?;
    if !start.is_dir() {
        return Err(format!("\"{prefix}\" is not a folder in the vault."));
    }
    let mut entries = Vec::new();
    let walker = WalkDir::new(&start)
        .follow_links(false)
        .min_depth(1)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            !(e.file_type().is_dir() && (name.starts_with('.') || SKIPPED_DIRS.contains(&&*name)))
                && !is_temp_name(&name)
        });
    for item in walker {
        let item = match item {
            Ok(item) => item,
            Err(_) => continue, // unreadable entries are skipped, not fatal
        };
        if item.file_type().is_symlink() {
            continue;
        }
        let Some(rel) = root.relative(item.path()) else {
            continue;
        };
        let meta = match item.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let is_dir = meta.is_dir();
        let text = if !is_dir && meta.len() <= MAX_TEXT_BYTES && has_text_extension(item.path()) {
            fs::read(item.path()).ok().map(|b| decode_text(&b))
        } else {
            None
        };
        entries.push(Entry {
            path: rel,
            is_dir,
            size: if is_dir { 0 } else { meta.len() },
            modified_ms: millis_of(meta.modified()),
            text,
        });
    }
    entries.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(entries)
}

/// Immediate children of a folder, without file contents.
pub fn list_dir(root: &VaultRoot, rel: &str) -> Result<Vec<Entry>, String> {
    let dir = root.resolve(rel).map_err(|e| e.to_string())?;
    let read = fs::read_dir(&dir).map_err(|e| io_err("list", rel, e))?;
    let mut entries = Vec::new();
    for item in read.flatten() {
        let name = item.file_name().to_string_lossy().into_owned();
        if is_temp_name(&name) {
            continue;
        }
        let Ok(meta) = fs::symlink_metadata(item.path()) else {
            continue;
        };
        if meta.file_type().is_symlink() {
            continue;
        }
        let path = if rel.trim_matches('/').is_empty() {
            name
        } else {
            format!("{}/{name}", rel.trim_matches('/'))
        };
        entries.push(Entry {
            path,
            is_dir: meta.is_dir(),
            size: if meta.is_dir() { 0 } else { meta.len() },
            modified_ms: millis_of(meta.modified()),
            text: None,
        });
    }
    entries.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(entries)
}

fn has_text_extension(path: &Path) -> bool {
    path.extension()
        .map(|e| e.to_string_lossy().to_ascii_lowercase())
        .is_some_and(|e| TEXT_EXTENSIONS.contains(&e.as_str()))
}

/// UTF-8 without BOM, line endings normalized to LF. Invalid bytes are
/// replaced rather than failing the whole read.
pub fn decode_text(bytes: &[u8]) -> String {
    let bytes = bytes.strip_prefix(&[0xEF, 0xBB, 0xBF]).unwrap_or(bytes);
    String::from_utf8_lossy(bytes).replace("\r\n", "\n")
}

pub fn read_text(root: &VaultRoot, rel: &str) -> Result<String, String> {
    let path = root.resolve(rel).map_err(|e| e.to_string())?;
    let bytes = fs::read(&path).map_err(|e| io_err("read", rel, e))?;
    Ok(decode_text(&bytes))
}

/// Creates parent folders, checks names and case collisions for anything new,
/// and returns the absolute target.
fn prepare_target(root: &VaultRoot, rel: &str) -> Result<PathBuf, String> {
    if parse_relative(rel).map_err(|e| e.to_string())?.is_empty() {
        return Err("A file path is required.".to_string());
    }
    let target = root.resolve(rel).map_err(|e| e.to_string())?;
    if target.is_dir() {
        return Err(format!("\"{rel}\" is a folder."));
    }
    if !target.exists() {
        validate_new_segments(root, rel)?;
        let name = target
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();
        if let Some(parent) = target.parent() {
            fs::create_dir_all(parent).map_err(|e| io_err("create folders for", rel, e))?;
            let siblings: Vec<String> = fs::read_dir(parent)
                .map(|r| {
                    r.flatten()
                        .map(|e| e.file_name().to_string_lossy().into_owned())
                        .collect()
                })
                .unwrap_or_default();
            if let Some(existing) = case_collision(&name, siblings.iter().map(String::as_str)) {
                return Err(format!(
                    "\"{name}\" differs only by letter case from \"{existing}\". \
                     Windows and macOS treat them as the same file."
                ));
            }
        }
    }
    Ok(target)
}

fn temp_path_for(target: &Path) -> PathBuf {
    let name = target
        .file_name()
        .map(|n| n.to_string_lossy().into_owned())
        .unwrap_or_default();
    let n = TEMP_COUNTER.fetch_add(1, Ordering::SeqCst);
    target.with_file_name(format!(".{name}{TEMP_MARKER}{}-{n}", std::process::id()))
}

/// Renames with retries: on Windows antivirus scanners and sync clients
/// briefly open new files, which makes an immediate rename fail.
fn rename_with_retry(from: &Path, to: &Path) -> std::io::Result<()> {
    let mut delay_ms = 10;
    let mut waited = 0;
    loop {
        match fs::rename(from, to) {
            Ok(()) => return Ok(()),
            Err(e) if cfg!(windows) && waited < 1000 && is_transient(&e) => {
                std::thread::sleep(std::time::Duration::from_millis(delay_ms));
                waited += delay_ms;
                delay_ms = (delay_ms * 2).min(200);
            }
            Err(e) => return Err(e),
        }
    }
}

fn is_transient(e: &std::io::Error) -> bool {
    // 5 = access denied, 32 = sharing violation, 33 = lock violation.
    e.kind() == std::io::ErrorKind::PermissionDenied || matches!(e.raw_os_error(), Some(32 | 33))
}

fn write_bytes_atomic(target: &Path, bytes: &[u8], rel: &str) -> Result<(), String> {
    let temp = temp_path_for(target);
    let result = (|| {
        let mut file = fs::File::create(&temp)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        drop(file);
        rename_with_retry(&temp, target)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temp);
    }
    result.map_err(|e| io_err("save", rel, e))
}

/// Writes UTF-8 text with LF line endings and no BOM, atomically.
pub fn write_text_atomic(root: &VaultRoot, rel: &str, content: &str) -> Result<Written, String> {
    let target = prepare_target(root, rel)?;
    let text = content
        .strip_prefix('\u{FEFF}')
        .unwrap_or(content)
        .replace("\r\n", "\n");
    write_bytes_atomic(&target, text.as_bytes(), rel)?;
    Ok(Written {
        path: root.relative(&target).unwrap_or_else(|| rel.to_string()),
        size: text.len() as u64,
    })
}

pub fn ensure_dirs(root: &VaultRoot, rels: &[String]) -> Result<Vec<String>, String> {
    let mut created = Vec::new();
    for rel in rels {
        let dir = root.resolve(rel).map_err(|e| e.to_string())?;
        if dir.is_dir() {
            continue;
        }
        validate_new_segments(root, rel)?;
        fs::create_dir_all(&dir).map_err(|e| io_err("create", rel, e))?;
        created.push(root.relative(&dir).unwrap_or_else(|| rel.clone()));
    }
    Ok(created)
}

/// Moves a file or folder to `_Archive/<UTC stamp>/<original path>`. Nothing
/// is ever deleted, so a mistaken remove can be undone in a file manager.
pub fn move_to_archive(root: &VaultRoot, rel: &str) -> Result<String, String> {
    let segments = parse_relative(rel).map_err(|e| e.to_string())?;
    if segments.is_empty() || segments[0] == ARCHIVE_DIR {
        return Err(format!("\"{rel}\" cannot be archived."));
    }
    let source = root.resolve(rel).map_err(|e| e.to_string())?;
    if !source.exists() {
        return Err(format!("\"{rel}\" does not exist."));
    }
    let mut stamp = utc_stamp(now_millis() / 1000);
    let mut dest_rel = format!("{ARCHIVE_DIR}/{stamp}/{}", segments.join("/"));
    let mut suffix = 1;
    while root.resolve(&dest_rel).map_err(|e| e.to_string())?.exists() {
        suffix += 1;
        stamp = format!("{}-{suffix}", utc_stamp(now_millis() / 1000));
        dest_rel = format!("{ARCHIVE_DIR}/{stamp}/{}", segments.join("/"));
    }
    let dest = root.resolve(&dest_rel).map_err(|e| e.to_string())?;
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| io_err("create the archive for", rel, e))?;
    }
    rename_with_retry(&source, &dest).map_err(|e| io_err("archive", rel, e))?;
    Ok(dest_rel)
}

/// Copies a file the user picked (absolute path, usually from a dialog) into
/// the vault. The copy is staged as a temp file and renamed into place.
pub fn copy_into_vault(
    root: &VaultRoot,
    source: &Path,
    dest_rel: &str,
    overwrite: bool,
) -> Result<Written, String> {
    let meta = fs::metadata(source)
        .map_err(|e| format!("Could not open \"{}\": {e}", source.display()))?;
    if !meta.is_file() {
        return Err(format!("\"{}\" is not a file.", source.display()));
    }
    let target = prepare_target(root, dest_rel)?;
    if target.exists() && !overwrite {
        return Err(format!("\"{dest_rel}\" already exists."));
    }
    let temp = temp_path_for(&target);
    let result = (|| {
        fs::copy(source, &temp)?;
        // FlushFileBuffers needs write access on Windows.
        fs::OpenOptions::new().write(true).open(&temp)?.sync_all()?;
        rename_with_retry(&temp, &target)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temp);
    }
    result.map_err(|e| io_err("copy into", dest_rel, e))?;
    Ok(Written {
        path: root
            .relative(&target)
            .unwrap_or_else(|| dest_rel.to_string()),
        size: meta.len(),
    })
}

#[cfg(test)]
#[path = "ops_tests.rs"]
mod tests;
