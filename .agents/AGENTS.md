# SS-CAM AGENT RULES

## Project

SS-CAM is the SuamiSihat Creative Assets Management desktop application.

Platform:

Windows Desktop

Technology:

- C#
- WPF
- .NET Framework 4.8
- WPF-UI
- Fluent 2
- MVVM architecture

---

# CORE PRINCIPLE

Treat SS-CAM as a production application used by working designers.

Prioritize:

1. Reliability
2. Data safety
3. Functional correctness
4. Predictable UX
5. Fluent 2 consistency
6. Accessibility
7. Maintainability
8. Performance

Do not optimize for code cleverness.

---

# BEFORE CHANGING CODE

Always:

1. Inspect the existing implementation.
2. Understand the affected feature.
3. Identify dependencies.
4. Identify existing reusable components.
5. Identify existing business logic.
6. Determine the root cause.
7. Make the smallest safe change.
8. Build.
9. Test.
10. Regression test affected functionality.

Never rewrite a working feature without a clear reason.

---

# CODE INTEGRITY RULES

## XAML Edit Safety

When editing XAML files:

- Never use a multi-line TargetContent that spans method boundaries or element boundaries.
- Match the SHORTEST unique string possible that uniquely identifies the target.
- Never include the beginning of the NEXT element or method in the TargetContent — only include what must be replaced.
- Verify every XAML structural edit produces valid XML nesting (matching open/close tags).
- After any XAML edit, check that no attribute lines became orphaned (dangling `Foreground=...` outside an element tag).

## C# Edit Safety

When editing C# files:

- Never use TargetContent that ends with a partial method signature or the beginning of the NEXT method.
- Catch-block replacements must use only the single catch line and its closing brace — do not include the surrounding method declaration in TargetContent.
- After any C# edit, verify that method signatures (access modifier, return type, method name, parameter list) are intact on the lines immediately following a replaced region.
- If the method signature on the line AFTER a replaced region looks corrupted (e.g., starts with `(` instead of `private void`), it MUST be immediately repaired before proceeding.

## BOM Encoding

After editing any `.xaml` or `.cs` file, always run:

```powershell
.\.agents\skills\sscam-qa\scripts\run-sscam-qa.ps1 -Fix
```

or run the Source Guardian with `-Fix` flag before building:

```powershell
.\QA\verify-sscam.ps1 -Fix
```

This restores UTF-8 BOM on any files that lost it during editing.

## Build Verification After Every Change Session

After any set of code changes:

1. Run `.\QA\verify-sscam.ps1 -Fix` to repair BOM encoding.
2. Run `.\.agents\skills\sscam-qa\scripts\run-sscam-qa.ps1 -Build -Configuration Release` to verify the build.
3. Resolve any FAIL before stopping.
4. Treat WARN as a documented risk.
5. Never mark a task DONE without a passing build.

---

# UI/UX RULES

Use Fluent 2 as the primary design-system reference.

Prefer:

- Existing project components
- Existing design tokens
- Existing resources
- Existing WPF-UI components
- Existing icon system

Do not create a new component when an existing component can reasonably support the requirement.

Do not introduce visually different versions of an existing component without a semantic reason.

## Dynamic Color Tokens — MANDATORY

**Never use hardcoded hex colors for surfaces or text in page content areas.**

Hardcoded hex colors break theme switching (SS Default / Falconia / Metamorphosis).

Always use:

| Purpose | Correct Token |
|---|---|
| Page background | `{DynamicResource ApplicationPageBackgroundThemeBrush}` |
| Card surface | `{DynamicResource CardBackgroundFillColorDefaultBrush}` |
| Card border | `{DynamicResource CardStrokeColorDefaultBrush}` |
| Text input background | `{DynamicResource TextControlBackground}` |
| Primary text | `{DynamicResource TextFillColorPrimaryBrush}` |
| Secondary text | `{DynamicResource TextFillColorSecondaryBrush}` |
| Brand primary | `{DynamicResource FluentBrand80}` |
| Brand tint | `{DynamicResource FluentBrandTint}` |
| Success | `{DynamicResource SystemFillColorSuccessBrush}` |
| Warning | `{DynamicResource SystemFillColorCautionBrush}` |
| Critical | `{DynamicResource SystemFillColorCriticalBrush}` |

