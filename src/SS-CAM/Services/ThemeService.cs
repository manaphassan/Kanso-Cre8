using System;

namespace SS_CAM.Services
{
    public enum AppTheme
    {
        SSDefault,
        Win11Fluent,
        GlassMorphism
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
            if (theme == AppTheme.GlassMorphism)
            {
                return new ThemeColors
                {
                    FontFamily = "Segoe UI Variable Display, Segoe UI, sans-serif",
                    HeaderBg = "#B00A2C40",        // Translucent Frosted Dark Teal Glass (Dropbox Concept Style)
                    HeaderBorder = "#4038BDF8",    // Subtle Cyan Glow Border
                    SidebarBg = "#C0061D2B",       // Translucent Deep Cyan-Teal Sidebar
                    SidebarBorder = "#3038BDF8",
                    ActiveNavBg = "#00F2FE",       // Electric Cyan Active Button Highlight
                    ActiveNavText = "#031B28",     // High Contrast Dark Cyan Text
                    ActiveNavSubtext = "#05344C",
                    InactiveNavText = "#E0F2FE",
                    InactiveNavSubtext = "#7DD3FC",
                    FooterBg = "#CC082638",        // Translucent Glass Footer
                    FooterBorder = "#3038BDF8",
                    FooterText = "#E0F2FE",
                    FooterCardBg = "#400F3A50",
                    FooterCardBorder = "#4038BDF8",
                    UserCardBg = "#400F3A50",       // Translucent Frosted User Profile Card
                    UserCardBorder = "#4038BDF8",
                    UserCardTitle = "#FFFFFF",
                    UserCardSub = "#38BDF8",
                    MainFrameBg = "#90082233"      // Translucent Glass Canvas
                };
            }

            if (theme == AppTheme.Win11Fluent)
            {
                return new ThemeColors
                {
                    // Official Windows 11 Fluent System Font Family & System Palette (No SuamiSihat Colors)
                    FontFamily = "Segoe UI Variable Text, Segoe UI, sans-serif",
                    HeaderBg = "#202020",          // Windows 11 Mica System Dark Header
                    HeaderBorder = "#2C2C2C",
                    SidebarBg = "#202020",         // Windows 11 System Navigation Drawer
                    SidebarBorder = "#2C2C2C",
                    ActiveNavBg = "#0078D4",       // Official Windows Accent Blue
                    ActiveNavText = "#FFFFFF",
                    ActiveNavSubtext = "#E0F2FE",
                    InactiveNavText = "#FFFFFF",
                    InactiveNavSubtext = "#A1A1AA",
                    FooterBg = "#2C2C2C",          // Windows 11 Dark Footer
                    FooterBorder = "#3F3F46",
                    FooterText = "#FFFFFF",
                    FooterCardBg = "#3F3F46",
                    FooterCardBorder = "#52525B",
                    UserCardBg = "#2C2C2C",
                    UserCardBorder = "#3F3F46",
                    UserCardTitle = "#FFFFFF",
                    UserCardSub = "#60A5FA",
                    MainFrameBg = "#18181B"        // Windows 11 Dark Canvas
                };
            }

            // SSDefault (SuamiSihat Brand Theme)
            return new ThemeColors
            {
                FontFamily = "Segoe UI, sans-serif",
                HeaderBg = "#021B47",
                HeaderBorder = "#1E3A8A",
                SidebarBg = "#043388",
                SidebarBorder = "#022057",
                ActiveNavBg = "#6DC6EC",
                ActiveNavText = "#043388",
                ActiveNavSubtext = "#022057",
                InactiveNavText = "#F8FAFC",
                InactiveNavSubtext = "#93C5FD",
                FooterBg = "#FFFFFF",
                FooterBorder = "#E2E8F0",
                FooterText = "#043388",
                FooterCardBg = "#F1F5F9",
                FooterCardBorder = "#CBD5E1",
                UserCardBg = "#FFFFFF",
                UserCardBorder = "#E2E8F0",
                UserCardTitle = "#0F172A",
                UserCardSub = "#043388",
                MainFrameBg = "#F8FAFC"
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
