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

        public MainWindow()
        {
            InitializeComponent();
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

            // 4. Navigate to Dashboard on startup
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
                if (StatusRadioText != null && StatusRadioPlayIcon != null)
                {
                    string stationName = radio.CurrentStation != null ? radio.CurrentStation.Name : "BFM 89.9";
                    if (radio.State == RadioPlaybackState.Playing)
                    {
                        StatusRadioPlayIcon.Text = "⏸";
                        StatusRadioText.Text = "Radio: " + stationName + " (Live)";
                        StatusRadioText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#10B981"));
                    }
                    else if (radio.State == RadioPlaybackState.Buffering)
                    {
                        StatusRadioPlayIcon.Text = "⏳";
                        StatusRadioText.Text = "Radio: Connecting...";
                        StatusRadioText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F59E0B"));
                    }
                    else
                    {
                        StatusRadioPlayIcon.Text = "▶";
                        StatusRadioText.Text = "Radio: " + stationName;
                        StatusRadioText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"));
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
        }

        public void RefreshProfileUI()
        {
            currentProfile = UserProfileService.LoadProfile();
            SidebarDesignerName.Text = currentProfile.DesignerName;
            SidebarDepartment.Text = string.IsNullOrWhiteSpace(currentProfile.Department) ? "User Profile" : currentProfile.Department;

            if (!string.IsNullOrWhiteSpace(currentProfile.AvatarPath) && File.Exists(currentProfile.AvatarPath))
            {
                try
                {
                    BitmapImage bmp = new BitmapImage();
                    bmp.BeginInit();
                    bmp.UriSource = new Uri(currentProfile.AvatarPath, UriKind.Absolute);
                    bmp.CacheOption = BitmapCacheOption.OnLoad;
                    bmp.EndInit();

                    SidebarAvatarImg.Source = bmp;
                    SidebarAvatarImg.Visibility = Visibility.Visible;
                    AvatarEmojiText.Visibility = Visibility.Collapsed;
                }
                catch
                {
                    SidebarAvatarImg.Visibility = Visibility.Collapsed;
                    AvatarEmojiText.Visibility = Visibility.Visible;
                }
            }
            else
            {
                SidebarAvatarImg.Visibility = Visibility.Collapsed;
                AvatarEmojiText.Visibility = Visibility.Visible;
            }
        }

        private void InitHeaderAnimation()
        {
            animItems = new List<AnimShapeItem>();
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

            headerAnimTimer = new DispatcherTimer();
            headerAnimTimer.Interval = TimeSpan.FromMilliseconds(33);
            headerAnimTimer.Tick += (s, ev) =>
            {
                double cw = HeaderCanvas.ActualWidth;
                double ch = HeaderCanvas.ActualHeight;
                if (cw <= 0 || ch <= 0) return;

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
                }
            };
            headerAnimTimer.Start();
        }

        private void OnToggleSidebarClicked(object sender, RoutedEventArgs e)
        {
            isSidebarExpanded = !isSidebarExpanded;
            SidebarColumn.Width = isSidebarExpanded ? new GridLength(240) : new GridLength(64);

            Visibility textVis = isSidebarExpanded ? Visibility.Visible : Visibility.Collapsed;

            if (SidebarModulesHeader != null) SidebarModulesHeader.Visibility = textVis;
            if (SidebarUserText != null) SidebarUserText.Visibility = textVis;
            if (NavDashboardText != null) NavDashboardText.Visibility = textVis;
            if (NavWellbeingText != null) NavWellbeingText.Visibility = textVis;
            if (NavProjectsText != null) NavProjectsText.Visibility = textVis;
            if (NavSearchText != null) NavSearchText.Visibility = textVis;
            if (NavBrandAssetsText != null) NavBrandAssetsText.Visibility = textVis;
            if (NavRadioText != null) NavRadioText.Visibility = textVis;
            if (NavWorkstationHealthText != null) NavWorkstationHealthText.Visibility = textVis;

            System.Windows.Controls.Button[] buttons = new[] { NavDashboardBtn, NavWellbeingBtn, NavProjectsBtn, NavSearchBtn, NavBrandAssetsBtn, NavRadioBtn, NavWorkstationHealthBtn };
            System.Windows.Controls.TextBlock[] icons = new[] { NavDashboardIcon, NavWellbeingIcon, NavProjectsIcon, NavSearchIcon, NavBrandAssetsIcon, NavRadioIcon, NavWorkstationHealthIcon };

            for (int i = 0; i < buttons.Length; i++)
            {
                if (buttons[i] != null)
                {
                    buttons[i].HorizontalContentAlignment = isSidebarExpanded ? HorizontalAlignment.Left : HorizontalAlignment.Center;
                    buttons[i].Padding = isSidebarExpanded ? new Thickness(8, 0, 8, 0) : new Thickness(0);
                }

                if (icons[i] != null)
                {
                    icons[i].Margin = isSidebarExpanded ? new Thickness(0, 0, 10, 0) : new Thickness(0);
                    icons[i].FontSize = isSidebarExpanded ? 16 : 20;
                    icons[i].HorizontalAlignment = isSidebarExpanded ? HorizontalAlignment.Left : HorizontalAlignment.Center;
                }
            }

            if (AvatarBorder != null)
            {
                AvatarBorder.Margin = isSidebarExpanded ? new Thickness(0, 0, 8, 0) : new Thickness(0);
            }

            if (SidebarUserPanel != null)
            {
                SidebarUserPanel.HorizontalAlignment = isSidebarExpanded ? HorizontalAlignment.Left : HorizontalAlignment.Center;
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

        private readonly Dictionary<Type, Page> _pageCache = new Dictionary<Type, Page>();

        public void NavigateTo(Type pageType, System.Windows.Controls.Button activeBtn)
        {
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
                activeBtn.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"));
                activeBtn.Foreground = Brushes.White;
            }
        }

        private void ResetNavHighlight()
        {
            System.Windows.Controls.Button[] navBtns = new[] { NavDashboardBtn, NavWellbeingBtn, NavProjectsBtn, NavSearchBtn, NavBrandAssetsBtn, NavRadioBtn, NavWorkstationHealthBtn };
            foreach (System.Windows.Controls.Button btn in navBtns)
            {
                if (btn != null)
                {
                    btn.Background = Brushes.Transparent;
                    btn.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
                }
            }
        }

        private DispatcherTimer footerTimer;

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
                    StatusTimerText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"));
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
                    StatusTimerText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#475569"));
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
