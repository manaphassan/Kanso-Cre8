# 08 Security QA — SS-CAM

Last updated: 2026-08-11 | Version: v2.6.0

---

## Data Storage

| Data | Location | Encryption |
|------|----------|------------|
| Mind Drops | %AppData%\SuamiSihat\minddrops.json | DPAPI (Windows Data Protection) |
| Designer profile | %AppData%\SuamiSihat\profile.json | Plaintext (no secrets stored) |
| Theme config | %AppData%\SuamiSihat\theme_config.json | Plaintext |
| Quick Notes | %AppData%\SuamiSihat\quicknotes.json | Plaintext |
| Task board | Workspace README.md frontmatter | Plaintext (in NAS) |

## Network

- NAS probe: HTTPS HEAD to suamisihat.myds.me — SSL cert validation bypassed
  (internal domain, self-signed cert). RISK: acceptable for internal tool.
- Radio streams: HTTP only (stream URLs). No auth tokens in transit.
- Version check: Not yet implemented — planned for v2.7.0.

## Path Traversal

- Project name input sanitised via System.IO.Path.GetInvalidFileNameChars()
- Workspace root validated before write (must exist and be a directory)
- No user-supplied paths are passed to shell execution

## Telemetry

ZERO telemetry. No analytics, no crash reporting to external services.
Crash log written locally to crash_log.txt in dev builds only.

## Status: PASS (with noted SSL bypass caveat)