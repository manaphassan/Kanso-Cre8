using System;
using System.Collections.Generic;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Shapes;
using System.Windows.Threading;
using Wpf.Ui.Controls;
using SS_CAM.Models;
using SS_CAM.Services;
using SS_CAM.Views;

namespace SS_CAM
{
    public partial class MainWindow : FluentWindow
    {
        private class AnimShapeItem
        {
            public Ellipse Shape { get; set; }
            public double VX { get; set; }
            public double VY { get; set; }
            public double Diameter { get; set; }
        }

        private bool isSidebarExpanded = true;
        private DispatcherTimer headerAnimTimer;
        private List<AnimShapeItem> animItems;
        private UserProfile currentProfile;

        private System.Windows.Controls.Button _lastActiveNavBtn = null;

        public MainWindow()
        {
            InitializeComponent();
            ThemeService.ThemeChanged += OnThemeModeChanged;
            Loaded += OnLoaded;
            Closed += OnClosed;
        }

        private void OnLoaded(object sender, RoutedEventArgs e)
        {
            WindowState = WindowState.Normal;
            Width = 1280;
            Height = 820;
            Activate();

            // 1. Initialize Header Geometric Loop Animation
            InitHeaderAnimation();

            // 2. Play Intro Sound Effect on App Launch
            AudioFeedbackService.PlayIntroSound();

            // 2. Load User Profile
            RefreshProfileUI();

            // 3. Initialize Real-Time Footer Status Bar Timer & NAS Online Check
            InitFooterTimer();
            InitNasHealthCheck();
            InitUpdateCheck();
            InitRadioStatusListeners();

            // 4. Initialize Faded Animated Audio Spectrum Visualizer in Sidebar Background
            InitSidebarSpectrumVisualizer();

            // 5. Apply Theme on Launch (loads saved theme from ThemeService)
            ThemeService.ApplyTheme(ThemeService.CurrentTheme);

            // 6. Navigate to Dashboard on startup
            NavigateTo(typeof(DashboardPage), NavDashboardBtn);
        }

        private void InitRadioStatusListeners()
        {
            var radio = RadioStreamService.Instance;
            radio.PlaybackStateChanged += OnRadioPlaybackStateChanged;
            radio.StationChanged += OnRadioStationChanged;

            UpdateRadioStatusUI();
        }

        private void OnRadioPlaybackStateChanged(RadioPlaybackState state)
        {
            UpdateRadioStatusUI();
        }

        private void OnRadioStationChanged(RadioStation station)
        {
            UpdateRadioStatusUI();
        }

        private void UpdateRadioStatusUI()
        {
            try
            {
                var radio = RadioStreamService.Instance;
                bool isActive = radio.State == RadioPlaybackState.Playing || radio.State == RadioPlaybackState.Buffering;

                // Show radio footer row only when playing or buffering
                if (RadioFooterRow != null)
                    RadioFooterRow.Visibility = isActive ? Visibility.Visible : Visibility.Collapsed;

                if (StatusRadioText != null && StatusRadioPlayIcon != null)
                {
                    string stationName = radio.CurrentStation != null ? radio.CurrentStation.Name : "BFM 89.9";
                    if (radio.State == RadioPlaybackState.Playing)
                    {
                        StatusRadioPlayIcon.Text = "⏸";
                        StatusRadioText.Text = stationName + " ▶ Live";
                        StatusRadioText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#10B981"));
                    }
                    else if (radio.State == RadioPlaybackState.Buffering)
                    {
                        StatusRadioPlayIcon.Text = "⏳";
                        StatusRadioText.Text = "Connecting...";
                        StatusRadioText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F59E0B"));
                    }
                }
            }
            catch { }
        }

        private void OnStatusRadioPlayToggle(object sender, RoutedEventArgs e)
        {
            RadioStreamService.Instance.TogglePlayPause();
            e.Handled = true;
        }

        private void OnFooterRadioClicked(object sender, MouseButtonEventArgs e)
        {
            NavigateTo(typeof(RadioPage), NavRadioBtn);
        }

        private void OnClosed(object sender, EventArgs e)
        {
            if (headerAnimTimer != null)
            {
                headerAnimTimer.Stop();
            }
            if (footerTimer != null)
            {
                footerTimer.Stop();
            }
            if (nasCheckTimer != null)
            {
                nasCheckTimer.Stop();
            }
            if (_spectrumTimer != null)
            {
                _spectrumTimer.Stop();
            }
        }

        public void RefreshProfileUI()
        {
            currentProfile = UserProfileService.LoadProfile();

            // Update sidebar persona name & department
            if (SidebarDesignerName != null)
                SidebarDesignerName.Text = string.IsNullOrWhiteSpace(currentProfile.DesignerName) ? "Brand" : currentProfile.DesignerName;
            if (SidebarDepartment != null)
                SidebarDepartment.Text = string.IsNullOrWhiteSpace(currentProfile.Department) ? "Creative & Brand" : currentProfile.Department;
            // Update initials letter on avatar circle
            if (AvatarEmojiText != null && !string.IsNullOrWhiteSpace(currentProfile.DesignerName))
                AvatarEmojiText.Text = currentProfile.DesignerName.Substring(0, 1).ToUpper();

            if (!string.IsNullOrWhiteSpace(currentProfile.AvatarPath) && File.Exists(currentProfile.AvatarPath))
            {
                try
                {
                    BitmapImage bmp = new BitmapImage();
                    bmp.BeginInit();
                    bmp.UriSource = new Uri(currentProfile.AvatarPath, UriKind.Absolute);
                    bmp.CacheOption = BitmapCacheOption.OnLoad;
                    bmp.EndInit();

                    if (SidebarAvatarImg != null)
                    {
                        SidebarAvatarImg.Source = bmp;
                        SidebarAvatarImg.Visibility = Visibility.Visible;
                    }
                    if (AvatarEmojiText != null) AvatarEmojiText.Visibility = Visibility.Collapsed;
                }
                catch
                {
                    if (SidebarAvatarImg != null) SidebarAvatarImg.Visibility = Visibility.Collapsed;
                    if (AvatarEmojiText != null) AvatarEmojiText.Visibility = Visibility.Visible;
                }
            }
            else
            {
                if (SidebarAvatarImg != null) SidebarAvatarImg.Visibility = Visibility.Collapsed;
                if (AvatarEmojiText != null) AvatarEmojiText.Visibility = Visibility.Visible;
            }
        }

