# GitHub Wiki Template
# Reference for sscam-release-publisher Step 6 wiki update.
# Last updated: 2026-08-12

## Home.md Template

The wiki Home.md should contain the release badge and a summary of current modules.
Replace CURRENT_TAG with the latest release tag.

```markdown
# SS-CAM — SuamiSihat Creative Assets Management

[![Latest Release](https://img.shields.io/badge/release-CURRENT_TAG-blue?style=flat-square)](https://github.com/SuamiSihat/ss_cam/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%2B-blue?style=flat-square)](https://github.com/SuamiSihat/ss_cam)

Latest Release: [CURRENT_TAG](https://github.com/SuamiSihat/ss_cam/releases/tag/CURRENT_TAG)

## Pages

- [[Release History]] — Full release history
- [[Architecture]] — Codebase structure and layer diagram
- [[Folder Structure]] — Project folder naming convention
- [[QA Overview]] — Quality assurance process
```

## Release-History.md Template

Each release gets a short entry prepended at the top of the page.

```markdown
# SS-CAM Release History

## [vX.Y.Z] — YYYY-MM-DD

See [full release notes](https://github.com/SuamiSihat/ss_cam/releases/tag/vX.Y.Z)

---

## [Previous Release] — Previous Date

...
```

## Update Instructions

1. Clone the wiki repository: `git clone https://github.com/SuamiSihat/ss_cam.wiki.git`
2. Edit Home.md — update badge tag and Latest Release link
3. Edit Release-History.md — prepend new entry at top of file
4. Commit and push: `git commit -m "Update wiki for SS-CAM vX.Y.Z release"`
