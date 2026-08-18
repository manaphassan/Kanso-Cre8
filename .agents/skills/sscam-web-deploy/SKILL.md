---
name: sscam-web-deploy
description: >
  Automates the complete testing, git commit/push, SSH sync, and Docker container restart pipeline for the SS-CAM Web Portal (creative.suamisihat.myds.me).
  Triggers: "deploy web", "deploy portal", "publish web", "update web portal", "deploy ss-cam web", "sync docker".
---

# SS-CAM Web Portal Deployment Skill (`sscam-web-deploy`)

This skill automates the full deployment pipeline for the **SS-CAM Web Management Portal** (`src/SS-CAM.Web`) to Synology NAS Docker (`https://creative.suamisihat.myds.me/`).

---

## 1. Automated Workflow

When invoked, the deployment skill executes the following pipeline:

1. **Local Pre-flight & Test Suite**:
   - Executes `npm test` inside `src/SS-CAM.Web` (YAML parsing, directory traversal guards, metrics, audit logs, DOM elements).
   - Runs Source Guardian `QA/verify-sscam.ps1 -Fix` for UTF-8 BOM encoding & design compliance.

2. **Git Commit & Push**:
   - Stages modified Web Portal assets (`git add src/SS-CAM.Web/`).
   - Commits with descriptive message.
   - Pushes to remote branch `SS-Master` (`git push origin SS-Master`).

3. **Synology NAS Deployment**:
   - Connects to NAS via SSH (`harussani@suamisihat.myds.me:2222`).
   - Syncs target directory `/volume1/docker/ss-cam-web`.
   - Restarts Docker container `ss-cam-web-portal`.

4. **Health Verification**:
   - Probes live endpoint `https://creative.suamisihat.myds.me/api/status` for HTTP `200 OK`.

---

## 2. Automated Execution Script

To run the automated deployment script:

```powershell
powershell -ExecutionPolicy Bypass -File .\.agents\skills\sscam-web-deploy\scripts\deploy-sscam-web.ps1 -CommitMessage "feat(web): update Web Portal UI and sidebar navigation"
```

---

## 3. Verification & Safety Guards

- **Atomic Pre-flight**: Aborts deployment immediately if any `npm test` or Source Guardian check fails.
- **Rollback Preparedness**: Retains working container state if deployment health probe fails.
