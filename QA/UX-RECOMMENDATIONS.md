# UX Recommendations
**SS-CAM v2.6.0** | Last updated: 2026-08-10

---

## P0: Unify Theming Tokens (Fix Dark Mode)
**Issue:** `SettingsPage.xaml` (and others) are hardcoded with `#FFFFFF` backgrounds and `#043388` foregrounds. This violates Fluent 2 compliance and breaks the app's theme-switching capability.
**Action:** 
- Strip all hex codes from UI pages. 
- Bind all surfaces to `{DynamicResource ApplicationBackgroundBrush}` or `{DynamicResource CardBackgroundFillColorDefaultBrush}`.
- Bind all text to `{DynamicResource TextFillColorPrimaryBrush}`.

## P1: Migrate Borders to ui:Card
**Issue:** The application uses 200+ native `Border` tags to simulate cards and grouped panels, often defining their own `CornerRadius` and `DropShadowEffect`.
**Action:** 
- Replace container `Border` elements with `ui:Card`. This automatically standardizes corner radii, background colors, and depth layers according to Fluent 2 guidelines.

## P2: Standardize Iconography
**Issue:** `ProjectCreatorPage.xaml` uses native Emojis (⚙️, 💾, 🗑️) instead of Segoe Fluent Icons.
**Action:** 
- Replace all emojis with appropriate `&#x...;` unicode values using the `Segoe Fluent Icons` typography (e.g., replace ⚙️ with `&#xE713;`).

## P2: Standardize Button Implementations
**Issue:** Primary buttons are hacked together by either wrapping a transparent `ui:Button` inside a colored `Border`, or by forcing a hardcoded background color directly onto the button.
**Action:** 
- Use WPF-UI's native semantic styles: `<ui:Button Appearance="Primary">` or `<ui:Button Appearance="Secondary">`.

## P3: Unify Typography Scale
**Issue:** Page titles range from 22pt to 26pt. Labels range from bold to semi-bold.
**Action:**
- Define global styles in `Fluent2Styles.xaml` (e.g., `Style TargetType="ui:TextBlock" x:Key="PageTitleStyle"`) and apply them uniformly across all 11 views.
