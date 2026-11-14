//! Cross-platform filename rules (MASTER_PLAN 2.5) and small time helpers.
//!
//! A vault must open identically on Windows, macOS and Linux, so names the app
//! creates avoid characters and forms that any of them rejects or treats
//! specially. ASCII-only naming for system folders is a domain rule enforced in
//! TypeScript; this layer only blocks names that would break on some OS.

use std::time::{SystemTime, UNIX_EPOCH};

const FORBIDDEN: &[char] = &['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
const RESERVED: &[&str] = &["CON", "PRN", "AUX", "NUL"];

/// Checks one path segment that the app is about to create.
pub fn validate_new_name(name: &str) -> Result<(), String> {
    if name.is_empty() || name == "." || name == ".." {
        return Err(format!("\"{name}\" is not a valid file name."));
    }
    if let Some(c) = name
        .chars()
        .find(|c| FORBIDDEN.contains(c) || c.is_control())
    {
        let shown = if c.is_control() {
            format!("U+{:04X}", c as u32)
        } else {
            c.to_string()
        };
        return Err(format!(
            "\"{name}\" contains {shown}, which Windows does not allow."
        ));
    }
    if name.ends_with('.') || name.ends_with(' ') {
        return Err(format!(
            "\"{name}\" ends with a dot or space, which Windows does not allow."
        ));
    }
    if is_reserved(name) {
        return Err(format!("\"{name}\" is a reserved name on Windows."));
    }
    if name.len() > 255 {
        return Err(format!("\"{name}\" is longer than 255 bytes."));
    }
    Ok(())
}

fn is_reserved(name: &str) -> bool {
    let stem = name
        .split('.')
        .next()
        .unwrap_or("")
        .trim_end()
        .to_ascii_uppercase();
    if RESERVED.contains(&stem.as_str()) {
        return true;
    }
    let bytes = stem.as_bytes();
    bytes.len() == 4
        && (stem.starts_with("COM") || stem.starts_with("LPT"))
        && (b'1'..=b'9').contains(&bytes[3])
}

/// Returns the existing sibling whose name differs from `name` only by case.
/// Such pairs collapse into one file on Windows and macOS.
pub fn case_collision<'a, I>(name: &str, siblings: I) -> Option<String>
where
    I: IntoIterator<Item = &'a str>,
{
    let lower = name.to_lowercase();
    siblings
        .into_iter()
        .find(|s| *s != name && s.to_lowercase() == lower)
        .map(str::to_string)
}

pub fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn millis_of(time: std::io::Result<SystemTime>) -> Option<u64> {
    time.ok()?
        .duration_since(UNIX_EPOCH)
        .ok()
        .map(|d| d.as_millis() as u64)
}

/// UTC timestamp `YYYYMMDD-HHMMSS` for archive folder names.
pub fn utc_stamp(unix_secs: u64) -> String {
    let days = (unix_secs / 86_400) as i64;
    let secs = unix_secs % 86_400;
    let (y, m, d) = civil_from_days(days);
    format!(
        "{y:04}{m:02}{d:02}-{:02}{:02}{:02}",
        secs / 3600,
        (secs % 3600) / 60,
        secs % 60
    )
}

/// Days since 1970-01-01 to a proleptic Gregorian date (H. Hinnant's method).
fn civil_from_days(days: i64) -> (i64, u32, u32) {
    let z = days + 719_468;
    let era = z.div_euclid(146_097);
    let doe = z.rem_euclid(146_097);
    let yoe = (doe - doe / 1460 + doe / 36_524 - doe / 146_096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    let y = yoe + era * 400 + i64::from(m <= 2);
    (y, m, d)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_normal_names() {
        for name in [
            "README.md",
            "INV-2026-001_ACME.md",
            "02_Literature",
            "Kanso notes",
            "Brief v2 (final).pdf",
            "Nota rapida.md",
            ".kanso-open.json",
            "console.md",
            "COM10.txt",
        ] {
            assert!(validate_new_name(name).is_ok(), "{name}");
        }
    }

    #[test]
    fn rejects_windows_invalid_names() {
        for name in [
            "",
            ".",
            "..",
            "a<b",
            "a>b",
            "a:b",
            "a\"b",
            "a/b",
            "a\\b",
            "a|b",
            "a?b",
            "a*b",
            "tab\tname",
            "trailing.",
            "trailing ",
            "CON",
            "con.md",
            "Nul.txt",
            "AUX",
            "com1",
            "LPT9.log",
            "prn .md",
        ] {
            assert!(validate_new_name(name).is_err(), "{name:?}");
        }
        assert!(validate_new_name(&"a".repeat(256)).is_err());
    }

    #[test]
    fn detects_case_collisions() {
        let siblings = ["README.md", "_Notes", "brief.pdf"];
        assert_eq!(
            case_collision("readme.md", siblings.iter().copied()),
            Some("README.md".to_string())
        );
        assert_eq!(case_collision("README.md", siblings.iter().copied()), None);
        assert_eq!(case_collision("other.md", siblings.iter().copied()), None);
    }

    #[test]
    fn formats_utc_stamps() {
        assert_eq!(utc_stamp(0), "19700101-000000");
        assert_eq!(utc_stamp(951_782_400), "20000229-000000");
        assert_eq!(utc_stamp(1_794_617_045), "20261114-004405");
    }
}
