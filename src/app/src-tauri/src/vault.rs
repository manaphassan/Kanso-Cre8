//! Vault root and path guard.
//!
//! Every command that touches the vault receives a path relative to the vault
//! root, written with forward slashes. `VaultRoot::resolve` turns it into an
//! absolute path and refuses anything that would land outside the root:
//! parent segments, absolute paths, drive letters, UNC shares, and symlinks or
//! junctions that point elsewhere.

use std::fmt;
use std::path::{Component, Path, PathBuf};

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PathError {
    Empty,
    NotRelative(String),
    ParentSegment(String),
    InvalidCharacter(String),
    OutsideVault(String),
    RootUnavailable(String),
}

impl fmt::Display for PathError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            PathError::Empty => write!(f, "A file path is required."),
            PathError::NotRelative(p) => {
                write!(f, "Paths must be relative to the vault: {p}")
            }
            PathError::ParentSegment(p) => write!(f, "Paths may not use '..': {p}"),
            PathError::InvalidCharacter(p) => {
                write!(f, "Paths use '/' and may not contain '\\' or NUL: {p}")
            }
            PathError::OutsideVault(p) => write!(f, "This path is outside the vault: {p}"),
            PathError::RootUnavailable(p) => {
                write!(f, "The vault folder is not available: {p}")
            }
        }
    }
}

impl std::error::Error for PathError {}

#[derive(Debug, Clone)]
pub struct VaultRoot {
    canonical: PathBuf,
}

impl VaultRoot {
    /// Opens an existing directory as the vault root.
    pub fn open(path: &Path) -> Result<Self, PathError> {
        let canonical = std::fs::canonicalize(path)
            .map_err(|_| PathError::RootUnavailable(path.display().to_string()))?;
        if !canonical.is_dir() {
            return Err(PathError::RootUnavailable(path.display().to_string()));
        }
        Ok(Self { canonical })
    }

    pub fn path(&self) -> &Path {
        &self.canonical
    }

    /// Resolves a vault-relative path. The target does not need to exist yet,
    /// so writes to new files and folders can be checked too. An empty path
    /// means the vault root itself.
    pub fn resolve(&self, rel: &str) -> Result<PathBuf, PathError> {
        let segments = parse_relative(rel)?;
        let mut joined = self.canonical.clone();
        for segment in &segments {
            joined.push(segment);
        }

        // Canonicalize the deepest part that exists, so a symlink or junction
        // anywhere along the path is followed before the containment check.
        let (existing, rest) = split_existing(&joined);
        let mut real = std::fs::canonicalize(&existing)
            .map_err(|_| PathError::OutsideVault(rel.to_string()))?;
        if !real.starts_with(&self.canonical) {
            return Err(PathError::OutsideVault(rel.to_string()));
        }
        for part in rest {
            real.push(part);
        }
        Ok(real)
    }

    /// Converts an absolute path inside the vault back to the forward-slash
    /// relative form used over IPC.
    pub fn relative(&self, abs: &Path) -> Option<String> {
        let rel = abs.strip_prefix(&self.canonical).ok()?;
        let parts: Vec<String> = rel
            .components()
            .filter_map(|c| match c {
                Component::Normal(s) => Some(s.to_string_lossy().into_owned()),
                _ => None,
            })
            .collect();
        Some(parts.join("/"))
    }
}

/// Splits a vault-relative path into plain segments, rejecting anything that
/// could address a location outside the vault.
pub fn parse_relative(rel: &str) -> Result<Vec<String>, PathError> {
    if rel.contains('\\') || rel.contains('\0') {
        return Err(PathError::InvalidCharacter(rel.to_string()));
    }
    let trimmed = rel.trim_end_matches('/');
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }
    if trimmed.starts_with('/') || looks_like_drive(trimmed) {
        return Err(PathError::NotRelative(rel.to_string()));
    }

    let mut segments = Vec::new();
    for raw in trimmed.split('/') {
        match raw {
            "" | "." => continue,
            ".." => return Err(PathError::ParentSegment(rel.to_string())),
            other => segments.push(other.to_string()),
        }
    }

    // Defence in depth: the platform parser must agree that every segment is a
    // plain name (catches `C:` style prefixes and similar on Windows).
    let as_path: PathBuf = segments.iter().collect();
    if as_path
        .components()
        .any(|c| !matches!(c, Component::Normal(_)))
    {
        return Err(PathError::NotRelative(rel.to_string()));
    }
    Ok(segments)
}

fn looks_like_drive(rel: &str) -> bool {
    let bytes = rel.as_bytes();
    bytes.len() >= 2 && bytes[0].is_ascii_alphabetic() && bytes[1] == b':'
}

fn split_existing(path: &Path) -> (PathBuf, Vec<std::ffi::OsString>) {
    let mut existing = path.to_path_buf();
    let mut rest = Vec::new();
    while std::fs::symlink_metadata(&existing).is_err() {
        match (existing.file_name(), existing.parent()) {
            (Some(name), Some(parent)) => {
                rest.push(name.to_os_string());
                existing = parent.to_path_buf();
            }
            _ => break,
        }
    }
    rest.reverse();
    (existing, rest)
}

