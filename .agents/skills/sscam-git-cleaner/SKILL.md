---
name: sscam-git-cleaner
description: >
  Automates post git pull/push cleanup, archiving unused/temporary files,
  organizing repository folder hierarchy, enforcing UTF-8 BOM encoding, and auditing
  project security against malicious code or leaked secrets. Trigger: post git pull,
  post git push, git cleanup, repo housekeeper, clean unused files, security scan repo,
  organize repo hierarchy.
---

# SS-CAM Git Housekeeper & Security Skill

Use this workflow immediately after `git pull` or `git push` operations, or whenever requested to audit repository health, clean up temporary artifacts, organize directory hierarchy, or check for security vulnerabilities.

---

## 1. When to Activate

Activate this skill when:
1. Performing or following up on a `git pull` or `git push`.
2. A request is made to "clean repo", "clean unused files", "organize folder structure", or "security scan".
3. Preparing a release candidate to ensure no clutter or secret leaks exist.

---

## 2. Protocol

### Step 1: Run Automated Baseline Housekeeper (Dry-Run First)

From the repository root, execute the script in preview mode:

```powershell
.\.agents\skills\sscam-git-cleaner\scripts\repo-cleaner.ps1 -DryRun -All
```

Review the output to assess flagged items across all 4 auditing dimensions:
- **Security & Malicious Code**: Secret/token leaks, unexpected `.exe`/`.dll`/`.vbs`/`.ps1` in source or content trees, unverified native calls.
- **Folder Hierarchy**: Root directory clutter and violations of `FOLDER-STRUCTURE.md`.
- **Temp & Build Artifacts**: Leftover `bin/`, `obj/`, `*.user`, `*.suo`, `.tmp`, `.bak` files.
- **UTF-8 BOM Encoding**: Missing UTF-8 BOM signatures across `.cs`, `.xaml`, and `.md` files.

---

### Step 2: Execute Fix & Cleanup

To perform active cleanup and repair BOM encoding, run:

```powershell
.\.agents\skills\sscam-git-cleaner\scripts\repo-cleaner.ps1 -All
```

For targeted operations, use individual flags:
- `-CleanTemp`: Purge transient build outputs and temporary log dumps.
- `-Organize`: Audit root directory items against standard structure.
- `-ScanSecurity`: Run security and secret leakage checks.
- `-FixBOM`: Enforce UTF-8 BOM on code and markup files.

---

### Step 3: Filesystem Safety Rules

When managing files or archiving:
1. **Never delete user assets or production files** without explicit confirmation.
2. **Never alter `.git/` or version history**.
3. Move candidate archive files to `scratch/archive/` if temporary retention is needed.
4. Verify directory permissions and path validity before moving files.

---

### Step 4: Verification & Build Check

After running cleanup:

1. Restore UTF-8 BOM signatures:
   ```powershell
   .\QA\verify-sscam.ps1 -Fix
   ```

2. Perform build verification:
   ```powershell
   .\.agents\skills\sscam-qa\scripts\run-sscam-qa.ps1 -Build -Configuration Release
   ```

3. Confirm zero `FAIL` statuses before reporting completion to the user.

---

## 3. Script Reference

- `repo-cleaner.ps1` | [repo-cleaner.ps1](file:///d:/HaNa_Innovation/ss_cam/.agents/skills/sscam-git-cleaner/scripts/repo-cleaner.ps1)
- `verify-sscam.ps1` | [verify-sscam.ps1](file:///d:/HaNa_Innovation/ss_cam/QA/verify-sscam.ps1)

---

## 4. Scripting Invariants & Gotchas

1. **Relative Root Path Resolution**:
   - Scripts residing in `.agents/skills/<skill_name>/scripts/` are 4 directory levels deep relative to repository root.
   - Use `$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..\..\..\")`.

2. **Directory Exclusions in Code Audits**:
   - When scanning repository source files recursively, always exclude `packages/`, `dist/`, `bin/`, `obj/`, and `scratch/` directories to prevent false positives and performance degradation.

3. **PowerShell Console Colors**:
   - Only use valid `System.ConsoleColor` values (`Cyan`, `Yellow`, `Green`, `Red`, `DarkGray`) with `Write-Host -ForegroundColor`.

