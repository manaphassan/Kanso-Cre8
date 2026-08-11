using System;
using System.IO;
using System.Media;
using System.Windows;
using System.Windows.Media;

namespace SS_CAM.Services
{
    public static class AudioFeedbackService
    {
        private static MediaPlayer _ambientPlayer;

        private static void EnsureAmbientPlayer()
        {
            if (_ambientPlayer == null)
            {
                _ambientPlayer = new MediaPlayer();

                _ambientPlayer.MediaOpened += (s, e) =>
                {
                    try
                    {
                        if (_ambientPlayer != null)
                        {
                            _ambientPlayer.Volume = 0.95;
                            _ambientPlayer.Play();
                        }
                    }
                    catch { }
                };

                _ambientPlayer.MediaEnded += (s, e) =>
                {
                    try
                    {
                        if (_ambientPlayer != null)
                        {
                            _ambientPlayer.Position = TimeSpan.Zero;
                            _ambientPlayer.Play();
                        }
                    }
                    catch { }
                };
            }
        }

        public static void PlayIntroSound()
        {
            PlayAudioFile("intro.mp3", SystemSounds.Asterisk);
        }

        public static void PlayFocusStartSound()
        {
            PlayAudioFile("notification.mp3", SystemSounds.Asterisk);
        }

        public static void PlayPauseSound()
        {
            PlayAudioFile("pause.mp3", SystemSounds.Exclamation);
        }

        public static void PlayResumeSound()
        {
            PlayAudioFile("resume.mp3", SystemSounds.Asterisk);
        }

        public static void PlayStopSound()
        {
            StopAmbientTrack();
            PlayAudioFile("stop.mp3", SystemSounds.Hand);
        }

        public static void PlayBreakSound()
        {
            PlayAmbientTrack("break.mp3");
        }

        public static void PlayBreathingSound()
        {
            PlayAmbientTrack("breathing.mp3");
        }

        public static void PlayAmbientTrack(string fileName)
        {
            string foundPath = ResolveAudioPath(fileName);
            if (string.IsNullOrEmpty(foundPath) || !File.Exists(foundPath)) return;

            if (Application.Current == null) return;

            Action action = () =>
            {
                try
                {
                    EnsureAmbientPlayer();
                    _ambientPlayer.Stop();
                    _ambientPlayer.Close();

                    Uri audioUri = new Uri(foundPath, UriKind.Absolute);
                    _ambientPlayer.Open(audioUri);
                    _ambientPlayer.Volume = 0.95;
                    _ambientPlayer.Play();
                }
                catch { }
            };

            if (Application.Current.Dispatcher.CheckAccess())
            {
                action();
            }
            else
            {
                Application.Current.Dispatcher.BeginInvoke(action);
            }
        }

        public static void PauseAmbientTrack()
        {
            if (Application.Current == null) return;

            Action action = () =>
            {
                try
                {
                    if (_ambientPlayer != null)
                    {
                        _ambientPlayer.Pause();
                    }
                }
                catch { }
            };

            if (Application.Current.Dispatcher.CheckAccess())
            {
                action();
            }
            else
            {
                Application.Current.Dispatcher.BeginInvoke(action);
            }
        }

        public static void ResumeAmbientTrack()
        {
            if (Application.Current == null) return;

            Action action = () =>
            {
                try
                {
                    if (_ambientPlayer != null)
                    {
                        _ambientPlayer.Play();
                    }
                }
                catch { }
            };

            if (Application.Current.Dispatcher.CheckAccess())
            {
                action();
            }
            else
            {
                Application.Current.Dispatcher.BeginInvoke(action);
            }
        }

        public static void StopAmbientTrack()
        {
            if (Application.Current == null) return;

            Action action = () =>
            {
                try
                {
                    if (_ambientPlayer != null)
                    {
                        _ambientPlayer.Stop();
                        _ambientPlayer.Close();
                        _ambientPlayer = null;
                    }
                }
                catch { }
            };

            if (Application.Current.Dispatcher.CheckAccess())
            {
                action();
            }
            else
            {
                Application.Current.Dispatcher.BeginInvoke(action);
            }
        }

        private static void PlayAudioFile(string fileName, SystemSound fallbackSound)
        {
            try
            {
                string foundPath = ResolveAudioPath(fileName);
                if (!string.IsNullOrEmpty(foundPath) && File.Exists(foundPath))
                {
                    Action action = () =>
                    {
                        try
                        {
                            MediaPlayer sfxPlayer = new MediaPlayer();
                            sfxPlayer.Open(new Uri(foundPath, UriKind.Absolute));
                            sfxPlayer.Volume = 0.95;
                            sfxPlayer.Play();
                        }
                        catch
                        {
                            if (fallbackSound != null) fallbackSound.Play();
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
                else
                {
                    if (fallbackSound != null) fallbackSound.Play();
                }
            }
            catch
            {
                if (fallbackSound != null) fallbackSound.Play();
            }
        }

        private static string ResolveAudioPath(string fileName)
        {
            string payloadDir = PayloadInstallerService.FindPayloadDirectory();
            string localApp = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SuamiSihat");
            string baseDir = AppDomain.CurrentDomain.BaseDirectory;

            string mp3FileName = Path.ChangeExtension(fileName, ".mp3");

            string[] candidatePaths = new[]
            {
                Path.Combine(payloadDir, "Audio", mp3FileName),
                Path.Combine(localApp, "Audio", mp3FileName),
                @"E:\Dev\Projects\SS-Brand-Assets\payload\Audio\" + mp3FileName,
                Path.Combine(baseDir, "payload", "Audio", mp3FileName),
                Path.Combine(baseDir, mp3FileName)
            };

            foreach (string candidate in candidatePaths)
            {
                if (!string.IsNullOrEmpty(candidate) && File.Exists(candidate))
                {
                    return candidate;
                }
            }
            return null;
        }
    }
}
