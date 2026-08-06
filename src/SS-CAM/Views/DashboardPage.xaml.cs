using System;
using System.Collections.Generic;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class DashboardPage : Page
    {
        private string workspaceRoot = @"D:\Testing";

        public DashboardPage()
        {
            InitializeComponent();
            
            var version = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version;
            if (TxtVersionBadge != null)
            {
                TxtVersionBadge.Text = string.Format("v{0}", version.ToString(3));
            }

            Loaded += OnPageLoaded;
        }

        private async void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            UserProfile profile = UserProfileService.LoadProfile();
            if (!string.IsNullOrWhiteSpace(profile.WorkspaceRoot))
            {
                workspaceRoot = profile.WorkspaceRoot;
            }

            TxtWorkspacePath.Text = workspaceRoot;
            await RefreshDashboard();
        }

        private async void OnRefreshClicked(object sender, RoutedEventArgs e)
        {
            await RefreshDashboard();
        }

        private void OnVersionBadgeClicked(object sender, System.Windows.Input.MouseButtonEventArgs e)
        {
            var aboutWin = new AboutWindow();
            aboutWin.Owner = Window.GetWindow(this);
            aboutWin.ShowDialog();
        }

        private async System.Threading.Tasks.Task RefreshDashboard()
        {
            TxtStatus.Text = "Scanning workspace folders...";

            DashboardSnapshot snapshot = await WorkspaceScanner.ScanAsync(workspaceRoot);

            MetricTotalProjects.Text = snapshot.TotalProjects.ToString();
            MetricLatestProject.Text = string.IsNullOrWhiteSpace(snapshot.LatestProject) ? "None" : snapshot.LatestProject;
            MetricFileSize.Text = snapshot.FormattedTotalSize;
            MetricThisMonth.Text = snapshot.ThisMonth.ToString();
            MetricMonthComparison.Text = snapshot.MonthComparisonText;
            MetricMonthComparison.Foreground = new System.Windows.Media.SolidColorBrush((System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(snapshot.MonthComparisonColor));
            
            MetricLargestProjectName.Text = snapshot.LargestProjectName;
            MetricLargestProjectSize.Text = snapshot.LargestProjectSize;
            MetricStaleProjects.Text = snapshot.StaleProjects.ToString();

            Recent6ProjectsControl.ItemsSource = snapshot.RecentProjects;

            // Calculate Active WIP Projects (modified in last 7 days)
            int activeWip = 0;
            try
            {
                if (Directory.Exists(workspaceRoot))
                {
                    DateTime sevenDaysAgo = DateTime.Now.AddDays(-7);
                    foreach (string dir in Directory.GetDirectories(workspaceRoot, "*", SearchOption.AllDirectories))
                    {
                        DirectoryInfo di = new DirectoryInfo(dir);
                        if (di.LastWriteTime >= sevenDaysAgo) activeWip++;
                    }
                }
            }
            catch { }
            MetricActiveWIP.Text = activeWip.ToString();

            // Charts
            TypeChartControl.ItemsSource = snapshot.TypeChart;
            BrandChartControl.ItemsSource = snapshot.BrandChart;
            StorageChartControl.ItemsSource = snapshot.StorageChart;
            ActivityChartControl.ItemsSource = snapshot.ActivityChart;

            // Flow
            FlowDesignerCount.Text = snapshot.DesignerCount.ToString();
            FlowProjectCount.Text = snapshot.TotalProjects.ToString();
            FlowFileCount.Text = snapshot.TotalFiles.ToString();

            TxtStatus.Text = string.Format("Scan complete at {0:HH:mm:ss}. Connected to Synology Workspace.", DateTime.Now);
        }
    }
}
