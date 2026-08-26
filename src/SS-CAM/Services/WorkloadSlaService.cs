using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    public static class WorkloadSlaService
    {
        private static readonly Regex ProjectDirPattern = new Regex(@"^\d{6}_(\d[A-Z0-9]*)(?:_([A-Z0-9]+))?", RegexOptions.IgnoreCase);

        public static List<DesignerWorkloadItem> ComputeDesignerWorkloads(string workspaceRoot)
        {
            List<DesignerWorkloadItem> list = new List<DesignerWorkloadItem>();
            if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot))
            {
                return list;
            }

            Dictionary<string, DesignerWorkloadItem> map = new Dictionary<string, DesignerWorkloadItem>(StringComparer.OrdinalIgnoreCase);

            // 1. Seed with staff directory members
            try
            {
                var staffList = UserProfileService.GetStaffDirectory(workspaceRoot);
                if (staffList != null)
                {
                    foreach (var s in staffList)
                    {
                        if (s != null && !string.IsNullOrWhiteSpace(s.Name) &&
                            !Regex.IsMatch(s.Name, @"^\d{4}$") &&
                            !s.Name.StartsWith("#") && !s.Name.StartsWith("_"))
                        {
                            map[s.Name] = new DesignerWorkloadItem
                            {
                                DesignerName = s.Name,
                                StaffId = !string.IsNullOrWhiteSpace(s.StaffId) ? s.StaffId : (s.Role ?? "Designer")
                            };
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[WorkloadSlaService] Seed staff error: " + ex.Message);
            }

            // 2. Discover all project vaults across workspaceRoot
            try
            {
                Queue<string> queue = new Queue<string>();
                queue.Enqueue(workspaceRoot);

                while (queue.Count > 0)
                {
                    string current = queue.Dequeue();
                    string[] subDirs;
                    try { subDirs = Directory.GetDirectories(current); } catch { continue; }

                    foreach (string sub in subDirs)
                    {
                        string dirName = Path.GetFileName(sub);
                        if (dirName.StartsWith(".") || dirName.Equals("#recycle", StringComparison.OrdinalIgnoreCase) || dirName.Equals("_Team", StringComparison.OrdinalIgnoreCase))
                        {
                            continue;
                        }

                        if (ProjectDirPattern.IsMatch(dirName))
                        {
                            string staffIdOut;
                            string designerName = ResolveProjectDesigner(workspaceRoot, sub, dirName, out staffIdOut);

                            if (!map.ContainsKey(designerName))
                            {
                                map[designerName] = new DesignerWorkloadItem
                                {
                                    DesignerName = designerName,
                                    StaffId = staffIdOut
                                };
                            }

                            DesignerWorkloadItem workload = map[designerName];
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
                            queue.Enqueue(sub);
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[WorkloadSlaService] Scan error: " + ex.Message);
            }

            foreach (var kvp in map)
            {
                DesignerWorkloadItem item = kvp.Value;
                // Exclude any accidental year or system entries
                if (Regex.IsMatch(item.DesignerName, @"^\d{4}$") ||
                    Regex.IsMatch(item.DesignerName, @"^\d{6}") ||
                    item.DesignerName.StartsWith("#") || item.DesignerName.StartsWith("_"))
                {
                    continue;
                }

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

            list.Sort((a, b) =>
            {
                int cmp = b.ActiveCount.CompareTo(a.ActiveCount);
                if (cmp != 0) return cmp;
                return b.TotalProjects.CompareTo(a.TotalProjects);
            });
            return list;
        }

        private static string ResolveProjectDesigner(string root, string directory, string projectName, out string staffId)
        {
            staffId = "Designer";
            try
            {
                var staffList = UserProfileService.GetStaffDirectory(root);

                // 1. Check README.md frontmatter
                string readmePath = Path.Combine(directory, "README.md");
                if (File.Exists(readmePath))
                {
                    ProjectStatusItem psi = FrontmatterService.ReadStatus(directory);
                    if (psi != null && !string.IsNullOrWhiteSpace(psi.Designer) &&
                        !Regex.IsMatch(psi.Designer, @"^\d{4}$") &&
                        !Regex.IsMatch(psi.Designer, @"^\d{6}") &&
                        !psi.Designer.StartsWith("#") && !psi.Designer.StartsWith("_"))
                    {
                        if (staffList != null)
                        {
                            foreach (var s in staffList)
                            {
                                if (string.Equals(s.Name, psi.Designer, StringComparison.OrdinalIgnoreCase) ||
                                    string.Equals(s.StaffId, psi.Designer, StringComparison.OrdinalIgnoreCase))
                                {
                                    staffId = s.StaffId ?? s.Role ?? "Designer";
                                    return s.Name;
                                }
                            }
                        }
                        return psi.Designer;
                    }
                }

                // 2. Extract job code (e.g. 0001D, 0004P) and map to staff directory
                Match m = Regex.Match(projectName, @"^\d{6}_([A-Z0-9]+)_", RegexOptions.IgnoreCase);
                if (m.Success)
                {
                    string code = m.Groups[1].Value;
                    if (staffList != null)
                    {
                        foreach (var s in staffList)
                        {
                            if (string.Equals(s.StaffId, code, StringComparison.OrdinalIgnoreCase) ||
                                (!string.IsNullOrWhiteSpace(s.StaffId) && (s.StaffId.EndsWith(code, StringComparison.OrdinalIgnoreCase) || code.EndsWith(s.StaffId, StringComparison.OrdinalIgnoreCase))) ||
                                string.Equals(s.Name, code, StringComparison.OrdinalIgnoreCase))
                            {
                                staffId = s.StaffId ?? s.Role ?? "Designer";
                                return s.Name;
                            }
                        }
                    }
                    staffId = code;
                    return code;
                }

                // 3. Check legacy non-system folder relative to root
                string fullRoot = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
                string fullPath = Path.GetFullPath(directory);
                if (fullPath.StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase))
                {
                    string[] parts = fullPath.Substring(fullRoot.Length).Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                    if (parts.Length > 0)
                    {
                        string rel = parts[0];
                        if (!string.IsNullOrWhiteSpace(rel) &&
                            !Regex.IsMatch(rel, @"^\d{4}$") &&
                            !Regex.IsMatch(rel, @"^\d{6}") &&
                            !rel.StartsWith("_") && !rel.StartsWith("#") && !rel.StartsWith("."))
                        {
                            if (staffList != null)
                            {
                                foreach (var s in staffList)
                                {
                                    if (string.Equals(s.Name, rel, StringComparison.OrdinalIgnoreCase) ||
                                        string.Equals(s.StaffId, rel, StringComparison.OrdinalIgnoreCase))
                                    {
                                        staffId = s.StaffId ?? s.Role ?? "Designer";
                                        return s.Name;
                                    }
                                }
                            }
                            return rel;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[WorkloadSlaService] ResolveDesigner: " + ex.Message);
            }

            return "Harussani";
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
