using System;

namespace SS_CAM.Services
{
    public enum AppTheme
    {
        SSDefault,
        Win11Fluent
    }

    public class ThemeColors
    {
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
            if (theme == AppTheme.Win11Fluent)
            {
                return new ThemeColors
                {
                    HeaderBg = "#0F172A",
                    HeaderBorder = "#334155",
                    SidebarBg = "#0F172A",
                    SidebarBorder = "#1E293B",
                    ActiveNavBg = "#0078D4",
                    ActiveNavText = "#FFFFFF",
                    ActiveNavSubtext = "#E0F2FE",
                    InactiveNavText = "#F1F5F9",
                    InactiveNavSubtext = "#94A3B8",
                    FooterBg = "#F8FAFC",
                    FooterBorder = "#E2E8F0",
                    FooterText = "#0F172A",
                    FooterCardBg = "#FFFFFF",
                    FooterCardBorder = "#CBD5E1",
                    UserCardBg = "#FFFFFF",
                    UserCardBorder = "#E2E8F0",
                    UserCardTitle = "#0F172A",
                    UserCardSub = "#0078D4",
                    MainFrameBg = "#F1F5F9"
                };
            }

            // SSDefault (SuamiSihat Brand Theme)
            return new ThemeColors
            {
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
