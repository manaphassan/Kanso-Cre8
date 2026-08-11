using System;
using System.IO;
using System.Windows;
using Newtonsoft.Json;
using SS_CAM.Utilities;

namespace SS_CAM.Services
{
    public enum AppTheme
    {
        SSDefault,
        Falconia,
        Metamorphosis    // Glassmorphism — deep navy + electric cyan + violet glow
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
        public string TitleBarBg { get; set; }
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
                _configPath = Path.Combine(AppPaths.AppDataFolder, "theme_config.json");

                if (File.Exists(_configPath))
                {
                    var cfg = JsonPersistenceHelper.Load<ThemeConfig>(_configPath);
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
            if (theme == AppTheme.Metamorphosis)
                return GetMetamorphosisColors();

            if (theme == AppTheme.Falconia)
            {
                // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                // FALCONIA — Full White Fluent 2 Light Theme
                // - Active item: text = SAME color as active icon (#0F6CBD)
                // - Inactive items: text = dark grey (#424242), icon = medium grey (#616161)
                // â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
                return new ThemeColors
                {
                    IsLight = true,
                    FontFamily = "Segoe UI Variable Text, Segoe UI Variable Display, Segoe UI, sans-serif",

                    TitleBarForeground = "#242424",
                    TitleBarBg         = "#FFFFFF",

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

                    // Designer Profile card in sidebar
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

            // —————————————————————————————————————————————————————————
            // SS DEFAULT — SuamiSihat Brand Theme (deep navy sidebar + crisp light canvas)
            // - Active item: text = WHITE (#FFFFFF), icon = #479EF5
            // - Inactive items: text = GREY (#9D9D9D), icon = #9D9D9D
            // —————————————————————————————————————————————————————————
            return new ThemeColors
            {
                IsLight = false,
                FontFamily      = "Segoe UI Variable Text, Segoe UI Variable Display, Segoe UI, sans-serif",

                // TitleBar strip -- Azure (Fluent 2 accent blue)
                TitleBarForeground = "#FFFFFF",
                TitleBarBg         = "#0078D4",

                // Header area -- deep brand navy
                HeaderBg        = "#021B47",
                HeaderBorder    = "#1E3A8A",

                // Content frame -- white (Light WPF-UI mode)
                MainFrameBg     = "#FFFFFF",

                // Sidebar -- SS Navy (SuamiSihat brand dark navy)
                SidebarBg       = "#021B47",
                SidebarBorder   = "#0A2560",

                // Search box inside sidebar
                SearchBg          = "#0D2A5C",
                SearchBorder      = "#1E3A8A",
                SearchText        = "#FFFFFF",
                SearchPlaceholder = "#9D9D9D",

                // Active nav item: semi-transparent blue tint + white text
                ActiveNavBg     = "#1A479EF5",
                ActiveNavText   = "#FFFFFF",
                ActiveNavSubtext= "#C7E0F4",

                // Inactive nav: grey text
                InactiveNavText    = "#9D9D9D",
                InactiveNavSubtext = "#9D9D9D",

                // Footer / status bar
                FooterBg        = "#021B47",
                FooterBorder    = "#0A2560",
                FooterText      = "#C8C8C8",
                FooterCardBg    = "#0D2A5C",
                FooterCardBorder= "#0A2560",

                // Designer Profile card in sidebar
                UserCardBg      = "#0D2A5C",
                UserCardBorder  = "#0A2560",
                UserCardTitle   = "#FFFFFF",
                UserCardSub     = "#479EF5",

                // Nav indicator pill + icon tint
                NavIndicatorColor = "#479EF5",
                NavIconActive     = "#479EF5",
                NavIconInactive   = "#9D9D9D",

                SpectrumBarColor  = "#479EF5"
            };
        }

        // —————————————————————————————————————————————————————————————————
        // METAMORPHOSIS — Glassmorphism (deep space navy + electric cyan)
        // Sidebar stays dark navy; content pages pick up glass card tokens
        // from MetamorphosisTheme.xaml via ResourceDictionary swap.
        // —————————————————————————————————————————————————————————————————
        private static ThemeColors GetMetamorphosisColors()
        {
            return new ThemeColors
            {
                IsLight = false,
                FontFamily = "Segoe UI Variable Text, Segoe UI Variable Display, Segoe UI, sans-serif",

                TitleBarForeground = "#F1F5F9",
                TitleBarBg         = "#08122E",

                // Main content frame uses the dark canvas defined in MetamorphosisTheme.xaml
                HeaderBg     = "#08122E",
                HeaderBorder = "#1E2D5A",
                MainFrameBg  = "#080D1F",   // overridden by MetaCanvasGradient in code

                // Deep navy sidebar (slightly lighter than canvas)
                SidebarBg     = "#0C1535",
                SidebarBorder = "#1B2B56",

                // Glass search box
                SearchBg          = "#14203A",
                SearchBorder      = "#2A3F6A",
                SearchText        = "#F1F5F9",
                SearchPlaceholder = "#64748B",

                // Active nav: electric cyan accent
                ActiveNavBg      = "#1400CFFF",    // #14 = 8% opacity cyan
                ActiveNavText    = "#00CFFF",
                ActiveNavSubtext = "#67E8F9",

                // Inactive nav: muted blue-grey
                InactiveNavText    = "#94A3B8",
                InactiveNavSubtext = "#64748B",

                FooterBg        = "#0C1535",
                FooterBorder    = "#1B2B56",
                FooterText      = "#94A3B8",
                FooterCardBg    = "#14203A",
                FooterCardBorder= "#2A3F6A",

                // User persona card
                UserCardBg     = "#14203A",
                UserCardBorder = "#2A3F6A",
                UserCardTitle  = "#F1F5F9",
                UserCardSub    = "#00CFFF",

                // Nav indicator: electric cyan glow
                NavIndicatorColor = "#00CFFF",
                NavIconActive     = "#00CFFF",
                NavIconInactive   = "#64748B",

                // Spectrum visualiser: cyan bars
                SpectrumBarColor  = "#00CFFF"
            };
        }

        public static void ApplyTheme(AppTheme theme)
        {
            _currentTheme = theme;
            SaveTheme(theme);

            // Swap WPF-UI application theme (Light vs Dark) so controls render correctly.
            // SS Default and Falconia use Light mode — content area cards are white.
            // Metamorphosis uses Dark mode — glass dark cards.
            // Nav item foreground is overridden in MainWindow.OnThemeModeChanged.
            try
            {
                if (theme == AppTheme.Falconia)
                    // Falconia: full white light mode
                    Wpf.Ui.Appearance.ApplicationThemeManager.Apply(Wpf.Ui.Appearance.ApplicationTheme.Light);
                else
                    // SS Default + Metamorphosis: both have dark navy sidebars,
                    // so use Dark WPF-UI mode. This makes NavigationViewContentBackground
                    // resolve to the dark token, which we then override to our brand color.
                    // Page content backgrounds are set per-page and are not affected.
                    Wpf.Ui.Appearance.ApplicationThemeManager.Apply(Wpf.Ui.Appearance.ApplicationTheme.Dark);
            }
            catch { }

            // Swap the style resource dictionary
            SwapResourceDictionary(theme);

            if (ThemeChanged != null)
                ThemeChanged(theme);
        }

        /// <summary>
        /// Hot-swaps the app style dictionary among SSDefaultTheme.xaml, Fluent2Styles.xaml
        /// and MetamorphosisTheme.xaml. Searches by source URI instead of a hardcoded
        /// index so it survives WPF-UI re-ordering its own dictionaries.
        /// </summary>
        private static void SwapResourceDictionary(AppTheme theme)
        {
            try
            {
                string newSource;
                if (theme == AppTheme.Metamorphosis)
                    newSource = "Styles/MetamorphosisTheme.xaml";
                else if (theme == AppTheme.SSDefault)
                    newSource = "Styles/SSDefaultTheme.xaml";
                else
                    newSource = "Styles/Fluent2Styles.xaml";

                var merged = Application.Current.Resources.MergedDictionaries;

                // Find and remove any existing app-theme dictionary by source URI
                for (int i = merged.Count - 1; i >= 0; i--)
                {
                    var src = merged[i].Source != null ? merged[i].Source.OriginalString : "";
                    if (src.Contains("Fluent2Styles") || src.Contains("MetamorphosisTheme") || src.Contains("SSDefaultTheme"))
                    {
                        merged.RemoveAt(i);
                        break;
                    }
                }

                var dict = new ResourceDictionary();
                dict.Source = new Uri(newSource, UriKind.Relative);
                merged.Add(dict);
            }
            catch { }
        }

        private static void SaveTheme(AppTheme theme)
        {
            if (!string.IsNullOrEmpty(_configPath))
            {
                JsonPersistenceHelper.Save(_configPath, new ThemeConfig { SelectedTheme = theme });
            }
        }
    }
}