#[cfg(test)]
pub(crate) mod test_support {
    use std::path::{Path, PathBuf};
    use std::sync::atomic::{AtomicU32, Ordering};

    static COUNTER: AtomicU32 = AtomicU32::new(0);

    /// A throwaway directory under the OS temp dir, removed on drop.
    pub struct TempDir(PathBuf);

    impl TempDir {
        pub fn new(tag: &str) -> Self {
            let n = COUNTER.fetch_add(1, Ordering::SeqCst);
            let dir =
                std::env::temp_dir().join(format!("kanso-test-{tag}-{}-{n}", std::process::id()));
            let _ = std::fs::remove_dir_all(&dir);
            std::fs::create_dir_all(&dir).unwrap();
            Self(dir)
        }

        pub fn path(&self) -> &Path {
            &self.0
        }
    }

    impl Drop for TempDir {
        fn drop(&mut self) {
            let _ = std::fs::remove_dir_all(&self.0);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::test_support::TempDir;
    use super::*;

    fn vault() -> (TempDir, VaultRoot) {
        let tmp = TempDir::new("guard");
        let root = tmp.path().join("Vault");
        std::fs::create_dir_all(root.join("_Notes")).unwrap();
        std::fs::write(root.join("_Notes").join("Scratchpad.md"), "x").unwrap();
        let v = VaultRoot::open(&root).unwrap();
        (tmp, v)
    }

    #[test]
    fn resolves_existing_and_new_paths() {
        let (_tmp, v) = vault();
        let existing = v.resolve("_Notes/Scratchpad.md").unwrap();
        assert!(existing.is_file());
        let new = v.resolve("_Projects/2026/New/README.md").unwrap();
        assert!(new.starts_with(v.path()));
        assert_eq!(v.relative(&new).unwrap(), "_Projects/2026/New/README.md");
        assert_eq!(v.resolve("").unwrap(), v.path());
        assert_eq!(v.resolve("./_Notes/").unwrap(), v.path().join("_Notes"));
    }

    #[test]
    fn rejects_parent_segments() {
        let (_tmp, v) = vault();
        for rel in ["..", "../x", "_Notes/../../x", "_Notes/.."] {
            assert!(
                matches!(v.resolve(rel), Err(PathError::ParentSegment(_))),
                "{rel}"
            );
        }
    }

    #[test]
    fn rejects_absolute_drive_and_unc_paths() {
        let (_tmp, v) = vault();
        for rel in [
            "/etc/passwd",
            "C:/Windows",
            "c:relative",
            "//server/share/x",
        ] {
            assert!(
                matches!(v.resolve(rel), Err(PathError::NotRelative(_))),
                "{rel}"
            );
        }
        for rel in [r"\\server\share", r"_Notes\x.md", "a\0b"] {
            assert!(
                matches!(v.resolve(rel), Err(PathError::InvalidCharacter(_))),
                "{rel}"
            );
        }
    }

    #[test]
    fn rejects_symlink_escape() {
        let (tmp, v) = vault();
        let outside = tmp.path().join("Outside");
        std::fs::create_dir_all(&outside).unwrap();
        std::fs::write(outside.join("secret.txt"), "s").unwrap();
        let link = v.path().join("link");

        #[cfg(unix)]
        let made = std::os::unix::fs::symlink(&outside, &link).is_ok();
        #[cfg(windows)]
        let made = std::os::windows::fs::symlink_dir(&outside, &link).is_ok();

        if !made {
            eprintln!("skipped: symlinks need Developer Mode or admin on Windows");
            return;
        }
        assert!(matches!(
            v.resolve("link/secret.txt"),
            Err(PathError::OutsideVault(_))
        ));
        assert!(matches!(
            v.resolve("link/new.txt"),
            Err(PathError::OutsideVault(_))
        ));
    }

    #[test]
    fn opening_a_missing_root_fails() {
        let tmp = TempDir::new("missing");
        assert!(matches!(
            VaultRoot::open(&tmp.path().join("nope")),
            Err(PathError::RootUnavailable(_))
        ));
    }

    #[cfg(windows)]
    #[test]
    fn rejects_junction_escape_on_windows() {
        let (tmp, v) = vault();
        let outside = tmp.path().join("Outside");
        std::fs::create_dir_all(&outside).unwrap();
        std::fs::write(outside.join("secret.txt"), "s").unwrap();
        let link = v.path().join("junction");
        let status = std::process::Command::new("cmd")
            .args(["/C", "mklink", "/J"])
            .arg(&link)
            .arg(&outside)
            .output()
            .unwrap();
        assert!(status.status.success(), "mklink /J failed");
        assert!(link.join("secret.txt").is_file());
        assert!(matches!(
            v.resolve("junction/secret.txt"),
            Err(PathError::OutsideVault(_))
        ));
        assert!(matches!(
            v.resolve("junction/new/deeper.md"),
            Err(PathError::OutsideVault(_))
        ));
    }

    #[cfg(windows)]
    #[test]
    fn case_differences_stay_inside_on_windows() {
        let (_tmp, v) = vault();
        let p = v.resolve("_notes/scratchpad.md").unwrap();
        assert!(p.starts_with(v.path()));
        assert!(p.is_file());
    }
}
