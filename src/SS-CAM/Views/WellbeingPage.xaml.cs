using System;
using System.Windows;
using System.Windows.Controls;
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

        private int _selectedEnergy = 3;
        private int _selectedMood   = 3;
        private int _selectedPressure = 3;

        public WellbeingPage()
        {
            InitializeComponent();
            _dataService   = new WellbeingDataService();
            _timer         = new WellbeingTimerService(_dataService);
            _fatigueEngine = new FatigueRuleEngine(_dataService);

            // 1-second UI refresh ticker
            _uiTimer = new DispatcherTimer();
            _uiTimer.Interval = TimeSpan.FromSeconds(1);
            _uiTimer.Tick += OnUiTick;
            _uiTimer.Start();

            // Recover any in-progress session from before a crash / restart
            if (_timer.TryRestoreCheckpoint())
            {
                var answer = MessageBox.Show(
                    "An unfinished focus session was found. Resume it?",
                    "Session Recovery",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Question);

                if (answer == MessageBoxResult.Yes)
                    _timer.ResumeSession();
                else
                    _timer.DiscardCheckpoint();
            }

            RefreshMetrics();
            UpdateTimerUI();
        }

        // ── Dispatcher tick (every second) ─────────────────────────────
        private void OnUiTick(object sender, EventArgs e)
        {
            var result = _timer.Tick();
            UpdateTimerUI();

            if (result == "Completed")
            {
                MessageBox.Show("Great work! Focus session complete.", "Creative Wellbeing",
                    MessageBoxButton.OK, MessageBoxImage.Information);
                RefreshMetrics();
            }
            else if (result == "AutoPaused")
            {
                MessageBox.Show("Session auto-paused after 3 minutes of inactivity.",
                    "Creative Wellbeing", MessageBoxButton.OK, MessageBoxImage.Information);
                UpdateTimerUI();
            }
        }

        // ── Timer helpers ───────────────────────────────────────────────
        private void UpdateTimerUI()
        {
            var state = _timer.State;

            if (state == WellbeingTimerService.TimerState.Ready)
            {
                TxtTimerDisplay.Text  = "";
                TxtTimerStatus.Text   = "Ready";
                BtnStartFocus.Visibility = Visibility.Visible;
                BtnPauseFocus.Visibility = Visibility.Collapsed;
                BtnStopFocus.Visibility  = Visibility.Collapsed;
            }
            else if (state == WellbeingTimerService.TimerState.Running)
            {
                TxtTimerDisplay.Text  = _timer.GetFormattedRemaining();
                TxtTimerStatus.Text   = string.Format("Focusing · {0}", _timer.SessionType);
                BtnStartFocus.Visibility = Visibility.Collapsed;
                BtnPauseFocus.Visibility = Visibility.Visible;
                BtnStopFocus.Visibility  = Visibility.Visible;
            }
            else if (state == WellbeingTimerService.TimerState.Paused)
            {
                TxtTimerDisplay.Text  = _timer.GetFormattedRemaining();
                TxtTimerStatus.Text   = "Paused";
                BtnStartFocus.Content = "Resume";
                BtnStartFocus.Visibility = Visibility.Visible;
                BtnPauseFocus.Visibility = Visibility.Collapsed;
                BtnStopFocus.Visibility  = Visibility.Visible;
            }
            else if (state == WellbeingTimerService.TimerState.Completed)
            {
                TxtTimerDisplay.Text  = "Done!";
                TxtTimerStatus.Text   = "Session complete";
                BtnStartFocus.Content = "Start Focus (25m)";
                BtnStartFocus.Visibility = Visibility.Visible;
                BtnPauseFocus.Visibility = Visibility.Collapsed;
                BtnStopFocus.Visibility  = Visibility.Collapsed;
            }
        }

        // ── Timer button handlers ───────────────────────────────────────
        private void BtnStartFocus_Click(object sender, RoutedEventArgs e)
        {
            if (_timer.State == WellbeingTimerService.TimerState.Paused)
            {
                _timer.ResumeSession();
            }
            else
            {
                _timer.StartSession(25, "Standard Focus");
                BtnStartFocus.Content = "Start Focus (25m)";
            }
            UpdateTimerUI();
        }

        private void BtnPauseFocus_Click(object sender, RoutedEventArgs e)
        {
            _timer.PauseSession();
            UpdateTimerUI();
        }

        private void BtnStopFocus_Click(object sender, RoutedEventArgs e)
        {
            _timer.StopSession("User ended early");
            RefreshMetrics();
            UpdateTimerUI();
        }

        // ── Break / Reset handlers ──────────────────────────────────────
        private void BtnBreak5_Click(object sender, RoutedEventArgs e)
        {
            var s = new ResetSession
            {
                Id = Guid.NewGuid().ToString(),
                StartTime = DateTime.Now.ToString("o"),
                DurationMinutes = 5,
                Completed = false
            };
            var data = _dataService.GetWellbeingData();
            data.ResetSessions.Add(s);
            _dataService.SaveWellbeingData(data);
            MessageBox.Show("5-minute break logged. Step away and rest!", "Creative Wellbeing",
                MessageBoxButton.OK, MessageBoxImage.Information);
            RefreshMetrics();
        }

        private void BtnBreathing_Click(object sender, RoutedEventArgs e)
        {
            var s = new ResetSession
            {
                Id = Guid.NewGuid().ToString(),
                StartTime = DateTime.Now.ToString("o"),
                DurationMinutes = 2,
                Completed = false
            };
            var data = _dataService.GetWellbeingData();
            data.ResetSessions.Add(s);
            _dataService.SaveWellbeingData(data);
            MessageBox.Show("Breathing reset started. Inhale 4s · Hold 4s · Exhale 6s.",
                "Creative Wellbeing", MessageBoxButton.OK, MessageBoxImage.Information);
            RefreshMetrics();
        }

        // ── Energy check-in handlers ────────────────────────────────────
        private void BtnEnergy_Click(object sender, RoutedEventArgs e)
        {
            var btn = sender as Button;
            if (btn == null) return;

            int score;
            if (!int.TryParse(btn.Tag as string, out score)) return;
            _selectedEnergy = score;

            // Persist check-in
            var checkIn = new CheckIn
            {
                Timestamp     = DateTime.Now.ToString("o"),
                EnergyScore   = _selectedEnergy,
                MoodScore     = _selectedMood,
                PressureScore = _selectedPressure,
                EnergyLevel   = GetEnergyLabel(_selectedEnergy),
                ActionTaken   = "Logged"
            };
            var data = _dataService.GetWellbeingData();
            data.CheckIns.Add(checkIn);
            _dataService.SaveWellbeingData(data);

            // Run fatigue rules and surface first recommendation
            ShowFatigueRecommendation();
            RefreshMetrics();
        }

        private string GetEnergyLabel(int score)
        {
            if (score <= 1) return "Very Low";
            if (score == 2) return "Low";
            if (score == 3) return "Medium";
            if (score == 4) return "High";
            return "Very High";
        }

        private void ShowFatigueRecommendation()
        {
            var recs = _fatigueEngine.Evaluate();
            if (recs.Count > 0)
            {
                TxtFatigueRec.Text       = recs[0].Message;
                TxtFatigueRec.Visibility = Visibility.Visible;
            }
            else
            {
                TxtFatigueRec.Visibility = Visibility.Collapsed;
            }
        }

        // ── Mind Drop handlers ──────────────────────────────────────────
        private void BtnSaveDrop_EndOfDay(object sender, RoutedEventArgs e)
        {
            SaveMindDrop("EndOfDay");
        }

        private void BtnSaveDrop_Session(object sender, RoutedEventArgs e)
        {
            SaveMindDrop("Session");
        }

        private void SaveMindDrop(string retention)
        {
            var text = TxtMindDrop.Text;
            if (string.IsNullOrWhiteSpace(text))
            {
                MessageBox.Show("Nothing to save — write a thought first.",
                    "Mind Drop", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            var encrypted = _dataService.ProtectText(text);
            var drop = new MindDrop
            {
                Id            = Guid.NewGuid().ToString(),
                CreatedAt     = DateTime.Now.ToString("o"),
                ContentBase64 = encrypted,
                RetentionMode = retention
            };

            var data = _dataService.GetWellbeingData();
            data.MindDrops.Add(drop);
            _dataService.SaveWellbeingData(data);

            TxtMindDrop.Text = string.Empty;
            MessageBox.Show(
                string.Format("Mind Drop saved privately (DPAPI · {0}).", retention),
                "Creative Wellbeing", MessageBoxButton.OK, MessageBoxImage.Information);
            RefreshMetrics();
        }

        // ── Metrics panel ───────────────────────────────────────────────
        private void RefreshMetrics()
        {
            var data  = _dataService.GetWellbeingData();
            var today = DateTime.Now.ToString("yyyy-MM-dd");

            int focusSecs = 0;
            int completedSessions = 0;
            int totalSessions = 0;

            if (data.FocusSessions != null)
            {
                foreach (var s in data.FocusSessions)
                {
                    if (s.StartTime == null || !s.StartTime.StartsWith(today)) continue;
                    focusSecs += s.ActualSeconds;
                    totalSessions++;
                    if (s.Completed) completedSessions++;
                }
            }

            int drops = 0;
            if (data.MindDrops != null)
            {
                foreach (var d in data.MindDrops)
                {
                    if (d.CreatedAt != null && d.CreatedAt.StartsWith(today)) drops++;
                }
            }

            int h = focusSecs / 3600;
            int m = (focusSecs % 3600) / 60;

            TxtMetricFocus.Text    = string.Format("Focus Time: {0}h {1}m", h, m);
            TxtMetricSessions.Text = string.Format("Sessions: {0} completed ({1} total)", completedSessions, totalSessions);
            TxtMetricDrops.Text    = string.Format("Mind Drops: {0}", drops);
        }
    }
}
