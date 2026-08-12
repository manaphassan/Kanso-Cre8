using System;
using System.IO;
using System.Windows;
using System.Windows.Media;
using Newtonsoft.Json;
using SS_CAM.Utilities;

namespace SS_CAM.Services
{
    public enum AppTheme
    {
        Falconia,        // Clean Fluent 2 Light Mode
        Metamorphosis,   // Glassmorphism — deep navy + electric cyan + violet glow
        Catppuccin,      // Soothing pastel dark (Mocha flavor — Mauve accent on Base dark background)
        RosePine,        // All natural pine, warm rose, iris & gold aesthetic (rosepinetheme.com)
        Nord             // Arctic, North-bluish color palette (nordtheme.com)
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
            SelectedTheme = AppTheme.Falconia;
        }
    }

    public class ThemeService
    {
        private static AppTheme _currentTheme = AppTheme.Falconia;
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
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[ThemeService] Static ctor: " + ex.Message);
                _currentTheme = AppTheme.Falconia;
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
            if (theme == AppTheme.Catppuccin)
                return GetCatppuccinColors();
            if (theme == AppTheme.RosePine)
                return GetRosePineColors();
            if (theme == AppTheme.Nord)
                return GetNordColors();

            return GetFalconiaColors();
        }

        private static ThemeColors GetFalconiaColors()
        {
            return new ThemeColors
            {
                IsLight = true,
                FontFamily = "Segoe UI Variable Text, Segoe UI Variable Display, Segoe UI, sans-serif",

                TitleBarForeground = "#FFFFFF",

                // Header & Canvas (SS Blue header)
                HeaderBg        = "#043388",
                HeaderBorder    = "#062E7A",
                MainFrameBg     = "#FAFAFA",

                // Sidebar
                SidebarBg       = "#043388",
                SidebarBorder   = "#062E7A",

                // Global search in sidebar
                SearchBg          = "#0644B2",
                SearchBorder      = "#1B55C4",
                SearchText        = "#FFFFFF",
                SearchPlaceholder = "#8AAACF",

                // Active nav item: text = SAME color as active icon (#21A1F7 Azure)
                ActiveNavBg     = "#EBF4FE",              // subtle azure tint
                ActiveNavText   = "#21A1F7",              // Azure Blue!
                ActiveNavSubtext= "#0E84D3",

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
                UserCardBg      = "#0644B2",
                UserCardBorder  = "#1B55C4",
                UserCardTitle   = "#FFFFFF",
                UserCardSub     = "#21A1F7",

                // Nav indicator pill + icon tint (Azure #21A1F7)
                NavIndicatorColor = "#21A1F7",
                NavIconActive     = "#21A1F7",            // Azure blue active icon
                NavIconInactive   = "#616161",            // grey inactive icon

                // Visualizer bar color for light mode
                SpectrumBarColor  = "#21A1F7"
            };
        }

        public static void ApplyTheme(AppTheme theme)
        {
            _currentTheme = theme;
            SaveTheme(theme);

            try
            {
                var appTheme = (theme == AppTheme.Metamorphosis || theme == AppTheme.Catppuccin || theme == AppTheme.RosePine)
                    ? Wpf.Ui.Appearance.ApplicationTheme.Dark
                    : Wpf.Ui.Appearance.ApplicationTheme.Light;

                Wpf.Ui.Appearance.ApplicationThemeManager.Apply(appTheme);

                Color accentColor;
                if (theme == AppTheme.Metamorphosis)
                    accentColor = (Color)ColorConverter.ConvertFromString("#00CFFF");
                else if (theme == AppTheme.Catppuccin)
                    accentColor = (Color)ColorConverter.ConvertFromString("#CBA6F7");
                else if (theme == AppTheme.RosePine)
                    accentColor = (Color)ColorConverter.ConvertFromString("#EBBCBA");
                else if (theme == AppTheme.Nord)
                    accentColor = (Color)ColorConverter.ConvertFromString("#5E81AC");
                else
                    accentColor = (Color)ColorConverter.ConvertFromString("#FCE53D");

                Wpf.Ui.Appearance.ApplicationAccentColorManager.Apply(accentColor, appTheme);
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[ThemeService] ApplyTheme WpfUI: " + ex.Message); }

            SwapResourceDictionary(theme);

            if (ThemeChanged != null)
                ThemeChanged(theme);
        }

        private static ThemeColors GetMetamorphosisColors()
        {
            return new ThemeColors
            {
                IsLight = false,
                FontFamily = "Segoe UI Variable Text, Segoe UI Variable Display, Segoe UI, sans-serif",

                TitleBarForeground = "#F1F5F9",

                HeaderBg     = "#08122E",
                HeaderBorder = "#1E2D5A",
                MainFrameBg  = "#080D1F",

                SidebarBg     = "#0C1535",
                SidebarBorder = "#1B2B56",

                SearchBg          = "#14203A",
                SearchBorder      = "#2A3F6A",
                SearchText        = "#F1F5F9",
                SearchPlaceholder = "#64748B",

                ActiveNavBg      = "#1400CFFF",
                ActiveNavText    = "#00CFFF",
                ActiveNavSubtext = "#67E8F9",

                InactiveNavText    = "#94A3B8",
                InactiveNavSubtext = "#64748B",

                FooterBg        = "#0C1535",
                FooterBorder    = "#1B2B56",
                FooterText      = "#94A3B8",
                FooterCardBg    = "#14203A",
                FooterCardBorder= "#2A3F6A",

                UserCardBg     = "#14203A",
                UserCardBorder = "#2A3F6A",
                UserCardTitle  = "#F1F5F9",
                UserCardSub    = "#00CFFF",

                NavIndicatorColor = "#00CFFF",
                NavIconActive     = "#00CFFF",
                NavIconInactive   = "#64748B",

                SpectrumBarColor  = "#00CFFF"
            };
        }

        private static ThemeColors GetCatppuccinColors()
        {
            return new ThemeColors
            {
                IsLight = false,
                FontFamily = "Segoe UI Variable Text, Segoe UI Variable Display, Segoe UI, sans-serif",

                TitleBarForeground = "#CDD6F4",

                HeaderBg     = "#181825",
                HeaderBorder = "#313244",
                MainFrameBg  = "#1E1E2E",

                SidebarBg     = "#181825",
                SidebarBorder = "#313244",

                SearchBg          = "#313244",
                SearchBorder      = "#45475A",
                SearchText        = "#CDD6F4",
                SearchPlaceholder = "#A6ADC8",

                ActiveNavBg      = "#313244",
                ActiveNavText    = "#CBA6F7",
                ActiveNavSubtext = "#B4BEFE",

                InactiveNavText    = "#BAC2DE",
                InactiveNavSubtext = "#A6ADC8",

                FooterBg        = "#181825",
                FooterBorder    = "#313244",
                FooterText      = "#BAC2DE",
                FooterCardBg    = "#313244",
                FooterCardBorder= "#45475A",

                UserCardBg     = "#313244",
                UserCardBorder = "#45475A",
                UserCardTitle  = "#CDD6F4",
                UserCardSub    = "#CBA6F7",

                NavIndicatorColor = "#CBA6F7",
                NavIconActive     = "#CBA6F7",
                NavIconInactive   = "#A6ADC8",

                SpectrumBarColor  = "#CBA6F7"
            };
        }

        private static ThemeColors GetRosePineColors()
        {
            return new ThemeColors
            {
                IsLight = false,
                FontFamily = "Segoe UI Variable Text, Segoe UI Variable Display, Segoe UI, sans-serif",

                TitleBarForeground = "#E0DEF4",

                HeaderBg     = "#191724",
                HeaderBorder = "#26233A",
                MainFrameBg  = "#191724",

                SidebarBg     = "#191724",
                SidebarBorder = "#26233A",

                SearchBg          = "#1F1D2E",
                SearchBorder      = "#26233A",
                SearchText        = "#E0DEF4",
                SearchPlaceholder = "#908CAA",

                ActiveNavBg      = "#1F1D2E",
                ActiveNavText    = "#EBBCBA",
                ActiveNavSubtext = "#C4A7E7",

                InactiveNavText    = "#E0DEF4",
                InactiveNavSubtext = "#908CAA",

                FooterBg        = "#191724",
                FooterBorder    = "#26233A",
                FooterText      = "#908CAA",
                FooterCardBg    = "#1F1D2E",
                FooterCardBorder= "#26233A",

                UserCardBg     = "#1F1D2E",
                UserCardBorder = "#26233A",
                UserCardTitle  = "#E0DEF4",
                UserCardSub    = "#EBBCBA",

                NavIndicatorColor = "#EBBCBA",
                NavIconActive     = "#EBBCBA",
                NavIconInactive   = "#908CAA",

                SpectrumBarColor  = "#EBBCBA"
            };
        }

        private static ThemeColors GetNordColors()
        {
            return new ThemeColors
            {
                IsLight = true,
                FontFamily = "Segoe UI Variable Text, Segoe UI Variable Display, Segoe UI, sans-serif",

                TitleBarForeground = "#2E3440",

                HeaderBg     = "#E5E9F0",
                HeaderBorder = "#D8DEE9",
                MainFrameBg  = "#ECEFF4",

                SidebarBg     = "#E5E9F0",
                SidebarBorder = "#D8DEE9",

                SearchBg          = "#FFFFFF",
                SearchBorder      = "#D8DEE9",
                SearchText        = "#2E3440",
                SearchPlaceholder = "#4C566A",

                ActiveNavBg      = "#FFFFFF",
                ActiveNavText    = "#5E81AC",
                ActiveNavSubtext = "#81A1C1",

                InactiveNavText    = "#2E3440",
                InactiveNavSubtext = "#4C566A",

                FooterBg        = "#E5E9F0",
                FooterBorder    = "#D8DEE9",
                FooterText      = "#4C566A",
                FooterCardBg    = "#FFFFFF",
                FooterCardBorder= "#D8DEE9",

                UserCardBg     = "#FFFFFF",
                UserCardBorder = "#D8DEE9",
                UserCardTitle  = "#2E3440",
                UserCardSub    = "#5E81AC",

                NavIndicatorColor = "#5E81AC",
                NavIconActive     = "#5E81AC",
                NavIconInactive   = "#4C566A",

            };
        }

        private static void SwapResourceDictionary(AppTheme theme)
        {
            try
            {
                string newSource;
                if (theme == AppTheme.Metamorphosis)
                    newSource = "Styles/MetamorphosisTheme.xaml";
                else if (theme == AppTheme.Catppuccin)
                    newSource = "Styles/CatppuccinTheme.xaml";
                else if (theme == AppTheme.RosePine)
                    newSource = "Styles/RosePineTheme.xaml";
                else if (theme == AppTheme.Nord)
                    newSource = "Styles/NordTheme.xaml";
                else
                    newSource = "Styles/Fluent2Styles.xaml";

                var merged = Application.Current.Resources.MergedDictionaries;

                for (int i = merged.Count - 1; i >= 0; i--)
                {
                    var src = merged[i].Source != null ? merged[i].Source.OriginalString : "";
                    if (src.Contains("Fluent2Styles") || src.Contains("MetamorphosisTheme") || src.Contains("CatppuccinTheme") || src.Contains("RosePineTheme") || src.Contains("NordTheme") || src.Contains("SSDefaultTheme"))
                    {
                        merged.RemoveAt(i);
                        break;
                    }
                }

                var dict = new ResourceDictionary();
                dict.Source = new Uri(newSource, UriKind.Relative);
                merged.Add(dict);
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[ThemeService] SwapResourceDictionary: " + ex.Message); }
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


