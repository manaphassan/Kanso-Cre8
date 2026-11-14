//! Vault file watcher. Emits `vault:changed { paths }` (vault-relative,
//! forward slashes) after changes settle for 300 ms. Our own temp files and
//! dot-folders are ignored. Network shares and Google Drive's virtual drive do
//! not deliver reliable native events, so those vaults are polled instead.

use crate::paths::cloud_sync_provider;
use crate::vault::guard::VaultRoot;
use crate::vault::ops::TEMP_MARKER;
use notify_debouncer_full::notify::{Config, PollWatcher, RecommendedWatcher, RecursiveMode};
use notify_debouncer_full::{
    new_debouncer, new_debouncer_opt, DebounceEventResult, Debouncer, NoCache, RecommendedCache,
};
use serde::Serialize;
use std::collections::BTreeSet;
use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};

pub const EVENT: &str = "vault:changed";
const DEBOUNCE: Duration = Duration::from_millis(300);
const POLL_INTERVAL: Duration = Duration::from_secs(2);

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum WatchMode {
    Native,
    Polling,
    Off,
}

#[derive(Debug, Clone, Serialize)]
pub struct Changed {
    pub paths: Vec<String>,
}

/// Holds the debouncer only so it keeps running; dropping it stops watching.
pub enum ActiveWatcher {
    Native {
        _debouncer: Debouncer<RecommendedWatcher, RecommendedCache>,
    },
    Polling {
        _debouncer: Debouncer<PollWatcher, NoCache>,
    },
}

impl ActiveWatcher {
    pub fn mode(&self) -> WatchMode {
        match self {
            ActiveWatcher::Native { .. } => WatchMode::Native,
            ActiveWatcher::Polling { .. } => WatchMode::Polling,
        }
    }
}

#[derive(Default)]
pub struct WatchState {
    active: Mutex<Option<ActiveWatcher>>,
}

/// Converts raw event paths into the sorted, de-duplicated vault-relative
/// list the UI receives, dropping noise.
pub fn changed_paths<'a, I>(root: &VaultRoot, paths: I) -> Vec<String>
where
    I: IntoIterator<Item = &'a Path>,
{
    let mut out = BTreeSet::new();
    for path in paths {
        let Some(rel) = root.relative(path) else {
            continue;
        };
        if rel.is_empty() || rel.contains(TEMP_MARKER) {
            continue;
        }
        if rel
            .split('/')
            .any(|s| s.starts_with('.') || s == "node_modules")
        {
            continue;
        }
        out.insert(rel);
    }
    out.into_iter().collect()
}

