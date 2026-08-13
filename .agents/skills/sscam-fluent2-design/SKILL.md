---
name: sscam-fluent2-design
description: >
  Comprehensive guide and design system reference for Microsoft Fluent 2 in WPF (SS-CAM).
  Covers design tokens, typography scale, color palettes, elevation/shadows, layout grids,
  interactive component states, iconography, motion/micro-animations, and accessibility.
  Trigger: "fluent 2", "fluent design", "ui design", "component style", "styling", "design tokens".
---

# Microsoft Fluent 2 Design System Guide for SS-CAM

This skill defines the official implementation standards for **Microsoft Fluent 2** in the **SS-CAM** WPF Windows desktop application (referencing [fluent2.microsoft.design](https://fluent2.microsoft.design/)).

---

## 1. Core Design System Principles

1. **Tokenized Dynamic Colors**: Never use hardcoded hex colors (`#FFFFFF`, `#000000`, etc.) for page backgrounds, card surfaces, or text content. Always use dynamic theme tokens to ensure flawless light, dark, and custom theme switching.
2. **Strict Typography Hierarchy**:
   - **Page Title**: `FontSize="24"`, `FontWeight="Bold"`, `Foreground="{DynamicResource TextFillColorPrimaryBrush}"` (No exceptions).
   - **Section Heading**: `FontSize="16-18"`, `FontWeight="SemiBold"`.
   - **Body / Subtitle**: `FontSize="12-13"`, `Foreground="{DynamicResource TextFillColorSecondaryBrush}"`.
   - **Caption / Badge**: `FontSize="10-11"`.
3. **Canonical Components Only**: Use WPF-UI controls (`<ui:TextBlock>`, `<ui:Button>`, `<ui:Card>`, `<ui:SymbolIcon>`) rather than raw WPF native controls for page content.
4. **Iconography**: Use `<ui:SymbolIcon Symbol="<Name>24">` with `24px` pixel sizing for headers and `16px`/`13px` for inline/card controls.

---

## 2. Dynamic Token Matrix

| Purpose | Correct Token Brush |
|---|---|
| **Page Background** | `{DynamicResource ApplicationPageBackgroundThemeBrush}` |
| **Card Surface** | `{DynamicResource CardBackgroundFillColorDefaultBrush}` |
| **Card Border** | `{DynamicResource CardStrokeColorDefaultBrush}` |
| **Text Input Background** | `{DynamicResource TextControlBackground}` |
| **Primary Text** | `{DynamicResource TextFillColorPrimaryBrush}` |
| **Secondary Text** | `{DynamicResource TextFillColorSecondaryBrush}` |
| **Brand Primary** | `{DynamicResource FluentBrand80}` |
| **Brand Tint / Light** | `{DynamicResource FluentBrandLight}` |
| **Success State** | `{DynamicResource SystemFillColorSuccessBrush}` |
| **Caution / Warning** | `{DynamicResource SystemFillColorCautionBrush}` |
| **Critical / Error** | `{DynamicResource SystemFillColorCriticalBrush}` |

---

## 3. Component Standards

### Page Header Standard
Every page MUST use the standardized horizontal header container:

```xaml
<StackPanel Orientation="Horizontal" Margin="0,0,0,4">
    <ui:SymbolIcon Symbol="<IconName>24" FontSize="24" Foreground="{DynamicResource FluentBrand80}" VerticalAlignment="Center" Margin="0,0,10,0"/>
    <ui:TextBlock Text="Page Title" FontSize="24" FontWeight="Bold" Foreground="{DynamicResource TextFillColorPrimaryBrush}" VerticalAlignment="Center"/>
</StackPanel>
<ui:TextBlock Text="Comprehensive page description subtext explaining user capability." Foreground="{DynamicResource TextFillColorSecondaryBrush}" FontSize="13" Margin="0,4,0,16"/>
```

### Card & Elevation Standard
Elevated surfaces and interactive card containers use `<ui:Card>` or `<ui:CardAction>`:

```xaml
<ui:Card Padding="16" Margin="0,0,0,16">
    <StackPanel>
        <ui:TextBlock Text="Card Heading" FontSize="16" FontWeight="SemiBold" Foreground="{DynamicResource TextFillColorPrimaryBrush}"/>
        <ui:TextBlock Text="Card body content..." Foreground="{DynamicResource TextFillColorSecondaryBrush}" FontSize="12" Margin="0,4,0,0"/>
    </StackPanel>
</ui:Card>
```

### Animated Hover Lift Style (`SwatchCardStyle`)
For cards requiring interactive elevation animations:

```xaml
<Style x:Key="SwatchCardStyle" TargetType="ui:Card">
    <Setter Property="RenderTransformOrigin" Value="0.5,0.5"/>
    <Setter Property="RenderTransform">
        <Setter.Value>
            <ScaleTransform ScaleX="1" ScaleY="1"/>
        </Setter.Value>
    </Setter>
    <Setter Property="Effect">
        <Setter.Value>
            <DropShadowEffect Color="#000000" Opacity="0.08" BlurRadius="8" ShadowDepth="2" Direction="270"/>
        </Setter.Value>
    </Setter>
    <Style.Triggers>
        <Trigger Property="IsMouseOver" Value="True">
            <Trigger.EnterActions>
                <BeginStoryboard>
                    <Storyboard>
                        <DoubleAnimation Storyboard.TargetProperty="RenderTransform.ScaleX" To="1.03" Duration="0:0:0.15"/>
                        <DoubleAnimation Storyboard.TargetProperty="RenderTransform.ScaleY" To="1.03" Duration="0:0:0.15"/>
                        <DoubleAnimation Storyboard.TargetProperty="Effect.Opacity" To="0.22" Duration="0:0:0.15"/>
                        <DoubleAnimation Storyboard.TargetProperty="Effect.BlurRadius" To="18" Duration="0:0:0.15"/>
                    </Storyboard>
                </BeginStoryboard>
            </Trigger.EnterActions>
            <Trigger.ExitActions>
                <BeginStoryboard>
                    <Storyboard>
                        <DoubleAnimation Storyboard.TargetProperty="RenderTransform.ScaleX" To="1.0" Duration="0:0:0.12"/>
                        <DoubleAnimation Storyboard.TargetProperty="RenderTransform.ScaleY" To="1.0" Duration="0:0:0.12"/>
                        <DoubleAnimation Storyboard.TargetProperty="Effect.Opacity" To="0.08" Duration="0:0:0.12"/>
                        <DoubleAnimation Storyboard.TargetProperty="Effect.BlurRadius" To="8" Duration="0:0:0.12"/>
                    </Storyboard>
                </BeginStoryboard>
            </Trigger.ExitActions>
        </Trigger>
    </Style.Triggers>
</Style>
```

### Button Standard
Always use `<ui:Button>` with predefined `Appearance`:

```xaml
<!-- Primary Action -->
<ui:Button Appearance="Primary" Height="36" Padding="16,0" Click="OnPrimaryAction">
    <StackPanel Orientation="Horizontal">
        <ui:SymbolIcon Symbol="Checkmark24" FontSize="14" Margin="0,0,6,0" VerticalAlignment="Center"/>
        <ui:TextBlock Text="Save Changes" FontWeight="Bold" VerticalAlignment="Center"/>
    </StackPanel>
</ui:Button>

<!-- Secondary Action -->
<ui:Button Appearance="Secondary" Height="36" Padding="14,0" Click="OnSecondaryAction">
    <StackPanel Orientation="Horizontal">
        <ui:SymbolIcon Symbol="Dismiss24" FontSize="14" Margin="0,0,6,0" VerticalAlignment="Center"/>
        <ui:TextBlock Text="Cancel" FontWeight="SemiBold" VerticalAlignment="Center"/>
    </StackPanel>
</ui:Button>
```

---

## 4. ScrollViewer & Mouse Wheel Navigation Standard

All scrollable pages MUST include explicit mouse wheel preview tunneling to prevent scroll lock inside nested containers:

### XAML Pattern:
```xaml
<ScrollViewer x:Name="PageScrollViewer" VerticalScrollBarVisibility="Auto" HorizontalScrollBarVisibility="Disabled" ScrollViewer.CanContentScroll="False" PreviewMouseWheel="OnScrollViewerPreviewMouseWheel">
    <StackPanel PreviewMouseWheel="OnScrollViewerPreviewMouseWheel">
        <!-- Page content -->
    </StackPanel>
</ScrollViewer>
```

### C# Code-Behind Pattern:
```csharp
private void OnScrollViewerPreviewMouseWheel(object sender, System.Windows.Input.MouseWheelEventArgs e)
{
    try
    {
        var scroller = sender as ScrollViewer ?? PageScrollViewer;
        if (scroller != null)
        {
            scroller.ScrollToVerticalOffset(scroller.VerticalOffset - e.Delta * 0.5);
            e.Handled = true;
        }
    }
    catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[Page] OnScrollViewerPreviewMouseWheel: " + ex.Message); }
}
```

---

## 5. Verification Protocol

After creating or editing any Fluent 2 XAML or C# files:

1. **Restore Encoding & Verify Rules**:
   ```powershell
   .\QA\verify-sscam.ps1 -Fix
   ```
2. **Build Debug Assembly**:
   ```powershell
   C:\Windows\Microsoft.NET\Framework\v4.0.30319\MSBuild.exe src\SS-CAM\SS-CAM.csproj /p:Configuration=Debug /t:Build
   ```
3. Ensure `9/9 PASS` on Source Guardian before declaring completion.
