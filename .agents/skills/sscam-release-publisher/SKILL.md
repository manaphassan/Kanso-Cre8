---
name: sscam-release-publisher
description: >
  Automates the complete SS-CAM GitHub release publication pipeline.
  Updates documentation, publishes the GitHub release page (with release notes),
  updates the wiki, and runs a full security and code quality health report.
  Trigger: "publish release", "update git page", "publish vX.Y.Z",
  "release vX.Y.Z", "update release page", "update documentation",
  "check security", "code quality check", "health check".
---

# SS-CAM Release Publisher

Automates the complete GitHub release publication pipeline for SS-CAM.
Covers documentation alignment, GitHub release creation, wiki update,
and security + code quality health attestation.

---

## Trigger Phrases

- "publish release", "publish vX.Y.Z"
- "update git page", "update release page"
- "release vX.Y.Z" (publish step, after sscam-release-manager has built and tagged)
- "update documentation"
- "check security", "code quality check", "health check"

---

## Prerequisites — Verify Before Executing

```powershell
# 1. Confirm gh CLI is authenticated with the keyring account (not GITHUB_TOKEN)
Remove-Item Env:\GITHUB_TOKEN -ErrorAction SilentlyContinue
gh auth status

# 2. Confirm the version tag exists on origin
git ls-remote --tags origin | Select-String "vX.Y.Z"

# 3. Source Guardian must PASS before publishing
.\QA\verify-sscam.ps1
```

STOP if gh auth status shows the active account is failing.
STOP if the release tag does not exist on origin.
STOP if Source Guardian returns exit code 1.

---

## Step 1 — Health Check: Security & Code Quality

Run the full automated baseline:

```powershell
Remove-Item Env:\GITHUB_TOKEN -ErrorAction SilentlyContinue
.\QA\verify-sscam.ps1
```

Review each check against the criteria in references/security-checks.md
and references/quality-checks.md.

| Category | Check | Expected |
|---|---|---|
| Encoding | UTF-8 BOM on all high-byte .cs/.xaml | PASS |
| Encoding | No raw Unicode U+0100+ in XAML attributes | PASS |
| Fluent 2 | All buttons use ui:Button | PASS |
| Fluent 2 | NavigationView is root shell | PASS |
| Fluent 2 | All views are Page/ui:Page | PASS |
| Safety | No hardcoded filesystem paths in C# | PASS |
| Safety | No silent catch {} blocks | PASS |
| Safety | HttpClient is static readonly singleton | PASS |
| Thread | No UI thread blocking (.Result/.Wait) | PASS |

Do NOT continue to Step 2 if any check is FAIL.

---

## Step 2 — Documentation Update

Update ALL of the following files. Replace vX.Y.Z with the exact release tag.

### Root Documentation

| File | What to update |
|---|---|
| README.md | Version badge, What's New section, Installation exe reference, Release History table row at top |
| ROADMAP.md | Last updated date, vX.Y.Z row in Released Milestones, In Progress label bumped to next version |
| CHANGELOG.md | Verify ## [X.Y.Z] section at top with summary and integrity table |

### QA Suite Headers

Update version number and Last updated date in every QA document header:

- QA/README.md — Version under review, Build under test (executable path, commit hash)
- QA/01-ARCHITECTURE.md
- QA/02-FUNCTIONAL-TESTS.md
- QA/03-COMPONENT-AUDIT.md
- QA/04-TERMINOLOGY.md
- QA/05-DUPLICATION.md
- QA/06-ACCESSIBILITY.md
- QA/07-WINDOWS-QA.md
- QA/08-SECURITY.md
- QA/09-PERFORMANCE.md
- QA/10-FIX-LOG.md (add release entry at top)
- QA/FINAL-QA-REPORT.md (Status header, QA Date, Audit section, Executable Binary path)
- QA/UX-RECOMMENDATIONS.md

After all edits:

```powershell
.\QA\verify-sscam.ps1 -Fix
git add -A
git commit -m "docs: update all project documentation for vX.Y.Z release"
```

---

## Step 3 — Generate Release Notes

Read CHANGELOG.md ## [X.Y.Z] section. Extract:
1. Headline — one-sentence summary of the biggest change
2. Added & Refined — bullet list of new features and improvements
3. Fixed — bullet list of resolved defects
4. Integrity table — AssemblyVersion, executable filename

Save the release notes as Markdown to:
  .agents/skills/sscam-release-publisher/scratch/release-notes-vX.Y.Z.md

