using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    public static class WorkloadSlaService
    {
        private static readonly Regex ProjectDirPattern = new Regex(@"^\d{6}_([A-Z0-9]+)(?:_([A-Z0-9]+))?", RegexOptions.IgnoreCase);

        public static List<DesignerWorkloadItem> ComputeDesignerWorkloads(string workspaceRoot)
        {
            List<DesignerWorkloadItem> list = new List<DesignerWorkloadItem>();
            if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot))
            {
                return list;
            }

            Dictionary<string, DesignerWorkloadItem> map = new Dictionary<string, DesignerWorkloadItem>(StringComparer.OrdinalIgnoreCase);

            try
            {
                string[] topLevelDirs = Directory.GetDirectories(workspaceRoot);
                foreach (string topDir in topLevelDirs)
                {
                    string dirName = Path.GetFileName(topDir);
                    if (dirName.StartsWith(".") || dirName.StartsWith("_")) continue;

                    // Determine if topDir is a designer folder (e.g. 0001D_Ahmad_Faiz, 0002S_Siti_Sarah, 0001D, Faiz)
                    string designerKey = dirName;
                    string staffId = dirName;
                    string displayName = dirName;

                    if (dirName.Contains("_"))
                    {
                        string[] parts = dirName.Split('_');
                        staffId = parts[0];
                        displayName = string.Join(" ", parts);
                    }

                    // Discover project folders under this designer folder or recursively
                    ScanProjectsForDesigner(topDir, designerKey, displayName, staffId, map);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[WorkloadSlaService] Scan error: " + ex.Message);
            }

            foreach (var kvp in map)
            {
                DesignerWorkloadItem item = kvp.Value;
                item.ActiveCount = item.InProgressCount + item.ReviewCount + item.RevisionCount;
                item.CapacityPercent = Math.Min(100.0, Math.Round((item.ActiveCount / 4.0) * 100.0, 0));

                if (item.ActiveCount <= 2)
                {
                    item.CapacityStatus = "Optimal Bandwidth";
                    item.CapacityColor = "#10B981"; // Emerald green
                }
                else if (item.ActiveCount <= 4)
                {
                    item.CapacityStatus = "High Load";
                    item.CapacityColor = "#F59E0B"; // Amber warning
                }
                else
                {
                    item.CapacityStatus = "At Capacity";
                    item.CapacityColor = "#EF4444"; // Red critical
                }

                list.Add(item);
            }

            list.Sort((a, b) => b.ActiveCount.CompareTo(a.ActiveCount));
            return list;
        }

        private static void ScanProjectsForDesigner(string dir, string designerKey, string displayName, string staffId, Dictionary<string, DesignerWorkloadItem> map)
        {
            string[] subDirs;
            try { subDirs = Directory.GetDirectories(dir); } catch { return; }

            foreach (string sub in subDirs)
            {
                string folderName = Path.GetFileName(sub);
                Match m = ProjectDirPattern.Match(folderName);

                if (m.Success)
                {
                    if (!map.ContainsKey(designerKey))
                    {
                        map[designerKey] = new DesignerWorkloadItem
                        {
                            DesignerName = displayName,
                            StaffId = staffId
                        };
                    }

                    DesignerWorkloadItem workload = map[designerKey];
                    workload.TotalProjects++;

                    // Parse README.md status if available
                    string readmePath = Path.Combine(sub, "README.md");
                    string status = "in-progress";
                    bool isOverdue = false;

                    if (File.Exists(readmePath))
                    {
                        try
                        {
                            string text = File.ReadAllText(readmePath);
                            status = ExtractFrontmatterValue(text, "status", "in-progress").ToLower();
                            string deadlineStr = ExtractFrontmatterValue(text, "deadline", "");
                            DateTime deadline;
                            if (DateTime.TryParse(deadlineStr, out deadline) && deadline < DateTime.Today && status != "done" && status != "approved")
                            {
                                isOverdue = true;
                            }
                        }
                        catch (Exception ex)
                        {
                            System.Diagnostics.Debug.WriteLine("[WorkloadSlaService] Readme parse warning: " + ex.Message);
                        }
                    }

                    if (status == "in-progress") workload.InProgressCount++;
                    else if (status == "review") workload.ReviewCount++;
                    else if (status == "revision") workload.RevisionCount++;
                    else if (status == "done" || status == "approved") workload.DoneCount++;
                    else workload.InProgressCount++;

                    if (isOverdue) workload.OverdueCount++;
                }
                else
                {
                    ScanProjectsForDesigner(sub, designerKey, displayName, staffId, map);
                }
            }
        }

        public static SlaMetricsSnapshot ComputeSlaMetrics(string workspaceRoot)
        {
            SlaMetricsSnapshot snapshot = new SlaMetricsSnapshot();
            if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot))
            {
                return snapshot;
            }

            Dictionary<string, BrandSlaItem> brandMap = new Dictionary<string, BrandSlaItem>(StringComparer.OrdinalIgnoreCase);
            List<double> turnaroundTimes = new List<double>();
            int totalRevsInCompleted = 0;
            int zeroRevCount = 0;

            try
            {
                string[] allDirs = Directory.GetDirectories(workspaceRoot, "*", SearchOption.AllDirectories);
                foreach (string dir in allDirs)
                {
                    string folderName = Path.GetFileName(dir);
                    Match m = ProjectDirPattern.Match(folderName);
                    if (!m.Success) continue;

                    string brand = m.Groups[2].Success ? m.Groups[2].Value.ToUpperInvariant() : "SS";
                    if (!brandMap.ContainsKey(brand))
                    {
                        brandMap[brand] = new BrandSlaItem { Brand = brand };
                    }
                    BrandSlaItem bItem = brandMap[brand];
                    bItem.TotalProjects++;

                    string readmePath = Path.Combine(dir, "README.md");
                    string status = "in-progress";
                    int revCount = 0;
                    DateTime createdDate = Directory.GetCreationTime(dir);

                    if (File.Exists(readmePath))
                    {
                        try
                        {
                            string text = File.ReadAllText(readmePath);
                            status = ExtractFrontmatterValue(text, "status", "in-progress").ToLower();
                            string revStr = ExtractFrontmatterValue(text, "revision", "0");
                            int.TryParse(revStr, out revCount);
                            string createdStr = ExtractFrontmatterValue(text, "created", "");
                            DateTime parsedCreated;
                            if (DateTime.TryParse(createdStr, out parsedCreated))
                            {
                                createdDate = parsedCreated;
                            }
                        }
                        catch (Exception ex)
                        {
                            System.Diagnostics.Debug.WriteLine("[WorkloadSlaService] SLA read error: " + ex.Message);
                        }
                    }

                    if (status == "done" || status == "approved")
                    {
                        snapshot.TotalCompletedProjects++;
                        bItem.CompletedProjects++;

                        DateTime modifiedDate = Directory.GetLastWriteTime(dir);
                        double days = Math.Max(1.0, (modifiedDate - createdDate).TotalDays);
                        turnaroundTimes.Add(days);

                        totalRevsInCompleted += revCount;
                        if (revCount == 0) zeroRevCount++;
                    }
                    else
                    {
                        bItem.ActiveProjects++;
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[WorkloadSlaService] Sla computation error: " + ex.Message);
            }

            if (turnaroundTimes.Count > 0)
            {
                double sum = 0;
                for (int i = 0; i < turnaroundTimes.Count; i++) sum += turnaroundTimes[i];
                snapshot.AvgTurnaroundDays = Math.Round(sum / turnaroundTimes.Count, 1);
                snapshot.FirstTimeRightPercent = Math.Round(((double)zeroRevCount / turnaroundTimes.Count) * 100.0, 1);
                snapshot.AvgRevisionsPerProject = Math.Round((double)totalRevsInCompleted / turnaroundTimes.Count, 1);
            }
            else
            {
                snapshot.AvgTurnaroundDays = 3.5; // Baseline benchmark
                snapshot.FirstTimeRightPercent = 85.0;
                snapshot.AvgRevisionsPerProject = 0.4;
            }

            foreach (var kvp in brandMap)
            {
                kvp.Value.AvgTurnaroundDays = snapshot.AvgTurnaroundDays;
                snapshot.BrandSlaList.Add(kvp.Value);
            }

            snapshot.BrandSlaList.Sort((a, b) => b.TotalProjects.CompareTo(a.TotalProjects));
            return snapshot;
        }

        private static string ExtractFrontmatterValue(string markdown, string key, string defaultValue)
        {
            if (string.IsNullOrWhiteSpace(markdown)) return defaultValue;
            Match m = Regex.Match(markdown, @"^" + Regex.Escape(key) + @":\s*(.+)$", RegexOptions.Multiline | RegexOptions.IgnoreCase);
            if (m.Success)
            {
                return m.Groups[1].Value.Trim().Trim('\'', '"');
            }
            return defaultValue;
        }
    }
}
