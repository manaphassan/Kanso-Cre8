using System;

namespace SS_CAM.Services
{
    public enum AppTheme
    {
        SSDefault,
        Falconia
    }

    public class ThemeColors
    {
        public string FontFamily { get; set; }
        public string HeaderBg { get; set; }
        public string HeaderBorder { get; set; }
        public string SidebarBg { get; set; }
        public string SidebarBorder { get; set; }
        public string ActiveNavBg { get; set; }
        public string ActiveNavText { get; set; }
        public string ActiveNavSubtext { get; set; }
        public string InactiveNavText { get; set; }
        public string InactiveNavSubtext { get; set; }
        public string FooterBg { get; set; }
        public string FooterBorder { get; set; }
        public string FooterText { get; set; }
        public string FooterCardBg { get; set; }
        public string FooterCardBorder { get; set; }
        public string UserCardBg { get; set; }
        public string UserCardBorder { get; set; }
        public string UserCardTitle { get; set; }
        public string UserCardSub { get; set; }
        public string MainFrameBg { get; set; }
        // Falconia-specific extras
        public string NavIndicatorColor { get; set; }
        public string NavIconActive { get; set; }
        public string NavIconInactive { get; set; }
        public bool IsLight { get; set; }
    }

    public class ThemeService
    {
        private static AppTheme _currentTheme = AppTheme.SSDefault;

        public static AppTheme CurrentTheme
        {
            get { return _currentTheme; }
        }

        public static event Action<AppTheme> ThemeChanged;

        public static ThemeColors GetColors(AppTheme theme)
        {
            if (theme == AppTheme.Falconia)
            {
                // ─────────────────────────────────────────────────────────────────
                // FALCONIA — Full White Fluent 2 Light Theme
                // Based on official Fluent 2 Light design tokens:
                //   colorNeutralBackground1   = #FFFFFF
                //   colorNeutralBackground2   = #F5F5F5
                //   colorNeutralBackground3   = #F0F0F0
                //   colorNeutralForeground1   = #242424   (primary text)
                //   colorNeutralForeground2   = #424242   (secondary text)
                //   colorNeutralForeground3   = #616161   (tertiary / icons)
                //   colorNeutralStroke1       = #D1D1D1   (borders)
                //   colorNeutralStroke2       = #E0E0E0
                //   colorBrandBackground      = #0F6CBD   (brand accent)
                //   colorBrandForeground1     = #0F6CBD   (active link/icon)
                //   colorBrandForeground2     = #115EA3
                //   colorNeutralBackground1Hover = #F5F5F5
                // ─────────────────────────────────────────────────────────────────
                return new ThemeColors
                {
                    IsLight = true,
                    FontFamily = "Segoe UI Variable Text, Segoe UI Variable Display, Segoe UI, sans-serif",

                    // Header: white with subtle bottom shadow stroke
                    HeaderBg        = "#FFFFFF",
                    HeaderBorder    = "#D1D1D1",

                    // Sidebar: neutral background 2 (not pure white — slight depth)
                    SidebarBg       = "#F5F5F5",
                    SidebarBorder   = "#E0E0E0",

                    // Active nav item: subtle blue tint bg, brand text
                    ActiveNavBg     = "#EBF3FC",              // colorBrandBackground2 tint
                    ActiveNavText   = "#0F6CBD",              // colorBrandForeground1
                    ActiveNavSubtext= "#115EA3",

                    // Inactive nav: standard foreground on light bg
                    InactiveNavText    = "#242424",           // colorNeutralForeground1
                    InactiveNavSubtext = "#616161",

                    // Footer / status bar: white with stroke
                    FooterBg        = "#FFFFFF",
                    FooterBorder    = "#E0E0E0",
                    FooterText      = "#242424",
                    FooterCardBg    = "#F5F5F5",
                    FooterCardBorder= "#E0E0E0",

                    // User profile card in sidebar
                    UserCardBg      = "#FFFFFF",
                    UserCardBorder  = "#D1D1D1",
                    UserCardTitle   = "#242424",
                    UserCardSub     = "#0F6CBD",

                    // Main content canvas
                    MainFrameBg     = "#FAFAFA",

                    // Nav indicator pill + icon tint
                    NavIndicatorColor = "#0F6CBD",
                    NavIconActive     = "#0F6CBD",            // 8.5:1 on #FAFAFA WCAG AA ✅
                    NavIconInactive   = "#616161",            // 5.9:1 on #F5F5F5 WCAG AA ✅
                };
            }

            // ─────────────────────────────────────────────────────────────────
            // SS DEFAULT — SuamiSihat Brand Theme (deep navy)
            // ─────────────────────────────────────────────────────────────────
            return new ThemeColors
            {
                IsLight = false,
                FontFamily      = "Segoe UI Variable Text, Segoe UI Variable Display, Segoe UI, sans-serif",
                HeaderBg        = "#021B47",
                HeaderBorder    = "#1E3A8A",
                SidebarBg       = "#02153D",
                SidebarBorder   = "#0A2560",
                ActiveNavBg     = "#1A479EF5",
                ActiveNavText   = "#FFFFFF",
                ActiveNavSubtext= "#C7E0F4",
                InactiveNavText    = "#C8C8C8",
                InactiveNavSubtext = "#9D9D9D",
                FooterBg        = "#02153D",
                FooterBorder    = "#0A2560",
                FooterText      = "#C8C8C8",
                FooterCardBg    = "#071E46",
                FooterCardBorder= "#0A2560",
                UserCardBg      = "#071E46",
                UserCardBorder  = "#0A2560",
                UserCardTitle   = "#FFFFFF",
                UserCardSub     = "#479EF5",
                MainFrameBg     = "#F8FAFC",
                NavIndicatorColor = "#479EF5",
                NavIconActive     = "#479EF5",    // 5.8:1 on #02153D WCAG AA ✅
                NavIconInactive   = "#9D9D9D",    // 5.4:1 on #02153D WCAG AA ✅
            };
        }

        public static void ApplyTheme(AppTheme theme)
        {
            _currentTheme = theme;
            if (ThemeChanged != null)
            {
                ThemeChanged(theme);
            }
        }
    }
}
