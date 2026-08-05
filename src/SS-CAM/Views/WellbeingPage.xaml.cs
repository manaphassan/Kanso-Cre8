using System;
using System.Windows;
using System.Windows.Controls;
using SS_CAM.Services;
using SS_CAM.Models;

namespace SS_CAM.Views
{
    public partial class WellbeingPage : Page
    {
        private readonly WellbeingDataService _wellbeingService;
        private WellbeingData _currentData;

        public WellbeingPage()
        {
            InitializeComponent();
            _wellbeingService = new WellbeingDataService();
            LoadData();
        }

        private void LoadData()
        {
            _currentData = _wellbeingService.GetWellbeingData();
            UpdateMetricsDisplay();
        }

        private void UpdateMetricsDisplay()
        {
            // Update UI based on _currentData
            int totalFocusMinutes = 0;
            if (_currentData.FocusSessions != null)
            {
                foreach (var s in _currentData.FocusSessions)
                {
                    totalFocusMinutes += s.DurationMinutes;
                }
            }

            int breaks = _currentData.ResetSessions != null ? _currentData.ResetSessions.Count : 0;
            
            // Assuming TextBlocks in XAML are named, but since they aren't yet, we will just update a generic log
            // In a real scenario we'd bind these or name them in XAML.
        }

        private void BtnStartFocus_Click(object sender, RoutedEventArgs e)
        {
            var session = new FocusSession
            {
                Id = Guid.NewGuid().ToString(),
                StartTime = DateTime.Now.ToString("o"),
                DurationMinutes = 25,
                PresetName = "Standard Focus",
                Completed = false
            };
            
            _currentData.FocusSessions.Add(session);
            _wellbeingService.SaveWellbeingData(_currentData);
            MessageBox.Show("Started 25m Focus Session!", "Creative Wellbeing", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void BtnTakeBreak_Click(object sender, RoutedEventArgs e)
        {
            var session = new ResetSession
            {
                Id = Guid.NewGuid().ToString(),
                StartTime = DateTime.Now.ToString("o"),
                DurationMinutes = 5,
                Completed = false
            };
            
            _currentData.ResetSessions.Add(session);
            _wellbeingService.SaveWellbeingData(_currentData);
            MessageBox.Show("Started 5m Break!", "Creative Wellbeing", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void BtnLogEnergy_Click(object sender, RoutedEventArgs e)
        {
            var checkIn = new CheckIn
            {
                Timestamp = DateTime.Now.ToString("o"),
                EnergyLevel = "Medium", // Hardcoded for prototype
                FatigueReason = "General",
                RecommendedReset = true,
                ActionTaken = "Logged"
            };
            
            _currentData.CheckIns.Add(checkIn);
            _wellbeingService.SaveWellbeingData(_currentData);
            MessageBox.Show("Energy Level Logged!", "Creative Wellbeing", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void BtnMindDrop_Click(object sender, RoutedEventArgs e)
        {
            // Encrypt test mind drop
            var encryptedBase64 = _wellbeingService.ProtectText("This is a private mind drop note.");
            var drop = new MindDrop
            {
                Id = Guid.NewGuid().ToString(),
                CreatedAt = DateTime.Now.ToString("o"),
                ContentBase64 = encryptedBase64,
                RetentionMode = "EndOfDay"
            };
            
            _currentData.MindDrops.Add(drop);
            _wellbeingService.SaveWellbeingData(_currentData);
            MessageBox.Show("Private Mind Drop encrypted and saved via DPAPI!", "Creative Wellbeing", MessageBoxButton.OK, MessageBoxImage.Information);
        }
    }
}
