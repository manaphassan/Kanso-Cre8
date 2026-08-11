# 09 Performance QA — SS-CAM

Last updated: 2026-08-11 | Version: v2.6.0

---

## Startup

| Metric | Target | Actual (v2.6.0) |
|--------|--------|-----------------|
| Cold launch to visible window | < 3s | ~1.8s |
| First page render (Dashboard) | < 1s | ~0.4s |
| NAS probe result visible | < 5s | ~2–4s |

## Memory

| State | RSS |
|-------|-----|
| Idle (Dashboard) | ~85 MB |
| Radio playing | ~110 MB |
| Dashboard + full workspace scan | ~140 MB |

## Background Timers

| Timer | Interval | Thread |
|-------|----------|--------|
| NAS health check | 30s | ThreadPool |
| Radio proxy heartbeat | 5s | ThreadPool |
| Dashboard auto-refresh | 60s | Dispatcher (UI) |
| Focus timer tick | 1s | DispatcherTimer |

## Known Performance Risks

- WorkspaceScanner.cs: full directory scan is synchronous within its
  thread. Large workspaces (>5000 files) may cause 2–4s scan delay.
  Mitigation planned: incremental scan with cancellation token (v2.7.0).
- RadioStreamService.cs: 39 KB — largest service. Consider splitting
  stream proxy and playlist management in a future refactor.

## Status: PASS