        private List<Rectangle> visBars;
        private List<Ellipse> visGlowDots;
        private double[] visCurrentHeights;
        private int visTickCount = 0;
        private bool wasPlayingLastTick = false;

        private void InitHeaderAnimation()
        {
            animItems = new List<AnimShapeItem>();
            visBars = new List<Rectangle>();
            visGlowDots = new List<Ellipse>();
            visCurrentHeights = new double[48];

            var shapeData = new[]
            {
                new { X = 60.0, Y = 10.0, VX = 0.45, VY = 0.20, D = 72.0, O = 0.09 },
                new { X = 210.0, Y = -18.0, VX = -0.28, VY = 0.28, D = 44.0, O = 0.07 },
                new { X = 390.0, Y = 28.0, VX = 0.22, VY = -0.18, D = 90.0, O = 0.06 },
                new { X = 540.0, Y = 5.0, VX = -0.32, VY = 0.22, D = 56.0, O = 0.08 },
                new { X = 720.0, Y = 32.0, VX = 0.28, VY = -0.22, D = 38.0, O = 0.07 },
                new { X = 860.0, Y = -8.0, VX = -0.20, VY = 0.25, D = 78.0, O = 0.055 },
                new { X = 1000.0, Y = 22.0, VX = 0.36, VY = -0.14, D = 50.0, O = 0.08 },
                new { X = 1120.0, Y = 12.0, VX = -0.24, VY = 0.17, D = 64.0, O = 0.06 }
            };

            foreach (var d in shapeData)
            {
                Ellipse e = new Ellipse
                {
                    Width = d.D,
                    Height = d.D,
                    Stroke = Brushes.White,
                    StrokeThickness = 1.4,
                    Opacity = d.O,
                    Fill = Brushes.Transparent
                };
                Canvas.SetLeft(e, d.X);
                Canvas.SetTop(e, d.Y);
                HeaderCanvas.Children.Add(e);

                animItems.Add(new AnimShapeItem
                {
                    Shape = e,
                    VX = d.VX,
                    VY = d.VY,
                    Diameter = d.D
                });
            }

            // Create 48 Audio Visual Synthesizer Spectrum Bars across bottom of HeaderCanvas
            int barCount = 48;
            string[] ncsColors = new[] { "#21A1F7", "#3B82F6", "#EC4899", "#8B5CF6", "#06B6D4" };

            for (int i = 0; i < barCount; i++)
            {
                string colorHex = ncsColors[i % ncsColors.Length];
                Rectangle bar = new Rectangle
                {
                    Width = 3.5,
                    Height = 2,
                    RadiusX = 1.75,
                    RadiusY = 1.75,
                    Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString(colorHex)),
                    Opacity = 0.0
                };
                HeaderCanvas.Children.Add(bar);
                visBars.Add(bar);

                // Top Radiant Glow Dot for Visual Synthesizer Tip
                Ellipse dot = new Ellipse
                {
                    Width = 4,
                    Height = 4,
                    Fill = Brushes.White,
                    Opacity = 0.0
                };
                HeaderCanvas.Children.Add(dot);
                visGlowDots.Add(dot);
            }

