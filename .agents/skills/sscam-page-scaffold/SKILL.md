---
name: sscam-page-scaffold
description: >
  Generates a new SS-CAM page with correct Fluent 2 structure, UTF-8 BOM,
  ScrollViewer root, Loaded/Unloaded lifecycle, error guards, and automatic
  wiring into MainWindow navigation. Trigger: "new page", "add page",
  "add module", "create [name] page", "new [name] module".
---

# SS-CAM Page Scaffold

## What You Need From the User

1. **Page class name** (PascalCase, no spaces): e.g. `AnalyticsReport`
2. **Display title** (shown in nav + page header): e.g. `Analytics Report`
3. **Subtitle / description**: e.g. `Track output trends and project volume.`
4. **Nav icon** (Segoe Fluent Icons symbol name): e.g. `ChartMultiple24`

## Steps to Generate a Page

### 1. Create `Views/{{NAME}}Page.xaml`

Copy from: `.agents/skills/sscam-page-scaffold/templates/Page.xaml.template`

- Replace `{{PAGE_NAME}}` with the class name (e.g. `AnalyticsReport`)
- Replace `{{PAGE_TITLE}}` with the display title
- Replace `{{PAGE_SUBTITLE}}` with the subtitle
- Save as **UTF-8 WITH BOM**
- Set Build Action: `Page`, Custom Tool: `MSBuild:Compile`

### 2. Create `Views/{{NAME}}Page.xaml.cs`

Copy from: `.agents/skills/sscam-page-scaffold/templates/Page.xaml.cs.template`

- Replace `{{PAGE_NAME}}` with the class name
- Save as **UTF-8 WITH BOM**

### 3. Register in `MainWindow.xaml`

Add inside `<ui:NavigationView.MenuItems>` (or `FooterMenuItems` for utilities):

```xml
<ui:NavigationViewItem Content="{{DISPLAY_TITLE}}"
    Icon="{ui:SymbolIcon {{ICON_NAME}}}"
    TargetPageType="{x:Type views:{{PAGE_NAME}}Page}" />
```

### 4. Register in `SS-CAM.csproj`

Add two entries inside the `<ItemGroup>` for Page items:

```xml
<Page Include="Views\{{PAGE_NAME}}Page.xaml">
  <Generator>MSBuild:Compile</Generator>
  <SubType>Designer</SubType>
</Page>
<Compile Include="Views\{{PAGE_NAME}}Page.xaml.cs">
  <DependentUpon>{{PAGE_NAME}}Page.xaml</DependentUpon>
</Compile>
```

### 5. Verify

- [ ] Build succeeds (no compile errors)
- [ ] New nav item appears in sidebar
- [ ] Clicking navigates to new page
- [ ] Page scrolls vertically with mouse wheel
- [ ] Refresh button does not throw exception
- [ ] Page title/subtitle renders without mojibake

## Fluent 2 Rules for New Pages

| Element | Use |
|---------|-----|
| Root | `<ScrollViewer VerticalScrollBarVisibility="Auto" Padding="24">` |
| Container | `<ui:Card Padding="20">` (Never use raw `<Border>` for panels) |
| Page background | `{DynamicResource ApplicationPageBackgroundThemeBrush}` |
| Card surface | `{DynamicResource CardBackgroundFillColorDefaultBrush}` |
| Card border | `{DynamicResource CardStrokeColorDefaultBrush}` |
| Primary text | `{DynamicResource TextFillColorPrimaryBrush}` |
| Secondary text | `{DynamicResource TextFillColorSecondaryBrush}` |
| Brand accent | `{DynamicResource FluentBrand80}` |
| Buttons | `<ui:Button Appearance="Primary|Secondary">` |
| Vector Icons | `<ui:SymbolIcon Symbol="<Name>24">` |
| Typography | Page title `FontSize="24"` `FontWeight="Bold"` |
| Clickable non-button | `Cursor="Hand"` + `ToolTip` |

## Templates

`.agents/skills/sscam-page-scaffold/templates/`
- `Page.xaml.template` — XAML structure
- `Page.xaml.cs.template` — code-behind with lifecycle
