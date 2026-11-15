//! Now-playing metadata for the focus radio. Requests go out from Rust, so
//! the webview needs no external `connect-src`. Only the station APIs in
//! `ALLOWED_HOSTS` are contacted; other stations simply have no metadata.

use serde::Serialize;
use serde_json::Value;
use std::sync::OnceLock;
use std::time::Duration;

const ALLOWED_HOSTS: &[&str] = &["api.laut.fm", "api.plaza.one", "somafm.com"];
const USER_AGENT: &str = concat!("KansoCre8/", env!("CARGO_PKG_VERSION"));
const TIMEOUT: Duration = Duration::from_millis(3500);

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct NowPlaying {
    pub track_title: String,
    pub artist: String,
    pub title: String,
    pub source: &'static str,
}

/// The metadata API that serves a station.
#[derive(Debug, Clone, PartialEq, Eq)]
enum Api {
    Laut(String),
    Plaza,
    Soma(String),
}

/// Station ids with known laut.fm station names (as the old server).
const LAUT_IDS: &[(&str, &str)] = &[
    ("anime-fm", "animefm"),
    ("initial-d-world", "eurobeat"),
    ("dragon-beats", "synthwave"),
    ("lofi-cafe", "lofi"),
];

fn host_of(url: &reqwest::Url) -> String {
    url.host_str().unwrap_or_default().to_ascii_lowercase()
}

fn is_host(host: &str, domain: &str) -> bool {
    host == domain || host.ends_with(&format!(".{domain}"))
}

fn first_segment(url: &reqwest::Url) -> Option<String> {
    url.path_segments()?
        .find(|s| !s.is_empty())
        .map(str::to_string)
}

/// A channel or station name safe to put in a URL path.
fn clean_name(name: &str) -> Option<String> {
    let ok = !name.is_empty()
        && name.len() <= 64
        && name
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_');
    ok.then(|| name.to_ascii_lowercase())
}

fn api_for(station_id: &str, stream_url: &str) -> Option<Api> {
    if let Some((_, name)) = LAUT_IDS.iter().find(|(id, _)| *id == station_id) {
        return Some(Api::Laut((*name).to_string()));
    }
    if station_id == "nightwave-plaza" {
        return Some(Api::Plaza);
    }
    if station_id == "groove-salad" {
        return Some(Api::Soma("groovesalad".into()));
    }
    let url = reqwest::Url::parse(stream_url).ok()?;
    let host = host_of(&url);
    if is_host(&host, "laut.fm") {
        return clean_name(&first_segment(&url)?).map(Api::Laut);
    }
    if is_host(&host, "plaza.one") {
        return Some(Api::Plaza);
    }
    if is_host(&host, "somafm.com") {
        // `groovesalad-256-mp3` -> `groovesalad`
        let segment = first_segment(&url)?;
        let channel = segment.split('-').next().unwrap_or_default();
        return clean_name(channel).map(Api::Soma);
    }
    None
}

fn endpoint(api: &Api) -> String {
    match api {
        Api::Laut(name) => format!("https://api.laut.fm/station/{name}/current_song"),
        Api::Plaza => "https://api.plaza.one/status".to_string(),
        Api::Soma(channel) => format!("https://somafm.com/songs/{channel}.json"),
    }
}

fn text(value: &Value) -> String {
    value.as_str().unwrap_or_default().trim().to_string()
}

fn now_playing(artist: String, title: String, source: &'static str) -> Option<NowPlaying> {
    if title.is_empty() {
        return None;
    }
    let track_title = if artist.is_empty() {
        title.clone()
    } else {
        format!("{artist} - {title}")
    };
    Some(NowPlaying {
        track_title,
        artist,
        title,
        source,
    })
}

fn parse(api: &Api, body: &Value) -> Option<NowPlaying> {
    match api {
        Api::Laut(_) => now_playing(
            text(&body["artist"]["name"]),
            text(&body["title"]),
            "laut.fm",
        ),
        Api::Plaza => now_playing(
            text(&body["song"]["artist"]),
            text(&body["song"]["title"]),
            "plaza.one",
        ),
        Api::Soma(_) => {
            let song = &body["songs"][0];
            now_playing(text(&song["artist"]), text(&song["title"]), "somafm")
        }
    }
}

