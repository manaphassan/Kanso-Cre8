using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Windows;
using System.Windows.Controls;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class WorkstationHealthPage : Page
    {
        private List<SoftwareHealthItem> _allSoftwareItems = new List<SoftwareHealthItem>();

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

        public WorkstationHealthPage()
        {
            InitializeComponent();
            Loaded += OnPageLoaded;
        }

        private void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            LoadHardwareSpecs();
            LoadSoftwareHealthData();
        }

        private void LoadHardwareSpecs()
        {
            try
            {
                SystemSpecs specs = UserProfileService.GetSystemSpecs();
                if (specs != null)
                {
                    if (SpecOS != null) SpecOS.Text = string.IsNullOrEmpty(specs.OSVersion) ? "Windows 11 (64-bit)" : specs.OSVersion;
                    if (SpecCPU != null) SpecCPU.Text = string.IsNullOrEmpty(specs.ProcessorName) ? "AMD Ryzen / Intel Core" : specs.ProcessorName;
                    if (SpecMotherboard != null) SpecMotherboard.Text = string.IsNullOrEmpty(specs.MotherboardModel) ? "BaseBoard System Board" : specs.MotherboardModel;
                    if (SpecRAM != null) SpecRAM.Text = string.IsNullOrEmpty(specs.TotalRAM) ? "16 GB RAM" : specs.TotalRAM;
                    if (SpecGPU != null) SpecGPU.Text = string.IsNullOrEmpty(specs.GraphicsGPU) ? "NVIDIA / AMD Graphics" : specs.GraphicsGPU;
                    if (SpecDisplay != null) SpecDisplay.Text = string.IsNullOrEmpty(specs.DisplayResolution) ? "1920 x 1080" : specs.DisplayResolution;
                    if (SpecStorage != null) SpecStorage.Text = string.IsNullOrEmpty(specs.AvailableStorage) ? "Drive C: Free / Used Space" : specs.AvailableStorage;

                    if (MetricGpuName != null) MetricGpuName.Text = string.IsNullOrWhiteSpace(specs.GraphicsGPU) ? "DirectX 12 Ready" : specs.GraphicsGPU;
                    if (MetricStorageText != null) MetricStorageText.Text = string.IsNullOrWhiteSpace(specs.StorageFreeText) ? specs.AvailableStorage : specs.StorageFreeText;
                    if (MetricStorageSubtext != null) MetricStorageSubtext.Text = string.IsNullOrWhiteSpace(specs.StorageUsedText) ? "Storage Active" : specs.StorageUsedText;
                    if (StorageProgressBar != null) StorageProgressBar.Value = specs.StorageUsedPercent > 0 ? specs.StorageUsedPercent : 75;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[WorkstationHealthPage] LoadHardwareSpecs Error: " + ex.Message);
            }
        }

        private void LoadSoftwareHealthData()
        {
            try
            {
                _allSoftwareItems = UserProfileService.ScanInstalledDesignSoftware() ?? new List<SoftwareHealthItem>();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[WorkstationHealthPage] LoadSoftwareHealthData Error: " + ex.Message);
                _allSoftwareItems = new List<SoftwareHealthItem>();
            }

            ApplySoftwareFilter();
            UpdateSoftwareCoverageMetric();
        }

        private void UpdateSoftwareCoverageMetric()
        {
            if (MetricSoftwareCoverage != null)
            {
                int installedCount = _allSoftwareItems.Count(x => x.IsInstalled);
                int totalCount = _allSoftwareItems.Count;
                MetricSoftwareCoverage.Text = string.Format("{0} / {1} Installed", installedCount, totalCount);
            }
        }

        private void ApplySoftwareFilter()
        {
            string query = SoftwareSearchBox != null ? (SoftwareSearchBox.Text ?? "").Trim() : "";
            if (SoftwareHealthList != null)
            {
                if (string.IsNullOrEmpty(query))
                {
                    SoftwareHealthList.ItemsSource = _allSoftwareItems;
                }
                else
                {
                    SoftwareHealthList.ItemsSource = _allSoftwareItems
                        .Where(x => (x.SoftwareName != null && x.SoftwareName.IndexOf(query, StringComparison.OrdinalIgnoreCase) >= 0) ||
                                    (x.FileExtension != null && x.FileExtension.IndexOf(query, StringComparison.OrdinalIgnoreCase) >= 0) ||
                                    (x.ScannedVersion != null && x.ScannedVersion.IndexOf(query, StringComparison.OrdinalIgnoreCase) >= 0))
                        .ToList();
                }
            }
        }

        private void OnSoftwareSearchTextChanged(object sender, TextChangedEventArgs e)
        {
            ApplySoftwareFilter();
        }

        private void OnRescanSoftwareClicked(object sender, RoutedEventArgs e)
        {
            LoadHardwareSpecs();
            LoadSoftwareHealthData();
            int count = _allSoftwareItems.Count;
            MessageBox.Show(
                string.Format("Workstation hardware specs and {0} design software package{1} rescanned successfully.", count, count == 1 ? "" : "s"),
                "Software Health Rescan", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void OnDownloadSoftwareClicked(object sender, RoutedEventArgs e)
        {
            Button btn = sender as Button;
            if (btn != null && btn.Tag != null)
            {
                string url = btn.Tag.ToString();
                if (!string.IsNullOrEmpty(url))
                {
                    try
                    {
                        Process.Start(new ProcessStartInfo
                        {
                            FileName = url,
                            UseShellExecute = true
                        });
                    }
                    catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[WorkstationHealthPage] Download: " + ex.Message); }
                }
            }
        }

        private void OnUninstallSoftwareClicked(object sender, RoutedEventArgs e)
        {
            Button btn = sender as Button;
            string appName = btn != null && btn.Tag != null ? btn.Tag.ToString() : "software";
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "ms-settings:appsfeatures",
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[WorkstationHealthPage] Uninstall trigger: " + ex.Message);
                MessageBox.Show("To uninstall " + appName + ", please open Windows Settings > Installed Apps.", "Uninstall Software", MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }
    }
}