Exceptions that are acceptable as hardcoded:

- **Theme swatch preview tiles** in SettingsPage (they intentionally represent the theme's palette)
- **DesignTokensPage** dark chrome panels (intentional standalone dark inspector skin — documented exception)
- **Color swatch border tiles** in BrandAssetsPage (the swatch IS the color)

## Typography Standard

Page title `FontSize` = **24**. No exceptions. Do not use 22 or 26 for page-level titles.

Section heading `FontSize` = **16–18** when distinct hierarchy is needed.

## Button Standard

Use `<ui:Button Appearance="Primary|Secondary|Danger">` for all user-facing buttons.

Never hardcode `Background` or `Foreground` on a `<ui:Button>` in page content areas.

Exception: theme swatch preview buttons in SettingsPage (intentional).

## Control Standard

- Use `<ui:TextBlock>` for all text in page content.
- Use `<ui:Card>` for all elevated surface containers.
- Use `<ui:Button>` for all interactive buttons.
- Do not use native WPF `<TextBlock>`, `<Button>`, or `<GroupBox>` in page content unless there is a documented exception.

---

# COMPONENT RULE

ONE PURPOSE = ONE CANONICAL COMPONENT

Before creating a new:

- Button
- Dialog
- Card
- Input
- Navigation item
- Status indicator
- Notification
- Tooltip

search the project for an existing implementation.

If one exists, reuse or extend it.

---

# TERMINOLOGY RULE

ONE CONCEPT = ONE CANONICAL NAME.

Before introducing user-facing terminology:

Search the application for existing terminology.

Do not introduce:

`Create Project`

if the application already uses:

`Project Creator`

unless there is a deliberate semantic distinction.

Avoid inconsistent naming such as:

- Project / Job
- Create / Generate
- Delete / Remove
- Settings / Preferences
- User / Designer

unless they represent genuinely different concepts.

---

# DUPLICATION RULE

Before creating logic:

Search for existing implementations.

Avoid:

- Duplicate services
- Duplicate ViewModels
- Duplicate commands
- Duplicate validation
- Duplicate filesystem logic
- Duplicate API calls
- Duplicate UI components
- Duplicate styles
- Duplicate terminology

If duplication is found, determine whether it is:

KEEP

MERGE

REMOVE

or

DIFFERENTIATE

Do not remove code without understanding its purpose.

---

# FILESYSTEM SAFETY

SS-CAM performs real filesystem operations.

Treat filesystem operations as HIGH RISK.

Never blindly:

- Delete files
- Delete directories
- Overwrite existing files
- Move user files
- Modify files outside the intended workspace

Always validate:

- Source path
- Destination path
- File existence
- Directory existence
- Permissions
- Invalid characters
- Path traversal
- Network paths
- UNC paths

For destructive operations:

Require appropriate confirmation.

---

# DATA SAFETY

Never modify production/user data during testing unless explicitly instructed.

Use:

- Test workspace
- Temporary directories
- Mock data
- Disposable test files

When testing file generation or copying:

Verify the actual resulting filesystem state.

Do not consider a notification saying "Success" proof of success.

---

# NETWORK / NAS SAFETY

SS-CAM interacts with Synology/NAS resources.

Network failures must be treated as expected operating conditions.

Handle:

- Offline NAS
- Timeout
- Connection failure
- Permission failure
- Missing share
- Missing directory
- Slow response
- Interrupted operation

Never allow a network failure to freeze the UI.

---

# BACKGROUND OPERATIONS

Network, filesystem, scanning, copying, streaming, polling and other potentially expensive operations must not unnecessarily block the WPF UI thread.

Watch for:

- `.Result`
- `.Wait()`
- synchronous network calls
- synchronous filesystem scans
- timer leaks
- duplicated polling
- unbounded background tasks

Use asynchronous patterns where appropriate.

---

# ERROR HANDLING

Never silently swallow exceptions.

Avoid:

```csharp
catch
{
}
```

Errors should be:

1. Detected
2. Logged appropriately
3. Communicated appropriately
4. Recoverable where possible

Do not expose unnecessary technical information to normal users.

Minimum acceptable logging for a recoverable error:

```csharp
catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[ClassName] MethodName: " + ex.Message); }
```

---

# UI STATES

Important operations should account for:

- Default
- Hover
- Focus
- Disabled
- Loading
- Success
- Error
- Empty

Where applicable also support:

- Offline
- Permission denied
- Not configured
- Missing resource

---

# ACCESSIBILITY

Important functionality must be usable through:

- Keyboard
- Visible focus
- Logical Tab order
- Accessible names
- Semantic controls
- Appropriate tooltips

Do not make icon-only controls dependent solely on visual recognition.

---

# TESTING RULE

Never claim:

"PASS"

unless the behaviour has actually been verified.

Allowed statuses:

PASS
FAIL
PARTIAL
BLOCKED
N/A

---

# BUILD RULE

After meaningful code changes:

1. Run `.\QA\verify-sscam.ps1 -Fix` to restore UTF-8 BOM on any modified files.
2. Run `.\.agents\skills\sscam-qa\scripts\run-sscam-qa.ps1 -Build -Configuration Release`.
3. Test the affected workflow.
4. Check logs/errors.
5. Perform regression testing.

Never leave the repository knowingly unable to build.

---

# CHANGE CONTROL

Do not:

- Disable tests
- Delete tests
- Suppress errors without investigation
- Remove features to make tests pass
- Change business rules without justification
- Introduce unnecessary dependencies
- Rewrite architecture unnecessarily

---

# QA ARTIFACTS

Keep QA documentation under:

`/QA/`

Update relevant QA documents when testing or fixing functionality.

---

# AGENT BEHAVIOUR

Be conservative with destructive operations.

Prefer:

READ → ANALYZE → PROPOSE → CHANGE → VERIFY

over:

CHANGE → HOPE → APOLOGIZE

If a potentially destructive action is required, stop and request confirmation unless the action is explicitly authorized by the current task.

---

# DEFINITION OF DONE

A feature is not done merely because:

- Code compiles
- UI appears
- A button exists
- A notification appears

A feature is done when:

**The intended user action produces the intended real-world result and the resulting state is verified.**

---

# WORKSPACE AGENT SKILLS

- `sscam-code-guardian`: Validates SS-CAM source before any edit or commit. Enforces UTF-8 BOM, checks Fluent 2 compliance, hardcoded paths, silent catches, and UI thread blocking.
- `sscam-git-cleaner`: Automates post git pull/push cleanup, archiving unused/temporary files, organizing repository folder hierarchy, enforcing UTF-8 BOM encoding, and auditing project security.
- `sscam-page-scaffold`: Generates a new SS-CAM page with correct Fluent 2 structure, ScrollViewer root, lifecycle error guards, and automatic MainWindow navigation.
- `sscam-qa`: Automates safe QA for SS-CAM WPF desktop app including smoke testing, regression testing, build verification, and accessibility checks.
- `sscam-release-manager`: Automates SS-CAM version bump, packaging, tagging, and release preparation.
- `sscam-release-publisher`: Automates GitHub release publication, documentation updates, and health report publishing.
- `sscam-fluentui-web`: Comprehensive guide and design system reference for Microsoft Fluent UI Web (Fluent 2) in SS-CAM Web Portal (SS-CAM.Web). Covers repo breakdown of github.com/microsoft/fluentui, Fluent 2 web design tokens, Web Components, typography scale, elevation/shadows, component standards, and accessibility.
- `sscam-web-deploy`: Automates the complete testing, git commit/push, SSH sync, and Docker container restart pipeline for the SS-CAM Web Portal (creative.suamisihat.myds.me). Triggers: "deploy web", "deploy portal", "publish web", "update web portal", "deploy ss-cam web", "sync docker".
- `sscam-android-release`: Automates building, version-bumping, cryptographic signing, and packaging of the SS-CAM Android Companion App (AAB/APK) for Google Play Console and internal testing distribution. Triggers: "build android", "release android", "android release", "build aab", "publish playstore", "publish android", "package android", "android bundle".
