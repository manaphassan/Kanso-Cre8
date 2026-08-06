using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Windows;
using System.Windows.Media;
using Newtonsoft.Json;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    public class RadioConfigData
    {
        public string LastStationId { get; set; }
        public double Volume { get; set; }
        public bool IsMuted { get; set; }
        public List<RadioStation> CustomStations { get; set; }
        public List<string> FavoriteStationIds { get; set; }

        public RadioConfigData()
        {
            Volume = 0.8;
            IsMuted = false;
            CustomStations = new List<RadioStation>();
            FavoriteStationIds = new List<string>();
        }
    }

    public enum RadioPlaybackState
    {
        Stopped,
        Buffering,
        Playing,
        Paused,
        Error
    }

    public class RadioStreamService
    {
        private static RadioStreamService _instance;
        public static RadioStreamService Instance
        {
            get
            {
                if (_instance == null)
                {
                    _instance = new RadioStreamService();
                }
                return _instance;
            }
        }

        private MediaPlayer _mediaPlayer;
        private readonly string _configFilePath;
        private RadioConfigData _config;

        public event Action<RadioPlaybackState> PlaybackStateChanged;
        public event Action<RadioStation> StationChanged;
        public event Action<double, bool> VolumeChanged;
        public event Action<string> ErrorOccurred;

        public RadioPlaybackState State { get; private set; }
        public RadioStation CurrentStation { get; private set; }
        public List<RadioStation> AllStations { get; private set; }

        public double Volume
        {
            get
            {
                return _config != null ? _config.Volume : 0.8;
            }
            set
            {
                if (_config != null)
                {
                    _config.Volume = Math.Max(0.0, Math.Min(1.0, value));
                    if (_mediaPlayer != null && !_config.IsMuted)
                    {
                        _mediaPlayer.Volume = _config.Volume;
                    }
                    SaveConfig();
                    if (VolumeChanged != null)
                    {
                        VolumeChanged(_config.Volume, _config.IsMuted);
                    }
                }
            }
        }

        public bool IsMuted
        {
            get
            {
                return _config != null && _config.IsMuted;
            }
            set
            {
                if (_config != null)
                {
                    _config.IsMuted = value;
                    if (_mediaPlayer != null)
                    {
                        _mediaPlayer.Volume = _config.IsMuted ? 0.0 : _config.Volume;
                    }
                    SaveConfig();
                    if (VolumeChanged != null)
                    {
                        VolumeChanged(_config.Volume, _config.IsMuted);
                    }
                }
            }
        }

        public RadioStreamService()
        {
            State = RadioPlaybackState.Stopped;
            AllStations = new List<RadioStation>();

            string appData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            string ssDir = Path.Combine(appData, "SuamiSihat");
            if (!Directory.Exists(ssDir))
            {
                Directory.CreateDirectory(ssDir);
            }
            _configFilePath = Path.Combine(ssDir, "radio_config.json");

            InitMediaPlayer();
            LoadStations();
        }

        private void InitMediaPlayer()
        {
            _mediaPlayer = new MediaPlayer();

            _mediaPlayer.MediaOpened += (s, e) =>
            {
                SetState(RadioPlaybackState.Playing);
            };

            _mediaPlayer.MediaEnded += (s, e) =>
            {
                SetState(RadioPlaybackState.Stopped);
            };

            _mediaPlayer.MediaFailed += (s, e) =>
            {
                SetState(RadioPlaybackState.Error);
                string errMsg = e.ErrorException != null ? e.ErrorException.Message : "Stream connection failed";
                if (ErrorOccurred != null)
                {
                    ErrorOccurred(errMsg);
                }
            };
        }

        private void LoadStations()
        {
            List<RadioStation> presets = GetPresetStations();
            _config = LoadConfig();

            AllStations = new List<RadioStation>(presets);
            if (_config.CustomStations != null && _config.CustomStations.Count > 0)
            {
                AllStations.AddRange(_config.CustomStations);
            }

            if (_config.FavoriteStationIds != null)
            {
                foreach (var station in AllStations)
                {
                    station.IsFavorite = _config.FavoriteStationIds.Contains(station.Id);
                }
            }

            if (!string.IsNullOrEmpty(_config.LastStationId))
            {
                CurrentStation = AllStations.FirstOrDefault(s => s.Id == _config.LastStationId);
            }

            if (CurrentStation == null && AllStations.Count > 0)
            {
                CurrentStation = AllStations[0];
            }
        }

        public static List<RadioStation> GetPresetStations()
        {
            return new List<RadioStation>
            {
                new RadioStation
                {
                    Id = "preset_bfm899",
                    Name = "BFM 89.9",
                    Genre = "Talk / News",
                    StreamUrl = "https://stream.bfm.my/stream",
                    IconEmoji = "🎙️",
                    IsPreset = true,
                    Description = "The Business Station — News, interviews, and intellectual discussion."
                },
                new RadioStation
                {
                    Id = "preset_lofigirl",
                    Name = "Lofi Focus Beats",
                    Genre = "Focus / Lo-Fi",
                    StreamUrl = "https://stream.zeno.fm/f3vkgv1y64zuv",
                    IconEmoji = "🎧",
                    IsPreset = true,
                    Description = "Chillhop lo-fi beats to relax and study/code to."
                },
                new RadioStation
                {
                    Id = "preset_jazzfocus",
                    Name = "Smooth Jazz Workstation",
                    Genre = "Jazz / Chill",
                    StreamUrl = "https://stream.zeno.fm/7c37n8puv0hvv",
                    IconEmoji = "🎷",
                    IsPreset = true,
                    Description = "Smooth instrumental jazz for deep concentration."
                },
                new RadioStation
                {
                    Id = "preset_hitzfm",
                    Name = "Hitz FM",
                    Genre = "Pop / Hits",
                    StreamUrl = "https://astro1.prod.mobi/hitz/hitz.m3u8",
                    IconEmoji = "📻",
                    IsPreset = true,
                    Description = "Malaysia's #1 English Hit Station."
                },
                new RadioStation
                {
                    Id = "preset_erafm",
                    Name = "Era FM",
                    Genre = "Malay Pop",
                    StreamUrl = "https://astro1.prod.mobi/era/era.m3u8",
                    IconEmoji = "🎵",
                    IsPreset = true,
                    Description = "Muzik Hit Terbaik — Top Malay pop hits."
                },
                new RadioStation
                {
                    Id = "preset_hotfm",
                    Name = "Hot FM",
                    Genre = "Malay Pop",
                    StreamUrl = "https://mp3.mp3cast.my/hotfm.mp3",
                    IconEmoji = "🔥",
                    IsPreset = true,
                    Description = "Yang Hangat dan Terbaik — Top hits and entertainment."
                },
                new RadioStation
                {
                    Id = "preset_suriafm",
                    Name = "Suria FM",
                    Genre = "Malay Pop",
                    StreamUrl = "https://mp3.mp3cast.my/suria.mp3",
                    IconEmoji = "☀️",
                    IsPreset = true,
                    Description = "Muzik Hit Sentiasa — Classic and modern Malay hits."
                },
                new RadioStation
                {
                    Id = "preset_thrraga",
                    Name = "THR Raaga",
                    Genre = "Pop / Hits",
                    StreamUrl = "https://astro1.prod.mobi/raaga/raaga.m3u8",
                    IconEmoji = "🎶",
                    IsPreset = true,
                    Description = "Malaysia's leading Tamil music station."
                }
            };
        }

        public void PlayStation(RadioStation station)
        {
            if (station == null || string.IsNullOrWhiteSpace(station.StreamUrl)) return;

            CurrentStation = station;
            _config.LastStationId = station.Id;
            SaveConfig();

            if (StationChanged != null)
            {
                StationChanged(CurrentStation);
            }
            SetState(RadioPlaybackState.Buffering);

            Action action = () =>
            {
                try
                {
                    _mediaPlayer.Stop();
                    _mediaPlayer.Close();

                    Uri streamUri = new Uri(station.StreamUrl, UriKind.Absolute);
                    _mediaPlayer.Open(streamUri);
                    _mediaPlayer.Volume = _config.IsMuted ? 0.0 : _config.Volume;
                    _mediaPlayer.Play();
                }
                catch (Exception ex)
                {
                    SetState(RadioPlaybackState.Error);
                    if (ErrorOccurred != null)
                    {
                        ErrorOccurred("Failed to play station: " + ex.Message);
                    }
                }
            };

            if (Application.Current != null && !Application.Current.Dispatcher.CheckAccess())
            {
                Application.Current.Dispatcher.BeginInvoke(action);
            }
            else
            {
                action();
            }
        }

        public void TogglePlayPause()
        {
            if (State == RadioPlaybackState.Playing || State == RadioPlaybackState.Buffering)
            {
                Pause();
            }
            else
            {
                if (CurrentStation != null)
                {
                    PlayStation(CurrentStation);
                }
                else if (AllStations.Count > 0)
                {
                    PlayStation(AllStations[0]);
                }
            }
        }

        public void Pause()
        {
            Action action = () =>
            {
                try
                {
                    _mediaPlayer.Pause();
                    SetState(RadioPlaybackState.Paused);
                }
                catch { }
            };

            if (Application.Current != null && !Application.Current.Dispatcher.CheckAccess())
            {
                Application.Current.Dispatcher.BeginInvoke(action);
            }
            else
            {
                action();
            }
        }

        public void Stop()
        {
            Action action = () =>
            {
                try
                {
                    _mediaPlayer.Stop();
                    _mediaPlayer.Close();
                    SetState(RadioPlaybackState.Stopped);
                }
                catch { }
            };

            if (Application.Current != null && !Application.Current.Dispatcher.CheckAccess())
            {
                Application.Current.Dispatcher.BeginInvoke(action);
            }
            else
            {
                action();
            }
        }

        public void ToggleFavorite(RadioStation station)
        {
            if (station == null) return;

            station.IsFavorite = !station.IsFavorite;

            if (_config.FavoriteStationIds == null)
            {
                _config.FavoriteStationIds = new List<string>();
            }

            if (station.IsFavorite)
            {
                if (!_config.FavoriteStationIds.Contains(station.Id))
                {
                    _config.FavoriteStationIds.Add(station.Id);
                }
            }
            else
            {
                _config.FavoriteStationIds.Remove(station.Id);
            }

            SaveConfig();
        }

        public void AddCustomStation(RadioStation customStation)
        {
            if (customStation == null) return;

            if (_config.CustomStations == null)
            {
                _config.CustomStations = new List<RadioStation>();
            }

            _config.CustomStations.Add(customStation);
            AllStations.Add(customStation);
            SaveConfig();
        }

        public void DeleteCustomStation(RadioStation customStation)
        {
            if (customStation == null || customStation.IsPreset) return;

            if (CurrentStation != null && CurrentStation.Id == customStation.Id)
            {
                Stop();
            }

            if (_config.CustomStations != null)
            {
                _config.CustomStations.RemoveAll(s => s.Id == customStation.Id);
            }
            AllStations.RemoveAll(s => s.Id == customStation.Id);
            SaveConfig();
        }

        private void SetState(RadioPlaybackState state)
        {
            State = state;
            if (Application.Current != null && !Application.Current.Dispatcher.CheckAccess())
            {
                Application.Current.Dispatcher.BeginInvoke(new Action(() =>
                {
                    if (PlaybackStateChanged != null)
                    {
                        PlaybackStateChanged(State);
                    }
                }));
            }
            else
            {
                if (PlaybackStateChanged != null)
                {
                    PlaybackStateChanged(State);
                }
            }
        }

        private RadioConfigData LoadConfig()
        {
            try
            {
                if (File.Exists(_configFilePath))
                {
                    string json = File.ReadAllText(_configFilePath);
                    return JsonConvert.DeserializeObject<RadioConfigData>(json) ?? new RadioConfigData();
                }
            }
            catch { }
            return new RadioConfigData();
        }

        private void SaveConfig()
        {
            try
            {
                string json = JsonConvert.SerializeObject(_config, Formatting.Indented);
                File.WriteAllText(_configFilePath, json);
            }
            catch { }
        }
    }
}
