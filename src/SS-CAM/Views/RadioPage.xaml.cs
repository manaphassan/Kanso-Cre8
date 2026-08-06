using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Data;
using System.Windows.Media;
using System.Windows.Threading;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public class InverseBoolToVisibilityConverter : IValueConverter
    {
        public object Convert(object value, Type targetType, object parameter, CultureInfo culture)
        {
            if (value is bool)
            {
                bool b = (bool)value;
                return b ? Visibility.Collapsed : Visibility.Visible;
            }
            return Visibility.Visible;
        }

        public object ConvertBack(object value, Type targetType, object parameter, CultureInfo culture)
        {
            throw new NotImplementedException();
        }
    }

    public partial class RadioPage : Page
    {
        private RadioStreamService _radioService;
        private DispatcherTimer _visualizerTimer;
        private Random _random = new Random();
        private string _activeFilter = "ALL";

        public RadioPage()
        {
            if (!Resources.Contains("InverseBoolToVisibilityConverter"))
            {
                Resources.Add("InverseBoolToVisibilityConverter", new InverseBoolToVisibilityConverter());
            }

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
                    HeroPlayBtnText.Text = "⏸";
                    HeroStatusDot.Text = "🟢 ";
                    HeroStatusText.Text = "Live Stream Playing";
                    HeroStatusText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#10B981"));
                    VisualizerBars.Visibility = Visibility.Visible;
                    if (_visualizerTimer != null && !_visualizerTimer.IsEnabled) _visualizerTimer.Start();
                    break;

                case RadioPlaybackState.Buffering:
                    HeroPlayBtnText.Text = "⏳";
                    HeroStatusDot.Text = "🟡 ";
                    HeroStatusText.Text = "Connecting & Buffering Stream...";
                    HeroStatusText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F59E0B"));
                    VisualizerBars.Visibility = Visibility.Collapsed;
                    if (_visualizerTimer != null) _visualizerTimer.Stop();
                    break;

                case RadioPlaybackState.Paused:
                    HeroPlayBtnText.Text = "▶";
                    HeroStatusDot.Text = "🟡 ";
                    HeroStatusText.Text = "Paused";
                    HeroStatusText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F59E0B"));
                    VisualizerBars.Visibility = Visibility.Collapsed;
                    if (_visualizerTimer != null) _visualizerTimer.Stop();
                    break;

                case RadioPlaybackState.Error:
                    HeroPlayBtnText.Text = "▶";
                    HeroStatusDot.Text = "🔴 ";
                    HeroStatusText.Text = "Stream Connection Error";
                    HeroStatusText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#EF4444"));
                    VisualizerBars.Visibility = Visibility.Collapsed;
                    if (_visualizerTimer != null) _visualizerTimer.Stop();
                    break;

                case RadioPlaybackState.Stopped:
                default:
                    HeroPlayBtnText.Text = "▶";
                    HeroStatusDot.Text = "⏹ ";
                    HeroStatusText.Text = "Stopped";
                    HeroStatusText.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#CBD5E1"));
                    VisualizerBars.Visibility = Visibility.Collapsed;
                    if (_visualizerTimer != null) _visualizerTimer.Stop();
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
            _radioService.IsMuted = !_radioService.IsMuted;
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

        private void OnStationDeleteClicked(object sender, RoutedEventArgs e)
        {
            Button btn = sender as Button;
            if (btn != null && btn.Tag is RadioStation)
            {
                RadioStation station = btn.Tag as RadioStation;
                string msg = string.Format("Delete custom station '{0}'?", station.Name);
                var result = MessageBox.Show(msg, "Confirm Delete", MessageBoxButton.YesNo, MessageBoxImage.Question);
                if (result == MessageBoxResult.Yes)
                {
                    _radioService.DeleteCustomStation(station);
                    ApplyFilter(_activeFilter);
                }
            }
        }

        private void OnAddCustomStationClicked(object sender, RoutedEventArgs e)
        {
            TxtStationName.Text = "";
            TxtStreamUrl.Text = "https://";
            TxtEmoji.Text = "📻";
            TxtDescription.Text = "";
            AddStationModal.Visibility = Visibility.Visible;
        }

        private void OnCloseModalClicked(object sender, RoutedEventArgs e)
        {
            AddStationModal.Visibility = Visibility.Collapsed;
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

            _radioService.AddCustomStation(customStation);
            AddStationModal.Visibility = Visibility.Collapsed;
            ApplyFilter(_activeFilter);

            string successMsg = string.Format("Custom station '{0}' added successfully!", name);
            MessageBox.Show(successMsg, "Station Added", MessageBoxButton.OK, MessageBoxImage.Information);
        }
    }
}
