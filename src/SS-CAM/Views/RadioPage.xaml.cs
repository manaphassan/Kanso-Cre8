using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class RadioPage : Page
    {
        private RadioStreamService _radioService;
        private Random _random = new Random();
        private string _activeFilter = "ALL";
        private RadioStation _editingStation = null;

        private void OnScrollViewerPreviewMouseWheel(object sender, System.Windows.Input.MouseWheelEventArgs e)
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

        public RadioPage()
        {
            InitializeComponent();
            Loaded += OnPageLoaded;
            Unloaded += OnPageUnloaded;
        }

        private void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            _radioService = RadioStreamService.Instance;

            _radioService.PlaybackStateChanged += OnPlaybackStateChanged;
            _radioService.StationChanged       += OnStationChanged;
            _radioService.VolumeChanged        += OnVolumeChanged;
            _radioService.ErrorOccurred        += OnErrorOccurred;
            _radioService.StreamTitleChanged   += OnStreamTitleChanged;
            _radioService.CoverDownloaded      += OnCoverDownloaded;

            InitVisualizerTimer();
            RefreshHeroUI();
            ApplyFilter(_activeFilter);
        }

        private void OnPageUnloaded(object sender, RoutedEventArgs e)
        {
            if (_radioService != null)
            {
                _radioService.PlaybackStateChanged -= OnPlaybackStateChanged;
                _radioService.StationChanged       -= OnStationChanged;
                _radioService.VolumeChanged        -= OnVolumeChanged;
                _radioService.ErrorOccurred        -= OnErrorOccurred;
                _radioService.StreamTitleChanged   -= OnStreamTitleChanged;
                _radioService.CoverDownloaded      -= OnCoverDownloaded;
            }

            try
            {
                var viz = VisualizerService.Instance;
                if (viz != null)
                {
                    viz.RhythmTick -= OnRhythmTick;
                    viz.VisualizerModeChanged -= OnVisualizerModeChanged;
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[RadioPage] OnPageUnloaded viz unhook: " + ex.Message); }
        }

        private void InitVisualizerTimer()
        {
            try
            {
                var viz = VisualizerService.Instance;
                if (viz != null)
                {
                    viz.RhythmTick += OnRhythmTick;
                    viz.VisualizerModeChanged += OnVisualizerModeChanged;
                    UpdateVisualizerModeUI(viz.CurrentMode);
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[RadioPage] InitVisualizerTimer: " + ex.Message); }
        }

        private void OnVisualizerModeChanged(object sender, VisualizerMode mode)
        {
            Dispatcher.BeginInvoke(new Action(() => UpdateVisualizerModeUI(mode)));
        }

        private void UpdateVisualizerModeUI(VisualizerMode mode)
        {
            if (HeroVizBadgeText != null)
            {
                switch (mode)
                {
                    case VisualizerMode.HeroMesh: HeroVizBadgeText.Text = "VIZ: HERO MESH"; break;
                    case VisualizerMode.SpectrumBars: HeroVizBadgeText.Text = "VIZ: SPECTRUM"; break;
                    case VisualizerMode.Waveform: HeroVizBadgeText.Text = "VIZ: WAVEFORM"; break;
                    case VisualizerMode.PulsatingOrb: HeroVizBadgeText.Text = "VIZ: PULSE ORB"; break;
                }
            }

            if (VisualizerBars != null)
                VisualizerBars.Visibility = (mode == VisualizerMode.SpectrumBars) ? Visibility.Visible : Visibility.Collapsed;

            if (HeroWavePath != null)
                HeroWavePath.Visibility = (mode == VisualizerMode.Waveform) ? Visibility.Visible : Visibility.Collapsed;

            if (HeroRhythmOrb != null)
                HeroRhythmOrb.Visibility = (mode == VisualizerMode.PulsatingOrb) ? Visibility.Visible : Visibility.Collapsed;
        }

        private void OnRhythmTick(object sender, RhythmFrameEventArgs e)
        {
            Dispatcher.BeginInvoke(new Action(() =>
            {
                try
                {
                    var mode = VisualizerService.Instance.CurrentMode;

                    // 1. SuamiSihat Men Icon & Hero Mesh Backdrop Pulsing (Active across all modes, extra punch on bass)
                    if (MenIconScale != null)
                    {
                        double menScale = 1.0 + e.Bass * 0.35;
                        MenIconScale.ScaleX = menScale;
                        MenIconScale.ScaleY = menScale;
                    }
                    if (AuraScale1 != null)
                    {
                        double scale1 = 1.0 + e.Bass * 0.30;
                        AuraScale1.ScaleX = scale1;
                        AuraScale1.ScaleY = scale1;
                    }
                    if (AuraScale2 != null)
                    {
                        double scale2 = 1.0 + e.Mid * 0.38;
                        AuraScale2.ScaleX = scale2;
                        AuraScale2.ScaleY = scale2;
                    }

                    if (HeroMeshStop2 != null)
                    {
                        byte r = (byte)(30 + e.Energy * 40);
                        byte g = (byte)(45 + e.Bass * 80);
                        byte b = (byte)(90 + e.Treble * 120);
                        HeroMeshStop2.Color = Color.FromRgb(r, g, b);
                    }

                    // 2. Mode-Specific Visualizer Animations
                    if (mode == VisualizerMode.SpectrumBars && VisualizerBars != null && e.Spectrum != null && e.Spectrum.Length >= 12)
                    {
                        if (Bar1 != null) Bar1.Height = Math.Max(4, e.Spectrum[0] * 24);
                        if (Bar2 != null) Bar2.Height = Math.Max(4, e.Spectrum[1] * 24);
                        if (Bar3 != null) Bar3.Height = Math.Max(4, e.Spectrum[2] * 24);
                        if (Bar4 != null) Bar4.Height = Math.Max(4, e.Spectrum[3] * 24);
                        if (Bar5 != null) Bar5.Height = Math.Max(4, e.Spectrum[4] * 24);
                        if (Bar6 != null) Bar6.Height = Math.Max(4, e.Spectrum[5] * 24);
                        if (Bar7 != null) Bar7.Height = Math.Max(4, e.Spectrum[6] * 24);
                        if (Bar8 != null) Bar8.Height = Math.Max(4, e.Spectrum[7] * 24);
                        if (Bar9 != null) Bar9.Height = Math.Max(4, e.Spectrum[8] * 24);
                        if (Bar10 != null) Bar10.Height = Math.Max(4, e.Spectrum[9] * 24);
                        if (Bar11 != null) Bar11.Height = Math.Max(4, e.Spectrum[10] * 24);
                        if (Bar12 != null) Bar12.Height = Math.Max(4, e.Spectrum[11] * 24);
                    }
                    else if (mode == VisualizerMode.PulsatingOrb && OrbScale != null)
                    {
                        double orbScale = 0.9 + e.Energy * 0.70;
                        OrbScale.ScaleX = orbScale;
                        OrbScale.ScaleY = orbScale;
                    }
                    else if (mode == VisualizerMode.Waveform && HeroWavePath != null)
                    {
                        // Render dynamic oscilloscope wave path across hero banner
                        double w = 360.0;
                        double h = 40.0;
                        int pts = 24;
                        double step = w / (pts - 1);

                        StreamGeometry geom = new StreamGeometry();
                        using (StreamGeometryContext ctx = geom.Open())
                        {
                            Point startPt = new Point(0, h / 2.0 + Math.Sin(e.Phase) * 12.0 * e.Bass);
                            ctx.BeginFigure(startPt, false, false);
                            for (int i = 1; i < pts; i++)
                            {
                                double x = i * step;
                                double y = h / 2.0 + Math.Sin(e.Phase + i * 0.4) * (14.0 * e.Bass);
                                ctx.LineTo(new Point(x, y), true, false);
                            }
                        }
                        geom.Freeze();
                        HeroWavePath.Data = geom;
                    }
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[RadioPage] OnRhythmTick: " + ex.Message); }
            }));
        }

        private void RefreshHeroUI()
        {
            var station = _radioService.CurrentStation;
            if (station != null)
            {
                HeroIconText.Text = "\uE768"; // Radio glyph fallback
                HeroStationName.Text = station.Name;
                HeroGenreText.Text = station.Genre;
            }
            else
            {
                HeroIconText.Text = "\uE768";
                HeroStationName.Text = "No station selected";
                HeroGenreText.Text = "";
            }

            HeroVolumeSlider.Value = _radioService.Volume * 100;
            HeroMuteIcon.Text = _radioService.IsMuted ? "\uE74F" : "\uE767"; // Mute / Volume

            UpdatePlaybackStateUI(_radioService.State);

            // Restore cached cover art immediately (if available from a previous session)
            UpdateHeroCoverImage(station);
        }

        private void UpdatePlaybackStateUI(RadioPlaybackState state)
        {
            switch (state)
            {
                case RadioPlaybackState.Playing:
                    HeroPlayBtnText.Text = "\uE769"; // Pause
                    HeroStatusDot.Text = "\uE73E"; // Check
                    HeroStatusText.Text = "Live Stream Playing";
                    HeroStatusText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#10B981"));
                    UpdateVisualizerModeUI(VisualizerService.Instance.CurrentMode);
                    break;

                case RadioPlaybackState.Buffering:
                    HeroPlayBtnText.Text = "\uE823"; // Processing
                    HeroStatusDot.Text = "\uE823";
                    HeroStatusText.Text = "Connecting & Buffering Stream...";
                    HeroStatusText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F59E0B"));
                    break;

                case RadioPlaybackState.Paused:
                    HeroPlayBtnText.Text = "\uE768"; // Play
                    HeroStatusDot.Text = "\uE769"; // Pause
                    HeroStatusText.Text = "Paused";
                    HeroStatusText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F59E0B"));
                    break;

                case RadioPlaybackState.Error:
                    HeroPlayBtnText.Text = "\uE768"; // Play
                    HeroStatusDot.Text = "\uEA39"; // Error/Cancel
                    HeroStatusText.Text = "Stream Connection Error (Try Editing / Testing Stream URL)";
                    HeroStatusText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#EF4444"));
                    break;

                case RadioPlaybackState.Stopped:
                default:
                    HeroPlayBtnText.Text = "\uE768"; // Play
                    HeroStatusDot.Text = "\uE71A"; // Stop
                    HeroStatusText.Text = "Ready to Play";
                    HeroStatusText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#CBD5E1"));
                    if (HeroStreamTitleText != null) HeroStreamTitleText.Visibility = Visibility.Collapsed;
                    break;
            }
        }

        private void OnPlaybackStateChanged(RadioPlaybackState state)
        {
            UpdatePlaybackStateUI(state);
        }

        private void OnStationChanged(RadioStation station)
        {
            RefreshHeroUI();

            // Kick off cover art download in the background (no-op if already cached)
            if (station != null)
                _radioService.DownloadCoverAsync(station);
        }

        private void OnVolumeChanged(double volume, bool isMuted)
        {
            HeroVolumeSlider.Value = volume * 100;
            HeroMuteIcon.Text = isMuted ? "\uE74F" : "\uE767"; // Mute / Volume glyphs
        }

        private void OnErrorOccurred(string errorMsg)
        {
            UpdatePlaybackStateUI(RadioPlaybackState.Error);
        }

        private void OnStreamTitleChanged(string title)
        {
            if (HeroStreamTitleText != null)
            {
                if (!string.IsNullOrEmpty(title) && _radioService.State == RadioPlaybackState.Playing)
                {
                    HeroStreamTitleText.Text = title;
                    HeroStreamTitleText.Visibility = Visibility.Visible;
                }
                else
                {
                    HeroStreamTitleText.Visibility = Visibility.Collapsed;
                }
            }
        }

        // Called on the UI thread by RadioStreamService after a cover download completes
        private void OnCoverDownloaded(RadioStation station)
        {
            // Update hero bar only if the downloaded station is still the active one
            if (_radioService.CurrentStation != null &&
                _radioService.CurrentStation.Id == station.Id)
            {
                UpdateHeroCoverImage(station);
            }
        }

        /// <summary>
        /// Loads station.LocalCoverPath into the hero transport bar's cover Image element.
        /// Shows the Image and hides the fallback glyph TextBlock.
        /// </summary>
        private void UpdateHeroCoverImage(RadioStation station)
        {
            if (station == null || !station.HasLocalCover)
            {
                HeroCoverImage.Visibility = Visibility.Collapsed;
                HeroIconText.Visibility   = Visibility.Visible;
                return;
            }

            try
            {
                var bmp = new BitmapImage();
                bmp.BeginInit();
                bmp.UriSource      = new Uri(station.LocalCoverPath, UriKind.Absolute);
                bmp.CacheOption    = BitmapCacheOption.OnLoad;
                bmp.DecodePixelWidth = 92; // 2x display size for retina clarity
                bmp.EndInit();
                bmp.Freeze();

                HeroCoverImage.Source     = bmp;
                HeroCoverImage.Visibility = Visibility.Visible;
                HeroIconText.Visibility   = Visibility.Collapsed;
            }
            catch
            {
                // Silently fall back to glyph icon on any load error
                HeroCoverImage.Visibility = Visibility.Collapsed;
                HeroIconText.Visibility   = Visibility.Visible;
            }
        }

        private void OnHeroPlayClicked(object sender, RoutedEventArgs e)
        {
            _radioService.TogglePlayPause();
        }

        private void OnHeroStopClicked(object sender, RoutedEventArgs e)
        {
            _radioService.Stop();
        }

        private void OnHeroMuteClicked(object sender, RoutedEventArgs e)
        {
            var r = RadioStreamService.Instance;
            r.IsMuted = !r.IsMuted;
            HeroMuteIcon.Text = r.IsMuted ? "\uE74F" : "\uE767"; // VolumeMute vs Volume
            HeroVolumeSlider.IsEnabled = !r.IsMuted;
        }

        private void OnHeroVolumeChanged(object sender, RoutedPropertyChangedEventArgs<double> e)
        {
            if (_radioService != null)
            {
                _radioService.Volume = e.NewValue / 100.0;
            }
        }

        private void OnFilterClicked(object sender, RoutedEventArgs e)
        {
            Button btn = sender as Button;
            if (btn != null && btn.Tag != null)
            {
                _activeFilter = btn.Tag.ToString();
                HighlightFilterButton(btn);
                ApplyFilter(_activeFilter);
            }
        }

        private void HighlightFilterButton(Button selectedBtn)
        {
            foreach (var child in FilterCategoryPanel.Children)
            {
                Border border = child as Border;
                if (border != null && border.Child is Button)
                {
                    Button b = border.Child as Button;
                    if (b == selectedBtn)
                    {
                        border.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"));
                        b.Foreground = Brushes.White;
                        b.FontWeight = FontWeights.Bold;
                    }
                    else
                    {
                        border.Background = Brushes.Transparent;
                        b.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#475569"));
                        b.FontWeight = FontWeights.SemiBold;
                    }
                }
            }
        }

        private void ApplyFilter(string filter)
        {
            var stations = _radioService.AllStations;
            IEnumerable<RadioStation> filtered = stations;

            switch (filter)
            {
                case "FAV":
                    filtered = stations.Where(s => s.IsFavorite);
                    break;
                case "FOCUS":
                    filtered = stations.Where(s => s.Genre.IndexOf("Focus", StringComparison.OrdinalIgnoreCase) >= 0 || s.Genre.IndexOf("Lo-Fi", StringComparison.OrdinalIgnoreCase) >= 0);
                    break;
                case "POP":
                    filtered = stations.Where(s => s.Genre.IndexOf("Pop", StringComparison.OrdinalIgnoreCase) >= 0 || s.Genre.IndexOf("Hits", StringComparison.OrdinalIgnoreCase) >= 0);
                    break;
                case "TALK":
                    filtered = stations.Where(s => s.Genre.IndexOf("Talk", StringComparison.OrdinalIgnoreCase) >= 0 || s.Genre.IndexOf("News", StringComparison.OrdinalIgnoreCase) >= 0);
                    break;
                case "JAZZ":
                    filtered = stations.Where(s => s.Genre.IndexOf("Jazz", StringComparison.OrdinalIgnoreCase) >= 0 || s.Genre.IndexOf("Chill", StringComparison.OrdinalIgnoreCase) >= 0);
                    break;
                case "CUSTOM":
                    filtered = stations.Where(s => !s.IsPreset);
                    break;
                case "ALL":
                default:
                    filtered = stations;
                    break;
            }

            StationItemsControl.ItemsSource = filtered.ToList();
        }

        private void OnStationPlayClicked(object sender, RoutedEventArgs e)
        {
            Button btn = sender as Button;
            if (btn != null && btn.Tag is RadioStation)
            {
                _radioService.PlayStation(btn.Tag as RadioStation);
            }
        }

        private void OnStationFavoriteClicked(object sender, RoutedEventArgs e)
        {
            Button btn = sender as Button;
            if (btn != null && btn.Tag is RadioStation)
            {
                _radioService.ToggleFavorite(btn.Tag as RadioStation);
                ApplyFilter(_activeFilter);
            }
        }

        private void OnStationEditClicked(object sender, RoutedEventArgs e)
        {
            Button btn = sender as Button;
            if (btn != null && btn.Tag is RadioStation)
            {
                _editingStation = btn.Tag as RadioStation;
                ModalTitleText.Text = "✏️ Edit Station — " + _editingStation.Name;
                TxtStationName.Text = _editingStation.Name;
                TxtStreamUrl.Text = _editingStation.StreamUrl;
                TxtEmoji.Text = _editingStation.IconEmoji;
                TxtDescription.Text = _editingStation.Description;
                CmbGenre.Text = _editingStation.Genre;

                StreamTestBadge.Visibility = Visibility.Collapsed;
                AddStationModal.Visibility = Visibility.Visible;
            }
        }

        private void OnStationDeleteClicked(object sender, RoutedEventArgs e)
        {
            Button btn = sender as Button;
            if (btn != null && btn.Tag is RadioStation)
            {
                RadioStation station = btn.Tag as RadioStation;
                string msg = string.Format("Delete station '{0}' from playlist?", station.Name);
                var result = MessageBox.Show(msg, "Confirm Delete Station", MessageBoxButton.YesNo, MessageBoxImage.Question);
                if (result == MessageBoxResult.Yes)
                {
                    _radioService.DeleteStation(station);
                    ApplyFilter(_activeFilter);
                }
            }
        }

        private void OnImportPlaylistClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                Microsoft.Win32.OpenFileDialog dlg = new Microsoft.Win32.OpenFileDialog();
                dlg.Filter = "Radio Playlist Files (*.pls;*.m3u;*.m3u8)|*.pls;*.m3u;*.m3u8|All Files (*.*)|*.*";
                dlg.Title = "Select Radio Playlist File (.pls / .m3u)";

                if (dlg.ShowDialog() == true)
                {
                    List<RadioStation> imported = _radioService.ImportPlaylistFile(dlg.FileName);
                    if (imported != null && imported.Count > 0)
                    {
                        ApplyFilter(_activeFilter);
                        string msg = string.Format("Successfully imported {0} station(s) from '{1}'!", imported.Count, System.IO.Path.GetFileName(dlg.FileName));
                        MessageBox.Show(msg, "Playlist Imported", MessageBoxButton.OK, MessageBoxImage.Information);
                    }
                    else
                    {
                        MessageBox.Show("No valid stream entries found in the selected playlist file.", "Import Warning", MessageBoxButton.OK, MessageBoxImage.Warning);
                    }
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to import playlist: " + ex.Message, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void OnResetDefaultsClicked(object sender, RoutedEventArgs e)
        {
            var result = MessageBox.Show("Reset playlist to default recommended radio stations?", "Reset Playlist", MessageBoxButton.YesNo, MessageBoxImage.Question);
            if (result == MessageBoxResult.Yes)
            {
                _radioService.ResetToDefaultPresets();
                ApplyFilter(_activeFilter);
                MessageBox.Show("Playlist reset to default stations!", "Playlist Reset", MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }

        private void OnAddCustomStationClicked(object sender, RoutedEventArgs e)
        {
            _editingStation = null;
            ModalTitleText.Text = "➕ Add Custom Radio Stream";
            TxtStationName.Text = "";
            TxtStreamUrl.Text = "https://";
            TxtEmoji.Text = "📻";
            TxtDescription.Text = "";
            CmbGenre.SelectedIndex = 0;

            StreamTestBadge.Visibility = Visibility.Collapsed;
            AddStationModal.Visibility = Visibility.Visible;
        }

        private void OnCloseModalClicked(object sender, RoutedEventArgs e)
        {
            AddStationModal.Visibility = Visibility.Collapsed;
            _editingStation = null;
        }

        private void OnTestStreamClicked(object sender, RoutedEventArgs e)
        {
            string url = TxtStreamUrl.Text.Trim();
            if (string.IsNullOrWhiteSpace(url) || url == "https://")
            {
                StreamTestBadge.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FEF2F2"));
                StreamTestText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#DC2626"));
                StreamTestText.Text = "⚠️ Please enter a stream URL to test.";
                StreamTestBadge.Visibility = Visibility.Visible;
                return;
            }

            StreamTestBadge.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FEF9C3"));
            StreamTestText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#854D0E"));
            StreamTestText.Text = "⏳ Testing stream URL connectivity...";
            StreamTestBadge.Visibility = Visibility.Visible;

            ThreadPool.QueueUserWorkItem(state =>
            {
                string statusMsg;
                bool isOk = RadioStreamService.TestStreamUrl(url, out statusMsg);

                Dispatcher.BeginInvoke(new Action(() =>
                {
                    if (isOk)
                    {
                        StreamTestBadge.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#ECFDF5"));
                        StreamTestText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#047857"));
                        StreamTestText.Text = "✅ " + statusMsg;
                    }
                    else
                    {
                        StreamTestBadge.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FEF2F2"));
                        StreamTestText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#DC2626"));
                        StreamTestText.Text = "❌ " + statusMsg;
                    }
                }));
            });
        }

        private void OnSaveCustomStationClicked(object sender, RoutedEventArgs e)
        {
            string name = TxtStationName.Text.Trim();
            string url = TxtStreamUrl.Text.Trim();
            string emoji = TxtEmoji.Text.Trim();
            string desc = TxtDescription.Text.Trim();
            string genre = "Custom";

            ComboBoxItem item = CmbGenre.SelectedItem as ComboBoxItem;
            if (item != null)
            {
                genre = item.Content.ToString();
            }
            else if (!string.IsNullOrWhiteSpace(CmbGenre.Text))
            {
                genre = CmbGenre.Text.Trim();
            }

            if (string.IsNullOrWhiteSpace(name))
            {
                MessageBox.Show("Please enter a station name.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (string.IsNullOrWhiteSpace(url) || url == "https://")
            {
                MessageBox.Show("Please enter a valid HTTP or HTTPS stream URL.", "Validation Error", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (string.IsNullOrWhiteSpace(emoji))
            {
                emoji = "📻";
            }

            if (_editingStation != null)
            {
                _editingStation.Name = name;
                _editingStation.StreamUrl = url;
                _editingStation.Genre = genre;
                _editingStation.IconEmoji = emoji;
                _editingStation.Description = desc;

                _radioService.UpdateStation(_editingStation);
                _editingStation = null;
            }
            else
            {
                RadioStation customStation = new RadioStation
                {
                    Name = name,
                    StreamUrl = url,
                    Genre = genre,
                    IconEmoji = emoji,
                    Description = desc,
                    IsPreset = false,
                    IsFavorite = false
                };

                _radioService.AddStation(customStation);
            }

            AddStationModal.Visibility = Visibility.Collapsed;
            ApplyFilter(_activeFilter);
        }
    }
}
