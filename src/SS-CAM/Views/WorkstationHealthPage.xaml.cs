using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Windows;
using System.Windows.Controls;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class WorkstationHealthPage : Page
    {
        public WorkstationHealthPage()
        {
            InitializeComponent();
            LoadHardwareSpecs();
            LoadSoftwareHealthData();
        }

        private void LoadHardwareSpecs()
        {
            SystemSpecs specs = UserProfileService.GetSystemSpecs();
            if (specs != null)
            {
                SpecOS.Text = specs.OSVersion;
                SpecCPU.Text = specs.ProcessorName;
                SpecRAM.Text = specs.TotalRAM;
                SpecGPU.Text = specs.GraphicsGPU;
                SpecDisplay.Text = specs.DisplayResolution;
                SpecStorage.Text = specs.AvailableStorage;
            }
        }

        private void LoadSoftwareHealthData()
        {
            List<SoftwareHealthItem> items = UserProfileService.ScanInstalledDesignSoftware();
            SoftwareHealthList.ItemsSource = items;
        }

        private void OnRescanSoftwareClicked(object sender, RoutedEventArgs e)
        {
            LoadHardwareSpecs();
            List<SoftwareHealthItem> items = UserProfileService.ScanInstalledDesignSoftware();
            SoftwareHealthList.ItemsSource = items;
            int count = items != null ? items.Count : 0;
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
                    catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
                }
            }
        }
    }
}