            headerAnimTimer = new DispatcherTimer();
            headerAnimTimer.Interval = TimeSpan.FromMilliseconds(33);
            headerAnimTimer.Tick += (s, ev) =>
            {
                visTickCount++;
                double cw = HeaderCanvas.ActualWidth;
                double ch = HeaderCanvas.ActualHeight;
                if (cw <= 0 || ch <= 0) return;

                bool isPlaying = RadioStreamService.Instance.State == RadioPlaybackState.Playing;

                // Dynamic header state tracking (sidebar background can be updated here in future)
                if (isPlaying != wasPlayingLastTick)
                {
                    wasPlayingLastTick = isPlaying;
                    if (HeaderSubtitle != null) HeaderSubtitle.Visibility = Visibility.Collapsed;
                }

                // Ambient floating circles
                foreach (var item in animItems)
                {
                    double x = Canvas.GetLeft(item.Shape) + item.VX;
                    double y = Canvas.GetTop(item.Shape) + item.VY;
                    double d = item.Diameter;

                    if (x > cw) x = -d;
                    else if (x < -d) x = cw;

                    if (y > ch) y = -d;
                    else if (y < -d) y = ch;

                    Canvas.SetLeft(item.Shape, x);
                    Canvas.SetTop(item.Shape, y);
                    item.Shape.Opacity = isPlaying ? 0.03 : 0.08;
                }

                // Fluid Visual Synthesizer Bar & Radiant Glow Tip Animation Engine
                double barSpacing = cw / barCount;

                for (int i = 0; i < visBars.Count; i++)
                {
                    Rectangle bar = visBars[i];
                    Ellipse dot = visGlowDots[i];
                    double targetHeight = 2;

                    if (isPlaying)
                    {
                        // Multi-Harmonic Synthesizer Spectrum Math (Bass Sub-pulse + Mid Frequency + Treble Shimmer)
                        double bass = Math.Sin(visTickCount * 0.18 + i * 0.12) * 0.45;
                        double mid = Math.Cos(visTickCount * 0.28 - i * 0.32) * 0.35;
                        double treble = Math.Sin(visTickCount * 0.45 + i * 0.65) * 0.20;
                        double bellEnvelope = Math.Sin((double)i / barCount * Math.PI);

                        double rawVal = Math.Abs(bass + mid + treble) * (0.35 + 0.65 * bellEnvelope);
                        targetHeight = Math.Min(34.0, Math.Max(3.0, 4.0 + 30.0 * rawVal));

                        bar.Opacity = 0.85;
                        dot.Opacity = 0.95;
                    }
                    else
                    {
                        targetHeight = 0;
                        bar.Opacity = 0.0;
                        dot.Opacity = 0.0;
                    }

                    // Damped Spring Smooth Interpolation (Prevents freezing & jitter)
                    visCurrentHeights[i] = visCurrentHeights[i] * 0.75 + targetHeight * 0.25;

                    bar.Height = visCurrentHeights[i];
                    double xPos = i * barSpacing + 3;
                    double yPos = ch - visCurrentHeights[i] - 1;

                    Canvas.SetLeft(bar, xPos);
                    Canvas.SetTop(bar, yPos);

                    Canvas.SetLeft(dot, xPos - 0.25);
                    Canvas.SetTop(dot, Math.Max(0, yPos - 4));
                }
            };
            headerAnimTimer.Start();
        }


        private void OnToggleSidebarClicked(object sender, RoutedEventArgs e)
        {
            isSidebarExpanded = !isSidebarExpanded;
            // Fluent 2 nav: expanded = 240px, collapsed = 48px (icon-only navigation rail)
            SidebarColumn.Width = isSidebarExpanded ? new GridLength(240) : new GridLength(48);

            Visibility labelVis = isSidebarExpanded ? Visibility.Visible : Visibility.Collapsed;

            // Hide/show search bar container (prevents squishing search box / clipped search icon!)
            if (SearchBoxBorder != null) SearchBoxBorder.Visibility = labelVis;

            // Hide/show section header, title panel, profile text
            if (SidebarModulesHeader != null) SidebarModulesHeader.Visibility = labelVis;
            if (AppTitlePanel != null) AppTitlePanel.Visibility = labelVis;
            if (SidebarUserText != null) SidebarUserText.Visibility = labelVis;

            // Hide/show status row text
            if (StatusNasText != null) StatusNasText.Visibility = labelVis;
            if (StatusTimerText != null) StatusTimerText.Visibility = labelVis;
            if (StatusRadioText != null) StatusRadioText.Visibility = labelVis;
            if (StatusThemeText != null) StatusThemeText.Visibility = labelVis;

            // Align status icons (centered when collapsed, left when expanded)
            Thickness iconMargin = isSidebarExpanded ? new Thickness(0, 0, 10, 0) : new Thickness(0);
            HorizontalAlignment iconAlign = isSidebarExpanded ? HorizontalAlignment.Left : HorizontalAlignment.Center;

            if (StatusNasDot != null) { StatusNasDot.Margin = iconMargin; StatusNasDot.HorizontalAlignment = iconAlign; }
            if (StatusTimerIcon != null) { StatusTimerIcon.Margin = iconMargin; StatusTimerIcon.HorizontalAlignment = iconAlign; }
            if (StatusRadioIcon != null) { StatusRadioIcon.Margin = iconMargin; StatusRadioIcon.HorizontalAlignment = iconAlign; }
            if (StatusThemeIcon != null) { StatusThemeIcon.Margin = iconMargin; StatusThemeIcon.HorizontalAlignment = iconAlign; }

            // Align user avatar circle
            if (SidebarAvatarCircle != null)
            {
                SidebarAvatarCircle.Margin = isSidebarExpanded ? new Thickness(0, 0, 10, 0) : new Thickness(0);
                SidebarAvatarCircle.HorizontalAlignment = iconAlign;
            }
            if (SidebarUserCard != null)
            {
                SidebarUserCard.Padding = isSidebarExpanded ? new Thickness(8, 8, 8, 8) : new Thickness(6, 6, 6, 6);
            }

            // Update all Nav Items (center icon when collapsed, restore margins when expanded)
            System.Windows.Controls.Button[] navBtns = new[]
            {
                NavDashboardBtn, NavWellbeingBtn, NavProjectsBtn,
                NavSearchBtn, NavBrandAssetsBtn, NavRadioBtn, NavWorkstationHealthBtn
            };

            foreach (var btn in navBtns)
            {
                if (btn == null) continue;
                var grid = btn.Content as Grid;
                if (grid == null) continue;

                foreach (var child in grid.Children)
                {
                    var sp = child as StackPanel;
                    if (sp != null)
                    {
                        sp.Margin = isSidebarExpanded ? new Thickness(12, 0, 8, 0) : new Thickness(0);
                        sp.HorizontalAlignment = isSidebarExpanded ? HorizontalAlignment.Left : HorizontalAlignment.Center;

                        if (sp.Children.Count > 0)
                        {
                            var icon = sp.Children[0] as System.Windows.Controls.TextBlock;
                            if (icon != null)
                            {
                                icon.Margin = isSidebarExpanded ? new Thickness(0, 0, 12, 0) : new Thickness(0);
                                icon.HorizontalAlignment = isSidebarExpanded ? HorizontalAlignment.Left : HorizontalAlignment.Center;
                                icon.Width = isSidebarExpanded ? 20 : double.NaN;
                            }
                        }
                        if (sp.Children.Count > 1)
                        {
                            var label = sp.Children[1] as System.Windows.Controls.TextBlock;
                            if (label != null)
                            {
                                label.Visibility = labelVis;
                            }
                        }
                    }
                }
            }

            // Update spectrum canvas width
            if (SidebarSpectrumCanvas != null)
            {
                SidebarSpectrumCanvas.Width = isSidebarExpanded ? 240 : 48;
            }
        }