/// Only HTTPS requests to the allow-listed hosts leave the app.
fn allowed(url: &reqwest::Url) -> bool {
    url.scheme() == "https" && ALLOWED_HOSTS.contains(&host_of(url).as_str())
}

fn client() -> Option<&'static reqwest::Client> {
    static CLIENT: OnceLock<Option<reqwest::Client>> = OnceLock::new();
    CLIENT
        .get_or_init(|| {
            reqwest::Client::builder()
                .user_agent(USER_AGENT)
                .timeout(TIMEOUT)
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .ok()
        })
        .as_ref()
}

async fn fetch_json(url: &str) -> Option<Value> {
    let url = reqwest::Url::parse(url).ok()?;
    if !allowed(&url) {
        return None;
    }
    let res = client()?.get(url).send().await.ok()?;
    if !res.status().is_success() {
        return None;
    }
    res.json().await.ok()
}

/// The current track of a station, or null when it has no metadata API or
/// the API did not answer. Never an error: the deck just keeps its label.
#[tauri::command]
pub async fn radio_now_playing(station_id: String, stream_url: String) -> Option<NowPlaying> {
    let api = api_for(&station_id, &stream_url)?;
    let body = fetch_json(&endpoint(&api)).await?;
    parse(&api, &body)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn maps_stations_to_their_metadata_api() {
        let laut = |n: &str| Some(Api::Laut(n.into()));
        assert_eq!(api_for("anime-fm", ""), laut("animefm"));
        assert_eq!(
            api_for("lofi-cafe", "https://stream.laut.fm/lofi"),
            laut("lofi")
        );
        assert_eq!(
            api_for("custom-1", "https://stream.laut.fm/Jazz_Radio"),
            laut("jazz_radio")
        );
        assert_eq!(api_for("nightwave-plaza", ""), Some(Api::Plaza));
        assert_eq!(
            api_for("x", "https://radio.plaza.one/mp3"),
            Some(Api::Plaza)
        );
        assert_eq!(
            api_for("x", "https://ice6.somafm.com/groovesalad-256-mp3"),
            Some(Api::Soma("groovesalad".into()))
        );
        assert_eq!(
            api_for("paris-jazz", "https://0nlineradio.radioho.st/0r-jazz"),
            None
        );
        assert_eq!(api_for("x", "https://evil.example/laut.fm/x"), None);
        assert_eq!(api_for("x", "https://stream.laut.fm/a%2F..%2Fb"), None);
        assert_eq!(api_for("x", "not a url"), None);
    }

    #[test]
    fn only_allow_listed_https_hosts_are_contacted() {
        for api in [
            Api::Laut("lofi".into()),
            Api::Plaza,
            Api::Soma("groovesalad".into()),
        ] {
            assert!(
                allowed(&reqwest::Url::parse(&endpoint(&api)).unwrap()),
                "{api:?}"
            );
        }
        for bad in [
            "http://api.laut.fm/station/x/current_song",
            "https://stream.laut.fm/lofi",
            "https://somafm.com.evil.example/songs/x.json",
            "https://127.0.0.1/status",
        ] {
            assert!(!allowed(&reqwest::Url::parse(bad).unwrap()), "{bad}");
        }
    }

    #[test]
    fn reads_each_api_shape() {
        let laut = json!({ "title": "Night Drive", "artist": { "name": "Nexus Studio" } });
        assert_eq!(
            parse(&Api::Laut("lofi".into()), &laut).unwrap().track_title,
            "Nexus Studio - Night Drive"
        );
        let plaza = json!({ "song": { "title": "Plaza Theme", "artist": "" } });
        assert_eq!(
            parse(&Api::Plaza, &plaza).unwrap().track_title,
            "Plaza Theme"
        );
        let soma = json!({ "songs": [{ "title": "Salad Days", "artist": "Lumina Labs" }] });
        let soma = parse(&Api::Soma("groovesalad".into()), &soma).unwrap();
        assert_eq!(
            (soma.artist.as_str(), soma.source),
            ("Lumina Labs", "somafm")
        );
        assert_eq!(parse(&Api::Plaza, &json!({ "song": {} })), None);
        assert_eq!(parse(&Api::Soma("x".into()), &json!({ "songs": [] })), None);
    }
}
