# Security & Data Safety Attestation Criteria
# Reference for sscam-release-publisher Step 1 health check.
# Last updated: 2026-08-12

## Checks Performed by QA/verify-sscam.ps1

All 9 checks below must be PASS before a release is published.

### Encoding Checks

1. **UTF-8 BOM on all high-byte source files**
   - All .cs and .xaml files containing characters above U+007F must have a UTF-8 BOM.
   - Failure: mojibake on non-ASCII locales (e.g., Malay content, prayer time names).
   - Fix: run `.\QA\verify-sscam.ps1 -Fix`

2. **No raw Unicode U+0100+ in XAML attribute strings**
   - XAML attribute values must not contain raw high-byte Unicode characters.
   - Use XML character references (e.g., `&#xE713;`) instead.

### Fluent 2 Design Checks

3. **All buttons use `<ui:Button>`**
   - Native `<Button>` elements in page content areas are prohibited.
   - They bypass WPF-UI theming and break all 5 theme profiles.

4. **NavigationView is root shell**
   - The main shell must use `<ui:NavigationView>` (Fluent 2 nav rail pattern).
   - Ensures consistent nav UX across all pages.

5. **All views are Page/ui:Page (not Window)**
   - Each module must be a WPF Page, not a standalone Window.
   - Windows bypass NavigationView and break keyboard navigation.

### Data Safety Checks

6. **No hardcoded filesystem paths in C# code**
   - Paths must come from settings or be constructed dynamically.
   - Hardcoded paths (e.g., `D:\Testing\`) break all workstations except the developer's.

7. **No silent empty catch {} blocks**
   - All catch blocks must at minimum log with `Debug.WriteLine`.
   - Silent swallowing of exceptions hides NAS failures, encoding errors, and data loss.

### Thread Safety Checks

8. **HttpClient is static readonly singleton**
   - Prevents socket exhaustion under radio streaming and NAS health polling.

9. **No UI thread blocking (.Result / .Wait)**
   - Async operations must not be synchronously blocked on the dispatcher thread.
   - Blocks freeze the UI and cause Windows to mark the app as Not Responding.

## Manual Security Review

Beyond the automated checks, attest the following for each release:

| Area | Requirement | Notes |
|---|---|---|
| Mind Drops | DPAPI-encrypted at rest | Verified in UserProfileService.cs |
| Profile data | No secrets stored in plaintext | Verified in profile.json schema |
| NAS probe | SSL bypass is acceptable for internal use | Documented known risk |
| Path traversal | Input sanitised via GetInvalidFileNameChars | Verified in ProjectGeneratorService.cs |
| Shell execution | No user-supplied strings passed to shell | Verified in all services |
| Telemetry | ZERO external analytics | No HttpClient calls to analytics endpoints |
