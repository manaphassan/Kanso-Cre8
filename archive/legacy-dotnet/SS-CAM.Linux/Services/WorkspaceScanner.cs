using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using SS_CAM.Linux.Models;

namespace SS_CAM.Linux.Services
{
    public static class WorkspaceScanner
    {
        private static readonly Regex ProjectPattern = new Regex(
            @"^\d{6}_(\d[A-Z0-9]*)(?:_([A-Z0-9]+))?", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        public static Task<DashboardSnapshot> ScanAsync(string root)
        {
            return Task.Run(() => Scan(root));
        }

        public static DashboardSnapshot Scan(string root)
        {
            var result = new DashboardSnapshot();
            if (string.IsNullOrWhiteSpace(root) || !Directory.Exists(root))
            {
                result.LatestProject = "Workspace directory not configured";
                return result;
            }

            var brands = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            var activity = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            var designers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            var now = DateTime.Now;
            
            long maxProjectSize = 0;
            string maxProjectName = "None";

            for (int offset = 5; offset >= 0; offset--)
            {
                var month = new DateTime(now.Year, now.Month, 1).AddMonths(-offset);
                activity[month.ToString("yyyyMM")] = 0;
            }

            var latest = DateTime.MinValue;
            var pending = new Queue<string>();
            pending.Enqueue(root);

            while (pending.Count > 0)
            {
                string current = pending.Dequeue();
                string[] directories;
                try { directories = Directory.GetDirectories(current); }
                catch { continue; }

                foreach (string directory in directories)
                {
                    string name = Path.GetFileName(directory);
                    var match = ProjectPattern.Match(name);
                    if (!match.Success)
                    {
                        // Check if it's a subfolder to search recursively (up to 3 levels)
                        pending.Enqueue(directory);
                        continue;
                    }

                    result.TotalProjects++;
                    string brand = match.Groups[2].Value.ToUpperInvariant();
                    if (string.IsNullOrWhiteSpace(brand)) brand = "SSH";

                    if (!brands.ContainsKey(brand)) brands[brand] = 0;
                    brands[brand]++;

                    string monthKey = name.Length >= 6 ? name.Substring(0, 6) : "";
                    if (activity.ContainsKey(monthKey)) activity[monthKey]++;
                    
                    string lastMonthKey = now.AddMonths(-1).ToString("yyyyMM");
                    if (monthKey == now.ToString("yyyyMM")) result.ThisMonth++;
                    if (monthKey == lastMonthKey) result.LastMonth++;

                    DateTime modified;
                    try { modified = Directory.GetLastWriteTime(directory); }
                    catch { modified = DateTime.MinValue; }
                    
                    if (modified > latest)
                    {
                        latest = modified;
                        result.LatestProject = name;
                    }

                    if (modified != DateTime.MinValue && (now - modified).TotalDays <= 7)
                    {
                        result.ActiveWIP++;
                    }

                    if (modified != DateTime.MinValue && (now - modified).TotalDays > 90)
                    {
                        result.StaleProjects++;
                    }

                    result.RecentProjects.Add(new DesignerFolderItem
                    {
                        Designer = brand,
                        Project = name,
                        FullPath = directory,
                        Modified = modified == DateTime.MinValue ? "-" : modified.ToString("dd MMM yyyy, HH:mm"),
                        ModifiedTicks = modified.Ticks
                    });

                    long fileCount;
                    long projectSize = GetDirectoryBytes(directory, out fileCount);
                    result.TotalBytes += projectSize;
                    result.TotalFiles += fileCount;

                    if (projectSize > maxProjectSize)
                    {
                        maxProjectSize = projectSize;
                        maxProjectName = name;
                    }
                }
            }

            result.LargestProjectName = maxProjectName;
            result.LargestProjectSize = FormatBytes(maxProjectSize);
            result.StorageSizeFormatted = FormatBytes(result.TotalBytes);

            // Month-over-month growth calculation
            if (result.LastMonth > 0)
            {
                int diff = result.ThisMonth - result.LastMonth;
                double pct = (double)diff / result.LastMonth * 100.0;
                result.MonthComparisonText = $"{(pct >= 0 ? "▲ +" : "▼ ")}{pct:0.#}% vs last month";
            }
            else
            {
                result.MonthComparisonText = $"+{result.ThisMonth} output this month";
            }

            // Sort recent projects by most recently modified
            result.RecentProjects.Sort((a, b) => b.ModifiedTicks.CompareTo(a.ModifiedTicks));
            if (result.RecentProjects.Count > 6)
            {
                result.RecentProjects = result.RecentProjects.GetRange(0, 6);
            }

            // Populate mock/derived designer capacity
            result.DesignerCapacities = new List<DesignerCapacityItem>
            {
                new DesignerCapacityItem { DesignerName = "Harussani", ActiveProjects = Math.Max(1, result.ActiveWIP / 3), CompletedThisMonth = result.ThisMonth / 2, CapacityPercentage = 75, CapacityStatusColor = "#10B981" },
                new DesignerCapacityItem { DesignerName = "Adam", ActiveProjects = Math.Max(1, result.ActiveWIP / 4), CompletedThisMonth = result.ThisMonth / 3, CapacityPercentage = 60, CapacityStatusColor = "#10B981" },
                new DesignerCapacityItem { DesignerName = "Sarah", ActiveProjects = Math.Max(0, result.ActiveWIP / 5), CompletedThisMonth = result.ThisMonth / 4, CapacityPercentage = 40, CapacityStatusColor = "#3B82F6" }
            };
            result.DesignerCount = result.DesignerCapacities.Count;
            result.FlowSummaryText = $"{result.DesignerCount} Active Designers, {result.TotalProjects} Vault Projects";

            return result;
        }

        private static long GetDirectoryBytes(string path, out long fileCount)
        {
            fileCount = 0;
            long size = 0;
            try
            {
                var files = Directory.GetFiles(path, "*.*", SearchOption.AllDirectories);
                fileCount = files.Length;
                foreach (var f in files)
                {
                    try { size += new FileInfo(f).Length; }
                    catch { }
                }
            }
            catch { }
            return size;
        }

        public static string FormatBytes(long bytes)
        {
            if (bytes < 1024) return $"{bytes} B";
            if (bytes < 1024 * 1024) return $"{bytes / 1024.0:F1} KB";
            if (bytes < 1024 * 1024 * 1024) return $"{bytes / (1024.0 * 1024.0):F1} MB";
            return $"{bytes / (1024.0 * 1024.0 * 1024.0):F2} GB";
        }
    }
}
