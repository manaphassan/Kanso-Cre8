using System;
using System.Collections.Generic;

namespace SS_CAM.Linux.Models
{
    public class DashboardSnapshot
    {
        public int TotalProjects { get; set; }
        public int ActiveWIP { get; set; }
        public string LatestProject { get; set; } = "-";
        public string StorageSizeFormatted { get; set; } = "0 MB";
        public long TotalBytes { get; set; }
        public long TotalFiles { get; set; }
        public int ThisMonth { get; set; }
        public int LastMonth { get; set; }
        public string MonthComparisonText { get; set; } = "+0% vs last month";
        public string LargestProjectName { get; set; } = "None";
        public string LargestProjectSize { get; set; } = "0 MB";
        public int StaleProjects { get; set; }
        public int DesignerCount { get; set; }
        public string FlowSummaryText { get; set; } = "0 Designers, 0 Projects";
        public List<DesignerFolderItem> RecentProjects { get; set; } = new List<DesignerFolderItem>();
        public List<DesignerCapacityItem> DesignerCapacities { get; set; } = new List<DesignerCapacityItem>();
    }

    public class DesignerFolderItem
    {
        public string Designer { get; set; } = "";
        public string Project { get; set; } = "";
        public string FullPath { get; set; } = "";
        public string Modified { get; set; } = "-";
        public long ModifiedTicks { get; set; }
    }

    public class DesignerCapacityItem
    {
        public string DesignerName { get; set; } = "";
        public int ActiveProjects { get; set; }
        public int CompletedThisMonth { get; set; }
        public double CapacityPercentage { get; set; }
        public string CapacityStatusColor { get; set; } = "#10B981"; // green / amber / red
    }
}