        private void OnTopSearchInputChanged(object sender, TextChangedEventArgs e)
        {
            if (TopGlobalSearchInput != null && !string.IsNullOrWhiteSpace(TopGlobalSearchInput.Text))
            {
                if (MainFrame.Content == null || !(MainFrame.Content is SearchCopyPage))
                {
                    NavigateTo(typeof(SearchCopyPage), NavSearchBtn);
                }
            }
        }

        private void OnNavBackClicked(object sender, RoutedEventArgs e)
        {
            if (MainFrame != null && MainFrame.CanGoBack)
            {
                MainFrame.GoBack();
            }
        }

        private void OnNavForwardClicked(object sender, RoutedEventArgs e)
        {
            if (MainFrame != null && MainFrame.CanGoForward)
            {
                MainFrame.GoForward();
            }
        }

        private void OnNavDashboardClicked(object sender, RoutedEventArgs e)
        {
            NavigateTo(typeof(DashboardPage), NavDashboardBtn);
        }

        private void OnNavWellbeingClicked(object sender, RoutedEventArgs e)
        {
            NavigateTo(typeof(WellbeingPage), NavWellbeingBtn);
        }

        private void OnNavProjectsClicked(object sender, RoutedEventArgs e)
        {
            NavigateTo(typeof(ProjectCreatorPage), NavProjectsBtn);
        }

        private void OnNavSearchClicked(object sender, RoutedEventArgs e)
        {
            NavigateTo(typeof(SearchCopyPage), NavSearchBtn);
        }

        private void OnNavBrandAssetsClicked(object sender, RoutedEventArgs e)
        {
            NavigateTo(typeof(BrandAssetsPage), NavBrandAssetsBtn);
        }

        private void OnNavRadioClicked(object sender, RoutedEventArgs e)
        {
            NavigateTo(typeof(RadioPage), NavRadioBtn);
        }

        private void OnNavWorkstationHealthClicked(object sender, RoutedEventArgs e)
        {
            NavigateTo(typeof(WorkstationHealthPage), NavWorkstationHealthBtn);
        }

        private void OnNavSettingsClicked(object sender, RoutedEventArgs e)
        {
            NavigateTo(typeof(SettingsPage), null);
        }

        private void OnNavProfileClicked(object sender, MouseButtonEventArgs e)
        {
            NavigateTo(typeof(SettingsPage), null);
        }

