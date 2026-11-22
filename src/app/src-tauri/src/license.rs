//! Licence keys (P6.1, D3). A key is `KANSO1-<payload>.<signature>`, both
//! parts base64url without padding. The payload is UTF-8 JSON
//! `{ v: 1, id, licensee, email?, tier: "pro", issued: "YYYY-MM-DD" }` and the
//! signature is Ed25519 over the payload bytes. Only the public key is in
//! the app; keys are issued with `scripts/tools/kanso-license.mjs` and the
//! private key that lives outside the repository.
//!
//! The key is stored in `_Team/_Config/license.json` (vault tier, synced).
//! The status is always recomputed here from the stored key, so editing
//! `tier` in the file does not unlock anything.

use crate::vault::guard::VaultRoot;
use crate::vault::VaultState;
use ed25519_dalek::{Signature, VerifyingKey};
use serde::Serialize;
use serde_json::{json, Map, Value};
use tauri::State;

/// Ed25519 public key for licence keys (hex). The matching private key is
/// kept by the owner outside the repository.
pub const PUBLIC_KEY_HEX: &str = "65cc7b6f83e6bd8802552bc0ad4ae5ec417a4b89a01441055fd7833921a9f342";
const PREFIX: &str = "KANSO1-";
const LICENSE_FILE: &str = "_Team/_Config/license.json";
const MAX_KEY_LEN: usize = 2048;

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct License {
    pub id: String,
    pub licensee: String,
    pub email: Option<String>,
    pub tier: String,
    pub issued: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LicenseStatus {
    /// `valid`, `invalid` (a key is stored but fails) or `unlicensed`.
    pub status: &'static str,
    /// `pro` only when `status` is valid; otherwise `zen`.
    pub tier: &'static str,
    pub license: Option<License>,
    /// A plain sentence when the stored key is invalid.
    pub message: Option<String>,
    pub key: Option<String>,
}

const NOT_VALID: &str = "This licence key is not valid. Check that it was copied completely.";
const OLD_FORMAT: &str = "This is a pre-release key, which v0.9 no longer accepts. Contact support for a new licence key.";

/// Base64url without padding (RFC 4648 section 5).
fn b64url(s: &str) -> Option<Vec<u8>> {
    let val = |c: u8| match c {
        b'A'..=b'Z' => Some(c - b'A'),
        b'a'..=b'z' => Some(c - b'a' + 26),
        b'0'..=b'9' => Some(c - b'0' + 52),
        b'-' => Some(62),
        b'_' => Some(63),
        _ => None,
    };
    if s.len() % 4 == 1 {
        return None;
    }
    let mut out = Vec::with_capacity(s.len() * 3 / 4);
    let (mut acc, mut bits) = (0u32, 0u32);
    for c in s.bytes() {
        acc = (acc << 6) | u32::from(val(c)?);
        bits += 6;
        if bits >= 8 {
            bits -= 8;
            out.push((acc >> bits) as u8);
        }
    }
    // Leftover bits must be zero, so every key has exactly one encoding.
    (acc & ((1 << bits) - 1) == 0).then_some(out)
}

fn unhex32(s: &str) -> Option<[u8; 32]> {
    let b = s.as_bytes();
    if b.len() != 64 {
        return None;
    }
    let mut out = [0u8; 32];
    for (i, pair) in b.chunks(2).enumerate() {
        out[i] = u8::from_str_radix(std::str::from_utf8(pair).ok()?, 16).ok()?;
    }
    Some(out)
}

pub fn embedded_key() -> VerifyingKey {
    VerifyingKey::from_bytes(&unhex32(PUBLIC_KEY_HEX).expect("PUBLIC_KEY_HEX is 32 bytes of hex"))
        .expect("PUBLIC_KEY_HEX is a valid Ed25519 key")
}

/// Verifies a key against `public`. Errors are sentences for the UI.
pub fn verify_with(key: &str, public: &VerifyingKey) -> Result<License, String> {
    let key = key.trim();
    if key.is_empty() {
        return Err("Paste your licence key first.".into());
    }
    if key.to_ascii_uppercase().starts_with("KANSO-PRO-")
        || key.to_ascii_uppercase().starts_with("KANSO-STUDIO-")
    {
        return Err(OLD_FORMAT.into());
    }
    if key.len() > MAX_KEY_LEN || !key.starts_with(PREFIX) {
        return Err(NOT_VALID.into());
    }
    let (body, sig) = key[PREFIX.len()..].split_once('.').ok_or(NOT_VALID)?;
    let payload = b64url(body).ok_or(NOT_VALID)?;
    let sig: [u8; 64] = b64url(sig)
        .and_then(|s| s.try_into().ok())
        .ok_or(NOT_VALID)?;
    public
        .verify_strict(&payload, &Signature::from_bytes(&sig))
        .map_err(|_| NOT_VALID.to_string())?;
    let v: Value = serde_json::from_slice(&payload).map_err(|_| NOT_VALID.to_string())?;
    let text = |k: &str| {
        v[k].as_str()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(str::to_string)
    };
    if v["v"] != 1 || text("tier").as_deref() != Some("pro") {
        return Err(NOT_VALID.into());
    }
    Ok(License {
        id: text("id").ok_or(NOT_VALID)?,
        licensee: text("licensee").ok_or(NOT_VALID)?,
        email: text("email"),
        tier: "pro".into(),
        issued: text("issued").unwrap_or_default(),
    })
}

fn read_file(root: &VaultRoot) -> Map<String, Value> {
    root.resolve(LICENSE_FILE)
        .ok()
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|t| serde_json::from_str::<Value>(t.trim_start_matches('\u{FEFF}')).ok())
        .and_then(|v| v.as_object().cloned())
        .unwrap_or_default()
}

