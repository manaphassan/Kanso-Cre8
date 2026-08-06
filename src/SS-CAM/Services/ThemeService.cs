using System;
using System.IO;
using Newtonsoft.Json;

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
        public string TitleBarForeground { get; set; }
        public string SearchBg { get; set; }
        public string SearchBorder { get; set; }
        public string SearchText { get; set; }
        public string SearchPlaceholder { get; set; }
        
        // Falconia-specific & Nav Tokens
        public string NavIndicatorColor { get; set; }
        public string NavIconActive { get; set; }
        public string NavIconInactive { get; set; }
        public string SpectrumBarColor { get; set; }
        public bool IsLight { get; set; }
    }

    public class ThemeConfig
    {
        public AppTheme SelectedTheme { get; set; }

        public ThemeConfig()
        {
            SelectedTheme = AppTheme.SSDefault;
        }
    }

    public class ThemeService
    {
        private static AppTheme _currentTheme = AppTheme.SSDefault;
        private static readonly string _configPath;

        static ThemeService()
        {
            try
            {
                string appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string ssDir = Path.Combine(appData, "SuamiSihat");
                if (!Directory.Exists(ssDir)) Directory.CreateDirectory(ssDir);
                _configPath = Path.Combine(ssDir, "theme_config.json");

                if (File.Exists(_configPath))
                {
                    string json = File.ReadAllText(_configPath);
                    var cfg = JsonConvert.DeserializeObject<ThemeConfig>(json);
                    if (cfg != null)
                    {
                        _currentTheme = cfg.SelectedTheme;
                    }
                }
            }
            catch
            {
                _currentTheme = AppTheme.SSDefault;
            }
        }

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
                // - Active item: text = SAME color as active icon (#0F6CBD)
                // - Inactive items: text = dark grey (#424242), icon = medium grey (#616161)
                // ─────────────────────────────────────────────────────────────────
                return new ThemeColors
                {
                    IsLight = true,
                    FontFamily = "Segoe UI Variable Text, Segoe UI Variable Display, Segoe UI, sans-serif",

                    TitleBarForeground = "#242424",

                    // Header & Canvas
                    HeaderBg        = "#FFFFFF",
                    HeaderBorder    = "#D1D1D1",
                    MainFrameBg     = "#FAFAFA",

                    // Sidebar: neutral background 2 (#F5F5F5) with stroke (#E0E0E0)
                    SidebarBg       = "#F5F5F5",
                    SidebarBorder   = "#E0E0E0",

                    // Global search in sidebar
                    SearchBg          = "#EBEBEB",
                    SearchBorder      = "#D1D1D1",
                    SearchText        = "#242424",
                    SearchPlaceholder = "#616161",

                    // Active nav item: text = SAME color as active icon (#0F6CBD)
                    ActiveNavBg     = "#EBF3FC",              // subtle blue tint
                    ActiveNavText   = "#0F6CBD",              // same color as icon active!
                    ActiveNavSubtext= "#115EA3",

                    // Inactive nav: dark grey text (#424242), grey icon (#616161)
                    InactiveNavText    = "#424242",           // turns grey when inactive
                    InactiveNavSubtext = "#616161",

                    // Footer / status bar
                    FooterBg        = "#FFFFFF",
                    FooterBorder    = "#E0E0E0",
                    FooterText      = "#242424",
                    FooterCardBg    = "#FFFFFF",
                    FooterCardBorder= "#E0E0E0",

                    // User profile card in sidebar
                    UserCardBg      = "#FFFFFF",
                    UserCardBorder  = "#D1D1D1",
                    UserCardTitle   = "#242424",
                    UserCardSub     = "#616161",

                    // Nav indicator pill + icon tint
                    NavIndicatorColor = "#0F6CBD",
                    NavIconActive     = "#0F6CBD",            // brand blue active icon
                    NavIconInactive   = "#616161",            // grey inactive icon

                    // Visualizer bar color for light mode
                    SpectrumBarColor  = "#0F6CBD"
                };
            }

            // ─────────────────────────────────────────────────────────────────
            // SS DEFAULT — SuamiSihat Brand Theme (deep navy)
            // - Active item: text = WHITE (#FFFFFF), icon = #479EF5
            // - Inactive items: text = GREY (#9D9D9D), icon = #9D9D9D
            // ─────────────────────────────────────────────────────────────────
            return new ThemeColors
            {
                IsLight = false,
                FontFamily      = "Segoe UI Variable Text, Segoe UI Variable Display, Segoe UI, sans-serif",

                TitleBarForeground = "#FFFFFF",

                HeaderBg        = "#021B47",
                HeaderBorder    = "#1E3A8A",
                MainFrameBg     = "#F8FAFC",

                SidebarBg       = "#02153D",
                SidebarBorder   = "#0A2560",

                SearchBg          = "#071E46",
                SearchBorder      = "#1E3A8A",
                SearchText        = "#FFFFFF",
                SearchPlaceholder = "#9D9D9D",

                ActiveNavBg     = "#1A479EF5",
                ActiveNavText   = "#FFFFFF",              // white text when selected!
                ActiveNavSubtext= "#C7E0F4",

                InactiveNavText    = "#9D9D9D",           // grey text when inactive!
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

                NavIndicatorColor = "#479EF5",
                NavIconActive     = "#479EF5",
                NavIconInactive   = "#9D9D9D",

                SpectrumBarColor  = "#479EF5"
            };
        }

        public static void ApplyTheme(AppTheme theme)
        {
            _currentTheme = theme;
            SaveTheme(theme);
            if (ThemeChanged != null)
            {
                ThemeChanged(theme);
            }
        }

        private static void SaveTheme(AppTheme theme)
        {
            try
            {
                if (!string.IsNullOrEmpty(_configPath))
                {
                    string json = JsonConvert.SerializeObject(new ThemeConfig { SelectedTheme = theme }, Formatting.Indented);
                    File.WriteAllText(_configPath, json);
                }
            }
            catch { }
        }
    }
}
