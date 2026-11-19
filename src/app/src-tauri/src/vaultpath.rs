//! Vault paths as stored in `app.json` (MASTER_PLAN 2.3). In portable mode a
//! vault on the same drive as the app is stored relative to the app folder,
//! so it still opens when the USB drive gets another letter or mount point.
//! The functions work on strings and accept both separators, so a path
//! written on Windows reads correctly in tests on macOS and Linux.

/// Machine keys that hold vault paths.
pub const VAULT_PATH_KEYS: &[&str] = &["workspaceRoot", "recentVaults"];

/// True for `C:\x`, `C:/x`, `\\server\share`, `//server/share` and `/x`.
pub fn is_absolute(p: &str) -> bool {
    let b = p.as_bytes();
    (b.len() >= 3 && b[0].is_ascii_alphabetic() && b[1] == b':' && (b[2] == b'\\' || b[2] == b'/'))
        || p.starts_with('/')
        || p.starts_with('\\')
}

fn drive(p: &str) -> Option<String> {
    let b = p.as_bytes();
    (b.len() >= 2 && b[0].is_ascii_alphabetic() && b[1] == b':')
        .then(|| p[..2].to_ascii_uppercase())
}

fn segments(p: &str) -> Vec<&str> {
    let rest = if drive(p).is_some() { &p[2..] } else { p };
    rest.split(['/', '\\'])
        .filter(|s| !s.is_empty() && *s != ".")
        .collect()
}

fn same_segment(a: &str, b: &str, windows: bool) -> bool {
    if windows {
        a.eq_ignore_ascii_case(b)
    } else {
        a == b
    }
}

/// The form to store. `same_volume` says whether the vault sits on the same
/// drive or file system as the app folder (checked by the caller on disk).
pub fn to_stored(base: &str, vault: &str, same_volume: bool) -> String {
    if !same_volume || !is_absolute(vault) || !is_absolute(base) {
        return vault.to_string();
    }
    let unc = |p: &str| p.starts_with("\\\\") || p.starts_with("//");
    if unc(base) || unc(vault) || drive(base) != drive(vault) {
        return vault.to_string();
    }
    let windows = drive(base).is_some();
    let (b, v) = (segments(base), segments(vault));
    let common = b
        .iter()
        .zip(&v)
        .take_while(|(x, y)| same_segment(x, y, windows))
        .count();
    let mut parts: Vec<&str> = std::iter::repeat_n("..", b.len() - common).collect();
    parts.extend(&v[common..]);
    if parts.first() != Some(&"..") {
        parts.insert(0, ".");
    }
    parts.join("/")
}

/// The absolute path to open. Absolute values are returned unchanged.
pub fn from_stored(base: &str, stored: &str) -> String {
    if is_absolute(stored) || !is_absolute(base) {
        return stored.to_string();
    }
    let windows = drive(base).is_some() || base.starts_with('\\');
    let sep = if windows { "\\" } else { "/" };
    let mut parts: Vec<&str> = segments(base);
    for seg in stored.split(['/', '\\']) {
        match seg {
            "" | "." => {}
            ".." => {
                parts.pop();
            }
            s => parts.push(s),
        }
    }
    let joined = parts.join(sep);
    match drive(base) {
        Some(d) => format!("{d}{sep}{joined}"),
        None if base.starts_with("\\\\") || base.starts_with("//") => format!("{sep}{sep}{joined}"),
        None => format!("/{joined}"),
    }
}

/// Whether two existing paths are on the same drive (Windows) or file
/// system (Unix). False when either cannot be read.
pub fn same_volume(a: &std::path::Path, b: &std::path::Path) -> bool {
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt;
        match (std::fs::metadata(a), std::fs::metadata(b)) {
            (Ok(x), Ok(y)) => x.dev() == y.dev(),
            _ => false,
        }
    }
    #[cfg(not(unix))]
    {
        let d = |p: &std::path::Path| drive(&p.to_string_lossy());
        b.exists() && d(a).is_some() && d(a) == d(b)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn stores_same_drive_vaults_relative_to_the_app() {
        assert_eq!(to_stored(r"E:\KansoCre8", r"E:\Vault", true), "../Vault");
        assert_eq!(
            to_stored(r"E:\KansoCre8", r"E:\KansoCre8\Vault", true),
            "./Vault"
        );
        assert_eq!(
            to_stored(r"E:\Apps\KansoCre8", r"e:\work\ACME Vault", true),
            "../../work/ACME Vault"
        );
        assert_eq!(
            to_stored("/media/ana/USB/KansoCre8", "/media/ana/USB/Vault", true),
            "../Vault"
        );
    }

    #[test]
    fn keeps_other_drives_shares_and_relative_input_absolute() {
        assert_eq!(to_stored(r"E:\KansoCre8", r"D:\Vault", true), r"D:\Vault");
        assert_eq!(to_stored(r"E:\KansoCre8", r"E:\Vault", false), r"E:\Vault");
        assert_eq!(
            to_stored(r"E:\KansoCre8", r"\\nas\share\Vault", true),
            r"\\nas\share\Vault"
        );
        assert_eq!(to_stored("/home/ana/KansoCre8", "Vault", true), "Vault");
    }

    #[test]
    fn reads_relative_vaults_on_a_new_drive_letter_or_mount() {
        assert_eq!(from_stored(r"F:\KansoCre8", "../Vault"), r"F:\Vault");
        assert_eq!(
            from_stored(r"F:\Apps\KansoCre8", "../../work/ACME Vault"),
            r"F:\work\ACME Vault"
        );
        assert_eq!(
            from_stored(r"F:\KansoCre8", "./Vault"),
            r"F:\KansoCre8\Vault"
        );
        assert_eq!(
            from_stored("/run/media/ana/USB/KansoCre8", "../Vault"),
            "/run/media/ana/USB/Vault"
        );
        assert_eq!(from_stored(r"F:\KansoCre8", r"D:\Vault"), r"D:\Vault");
    }

    #[test]
    fn round_trips() {
        for (base, vault) in [
            (r"E:\KansoCre8", r"E:\Studio\Vault"),
            ("/media/u/S/app", "/media/u/S/v/w"),
        ] {
            assert_eq!(from_stored(base, &to_stored(base, vault, true)), vault);
        }
        assert!(
            is_absolute("C:/x")
                && is_absolute("/x")
                && is_absolute(r"\\nas\s")
                && !is_absolute("../x")
        );
    }
}
