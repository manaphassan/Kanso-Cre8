using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    public static class WorkspaceScanner
    {
        // Job-ID segment must start with a digit (e.g. 0001D, 0002S).
        // This excludes month-container folders like 202608_August (letter-only segment)
        // while correctly matching all canonical project folder names.
        private static readonly Regex ProjectPattern = new Regex(
            @"^\d{6}_(\d[A-Z0-9]*)(?:_([A-Z0-9]+))?", RegexOptions.IgnoreCase | RegexOptions.Compiled);

        private static readonly string[] ChartColors = new[] { "#21A1F7", "#043388", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899" };

        public static Task<DashboardSnapshot> ScanAsync(string root)
        {
            return Task.Factory.StartNew(() => Scan(root));
        }

        public static DashboardSnapshot Scan(string root)
        {
            DashboardSnapshot result = new DashboardSnapshot();
            if (string.IsNullOrWhiteSpace(root) || !Directory.Exists(root))
            {
                result.LatestProject = "Workspace directory not found";
                return result;
            }

            Dictionary<string, int> types = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            Dictionary<string, int> brands = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            Dictionary<string, long> storageByBrand = new Dictionary<string, long>(StringComparer.OrdinalIgnoreCase);
            Dictionary<string, int> activity = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            HashSet<string> designers = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            DateTime now = DateTime.Now;
            
            long maxProjectSize = 0;
            string maxProjectName = "None";

            for (int offset = 5; offset >= 0; offset--)
            {
                DateTime month = new DateTime(now.Year, now.Month, 1).AddMonths(-offset);
                activity[month.ToString("yyyyMM")] = 0;
            }

            DateTime latest = DateTime.MinValue;
            Queue<string> pending = new Queue<string>();
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
                    Match match = ProjectPattern.Match(name);
                    if (!match.Success)
                    {
                        pending.Enqueue(directory);
                        continue;
                    }

                    result.TotalProjects++;
                    string job = match.Groups[1].Value.ToUpperInvariant();
                    string brand = match.Groups[2].Value.ToUpperInvariant();
                    string projectCode = GetProjectCode(job);
                    string type = projectCode.StartsWith("S") ? "Social Media" :
                        projectCode.StartsWith("V") ? "Video" :
                        projectCode.StartsWith("P") ? "Brand Identity" : "Graphic / Print";

                    AddCount(types, type);
                    AddCount(brands, brand);

                    string monthKey = name.Length >= 6 ? name.Substring(0, 6) : "";
                    if (activity.ContainsKey(monthKey)) activity[monthKey]++;
                    string lastMonthKey = now.AddMonths(-1).ToString("yyyyMM");
                    if (monthKey == now.ToString("yyyyMM")) result.ThisMonth++;
                    if (monthKey == lastMonthKey) result.LastMonth++;

                    try
                    {
                        string fullRoot = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
                        string fullDirectory = Path.GetFullPath(directory);
                        if (fullDirectory.StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase))
                        {
                            string[] parts = fullDirectory.Substring(fullRoot.Length).Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                            if (parts.Length >= 4 && !Regex.IsMatch(parts[0], @"^\d{4}$")) designers.Add(parts[0]);
                        }
                    }
                    catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }

                    DateTime modified;
                    try { modified = Directory.GetLastWriteTime(directory); }
                    catch { modified = DateTime.MinValue; }
                    if (modified > latest)
                    {
                        latest = modified;
                        result.LatestProject = name;
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

                    if (!storageByBrand.ContainsKey(brand)) storageByBrand[brand] = 0;
                    storageByBrand[brand] += projectSize;
                }
            }

            result.LargestProjectName = maxProjectName;
            result.LargestProjectSize = FormatBytes(maxProjectSize);

            // Sort recent projects by modified date descending, take top 6
            result.RecentProjects.Sort((a, b) => b.ModifiedTicks.CompareTo(a.ModifiedTicks));
            if (result.RecentProjects.Count > 6)
            {
                result.RecentProjects = result.RecentProjects.GetRange(0, 6);
            }

            // Month Comparison Indicator
            if (result.LastMonth == 0)
            {
                result.MonthComparisonText = string.Format("▲ +{0} projects vs last month", result.ThisMonth);
                result.MonthComparisonColor = "#10B981"; // Green
            }
            else
            {
                int diff = result.ThisMonth - result.LastMonth;
                if (diff > 0)
                {
                    double pct = Math.Round((double)diff / result.LastMonth * 100.0, 1);
                    result.MonthComparisonText = string.Format("▲ +{0}% (+{1} vs last month)", pct, diff);
                    result.MonthComparisonColor = "#10B981"; // Green
                }
                else if (diff < 0)
                {
                    double pct = Math.Round((double)Math.Abs(diff) / result.LastMonth * 100.0, 1);
                    result.MonthComparisonText = string.Format("▼ -{0}% ({1} vs last month)", pct, diff);
                    result.MonthComparisonColor = "#EF4444"; // Red
                }
                else
                {
                    result.MonthComparisonText = "Same as last month";
                    result.MonthComparisonColor = "#64748B";
                }
            }

            result.FormattedTotalSize = FormatBytes(result.TotalBytes);
            result.ProjectTypes = FormatCounts(types);
            result.SubBrands = FormatCounts(brands);
            result.DesignerCount = designers.Count;
            result.TypeChart = BuildChart(types, false);
            result.BrandChart = BuildChart(brands, false);
            result.ActivityChart = BuildActivityChart(activity);
            result.StorageChart = BuildStorageChart(storageByBrand);

            try
            {
                result.DesignerWorkloads = WorkloadSlaService.ComputeDesignerWorkloads(root);
                result.SlaMetrics = WorkloadSlaService.ComputeSlaMetrics(root);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[WorkspaceScanner] Workload/SLA compute warning: " + ex.Message);
            }

            return result;
        }

        public static Task<List<DesignerFolderItem>> ListDesignerFoldersAsync(string root, string staffId, string query, int limit)
        {
            return Task.Factory.StartNew(() => ListDesignerFolders(root, staffId, query, limit));
        }

        /// <summary>
        /// Returns staff directory designers and active team folder names for the filter dropdown.
        /// Excludes system, hidden, recycle, year (e.g. 2026), and month container folders.
        /// </summary>
        public static List<DesignerFolderChoice> GetDesignerFolders(string root)
        {
            Dictionary<string, DesignerFolderChoice> map = new Dictionary<string, DesignerFolderChoice>(StringComparer.OrdinalIgnoreCase);

            // 1. Staff directory members
            try
            {
                var staffList = UserProfileService.GetStaffDirectory(root);
                if (staffList != null)
                {
                    foreach (var staff in staffList)
                    {
                        if (staff != null && !string.IsNullOrWhiteSpace(staff.Name))
                        {
                            if (!map.ContainsKey(staff.Name))
                            {
                                map[staff.Name] = new DesignerFolderChoice
                                {
                                    Name = staff.Name,
                                    StaffId = staff.StaffId ?? staff.Name
                                };
                            }
                        }
                    }
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[WorkspaceScanner] StaffDirectory: " + ex.Message); }

            // 2. Discover legacy first-level folders in workspace root
            if (!string.IsNullOrWhiteSpace(root) && Directory.Exists(root))
            {
                try
                {
                    string[] dirs = Directory.GetDirectories(root);
                    foreach (string dir in dirs)
                    {
                        string name = Path.GetFileName(dir);
                        if (name.StartsWith("_") || name.StartsWith(".") || name.StartsWith("#") ||
                            string.Equals(name, "recycle", StringComparison.OrdinalIgnoreCase) ||
                            string.Equals(name, "#recycle", StringComparison.OrdinalIgnoreCase) ||
                            Regex.IsMatch(name, @"^\d{4}$") ||
                            Regex.IsMatch(name, @"^\d{6}") ||
                            ProjectPattern.IsMatch(name))
                        {
                            continue;
                        }

                        if (!map.ContainsKey(name))
                        {
                            map[name] = new DesignerFolderChoice { Name = name, StaffId = name };
                        }
                    }
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[WorkspaceScanner] Root dirs: " + ex.Message); }
            }

            List<DesignerFolderChoice> result = new List<DesignerFolderChoice>(map.Values);
            result.Sort(delegate(DesignerFolderChoice a, DesignerFolderChoice b)
            {
                return string.Compare(a.Name, b.Name, StringComparison.OrdinalIgnoreCase);
            });
            return result;
        }

        private static string ResolveProjectDesigner(string root, string directory, string projectName)
        {
            try
            {
                // 1. Check README.md frontmatter
                string readmePath = Path.Combine(directory, "README.md");
                if (File.Exists(readmePath))
                {
                    ProjectStatusItem psi = FrontmatterService.ReadStatus(directory);
                    if (psi != null && !string.IsNullOrWhiteSpace(psi.Designer))
                    {
                        return psi.Designer;
                    }
                }

                // 2. Extract job code (e.g. 0001D, 0004P) and map to staff directory
                Match m = Regex.Match(projectName, @"^\d{6}_([A-Z0-9]+)_", RegexOptions.IgnoreCase);
                if (m.Success)
                {
                    string code = m.Groups[1].Value;
                    var staffList = UserProfileService.GetStaffDirectory(root);
                    if (staffList != null)
                    {
                        foreach (var staff in staffList)
                        {
                            if (string.Equals(staff.StaffId, code, StringComparison.OrdinalIgnoreCase) ||
                                (!string.IsNullOrWhiteSpace(staff.StaffId) && (staff.StaffId.EndsWith(code, StringComparison.OrdinalIgnoreCase) || code.EndsWith(staff.StaffId, StringComparison.OrdinalIgnoreCase))) ||
                                string.Equals(staff.Name, code, StringComparison.OrdinalIgnoreCase))
                            {
                                return staff.Name;
                            }
                        }
                    }
                    return code;
                }

                // 3. Check legacy non-system folder relative to root
                string rel = GetFirstRelativePart(root, directory);
                if (!string.IsNullOrWhiteSpace(rel) &&
                    !Regex.IsMatch(rel, @"^\d{4}$") &&
                    !Regex.IsMatch(rel, @"^\d{6}") &&
                    !rel.StartsWith("_") && !rel.StartsWith("#") && !rel.StartsWith("."))
                {
                    return rel;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[WorkspaceScanner] ResolveDesigner: " + ex.Message);
            }

            return "Creative Team";
        }

        public static List<DesignerFolderItem> ListDesignerFolders(string root, string staffId, string query, int limit)
        {
            List<DesignerFolderItem> results = new List<DesignerFolderItem>();
            if (string.IsNullOrWhiteSpace(root) || !Directory.Exists(root)) return results;
            string scanRoot = root;
            if (!string.IsNullOrWhiteSpace(staffId))
            {
                string candidate = Path.Combine(root, staffId);
                if (Directory.Exists(candidate)) scanRoot = candidate;
            }
            Queue<string> pending = new Queue<string>();
            pending.Enqueue(scanRoot);

            while (pending.Count > 0 && results.Count < limit)
            {
                string current = pending.Dequeue();
                string[] directories;
                try { directories = Directory.GetDirectories(current); }
                catch { continue; }

                foreach (string directory in directories)
                {
                    string name = Path.GetFileName(directory);
                    if (ProjectPattern.IsMatch(name))
                    {
                        if (!string.IsNullOrWhiteSpace(query) && name.IndexOf(query, StringComparison.OrdinalIgnoreCase) < 0) continue;
                        string designer = string.IsNullOrWhiteSpace(staffId) ? ResolveProjectDesigner(root, directory, name) : staffId;
                        DateTime modified;
                        try { modified = Directory.GetLastWriteTime(directory); } catch { modified = DateTime.MinValue; }

                        long fileCount = 0;
                        long sizeInBytes = GetDirectoryBytes(directory, out fileCount);

                        results.Add(new DesignerFolderItem
                        {
                            Designer = designer,
                            Project = name,
                            FullPath = directory,
                            Modified = modified.ToString("dd MMM yyyy HH:mm"),
                            ModifiedTicks = modified.Ticks,
                            FileCount = (int)fileCount,
                            FormattedSize = FormatBytes(sizeInBytes)
                        });

                        if (results.Count >= limit) break;
                    }
                    else pending.Enqueue(directory);
                }
            }

            results.Sort((left, right) => right.ModifiedTicks.CompareTo(left.ModifiedTicks));
            return results;
        }

        public static Task<List<FileSearchItem>> ListProjectFilesAsync(string root, int limit)
        {
            return Task.Factory.StartNew(() => ListProjectFiles(root, limit));
        }

        public static List<FileSearchItem> ListProjectFiles(string root, int limit)
        {
            List<FileSearchItem> results = new List<FileSearchItem>();
            if (string.IsNullOrWhiteSpace(root) || !Directory.Exists(root)) return results;

            Queue<string> pending = new Queue<string>();
            pending.Enqueue(root);

            while (pending.Count > 0 && results.Count < limit)
            {
                string current = pending.Dequeue();
                try
                {
                    foreach (string directory in Directory.GetDirectories(current)) pending.Enqueue(directory);
                    foreach (string file in Directory.GetFiles(current))
                    {
                        if (results.Count >= limit) break;
                        try
                        {
                            FileInfo info = new FileInfo(file);
                            string relativeFolder = ".";
                            if (info.DirectoryName.Length > root.Length)
                                relativeFolder = info.DirectoryName.Substring(root.Length).TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);

                            results.Add(new FileSearchItem
                            {
                                Name = info.Name,
                                FullPath = info.FullName,
                                Folder = relativeFolder,
                                Size = FormatBytes(info.Length),
                                Modified = info.LastWriteTime.ToString("dd MMM yyyy HH:mm")
                            });
                        }
                        catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
                    }
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
            }
            return results;
        }

        public static string FormatBytes(long bytes)
        {
            double value = bytes;
            string[] units = new string[] { "B", "KB", "MB", "GB", "TB" };
            int unit = 0;
            while (value >= 1024 && unit < units.Length - 1) { value /= 1024; unit++; }
            return value.ToString(unit == 0 ? "0" : "0.0") + " " + units[unit];
        }

        private static long GetDirectoryBytes(string root, out long fileCount)
        {
            long total = 0;
            fileCount = 0;
            Queue<string> pending = new Queue<string>();
            pending.Enqueue(root);
            while (pending.Count > 0)
            {
                string current = pending.Dequeue();
                try
                {
                    foreach (string file in Directory.GetFiles(current))
                    {
                        try { total += new FileInfo(file).Length; fileCount++; } catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
                    }
                    foreach (string directory in Directory.GetDirectories(current)) pending.Enqueue(directory);
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
            }
            return total;
        }

        private static List<DashboardChartItem> BuildStorageChart(Dictionary<string, long> values)
        {
            List<DashboardChartItem> result = new List<DashboardChartItem>();
            if (values == null || values.Count == 0) return result;

            long max = 0;
            long total = 0;
            foreach (long size in values.Values)
            {
                if (size > max) max = size;
                total += size;
            }

            int colorIndex = 0;
            foreach (KeyValuePair<string, long> pair in values)
            {
                double ratio = max > 0 ? (double)pair.Value / max : 0;
                double pct = total > 0 ? (double)pair.Value / total * 100 : 0;
                result.Add(new DashboardChartItem
                {
                    Label = pair.Key,
                    Count = (int)(pair.Value / (1024 * 1024)), // Store MB in count for now
                    BarWidth = ratio * 180,
                    BarHeight = ratio * 100,
                    Percent = FormatBytes(pair.Value) + " (" + Math.Round(pct, 1) + "%)",
                    Color = ChartColors[colorIndex % ChartColors.Length]
                });
                colorIndex++;
            }

            result.Sort((a, b) => b.Count.CompareTo(a.Count));
            return result;
        }

        private static List<DashboardChartItem> BuildChart(Dictionary<string, int> values, bool isHeight)
        {
            List<DashboardChartItem> result = new List<DashboardChartItem>();
            if (values == null || values.Count == 0) return result;

            int max = 0;
            int total = 0;
            foreach (int count in values.Values)
            {
                if (count > max) max = count;
                total += count;
            }

            int colorIndex = 0;
            foreach (KeyValuePair<string, int> pair in values)
            {
                double ratio = max > 0 ? (double)pair.Value / max : 0;
                double pct = total > 0 ? (double)pair.Value / total * 100 : 0;
                result.Add(new DashboardChartItem
                {
                    Label = pair.Key,
                    Count = pair.Value,
                    BarWidth = ratio * 180,
                    BarHeight = ratio * 100,
                    Percent = pct.ToString("0") + "%",
                    Color = ChartColors[colorIndex % ChartColors.Length]
                });
                colorIndex++;
            }
            return result;
        }

        private static List<DashboardChartItem> BuildActivityChart(Dictionary<string, int> activity)
        {
            List<DashboardChartItem> result = new List<DashboardChartItem>();
            if (activity == null || activity.Count == 0) return result;

            int max = 0;
            foreach (int count in activity.Values) if (count > max) max = count;

            foreach (KeyValuePair<string, int> pair in activity)
            {
                string monthLabel = pair.Key;
                try
                {
                    DateTime dt = DateTime.ParseExact(pair.Key, "yyyyMM", null);
                    monthLabel = dt.ToString("MMM");
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }

                double height = max > 0 ? (double)pair.Value / max * 110 : 4;
                if (height < 4) height = 4;

                result.Add(new DashboardChartItem
                {
                    Label = monthLabel,
                    Count = pair.Value,
                    BarHeight = height,
                    BarWidth = 24,
                    Color = "#21A1F7"
                });
            }
            return result;
        }

        private static string GetProjectCode(string job)
        {
            Match oldFormat = Regex.Match(job, @"^([A-Z-]+)\d+$", RegexOptions.IgnoreCase);
            if (oldFormat.Success) return oldFormat.Groups[1].Value.ToUpperInvariant();
            Match newFormat = Regex.Match(job, @"^\d+([A-Z-]+)$", RegexOptions.IgnoreCase);
            return newFormat.Success ? newFormat.Groups[1].Value.ToUpperInvariant() : job.ToUpperInvariant();
        }

        private static void AddCount(Dictionary<string, int> dictionary, string key)
        {
            if (string.IsNullOrWhiteSpace(key)) return;
            if (dictionary.ContainsKey(key)) dictionary[key]++;
            else dictionary[key] = 1;
        }

        private static string FormatCounts(Dictionary<string, int> values)
        {
            if (values.Count == 0) return "No project data yet";
            List<string> lines = new List<string>();
            foreach (KeyValuePair<string, int> item in values) lines.Add(item.Key + ": " + item.Value);
            lines.Sort(StringComparer.OrdinalIgnoreCase);
            return string.Join("\n", lines.ToArray());
        }

        private static string GetFirstRelativePart(string root, string path)
        {
            try
            {
                string fullRoot = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar) + Path.DirectorySeparatorChar;
                string fullPath = Path.GetFullPath(path);
                if (fullPath.StartsWith(fullRoot, StringComparison.OrdinalIgnoreCase))
                {
                    string[] parts = fullPath.Substring(fullRoot.Length).Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
                    if (parts.Length > 0) return parts[0];
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
            return "Shared";
        }
    }
}


