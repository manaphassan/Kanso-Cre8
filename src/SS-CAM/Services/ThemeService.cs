using System;

namespace SS_CAM.Services
{
    public enum AppTheme
    {
        Dark,
        Light
    }

    public class ThemeService
    {
        private static AppTheme _currentTheme = AppTheme.Dark;

        public static AppTheme CurrentTheme
        {
            get { return _currentTheme; }
            set
            {
                _currentTheme = value;
                ApplyTheme(_currentTheme);
            }
        }

        public static event Action<AppTheme> ThemeChanged;

        public static void ToggleTheme()
        {
            CurrentTheme = _currentTheme == AppTheme.Dark ? AppTheme.Light : AppTheme.Dark;
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