See references/release-notes-template.md for the expected format.

---

## Step 4 — Push Branch and Tag to origin

```powershell
# Push documentation commit
git push origin SS-Master

# Force-update tag to HEAD documentation commit
git tag -f vX.Y.Z
git push origin vX.Y.Z --force
```

Verify push success (exit code 0).

---

## Step 5 — Publish GitHub Release

```powershell
Remove-Item Env:\GITHUB_TOKEN -ErrorAction SilentlyContinue

gh release create vX.Y.Z `
  --repo SuamiSihat/ss_cam `
  --title "SS-CAM vX.Y.Z - [Headline]" `
  --notes-file ".agents\skills\sscam-release-publisher\scratch\release-notes-vX.Y.Z.md"
```

If a release already exists for this tag, edit instead:

```powershell
gh release edit vX.Y.Z `
  --repo SuamiSihat/ss_cam `
  --title "SS-CAM vX.Y.Z - [Headline]" `
  --notes-file ".agents\skills\sscam-release-publisher\scratch\release-notes-vX.Y.Z.md" `
  --latest
```

Verify:

```powershell
gh release list --repo SuamiSihat/ss_cam
```

Confirm vX.Y.Z appears with Latest label.

---

## Step 6 — Update GitHub Wiki

The GitHub Wiki is a separate git repository cloned under .agents/wiki.

```powershell
Remove-Item Env:\GITHUB_TOKEN -ErrorAction SilentlyContinue

if (-not (Test-Path '.agents\wiki')) {
    git clone https://github.com/SuamiSihat/ss_cam.wiki.git .agents\wiki
}
Set-Location .agents\wiki
git pull origin master

# Update Home.md and Release-History.md per references/wiki-template.md

git add -A
git commit -m "Update wiki for SS-CAM vX.Y.Z release"
git push origin master
Set-Location ..\..
```

If wiki does not exist or push fails, record BLOCKED. Do NOT fail the overall
release because of a missing wiki — continue and document the blockage.

---

## Step 7 — Final Verification

```powershell
Remove-Item Env:\GITHUB_TOKEN -ErrorAction SilentlyContinue
gh release list --repo SuamiSihat/ss_cam
git status
git log -n 3 --oneline
```

Confirm:
- [ ] gh release list shows vX.Y.Z with Latest label
- [ ] GitHub repository landing page sidebar shows vX.Y.Z
- [ ] git status is clean
- [ ] All QA documentation headers reflect vX.Y.Z
- [ ] Source Guardian reports PASS (9/9 checks)

---

## Step 8 — Update QA Fix Log and Final Report

Add entry to QA/10-FIX-LOG.md:

```markdown
## vX.Y.Z — YYYY-MM-DD (Release Publication)
- GitHub Release: PUBLISHED (vX.Y.Z set as Latest on SuamiSihat/ss_cam)
- Documentation: Updated (14 files aligned to vX.Y.Z)
- Source Guardian: PASS (9/9 checks passed)
- Wiki: PASS | BLOCKED (state reason if blocked)
```

Update QA/FINAL-QA-REPORT.md Status line to match vX.Y.Z.

```powershell
git add -A
git commit -m "qa: release publication record for vX.Y.Z"
git push origin SS-Master
```

---

## Reporting Template

Output a status table at the end of every run:

| Step | Check | Result |
|---|---|---|
| Health Check | Source Guardian (9 checks) | PASS / FAIL |
| Health Check | Security attestation | PASS / FAIL |
| Health Check | Code quality (Fluent 2, thread safety) | PASS / FAIL |
| Documentation | 14 files version-aligned | PASS / FAIL |
| Git | Branch + tag pushed to origin | PASS / FAIL |
| GitHub Release | Release published as Latest | PASS / FAIL |
| Wiki | Home + Release History updated | PASS / BLOCKED |
| QA Record | Fix log + Final Report updated | PASS / FAIL |

Overall: PASS only when all non-BLOCKED checks are PASS.

---

## Versioning Reference

| Change type | Bump |
|-------------|------|
| Bug fix only | PATCH (3.0.0 -> 3.0.1) |
| New feature or module | MINOR (3.0.x -> 3.1.0) |
| Breaking architecture | MAJOR (3.x -> 4.0.0) |

---

## Related Skills

- sscam-release-manager — version bumping, build, exe packaging (run BEFORE this skill)
- sscam-qa — pre-release QA run and defect triage
- sscam-code-guardian — pre-commit source verification
