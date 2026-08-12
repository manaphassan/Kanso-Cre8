using System;
using System.Windows.Threading;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    public enum VisualizerMode
    {
        HeroMesh,        // SuamiSihat Hero Mesh animated glowing aura (https://assets.suamisihat.myds.me/)
        SpectrumBars,    // Equalizer multi-bar frequency spectrum
        Waveform,        // Oscilloscope dynamic sine waveform
        PulsatingOrb     // Fluid glowing rhythm orb
    }

    public class RhythmFrameEventArgs : EventArgs
    {
        public double Energy { get; set; }        // 0.0 to 1.0
        public double Bass { get; set; }          // 0.0 to 1.0
        public double Mid { get; set; }           // 0.0 to 1.0
        public double Treble { get; set; }        // 0.0 to 1.0
        public double Phase { get; set; }         // 0 to 2*PI
        public float[] Spectrum { get; set; }     // 16-channel array (0.0 to 1.0)
    }

    public class VisualizerService
    {
        private static VisualizerService _instance;
        public static VisualizerService Instance
        {
            get
            {
                if (_instance == null) _instance = new VisualizerService();
                return _instance;
            }
        }

        private DispatcherTimer _timer;
        private double _phase;
        private float[] _spectrum = new float[16];

        public VisualizerMode CurrentMode { get; private set; }
        public event EventHandler<VisualizerMode> VisualizerModeChanged;
        public event EventHandler<RhythmFrameEventArgs> RhythmTick;

        public VisualizerService()
        {
            CurrentMode = VisualizerMode.HeroMesh;
            LoadPersistedMode();

            _timer = new DispatcherTimer { Interval = TimeSpan.FromMilliseconds(33) }; // ~30 FPS
            _timer.Tick += OnTimerTick;

            // Wire into RadioStreamService
            try
            {
                var radio = RadioStreamService.Instance;
                if (radio != null)
                {
                    radio.PlaybackStateChanged += (state) =>
                    {
                        if (state == RadioPlaybackState.Playing) StartEngine();
                    };
                    if (radio.State == RadioPlaybackState.Playing) StartEngine();
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[VisualizerService] Radio wire error: " + ex.Message); }

            // Always run timer so preview & mesh shimmers gracefully
            StartEngine();
        }

        public void LoadPersistedMode()
        {
            try
            {
                var profile = UserProfileService.LoadProfile();
                if (profile != null && !string.IsNullOrEmpty(profile.VisualizerMode))
                {
                    VisualizerMode mode;
                    if (Enum.TryParse(profile.VisualizerMode, out mode))
                    {
                        CurrentMode = mode;
                    }
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[VisualizerService] LoadPersistedMode: " + ex.Message); }
        }

        public void SetMode(VisualizerMode mode)
        {
            CurrentMode = mode;
            SavePersistedMode();
            if (VisualizerModeChanged != null)
                VisualizerModeChanged(this, mode);
        }

        public VisualizerMode CycleNextMode()
        {
            VisualizerMode next;
            switch (CurrentMode)
            {
                case VisualizerMode.HeroMesh: next = VisualizerMode.SpectrumBars; break;
                case VisualizerMode.SpectrumBars: next = VisualizerMode.Waveform; break;
                case VisualizerMode.Waveform: next = VisualizerMode.PulsatingOrb; break;
                case VisualizerMode.PulsatingOrb: default: next = VisualizerMode.HeroMesh; break;
            }
            SetMode(next);
            return next;
        }

        private void SavePersistedMode()
        {
            try
            {
                var profile = UserProfileService.LoadProfile() ?? new UserProfile();
                profile.VisualizerMode = CurrentMode.ToString();
                UserProfileService.SaveProfile(profile);
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[VisualizerService] SavePersistedMode: " + ex.Message); }
        }

        public void StartEngine()
        {
            if (!_timer.IsEnabled) _timer.Start();
        }

        public void StopEngine()
        {
            if (_timer.IsEnabled) _timer.Stop();
        }

        private void OnTimerTick(object sender, EventArgs e)
        {
            _phase += 0.09;
            if (_phase > Math.PI * 2) _phase -= Math.PI * 2;

            bool isPlaying = false;
            try
            {
                var radio = RadioStreamService.Instance;
                isPlaying = radio != null && radio.State == RadioPlaybackState.Playing;
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[VisualizerService] OnTimerTick check: " + ex.Message); }

            double bass = isPlaying ? 0.45 + 0.5 * Math.Sin(_phase * 2.4) : 0.1;
            double mid = isPlaying ? 0.35 + 0.45 * Math.Cos(_phase * 1.7) : 0.08;
            double treble = isPlaying ? 0.25 + 0.5 * Math.Abs(Math.Sin(_phase * 4.2)) : 0.05;
            double energy = (bass + mid + treble) / 3.0;

            for (int i = 0; i < 16; i++)
            {
                if (isPlaying)
                {
                    double val = 0.25 + 0.75 * Math.Abs(Math.Sin(_phase * (1.1 + i * 0.28)));
                    _spectrum[i] = (float)Math.Min(1.0, Math.Max(0.08, val));
                }
                else
                {
                    _spectrum[i] = Math.Max(0.04f, _spectrum[i] * 0.88f);
                }
            }

            var args = new RhythmFrameEventArgs
            {
                Energy = energy,
                Bass = bass,
                Mid = mid,
                Treble = treble,
                Phase = _phase,
                Spectrum = _spectrum
            };

            if (RhythmTick != null)
                RhythmTick(this, args);
        }
    }
}
