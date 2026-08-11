using System;
using System.IO;
using System.Windows;
using Newtonsoft.Json;
using SS_CAM.Utilities;

namespace SS_CAM.Services
{
    public enum AppTheme
    {
        Falconia,        // Clean Fluent 2 Light Mode
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

            return GetFalconiaColors();
        }

        private static ThemeColors GetFalconiaColors()
        {
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

        public static void ApplyTheme(AppTheme theme)
        {
            _currentTheme = theme;
            SaveTheme(theme);

            try
            {
                if (theme == AppTheme.Metamorphosis)
                    Wpf.Ui.Appearance.ApplicationThemeManager.Apply(Wpf.Ui.Appearance.ApplicationTheme.Dark);
                else
                    Wpf.Ui.Appearance.ApplicationThemeManager.Apply(Wpf.Ui.Appearance.ApplicationTheme.Light);
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[ThemeService] ApplyTheme WpfUI: " + ex.Message); }

            SwapResourceDictionary(theme);

            if (ThemeChanged != null)
                ThemeChanged(theme);
        }

        private static void SwapResourceDictionary(AppTheme theme)
        {
            try
            {
                string newSource;
                if (theme == AppTheme.Metamorphosis)
                    newSource = "Styles/MetamorphosisTheme.xaml";
                else
                    newSource = "Styles/Fluent2Styles.xaml";

                var merged = Application.Current.Resources.MergedDictionaries;

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


