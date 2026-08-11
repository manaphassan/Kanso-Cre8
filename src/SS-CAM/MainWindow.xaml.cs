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

        private DispatcherTimer headerAnimTimer;
        private List<AnimShapeItem> animItems;
        private UserProfile currentProfile;

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

            // 2. Load Designer Profile
            RefreshProfileUI();

            // 3. Initialize Real-Time Footer Status Bar Timer & NAS Online Check
            InitNasHealthCheck();
            InitUpdateCheck();
            InitRadioStatusListeners();

            // 4. Initialize Faded Animated Audio Spectrum Visualizer in Sidebar Background

            // 5. Apply Theme on Launch (loads saved theme from ThemeService)
            ThemeService.ApplyTheme(ThemeService.CurrentTheme);

            // 5.1 Fix WPF-UI TitleBar Header alignment natively using VisualTreeHelper
            FixTitleBarHeaderAlignment();

            // Global Fluent 2 Accent Color (Brand Cyan)
            

            // 6. Navigate to Dashboard on startup
            RootNavigation.Navigate(typeof(DashboardPage));
        }

        private void InitRadioStatusListeners()
        {
            var radio = RadioStreamService.Instance;
            radio.PlaybackStateChanged += OnRadioPlaybackStateChanged;
            radio.StationChanged += OnRadioStationChanged;
            radio.StreamTitleChanged += OnRadioStreamTitleChanged;

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

        private void OnRadioStreamTitleChanged(string title)
        {
            UpdateRadioStatusUI();
        }

        private void FixTitleBarHeaderAlignment()
        {
            try
            {
                AppTitleBar.LayoutUpdated += (s, e) =>
                {
                    if (AppTitleBar.Padding.Left != 0) AppTitleBar.Padding = new Thickness(0);
                    if (AppTitleBar.Margin.Left != 0) AppTitleBar.Margin = new Thickness(0);

                    var cp = FindVisualChild<ContentPresenter>(AppTitleBar);
                    if (cp != null && cp.Content == AppTitleBar.Header)
                    {
                        if (cp.HorizontalAlignment != HorizontalAlignment.Stretch)
                            cp.HorizontalAlignment = HorizontalAlignment.Stretch;
                        if (cp.Margin.Left != 0)
                            cp.Margin = new Thickness(0);

                        // CRITICAL FIX: Wpf.Ui's internal TitleBar template places the Header ContentPresenter 
                        // in a Grid Column with Width="Auto". This prevents our internal star columns from expanding.
                        // We must forcefully reach into the template and change that column to Width="*".
                        var parent = VisualTreeHelper.GetParent(cp);
                        Grid parentGrid = parent as Grid;
                        if (parentGrid != null)
                        {
                            int colIndex = Grid.GetColumn(cp);
                            if (colIndex >= 0 && colIndex < parentGrid.ColumnDefinitions.Count)
                            {
                                var colDef = parentGrid.ColumnDefinitions[colIndex];
                                if (!colDef.Width.IsStar)
                                {
                                    colDef.Width = new GridLength(1, GridUnitType.Star);
                                }
                            }
                        }
                    }
                };
            }
            catch { }
        }

        private static T FindVisualChild<T>(DependencyObject parent) where T : DependencyObject
        {
            for (int i = 0; i < VisualTreeHelper.GetChildrenCount(parent); i++)
            {
                var child = VisualTreeHelper.GetChild(parent, i);
                T typedChild = child as T;
                if (typedChild != null) return typedChild;
                var childOfChild = FindVisualChild<T>(child);
                if (childOfChild != null) return childOfChild;
            }
            return null;
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
                    string streamTitle = radio.LocalProxy != null ? radio.LocalProxy.CurrentStreamTitle : null;
                    
                    if (radio.State == RadioPlaybackState.Playing)
                    {
                        StatusRadioPlayIcon.Text = "\uE769"; // Pause icon
                        if (!string.IsNullOrEmpty(streamTitle))
                        {
                            StatusRadioText.Text = stationName + " ▶ " + streamTitle;
                        }
                        else
                        {
                            StatusRadioText.Text = stationName + " ▶ Live";
                        }
                        StatusRadioText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#10B981"));
                    }
                    else if (radio.State == RadioPlaybackState.Buffering)
                    {
                        StatusRadioPlayIcon.Text = "\uE823"; // Processing icon
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
            RootNavigation.Navigate(typeof(RadioPage));
        }

        private void OnClosed(object sender, EventArgs e)
        {
            if (headerAnimTimer != null)
            {
                headerAnimTimer.Stop();
            }
            
            if (nasCheckTimer != null)
            {
                nasCheckTimer.Stop();
            }
            
        }

        public void NavigateTo(Type pageType, object dummy = null)
{
    RootNavigation.Navigate(pageType);
}

        public void RefreshProfileUI()
        {
            currentProfile = UserProfileService.LoadProfile();

            // Update sidebar persona name & department
            // Update avatar tooltip with name + department
            string personaName = currentProfile.DesignerName ?? "Designer";
            string personaDept = currentProfile.Department ?? "Creative Department";
            if (TitleBarAvatarBtn != null)
                TitleBarAvatarBtn.ToolTip = personaName + " — " + personaDept + "\nClick to open Settings & Profile";

            // Initials from first letter of designer name
            if (TitleBarAvatarInitials != null)
            {
                string name = currentProfile.DesignerName ?? "D";
                TitleBarAvatarInitials.Text = name.Length > 0 ? name[0].ToString().ToUpper() : "D";
            }

            // Update avatar photo if set
            if (!string.IsNullOrWhiteSpace(currentProfile.AvatarPath) && File.Exists(currentProfile.AvatarPath))
            {
                try
                {
                    BitmapImage bmp = new BitmapImage();
                    bmp.BeginInit();
                    bmp.UriSource = new Uri(currentProfile.AvatarPath, UriKind.Absolute);
                    bmp.CacheOption = BitmapCacheOption.OnLoad;
                    bmp.EndInit();
                    if (TitleBarAvatarImage != null)
                    {
                        TitleBarAvatarImage.Source = bmp;
                        TitleBarAvatarImage.Visibility = System.Windows.Visibility.Visible;
                    }
                    if (TitleBarAvatarInitials != null)
                        TitleBarAvatarInitials.Visibility = System.Windows.Visibility.Collapsed;
                }
                catch { }
            }
            else
            {
                if (TitleBarAvatarImage != null)
                    TitleBarAvatarImage.Visibility = System.Windows.Visibility.Collapsed;
                if (TitleBarAvatarInitials != null)
                    TitleBarAvatarInitials.Visibility = System.Windows.Visibility.Visible;
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


        
        

        

        

        

        

        

        

        

        private void OnStatusThemeToggle(object sender, MouseButtonEventArgs e)
        {
            // Cycle: SS Default -> Falconia -> Metamorphosis -> SS Default
            AppTheme nextTheme;
            if (ThemeService.CurrentTheme == AppTheme.SSDefault)
                nextTheme = AppTheme.Falconia;
            else if (ThemeService.CurrentTheme == AppTheme.Falconia)
                nextTheme = AppTheme.Metamorphosis;
            else
                nextTheme = AppTheme.SSDefault;

            ThemeService.ApplyTheme(nextTheme);
        }

        private void OnThemeModeChanged(AppTheme theme)
        {
            ThemeColors c = ThemeService.GetColors(theme);

            // -- NavigationView sidebar background --
            // With ApplicationTheme.Dark active for SS Default + Metamorphosis,
            // the NavigationView pane correctly renders the Background property.
            // For Falconia (Light theme), SidebarBg is #F5F5F5 (matches WPF-UI Light default).
            if (RootNavigation != null)
                RootNavigation.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.SidebarBg));

            // ── TitleBar strip ───────────────────────────────────────────────
            if (AppTitleBar != null)
            {
                AppTitleBar.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.TitleBarBg ?? c.SidebarBg));
                AppTitleBar.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.TitleBarForeground));
            }

            // ── TitleBar: search box appearance ─────────────────────────────
            // Dark TitleBar (SS Default = Azure, Metamorphosis = deep navy) → white text
            // Light TitleBar (Falconia = white) → dark text + grey box bg
            bool darkTitleBar = !c.IsLight;  // SS Default & Metamorphosis have dark title bars
            if (TitleBarSearchBorder != null)
            {
                TitleBarSearchBorder.Background = darkTitleBar
                    ? new SolidColorBrush(Color.FromArgb(0x26, 0xFF, 0xFF, 0xFF))  // semi-white on azure
                    : new SolidColorBrush((Color)ColorConverter.ConvertFromString("#EBEBEB"));  // grey on white
            }
            if (TitleBarSearchBox != null)
            {
                string searchFg = darkTitleBar ? "#FFFFFF" : "#242424";
                TitleBarSearchBox.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(searchFg));
                TitleBarSearchBox.CaretBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString(searchFg));
            }

            // ── TitleBar: timer text + NAS area ─────────────────────────────
            SolidColorBrush trayFg = darkTitleBar
                ? new SolidColorBrush(Color.FromArgb(0xCC, 0xFF, 0xFF, 0xFF))
                : new SolidColorBrush(Color.FromArgb(0xCC, 0x24, 0x24, 0x24));
            if (TitleBarTimerText != null)
                TitleBarTimerText.Foreground = trayFg;

            // ── TitleBar: avatar ring ────────────────────────────────────────
            if (TitleBarAvatarBtn != null)
            {
                // On dark TitleBar use a mid-blue ring; on light TitleBar use a neutral ring
                TitleBarAvatarBtn.Background = darkTitleBar
                    ? new SolidColorBrush(Color.FromArgb(0x60, 0x00, 0x78, 0xD4))  // semi-azure
                    : new SolidColorBrush((Color)ColorConverter.ConvertFromString("#D1D1D1"));  // grey
            }

            // ── Sidebar: MODULES section label (null-safe — element may be hidden) ──
            if (SidebarModulesLabel != null)
                SidebarModulesLabel.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(c.InactiveNavSubtext));

            // ── Sidebar footer: theme name label ─────────────────────────────
            if (StatusThemeText != null)
            {
                string themeName;
                if      (theme == AppTheme.Metamorphosis) themeName = "Metamorphosis";
                else if (theme == AppTheme.Falconia)       themeName = "Falconia";
                else                                        themeName = "SS Default";
                StatusThemeText.Text = "Theme: " + themeName;
            }

            // -- Nav item foreground --
            // SS Default: dark navy sidebar in Light WPF-UI mode — force nav text white.
            // Metamorphosis: dark sidebar in Dark WPF-UI mode — force nav text white.
            // Falconia: white sidebar in Light WPF-UI mode — clear override (WPF-UI default = dark).
            bool forceWhiteNavText = (theme == AppTheme.SSDefault || theme == AppTheme.Metamorphosis);
            var navFg = forceWhiteNavText
                ? new SolidColorBrush(Colors.White)
                : null;

            if (RootNavigation != null)
            {
                foreach (object item in RootNavigation.MenuItems)
                {
                    var navItem = item as Wpf.Ui.Controls.NavigationViewItem;
                    if (navItem != null)
                    {
                        if (navFg != null) navItem.Foreground = navFg;
                        else navItem.ClearValue(Wpf.Ui.Controls.NavigationViewItem.ForegroundProperty);
                    }
                }
                foreach (object item in RootNavigation.FooterMenuItems)
                {
                    var navItem2 = item as Wpf.Ui.Controls.NavigationViewItem;
                    if (navItem2 != null)
                    {
                        if (navFg != null) navItem2.Foreground = navFg;
                        else navItem2.ClearValue(Wpf.Ui.Controls.NavigationViewItem.ForegroundProperty);
                    }
                }
            }
        }

        private void OnFooterTimerClicked(object sender, MouseButtonEventArgs e)
        {
            RootNavigation.Navigate(typeof(WellbeingPage));
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
            // Set dot to grey (checking)
            if (TitleBarNasDot != null)
                TitleBarNasDot.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#64748B"));
            if (TitleBarNasClickTarget != null)
                TitleBarNasClickTarget.ToolTip = "SSNAS — Checking...";

            CheckNasOnlineAsync((isOnline, statusText) =>
            {
                string color = isOnline ? "#10B981" : "#EF4444";
                if (TitleBarNasDot != null)
                    TitleBarNasDot.Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString(color));
                if (TitleBarNasClickTarget != null)
                    TitleBarNasClickTarget.ToolTip = statusText + " — click to re-check or open NAS";
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
            // If NAS is online, open the NAS web interface; always re-check status
            try
            {
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                {
                    FileName = "https://suamisihat.myds.me/",
                    UseShellExecute = true
                });
            }
            catch { /* fall through to status check */ }
            TriggerNasHealthCheck();
        }

        // â”€â”€â”€ Auto-Update Check â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // Hosts a version.json at: https://suamisihat.myds.me/ss-cam/version.json
        // Format:
        // {
        //   "version": "2.1.0",
        //   "releaseNotes": "Radio & Focus Stream Player.",
        //   "downloadUrl": "https://suamisihat.myds.me/ss-cam/SS-CAM-v2.1.0.exe"
        // }

        private const string CurrentVersion = "2.6.0";
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

        // ─── Title Bar Search Box ───────────────────────────────────────────────
        // Filters nav items by label text (case-insensitive substring match).
        // Search box has moved from sidebar PaneHeader to the title bar Header slot.
        private static readonly string SearchPlaceholder = "Search modules...";

        private void OnSearchBoxGotFocus(object sender, RoutedEventArgs e)
        {
            if (TitleBarSearchBox != null && TitleBarSearchBox.Text == SearchPlaceholder)
            {
                TitleBarSearchBox.Text = "";
                TitleBarSearchBox.Foreground = new SolidColorBrush(Colors.White);
            }
        }

        private void OnSearchBoxLostFocus(object sender, RoutedEventArgs e)
        {
            if (TitleBarSearchBox != null && string.IsNullOrWhiteSpace(TitleBarSearchBox.Text))
            {
                TitleBarSearchBox.Text = SearchPlaceholder;
                TitleBarSearchBox.Foreground = new SolidColorBrush(Color.FromArgb(0xCC, 0xFF, 0xFF, 0xFF));
            }
            FilterNavItems("");
        }

        private void OnSearchBoxTextChanged(object sender, System.Windows.Controls.TextChangedEventArgs e)
        {
            if (TitleBarSearchBox == null) return;
            string q = TitleBarSearchBox.Text.Trim();
            if (q == SearchPlaceholder) q = "";
            FilterNavItems(q);
        }

        // ─── Pane Toggle ────────────────────────────────────────────────────────
        private void OnPaneToggleClicked(object sender, RoutedEventArgs e)
        {
            if (RootNavigation != null)
                RootNavigation.IsPaneOpen = !RootNavigation.IsPaneOpen;
        }

        private void FilterNavItems(string query)
        {
            foreach (object item in RootNavigation.MenuItems)
            {
                var navItem = item as Wpf.Ui.Controls.NavigationViewItem;
                if (navItem == null) continue;
                string label = navItem.Content != null ? navItem.Content.ToString() : "";
                bool matches = string.IsNullOrEmpty(query) ||
                               label.IndexOf(query, StringComparison.OrdinalIgnoreCase) >= 0;
                navItem.Visibility = matches ? Visibility.Visible : Visibility.Collapsed;
            }
        }

        // ─── Profile Card ───────────────────────────────────────────────────────
        private void OnProfileCardClicked(object sender, MouseButtonEventArgs e)
        {
            RootNavigation.Navigate(typeof(SettingsPage));
        }
    }
}











