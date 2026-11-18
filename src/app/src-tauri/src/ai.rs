//! Gemini requests (P3.2). Every AI call is made here, from Rust, with the
//! key read from the keychain; the webview only sends the prompt text and
//! gets back text or a plain-sentence error.

use crate::machine::MachineStore;
use crate::secrets::{self, Keychain};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use tauri::State;

const HOST: &str = "generativelanguage.googleapis.com";
const TIMEOUT: Duration = Duration::from_secs(60);
const MAX_PROMPT_CHARS: usize = 100_000;
const MAX_SYSTEM_CHARS: usize = 20_000;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum AiError {
    NoKey,
    InvalidKey,
    Quota,
    Model,
    Region,
    Offline,
    Timeout,
    Busy,
    Empty,
    Request(String),
}

impl AiError {
    pub fn sentence(&self) -> String {
        match self {
            Self::NoKey => "Add your API key in Settings > AI first.".into(),
            Self::InvalidKey => "That key was not accepted. Check it and save again.".into(),
            Self::Quota => "Your Gemini quota is used up. Try again later.".into(),
            Self::Model => {
                "That model is not available for your key. Pick another model in Settings > AI."
                    .into()
            }
            Self::Region => "Gemini is not available in your region.".into(),
            Self::Offline => "No connection to Gemini. Check your internet connection.".into(),
            Self::Timeout => "Gemini did not answer within 60 seconds. Try again.".into(),
            Self::Busy => "Gemini is busy right now. Try again in a minute.".into(),
            Self::Empty => "Gemini returned no text for this request. Try rewording it.".into(),
            Self::Request(msg) => format!("Gemini could not handle the request: {msg}"),
        }
    }
}

pub fn endpoint(base: &str, model: &str) -> String {
    format!("{base}/v1beta/models/{model}:generateContent")
}

pub fn request_body(system: &str, prompt: &str, max_tokens: u32) -> Value {
    let mut body = json!({
        "contents": [{ "role": "user", "parts": [{ "text": prompt }] }],
        "generationConfig": { "temperature": 0.7, "topP": 0.95, "maxOutputTokens": max_tokens }
    });
    if !system.trim().is_empty() {
        body["systemInstruction"] = json!({ "parts": [{ "text": system }] });
    }
    body
}

/// The text of the first candidate.
pub fn parse_success(body: &Value) -> Result<String, AiError> {
    let parts = body["candidates"][0]["content"]["parts"].as_array();
    let text: Vec<&str> = parts
        .into_iter()
        .flatten()
        .filter(|p| p["thought"].as_bool() != Some(true))
        .filter_map(|p| p["text"].as_str())
        .collect();
    let joined = text.join("\n").trim().to_string();
    if joined.is_empty() {
        Err(AiError::Empty)
    } else {
        Ok(joined)
    }
}

/// Maps a Gemini error reply to one of the plain sentences.
pub fn map_error(status: u16, body: &Value) -> AiError {
    let err = &body["error"];
    let api_status = err["status"].as_str().unwrap_or_default();
    let message = err["message"].as_str().unwrap_or_default();
    let reasons: Vec<&str> = err["details"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|d| d["reason"].as_str())
        .collect();
    let lower = message.to_ascii_lowercase();
    if reasons.contains(&"API_KEY_INVALID") || lower.contains("api key not valid") || status == 401
    {
        return AiError::InvalidKey;
    }
    if lower.contains("location is not supported") {
        return AiError::Region;
    }
    match (status, api_status) {
        (403, _) | (_, "PERMISSION_DENIED") => AiError::InvalidKey,
        (429, _) | (_, "RESOURCE_EXHAUSTED") => AiError::Quota,
        (404, _) | (_, "NOT_FOUND") => AiError::Model,
        (500..=599, _) => AiError::Busy,
        _ if !message.is_empty() => AiError::Request(message.chars().take(300).collect()),
        _ => AiError::Request(format!("HTTP {status}")),
    }
}

fn client() -> Result<&'static reqwest::Client, AiError> {
    static CLIENT: OnceLock<Option<reqwest::Client>> = OnceLock::new();
    CLIENT
        .get_or_init(|| {
            reqwest::Client::builder()
                .user_agent(concat!("KansoCre8/", env!("CARGO_PKG_VERSION")))
                .timeout(TIMEOUT)
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .ok()
        })
        .as_ref()
        .ok_or(AiError::Offline)
}

