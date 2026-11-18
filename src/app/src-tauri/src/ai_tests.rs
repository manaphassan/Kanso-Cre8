//! Tests for ai.rs. HTTP is mocked by a one-shot server on 127.0.0.1.

use super::*;
use std::io::{Read, Write};
use std::net::TcpListener;
use std::thread;

/// Serves one request with `status` and `body`; returns the base URL and
/// a handle yielding the raw request text.
fn mock(status: u16, body: &'static str) -> (String, thread::JoinHandle<String>) {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let base = format!("http://{}", listener.local_addr().unwrap());
    let handle = thread::spawn(move || {
        let (mut sock, _) = listener.accept().unwrap();
        let mut buf = Vec::new();
        let mut chunk = [0u8; 4096];
        loop {
            let n = sock.read(&mut chunk).unwrap();
            buf.extend_from_slice(&chunk[..n]);
            let text = String::from_utf8_lossy(&buf).to_string();
            if let Some(end) = text.find("\r\n\r\n") {
                let len = text
                    .lines()
                    .find_map(|l| {
                        l.to_ascii_lowercase()
                            .strip_prefix("content-length:")
                            .map(|v| v.trim().parse::<usize>().unwrap())
                    })
                    .unwrap_or(0);
                if buf.len() >= end + 4 + len {
                    break;
                }
            }
            if n == 0 {
                break;
            }
        }
        let reply = format!("HTTP/1.1 {status} X\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}", body.len());
        sock.write_all(reply.as_bytes()).unwrap();
        String::from_utf8_lossy(&buf).to_string()
    });
    (base, handle)
}

fn http() -> reqwest::Client {
    reqwest::Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .unwrap()
}

const KEY: &str = "AIzaMockKey000000000000000000000000000";

#[test]
fn sends_the_key_in_a_header_and_reads_the_text() {
    let (base, req) = mock(
        200,
        r#"{"candidates":[{"content":{"parts":[{"text":"thinking","thought":true},{"text":"Five hooks for Acme Corp"}]}}]}"#,
    );
    let body = request_body("You are a copywriter.", "Write hooks for ACME.", 512);
    let reply =
        tauri::async_runtime::block_on(generate(&http(), &base, KEY, "gemini-2.5-flash", &body))
            .unwrap();
    assert_eq!(parse_success(&reply).unwrap(), "Five hooks for Acme Corp");
    let raw = req.join().unwrap();
    let first_line = raw.lines().next().unwrap();
    assert_eq!(
        first_line,
        "POST /v1beta/models/gemini-2.5-flash:generateContent HTTP/1.1"
    );
    assert!(!first_line.contains(KEY), "key must not be in the URL");
    assert!(raw
        .to_ascii_lowercase()
        .contains(&format!("x-goog-api-key: {}", KEY.to_ascii_lowercase())));
    assert!(raw.contains("\"systemInstruction\""));
    assert!(raw.contains("\"maxOutputTokens\":512"));
}

#[test]
fn maps_error_replies_to_plain_sentences() {
    let cases: [(u16, &'static str, AiError); 5] = [
        (
            400,
            r#"{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}"#,
            AiError::InvalidKey,
        ),
        (
            429,
            r#"{"error":{"code":429,"message":"Quota exceeded","status":"RESOURCE_EXHAUSTED"}}"#,
            AiError::Quota,
        ),
        (
            404,
            r#"{"error":{"code":404,"message":"models/x is not found","status":"NOT_FOUND"}}"#,
            AiError::Model,
        ),
        (
            503,
            r#"{"error":{"code":503,"message":"overloaded","status":"UNAVAILABLE"}}"#,
            AiError::Busy,
        ),
        (
            400,
            r#"{"error":{"code":400,"message":"User location is not supported for the API use.","status":"FAILED_PRECONDITION"}}"#,
            AiError::Region,
        ),
    ];
    for (status, body, expected) in cases {
        let (base, req) = mock(status, body);
        let got = tauri::async_runtime::block_on(generate(
            &http(),
            &base,
            KEY,
            "gemini-2.5-flash",
            &json!({}),
        ));
        req.join().unwrap();
        assert_eq!(got.unwrap_err(), expected, "HTTP {status}");
    }
    assert_eq!(
        AiError::Quota.sentence(),
        "Your Gemini quota is used up. Try again later."
    );
}

#[test]
fn no_server_means_offline() {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let base = format!("http://{}", listener.local_addr().unwrap());
    drop(listener);
    let got = tauri::async_runtime::block_on(generate(
        &http(),
        &base,
        KEY,
        "gemini-2.5-flash",
        &json!({}),
    ));
    assert_eq!(got.unwrap_err(), AiError::Offline);
}

#[test]
fn empty_or_blocked_replies_are_reported() {
    assert_eq!(
        parse_success(&json!({ "candidates": [] })),
        Err(AiError::Empty)
    );
    assert_eq!(
        parse_success(&json!({ "promptFeedback": { "blockReason": "SAFETY" } })),
        Err(AiError::Empty)
    );
    assert_eq!(
        parse_success(&json!({ "candidates": [{ "finishReason": "MAX_TOKENS", "content": {} }] })),
        Err(AiError::Empty)
    );
}

#[test]
fn validates_input_and_model_names() {
    let input = |provider: &str, prompt: &str| CompleteInput {
        provider: provider.into(),
        model: None,
        system: String::new(),
        prompt: prompt.into(),
        max_tokens: None,
    };
    assert!(check_input(&input("gemini", "Write hooks")).is_ok());
    assert!(check_input(&input("openai", "Write hooks")).is_err());
    assert!(check_input(&input("gemini", "   ")).is_err());
    assert!(check_input(&input("gemini", &"x".repeat(MAX_PROMPT_CHARS + 1))).is_err());
    assert_eq!(
        endpoint("https://h", "gemini-2.5-pro"),
        "https://h/v1beta/models/gemini-2.5-pro:generateContent"
    );
    assert!(request_body("", "p", 10).get("systemInstruction").is_none());
}