pub fn should_poll(root: &Path) -> bool {
    if std::env::var("KANSO_WATCH_POLL").is_ok_and(|v| v == "1") {
        return true;
    }
    let s = root.to_string_lossy();
    let network = s.starts_with(r"\\?\UNC\") || (s.starts_with(r"\\") && !s.starts_with(r"\\?\"));
    let env = |k: &str| std::env::var(k).ok();
    network || cloud_sync_provider(root, &env) == Some("Google Drive")
}

/// Starts watching `root`. `on_change` receives each settled batch.
pub fn spawn<F>(root: &VaultRoot, poll: bool, on_change: F) -> Result<ActiveWatcher, String>
where
    F: Fn(Vec<String>) + Send + 'static,
{
    let filter_root = root.clone();
    let handler = move |result: DebounceEventResult| {
        if let Ok(events) = result {
            let paths = changed_paths(
                &filter_root,
                events
                    .iter()
                    .flat_map(|e| e.paths.iter().map(|p| p.as_path())),
            );
            if !paths.is_empty() {
                on_change(paths);
            }
        }
    };
    let err = |e: notify_debouncer_full::notify::Error| format!("Could not watch the vault: {e}");

    if poll {
        let config = Config::default().with_poll_interval(POLL_INTERVAL);
        let mut d =
            new_debouncer_opt::<_, PollWatcher, NoCache>(DEBOUNCE, None, handler, NoCache, config)
                .map_err(err)?;
        d.watch(root.path(), RecursiveMode::Recursive)
            .map_err(err)?;
        Ok(ActiveWatcher::Polling { _debouncer: d })
    } else {
        let mut d = new_debouncer(DEBOUNCE, None, handler).map_err(err)?;
        d.watch(root.path(), RecursiveMode::Recursive)
            .map_err(err)?;
        Ok(ActiveWatcher::Native { _debouncer: d })
    }
}

/// Replaces any previous watcher. Native watching falls back to polling if it
/// cannot start; a vault without a watcher still works, it just refreshes on
/// demand.
pub fn start(app: &AppHandle, state: &WatchState, root: &VaultRoot) -> WatchMode {
    let make = |poll: bool| {
        let app = app.clone();
        spawn(root, poll, move |paths| {
            let _ = app.emit(EVENT, Changed { paths });
        })
    };
    let watcher = if should_poll(root.path()) {
        make(true)
    } else {
        make(false).or_else(|_| make(true))
    };
    let (mode, active) = match watcher {
        Ok(w) => (w.mode(), Some(w)),
        Err(e) => {
            eprintln!("[watch] {e}");
            (WatchMode::Off, None)
        }
    };
    if let Ok(mut slot) = state.active.lock() {
        *slot = active; // dropping the old debouncer stops it
    }
    mode
}

#[tauri::command]
pub fn watch_status(state: State<'_, WatchState>) -> WatchMode {
    state
        .active
        .lock()
        .ok()
        .and_then(|a| a.as_ref().map(ActiveWatcher::mode))
        .unwrap_or(WatchMode::Off)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::vault::guard::test_support::TempDir;
    use crate::vault::ops::write_text_atomic;
    use std::sync::mpsc;

    fn vault() -> (TempDir, VaultRoot) {
        let tmp = TempDir::new("watch");
        let root = tmp.path().join("Vault");
        std::fs::create_dir_all(root.join("_Notes")).unwrap();
        let v = VaultRoot::open(&root).unwrap();
        (tmp, v)
    }

    #[test]
    fn filters_noise_and_dedupes() {
        let (_tmp, v) = vault();
        let p = |rel: &str| v.path().join(rel);
        let raw = [
            p("_Notes/a.md"),
            p("_Notes/a.md"),
            p(&format!("_Notes/.a.md{TEMP_MARKER}1-0")),
            p(".obsidian/workspace.json"),
            p("_Projects/node_modules/x.js"),
            p("_Clients/ACME_AcmeCorp/client.md"),
            v.path().to_path_buf(),
            std::env::temp_dir().join("elsewhere.md"),
        ];
        let got = changed_paths(&v, raw.iter().map(|p| p.as_path()));
        assert_eq!(got, vec!["_Clients/ACME_AcmeCorp/client.md", "_Notes/a.md"]);
    }

    fn wait_for(rx: &mpsc::Receiver<Vec<String>>, want: &str, secs: u64) -> Vec<String> {
        let deadline = std::time::Instant::now() + Duration::from_secs(secs);
        let mut seen = Vec::new();
        while std::time::Instant::now() < deadline {
            if let Ok(batch) = rx.recv_timeout(Duration::from_millis(200)) {
                seen.extend(batch);
                if seen.iter().any(|p| p == want) {
                    break;
                }
            }
        }
        seen
    }

    fn assert_watcher_reports_atomic_writes(poll: bool, secs: u64) {
        let (_tmp, v) = vault();
        let (tx, rx) = mpsc::channel();
        let watcher = spawn(&v, poll, move |paths| {
            let _ = tx.send(paths);
        })
        .unwrap();
        assert_eq!(
            watcher.mode(),
            if poll {
                WatchMode::Polling
            } else {
                WatchMode::Native
            }
        );
        std::thread::sleep(Duration::from_millis(if poll { 2500 } else { 300 }));

        write_text_atomic(&v, "_Notes/watched.md", "hello").unwrap();
        let seen = wait_for(&rx, "_Notes/watched.md", secs);
        assert!(
            seen.iter().any(|p| p == "_Notes/watched.md"),
            "saw {seen:?}"
        );
        assert!(
            !seen.iter().any(|p| p.contains(TEMP_MARKER)),
            "temp leaked: {seen:?}"
        );
        drop(watcher);
    }

    #[test]
    fn native_watcher_reports_atomic_writes() {
        assert_watcher_reports_atomic_writes(false, 5);
    }

    #[test]
    fn polling_watcher_reports_atomic_writes() {
        assert_watcher_reports_atomic_writes(true, 8);
    }

    #[test]
    fn network_shares_are_polled() {
        assert!(should_poll(Path::new(r"\\?\UNC\nas\share\Vault")));
        assert!(should_poll(Path::new(r"\\nas\share\Vault")));
        assert!(should_poll(Path::new(r"G:\My Drive\Vault")));
        assert!(!should_poll(Path::new(r"\\?\D:\Vault")));
        assert!(!should_poll(Path::new("/home/a/Vault")));
    }
}