/// Sends one generateContent request. `base` is the Gemini origin (a local
/// mock server in tests). The key goes in a header, never in the URL.
pub async fn generate(
    client: &reqwest::Client,
    base: &str,
    key: &str,
    model: &str,
    body: &Value,
) -> Result<Value, AiError> {
    let res = client
        .post(endpoint(base, model))
        .header("x-goog-api-key", key)
        .json(body)
        .send()
        .await
        .map_err(|e| {
            if e.is_timeout() {
                AiError::Timeout
            } else {
                AiError::Offline
            }
        })?;
    let status = res.status().as_u16();
    let reply: Value = res.json().await.map_err(|e| {
        if e.is_timeout() {
            AiError::Timeout
        } else {
            AiError::Request(format!("HTTP {status}"))
        }
    })?;
    if (200..300).contains(&status) {
        Ok(reply)
    } else {
        Err(map_error(status, &reply))
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CompleteInput {
    pub provider: String,
    pub model: Option<String>,
    #[serde(default)]
    pub system: String,
    pub prompt: String,
    pub max_tokens: Option<u32>,
}

#[derive(Debug, Serialize)]
pub struct CompleteOutput {
    pub text: String,
    pub model: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TestOutput {
    pub ok: bool,
    pub model: String,
    pub elapsed_ms: u64,
}

fn check_input(input: &CompleteInput) -> Result<(), String> {
    if input.provider != secrets::PROVIDER {
        return Err(format!(
            "\"{}\" is not a supported AI provider.",
            input.provider
        ));
    }
    if input.prompt.trim().is_empty() {
        return Err("There is no text to send.".into());
    }
    if input.prompt.chars().count() > MAX_PROMPT_CHARS
        || input.system.chars().count() > MAX_SYSTEM_CHARS
    {
        return Err("That text is too long to send in one request.".into());
    }
    Ok(())
}

fn pick_model(requested: Option<&str>, machine: &MachineStore) -> Result<String, String> {
    match requested {
        Some(m) if !secrets::valid_model(m) => Err(format!("\"{m}\" is not a valid model name.")),
        Some(m) => Ok(m.to_string()),
        None => Ok(secrets::current_model(machine)),
    }
}

fn api_key(machine: &MachineStore) -> Result<String, String> {
    secrets::read_key(&Keychain, machine)
        .map(|(k, _)| k)
        .ok_or_else(|| AiError::NoKey.sentence())
}

fn base() -> String {
    format!("https://{HOST}")
}

#[tauri::command]
pub async fn ai_complete(
    input: CompleteInput,
    machine: State<'_, MachineStore>,
) -> Result<CompleteOutput, String> {
    check_input(&input)?;
    let model = pick_model(input.model.as_deref(), &machine)?;
    let key = api_key(&machine)?;
    let body = request_body(
        &input.system,
        &input.prompt,
        input.max_tokens.unwrap_or(4096).clamp(1, 8192),
    );
    let reply = generate(
        client().map_err(|e| e.sentence())?,
        &base(),
        &key,
        &model,
        &body,
    )
    .await
    .map_err(|e| e.sentence())?;
    let text = parse_success(&reply).map_err(|e| e.sentence())?;
    Ok(CompleteOutput { text, model })
}

/// Checks the saved key with a tiny request. Any successful reply counts:
/// models that think first may spend the small token budget before writing.
#[tauri::command]
pub async fn ai_test(machine: State<'_, MachineStore>) -> Result<TestOutput, String> {
    let model = secrets::current_model(&machine);
    let key = api_key(&machine)?;
    let started = Instant::now();
    let body = request_body("", "Reply with the single word OK.", 256);
    generate(
        client().map_err(|e| e.sentence())?,
        &base(),
        &key,
        &model,
        &body,
    )
    .await
    .map_err(|e| e.sentence())?;
    Ok(TestOutput {
        ok: true,
        model,
        elapsed_ms: started.elapsed().as_millis() as u64,
    })
}

#[cfg(test)]
#[path = "ai_tests.rs"]
mod tests;
