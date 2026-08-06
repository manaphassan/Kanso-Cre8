using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Media;
using System.Windows.Threading;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class RadioPage : Page
    {
        private RadioStreamService _radioService;
        private DispatcherTimer _visualizerTimer;
        private Random _random = new Random();
        private string _activeFilter = "ALL";
        private RadioStation _editingStation = null;

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
            _radioService.StationChanged += OnStationChanged;
            _radioService.VolumeChanged += OnVolumeChanged;
            _radioService.ErrorOccurred += OnErrorOccurred;
            _radioService.StreamTitleChanged += OnStreamTitleChanged;

            InitVisualizerTimer();
            RefreshHeroUI();
            ApplyFilter(_activeFilter);
        }

        private void OnPageUnloaded(object sender, RoutedEventArgs e)
        {
            if (_radioService != null)
            {
                _radioService.PlaybackStateChanged -= OnPlaybackStateChanged;
                _radioService.StationChanged -= OnStationChanged;
                _radioService.VolumeChanged -= OnVolumeChanged;
                _radioService.ErrorOccurred -= OnErrorOccurred;
                _radioService.StreamTitleChanged -= OnStreamTitleChanged;
            }

            if (_visualizerTimer != null)
            {
                _visualizerTimer.Stop();
            }
        }

        private void InitVisualizerTimer()
        {
            _visualizerTimer = new DispatcherTimer();
            _visualizerTimer.Interval = TimeSpan.FromMilliseconds(120);
            _visualizerTimer.Tick += (s, e) =>
            {
                if (_radioService.State == RadioPlaybackState.Playing)
                {
                    Bar1.Height = _random.Next(6, 22);
                    Bar2.Height = _random.Next(6, 22);
                    Bar3.Height = _random.Next(6, 22);
                    Bar4.Height = _random.Next(6, 22);
                    Bar5.Height = _random.Next(6, 22);
                }
            };
        }

        private void RefreshHeroUI()
        {
            var station = _radioService.CurrentStation;
            if (station != null)
            {
                HeroIconText.Text = station.IconEmoji;
                HeroStationName.Text = station.Name;
                HeroGenreText.Text = station.Genre;
                HeroDescriptionText.Text = string.IsNullOrWhiteSpace(station.Description) ? station.StreamUrl : station.Description;
            }
            else
            {
                HeroIconText.Text = "📻";
                HeroStationName.Text = "Select a Station";
                HeroGenreText.Text = "Radio";
                HeroDescriptionText.Text = "Choose a station from the list below to start listening.";
            }

            HeroVolumeSlider.Value = _radioService.Volume * 100;
            HeroMuteIcon.Text = _radioService.IsMuted ? "🔇" : "🔊";

            UpdatePlaybackStateUI(_radioService.State);
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
                    VisualizerBars.Visibility = Visibility.Visible;
                    if (_visualizerTimer != null && !_visualizerTimer.IsEnabled) _visualizerTimer.Start();
                    break;

                case RadioPlaybackState.Buffering:
                    HeroPlayBtnText.Text = "\uE823"; // Processing
                    HeroStatusDot.Text = "\uE823";
                    HeroStatusText.Text = "Connecting & Buffering Stream...";
                    HeroStatusText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F59E0B"));
                    VisualizerBars.Visibility = Visibility.Collapsed;
                    if (_visualizerTimer != null) _visualizerTimer.Stop();
                    break;

                case RadioPlaybackState.Paused:
                    HeroPlayBtnText.Text = "\uE768"; // Play
                    HeroStatusDot.Text = "\uE769"; // Pause
                    HeroStatusText.Text = "Paused";
                    HeroStatusText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F59E0B"));
                    VisualizerBars.Visibility = Visibility.Collapsed;
                    if (_visualizerTimer != null) _visualizerTimer.Stop();
                    break;

                case RadioPlaybackState.Error:
                    HeroPlayBtnText.Text = "\uE768"; // Play
                    HeroStatusDot.Text = "\uEA39"; // Error/Cancel
                    HeroStatusText.Text = "Stream Connection Error (Try Editing / Testing Stream URL)";
                    HeroStatusText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#EF4444"));
                    VisualizerBars.Visibility = Visibility.Collapsed;
                    if (_visualizerTimer != null) _visualizerTimer.Stop();
                    break;

                case RadioPlaybackState.Stopped:
                default:
                    HeroPlayBtnText.Text = "\uE768"; // Play
                    HeroStatusDot.Text = "\uE71A"; // Stop
                    HeroStatusText.Text = "Ready to Play";
                    HeroStatusText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#CBD5E1"));
                    VisualizerBars.Visibility = Visibility.Collapsed;
                    if (_visualizerTimer != null) _visualizerTimer.Stop();
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
        }

        private void OnVolumeChanged(double volume, bool isMuted)
        {
            HeroVolumeSlider.Value = volume * 100;
            HeroMuteIcon.Text = isMuted ? "🔇" : "🔊";
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
                    HeroStreamTitleText.Text = "Now Playing: " + title;
                    HeroStreamTitleText.Visibility = Visibility.Visible;
                }
                else
                {
                    HeroStreamTitleText.Visibility = Visibility.Collapsed;
                }
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
