using System;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Effects;
using System.Windows.Threading;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class WaktuSolatPage : Page
    {
        private DispatcherTimer _timer;
        private PrayerTimeEntry _entry;
        private bool _loading;
        private string _currentZone = "WLY01";

        // ── Ctor ──────────────────────────────────────────────────────────────
        public WaktuSolatPage()
        {
            InitializeComponent();

            // Populate zone combo
            ZoneCombo.ItemsSource = PrayerTimeService.Zones;
            ZoneCombo.SelectedIndex = 0;

            // Restore saved zone / reminder preference
            try
            {
                var profile = UserProfileService.LoadProfile();
                if (profile != null)
                {
                    if (!string.IsNullOrEmpty(profile.PrayerZone))
                        _currentZone = profile.PrayerZone;

                    ReminderText.Text = profile.PrayerRemindersEnabled
                        ? "Peringatan: ON" : "Peringatan: OFF";
                    ReminderIcon.Text  = profile.PrayerRemindersEnabled
                        ? "\uEA8F" : "\uEA8F"; // bell icon
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }

            // Select saved zone in combo
            for (int i = 0; i < PrayerTimeService.Zones.Length; i++)
            {
                if (PrayerTimeService.Zones[i].Code == _currentZone)
                {
                    ZoneCombo.SelectedIndex = i;
                    break;
                }
            }

            // Live countdown timer
            _timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
            _timer.Tick += OnTimerTick;
            _timer.Start();

            // Initial fetch (background thread)
            FetchAsync(_currentZone);
        }

        // ── Fetch ─────────────────────────────────────────────────────────────
        private void FetchAsync(string zone)
        {
            if (_loading) return;
            _loading = true;
            TxtCountdown.Text   = "Memuatkan...";
            TxtNextPrayer.Text  = "...";
            TxtHijriDate.Text   = "";

            System.Threading.ThreadPool.QueueUserWorkItem(s =>
            {
                var entry = PrayerTimeService.FetchToday(zone);
                Dispatcher.BeginInvoke(new Action(() =>
                {
                    _loading = false;
                    _entry   = entry;

                    if (_entry == null)
                    {
                        TxtCountdown.Text  = "Gagal memuatkan";
                        TxtNextPrayer.Text = "Tiada data";
                        TxtCurrentLabel.Text = "Semak sambungan internet anda.";
                    }
                    else
                    {
                        UpdateUI();
                    }
                }));
            });
        }

        // ── Timer tick ────────────────────────────────────────────────────────
        private void OnTimerTick(object sender, EventArgs e)
        {
            TxtGregorianDate.Text = DateTime.Now.ToString("dddd, d MMMM yyyy",
                new System.Globalization.CultureInfo("ms-MY"));

            if (_entry == null) return;
            UpdateUI();
        }

        // ── Main UI update ────────────────────────────────────────────────────
        private void UpdateUI()
        {
            TxtGregorianDate.Text = DateTime.Now.ToString("dddd, d MMMM yyyy",
                new System.Globalization.CultureInfo("ms-MY"));
            TxtHijriDate.Text = _entry.Hijri + "H";

            var state = PrayerTimeService.ComputeState(_entry);
            if (state == null) return;

            // Hero countdown
            TxtNextPrayer.Text     = state.NextPrayer;
            TxtNextPrayerTime.Text = state.NextPrayerTime.ToString("HH:mm");

            var ts = state.TimeRemaining;
            TxtCountdown.Text = ts.TotalHours >= 1
                ? string.Format("{0:D2}:{1:mm}:{1:ss}", (int)ts.TotalHours, ts)
                : string.Format("{0:mm}:{0:ss}", ts);

            TxtCurrentLabel.Text  = "Sejak " + state.CurrentPrayer;
            TxtProgressPct.Text   = string.Format("{0:0}%", state.ProgressPercent);

            // Progress bar fill (proportional to container width)
            HeroProgressContainer.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));
            double containerW = HeroProgressContainer.ActualWidth;
            if (containerW > 4)
                ProgressFill.Width = Math.Max(0,
                    (state.ProgressPercent / 100.0) * (containerW - 2));

            // Adhan badge
            if (state.IsPrayerTime)
            {
                AdhanBadge.Visibility  = Visibility.Visible;
                TxtAdhanBadge.Text     = "\uD83D\uDD4C Waktu " + state.CurrentPrayer + "!";
            }
            else
            {
                AdhanBadge.Visibility = Visibility.Collapsed;
            }

            // Update time-of-day ambient hero border accent
            if (HeroCardBorder != null && state != null)
            {
                string nextP = state.NextPrayer != null ? state.NextPrayer.ToLower() : "";
                if (nextP.Contains("subuh"))
                    HeroCardBorder.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#818CF8"));
                else if (nextP.Contains("zohor") || nextP.Contains("syuruq"))
                    HeroCardBorder.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#38BDF8"));
                else if (nextP.Contains("asar"))
                    HeroCardBorder.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F59E0B"));
                else if (nextP.Contains("maghrib"))
                    HeroCardBorder.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F43F5E"));
                else if (nextP.Contains("isyak"))
                    HeroCardBorder.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#6366F1"));
            }

            // Rebuild prayer list rows
            RefreshPrayerList(state);
        }

        // ── Prayer list rows (built in code-behind for flexibility) ───────────
        private void RefreshPrayerList(PrayerState state)
        {
            PrayerListPanel.Children.Clear();

            DateTime now = DateTime.Now;

            var prayers = new[]
            {
                new { Name = "Subuh",   Sub = "Fajr",            Time = _entry.Subuh   },
                new { Name = "Syuruk",  Sub = "Terbit Matahari", Time = _entry.Syuruk  },
                new { Name = "Zohor",   Sub = "Dhuhr",           Time = _entry.Zohor   },
                new { Name = "Asar",    Sub = "Asr",             Time = _entry.Asar    },
                new { Name = "Maghrib", Sub = "Maghrib",         Time = _entry.Maghrib },
                new { Name = "Isyak",   Sub = "Isha",            Time = _entry.Isyak   },
            };

            for (int i = 0; i < prayers.Length; i++)
            {
                var p       = prayers[i];
                bool isPast    = now > p.Time;
                bool isCurrent = p.Name == state.CurrentPrayerKey;
                bool isNext    = p.Name == state.NextPrayer;
                bool showSep   = i < prayers.Length - 1;

                PrayerListPanel.Children.Add(
                    BuildRow(p.Name, p.Sub, p.Time, isPast, isCurrent, isNext, showSep));
            }
        }

        private Border BuildRow(string name, string sub, DateTime time,
                                bool isPast, bool isCurrent, bool isNext, bool sep)
        {
            Brush textPrimary   = GetBrush("FluentLightTextPrimary");
            Brush textSecondary = GetBrush("FluentLightTextSecondary");
            Brush brandBlue     = GetBrush("FluentBrand80");
            Brush strokeBrush   = GetBrush("FluentLightStroke");

            Brush rowBg = isCurrent
                ? new SolidColorBrush(Color.FromArgb(18, 0, 120, 212))
                : Brushes.Transparent;

            var row = new Border
            {
                Padding         = new Thickness(24, 14, 24, 14),
                Background      = rowBg,
                BorderBrush     = strokeBrush,
                BorderThickness = sep ? new Thickness(0, 0, 0, 1) : new Thickness(0),
            };

            var grid = new Grid();
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(36) });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(140) });

            // Column 0: Icon
            var icon = new TextBlock
            {
                Text            = "\uE8EF",
                FontFamily      = new FontFamily("Segoe Fluent Icons"),
                FontSize        = 16,
                VerticalAlignment = VerticalAlignment.Center,
                Foreground      = isCurrent ? brandBlue
                                : isNext    ? textSecondary
                                : isPast    ? new SolidColorBrush(Color.FromArgb(80, 150, 150, 150))
                                :             textSecondary,
            };
            Grid.SetColumn(icon, 0);

            // Column 1: Name + Arabic sub-label
            var nameStack = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
            var nameTb = new TextBlock
            {
                Text       = name,
                FontSize   = 14,
                FontWeight = FontWeights.SemiBold,
                Foreground = isCurrent ? brandBlue : textPrimary,
                FontFamily = new FontFamily("Segoe UI Variable Text"),
            };
            if (isPast && !isCurrent)
                nameTb.TextDecorations = TextDecorations.Strikethrough;

            var subTb = new TextBlock
            {
                Text       = sub,
                FontSize   = 11,
                Foreground = textSecondary,
                FontFamily = new FontFamily("Segoe UI Variable Text"),
            };
            nameStack.Children.Add(nameTb);
            nameStack.Children.Add(subTb);
            Grid.SetColumn(nameStack, 1);

            // Column 2: Clock time (large)
            var timeTb = new TextBlock
            {
                Text              = time.ToString("HH:mm"),
                FontSize          = 22,
                FontWeight        = FontWeights.SemiBold,
                Foreground        = isCurrent ? brandBlue : textPrimary,
                FontFamily        = new FontFamily("Segoe UI Variable Display"),
                VerticalAlignment = VerticalAlignment.Center,
                Margin            = new Thickness(0, 0, 16, 0),
            };
            Grid.SetColumn(timeTb, 2);

            // Column 3: Status badge
            string badgeText;
            Brush  badgeBg, badgeFg;

            if (isCurrent)
            {
                badgeText = "\u25CF Waktu Ini";
                badgeBg   = new SolidColorBrush(Color.FromArgb(30, 0, 120, 212));
                badgeFg   = brandBlue;
            }
            else if (isNext)
            {
                badgeText = "\u23F3 Akan Datang";
                badgeBg   = new SolidColorBrush(Color.FromArgb(25, 245, 158, 11));
                badgeFg   = new SolidColorBrush(Color.FromRgb(180, 100, 0));
            }
            else if (isPast)
            {
                badgeText = "\u2713 Selesai";
                badgeBg   = Brushes.Transparent;
                badgeFg   = textSecondary;
            }
            else
            {
                badgeText = "Belum Masuk";
                badgeBg   = Brushes.Transparent;
                badgeFg   = textSecondary;
            }

            var badge = new Border
            {
                CornerRadius      = new CornerRadius(4),
                Padding           = new Thickness(8, 4, 8, 4),
                Background        = badgeBg,
                HorizontalAlignment = HorizontalAlignment.Right,
                VerticalAlignment   = VerticalAlignment.Center,
            };
            badge.Child = new TextBlock
            {
                Text       = badgeText,
                FontSize   = 12,
                Foreground = badgeFg,
                FontFamily = new FontFamily("Segoe UI Variable Text"),
            };
            Grid.SetColumn(badge, 3);

            grid.Children.Add(icon);
            grid.Children.Add(nameStack);
            grid.Children.Add(timeTb);
            grid.Children.Add(badge);

            row.Child = grid;
            return row;
        }

        // ── Event handlers ────────────────────────────────────────────────────
        private void OnZoneChanged(object sender, SelectionChangedEventArgs e)
        {
            var zi = ZoneCombo.SelectedItem as PrayerZoneInfo;
            if (zi == null || zi.Code == _currentZone) return;

            _currentZone = zi.Code;
            _entry       = null;
            PrayerListPanel.Children.Clear();
            FetchAsync(_currentZone);

            // Persist
            try
            {
                var profile = UserProfileService.LoadProfile() ?? new UserProfile();
                profile.PrayerZone = _currentZone;
                UserProfileService.SaveProfile(profile);
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
        }

        private void OnReminderToggle(object sender, RoutedEventArgs e)
        {
            try
            {
                var profile = UserProfileService.LoadProfile() ?? new UserProfile();
                profile.PrayerRemindersEnabled = !profile.PrayerRemindersEnabled;
                UserProfileService.SaveProfile(profile);
                ReminderText.Text = profile.PrayerRemindersEnabled
                    ? "Peringatan: ON" : "Peringatan: OFF";
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
        }

        // ── Helpers ───────────────────────────────────────────────────────────
        private Brush GetBrush(string key)
        {
            var res = TryFindResource(key);
            if (res is Brush) return (Brush)res;
            // Fallback colours
            if (key == "FluentBrand80")         return new SolidColorBrush(Color.FromRgb(0, 120, 212));
            if (key == "FluentLightTextPrimary") return new SolidColorBrush(Color.FromRgb(20, 20, 20));
            return new SolidColorBrush(Color.FromRgb(130, 130, 130));
        }
    }
}
