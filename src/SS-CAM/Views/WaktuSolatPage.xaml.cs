using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Shapes;
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
        private bool _use24HourFormat = false; // default 12-hour AM/PM format

        private List<HadithEntry> _hadiths;
        private int _hadithIndex = 0;

        // ── Ctor ──────────────────────────────────────────────────────────────
        public WaktuSolatPage()
        {
            InitializeComponent();

            // Populate zone combo
            ZoneCombo.ItemsSource = PrayerTimeService.Zones;
            ZoneCombo.SelectedIndex = 0;

            // Load Hadith collection & Islamic events
            _hadiths = PrayerTimeService.GetCuratedHadiths();
            UpdateHadithUI();
            PopulateIslamicEvents();

            // Restore saved zone / reminder preference
            try
            {
                var profile = UserProfileService.LoadProfile();
                if (profile != null)
                {
                    if (!string.IsNullOrEmpty(profile.PrayerZone))
                        _currentZone = profile.PrayerZone;

                    if (BtnReminder != null)
                    {
                        BtnReminder.Appearance = profile.PrayerRemindersEnabled
                            ? Wpf.Ui.Controls.ControlAppearance.Primary
                            : Wpf.Ui.Controls.ControlAppearance.Secondary;
                        BtnReminder.ToolTip = profile.PrayerRemindersEnabled
                            ? "Peringatan Waktu Solat: ON (Klik untuk Matikan)"
                            : "Peringatan Waktu Solat: OFF (Klik untuk Hidupkan)";
                    }
                    if (ReminderIcon != null)
                    {
                        ReminderIcon.Text = profile.PrayerRemindersEnabled ? "\uEA8F" : "\uE7ED";
                    }
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[WaktuSolatPage] Ctor: " + ex.Message); }

            // Select saved zone in combo
            for (int i = 0; i < PrayerTimeService.Zones.Length; i++)
            {
                if (PrayerTimeService.Zones[i].Code == _currentZone)
                {
                    ZoneCombo.SelectedIndex = i;
                    break;
                }
            }

            // Live clock timer
            _timer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(1) };
            _timer.Tick += OnTimerTick;
            _timer.Start();

            Unloaded += (s, e) => { if (_timer != null) _timer.Stop(); };

            // Recalculate full-width Sun Arc curve dynamically on window resize
            SunArcContainer.SizeChanged += (s, e) =>
            {
                if (_entry != null)
                {
                    var sunInfo = PrayerTimeService.ComputeSunPhase(_entry);
                    UpdateSunArcUI(sunInfo);
                }
            };

            // Initial fetch
            FetchAsync(_currentZone);
        }

        private void OnScrollViewerPreviewMouseWheel(object sender, MouseWheelEventArgs e)
        {
            var scroller = sender as ScrollViewer;
            if (scroller != null)
            {
                int steps = Math.Abs(e.Delta) / 30;
                if (steps < 1) steps = 1;
                if (steps > 8) steps = 8;

                if (e.Delta < 0)
                {
                    for (int i = 0; i < steps; i++) scroller.LineDown();
                }
                else if (e.Delta > 0)
                {
                    for (int i = 0; i < steps; i++) scroller.LineUp();
                }
                e.Handled = true;
            }
        }

        // ── Fetch ─────────────────────────────────────────────────────────────
        private async void FetchAsync(string zone)
        {
            if (_loading) return;
            _loading = true;
            TxtCountdown.Text    = "--:--:--";
            TxtNextPrayer.Text   = "Memuatkan...";
            TxtHijriDate.Text    = "";

            var entry = await PrayerTimeService.FetchTodayAsync(zone);
            _loading = false;
            _entry   = entry;

            if (_entry == null)
            {
                TxtCountdown.Text    = "Gagal memuatkan";
                TxtNextPrayer.Text   = "Tiada data";
                TxtCurrentLabel.Text = "Semak sambungan internet anda.";
            }
            else
            {
                UpdateUI();
            }
        }

        // ── Timer tick ────────────────────────────────────────────────────────
        private void OnTimerTick(object sender, EventArgs e)
        {
            DateTime now = DateTime.Now;

            // Live Clock (12H / 24H)
            TxtLiveClock.Text = FormatLiveClockTime(now);

            // Gregorian Date
            TxtGregorianDate.Text = now.ToString("dddd, d MMMM yyyy",
                new System.Globalization.CultureInfo("ms-MY"));

            if (_entry == null) return;
            UpdateUI();
        }

        // ── Main UI update ────────────────────────────────────────────────────
        private void UpdateUI()
        {
            DateTime now = DateTime.Now;
            TxtLiveClock.Text = FormatLiveClockTime(now);
            TxtGregorianDate.Text = now.ToString("dddd, d MMMM yyyy",
                new System.Globalization.CultureInfo("ms-MY"));

            string fullHijri = FormatFullHijriDate(_entry != null ? _entry.Hijri : "");
            TxtHijriDate.Text = fullHijri;
            TxtHijriMonthBanner.Text = fullHijri;

            var state = PrayerTimeService.ComputeState(_entry);
            if (state == null) return;

            // Hero countdown
            TxtNextPrayer.Text     = state.NextPrayer;
            TxtNextPrayerTime.Text = "Waktu " + FormatClockTime(state.NextPrayerTime);

            var ts = state.TimeRemaining;
            TxtCountdown.Text = ts.TotalHours >= 1
                ? string.Format("{0:D2}:{1:mm}:{1:ss}", (int)ts.TotalHours, ts)
                : string.Format("{0:mm}:{0:ss}", ts);

            TxtCurrentLabel.Text  = "Sejak " + state.CurrentPrayer;
            TxtProgressPct.Text   = string.Format("{0:0}%", state.ProgressPercent);

            // Progress fill
            ProgressFill.Width = Math.Max(0, (state.ProgressPercent / 100.0) * 260);

            // Adhan badge
            if (state.IsPrayerTime)
            {
                AdhanBadge.Visibility = Visibility.Visible;
                TxtAdhanBadge.Text    = "🕌 Waktu " + state.CurrentPrayer + "!";
            }
            else
            {
                AdhanBadge.Visibility = Visibility.Collapsed;
            }

            // Sun Path & Solar Arc updates
            var sunInfo = PrayerTimeService.ComputeSunPhase(_entry);
            UpdateSunArcUI(sunInfo);

            // Update solar curve labels with active time format
            if (_entry != null)
            {
                TxtSubuhLabel.Text = "Subuh (" + FormatClockTime(_entry.Subuh) + ")";
                TxtZohorLabel.Text = "Zohor (" + FormatClockTime(_entry.Zohor) + ")";
                TxtIsyakLabel.Text = "Isyak (" + FormatClockTime(_entry.Isyak) + ")";
            }

            // Rebuild prayer list rows
            RefreshPrayerList(state);
        }

        // ── Formatting Helpers ────────────────────────────────────────────────
        private string FormatClockTime(DateTime dt)
        {
            if (dt == DateTime.MinValue) return "--:--";
            return _use24HourFormat ? dt.ToString("HH:mm") : dt.ToString("hh:mm tt");
        }

        private string FormatLiveClockTime(DateTime dt)
        {
            return _use24HourFormat ? dt.ToString("HH:mm:ss") : dt.ToString("hh:mm:ss tt");
        }

        private static readonly string[] HijriMonthNamesMalay = new[]
        {
            "Muharram",    // 1
            "Safar",       // 2
            "Rabiulawal",  // 3
            "Rabiulakhir", // 4
            "Jamadilawal", // 5
            "Jamadilakhir",// 6
            "Rejab",       // 7
            "Syaaban",     // 8
            "Ramadan",     // 9
            "Syawal",      // 10
            "Zulkaedah",   // 11
            "Zulhijjah"    // 12
        };

        private string FormatFullHijriDate(string rawHijri)
        {
            if (string.IsNullOrEmpty(rawHijri)) return "27 Safar 1448 Hijrah";
            string input = rawHijri.Trim();

            // Handle YYYY-MM-DD format (e.g. "1448-02-27" -> "27 Safar 1448 Hijrah")
            var parts = input.Split(new[] { '-', '/', ' ' }, StringSplitOptions.RemoveEmptyEntries);
            int year, month, day;
            if (parts.Length == 3 && int.TryParse(parts[0], out year) && int.TryParse(parts[1], out month) && int.TryParse(parts[2], out day))
            {
                if (month >= 1 && month <= 12)
                {
                    string monthName = HijriMonthNamesMalay[month - 1];
                    return string.Format("{0} {1} {2} Hijrah", day, monthName, year);
                }
            }

            // Fallback for text string
            string formatted = input;
            if (formatted.EndsWith("H", StringComparison.OrdinalIgnoreCase))
            {
                formatted = formatted.Substring(0, formatted.Length - 1).Trim() + " Hijrah";
            }
            else if (!formatted.EndsWith("Hijrah", StringComparison.OrdinalIgnoreCase))
            {
                formatted += " Hijrah";
            }

            return formatted;
        }

        // ── 12H / 24H Toggle Handler ──────────────────────────────────────────
        private void OnFormatToggle(object sender, RoutedEventArgs e)
        {
            _use24HourFormat = !_use24HourFormat;
            if (BtnFormatToggle != null)
            {
                BtnFormatToggle.ToolTip = _use24HourFormat
                    ? "Format Masa: 24-Jam (Klik untuk 12-Jam)"
                    : "Format Masa: 12-Jam (Klik untuk 24-Jam)";
            }
            if (TxtHeaderTimeFormatLabel != null)
                TxtHeaderTimeFormatLabel.Text = _use24HourFormat ? "WAKTU 24-JAM" : "WAKTU 12-JAM (AM/PM)";
            if (_entry != null) UpdateUI();
        }

        // ── Sun Arc Animation rendering ────────────────────────────────────────
        private void UpdateSunArcUI(SunPhaseInfo sunInfo)
        {
            if (sunInfo == null) return;

            TxtSunPhase.Text = sunInfo.PhaseName;
            TxtSunGlyph.Text = sunInfo.IconGlyph;
            SunOrbGlyph.Text = sunInfo.IconGlyph;

            // Atmosphere gradient transition
            try
            {
                Color colorStart = (Color)ColorConverter.ConvertFromString(sunInfo.GradientStartColor);
                Color colorEnd   = (Color)ColorConverter.ConvertFromString(sunInfo.GradientEndColor);
                AtmosphereGradient.GradientStops[0].Color = colorStart;
                AtmosphereGradient.GradientStops[1].Color = colorEnd;
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[WaktuSolatPage] UpdateSunArcUI gradient: " + ex.Message); }

            // Position SunOrb on parabolic trajectory (y = 44 - 44 * sin(progress * PI))
            double containerWidth = SunArcContainer.ActualWidth > 50 ? SunArcContainer.ActualWidth - 40 : 340;
            double progress = Math.Min(1.0, Math.Max(0.0, sunInfo.SunProgressRatio));
            double x = progress * containerWidth;
            double y = 48.0 - (42.0 * Math.Sin(progress * Math.PI));

            Canvas.SetLeft(SunOrb, Math.Max(0, x));
            Canvas.SetTop(SunOrb, Math.Max(0, y));

            // Parabolic curve geometry
            var figure = new PathFigure { StartPoint = new Point(0, 52) };
            figure.Segments.Add(new BezierSegment(
                new Point(containerWidth * 0.35, 4),
                new Point(containerWidth * 0.65, 4),
                new Point(containerWidth, 52),
                true));

            var geometry = new PathGeometry();
            geometry.Figures.Add(figure);
            SunArcPath.Data = geometry;
        }

        // ── Hadith Rotator & Clipboard ─────────────────────────────────────────
        private void UpdateHadithUI()
        {
            if (_hadiths == null || _hadiths.Count == 0) return;
            var h = _hadiths[_hadithIndex % _hadiths.Count];

            TxtHadithTitle.Text  = h.Title;
            TxtHadithArabic.Text = h.ArabicText;
            TxtHadithMalay.Text  = "“" + h.MalayTranslation + "”";
            TxtHadithSource.Text = "— " + h.Source;
            TxtHadithTheme.Text  = h.Theme;
        }

        private void OnNextHadithClicked(object sender, RoutedEventArgs e)
        {
            if (_hadiths == null || _hadiths.Count == 0) return;
            _hadithIndex = (_hadithIndex + 1) % _hadiths.Count;
            UpdateHadithUI();
        }

        private void OnCopyHadithClicked(object sender, RoutedEventArgs e)
        {
            if (_hadiths == null || _hadiths.Count == 0) return;
            var h = _hadiths[_hadithIndex % _hadiths.Count];
            string textToCopy = string.Format("{0}\n\n{1}\n\n\"{2}\"\n— {3}",
                h.Title, h.ArabicText, h.MalayTranslation, h.Source);
            try
            {
                Clipboard.SetText(textToCopy);
                MessageBox.Show("Hadis berjaya disalin ke papan keratan!", "Salin Hadis",
                    MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[WaktuSolatPage] OnCopyHadithClicked: " + ex.Message); }
        }

        // ── Islamic Events Panel Population ────────────────────────────────────
        private void PopulateIslamicEvents()
        {
            IslamicEventsPanel.Children.Clear();
            var events = PrayerTimeService.GetIslamicEvents();

            foreach (var ev in events)
            {
                var border = new Border
                {
                    CornerRadius = new CornerRadius(6),
                    Padding = new Thickness(10, 8, 10, 8),
                    Margin = new Thickness(0, 0, 0, 6),
                    Background = (Brush)TryFindResource("CardBackgroundFillColorSecondaryBrush") ?? Brushes.Transparent,
                    BorderBrush = (Brush)TryFindResource("CardStrokeColorDefaultBrush") ?? Brushes.Gray,
                    BorderThickness = new Thickness(1)
                };

                var grid = new Grid();
                grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

                var nameStack = new StackPanel();
                var nameText = new TextBlock
                {
                    Text = ev.Name,
                    FontSize = 12,
                    FontWeight = FontWeights.SemiBold,
                    Foreground = (Brush)TryFindResource("TextFillColorPrimaryBrush") ?? Brushes.Black
                };
                var dateText = new TextBlock
                {
                    Text = ev.GregorianDate + " · " + ev.Category,
                    FontSize = 10.5,
                    Foreground = (Brush)TryFindResource("TextFillColorSecondaryBrush") ?? Brushes.Gray,
                    Margin = new Thickness(0, 2, 0, 0)
                };
                nameStack.Children.Add(nameText);
                nameStack.Children.Add(dateText);
                Grid.SetColumn(nameStack, 0);

                string badgeStr = ev.DaysRemaining == 0 ? "Hari Ini!" : string.Format("{0} hari lagi", ev.DaysRemaining);
                var badgeBorder = new Border
                {
                    CornerRadius = new CornerRadius(10),
                    Padding = new Thickness(8, 2, 8, 2),
                    Background = ev.IsHoliday ? new SolidColorBrush(Color.FromArgb(35, 14, 165, 233)) : new SolidColorBrush(Color.FromArgb(20, 150, 150, 150)),
                    VerticalAlignment = VerticalAlignment.Center
                };
                badgeBorder.Child = new TextBlock
                {
                    Text = badgeStr,
                    FontSize = 10,
                    FontWeight = FontWeights.Bold,
                    Foreground = ev.IsHoliday ? (Brush)TryFindResource("FluentBrand80") ?? Brushes.Blue : (Brush)TryFindResource("TextFillColorSecondaryBrush") ?? Brushes.Gray
                };
                Grid.SetColumn(badgeBorder, 1);

                grid.Children.Add(nameStack);
                grid.Children.Add(badgeBorder);
                border.Child = grid;

                IslamicEventsPanel.Children.Add(border);
            }
        }

        // ── Prayer List Rows (12H / 24H Format) ────────────────────────────────
        private void RefreshPrayerList(PrayerState state)
        {
            PrayerListPanel.Children.Clear();

            DateTime now = DateTime.Now;

            var prayers = new[]
            {
                new { Name = "Subuh",   Sub = "Fajr",            Time = _entry.Subuh,   Glyph = "\uE706" },
                new { Name = "Syuruk",  Sub = "Terbit Matahari", Time = _entry.Syuruk,  Glyph = "\uE706" },
                new { Name = "Zohor",   Sub = "Dhuhr",           Time = _entry.Zohor,   Glyph = "\uE706" },
                new { Name = "Asar",    Sub = "Asr",             Time = _entry.Asar,    Glyph = "\uE706" },
                new { Name = "Maghrib", Sub = "Maghrib",         Time = _entry.Maghrib, Glyph = "\uE708" },
                new { Name = "Isyak",   Sub = "Isha",            Time = _entry.Isyak,   Glyph = "\uE708" },
            };

            for (int i = 0; i < prayers.Length; i++)
            {
                var p          = prayers[i];
                bool isPast    = now > p.Time;
                bool isCurrent = p.Name == state.CurrentPrayerKey;
                bool isNext    = p.Name == state.NextPrayer;
                bool showSep   = i < prayers.Length - 1;

                PrayerListPanel.Children.Add(
                    BuildRow(p.Name, p.Sub, p.Time, p.Glyph, isPast, isCurrent, isNext, showSep));
            }
        }

        private Border BuildRow(string name, string sub, DateTime time, string glyph,
                                bool isPast, bool isCurrent, bool isNext, bool sep)
        {
            Brush textPrimary   = (Brush)TryFindResource("TextFillColorPrimaryBrush") ?? Brushes.Black;
            Brush textSecondary = (Brush)TryFindResource("TextFillColorSecondaryBrush") ?? Brushes.Gray;
            Brush brandBlue     = (Brush)TryFindResource("FluentBrand80") ?? Brushes.Blue;
            Brush strokeBrush   = (Brush)TryFindResource("CardStrokeColorDefaultBrush") ?? Brushes.LightGray;

            Brush rowBg = isCurrent
                ? new SolidColorBrush(Color.FromArgb(20, 0, 120, 212))
                : Brushes.Transparent;

            var row = new Border
            {
                Padding         = new Thickness(18, 12, 18, 12),
                Background      = rowBg,
                BorderBrush     = strokeBrush,
                BorderThickness = sep ? new Thickness(0, 0, 0, 1) : new Thickness(0),
            };

            var grid = new Grid();
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(30) });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(130) });

            // Column 0: Glyph Icon
            var icon = new TextBlock
            {
                Text              = glyph,
                FontFamily        = new FontFamily("Segoe Fluent Icons, Segoe MDL2 Assets, Segoe UI Symbol"),
                FontSize          = 14,
                VerticalAlignment = VerticalAlignment.Center,
                Foreground        = isCurrent ? brandBlue : textSecondary,
            };
            Grid.SetColumn(icon, 0);

            // Column 1: Prayer Name + Sub title
            var nameStack = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
            var nameTb = new TextBlock
            {
                Text       = name,
                FontSize   = 13.5,
                FontWeight = isCurrent ? FontWeights.Bold : FontWeights.SemiBold,
                Foreground = isCurrent ? brandBlue : textPrimary,
            };

            var subTb = new TextBlock
            {
                Text       = sub,
                FontSize   = 10.5,
                Foreground = textSecondary,
            };
            nameStack.Children.Add(nameTb);
            nameStack.Children.Add(subTb);
            Grid.SetColumn(nameStack, 1);

            // Column 2: Clock Time (Formatted 12H / 24H)
            var timeTb = new TextBlock
            {
                Text              = FormatClockTime(time),
                FontSize          = 16,
                FontWeight        = FontWeights.Bold,
                FontFamily        = new FontFamily("Consolas, Segoe UI Mono, Segoe UI"),
                Foreground        = isCurrent ? brandBlue : textPrimary,
                VerticalAlignment = VerticalAlignment.Center,
                Margin            = new Thickness(0, 0, 16, 0),
            };
            Grid.SetColumn(timeTb, 2);

            // Column 3: Status Badge
            string badgeText;
            Brush  badgeBg, badgeFg;

            if (isCurrent)
            {
                badgeText = "• Waktu Ini";
                badgeBg   = new SolidColorBrush(Color.FromArgb(30, 0, 120, 212));
                badgeFg   = brandBlue;
            }
            else if (isNext)
            {
                badgeText = "⏳ Akan Datang";
                badgeBg   = new SolidColorBrush(Color.FromArgb(25, 245, 158, 11));
                badgeFg   = new SolidColorBrush(Color.FromRgb(217, 119, 6));
            }
            else if (isPast)
            {
                badgeText = "✓ Selesai";
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
                CornerRadius        = new CornerRadius(10),
                Padding             = new Thickness(8, 3, 8, 3),
                Background          = badgeBg,
                HorizontalAlignment = HorizontalAlignment.Right,
                VerticalAlignment   = VerticalAlignment.Center,
            };
            badge.Child = new TextBlock
            {
                Text       = badgeText,
                FontSize   = 11,
                FontWeight = FontWeights.SemiBold,
                Foreground = badgeFg,
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
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[WaktuSolatPage] OnZoneChanged: " + ex.Message); }
        }

        private void OnReminderToggle(object sender, RoutedEventArgs e)
        {
            try
            {
                var profile = UserProfileService.LoadProfile() ?? new UserProfile();
                profile.PrayerRemindersEnabled = !profile.PrayerRemindersEnabled;
                UserProfileService.SaveProfile(profile);

                if (BtnReminder != null)
                {
                    BtnReminder.Appearance = profile.PrayerRemindersEnabled
                        ? Wpf.Ui.Controls.ControlAppearance.Primary
                        : Wpf.Ui.Controls.ControlAppearance.Secondary;
                    BtnReminder.ToolTip = profile.PrayerRemindersEnabled
                        ? "Peringatan Waktu Solat: ON (Klik untuk Matikan)"
                        : "Peringatan Waktu Solat: OFF (Klik untuk Hidupkan)";
                }
                if (ReminderIcon != null)
                {
                    ReminderIcon.Text = profile.PrayerRemindersEnabled ? "\uEA8F" : "\uE7ED";
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[WaktuSolatPage] OnReminderToggle: " + ex.Message); }
        }
    }
}
