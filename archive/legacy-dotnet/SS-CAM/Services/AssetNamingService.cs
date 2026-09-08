using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;

namespace SS_CAM.Services
{
    public class AssetNamingIssue
    {
        public string OriginalPath { get; set; }
        public string CurrentFileName { get; set; }
        public string SuggestedFileName { get; set; }
        public string Reason { get; set; }
        public bool IsValid { get; set; }
    }

    public class AssetNamingAuditReport
    {
        public int TotalAudited { get; set; }
        public int ValidCount { get; set; }
        public int IssueCount { get; set; }
        public List<AssetNamingIssue> Issues { get; set; }

        public AssetNamingAuditReport()
        {
            Issues = new List<AssetNamingIssue>();
        }
    }

    public static class AssetNamingService
    {
        // Standard naming pattern: YYYYMM_JOBID_BRAND_TITLE...
        private static readonly Regex CanonicalPattern = new Regex(@"^\d{6}_[A-Z0-9]+_[A-Z0-9]+_.+", RegexOptions.IgnoreCase);

        public static AssetNamingAuditReport AuditProjectAssets(string projectFullPath)
        {
            AssetNamingAuditReport report = new AssetNamingAuditReport();
            if (string.IsNullOrWhiteSpace(projectFullPath) || !Directory.Exists(projectFullPath))
            {
                return report;
            }

            DirectoryInfo projectDir = new DirectoryInfo(projectFullPath);
            string projectFolderName = projectDir.Name;

            // Extract project folder prefix components (e.g. 202608_0085D_SS)
            string[] folderParts = projectFolderName.Split('_');
            string prefix = folderParts.Length >= 3
                ? string.Format("{0}_{1}_{2}", folderParts[0], folderParts[1], folderParts[2])
                : projectFolderName;

            string[] targetSubDirs = new[] { "05_DELIVERABLES", "05_Deliverables", "04_Production", "04_WORK_IN_PROGRESS", "04_WIP" };

            foreach (string subName in targetSubDirs)
            {
                string dirPath = Path.Combine(projectFullPath, subName);
                if (!Directory.Exists(dirPath)) continue;

                foreach (string file in Directory.GetFiles(dirPath, "*.*", SearchOption.AllDirectories))
                {
                    FileInfo fi = new FileInfo(file);
                    string name = fi.Name;

                    // Skip hidden/temp files
                    if (name.StartsWith(".") || name.StartsWith("~lock~") || name.ToLower() == "thumbs.db")
                        continue;

                    report.TotalAudited++;

                    if (CanonicalPattern.IsMatch(name) && name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                    {
                        report.ValidCount++;
                    }
                    else
                    {
                        report.IssueCount++;
                        string ext = fi.Extension;
                        string rawBaseName = Path.GetFileNameWithoutExtension(name);

                        // Clean raw name
                        string cleanedName = Regex.Replace(rawBaseName, @"[^A-Za-z0-9_\-]", "_");
                        cleanedName = Regex.Replace(cleanedName, @"_+", "_").Trim('_');

                        string suggested = string.Format("{0}_{1}{2}", prefix, cleanedName, ext);

                        report.Issues.Add(new AssetNamingIssue
                        {
                            OriginalPath = fi.FullName,
                            CurrentFileName = fi.Name,
                            SuggestedFileName = suggested,
                            Reason = !name.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
                                ? "Missing canonical project prefix (" + prefix + ")"
                                : "Contains non-standard characters or spaces",
                            IsValid = false
                        });
                    }
                }
            }

            return report;
        }

        public static int ApplySuggestedRenames(List<AssetNamingIssue> issues)
        {
            if (issues == null) return 0;
            int count = 0;

            foreach (AssetNamingIssue issue in issues)
            {
                if (issue == null || string.IsNullOrWhiteSpace(issue.OriginalPath) || string.IsNullOrWhiteSpace(issue.SuggestedFileName))
                    continue;

                try
                {
                    if (File.Exists(issue.OriginalPath))
                    {
                        string dir = Path.GetDirectoryName(issue.OriginalPath);
                        string newPath = Path.Combine(dir, issue.SuggestedFileName);

                        if (!File.Exists(newPath))
                        {
                            File.Move(issue.OriginalPath, newPath);
                            issue.OriginalPath = newPath;
                            issue.CurrentFileName = issue.SuggestedFileName;
                            issue.IsValid = true;
                            count++;
                        }
                    }
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("[AssetNamingService] Rename error: " + ex.Message);
                }
            }

            return count;
        }
    }
}
