//! Passphrase encryption for the AI key inside a settings export (D18):
//! Argon2id derives a 256-bit key from the passphrase, AES-256-GCM encrypts.
//! The associated data binds the block to the file's sections, so editing
//! the file after export makes the key undecryptable.

use aes_gcm::aead::{Aead, Generate, KeyInit, Payload};
use aes_gcm::Aes256Gcm;
use argon2::{Algorithm, Argon2, Params, Version};
use serde::{Deserialize, Serialize};

pub const MIN_PASSPHRASE: usize = 12;
const DEFAULT_KDF: KdfParams = KdfParams {
    m_kib: 64 * 1024,
    t: 3,
    p: 1,
};

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
pub struct KdfParams {
    pub m_kib: u32,
    pub t: u32,
    pub p: u32,
}

/// The `secrets` block of a settings file. Byte fields are lowercase hex.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct SecretsBlock {
    pub cipher: String,
    pub kdf: String,
    pub kdf_params: KdfParams,
    pub salt: String,
    pub nonce: String,
    pub data: String,
}

const WRONG: &str = "The passphrase is wrong, or the settings file was changed after export.";

fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}

fn unhex(s: &str) -> Result<Vec<u8>, String> {
    if !s.len().is_multiple_of(2) || !s.bytes().all(|b| b.is_ascii_hexdigit()) {
        return Err("The secrets block of this settings file is damaged.".into());
    }
    (0..s.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&s[i..i + 2], 16).map_err(|e| e.to_string()))
        .collect()
}

/// Files can carry their own Argon2 cost; refuse values that would hang the
/// app or are too weak to mean anything.
fn check_kdf(k: &KdfParams) -> Result<(), String> {
    if !(8 * 1024..=1024 * 1024).contains(&k.m_kib)
        || !(1..=10).contains(&k.t)
        || !(1..=4).contains(&k.p)
    {
        return Err("The secrets block of this settings file uses unsupported settings.".into());
    }
    Ok(())
}

fn derive(passphrase: &str, salt: &[u8], k: &KdfParams) -> Result<[u8; 32], String> {
    check_kdf(k)?;
    let params = Params::new(k.m_kib, k.t, k.p, Some(32)).map_err(|e| e.to_string())?;
    let mut key = [0u8; 32];
    Argon2::new(Algorithm::Argon2id, Version::V0x13, params)
        .hash_password_into(passphrase.as_bytes(), salt, &mut key)
        .map_err(|e| e.to_string())?;
    Ok(key)
}

pub fn check_passphrase(passphrase: &str) -> Result<(), String> {
    if passphrase.chars().count() < MIN_PASSPHRASE {
        return Err(format!(
            "Use a passphrase of at least {MIN_PASSPHRASE} characters."
        ));
    }
    Ok(())
}

pub fn seal(plaintext: &[u8], passphrase: &str, aad: &[u8]) -> Result<SecretsBlock, String> {
    seal_with(plaintext, passphrase, aad, DEFAULT_KDF)
}

pub fn seal_with(
    plaintext: &[u8],
    passphrase: &str,
    aad: &[u8],
    kdf: KdfParams,
) -> Result<SecretsBlock, String> {
    check_passphrase(passphrase)?;
    let salt = <[u8; 16]>::generate();
    let nonce = <[u8; 12]>::generate();
    let key = derive(passphrase, &salt, &kdf)?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    let data = cipher
        .encrypt(
            &nonce.into(),
            Payload {
                msg: plaintext,
                aad,
            },
        )
        .map_err(|_| "Could not encrypt the AI key.".to_string())?;
    Ok(SecretsBlock {
        cipher: "aes-256-gcm".into(),
        kdf: "argon2id".into(),
        kdf_params: kdf,
        salt: hex(&salt),
        nonce: hex(&nonce),
        data: hex(&data),
    })
}

pub fn open(block: &SecretsBlock, passphrase: &str, aad: &[u8]) -> Result<Vec<u8>, String> {
    if block.cipher != "aes-256-gcm" || block.kdf != "argon2id" {
        return Err("The secrets block of this settings file uses an unsupported cipher.".into());
    }
    let salt = unhex(&block.salt)?;
    let nonce: [u8; 12] = unhex(&block.nonce)?
        .try_into()
        .map_err(|_| "The secrets block of this settings file is damaged.".to_string())?;
    let data = unhex(&block.data)?;
    if salt.len() < 16 {
        return Err("The secrets block of this settings file is damaged.".into());
    }
    let key = derive(passphrase, &salt, &block.kdf_params)?;
    let cipher = Aes256Gcm::new_from_slice(&key).map_err(|e| e.to_string())?;
    cipher
        .decrypt(&nonce.into(), Payload { msg: &data, aad })
        .map_err(|_| WRONG.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    const FAST: KdfParams = KdfParams {
        m_kib: 8 * 1024,
        t: 1,
        p: 1,
    };

    #[test]
    fn round_trips_and_rejects_wrong_passphrase_or_aad() {
        let block = seal_with(b"secret", "correct horse battery", b"aad-1", FAST).unwrap();
        assert_eq!(
            open(&block, "correct horse battery", b"aad-1").unwrap(),
            b"secret"
        );
        assert_eq!(
            open(&block, "wrong horse battery!", b"aad-1").unwrap_err(),
            WRONG
        );
        assert_eq!(
            open(&block, "correct horse battery", b"aad-2").unwrap_err(),
            WRONG
        );
        assert!(!block.data.contains(&hex(b"secret")));
    }

    #[test]
    fn refuses_short_passphrases_and_hostile_parameters() {
        assert!(seal_with(b"x", "short", b"", FAST).is_err());
        let mut block = seal_with(b"x", "long enough passphrase", b"", FAST).unwrap();
        block.kdf_params.m_kib = 64 * 1024 * 1024;
        assert!(open(&block, "long enough passphrase", b"")
            .unwrap_err()
            .contains("unsupported"));
        block.kdf_params = FAST;
        block.nonce = "zz".into();
        assert!(open(&block, "long enough passphrase", b"")
            .unwrap_err()
            .contains("damaged"));
    }

    #[test]
    fn default_cost_works() {
        let block = seal(b"k", "a very long passphrase", b"").unwrap();
        assert_eq!(block.kdf_params, DEFAULT_KDF);
        assert_eq!(open(&block, "a very long passphrase", b"").unwrap(), b"k");
    }
}
