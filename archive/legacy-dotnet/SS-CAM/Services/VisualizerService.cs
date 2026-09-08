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
        WaterDrop        // Concentric liquid water drop ripple path
    }

    public class RhythmFrameEventArgs : EventArgs
    {
        public double Energy { get; set; }        // 0.0 to 1.0
        public double Bass { get; set; }          // 0.0 to 1.0
        public double Mid { get; set; }           // 0.0 to 1.0
        public double Treble { get; set; }        // 0.0 to 1.0
        public double Phase { get; set; }         // 0 to 2*PI
        public float[] Spectrum { get; set; }     // 16-channel array (0.0 to 1.0)
        public float[] PeakLevels { get; set; }   // Floating peak hold caps (0.0 to 1.0)
        public bool IsBassHit { get; set; }       // Transient kick/bass drop trigger
        public bool IsKickHit { get; set; }       // Sub-bass kick impulse
        public bool IsSnareHit { get; set; }      // Mid-range snare impulse
        public bool IsTrebleHit { get; set; }     // Air & hi-hat sparkle impulse
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
        private float[] _peakLevels = new float[16];
        private int[] _peakHoldCounters = new int[16];
        private double _lastBass = 0;
        private double _lastMid = 0;
        private double _lastTreble = 0;
        private double _agcGain = 1.0;

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
                case VisualizerMode.Waveform: next = VisualizerMode.WaterDrop; break;
                case VisualizerMode.WaterDrop: default: next = VisualizerMode.HeroMesh; break;
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
            double[] realProxySpec = null;
            try
            {
                var radio = RadioStreamService.Instance;
                isPlaying = radio != null && radio.State == RadioPlaybackState.Playing;
                if (isPlaying && radio.LocalProxy != null)
                {
                    realProxySpec = radio.LocalProxy.CurrentSpectrumData;
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[VisualizerService] OnTimerTick check: " + ex.Message); }

            double bass = isPlaying ? 0.45 + 0.5 * Math.Sin(_phase * 2.4) : 0.1;
            double mid = isPlaying ? 0.35 + 0.45 * Math.Cos(_phase * 1.7) : 0.08;
            double treble = isPlaying ? 0.25 + 0.5 * Math.Abs(Math.Sin(_phase * 4.2)) : 0.05;
            double energy = (bass + mid + treble) / 3.0;

            bool isBassHit = (bass - _lastBass) > 0.38;
            bool isKickHit = (bass - _lastBass) > 0.30;
            bool isSnareHit = (mid - _lastMid) > 0.28;
            bool isTrebleHit = (treble - _lastTreble) > 0.32;

            _lastBass = bass;
            _lastMid = mid;
            _lastTreble = treble;

            for (int i = 0; i < 16; i++)
            {
                float targetVal = 0.04f;
                if (isPlaying)
                {
                    if (realProxySpec != null && realProxySpec.Length > i)
                    {
                        // Logarithmic Mel-scale frequency mapping
                        int srcIdx = (int)Math.Min(realProxySpec.Length - 1, Math.Pow((double)i / 15.0, 1.8) * (realProxySpec.Length - 1));
                        targetVal = (float)Math.Min(1.0, Math.Max(0.06, realProxySpec[srcIdx] * _agcGain));
                    }
                    else
                    {
                        double val = 0.25 + 0.75 * Math.Abs(Math.Sin(_phase * (1.1 + i * 0.28)));
                        targetVal = (float)Math.Min(1.0, Math.Max(0.08, val));
                    }
                }

                // Studio VU Ballistics (Fast Attack + Exponential Release)
                if (targetVal > _spectrum[i])
                {
                    _spectrum[i] = _spectrum[i] * 0.3f + targetVal * 0.7f; // Fast attack
                }
                else
                {
                    _spectrum[i] = _spectrum[i] * 0.82f + targetVal * 0.18f; // Exponential decay
                }

                // Studio Peak Hold Logic
                if (_spectrum[i] >= _peakLevels[i])
                {
                    _peakLevels[i] = _spectrum[i];
                    _peakHoldCounters[i] = 10; // Hold peak for 10 frames (~330ms)
                }
                else
                {
                    if (_peakHoldCounters[i] > 0)
                    {
                        _peakHoldCounters[i]--;
                    }
                    else
                    {
                        _peakLevels[i] = Math.Max(_spectrum[i], _peakLevels[i] * 0.90f); // Smooth peak fall-off
                    }
                }
            }

            var args = new RhythmFrameEventArgs
            {
                Energy = energy,
                Bass = bass,
                Mid = mid,
                Treble = treble,
                Phase = _phase,
                Spectrum = _spectrum,
                PeakLevels = _peakLevels,
                IsBassHit = isBassHit,
                IsKickHit = isKickHit,
                IsSnareHit = isSnareHit,
                IsTrebleHit = isTrebleHit
            };

            if (RhythmTick != null)
                RhythmTick(this, args);
        }
    }
}
