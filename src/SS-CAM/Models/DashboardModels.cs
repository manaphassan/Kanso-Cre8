using System;
using System.Collections.Generic;

namespace SS_CAM.Models
{
    public class DashboardChartItem
    {
        public string Label { get; set; }
        public int Count { get; set; }
        public double BarWidth { get; set; }
        public double BarHeight { get; set; }
        public string Percent { get; set; }
        public string Color { get; set; }
    }

    public class DesignerFolderChoice
    {
        public string Name { get; set; }
        public string StaffId { get; set; }
        public string Display { get { return string.IsNullOrWhiteSpace(StaffId) ? Name : Name + " (" + StaffId + ")"; } }
    }

    public class DesignerFolderItem
    {
        public string Designer { get; set; }
        public string Project { get; set; }
        public string FullPath { get; set; }
        public string Modified { get; set; }
        public long ModifiedTicks { get; set; }
        public int FileCount { get; set; }
        public string FormattedSize { get; set; }
    }

    public class FileSearchItem
    {
        public string Name { get; set; }
        public string FullPath { get; set; }
        public string Folder { get; set; }
        public string Size { get; set; }
        public string Modified { get; set; }
    }

    public class DesignerWorkloadItem
    {
        public string DesignerName { get; set; }
        public string StaffId { get; set; }
        public int TotalProjects { get; set; }
        public int ActiveCount { get; set; }
        public int InProgressCount { get; set; }
        public int ReviewCount { get; set; }
        public int RevisionCount { get; set; }
        public int DoneCount { get; set; }
        public int OverdueCount { get; set; }
        public double CapacityPercent { get; set; }
        public string CapacityStatus { get; set; }
        public string CapacityColor { get; set; }

        public DesignerWorkloadItem()
        {
            CapacityStatus = "Optimal";
            CapacityColor = "#10B981"; // Success Green
        }
    }

    public class BrandSlaItem
    {
        public string Brand { get; set; }
        public int TotalProjects { get; set; }
        public int ActiveProjects { get; set; }
        public int CompletedProjects { get; set; }
        public double AvgTurnaroundDays { get; set; }
    }

    public class SlaMetricsSnapshot
    {
        public double AvgTurnaroundDays { get; set; }
        public double FirstTimeRightPercent { get; set; }
        public double AvgRevisionsPerProject { get; set; }
        public int TotalCompletedProjects { get; set; }
        public int OverdueProjectsCount { get; set; }
        public List<BrandSlaItem> BrandSlaList { get; set; }

        public SlaMetricsSnapshot()
        {
            BrandSlaList = new List<BrandSlaItem>();
            FirstTimeRightPercent = 100.0;
        }
    }

    public class DashboardSnapshot
    {
        public int TotalProjects { get; set; }
        public string LatestProject { get; set; }
        public long TotalBytes { get; set; }
        public string FormattedTotalSize { get; set; }
        public string ProjectTypes { get; set; }
        public string SubBrands { get; set; }
        public int ThisMonth { get; set; }
        public int LastMonth { get; set; }
        public string MonthComparisonText { get; set; }
        public string MonthComparisonColor { get; set; }
        public int DesignerCount { get; set; }
        public long TotalFiles { get; set; }
        public List<DashboardChartItem> TypeChart { get; set; }
        public List<DashboardChartItem> BrandChart { get; set; }
        public List<DashboardChartItem> ActivityChart { get; set; }
        public List<DashboardChartItem> StorageChart { get; set; }
        public List<DesignerFolderItem> RecentProjects { get; set; }
        public List<DesignerWorkloadItem> DesignerWorkloads { get; set; }
        public SlaMetricsSnapshot SlaMetrics { get; set; }

        public string LargestProjectName { get; set; }
        public string LargestProjectSize { get; set; }
        public int StaleProjects { get; set; }

        public DashboardSnapshot()
        {
            TypeChart = new List<DashboardChartItem>();
            BrandChart = new List<DashboardChartItem>();
            ActivityChart = new List<DashboardChartItem>();
            StorageChart = new List<DashboardChartItem>();
            RecentProjects = new List<DesignerFolderItem>();
            DesignerWorkloads = new List<DesignerWorkloadItem>();
            SlaMetrics = new SlaMetricsSnapshot();
            LatestProject = "No projects found";
            LargestProjectName = "None";
            LargestProjectSize = "0 MB";
            FormattedTotalSize = "0 B";
            MonthComparisonText = "Same as last month";
            MonthComparisonColor = "#64748B";
        }
    }
}
