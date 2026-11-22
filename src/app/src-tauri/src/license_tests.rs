//! Tests for license.rs. Keys are signed with a throwaway test key; no key
//! valid for the shipped public key is committed.

use super::*;
use crate::vault::guard::test_support::TempDir;
use ed25519_dalek::{Signer, SigningKey};
use std::fs;

fn enc(bytes: &[u8]) -> String {
    const A: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut out = String::new();
    for chunk in bytes.chunks(3) {
        let n = chunk.iter().fold(0u32, |a, b| (a << 8) | u32::from(*b)) << (8 * (3 - chunk.len()));
        for i in 0..=chunk.len() {
            out.push(A[((n >> (18 - 6 * i)) & 63) as usize] as char);
        }
    }
    out
}

fn test_key() -> SigningKey {
    SigningKey::from_bytes(&[7u8; 32])
}

fn issue(sk: &SigningKey, payload: &str) -> String {
    format!(
        "{PREFIX}{}.{}",
        enc(payload.as_bytes()),
        enc(&sk.sign(payload.as_bytes()).to_bytes())
    )
}

const ACME: &str = r#"{"v":1,"id":"ORDER-1","licensee":"Acme Corp","email":"studio@example.com","tier":"pro","issued":"2026-11-19"}"#;

#[test]
fn accepts_a_signed_key() {
    let sk = test_key();
    let l = verify_with(&format!("  {}\n", issue(&sk, ACME)), &sk.verifying_key()).unwrap();
    assert_eq!(
        (l.licensee.as_str(), l.id.as_str(), l.issued.as_str()),
        ("Acme Corp", "ORDER-1", "2026-11-19")
    );
    assert_eq!(l.email.as_deref(), Some("studio@example.com"));
}

#[test]
fn rejects_forged_edited_and_wrong_key_signatures() {
    let sk = test_key();
    let key = issue(&sk, ACME);
    let other = SigningKey::from_bytes(&[9u8; 32]);
    assert_eq!(
        verify_with(&key, &other.verifying_key()).unwrap_err(),
        NOT_VALID
    );
    let edited = issue(&sk, ACME).replace(
        &enc(ACME.as_bytes()),
        &enc(ACME.replace("Acme Corp", "Nexus Studio").as_bytes()),
    );
    assert_eq!(
        verify_with(&edited, &sk.verifying_key()).unwrap_err(),
        NOT_VALID
    );
    let zen = issue(&sk, &ACME.replace("\"pro\"", "\"zen\""));
    assert_eq!(
        verify_with(&zen, &sk.verifying_key()).unwrap_err(),
        NOT_VALID
    );
    for bad in [
        "KANSO1-",
        "KANSO1-abc",
        "KANSO1-a.b",
        "nonsense",
        &key[..key.len() - 2],
    ] {
        assert!(verify_with(bad, &sk.verifying_key()).is_err(), "{bad}");
    }
}

#[test]
fn the_old_alpha_bypasses_are_gone() {
    let public = embedded_key();
    for old in [
        "KANSO-PRO-STUDIO-2026-ALPHA-VERIFIED",
        "kanso-pro-eyJsaWNlbnNlZSI6IngifQ-VERIFIED",
        "KANSO-PRO-TEST-VERIFIED",
    ] {
        assert_eq!(verify_with(old, &public).unwrap_err(), OLD_FORMAT, "{old}");
    }
    assert!(verify_with("", &public).unwrap_err().contains("Paste"));
}

#[test]
fn status_is_recomputed_from_the_stored_key() {
    let tmp = TempDir::new("license");
    let vault = tmp.path().join("Vault");
    fs::create_dir_all(vault.join("_Team/_Config")).unwrap();
    let root = VaultRoot::open(&vault).unwrap();
    let sk = test_key();
    let public = sk.verifying_key();
    assert_eq!(status_of(Some(&root), &public).status, "unlicensed");
    assert_eq!(status_of(None, &public).tier, "zen");

    // A hand-edited file claiming pro does not unlock anything.
    fs::write(vault.join(LICENSE_FILE), r#"{"active":true,"tier":"pro","licenseKey":"KANSO-PRO-STUDIO-2026-ALPHA-VERIFIED","theme":"x"}"#).unwrap();
    let s = status_of(Some(&root), &public);
    assert_eq!((s.status, s.tier), ("invalid", "zen"));
    assert_eq!(s.message.as_deref(), Some(OLD_FORMAT));

    assert!(activate(&root, "KANSO1-bad.key", &public).is_err());
    let s = activate(&root, &issue(&sk, ACME), &public).unwrap();
    assert_eq!((s.status, s.tier), ("valid", "pro"));
    let raw: Value =
        serde_json::from_str(&fs::read_to_string(vault.join(LICENSE_FILE)).unwrap()).unwrap();
    assert_eq!(
        (raw["issuedTo"].as_str(), raw["theme"].as_str()),
        (Some("Acme Corp"), Some("x"))
    );

    let s = deactivate(&root, &public).unwrap();
    assert_eq!(s.status, "unlicensed");
    let raw: Value =
        serde_json::from_str(&fs::read_to_string(vault.join(LICENSE_FILE)).unwrap()).unwrap();
    assert!(raw.get("licenseKey").is_none() && raw["tier"] == "zen");
}

#[test]
fn base64url_is_strict_and_the_embedded_key_parses() {
    assert_eq!(b64url("QUJD").unwrap(), b"ABC");
    assert_eq!(b64url("QQ").unwrap(), b"A");
    assert!(b64url("QR").is_none(), "non-zero padding bits");
    assert!(b64url("Q").is_none());
    assert!(b64url("QU+D").is_none(), "standard alphabet is rejected");
    assert_eq!(enc(b"ABC"), "QUJD");
    let _ = embedded_key();
}