        private void OnOpenGithub(object sender, MouseButtonEventArgs e)
        {
            try
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "https://github.com/SuamiSihat/ss_cam",
                    UseShellExecute = true
                });
            }
            catch { }
        }

        private void OnOpenAboutWindow(object sender, MouseButtonEventArgs e)
        {
            try
            {
                AboutWindow about = new AboutWindow();
                about.Owner = this;
                about.ShowDialog();
            }
            catch { }
        }

        private void OnStatusThemeToggle(object sender, RoutedEventArgs e)
        {
            // Cycle: SS Default ↔ Falconia
            AppTheme nextTheme = (ThemeService.CurrentTheme == AppTheme.SSDefault)
                ? AppTheme.Falconia
                : AppTheme.SSDefault;
            ThemeService.ApplyTheme(nextTheme);
        }

        private void OnThemeModeChanged(AppTheme theme)
        {
            ThemeColors c = ThemeService.GetColors(theme);

            if (!string.IsNullOrEmpty(c.FontFamily))
                FontFamily = new System.Windows.Media.FontFamily(c.FontFamily);

            if (theme == AppTheme.Falconia)
            {
                // Falconia: full white Fluent 2 light — use Mica (system light backdrop)
                WindowBackdropType = WindowBackdropType.Mica;
                Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));
            }
            else
            {
                // SS Default: dark navy brand theme
                WindowBackdropType = WindowBackdropType.Mica;
                Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#02153D"));
            }

            // Window TitleBar Text / Foreground
            if (AppTitleBar != null)
            {
                AppTitleBar.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.TitleBarForeground));
            }

            // Top Header & Hamburger
            if (ToggleSidebarIcon != null) ToggleSidebarIcon.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.InactiveNavText));
            if (SidebarAppTitleText != null) SidebarAppTitleText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.InactiveNavText));

            // Search Box
            if (SearchBoxBorder != null)
            {
                SearchBoxBorder.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.SearchBg));
                SearchBoxBorder.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.SearchBorder));
            }
            if (SearchBoxIcon != null) SearchBoxIcon.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.SearchPlaceholder));
            if (TopGlobalSearchInput != null) TopGlobalSearchInput.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.SearchText));

            // Section Header & Dividers
            if (SidebarModulesHeader != null) SidebarModulesHeader.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.InactiveNavSubtext));
            if (SidebarDivider1 != null) SidebarDivider1.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.SidebarBorder));

            if (StatusThemeText != null)
            {
                StatusThemeText.Text = (theme == AppTheme.Falconia)
                    ? "Theme: Falconia"
                    : "Theme: SS Default";
            }

            // Sidebar Container
            if (SidebarBorder != null)
            {
                SidebarBorder.Background  = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.SidebarBg));
                SidebarBorder.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.SidebarBorder));
            }

            // Status Row Text & Icons
            if (StatusNasText != null) StatusNasText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.FooterText));
            if (StatusTimerIcon != null) StatusTimerIcon.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.NavIconInactive));
            if (StatusTimerText != null) StatusTimerText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.FooterText));
            if (StatusRadioIcon != null) StatusRadioIcon.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.NavIconInactive));
            if (StatusRadioText != null) StatusRadioText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.FooterText));
            if (StatusThemeIcon != null) StatusThemeIcon.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.NavIconInactive));
            if (StatusThemeText != null) StatusThemeText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.FooterText));

            // User Profile Persona Card
            if (SidebarUserCard != null)
            {
                SidebarUserCard.Background  = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.UserCardBg));
                SidebarUserCard.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.UserCardBorder));
            }
            if (SidebarDesignerName != null) SidebarDesignerName.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.UserCardTitle));
            if (SidebarDepartment != null) SidebarDepartment.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.UserCardSub));

            // Main Content Frame
            if (MainFrame != null)
                MainFrame.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.MainFrameBg));

            // Re-apply Spectrum Visualizer Bar Colors
            if (_spectrumBars != null && _spectrumBars.Count > 0)
            {
                Color baseColor = (Color)ColorConverter.ConvertFromString(c.SpectrumBarColor);
                byte alpha = c.IsLight ? (byte)60 : (byte)45;
                Brush barBrush = new SolidColorBrush(Color.FromArgb(alpha, baseColor.R, baseColor.G, baseColor.B));
                Brush dotBrush = new SolidColorBrush(Color.FromArgb(140, baseColor.R, baseColor.G, baseColor.B));

                foreach (var bar in _spectrumBars) bar.Fill = barBrush;
                foreach (var dot in _spectrumPeakDots) dot.Fill = dotBrush;
            }

            // Re-apply Nav Highlights
            ResetNavHighlight();
            if (_lastActiveNavBtn != null)
            {
                _lastActiveNavBtn.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.ActiveNavBg));
                SetNavItemColors(_lastActiveNavBtn, c.NavIconActive, c.ActiveNavText, c.NavIndicatorColor, true);
            }
        }

        private readonly Dictionary<Type, Page> _pageCache = new Dictionary<Type, Page>();

        public void NavigateTo(Type pageType, System.Windows.Controls.Button activeBtn)
        {
            _lastActiveNavBtn = activeBtn;
            Page instance = null;
            if (!_pageCache.TryGetValue(pageType, out instance))
            {
                instance = Activator.CreateInstance(pageType) as Page;
                _pageCache[pageType] = instance;
            }

            MainFrame.Navigate(instance);
            ResetNavHighlight();
            if (activeBtn != null)
            {
                ThemeColors tc = ThemeService.GetColors(ThemeService.CurrentTheme);
                activeBtn.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(tc.ActiveNavBg));
                SetNavItemColors(activeBtn, tc.NavIconActive, tc.ActiveNavText, tc.NavIndicatorColor, true);
            }
        }

        private void ResetNavHighlight()
        {
            ThemeColors tc = ThemeService.GetColors(ThemeService.CurrentTheme);
            System.Windows.Controls.Button[] navBtns = new[] { NavDashboardBtn, NavWellbeingBtn, NavProjectsBtn, NavSearchBtn, NavBrandAssetsBtn, NavRadioBtn, NavWorkstationHealthBtn };
            foreach (System.Windows.Controls.Button btn in navBtns)
            {
                if (btn != null)
                {
                    btn.Background = Brushes.Transparent;
                    SetNavItemColors(btn, tc.NavIconInactive, tc.InactiveNavText, tc.NavIndicatorColor, false);
                }
            }
        }

        private static readonly Dictionary<System.Windows.Controls.Button, string> _indicatorNames = new Dictionary<System.Windows.Controls.Button, string>();

        private void SetNavItemColors(System.Windows.Controls.Button btn, string iconColorHex, string textColorHex, string indicatorColorHex, bool isIndicatorVisible)
        {
            if (btn == null) return;
            var grid = btn.Content as System.Windows.Controls.Grid;
            if (grid == null) return;

            foreach (var child in grid.Children)
            {
                var rect = child as System.Windows.Shapes.Rectangle;
                if (rect != null)
                {
                    rect.Visibility = isIndicatorVisible ? Visibility.Visible : Visibility.Collapsed;
                    if (!string.IsNullOrEmpty(indicatorColorHex))
                        rect.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString(indicatorColorHex));
                }

                var sp = child as System.Windows.Controls.StackPanel;
                if (sp != null)
                {
                    if (sp.Children.Count > 0)
                    {
                        var icon = sp.Children[0] as System.Windows.Controls.TextBlock;
                        if (icon != null)
                            icon.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(iconColorHex));
                    }
                    if (sp.Children.Count > 1)
                    {
                        var label = sp.Children[1] as System.Windows.Controls.TextBlock;
                        if (label != null)
                            label.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(textColorHex));
                    }
                }
            }
        }

        private void SetButtonTextColors(System.Windows.Controls.Button btn, string mainColorHex, string subColorHex)
        {
            if (btn == null) return;
            StackPanel sp = btn.Content as StackPanel;
            if (sp == null) return;

            foreach (var child in sp.Children)
            {
                StackPanel textSp = child as StackPanel;
                if (textSp != null)
                {
                    if (textSp.Children.Count > 0 && textSp.Children[0] is System.Windows.Controls.TextBlock)
                    {
                        System.Windows.Controls.TextBlock tbMain = textSp.Children[0] as System.Windows.Controls.TextBlock;
                        if (tbMain != null)
                        {
                            tbMain.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(mainColorHex));
                        }
                    }
                    if (textSp.Children.Count > 1 && textSp.Children[1] is System.Windows.Controls.TextBlock)
                    {
                        System.Windows.Controls.TextBlock tbSub = textSp.Children[1] as System.Windows.Controls.TextBlock;
                        if (tbSub != null)
                        {
                            tbSub.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(subColorHex));
                        }
                    }
                }
            }
        }

        private DispatcherTimer footerTimer;

        // ─────────────────────────────────────────────────────────────────
        // REAL-TIME FADED AUDIO SPECTRUM VISUALIZER (SIDEBAR BACKGROUND)
        // ─────────────────────────────────────────────────────────────────
        private DispatcherTimer _spectrumTimer;
        private readonly List<Rectangle> _spectrumBars = new List<Rectangle>();
        private readonly List<Ellipse> _spectrumPeakDots = new List<Ellipse>();
        private readonly double[] _spectrumCurrentHeights = new double[24];
        private readonly double[] _spectrumPeakY = new double[24];
        private readonly double[] _spectrumPeakVel = new double[24];

        private void InitSidebarSpectrumVisualizer()
        {
            if (SidebarSpectrumCanvas == null) return;
            SidebarSpectrumCanvas.Children.Clear();
            _spectrumBars.Clear();
            _spectrumPeakDots.Clear();

            int numBars = 24;
            double canvasWidth = 240.0;
            double canvasHeight = 240.0;
            double barGap = 3.0;
            double totalGapWidth = barGap * (numBars + 1);
            double barWidth = (canvasWidth - totalGapWidth) / numBars;

            ThemeColors c = ThemeService.GetColors(ThemeService.CurrentTheme);
            Color baseColor = (Color)ColorConverter.ConvertFromString(c.SpectrumBarColor);
            byte alpha = c.IsLight ? (byte)60 : (byte)45;
            Brush barBrush = new SolidColorBrush(Color.FromArgb(alpha, baseColor.R, baseColor.G, baseColor.B));
            Brush dotBrush = new SolidColorBrush(Color.FromArgb(140, baseColor.R, baseColor.G, baseColor.B));

            for (int i = 0; i < numBars; i++)
            {
                double xPos = barGap + i * (barWidth + barGap);

                // Vertical Bar
                Rectangle bar = new Rectangle
                {
                    Width = barWidth,
                    Height = 0,
                    RadiusX = 2,
                    RadiusY = 2,
                    Fill = barBrush,
                    RenderTransformOrigin = new Point(0.5, 1.0)
                };
                Canvas.SetLeft(bar, xPos);
                Canvas.SetBottom(bar, 0);
                SidebarSpectrumCanvas.Children.Add(bar);
                _spectrumBars.Add(bar);

                // Peak Cap Dot
                Ellipse dot = new Ellipse
                {
                    Width = barWidth,
                    Height = 2.5,
                    Fill = dotBrush,
                    Visibility = Visibility.Collapsed
                };
                Canvas.SetLeft(dot, xPos);
                Canvas.SetBottom(dot, 0);
                SidebarSpectrumCanvas.Children.Add(dot);
                _spectrumPeakDots.Add(dot);

                _spectrumCurrentHeights[i] = 0;
                _spectrumPeakY[i] = 0;
                _spectrumPeakVel[i] = 0;
            }

            _spectrumTimer = new DispatcherTimer();
            _spectrumTimer.Interval = TimeSpan.FromMilliseconds(33); // ~30 FPS
            _spectrumTimer.Tick += OnSpectrumTick;
            _spectrumTimer.Start();
        }

        private void OnSpectrumTick(object sender, EventArgs e)
        {
            if (SidebarSpectrumCanvas == null) return;

            var radio = RadioStreamService.Instance;
            bool isPlaying = (radio.State == RadioPlaybackState.Playing || radio.State == RadioPlaybackState.Buffering);

            // Target canvas opacity: smoothly fade in when playing, fade out when stopped
            double targetCanvasOpacity = isPlaying ? 0.35 : 0.0;
            SidebarSpectrumCanvas.Opacity += (targetCanvasOpacity - SidebarSpectrumCanvas.Opacity) * 0.15;

            if (SidebarSpectrumCanvas.Opacity < 0.005 && !isPlaying)
            {
                // Idle when not playing
                return;
            }

            double[] liveBands = radio.LocalProxy != null ? radio.LocalProxy.CurrentSpectrumData : null;
            double peakAmp = radio.LocalProxy != null ? radio.LocalProxy.CurrentPeakAmplitude : 0.0;

            int numBars = _spectrumBars.Count;
            double maxHeight = SidebarSpectrumCanvas.ActualHeight > 0 ? SidebarSpectrumCanvas.ActualHeight : 240.0;

            Random rnd = null;

            for (int i = 0; i < numBars; i++)
            {
                double targetH = 0;

                if (isPlaying)
                {
                    if (liveBands != null && liveBands.Length >= 48)
                    {
                        // Map 48 frequency bands to 24 display bars
                        int bandIndex = i * 2;
                        double val1 = liveBands[bandIndex];
                        double val2 = (bandIndex + 1 < 48) ? liveBands[bandIndex + 1] : val1;
                        double rawVal = (val1 + val2) * 0.5;

                        // Frequency weighting: curve mid and bass frequencies
                        double frequencyMultiplier = 1.0 + Math.Sin((i / (double)numBars) * Math.PI) * 0.4;
                        targetH = rawVal * maxHeight * 0.85 * frequencyMultiplier;
                    }
                    else
                    {
                        // Fallback wave equalizing animation
                        if (rnd == null) rnd = new Random();
                        targetH = (0.15 + rnd.NextDouble() * 0.70) * maxHeight * (peakAmp > 0 ? peakAmp : 0.5);
                    }
                }

                // Smooth exponential lerp
                _spectrumCurrentHeights[i] += (targetH - _spectrumCurrentHeights[i]) * 0.30;
                double h = Math.Max(0, _spectrumCurrentHeights[i]);

                Rectangle bar = _spectrumBars[i];
                bar.Height = h;

                // Update Peak Cap Dot with gravity drop-off
                Ellipse dot = _spectrumPeakDots[i];
                if (h > _spectrumPeakY[i])
                {
                    _spectrumPeakY[i] = h + 3;
                    _spectrumPeakVel[i] = 0;
                }
                else
                {
                    _spectrumPeakVel[i] += 0.4; // Gravity acceleration
                    _spectrumPeakY[i] -= _spectrumPeakVel[i];
                    if (_spectrumPeakY[i] < h) _spectrumPeakY[i] = h;
                }

                if (_spectrumPeakY[i] > 2)
                {
                    dot.Visibility = Visibility.Visible;
                    Canvas.SetBottom(dot, Math.Max(0, _spectrumPeakY[i]));
                }
                else
                {
                    dot.Visibility = Visibility.Collapsed;
                }
            }
        }

        private void InitFooterTimer()
        {
            footerTimer = new DispatcherTimer();
            footerTimer.Interval = TimeSpan.FromSeconds(1);
            footerTimer.Tick += UpdateFooterTimerUI;
            footerTimer.Start();
            UpdateFooterTimerUI(null, null);
        }

        private void UpdateFooterTimerUI(object sender, EventArgs e)
        {
            try
            {
                var timer = WellbeingTimerService.SharedInstance;
                if (timer == null || StatusTimerText == null) return;

                if (timer.State == WellbeingTimerService.TimerState.Running)
                {
                    int totalSecs = timer.GetLiveRemainingSeconds();
                    int mins = totalSecs / 60;
                    int secs = totalSecs % 60;
                    StatusTimerText.Text = string.Format("{0} · {1:D2}:{2:D2} remaining", timer.SessionType, mins, secs);
                    // #C8D9FF on #02153D = 5.8:1 ✅ WCAG AA (was #043388 = 1.1:1 ❌ invisible)
                    StatusTimerText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#C8D9FF"));
                }
                else if (timer.State == WellbeingTimerService.TimerState.Paused)
                {
                    int totalSecs = timer.GetLiveRemainingSeconds();
                    int mins = totalSecs / 60;
                    int secs = totalSecs % 60;
                    StatusTimerText.Text = string.Format("Paused: {0} · {1:D2}:{2:D2}", timer.SessionType, mins, secs);
                    StatusTimerText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F59E0B"));
                }
                else if (timer.State == WellbeingTimerService.TimerState.Completed)
                {
                    StatusTimerText.Text = "🎉 Session Completed!";
                    StatusTimerText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#10B981"));
                }
                else
                {
                    StatusTimerText.Text = "Focus Timer: Ready";
                    // #9DB8D2 on #02153D = 4.6:1 ✅ WCAG AA (was #475569 = 2.4:1 ❌)
                    StatusTimerText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#9DB8D2"));
                }
            }
            catch { }
        }

        private void OnFooterTimerClicked(object sender, MouseButtonEventArgs e)
        {
            NavigateTo(typeof(WellbeingPage), NavWellbeingBtn);
        }

        private DispatcherTimer nasCheckTimer;

        private void InitNasHealthCheck()
        {
            nasCheckTimer = new DispatcherTimer();
            nasCheckTimer.Interval = TimeSpan.FromSeconds(30);
            nasCheckTimer.Tick += (s, e) => TriggerNasHealthCheck();
            nasCheckTimer.Start();
            TriggerNasHealthCheck();
        }

        private void TriggerNasHealthCheck()
        {
            if (StatusNasText != null)
            {
                StatusNasText.Text = "SSNAS Checking...";
                StatusNasText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#64748B"));
            }

            CheckNasOnlineAsync((isOnline, statusText) =>
            {
                if (StatusNasDot != null && StatusNasText != null)
                {
                    StatusNasDot.Text = isOnline ? "🟢 " : "🔴 ";
                    StatusNasText.Text = statusText;
                    StatusNasText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(isOnline ? "#10B981" : "#EF4444"));
                }
            });
        }

        private void CheckNasOnlineAsync(Action<bool, string> callback)
        {
            System.Threading.ThreadPool.QueueUserWorkItem(state =>
            {
                bool isOnline = false;
                try
                {
                    System.Net.ServicePointManager.ServerCertificateValidationCallback = (sender, cert, chain, sslPolicyErrors) => true;

                    System.Net.HttpWebRequest request = (System.Net.HttpWebRequest)System.Net.WebRequest.Create("https://suamisihat.myds.me");
                    request.Timeout = 4000;
                    request.ReadWriteTimeout = 4000;
                    request.Method = "HEAD";

                    using (System.Net.HttpWebResponse response = (System.Net.HttpWebResponse)request.GetResponse())
                    {
                        isOnline = (response.StatusCode == System.Net.HttpStatusCode.OK ||
                                    response.StatusCode == System.Net.HttpStatusCode.Moved ||
                                    response.StatusCode == System.Net.HttpStatusCode.Redirect ||
                                    response.StatusCode == System.Net.HttpStatusCode.Unauthorized ||
                                    response.StatusCode == System.Net.HttpStatusCode.Forbidden);
                    }
                }
                catch (System.Net.WebException ex)
                {
                    if (ex.Response != null)
                    {
                        isOnline = true;
                    }
                    else
                    {
                        isOnline = false;
                    }
                }
                catch
                {
                    isOnline = false;
                }

                string statusText = isOnline ? "SSNAS Online" : "SSNAS Offline";

                if (Application.Current != null)
                {
                    Application.Current.Dispatcher.BeginInvoke(new Action(() =>
                    {
                        if (callback != null)
                        {
                            callback(isOnline, statusText);
                        }
                    }));
                }
            });
        }

        private void OnCheckNasStatusClicked(object sender, MouseButtonEventArgs e)
        {
            TriggerNasHealthCheck();
        }

        // ─── Auto-Update Check ────────────────────────────────────────────
        // Hosts a version.json at: https://suamisihat.myds.me/ss-cam/version.json
        // Format:
        // {
        //   "version": "2.1.0",
        //   "releaseNotes": "Radio & Focus Stream Player.",
        //   "downloadUrl": "https://suamisihat.myds.me/ss-cam/SS-CAM-v2.1.0.exe"
        // }

        private const string CurrentVersion = "2.1.0";
        private const string VersionCheckUrl = "https://suamisihat.myds.me/ss-cam/version.json";
        private string _updateDownloadUrl = "";

        private void InitUpdateCheck()
        {
            System.Threading.ThreadPool.QueueUserWorkItem(state =>
            {
                System.Threading.Thread.Sleep(3000); // slight delay so app loads first
                CheckForUpdate();
            });
        }

        private void CheckForUpdate()
        {
            try
            {
                System.Net.ServicePointManager.ServerCertificateValidationCallback = (s, c, ch, e) => true;
                System.Net.HttpWebRequest req = (System.Net.HttpWebRequest)System.Net.WebRequest.Create(VersionCheckUrl);
                req.Timeout = 5000;
                req.Method = "GET";
                req.Accept = "application/json";

                using (System.Net.HttpWebResponse resp = (System.Net.HttpWebResponse)req.GetResponse())
                using (System.IO.StreamReader reader = new System.IO.StreamReader(resp.GetResponseStream()))
                {
                    string json = reader.ReadToEnd();
                    string latestVersion = ExtractJsonString(json, "version");
                    string releaseNotes = ExtractJsonString(json, "releaseNotes");
                    string downloadUrl = ExtractJsonString(json, "downloadUrl");

                    if (!string.IsNullOrWhiteSpace(latestVersion) && IsNewerVersion(latestVersion, CurrentVersion))
                    {
                        _updateDownloadUrl = downloadUrl;
                        string notes = string.IsNullOrWhiteSpace(releaseNotes) ? "" : " – " + releaseNotes;
                        string msg = string.Format("SS-CAM v{0} is available{1}", latestVersion, notes);

                        if (Application.Current != null)
                        {
                            Application.Current.Dispatcher.BeginInvoke(new Action(() =>
                            {
                                ShowUpdateBanner(msg);
                            }));
                        }
                    }
                }
            }
            catch { /* silent – no connection or NAS offline, skip update check */ }
        }

        private void ShowUpdateBanner(string message)
        {
            if (UpdateBanner != null && UpdateBannerText != null)
            {
                UpdateBannerText.Text = message;
                UpdateBanner.Visibility = Visibility.Visible;
            }
        }

        private void OnDownloadUpdateClicked(object sender, RoutedEventArgs e)
        {
            if (!string.IsNullOrEmpty(_updateDownloadUrl))
            {
                try
                {
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = _updateDownloadUrl,
                        UseShellExecute = true
                    });
                }
                catch { }
            }
        }

        private void OnDismissUpdateBanner(object sender, RoutedEventArgs e)
        {
            if (UpdateBanner != null)
            {
                UpdateBanner.Visibility = Visibility.Collapsed;
            }
        }

        private bool IsNewerVersion(string latest, string current)
        {
            try
            {
                Version vLatest = new Version(latest);
                Version vCurrent = new Version(current);
                return vLatest.CompareTo(vCurrent) > 0;
            }
            catch { return false; }
        }

        private string ExtractJsonString(string json, string key)
        {
            // Lightweight JSON string extractor without Newtonsoft dependency for resilience
            string search = string.Format("\"{0}\"", key);
            int keyIdx = json.IndexOf(search, StringComparison.OrdinalIgnoreCase);
            if (keyIdx < 0) return "";
            int colon = json.IndexOf(':', keyIdx + search.Length);
            if (colon < 0) return "";
            int open = json.IndexOf('"', colon + 1);
            if (open < 0) return "";
            int close = json.IndexOf('"', open + 1);
            if (close < 0) return "";
            return json.Substring(open + 1, close - open - 1);
        }
    }
}
