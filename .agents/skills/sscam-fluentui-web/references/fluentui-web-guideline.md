# Microsoft Fluent UI Web (Fluent 2) Design System Guideline

## 1. Overview & Repository Breakdown (`github.com/microsoft/fluentui`)

The [`microsoft/fluentui`](https://github.com/microsoft/fluentui) repository represents Microsoft's unified collection of Web design utilities, component systems, and design tokens for building modern web applications.

### Core Architecture Breakdown

1. **Fluent UI React v9 (`packages/react-components`)**:
   - The primary future-proof implementation of Fluent 2 for React.
   - Built on Griffel CSS-in-JS and tokenized CSS custom properties.
   - High-performance, accessible, and responsive out of the box.

2. **Fluent UI Web Components (`packages/web-components`)**:
   - Standard Web Component implementation built on W3C Shadow DOM and Custom Elements (`<fluent-card>`, `<fluent-button>`, `<fluent-text-field>`).
   - Framework-agnostic and ideal for lightweight web portals.

3. **Fluent 2 Design Tokens (`packages/tokens`)**:
   - The foundational design language specification defining colors, elevation, ramps, typography, and layout geometry.
   - Token naming standard uses strict semantic names: `--colorNeutralBackground1`, `--colorBrandBackground`, `--colorNeutralForeground1`, `--shadow4`, `--shadow16`, `--borderRadiusMedium`.

---

## 2. Tokenized Color & Surface Matrix

| Purpose | Official Fluent UI Web Token | SuamiSihat Web Alias |
|---|---|---|
| Page Background | `--colorNeutralBackground1` | `--bg-app` |
| Subtle Surface | `--colorNeutralBackground2` | `--surface-card-subtle` |
| Elevated Surface | `--colorNeutralBackground3` | `--surface-card-elevated` |
| Primary Text | `--colorNeutralForeground1` | `--text-primary` |
| Secondary Text | `--colorNeutralForeground2` | `--text-secondary` |
| Disabled Text | `--colorNeutralForegroundDisabled` | `--text-tertiary` |
| Brand Primary | `--colorBrandBackground` | `--brand-primary` |
| Brand Hover | `--colorBrandBackgroundHover` | `--brand-secondary` |
| Brand Tint | `--colorBrandBackgroundInverted` | `--brand-tint` |
| Success Fill | `--colorPaletteGreenBackground3` | `--color-success` |
| Warning Fill | `--colorPaletteYellowBackground3` | `--color-warning` |
| Danger Fill | `--colorPaletteRedBackground3` | `--color-danger` |

---

## 3. Elevation & Shadow Standards

```css
/* Fluent 2 Elevation Hierarchy */
--shadow2: 0 1px 2px 0 rgba(0,0,0,0.12), 0 0 2px 0 rgba(0,0,0,0.14);
--shadow4: 0 1.6px 3.6px 0 rgba(0,0,0,0.132), 0 0.3px 0.9px 0 rgba(0,0,0,0.108);
--shadow8: 0 3.2px 7.2px 0 rgba(0,0,0,0.132), 0 0.6px 1.8px 0 rgba(0,0,0,0.108);
--shadow16: 0 6.4px 14.4px 0 rgba(0,0,0,0.132), 0 1.2px 3.6px 0 rgba(0,0,0,0.108);
--shadow28: 0 11.2px 25.2px 0 rgba(0,0,0,0.132), 0 2.1px 6.3px 0 rgba(0,0,0,0.108);
```

---

## 4. Typography Scale

- **Display Header**: `24px` / `FontWeight: 800` (Page Title)
- **Section Heading**: `16px - 18px` / `FontWeight: 700`
- **Body Large**: `14px` / `FontWeight: 400`
- **Body Base**: `13px` / `FontWeight: 400`
- **Caption / Meta**: `11px - 12px` / `FontWeight: 600`
- **Monospace Code**: `Cascadia Code`, `Consolas`, `Segoe UI Mono`

---

## 5. Component Implementation Rules for SS-CAM Web

1. **Button Standards**: Use `.btn` with `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-danger`. Border radius is `--borderRadiusMedium` (6px).
2. **Card Standard**: Cards must use elevated surface tokens, subtle 1px border stroke, and dynamic elevation shadows on hover (`.card-hover-lift`).
3. **Filter Pills**: Interactive filter pills must use `--colorBrandBackgroundInverted` when active with pill radius (`9999px`).
4. **Modals & Lightboxes**: Modals use `--shadow28`, fixed position overlay with `--glass-blur`, and keyboard `Escape` dismissal.
5. **Hero Banner Background Standard (`HeroBanner`)**: Canonical default background for all Hero Banners. Uses deep navy gradient (`#022057` → `#043388` → `#021233`), radial ambient glow, triple liquid sine waves faded to 15% transparency, and a 60fps particle stream of strictly **69 Men's Vitality Symbols (`♂`)** and **6 SuamiSihat Vector Logomarks** randomized between **`8px` and `24px`**. See [`docs/HERO-BANNER-BACKGROUND.md`](file:///e:/Dev/Projects/SS-Brand-Assets/docs/HERO-BANNER-BACKGROUND.md).
