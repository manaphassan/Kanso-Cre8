using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    public enum PreflightStatus
    {
        Pass,
        Warn,
        Fail
    }

    public class PreflightCheckItem
    {
        public string Category { get; set; }
        public string Title { get; set; }
        public string Details { get; set; }
        public PreflightStatus Status { get; set; }
        public bool CanAutoFix { get; set; }

        public PreflightCheckItem(string category, string title, string details, PreflightStatus status, bool canAutoFix = false)
        {
            Category = category;
            Title = title;
            Details = details;
            Status = status;
            CanAutoFix = canAutoFix;
        }
    }

    public class PreflightReport
    {
        public string ProjectPath { get; set; }
        public string ProjectName { get; set; }
        public bool IsPass { get; set; }
        public int PassCount { get; set; }
        public int WarnCount { get; set; }
        public int FailCount { get; set; }
        public List<PreflightCheckItem> Checks { get; set; }

        public PreflightReport()
        {
            Checks = new List<PreflightCheckItem>();
        }
    }

    public static class PreflightValidatorService
    {
        public static async Task<PreflightReport> RunPreflightAuditAsync(string projectFullPath)
        {
            return await Task.Run(() =>
            {
                PreflightReport report = new PreflightReport
                {
                    ProjectPath = projectFullPath,
                    ProjectName = !string.IsNullOrWhiteSpace(projectFullPath) ? new DirectoryInfo(projectFullPath).Name : "Unknown"
                };

                if (string.IsNullOrWhiteSpace(projectFullPath) || !Directory.Exists(projectFullPath))
                {
                    report.Checks.Add(new PreflightCheckItem("Filesystem", "Project Directory", "Directory does not exist on disk.", PreflightStatus.Fail));
                    report.FailCount = 1;
                    report.IsPass = false;
                    return report;
                }

                // 1. Structure Check: 5-Folder Hierarchy
                string[] requiredFolders = new[]
                {
                    "01_PHOTOSHOP",
                    "02_DESIGNS",
                    "03_COPYWRITING",
                    "04_DELIVERABLES",
                    "05_DOCUMENTATION"
                };

                int foundFolderCount = 0;
                List<string> missingFolders = new List<string>();

                foreach (string folder in requiredFolders)
                {
                    string primaryPath = Path.Combine(projectFullPath, folder);
                    bool exists = Directory.Exists(primaryPath);

                    // Check common legacy aliases if primary is missing
                    if (!exists)
                    {
                        if (folder == "01_PHOTOSHOP")
                            exists = Directory.Exists(Path.Combine(projectFullPath, "01_RAW")) || Directory.Exists(Path.Combine(projectFullPath, "01_Raw_Footage"));
                        else if (folder == "02_DESIGNS")
                            exists = Directory.Exists(Path.Combine(projectFullPath, "02_Artwork_Mockup")) || Directory.Exists(Path.Combine(projectFullPath, "04_WORK_IN_PROGRESS"));
                        else if (folder == "04_DELIVERABLES")
                            exists = Directory.Exists(Path.Combine(projectFullPath, "05_DELIVERABLES")) || Directory.Exists(Path.Combine(projectFullPath, "04_Production"));
                        else if (folder == "05_DOCUMENTATION")
                            exists = Directory.Exists(Path.Combine(projectFullPath, "05_Briefs_Docs")) || Directory.Exists(Path.Combine(projectFullPath, "06_DOCS"));
                    }

                    if (exists)
                    {
                        foundFolderCount++;
                    }
                    else
                    {
                        missingFolders.Add(folder);
                    }
                }

                if (missingFolders.Count == 0)
                {
                    report.Checks.Add(new PreflightCheckItem("Structure", "5-Folder Hierarchy", "All 5 standard project folders verified.", PreflightStatus.Pass));
                }
                else if (missingFolders.Count <= 2)
                {
                    report.Checks.Add(new PreflightCheckItem("Structure", "5-Folder Hierarchy", "Missing optional folders: " + string.Join(", ", missingFolders), PreflightStatus.Warn, true));
                }
                else
                {
                    report.Checks.Add(new PreflightCheckItem("Structure", "5-Folder Hierarchy", "Missing canonical folders: " + string.Join(", ", missingFolders), PreflightStatus.Fail, true));
                }

                // 2. Metadata Check: README.md Frontmatter
                string readmePath = Path.Combine(projectFullPath, "README.md");
                if (File.Exists(readmePath))
                {
                    try
                    {
                        ProjectStatusItem statusItem = FrontmatterService.ReadStatus(projectFullPath);
                        if (statusItem != null && !string.IsNullOrWhiteSpace(statusItem.Designer) && !string.IsNullOrWhiteSpace(statusItem.Status))
                        {
                            report.Checks.Add(new PreflightCheckItem("Metadata", "YAML Frontmatter", string.Format("Designer: {0} | Status: {1} | Priority: {2}", statusItem.Designer, statusItem.Status, statusItem.Priority), PreflightStatus.Pass));
                        }
                        else
                        {
                            report.Checks.Add(new PreflightCheckItem("Metadata", "YAML Frontmatter", "README.md exists but missing required fields (designer/status).", PreflightStatus.Warn, true));
                        }
                    }
                    catch (Exception ex)
                    {
                        report.Checks.Add(new PreflightCheckItem("Metadata", "YAML Frontmatter", "Error parsing README frontmatter: " + ex.Message, PreflightStatus.Warn, true));
                    }
                }
                else
                {
                    report.Checks.Add(new PreflightCheckItem("Metadata", "Project Brief (README.md)", "README.md is missing in root.", PreflightStatus.Fail, true));
                }

                // 3. Copywriting Check: 03_COPYWRITING/COPY.md
                string copyPath = Path.Combine(projectFullPath, "03_COPYWRITING", "COPY.md");
                if (File.Exists(copyPath))
                {
                    try
                    {
                        string content = File.ReadAllText(copyPath, Encoding.UTF8);
                        int wordCount = content.Split(new[] { ' ', '\r', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries).Length;
                        if (wordCount > 10)
                        {
                            report.Checks.Add(new PreflightCheckItem("Copywriting", "COPY.md Script", string.Format("Verified ({0} words).", wordCount), PreflightStatus.Pass));
                        }
                        else
                        {
                            report.Checks.Add(new PreflightCheckItem("Copywriting", "COPY.md Script", "COPY.md exists but is empty or placeholder.", PreflightStatus.Warn));
                        }
                    }
                    catch (Exception ex)
                    {
                        report.Checks.Add(new PreflightCheckItem("Copywriting", "COPY.md Script", "Error reading COPY.md: " + ex.Message, PreflightStatus.Warn));
                    }
                }
                else
                {
                    report.Checks.Add(new PreflightCheckItem("Copywriting", "COPY.md Script", "03_COPYWRITING/COPY.md is missing.", PreflightStatus.Warn, true));
                }

                // 4. Deliverables Check: 04_DELIVERABLES or 05_DELIVERABLES
                string delivDir = Path.Combine(projectFullPath, "04_DELIVERABLES");
                if (!Directory.Exists(delivDir))
                {
                    delivDir = Path.Combine(projectFullPath, "05_DELIVERABLES");
                }

                if (Directory.Exists(delivDir))
                {
                    string[] files = Directory.GetFiles(delivDir, "*.*", SearchOption.AllDirectories);
                    List<string> validDeliverables = new List<string>();
                    foreach (string f in files)
                    {
                        string ext = Path.GetExtension(f).ToLowerInvariant();
                        if (ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".mp4" || ext == ".pdf" || ext == ".zip")
                        {
                            validDeliverables.Add(f);
                        }
                    }

                    if (validDeliverables.Count > 0)
                    {
                        report.Checks.Add(new PreflightCheckItem("Deliverables", "Production Exports", string.Format("{0} deliverable asset(s) ready for handover.", validDeliverables.Count), PreflightStatus.Pass));
                    }
                    else
                    {
                        report.Checks.Add(new PreflightCheckItem("Deliverables", "Production Exports", "Deliverables folder is empty.", PreflightStatus.Warn));
                    }
                }
                else
                {
                    report.Checks.Add(new PreflightCheckItem("Deliverables", "Production Exports", "Deliverables directory not found.", PreflightStatus.Warn, true));
                }

                // 5. Asset Naming Audit
                try
                {
                    AssetNamingAuditReport namingReport = AssetNamingService.AuditProjectAssets(projectFullPath);
                    if (namingReport.IssueCount == 0)
                    {
                        report.Checks.Add(new PreflightCheckItem("Naming", "Canonical File Naming", string.Format("All {0} audited asset(s) follow canonical naming standards.", namingReport.TotalAudited), PreflightStatus.Pass));
                    }
                    else
                    {
                        report.Checks.Add(new PreflightCheckItem("Naming", "Canonical File Naming", string.Format("{0} of {1} asset(s) have non-standard naming.", namingReport.IssueCount, namingReport.TotalAudited), PreflightStatus.Warn));
                    }
                }
                catch (Exception ex)
                {
                    report.Checks.Add(new PreflightCheckItem("Naming", "Canonical File Naming", "Naming audit exception: " + ex.Message, PreflightStatus.Warn));
                }

                // Calculate summary counts
                foreach (PreflightCheckItem item in report.Checks)
                {
                    if (item.Status == PreflightStatus.Pass) report.PassCount++;
                    else if (item.Status == PreflightStatus.Warn) report.WarnCount++;
                    else if (item.Status == PreflightStatus.Fail) report.FailCount++;
                }

                report.IsPass = report.FailCount == 0;
                return report;
            });
        }

        public static async Task<bool> AutoFixProjectAsync(string projectFullPath)
        {
            return await Task.Run(() =>
            {
                if (string.IsNullOrWhiteSpace(projectFullPath) || !Directory.Exists(projectFullPath))
                {
                    return false;
                }

                try
                {
                    // 1. Scaffold Missing 5-Folders
                    string[] requiredFolders = new[]
                    {
                        "01_PHOTOSHOP",
                        "02_DESIGNS",
                        "03_COPYWRITING",
                        "04_DELIVERABLES",
                        "05_DOCUMENTATION"
                    };

                    foreach (string folder in requiredFolders)
                    {
                        string dir = Path.Combine(projectFullPath, folder);
                        if (!Directory.Exists(dir))
                        {
                            Directory.CreateDirectory(dir);
                        }
                    }

                    // 2. Scaffold README.md if missing
                    string readmePath = Path.Combine(projectFullPath, "README.md");
                    if (!File.Exists(readmePath))
                    {
                        DirectoryInfo dirInfo = new DirectoryInfo(projectFullPath);
                        string title = dirInfo.Name;
                        string currentUser = Environment.UserName;

                        StringBuilder sb = new StringBuilder();
                        sb.AppendLine("---");
                        sb.AppendLine(string.Format("title: {0}", title));
                        sb.AppendLine(string.Format("designer: {0}", currentUser));
                        sb.AppendLine(string.Format("status: in-progress"));
                        sb.AppendLine(string.Format("priority: medium"));
                        sb.AppendLine(string.Format("created: {0}", DateTime.Now.ToString("yyyy-MM-dd")));
                        sb.AppendLine(string.Format("deadline: {0}", DateTime.Now.AddDays(3).ToString("yyyy-MM-dd")));
                        sb.AppendLine("---");
                        sb.AppendLine();
                        sb.AppendLine(string.Format("# {0}", title));
                        sb.AppendLine();
                        sb.AppendLine("## Overview");
                        sb.AppendLine("Creative project brief generated by SS-CAM Studio.");
                        sb.AppendLine();
                        sb.AppendLine("## Deliverables Checklist");
                        sb.AppendLine("- [ ] Master Visual Key Artwork (02_DESIGNS)");
                        sb.AppendLine("- [ ] Ad Broadcast Copywriting (03_COPYWRITING)");
                        sb.AppendLine("- [ ] Client Final Render Exports (04_DELIVERABLES)");

                        File.WriteAllText(readmePath, sb.ToString(), Encoding.UTF8);
                    }

                    // 3. Scaffold COPY.md if missing
                    string copyPath = Path.Combine(projectFullPath, "03_COPYWRITING", "COPY.md");
                    if (!File.Exists(copyPath))
                    {
                        StringBuilder sbCopy = new StringBuilder();
                        sbCopy.AppendLine("# 📢 Copywriting & Ad Script");
                        sbCopy.AppendLine();
                        sbCopy.AppendLine("## Meta / TikTok Video Hook Formula");
                        sbCopy.AppendLine("1. **Visual Hook**: 3-second pattern interrupt on screen.");
                        sbCopy.AppendLine("2. **Core Problem**: Agitate specific pain point.");
                        sbCopy.AppendLine("3. **Solution**: Introduce SuamiSihat vitality benefit.");
                        sbCopy.AppendLine("4. **Offer & CTA**: 1-Click WhatsApp consultation order.");

                        File.WriteAllText(copyPath, sbCopy.ToString(), Encoding.UTF8);
                    }

                    return true;
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("[PreflightValidatorService] AutoFix error: " + ex.Message);
                    return false;
                }
            });
        }
    }
}
