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
using System.Windows.Input;
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

        private class MarsParticle
        {
            public Viewbox Element;
            public double BaseX;
            public double BaseY;
            public double BaseSize;
            public double CurrentX;
            public double CurrentY;
            public double Vx;
            public double Vy;
            public double Speed;
            public double PhaseOffset;
            public double TwinkleSpeed;
            public double TwinkleOffset;
            public double BaseOpacity;
            public double RotationSpeed;
            public RotateTransform Rotation;
            public TranslateTransform Translation;
        }

        private class SSLogoParticle
        {
            public Viewbox Element;
            public double BaseX;
            public double BaseY;
            public double BaseSize;
            public double CurrentX;
            public double Vx;
            public double Speed;
            public double Amplitude;
            public double FloatSpeed;
            public double FloatAmp;
            public double PhaseOffset;
            public TranslateTransform Translation;
        }

        private readonly List<MarsParticle> _marsParticles = new List<MarsParticle>();
        private readonly List<SSLogoParticle> _logoParticles = new List<SSLogoParticle>();
        private bool _symbolsInitialized = false;

        private Point _mousePos = new Point(-1000, -1000);
        private Point _targetMousePos = new Point(-1000, -1000);

        private void OnHeroMeshMouseMove(object sender, MouseEventArgs e)
        {
            if (HeroMeshContainer != null)
                _targetMousePos = e.GetPosition(HeroMeshContainer);
        }

        private void OnHeroMeshMouseLeave(object sender, MouseEventArgs e)
        {
            _targetMousePos = new Point(-1000, -1000);
        }

        private void OnHeroMeshSizeChanged(object sender, SizeChangedEventArgs e)
        {
            try
            {
                if (e.NewSize.Width > 100)
                {
                    if (HeroMeshBackdropCanvas != null)
                    {
                        HeroMeshBackdropCanvas.Width = e.NewSize.Width;
                        HeroMeshBackdropCanvas.Height = e.NewSize.Height;
                    }
                    if (ScatteredSymbolsCanvas != null)
                    {
                        ScatteredSymbolsCanvas.Width = e.NewSize.Width;
                        ScatteredSymbolsCanvas.Height = e.NewSize.Height;
                    }
                    if (ParticleCanvas != null)
                    {
                        ParticleCanvas.Width = e.NewSize.Width;
                        ParticleCanvas.Height = e.NewSize.Height;
                    }
                    if (_marsParticles.Count == 0)
                    {
                        InitializeScatteredMarsSymbols();
                    }
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[RadioPage] OnHeroMeshSizeChanged: " + ex.Message); }
        }

        private void InitializeScatteredMarsSymbols()
        {
            if (ScatteredSymbolsCanvas == null) return;
            if (_symbolsInitialized && _marsParticles.Count > 0) return;
            _symbolsInitialized = true;

            _marsParticles.Clear();
            _logoParticles.Clear();
            ScatteredSymbolsCanvas.Children.Clear();

            double containerWidth = (HeroMeshContainer != null && HeroMeshContainer.ActualWidth > 100) ? HeroMeshContainer.ActualWidth : 1400.0;
            double containerHeight = (HeroMeshContainer != null && HeroMeshContainer.ActualHeight > 50) ? HeroMeshContainer.ActualHeight : 130.0;

            if (HeroMeshBackdropCanvas != null)
            {
                HeroMeshBackdropCanvas.Width = containerWidth;
                HeroMeshBackdropCanvas.Height = containerHeight;
            }
            ScatteredSymbolsCanvas.Width = containerWidth;
            ScatteredSymbolsCanvas.Height = containerHeight;

            Random rand = new Random(42);
            string fullMarsPath = "M 42,68 A 24,24 0 1 1 60,50 M 55,45 L 85,15 M 65,15 L 85,15 L 85,35";
            string shatteredMarsPath = "M 42,68 A 24,24 0 1 1 54,28 M 55,45 L 85,15 M 65,15 L 85,15 L 85,35";
            string[] strokeColors = new string[] { "#21A1F7", "#38BDF8", "#6DC6EC", "#60A5FA", "#FCE53D" };

            // 1. Exactly 69 Scattered Men's Vitality Symbols (♂) (HERO-BANNER-BACKGROUND.md standard)
            const int MEN_SYMBOL_COUNT = 69;
            for (int i = 0; i < MEN_SYMBOL_COUNT; i++)
            {
                double size = 10.0 + rand.NextDouble() * 16.0; // 10px to 26px
                double rotationAngle = rand.NextDouble() * 360.0;
                double rotSpeed = (rand.NextDouble() - 0.5) * 0.04;
                double opacity = 0.35 + rand.NextDouble() * 0.40;
                double x = rand.NextDouble() * containerWidth;
                double y = rand.NextDouble() * containerHeight;
                double vx = (rand.NextDouble() - 0.5) * 0.50;
                double vy = -0.20 - rand.NextDouble() * 0.50; // Upward drift standard

                bool isShattered = (i % 3 == 0);
                string pathData = isShattered ? shatteredMarsPath : fullMarsPath;
                string colorHex = strokeColors[i % strokeColors.Length];

                Viewbox vb = new Viewbox
                {
                    Width = size,
                    Height = size,
                    Opacity = opacity
                };

                Canvas.SetLeft(vb, x);
                Canvas.SetTop(vb, y);

                TransformGroup group = new TransformGroup();
                RotateTransform rotate = new RotateTransform(rotationAngle);
                TranslateTransform translation = new TranslateTransform();
                group.Children.Add(rotate);
                group.Children.Add(translation);
                vb.RenderTransform = group;

                Canvas innerCanvas = new Canvas { Width = 100, Height = 100 };
                System.Windows.Shapes.Path path = new System.Windows.Shapes.Path
                {
                    Data = Geometry.Parse(pathData),
                    Stroke = (Brush)new BrushConverter().ConvertFromString(colorHex),
                    StrokeThickness = 8.0,
                    StrokeStartLineCap = PenLineCap.Round,
                    StrokeEndLineCap = PenLineCap.Round,
                    StrokeLineJoin = PenLineJoin.Round
                };
                innerCanvas.Children.Add(path);
                vb.Child = innerCanvas;

                ScatteredSymbolsCanvas.Children.Add(vb);

                _marsParticles.Add(new MarsParticle
                {
                    Element = vb,
                    BaseX = x,
                    BaseY = y,
                    BaseSize = size,
                    CurrentX = x,
                    CurrentY = y,
                    Vx = vx,
                    Vy = vy,
                    Speed = 0.8 + rand.NextDouble() * 1.2,
                    PhaseOffset = rand.NextDouble() * Math.PI * 2,
                    TwinkleSpeed = 0.01 + rand.NextDouble() * 0.03,
                    TwinkleOffset = rand.NextDouble() * Math.PI * 2,
                    BaseOpacity = opacity,
                    RotationSpeed = rotSpeed,
                    Rotation = rotate,
                    Translation = translation
                });
            }

            // 2. Exactly 6 Floating Official SuamiSihat Logomarks (HERO-BANNER-BACKGROUND.md standard)
            const int LOGOMARK_COUNT = 6;
            string logoPath1 = "M502.876,705.61c11.387,10.993 24.629,18.95 38.659,23.928c23.084,8.125 48.39,8.125 71.501,-0.03l0.027,-0.027c3.572,-1.209 7.031,-2.643 10.488,-4.301l0.03,-0.03c10.121,-4.836 19.652,-11.33 28.144,-19.54c0.505,-0.449 1.012,-0.956 1.491,-1.433c0.477,-0.48 0.982,-0.984 1.434,-1.491c8.21,-8.49 14.704,-18.024 19.539,-28.144c1.661,-3.46 3.122,-6.946 4.331,-10.516l0.028,-0.027c8.154,-23.113 8.154,-48.418 0.027,-71.501c-4.975,-14.032 -12.933,-27.275 -23.925,-38.662c-0.452,-0.504 -0.957,-1.011 -1.434,-1.488l-101.221,-101.221c-13.974,-13.974 -36.636,-13.974 -50.61,-0c-13.468,13.467 -13.945,35.032 -1.434,49.119c0.45,0.507 0.957,1.014 1.434,1.491l101.221,101.219c0.477,0.479 0.984,0.984 1.433,1.491c12.511,14.087 12.034,35.652 -1.433,49.119c-13.975,13.975 -36.636,13.975 -50.611,0l-62.559,-62.559l-50.611,50.61l62.56,62.56c0.479,0.477 0.984,0.984 1.491,1.433";
            string logoPath2 = "M490.954,375.185c23.111,-8.155 48.418,-8.155 71.501,-0.028c14.03,4.975 27.272,12.933 38.659,23.928c0.507,0.449 1.012,0.954 1.491,1.433l38.659,38.66l50.611,-50.611l-38.659,-38.659c-0.48,-0.479 -0.984,-0.984 -1.491,-1.434c-11.387,-10.994 -24.63,-18.952 -38.662,-23.927c-23.083,-8.125 -48.387,-8.125 -71.498,0.027l-0.03,0.03c-3.57,1.209 -7.056,2.67 -10.516,4.329c-10.12,4.835 -19.651,11.331 -28.143,19.541c-0.507,0.45 -1.012,0.955 -1.491,1.434c-0.478,0.477 -0.985,0.984 -1.434,1.489c-8.21,8.492 -14.704,18.023 -19.54,28.146c3.457,-1.659 6.944,-3.122 10.516,-4.329l0.027,-0.029Z";
            string logoPath3 = "M868.833,575.634c-0.023,0.218 -0.048,0.435 -0.071,0.653c-18.065,165.563 -158.344,294.405 -328.714,294.405c-91.316,-0 -173.954,-37.047 -233.795,-96.89l-50.679,50.679c72.847,73.012 173.527,118.246 284.62,118.246c222.041,-0 402.718,-180.675 402.718,-402.715c0,-12.271 -0.576,-24.417 -1.642,-36.398l-80.06,0l0,0.122l-155.407,-0l4.769,4.771c-0,0 29.495,27.187 46.373,67.083l111.819,0l0.069,0.044Z";
            string logoPath4 = "M613.037,729.509c-23.114,8.155 -48.418,8.155 -71.501,0.028c-14.03,-4.976 -27.273,-12.933 -38.659,-23.926c-0.507,-0.449 -1.014,-0.956 -1.492,-1.433l-62.559,-62.56l-50.61,50.608l62.561,62.56c0.478,0.479 0.982,0.984 1.489,1.433c11.387,10.995 24.63,18.95 38.659,23.928c23.086,8.125 48.39,8.125 71.501,-0.028l0.028,-0.029c3.571,-1.209 7.058,-2.67 10.517,-4.329c10.121,-4.838 19.652,-11.33 28.144,-19.542c0.507,-0.449 1.012,-0.954 1.489,-1.433c0.479,-0.478 0.986,-0.984 1.436,-1.491c8.21,-8.49 14.704,-18.021 19.512,-28.117c-3.459,1.661 -6.916,3.095 -10.488,4.304l-0.027,0.027Z";

            for (int k = 0; k < LOGOMARK_COUNT; k++)
            {
                double size = 12.0 + rand.NextDouble() * 16.0; // 12px to 28px
                double opacity = 0.50 + rand.NextDouble() * 0.35;
                double x = (containerWidth / (LOGOMARK_COUNT + 1)) * (k + 1) + (rand.NextDouble() - 0.5) * 80.0;
                double y = rand.NextDouble() * containerHeight;

                Viewbox vb = new Viewbox
                {
                    Width = size,
                    Height = size,
                    Opacity = opacity
                };

                Canvas.SetLeft(vb, x);
                Canvas.SetTop(vb, y);

                TranslateTransform translation = new TranslateTransform();
                vb.RenderTransform = translation;

                Canvas logoCanvas = new Canvas { Width = 1081, Height = 1080 };
                logoCanvas.Children.Add(new System.Windows.Shapes.Path { Data = Geometry.Parse(logoPath1), Fill = (Brush)new BrushConverter().ConvertFromString("#6DC6EC") });
                logoCanvas.Children.Add(new System.Windows.Shapes.Path { Data = Geometry.Parse(logoPath2), Fill = (Brush)new BrushConverter().ConvertFromString("#6DC6EC") });
                logoCanvas.Children.Add(new System.Windows.Shapes.Path { Data = Geometry.Parse(logoPath3), Fill = (Brush)new BrushConverter().ConvertFromString("#6DC6EC") });
                logoCanvas.Children.Add(new System.Windows.Shapes.Path { Data = Geometry.Parse(logoPath4), Fill = (Brush)new BrushConverter().ConvertFromString("#21A1F7") });

                vb.Child = logoCanvas;
                ScatteredSymbolsCanvas.Children.Add(vb);

                _logoParticles.Add(new SSLogoParticle
                {
                    Element = vb,
                    BaseX = x,
                    BaseY = y,
                    BaseSize = size,
                    CurrentX = x,
                    Vx = (rand.NextDouble() - 0.5) * 0.35,
                    Speed = 0.6 + rand.NextDouble() * 0.8,
                    Amplitude = 14.0 + rand.NextDouble() * 18.0,
                    FloatSpeed = 0.8 + rand.NextDouble() * 0.6,
                    FloatAmp = 12.0 + rand.NextDouble() * 10.0,
                    PhaseOffset = rand.NextDouble() * Math.PI * 2,
                    Translation = translation
                });
            }
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
            InitializeScatteredMarsSymbols();
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
            if (HeroMeshBackdropCanvas != null)
                HeroMeshBackdropCanvas.Visibility = Visibility.Visible;

            if (HeroWavePath != null)
            {
                HeroWavePath.Visibility = (mode == VisualizerMode.Waveform) ? Visibility.Visible : Visibility.Collapsed;
                if (HeroWavePath2 != null) HeroWavePath2.Visibility = HeroWavePath.Visibility;
            }

            if (HeroWaterDropPath != null)
            {
                HeroWaterDropPath.Visibility = (mode == VisualizerMode.WaterDrop) ? Visibility.Visible : Visibility.Collapsed;
                if (HeroWaterDropPath2 != null) HeroWaterDropPath2.Visibility = HeroWaterDropPath.Visibility;
            }
        }

        private void OnRhythmTick(object sender, RhythmFrameEventArgs e)
        {
            Dispatcher.BeginInvoke(new Action(() =>
            {
                try
                {
                    var mode = VisualizerService.Instance.CurrentMode;

                    // Audio Signal & Playback State Active Check
                    bool isPlaying = (_radioService != null && _radioService.State == RadioPlaybackState.Playing)
                                     || (RadioStreamService.Instance != null && RadioStreamService.Instance.State == RadioPlaybackState.Playing);

                    // Dynamic Full-Width Canvas Wrapping Bound
                    double canvasWidth = (HeroMeshContainer != null && HeroMeshContainer.ActualWidth > 100)
                        ? HeroMeshContainer.ActualWidth
                        : 1400.0;
                    double canvasHeight = (HeroMeshContainer != null && HeroMeshContainer.ActualHeight > 50)
                        ? HeroMeshContainer.ActualHeight
                        : 130.0;

                    // If not playing, hide all symbols, logos, and shockwaves
                    if (!isPlaying)
                    {
                        if (ScatteredSymbolsCanvas != null) ScatteredSymbolsCanvas.Opacity = 0.0;
                        if (SSLogoCanvas != null) SSLogoCanvas.Opacity = 0.0;
                        if (BassShockwaveRing != null) BassShockwaveRing.Opacity = 0.0;
                    }
                    else
                    {
                        // When playing, reveal symbol and logo backdrop layer
                        if (ScatteredSymbolsCanvas != null) ScatteredSymbolsCanvas.Opacity = 1.0;
                        if (SSLogoCanvas != null) SSLogoCanvas.Opacity = Math.Min(0.85, 0.35 + e.Bass * 0.45);

                        // Mouse Repulsion Force Interpolation
                        _mousePos.X += (_targetMousePos.X - _mousePos.X) * 0.1;
                        _mousePos.Y += (_targetMousePos.Y - _mousePos.Y) * 0.1;

                        // 1. Animate 69 Men's Vitality Symbols (♂) dynamically by song wavelength & beat
                        if (_marsParticles != null && _marsParticles.Count > 0)
                        {
                            double flowSpeed = 0.50 + (e.Energy * 3.0) + (e.Bass * 3.8) + (e.IsKickHit ? 2.5 : 0.0);

                            for (int i = 0; i < _marsParticles.Count; i++)
                            {
                                var p = _marsParticles[i];

                                // 2D Continuous Drift driven by music speed
                                p.CurrentX += p.Vx * flowSpeed;
                                p.CurrentY += p.Vy * flowSpeed;

                                if (p.CurrentY < -30.0)
                                {
                                    p.CurrentY = canvasHeight + 30.0;
                                    p.CurrentX = p.BaseX;
                                }
                                if (p.CurrentX < -30.0) p.CurrentX = canvasWidth + 30.0;
                                if (p.CurrentX > canvasWidth + 30.0) p.CurrentX = -30.0;

                                // Mouse Push Repulsion
                                double dxMouse = p.CurrentX - _mousePos.X;
                                double dyMouse = p.CurrentY - _mousePos.Y;
                                double dist = Math.Sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
                                double pushX = 0, pushY = 0;
                                if (dist < 140.0 && dist > 0.0)
                                {
                                    double force = (140.0 - dist) / 140.0;
                                    pushX = (dxMouse / dist) * force * 20.0;
                                    pushY = (dyMouse / dist) * force * 20.0;
                                }

                                // Dynamic vertical motion driven by song wavelength & frequency peaks
                                double songWavelength = 0.012;
                                double dyWave = Math.Sin(e.Phase * (1.8 + e.Mid * 2.5) + (p.CurrentX * songWavelength) + p.PhaseOffset) * (8.0 + (e.Bass * 28.0) + (e.IsBassHit ? 16.0 : 0.0));

                                Canvas.SetLeft(p.Element, p.CurrentX + pushX);
                                Canvas.SetTop(p.Element, p.CurrentY + dyWave + pushY);

                                // Rotation speed reacting to song treble & mid-frequency beats
                                p.Rotation.Angle += p.RotationSpeed * (1.0 + (e.Treble * 3.8) + (e.Mid * 2.5));

                                // Particle scale pulse on bass hits
                                double scale = 1.0 + (e.IsBassHit ? 0.35 : e.Bass * 0.22);
                                p.Element.Width = p.BaseSize * scale;
                                p.Element.Height = p.BaseSize * scale;

                                // Particle opacity reacting to loudness / beat energy
                                double twinkleOpacity = Math.Max(0.20, Math.Min(0.95, p.BaseOpacity + (e.Bass * 0.40) + (e.Treble * 0.20)));
                                p.Element.Opacity = twinkleOpacity;
                            }
                        }

                        // 2. Animate 6 Floating Official SuamiSihat Logomarks dynamically by song wavelength & beat
                        if (_logoParticles != null && _logoParticles.Count > 0)
                        {
                            double logoFlow = 0.40 + (e.Energy * 2.5) + (e.Bass * 3.2);

                            for (int k = 0; k < _logoParticles.Count; k++)
                            {
                                var lp = _logoParticles[k];

                                lp.CurrentX += lp.Vx * logoFlow;
                                lp.BaseY += -0.22 * logoFlow;

                                if (lp.BaseY < -40.0) lp.BaseY = canvasHeight + 40.0;
                                if (lp.CurrentX < -40.0) lp.CurrentX = canvasWidth + 40.0;
                                if (lp.CurrentX > canvasWidth + 40.0) lp.CurrentX = -40.0;

                                // Mouse Push Repulsion
                                double dxLogo = lp.CurrentX - _mousePos.X;
                                double dyLogoMouse = lp.BaseY - _mousePos.Y;
                                double distLogo = Math.Sqrt(dxLogo * dxLogo + dyLogoMouse * dyLogoMouse);
                                double pushXLogo = 0, pushYLogo = 0;
                                if (distLogo < 160.0 && distLogo > 0.0)
                                {
                                    double forceLogo = (160.0 - distLogo) / 160.0;
                                    pushXLogo = (dxLogo / distLogo) * forceLogo * 25.0;
                                    pushYLogo = (dyLogoMouse / distLogo) * forceLogo * 25.0;
                                }

                                // Dynamic vertical motion driven by song wavelength
                                double logoWave = Math.Sin(e.Phase * (1.4 + e.Mid * 2.0) + (lp.CurrentX * 0.008) + lp.PhaseOffset) * (lp.FloatAmp + (e.Bass * 30.0) + (e.IsBassHit ? 18.0 : 0.0));

                                Canvas.SetLeft(lp.Element, lp.CurrentX + pushXLogo);
                                Canvas.SetTop(lp.Element, lp.BaseY + logoWave + pushYLogo);

                                // Pulsing logo scale on bass kicks
                                double logoScale = 1.0 + (e.IsBassHit ? 0.30 : e.Bass * 0.20);
                                lp.Element.Width = lp.BaseSize * logoScale;
                                lp.Element.Height = lp.BaseSize * logoScale;

                                // Opacity reacting to bass hits
                                lp.Element.Opacity = Math.Max(0.30, Math.Min(0.90, 0.45 + (e.Bass * 0.40)));
                            }
                        }
                    }

                    // 1. Hero Mesh Mode-Specific Backdrop Animations
                    if (mode == VisualizerMode.HeroMesh)
                    {
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

                        // Transient Bass Shockwave Ring Ripple
                        if (BassShockwaveRing != null && ShockwaveScale != null && isPlaying)
                        {
                            if (e.IsBassHit)
                            {
                                BassShockwaveRing.Opacity = 0.85;
                                ShockwaveScale.ScaleX = 1.0;
                                ShockwaveScale.ScaleY = 1.0;
                            }
                            else if (BassShockwaveRing.Opacity > 0.02)
                            {
                                BassShockwaveRing.Opacity *= 0.86;
                                ShockwaveScale.ScaleX += 0.06;
                                ShockwaveScale.ScaleY += 0.06;
                            }
                        }

                        // Floating Spark Particles Shimmering Motion
                        if (Spark1 != null) Spark1.Opacity = 0.3 + 0.6 * Math.Abs(Math.Sin(e.Phase * 1.5));
                        if (Spark2 != null) Spark2.Opacity = 0.4 + 0.5 * Math.Abs(Math.Cos(e.Phase * 2.1));
                        if (Spark3 != null) Spark3.Opacity = 0.2 + 0.7 * Math.Abs(Math.Sin(e.Phase * 3.2));
                        if (Spark4 != null) Spark4.Opacity = 0.3 + 0.5 * Math.Abs(Math.Cos(e.Phase * 1.8));
                        if (Spark5 != null) Spark5.Opacity = 0.4 + 0.6 * Math.Abs(Math.Sin(e.Phase * 2.7));
                        if (Spark6 != null) Spark6.Opacity = 0.5 + 0.5 * Math.Abs(Math.Cos(e.Phase * 3.5));

                        if (HeroMeshStop2 != null)
                        {
                            byte r = (byte)(30 + e.Energy * 40);
                            byte g = (byte)(45 + e.Bass * 80);
                            byte b = (byte)(90 + e.Treble * 120);
                            HeroMeshStop2.Color = Color.FromRgb(r, g, b);
                        }
                    }

                    // 2. Studio Mode-Specific Visualizer Animations
                    if (mode == VisualizerMode.WaterDrop && HeroWaterDropPath != null)
                    {
                        // Render dynamic Concentric Liquid Water Drop Ripple Line Paths
                        double centerX = 260.0;
                        double centerY = 125.0;
                        double baseRadius = 25.0 + e.Energy * 45.0;
                        int pts = 36;
                        double angleStep = Math.PI * 2.0 / pts;

                        StreamGeometry geomDrop1 = new StreamGeometry();
                        using (StreamGeometryContext ctx = geomDrop1.Open())
                        {
                            double r0 = baseRadius + Math.Sin(e.Phase * 2.0) * (8.0 * e.Bass);
                            Point startPt = new Point(centerX + r0, centerY);
                            ctx.BeginFigure(startPt, true, true);
                            for (int i = 1; i <= pts; i++)
                            {
                                double angle = i * angleStep;
                                double r = baseRadius + Math.Sin(angle * 4.0 + e.Phase * 3.0) * (10.0 * e.Bass);
                                double x = centerX + r * Math.Cos(angle);
                                double y = centerY + r * Math.Sin(angle) * 0.70;
                                ctx.LineTo(new Point(x, y), true, false);
                            }
                        }
                        geomDrop1.Freeze();
                        HeroWaterDropPath.Data = geomDrop1;

                        if (HeroWaterDropPath2 != null)
                        {
                            double baseRadius2 = baseRadius * 1.55;
                            StreamGeometry geomDrop2 = new StreamGeometry();
                            using (StreamGeometryContext ctx = geomDrop2.Open())
                            {
                                double r0 = baseRadius2 + Math.Cos(e.Phase * 1.5) * (6.0 * e.Mid);
                                Point startPt = new Point(centerX + r0, centerY);
                                ctx.BeginFigure(startPt, true, true);
                                for (int i = 1; i <= pts; i++)
                                {
                                    double angle = i * angleStep;
                                    double r = baseRadius2 + Math.Cos(angle * 3.0 + e.Phase * 2.5) * (8.0 * e.Mid);
                                    double x = centerX + r * Math.Cos(angle);
                                    double y = centerY + r * Math.Sin(angle) * 0.65;
                                    ctx.LineTo(new Point(x, y), true, false);
                                }
                            }
                            geomDrop2.Freeze();
                            HeroWaterDropPath2.Data = geomDrop2;
                        }
                    }
                    else if (mode == VisualizerMode.Waveform && HeroWavePath != null)
                    {
                        // Render Dual Intersecting 3D Ribbon Curves across hero banner
                        double w = 360.0;
                        double h = 40.0;
                        int pts = 28;
                        double step = w / (pts - 1);

                        StreamGeometry geom1 = new StreamGeometry();
                        using (StreamGeometryContext ctx = geom1.Open())
                        {
                            Point startPt = new Point(0, h / 2.0 + Math.Sin(e.Phase) * 12.0 * e.Bass);
                            ctx.BeginFigure(startPt, false, false);
                            for (int i = 1; i < pts; i++)
                            {
                                double x = i * step;
                                double y = h / 2.0 + Math.Sin(e.Phase + i * 0.38) * (14.0 * e.Bass);
                                ctx.LineTo(new Point(x, y), true, false);
                            }
                        }
                        geom1.Freeze();
                        HeroWavePath.Data = geom1;

                        if (HeroWavePath2 != null)
                        {
                            StreamGeometry geom2 = new StreamGeometry();
                            using (StreamGeometryContext ctx = geom2.Open())
                            {
                                Point startPt = new Point(0, h / 2.0 + Math.Cos(e.Phase * 1.3) * 10.0 * e.Mid);
                                ctx.BeginFigure(startPt, false, false);
                                for (int i = 1; i < pts; i++)
                                {
                                    double x = i * step;
                                    double y = h / 2.0 + Math.Cos(e.Phase * 1.3 + i * 0.42) * (12.0 * e.Mid);
                                    ctx.LineTo(new Point(x, y), true, false);
                                }
                            }
                            geom2.Freeze();
                            HeroWavePath2.Data = geom2;
                        }
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