fn write_file(root: &VaultRoot, map: Map<String, Value>) -> Result<(), String> {
    let text = serde_json::to_string_pretty(&Value::Object(map)).map_err(|e| e.to_string())? + "\n";
    crate::vault::ops::write_text_atomic(root, LICENSE_FILE, &text).map(|_| ())
}

fn stored_key(map: &Map<String, Value>) -> Option<String> {
    map.get("licenseKey")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|k| !k.is_empty())
        .map(str::to_string)
}

pub fn status_of(root: Option<&VaultRoot>, public: &VerifyingKey) -> LicenseStatus {
    let unlicensed = LicenseStatus {
        status: "unlicensed",
        tier: "zen",
        license: None,
        message: None,
        key: None,
    };
    let Some(key) = root.map(read_file).as_ref().and_then(stored_key) else {
        return unlicensed;
    };
    match verify_with(&key, public) {
        Ok(l) => LicenseStatus {
            status: "valid",
            tier: "pro",
            license: Some(l),
            message: None,
            key: Some(key),
        },
        Err(m) => LicenseStatus {
            status: "invalid",
            tier: "zen",
            license: None,
            message: Some(m),
            key: Some(key),
        },
    }
}

/// Verifies first; the file is only written for a valid key.
pub fn activate(
    root: &VaultRoot,
    key: &str,
    public: &VerifyingKey,
) -> Result<LicenseStatus, String> {
    let license = verify_with(key, public)?;
    let mut map = read_file(root);
    map.insert("active".into(), json!(true));
    map.insert("tier".into(), json!("pro"));
    map.insert("licenseKey".into(), json!(key.trim()));
    map.insert("issuedTo".into(), json!(license.licensee));
    map.insert("issued".into(), json!(license.issued));
    map.insert("licenseId".into(), json!(license.id));
    write_file(root, map)?;
    Ok(status_of(Some(root), public))
}

pub fn deactivate(root: &VaultRoot, public: &VerifyingKey) -> Result<LicenseStatus, String> {
    let mut map = read_file(root);
    for k in ["licenseKey", "issuedTo", "issued", "licenseId"] {
        map.remove(k);
    }
    map.insert("active".into(), json!(false));
    map.insert("tier".into(), json!("zen"));
    write_file(root, map)?;
    Ok(status_of(Some(root), public))
}

fn open_root(vault: &VaultState) -> Option<VaultRoot> {
    vault.with(|r| Ok(r.clone())).ok()
}

#[tauri::command(async)]
pub fn license_status(vault: State<'_, VaultState>) -> LicenseStatus {
    status_of(open_root(&vault).as_ref(), &embedded_key())
}

#[tauri::command(async)]
pub fn license_activate(
    key: String,
    vault: State<'_, VaultState>,
) -> Result<LicenseStatus, String> {
    let root = open_root(&vault).ok_or("Open your vault first; the licence is saved in it.")?;
    activate(&root, &key, &embedded_key())
}

#[tauri::command(async)]
pub fn license_deactivate(vault: State<'_, VaultState>) -> Result<LicenseStatus, String> {
    let root = open_root(&vault).ok_or("No vault is open.")?;
    deactivate(&root, &embedded_key())
}

#[cfg(test)]
#[path = "license_tests.rs"]
mod tests;
