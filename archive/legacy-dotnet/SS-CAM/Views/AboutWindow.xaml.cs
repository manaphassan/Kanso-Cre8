using System;
using System.Collections.Generic;
using System.IO;
using System.Windows;
using System.Windows.Media;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class AboutWindow : Window
    {
        private MediaPlayer _mediaPlayer;
        private List<string> _playlist = new List<string>();
        private int _currentTrackIndex = 0;

        public AboutWindow()
        {
            InitializeComponent();
            
            string verString = AppVersion.VersionString;
            
            if (TxtVersionBadge != null)
                TxtVersionBadge.Text = string.Format("Version {0} (C# Native WPF)", verString);
                
            if (GroupChangelog != null)
                GroupChangelog.Header = string.Format("v{0} Release Highlights & Changelog", verString);
                
            if (TxtWhatsNew != null)
                TxtWhatsNew.Text = string.Format("✨ What's New in Version {0}:", verString);

            Loaded += OnWindowLoaded;
            Closed += OnWindowClosed;
        }

        private void OnWindowLoaded(object sender, RoutedEventArgs e)
        {
            InitializePlaylist();
            PlayCurrentTrackBackground();
        }

        private void InitializePlaylist()
        {
            _playlist.Clear();

            string payloadDir = PayloadInstallerService.FindPayloadDirectory();
            string localApp = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SuamiSihat");
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;

            string[] searchDirs = new[]
            {
                Path.Combine(payloadDir, "Audio"),
                Path.Combine(localApp, "Audio"),
                Path.Combine(baseDir, "payload", "Audio"),
                payloadDir,
                localApp,
                baseDir
            };

            string[] trackNames = new[] { "SuamiSihatNew", "Ssclinicsong" };
            string[] extensions = new[] { ".m4a", ".mp3", ".wav", ".ogg" };

            foreach (string name in trackNames)
            {
                string foundFile = "";
                foreach (string dir in searchDirs)
                {
                    if (string.IsNullOrEmpty(dir) || !Directory.Exists(dir)) continue;

                    foreach (string ext in extensions)
                    {
                        string candidate = Path.Combine(dir, name + ext);
                        if (File.Exists(candidate))
                        {
                            foundFile = candidate;
                            break;
                        }
                    }
                    if (!string.IsNullOrEmpty(foundFile)) break;
                }

                if (!string.IsNullOrEmpty(foundFile) && !_playlist.Contains(foundFile))
                {
                    _playlist.Add(foundFile);
                }
            }
        }

        private void PlayCurrentTrackBackground()
        {
            if (_playlist.Count == 0) return;

            try
            {
                if (_mediaPlayer == null)
                {
                    _mediaPlayer = new MediaPlayer();
                    _mediaPlayer.MediaEnded += OnMediaEnded;
                }
                else
                {
                    _mediaPlayer.Stop();
                }

                string currentFile = _playlist[_currentTrackIndex];
                _mediaPlayer.Open(new Uri(currentFile, UriKind.Absolute));
                _mediaPlayer.Volume = 0.8;
                _mediaPlayer.Play();
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
        }

        private void OnMediaEnded(object sender, EventArgs e)
        {
            if (_playlist.Count > 0)
            {
                _currentTrackIndex = (_currentTrackIndex + 1) % _playlist.Count;
                PlayCurrentTrackBackground();
            }
        }

        private void OnWindowClosed(object sender, EventArgs e)
        {
            if (_mediaPlayer != null)
            {
                try
                {
                    _mediaPlayer.MediaEnded -= OnMediaEnded;
                    _mediaPlayer.Stop();
                    _mediaPlayer.Close();
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
            }
        }

        public void OnCloseClicked(object sender, RoutedEventArgs e)
        {
            Close();
        }
    }
}
