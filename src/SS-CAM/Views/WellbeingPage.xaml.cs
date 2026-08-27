using System;
using System.Collections.Generic;
using System.Linq;
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

        // Hydration Tracker State (Goal: 2,000 mL / 8 Cups)
        private int _waterIntakeMl = 0;
        private readonly int _waterGoalMl = 2000;
        private double _waterWavePhase = 0.0;

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

        public WellbeingPage()
        {
            InitializeComponent();
            try
            {
                _dataService = new WellbeingDataService();
                _timer = WellbeingTimerService.SharedInstance;
                _fatigueEngine = new FatigueRuleEngine(_dataService);

                _uiTimer = new DispatcherTimer();
                _uiTimer.Interval = TimeSpan.FromSeconds(1);
                _uiTimer.Tick += OnUiTick;

                _animTimer = new DispatcherTimer();
                _animTimer.Interval = TimeSpan.FromMilliseconds(50);
                _animTimer.Tick += OnAnimTick;

                Loaded += (s, e) =>
                {
                    try
                    {
                        if (_uiTimer != null && !_uiTimer.IsEnabled) _uiTimer.Start();
                        if (_animTimer != null && !_animTimer.IsEnabled) _animTimer.Start();

                        if (_dataService != null)
                        {
                            _waterIntakeMl = _dataService.GetHydrationForDay(DateTime.Today);
                        }
                        RefreshMetrics();
                        UpdateTimerUI();
                        UpdateWaterIntakeUI(saveToDisk: false);
                        UpdateRadarChart();
                        RefreshMindDropsList();
                        RenderHeatmap();
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine("[WellbeingPage] Loaded error: " + ex.Message);
                    }
                };

                Unloaded += (s, e) =>
                {
                    try
                    {
                        if (_uiTimer != null) _uiTimer.Stop();
                        if (_animTimer != null) _animTimer.Stop();
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine("[WellbeingPage] Unloaded error: " + ex.Message);
                    }
                };
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[WellbeingPage] Constructor error: " + ex.Message);
            }
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
                    RenderHeatmap();
                }
            }

            UpdateTimerUI();
            UpdateRadarChart();
        }

        private void OnAnimTick(object sender, EventArgs e)
        {
            DrawBreathingAnimation();
            DrawWaterWaveAnimation();
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
            Color circleColor = Color.FromArgb(40, 99, 102, 241);

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
                    TxtBreathingInstruction.Text = "Inhale...";
                    circleColor = Color.FromArgb(80, 56, 189, 248); // Sky Blue
                }
                else if (_breathingPhase < 8.0)
                {
                    // Hold Full (4 to 8s) -> Scale 1.0
                    scale = 1.0;
                    TxtBreathingInstruction.Text = "Hold...";
                    circleColor = Color.FromArgb(80, 16, 185, 129); // Emerald Green
                }
                else if (_breathingPhase < 12.0)
                {
                    // Exhale (8 to 12s) -> Scale 1.0 to 0.0
                    scale = 1.0 - ((_breathingPhase - 8.0) / 4.0);
                    scale = Math.Sin(scale * Math.PI / 2.0); // Ease in
                    TxtBreathingInstruction.Text = "Exhale...";
                    circleColor = Color.FromArgb(80, 245, 158, 11); // Amber
                }
                else
                {
                    // Hold Empty (12 to 16s) -> Scale 0.0
                    scale = 0.0;
                    TxtBreathingInstruction.Text = "Hold...";
                    circleColor = Color.FromArgb(80, 139, 92, 246); // Purple
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
                Stroke = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#475569")),
                StrokeThickness = 2,
                StrokeDashArray = new DoubleCollection { 4, 3 }
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
                Stroke = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#818CF8")),
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
            if (_timer == null) return;
            AudioFeedbackService.PlayBreakSound();
            _isBreathingMode = false;
            _breaksCompletedToday++;
            _timer.StartSession(5, "5m Break");
            UpdateTimerUI();
            UpdateRadarChart();
            RefreshMetrics();
        }

        private void BtnBreathing_Click(object sender, RoutedEventArgs e)
        {
            if (_timer == null) return;
            AudioFeedbackService.PlayBreathingSound();
            _isBreathingMode = true;
            _breathingPhase = 0.0;
            _breathingCompletedToday++;
            _timer.StartSession(2, "Breathing (2m)");
            UpdateTimerUI();
            UpdateRadarChart();
            RefreshMetrics();
        }

        private void UpdateTimerButtonStates()
        {
            if (_timer == null) return;
            bool isRunning = _timer.State == WellbeingTimerService.TimerState.Running || _timer.State == WellbeingTimerService.TimerState.Paused;

            if (BtnStartFocus != null) BtnStartFocus.Visibility = isRunning ? Visibility.Collapsed : Visibility.Visible;
            if (BtnPauseFocus != null)
            {
                BtnPauseFocus.Visibility = isRunning ? Visibility.Visible : Visibility.Collapsed;
                BtnPauseFocus.Content = _timer.State == WellbeingTimerService.TimerState.Paused ? "Resume" : "Pause";
            }
            if (BtnStopFocus != null) BtnStopFocus.Visibility = isRunning ? Visibility.Visible : Visibility.Collapsed;
        }

        private int _breaksCompletedToday = 0;
        private int _breathingCompletedToday = 0;
        private List<MindDropItemView> _activeMindDrops = new List<MindDropItemView>();

        private void BtnEnergy_Click(object sender, RoutedEventArgs e)
        {
            var btn = sender as Wpf.Ui.Controls.Button;
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
                RefreshMetrics();
            }
        }

        private int _selectedFocus = 3;

        private void BtnFocusRating_Click(object sender, RoutedEventArgs e)
        {
            var btn = sender as Wpf.Ui.Controls.Button;
            if (btn != null && btn.Tag != null)
            {
                int val;
                if (int.TryParse(btn.Tag.ToString(), out val))
                {
                    _selectedFocus = val;
                    HighlightButtonGroup(new[] { BtnF1, BtnF2, BtnF3, BtnF4, BtnF5 }, val);
                    UpdateRadarChart();
                    RefreshMetrics();
                }
            }
        }

        private void BtnPressureRating_Click(object sender, RoutedEventArgs e)
        {
            var btn = sender as Wpf.Ui.Controls.Button;
            if (btn != null && btn.Tag != null)
            {
                int val;
                if (int.TryParse(btn.Tag.ToString(), out val))
                {
                    _selectedPressure = val;
                    HighlightButtonGroup(new[] { BtnP1, BtnP2, BtnP3, BtnP4, BtnP5 }, val);
                    UpdateRadarChart();
                    RefreshMetrics();
                }
            }
        }

        private void OnQuickEyeRest_Click(object sender, RoutedEventArgs e)
        {
            AudioFeedbackService.PlayBreakSound();
            _breaksCompletedToday++;
            NotificationService.ShowInfo("20-20-20 Eye Rest", "Look at an object 20 feet away for 20 seconds to relax your ciliary eye muscles.");
            UpdateRadarChart();
            RefreshMetrics();
        }

        private void HighlightEnergyButton(int selected)
        {
            HighlightButtonGroup(new[] { BtnE1, BtnE2, BtnE3, BtnE4, BtnE5 }, selected);
        }

        private void HighlightButtonGroup(Wpf.Ui.Controls.Button[] btns, int selected)
        {
            for (int i = 0; i < btns.Length; i++)
            {
                if (btns[i] == null) continue;
                if (i + 1 == selected)
                {
                    btns[i].Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
                    btns[i].FontWeight = FontWeights.Bold;
                }
                else
                {
                    btns[i].Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
                    btns[i].FontWeight = FontWeights.Normal;
                }
            }
        }

        private void RefreshMindDropsList()
        {
            try
            {
                _activeMindDrops = _dataService != null ? _dataService.GetActiveMindDrops() : new List<MindDropItemView>();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[WellbeingPage] RefreshMindDropsList error: " + ex.Message);
            }
        }

        private void RefreshMetrics()
        {
            WellbeingDayMetrics metrics = _dataService.GetMetricsForDay(DateTime.Today);
            if (TxtMetricFocus != null)
                TxtMetricFocus.Text = string.Format("{0}h {1}m", metrics.TotalFocusMinutes / 60, metrics.TotalFocusMinutes % 60);

            if (TxtMetricWater != null)
                TxtMetricWater.Text = string.Format("{0:N0} / 2,000 mL", _waterIntakeMl);

            if (TxtMetricBurnout != null)
            {
                double hydrationRatio = Math.Min(1.0, _waterIntakeMl / (double)_waterGoalMl);
                double energyRatio = _selectedEnergy / 5.0;
                double score = (energyRatio * 50.0) + (hydrationRatio * 50.0);

                if (score >= 75.0)
                {
                    TxtMetricBurnout.Text = "Optimal Flow 🟢";
                    TxtMetricBurnout.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#22C55E"));
                }
                else if (score >= 45.0)
                {
                    TxtMetricBurnout.Text = "Balanced 🟡";
                    TxtMetricBurnout.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#EAB308"));
                }
                else
                {
                    TxtMetricBurnout.Text = "Fatigued 🔴";
                    TxtMetricBurnout.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#EF4444"));
                }
            }

            if (TxtMetricFlow != null)
            {
                double baseVitality = _selectedEnergy / 5.0;
                double dailyFocusRatio = Math.Min(1.0, metrics.TotalFocusMinutes / 120.0);
                double normEnergy = Math.Min(1.0, Math.Max(0.20, ((Math.Min(1.0, _waterIntakeMl / (double)_waterGoalMl)) * 0.40) + (baseVitality * 0.35) + (_breaksCompletedToday * 0.10) + 0.10));
                double normFocus = Math.Min(1.0, Math.Max(0.20, (dailyFocusRatio * 0.30) + ((_selectedFocus / 5.0) * 0.30) + 0.20));
                double normRest = Math.Min(1.0, Math.Max(0.20, 0.35 + Math.Min(0.50, (_breaksCompletedToday * 0.20) + (_breathingCompletedToday * 0.15))));
                double normPressure = Math.Min(1.0, Math.Max(0.20, ((_selectedPressure / 5.0) * 0.50) + 0.10));
                double rawFlow = (normFocus * 0.40) + (normEnergy * 0.30) + (normRest * 0.20) - (normPressure > 0.60 ? (normPressure - 0.60) * 0.40 : 0.0);
                int flowPct = (int)(Math.Min(1.0, Math.Max(0.20, rawFlow + 0.10)) * 100);
                string flowStatus = flowPct >= 80 ? "Peak Flow" : (flowPct >= 60 ? "Balanced" : "Calibrating");
                TxtMetricFlow.Text = string.Format("{0}% ({1})", flowPct, flowStatus);
            }
        }

        private void DrawWaterWaveAnimation()
        {
            if (WaterCanvas == null || WaterWavePath == null) return;

            _waterWavePhase += 0.08;
            if (_waterWavePhase > Math.PI * 2) _waterWavePhase -= Math.PI * 2;

            double width = WaterCanvas.ActualWidth > 50 ? WaterCanvas.ActualWidth : 380;
            double height = WaterCanvas.ActualHeight > 20 ? WaterCanvas.ActualHeight : 64;
            double pct = Math.Min(1.0, Math.Max(0.0, _waterIntakeMl / (double)_waterGoalMl));
            double targetY = height - (pct * height);

            var figure = new PathFigure { StartPoint = new Point(0, height) };
            figure.Segments.Add(new LineSegment(new Point(0, targetY), false));

            for (double x = 0; x <= width; x += 15)
            {
                double wave = Math.Sin((x / 50.0) + _waterWavePhase) * 3.5;
                figure.Segments.Add(new LineSegment(new Point(x, targetY + wave), true));
            }

            figure.Segments.Add(new LineSegment(new Point(width, height), false));
            figure.Segments.Add(new LineSegment(new Point(0, height), false));

            var geometry = new PathGeometry();
            geometry.Figures.Add(figure);
            WaterWavePath.Data = geometry;
        }

        private void UpdateWaterIntakeUI(bool saveToDisk = false)
        {
            int cups = Math.Min(8, _waterIntakeMl / 250);
            double pct = Math.Min(100.0, (_waterIntakeMl / (double)_waterGoalMl) * 100.0);

            if (TxtWaterPct != null)
                TxtWaterPct.Text = string.Format("{0:N0} mL ({1:F0}%)", _waterIntakeMl, pct);

            if (TxtWaterStatusLabel != null)
            {
                if (_waterIntakeMl >= _waterGoalMl)
                    TxtWaterStatusLabel.Text = "Goal Achieved: 2,000 mL (8/8 Cups Logged)";
                else
                    TxtWaterStatusLabel.Text = string.Format("Daily Goal: 2,000 mL ({0}/8 Cups Logged)", cups);
            }

            Border[] cupsTiles = new[] { Cup1, Cup2, Cup3, Cup4, Cup5, Cup6, Cup7, Cup8 };
            for (int i = 0; i < cupsTiles.Length; i++)
            {
                if (cupsTiles[i] == null) continue;
                if (i < cups)
                {
                    cupsTiles[i].Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#0284C7"));
                    var icon = cupsTiles[i].Child as Wpf.Ui.Controls.SymbolIcon;
                    if (icon != null) icon.Foreground = Brushes.White;
                }
                else
                {
                    cupsTiles[i].Background = (Brush)Application.Current.TryFindResource("CardBackgroundFillColorSecondaryBrush") ?? new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
                    var icon = cupsTiles[i].Child as Wpf.Ui.Controls.SymbolIcon;
                    if (icon != null) icon.Foreground = (Brush)Application.Current.TryFindResource("TextFillColorSecondaryBrush") ?? new SolidColorBrush((Color)ColorConverter.ConvertFromString("#94A3B8"));
                }
            }

            if (saveToDisk)
            {
                _dataService.SaveHydrationForDay(DateTime.Today, _waterIntakeMl);
            }

            RefreshMetrics();
            UpdateRadarChart();
        }

        private void OnAddWater250_Click(object sender, RoutedEventArgs e)
        {
            _waterIntakeMl = Math.Min(3000, _waterIntakeMl + 250);
            UpdateWaterIntakeUI(saveToDisk: true);
        }

        private void OnAddWater500_Click(object sender, RoutedEventArgs e)
        {
            _waterIntakeMl = Math.Min(3000, _waterIntakeMl + 500);
            UpdateWaterIntakeUI(saveToDisk: true);
        }

        private void OnResetWater_Click(object sender, RoutedEventArgs e)
        {
            _waterIntakeMl = 0;
            UpdateWaterIntakeUI(saveToDisk: true);
        }

        private void OnCupClicked(object sender, System.Windows.Input.MouseButtonEventArgs e)
        {
            Border tile = sender as Border;
            if (tile != null && tile.Tag != null)
            {
                int cupNum;
                if (int.TryParse(tile.Tag.ToString(), out cupNum))
                {
                    _waterIntakeMl = cupNum * 250;
                    UpdateWaterIntakeUI(saveToDisk: true);
                }
            }
        }

        private void UpdateRadarChart()
        {
            if (RadarCanvas == null) return;
            try
            {
                RadarCanvas.Children.Clear();

                double width = RadarCanvas.ActualWidth > 50 ? RadarCanvas.ActualWidth : (RadarCanvas.Width > 0 ? RadarCanvas.Width : 330);
                double height = RadarCanvas.ActualHeight > 50 ? RadarCanvas.ActualHeight : (RadarCanvas.Height > 0 ? RadarCanvas.Height : 220);
                double centerX = width / 2.0;
                double centerY = (height / 2.0) - 2.0;
                double radius = 68.0;

                string[] axisLabels = new[] { "Energy", "Focus", "Rest", "Pressure", "Flow" };
                int axesCount = axisLabels.Length;

                WellbeingDayMetrics metrics = _dataService != null ? _dataService.GetMetricsForDay(DateTime.Today) : new WellbeingDayMetrics();
                
                double hydrationRatio = Math.Min(1.0, _waterIntakeMl / (double)_waterGoalMl);
                double baseVitality = _selectedEnergy / 5.0;
                double normEnergy = Math.Min(1.0, Math.Max(0.20, (hydrationRatio * 0.40) + (baseVitality * 0.35) + (_breaksCompletedToday * 0.10) + 0.10));

                bool isFocusing = _timer != null && _timer.State == WellbeingTimerService.TimerState.Running && !_isBreathingMode;
                double activeFocusBonus = isFocusing ? 0.30 : (_timer != null && _timer.State == WellbeingTimerService.TimerState.Paused ? 0.10 : 0.0);
                double dailyFocusRatio = Math.Min(1.0, metrics.TotalFocusMinutes / 120.0);
                double focusClarity = _selectedFocus / 5.0;
                double normFocus = Math.Min(1.0, Math.Max(0.20, (dailyFocusRatio * 0.30) + (focusClarity * 0.30) + activeFocusBonus + (metrics.CompletedSessions * 0.10) + 0.10));

                double breakBonus = Math.Min(0.50, (_breaksCompletedToday * 0.20) + (_breathingCompletedToday * 0.15));
                double continuousStrain = (isFocusing && _timer != null && _timer.GetLiveElapsedSeconds() > 1800) ? 0.20 : 0.0;
                double normRest = Math.Min(1.0, Math.Max(0.20, 0.35 + breakBonus - continuousStrain));

                double baseStress = _selectedPressure / 5.0;
                double strainLoad = (metrics.TotalFocusMinutes > 150 && _breaksCompletedToday == 0) ? 0.25 : 0.0;
                double breathingRelief = _isBreathingMode ? 0.35 : (_breathingCompletedToday * 0.10);
                double normPressure = Math.Min(1.0, Math.Max(0.20, (baseStress * 0.50) + strainLoad - breathingRelief + 0.10));

                double rawFlow = (normFocus * 0.40) + (normEnergy * 0.30) + (normRest * 0.20) - (normPressure > 0.60 ? (normPressure - 0.60) * 0.40 : 0.0);
                double normFlow = Math.Min(1.0, Math.Max(0.20, rawFlow + 0.10));

                double[] values = new[] { normEnergy, normFocus, normRest, normPressure, normFlow };

                if (TxtFatigueRec != null)
                {
                    if (normPressure >= 0.70)
                    {
                        TxtFatigueRec.Text = "⚠️ High Cognitive Tension: Distractions or continuous strain detected. Take a 2-min Box Breathing session to reset.";
                        if (BorderPrescription != null) BorderPrescription.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F59E0B"));
                    }
                    else if (normRest <= 0.30 && metrics.TotalFocusMinutes >= 45)
                    {
                        TxtFatigueRec.Text = "☕ Ergonomics Alert: Continuous screen time without breaks. Step away for 5 minutes to protect visual acuity.";
                        if (BorderPrescription != null) BorderPrescription.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#F59E0B"));
                    }
                    else if (normEnergy <= 0.40 && _waterIntakeMl < 500)
                    {
                        TxtFatigueRec.Text = "💧 Low Hydration: Physical battery low. Drink 250 mL of water to re-energize cognitive processing speed.";
                        if (BorderPrescription != null) BorderPrescription.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#0284C7"));
                    }
                    else if (normFlow >= 0.75)
                    {
                        TxtFatigueRec.Text = "✨ Optimal Flow State: Deep focus, balanced rest, and hydration aligned. Perfect momentum for creative work!";
                        if (BorderPrescription != null) BorderPrescription.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#10B981"));
                    }
                    else
                    {
                        TxtFatigueRec.Text = "Workstation calibrated. Start a focus timer or log water to elevate your flow state in real-time.";
                        if (BorderPrescription != null) BorderPrescription.BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#0284C7"));
                    }
                }

                for (int level = 1; level <= 3; level++)
                {
                    double r = radius * (level / 3.0);
                    Polygon webPoly = new Polygon
                    {
                        Stroke = (Brush)Application.Current.TryFindResource("CardStrokeColorDefaultBrush") ?? new SolidColorBrush((Color)ColorConverter.ConvertFromString("#94A3B8")),
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
                        Stroke = (Brush)Application.Current.TryFindResource("CardStrokeColorDefaultBrush") ?? new SolidColorBrush((Color)ColorConverter.ConvertFromString("#CBD5E1")),
                        StrokeThickness = 1
                    };
                    RadarCanvas.Children.Add(axisLine);

                    TextBlock label = new TextBlock
                    {
                        Text = string.Format("{0} ({1:F0}%)", axisLabels[i], values[i] * 100),
                        FontSize = 10,
                        FontWeight = FontWeights.Bold,
                        Foreground = (Brush)Application.Current.TryFindResource("FluentBrand80") ?? new SolidColorBrush((Color)ColorConverter.ConvertFromString("#0284C7"))
                    };
                    label.Measure(new Size(double.PositiveInfinity, double.PositiveInfinity));
                    double lblW = label.DesiredSize.Width > 0 ? label.DesiredSize.Width : 64;
                    double lblH = label.DesiredSize.Height > 0 ? label.DesiredSize.Height : 14;

                    double lblX = 0;
                    double lblY = 0;

                    if (i == 0) { lblX = centerX - (lblW / 2.0); lblY = (centerY - radius) - lblH - 4; }
                    else if (i == 1) { lblX = endX + 6; lblY = endY - (lblH / 2.0); }
                    else if (i == 2) { lblX = endX + 4; lblY = endY + 2; }
                    else if (i == 3) { lblX = endX - lblW - 4; lblY = endY + 2; }
                    else if (i == 4) { lblX = endX - lblW - 6; lblY = endY - (lblH / 2.0); }

                    Canvas.SetLeft(label, lblX);
                    Canvas.SetTop(label, lblY);
                    RadarCanvas.Children.Add(label);

                    double valR = radius * values[i];
                    double vx = centerX + valR * Math.Cos(angle);
                    double vy = centerY + valR * Math.Sin(angle);
                    valuePoints.Add(new Point(vx, vy));
                }

                Color polyColor = normFlow >= 0.75 
                    ? Color.FromArgb(110, 16, 185, 129)
                    : Color.FromArgb(100, 2, 132, 199);

                Color strokeColor = normFlow >= 0.75
                    ? (Color)ColorConverter.ConvertFromString("#10B981")
                    : (Color)ColorConverter.ConvertFromString("#0284C7");

                Polygon dataPoly = new Polygon
                {
                    Points = valuePoints,
                    Fill = new SolidColorBrush(polyColor),
                    Stroke = new SolidColorBrush(strokeColor),
                    StrokeThickness = 2
                };
                RadarCanvas.Children.Add(dataPoly);

                foreach (Point pt in valuePoints)
                {
                    Ellipse dot = new Ellipse
                    {
                        Width = 8,
                        Height = 8,
                        Fill = new SolidColorBrush(strokeColor),
                        Stroke = Brushes.White,
                        StrokeThickness = 1.5
                    };
                    Canvas.SetLeft(dot, pt.X - 4);
                    Canvas.SetTop(dot, pt.Y - 4);
                    RadarCanvas.Children.Add(dot);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[WellbeingPage] UpdateRadarChart error: " + ex.Message);
            }
        }

        private void RenderHeatmap()
        {
            if (HeatmapCanvas == null) return;
            HeatmapCanvas.Children.Clear();

            var history = _dataService.Get30DayFocusHistory();
            int totalMins = history.Values.Sum();

            int streak = 0;
            DateTime checkDate = DateTime.Today;
            while (true)
            {
                string key = checkDate.ToString("yyyy-MM-dd");
                if (history.ContainsKey(key) && history[key] > 0)
                {
                    streak++;
                    checkDate = checkDate.AddDays(-1);
                }
                else
                {
                    if (checkDate == DateTime.Today && streak == 0)
                    {
                        checkDate = checkDate.AddDays(-1);
                        continue;
                    }
                    break;
                }
            }

            if (TxtStreakCount != null) TxtStreakCount.Text = string.Format("Active Streak: {0} Day{1}", streak, streak == 1 ? "" : "s");
            if (TxtHeatmap30DayTotal != null) TxtHeatmap30DayTotal.Text = string.Format("30-Day Total: {0}h {1}m", totalMins / 60, totalMins % 60);

            double tileSize = 18.0;
            double tileGap = 6.0;
            double startX = 36.0;
            double startY = 6.0;

            string[] dayShort = new[] { "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun" };
            for (int r = 0; r < 7; r++)
            {
                if (r == 0 || r == 2 || r == 4)
                {
                    TextBlock dayLbl = new TextBlock
                    {
                        Text = dayShort[r],
                        FontSize = 9,
                        FontWeight = FontWeights.SemiBold,
                        Foreground = (Brush)Application.Current.TryFindResource("TextFillColorSecondaryBrush") ?? new SolidColorBrush((Color)ColorConverter.ConvertFromString("#94A3B8")),
                        VerticalAlignment = VerticalAlignment.Center
                    };
                    Canvas.SetLeft(dayLbl, startX - 30);
                    Canvas.SetTop(dayLbl, startY + r * (tileSize + tileGap) + 2);
                    HeatmapCanvas.Children.Add(dayLbl);
                }
            }

            DateTime startDate = DateTime.Today.AddDays(-29);
            int startDayOfWeek = ((int)startDate.DayOfWeek + 6) % 7;

            int col = 0;
            int row = startDayOfWeek;

            for (int i = 0; i < 30; i++)
            {
                DateTime day = startDate.AddDays(i);
                string key = day.ToString("yyyy-MM-dd");
                int mins = history.ContainsKey(key) ? history[key] : 0;

                Brush tileBg;
                Brush tileBorder = (Brush)Application.Current.TryFindResource("CardStrokeColorDefaultBrush") ?? new SolidColorBrush((Color)ColorConverter.ConvertFromString("#334155"));

                if (mins == 0)
                    tileBg = (Brush)Application.Current.TryFindResource("CardBackgroundFillColorDefaultBrush") ?? new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
                else if (mins < 25)
                    tileBg = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#64748B"));
                else if (mins < 60)
                    tileBg = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#6366F1"));
                else if (mins < 120)
                    tileBg = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#8B5CF6"));
                else
                    tileBg = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#06B6D4"));

                Border tile = new Border
                {
                    Width = tileSize,
                    Height = tileSize,
                    CornerRadius = new CornerRadius(3),
                    Background = tileBg,
                    BorderBrush = tileBorder,
                    BorderThickness = new Thickness(1),
                    ToolTip = string.Format("{0:MMM dd, yyyy}: {1} mins focus", day, mins),
                    Cursor = System.Windows.Input.Cursors.Hand
                };

                double posX = startX + col * (tileSize + tileGap);
                double posY = startY + row * (tileSize + tileGap);

                Canvas.SetLeft(tile, posX);
                Canvas.SetTop(tile, posY);
                HeatmapCanvas.Children.Add(tile);

                row++;
                if (row >= 7)
                {
                    row = 0;
                    col++;
                }
            }
        }
    }
}
