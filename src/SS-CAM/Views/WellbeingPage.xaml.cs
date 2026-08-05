using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Shapes;
using System.Windows.Threading;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class WellbeingPage : Page
    {
        private readonly WellbeingDataService _dataService;
        private readonly WellbeingTimerService _timer;
        private readonly FatigueRuleEngine _fatigueEngine;
        private readonly DispatcherTimer _uiTimer;
        private readonly DispatcherTimer _animTimer;

        private int _selectedEnergy = 3;
        private int _selectedMood = 3;
        private int _selectedPressure = 3;
        private double _breathingPhase = 0.0;
        private bool _isBreathingMode = false;

        public WellbeingPage()
        {
            InitializeComponent();
            _dataService = new WellbeingDataService();
            _timer = WellbeingTimerService.SharedInstance;
            _fatigueEngine = new FatigueRuleEngine(_dataService);

            _uiTimer = new DispatcherTimer();
            _uiTimer.Interval = TimeSpan.FromSeconds(1);
            _uiTimer.Tick += OnUiTick;
            _uiTimer.Start();

            _animTimer = new DispatcherTimer();
            _animTimer.Interval = TimeSpan.FromMilliseconds(50);
            _animTimer.Tick += OnAnimTick;
            _animTimer.Start();

            Loaded += (s, e) =>
            {
                RefreshMetrics();
                UpdateTimerUI();
                UpdateRadarChart();
            };

            RefreshMetrics();
            UpdateTimerUI();
            UpdateRadarChart();
        }

        private void OnUiTick(object sender, EventArgs e)
        {
            if (_timer.State == WellbeingTimerService.TimerState.Running)
            {
                string status = _timer.Tick();
                if (status == "Completed")
                {
                    AudioFeedbackService.PlayStopSound();
                    _timer.StopSession("Completed");
                    RefreshMetrics();
                    UpdateRadarChart();
                }
            }

            UpdateTimerUI();
            UpdateRadarChart();
        }

        private void OnAnimTick(object sender, EventArgs e)
        {
            DrawBreathingAnimation();
        }

        private void UpdateTimerUI()
        {
            int totalSecs = _timer.GetLiveRemainingSeconds();
            int mins = totalSecs / 60;
            int secs = totalSecs % 60;
            TxtTimerDisplay.Text = string.Format("{0:D2}:{1:D2}", mins, secs);

            if (_timer.State == WellbeingTimerService.TimerState.Ready)
            {
                TxtTimerStatus.Text = "Ready for session";
                TxtBreathingInstruction.Text = "Ready";
                _isBreathingMode = false;
                BtnStartFocus.Visibility = Visibility.Visible;
                BtnPauseFocus.Visibility = Visibility.Collapsed;
                BtnStopFocus.Visibility = Visibility.Collapsed;
            }
            else if (_timer.State == WellbeingTimerService.TimerState.Running)
            {
                TxtTimerStatus.Text = string.Format("Active: {0}", _timer.SessionType);
                if (_timer.SessionType.Contains("Breathing"))
                {
                    _isBreathingMode = true;
                }
                else
                {
                    _isBreathingMode = false;
                    TxtBreathingInstruction.Text = "Focus Flow";
                }
                BtnStartFocus.Visibility = Visibility.Collapsed;
                BtnPauseFocus.Visibility = Visibility.Visible;
                BtnPauseFocus.Content = "Pause";
                BtnStopFocus.Visibility = Visibility.Visible;
            }
            else if (_timer.State == WellbeingTimerService.TimerState.Paused)
            {
                TxtTimerStatus.Text = "Session Paused";
                TxtBreathingInstruction.Text = "Paused";
                _isBreathingMode = false;
                BtnStartFocus.Visibility = Visibility.Collapsed;
                BtnPauseFocus.Visibility = Visibility.Visible;
                BtnPauseFocus.Content = "Resume";
                BtnStopFocus.Visibility = Visibility.Visible;
            }
        }

        private void DrawBreathingAnimation()
        {
            if (BreathingCanvas == null) return;
            BreathingCanvas.Children.Clear();

            double width = BreathingCanvas.Width;
            double height = BreathingCanvas.Height;
            double centerX = width / 2.0;
            double centerY = height / 2.0;

            double radius = 65.0;
            Color circleColor = Color.FromArgb(40, 33, 161, 247);

            if (_isBreathingMode)
            {
                // Box breathing cycle: 16 seconds (Inhale 4s, Hold 4s, Exhale 4s, Hold 4s)
                _breathingPhase += 0.05; // 50ms tick
                if (_breathingPhase >= 16.0) _breathingPhase = 0.0;

                double scale = 0.0;
                if (_breathingPhase < 4.0)
                {
                    // Inhale (0 to 4s) -> Scale 0.0 to 1.0
                    scale = _breathingPhase / 4.0;
                    scale = Math.Sin(scale * Math.PI / 2.0); // Ease out
                    TxtBreathingInstruction.Text = "Inhale... 🫁";
                    circleColor = Color.FromArgb(70, 56, 189, 248); // Sky Blue
                }
                else if (_breathingPhase < 8.0)
                {
                    // Hold Full (4 to 8s) -> Scale 1.0
                    scale = 1.0;
                    TxtBreathingInstruction.Text = "Hold... ⏸️";
                    circleColor = Color.FromArgb(70, 16, 185, 129); // Emerald Green
                }
                else if (_breathingPhase < 12.0)
                {
                    // Exhale (8 to 12s) -> Scale 1.0 to 0.0
                    scale = 1.0 - ((_breathingPhase - 8.0) / 4.0);
                    scale = Math.Sin(scale * Math.PI / 2.0); // Ease in
                    TxtBreathingInstruction.Text = "Exhale... 💨";
                    circleColor = Color.FromArgb(70, 245, 158, 11); // Amber
                }
                else
                {
                    // Hold Empty (12 to 16s) -> Scale 0.0
                    scale = 0.0;
                    TxtBreathingInstruction.Text = "Hold... ⏸️";
                    circleColor = Color.FromArgb(70, 100, 116, 139); // Slate Gray
                }

                radius = 40.0 + (scale * 35.0);
            }
            else
            {
                _breathingPhase = 0.0;
            }

            // Outer Track Circle
            Ellipse outerTrack = new Ellipse
            {
                Width = 150,
                Height = 150,
                Stroke = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#CBD5E1")),
                StrokeThickness = 2,
                StrokeDashArray = new DoubleCollection { 3, 3 }
            };
            Canvas.SetLeft(outerTrack, centerX - 75);
            Canvas.SetTop(outerTrack, centerY - 75);
            BreathingCanvas.Children.Add(outerTrack);

            // Pulsing Inner Breathing Sphere
            Ellipse innerCircle = new Ellipse
            {
                Width = radius * 2,
                Height = radius * 2,
                Fill = new SolidColorBrush(circleColor),
                Stroke = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388")),
                StrokeThickness = 2.5
            };
            Canvas.SetLeft(innerCircle, centerX - radius);
            Canvas.SetTop(innerCircle, centerY - radius);
            BreathingCanvas.Children.Add(innerCircle);
        }

        private void BtnStartFocus_Click(object sender, RoutedEventArgs e)
        {
            AudioFeedbackService.StopAmbientTrack();
            AudioFeedbackService.PlayFocusStartSound();
            _isBreathingMode = false;
            _timer.StartSession(25, "Focus Mode (25m)");
            UpdateTimerUI();
            UpdateRadarChart();
        }

        private void BtnPauseFocus_Click(object sender, RoutedEventArgs e)
        {
            if (_timer.State == WellbeingTimerService.TimerState.Running)
            {
                AudioFeedbackService.PauseAmbientTrack();
                AudioFeedbackService.PlayPauseSound();
                _timer.PauseSession();
            }
            else if (_timer.State == WellbeingTimerService.TimerState.Paused)
            {
                AudioFeedbackService.ResumeAmbientTrack();
                AudioFeedbackService.PlayResumeSound();
                _timer.ResumeSession();
            }

            UpdateTimerUI();
            UpdateRadarChart();
        }

        private void BtnStopFocus_Click(object sender, RoutedEventArgs e)
        {
            AudioFeedbackService.StopAmbientTrack();
            AudioFeedbackService.PlayStopSound();
            _isBreathingMode = false;
            _timer.StopSession("Stopped");
            UpdateTimerUI();
            RefreshMetrics();
            UpdateRadarChart();
        }

        private void BtnBreak5_Click(object sender, RoutedEventArgs e)
        {
            AudioFeedbackService.PlayBreakSound();
            _isBreathingMode = false;
            _timer.StartSession(5, "5-Min Break");
            UpdateTimerUI();
            UpdateRadarChart();
        }

        private void BtnBreathing_Click(object sender, RoutedEventArgs e)
        {
            AudioFeedbackService.PlayBreathingSound();
            _isBreathingMode = true;
            _breathingPhase = 0.0;
            _timer.StartSession(2, "Breathing (2m)");
            UpdateTimerUI();
            UpdateRadarChart();
        }

        private void BtnEnergy_Click(object sender, RoutedEventArgs e)
        {
            Button btn = sender as Button;
            if (btn != null && btn.Tag != null)
            {
                int energy = int.Parse(btn.Tag.ToString());
                _selectedEnergy = energy;
                HighlightEnergyButton(energy);

                WellbeingCheckIn checkin = new WellbeingCheckIn
                {
                    Timestamp = DateTime.Now,
                    EnergyLevel = energy,
                    MoodLevel = _selectedMood,
                    PressureLevel = _selectedPressure
                };

                _dataService.SaveCheckIn(checkin);

                List<FatigueRuleEngine.Recommendation> recs = _fatigueEngine.Evaluate();
                if (recs != null && recs.Count > 0)
                {
                    TxtFatigueRec.Text = string.Format("💡 Suggestion: {0}", recs[0].Message);
                    TxtFatigueRec.Visibility = Visibility.Visible;
                }
                else
                {
                    TxtFatigueRec.Visibility = Visibility.Collapsed;
                }

                UpdateRadarChart();
            }
        }

        private void HighlightEnergyButton(int selected)
        {
            Button[] btns = new[] { BtnE1, BtnE2, BtnE3, BtnE4, BtnE5 };
            for (int i = 0; i < btns.Length; i++)
            {
                if (i + 1 == selected)
                {
                    btns[i].Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"));
                    btns[i].Foreground = Brushes.White;
                }
                else
                {
                    btns[i].Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
                    btns[i].Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
                }
            }
        }

        private void BtnSaveDrop_EndOfDay(object sender, RoutedEventArgs e)
        {
            SaveMindDrop("EndOfDay");
        }

        private void BtnSaveDrop_Session(object sender, RoutedEventArgs e)
        {
            SaveMindDrop("SessionOnly");
        }

        private void SaveMindDrop(string retention)
        {
            string content = TxtMindDrop.Text;
            if (string.IsNullOrWhiteSpace(content)) return;

            _dataService.SaveMindDrop(content, retention);
            TxtMindDrop.Text = "";
            RefreshMetrics();
            MessageBox.Show("Thought drop saved securely to DPAPI encrypted local vault.", "Drop Saved", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void RefreshMetrics()
        {
            WellbeingDayMetrics metrics = _dataService.GetMetricsForDay(DateTime.Today);
            TxtMetricFocus.Text = string.Format("{0}h {1}m", metrics.TotalFocusMinutes / 60, metrics.TotalFocusMinutes % 60);
            TxtMetricSessions.Text = string.Format("{0} completed", metrics.CompletedSessions);
            TxtMetricDrops.Text = string.Format("{0} captured", metrics.MindDropCount);
        }

        // ── Dynamic Interactive Spider / Radar Chart Renderer ───────────
        private void UpdateRadarChart()
        {
            if (RadarCanvas == null) return;
            RadarCanvas.Children.Clear();

            double width = RadarCanvas.Width;
            double height = RadarCanvas.Height;
            double centerX = width / 2.0;
            double centerY = height / 2.0;
            double radius = 95.0;

            string[] axisLabels = new[] { "Energy", "Focus", "Rest", "Pressure", "Flow" };
            int axesCount = axisLabels.Length;

            WellbeingDayMetrics metrics = _dataService.GetMetricsForDay(DateTime.Today);

            double normEnergy = Math.Min(1.0, Math.Max(0.2, _selectedEnergy / 5.0));
            double normFocus = Math.Min(1.0, Math.Max(0.2, metrics.CompletedSessions / 6.0 + 0.3));
            double normRest = Math.Min(1.0, Math.Max(0.2, (metrics.TotalFocusMinutes > 0 ? 0.6 : 0.3)));
            double normPressure = Math.Min(1.0, Math.Max(0.2, (6.0 - _selectedEnergy) / 5.0));
            double normFlow = Math.Min(1.0, Math.Max(0.2, (normEnergy + normFocus) / 2.0));

            double[] values = new[] { normEnergy, normFocus, normRest, normPressure, normFlow };

            // 1. Draw Concentric Web Grids (3 levels)
            for (int level = 1; level <= 3; level++)
            {
                double r = radius * (level / 3.0);
                Polygon webPoly = new Polygon
                {
                    Stroke = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#CBD5E1")),
                    StrokeThickness = 1,
                    StrokeDashArray = new DoubleCollection { 2, 2 }
                };

                for (int i = 0; i < axesCount; i++)
                {
                    double angle = (2 * Math.PI / axesCount) * i - (Math.PI / 2);
                    double x = centerX + r * Math.Cos(angle);
                    double y = centerY + r * Math.Sin(angle);
                    webPoly.Points.Add(new Point(x, y));
                }
                RadarCanvas.Children.Add(webPoly);
            }

            // 2. Draw Axis Lines and Labels
            PointCollection valuePoints = new PointCollection();

            for (int i = 0; i < axesCount; i++)
            {
                double angle = (2 * Math.PI / axesCount) * i - (Math.PI / 2);
                double endX = centerX + radius * Math.Cos(angle);
                double endY = centerY + radius * Math.Sin(angle);

                Line axisLine = new Line
                {
                    X1 = centerX,
                    Y1 = centerY,
                    X2 = endX,
                    Y2 = endY,
                    Stroke = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#94A3B8")),
                    StrokeThickness = 1
                };
                RadarCanvas.Children.Add(axisLine);

                // Label Position
                double labelX = centerX + (radius + 20) * Math.Cos(angle);
                double labelY = centerY + (radius + 14) * Math.Sin(angle);

                TextBlock label = new TextBlock
                {
                    Text = axisLabels[i],
                    FontSize = 11,
                    FontWeight = FontWeights.Bold,
                    Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"))
                };
                Canvas.SetLeft(label, labelX - 18);
                Canvas.SetTop(label, labelY - 8);
                RadarCanvas.Children.Add(label);

                // Calculate Metric Value Point for Polygon
                double valR = radius * values[i];
                double vx = centerX + valR * Math.Cos(angle);
                double vy = centerY + valR * Math.Sin(angle);
                valuePoints.Add(new Point(vx, vy));
            }

            // 3. Draw Polygon Overlay for Values
            Polygon dataPoly = new Polygon
            {
                Points = valuePoints,
                Fill = new SolidColorBrush(Color.FromArgb(90, 33, 161, 247)),
                Stroke = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388")),
                StrokeThickness = 2
            };
            RadarCanvas.Children.Add(dataPoly);

            // 4. Draw Vertex Dots
            foreach (Point pt in valuePoints)
            {
                Ellipse dot = new Ellipse
                {
                    Width = 8,
                    Height = 8,
                    Fill = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#21A1F7")),
                    Stroke = Brushes.White,
                    StrokeThickness = 1.5
                };
                Canvas.SetLeft(dot, pt.X - 4);
                Canvas.SetTop(dot, pt.Y - 4);
                RadarCanvas.Children.Add(dot);
            }
        }
    }
}
