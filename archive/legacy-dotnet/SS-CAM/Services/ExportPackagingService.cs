using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Text;
using System.Threading.Tasks;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    public class ExportPackageOptions
    {
        public bool IncludeDeliverables { get; set; }
        public bool IncludeWipMockups { get; set; }
        public bool IncludeCopywriting { get; set; }
        public bool IncludeBriefMarkdown { get; set; }
        public bool IncludeHtmlSummary { get; set; }

        public ExportPackageOptions()
        {
            IncludeDeliverables = true;
            IncludeWipMockups = false;
            IncludeCopywriting = true;
            IncludeBriefMarkdown = true;
            IncludeHtmlSummary = true;
        }
    }

    public class ExportPackageResult
    {
        public bool Success { get; set; }
        public string ZipFilePath { get; set; }
        public int FileCount { get; set; }
        public long TotalSizeBytes { get; set; }
        public string ErrorMessage { get; set; }
    }

    public static class ExportPackagingService
    {
        public static async Task<ExportPackageResult> CreateHandoverPackageAsync(string projectFullPath, string destinationZipPath, ExportPackageOptions options)
        {
            return await Task.Factory.StartNew(delegate
            {
                ExportPackageResult result = new ExportPackageResult();
                if (string.IsNullOrWhiteSpace(projectFullPath) || !Directory.Exists(projectFullPath))
                {
                    result.Success = false;
                    result.ErrorMessage = "Source project directory does not exist.";
                    return result;
                }

                if (options == null)
                {
                    options = new ExportPackageOptions();
                }

                try
                {
                    string zipDir = Path.GetDirectoryName(destinationZipPath);
                    if (!string.IsNullOrWhiteSpace(zipDir) && !Directory.Exists(zipDir))
                    {
                        Directory.CreateDirectory(zipDir);
                    }

                    if (File.Exists(destinationZipPath))
                    {
                        File.Delete(destinationZipPath);
                    }

                    ProjectStatusItem statusItem = FrontmatterService.ReadStatus(projectFullPath);
                    List<string> addedFiles = new List<string>();
                    long totalBytes = 0;

                    using (FileStream zipToOpen = new FileStream(destinationZipPath, FileMode.Create))
                    {
                        using (ZipArchive archive = new ZipArchive(zipToOpen, ZipArchiveMode.Create))
                        {
                            // 1. Deliverables (05_DELIVERABLES)
                            if (options.IncludeDeliverables)
                            {
                                string[] delivDirs = new[] { "05_DELIVERABLES", "05_Deliverables", "04_Production", "Production", "04_Final_Exports" };
                                foreach (string dirName in delivDirs)
                                {
                                    string fullDelivDir = Path.Combine(projectFullPath, dirName);
                                    if (Directory.Exists(fullDelivDir))
                                    {
                                        AddDirectoryToArchive(archive, fullDelivDir, "Deliverables", addedFiles, ref totalBytes);
                                        break;
                                    }
                                }
                            }

                            // 2. WIP Mockups (04_WORK_IN_PROGRESS)
                            if (options.IncludeWipMockups)
                            {
                                string[] wipDirs = new[] { "04_WORK_IN_PROGRESS", "04_WIP", "02_Artwork_Mockup", "Artwork Mockup", "Mockup" };
                                foreach (string dirName in wipDirs)
                                {
                                    string fullWipDir = Path.Combine(projectFullPath, dirName);
                                    if (Directory.Exists(fullWipDir))
                                    {
                                        AddDirectoryToArchive(archive, fullWipDir, "Mockups", addedFiles, ref totalBytes);
                                        break;
                                    }
                                }
                            }

                            // 3. Copywriting (03_COPYWRITING/COPY.md)
                            if (options.IncludeCopywriting)
                            {
                                string copyPath = Path.Combine(projectFullPath, "03_COPYWRITING", "COPY.md");
                                if (File.Exists(copyPath))
                                {
                                    archive.CreateEntryFromFile(copyPath, "Copywriting/COPY.md");
                                    FileInfo fi = new FileInfo(copyPath);
                                    totalBytes += fi.Length;
                                    addedFiles.Add("Copywriting/COPY.md (" + FormatBytes(fi.Length) + ")");
                                }
                            }

                            // 4. Brief (README.md)
                            if (options.IncludeBriefMarkdown)
                            {
                                string readmePath = Path.Combine(projectFullPath, "README.md");
                                if (File.Exists(readmePath))
                                {
                                    archive.CreateEntryFromFile(readmePath, "Project_Brief_README.md");
                                    FileInfo fi = new FileInfo(readmePath);
                                    totalBytes += fi.Length;
                                    addedFiles.Add("Project_Brief_README.md (" + FormatBytes(fi.Length) + ")");
                                }
                            }

                            // 5. HTML Handover Summary Sheet
                            if (options.IncludeHtmlSummary)
                            {
                                string projectName = new DirectoryInfo(projectFullPath).Name;
                                string htmlContent = GenerateHtmlSummary(projectName, statusItem, addedFiles);
                                ZipArchiveEntry summaryEntry = archive.CreateEntry("HANDOVER_SUMMARY.html");
                                using (StreamWriter writer = new StreamWriter(summaryEntry.Open(), Encoding.UTF8))
                                {
                                    writer.Write(htmlContent);
                                }
                                byte[] htmlBytes = Encoding.UTF8.GetBytes(htmlContent);
                                totalBytes += htmlBytes.Length;
                                addedFiles.Add("HANDOVER_SUMMARY.html (" + FormatBytes(htmlBytes.Length) + ")");
                            }
                        }
                    }

                    result.Success = true;
                    result.ZipFilePath = destinationZipPath;
                    result.FileCount = addedFiles.Count;
                    result.TotalSizeBytes = totalBytes;
                }
                catch (Exception ex)
                {
                    result.Success = false;
                    result.ErrorMessage = ex.Message;
                    System.Diagnostics.Debug.WriteLine("[ExportPackagingService] Error: " + ex.Message);
                }

                return result;
            });
        }

        private static void AddDirectoryToArchive(ZipArchive archive, string sourceDir, string entryPrefix, List<string> addedFiles, ref long totalBytes)
        {
            foreach (string file in Directory.GetFiles(sourceDir, "*.*", SearchOption.AllDirectories))
            {
                FileInfo fi = new FileInfo(file);
                string lowerName = fi.Name.ToLower();

                // Skip system and lock files
                if (lowerName.StartsWith(".") || lowerName.StartsWith("~lock~") || lowerName == "thumbs.db" || lowerName.EndsWith(".tmp"))
                {
                    continue;
                }

                string relativePath = file.Substring(sourceDir.Length).TrimStart('\\', '/');
                string entryName = Path.Combine(entryPrefix, relativePath).Replace('\\', '/');

                archive.CreateEntryFromFile(file, entryName);
                totalBytes += fi.Length;
                addedFiles.Add(entryName + " (" + FormatBytes(fi.Length) + ")");
            }
        }

        private static string GenerateHtmlSummary(string projectName, ProjectStatusItem status, List<string> files)
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine("<!DOCTYPE html>");
            sb.AppendLine("<html lang=\"en\">");
            sb.AppendLine("<head>");
            sb.AppendLine("  <meta charset=\"UTF-8\">");
            sb.AppendLine("  <title>SuamiSihat Creative Handover - " + System.Net.WebUtility.HtmlEncode(projectName) + "</title>");
            sb.AppendLine("  <style>");
            sb.AppendLine("    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #0A0F1D; color: #E2E8F0; margin: 0; padding: 40px; }");
            sb.AppendLine("    .container { max-width: 800px; margin: 0 auto; background: #131B2E; border: 1px solid #1E293B; border-radius: 12px; padding: 32px; box-shadow: 0 8px 24px rgba(0,0,0,0.4); }");
            sb.AppendLine("    .header { border-bottom: 1px solid #1E293B; padding-bottom: 20px; margin-bottom: 24px; }");
            sb.AppendLine("    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; background: #043388; color: #FFFFFF; }");
            sb.AppendLine("    .status-done { background: #10B981; color: #FFFFFF; }");
            sb.AppendLine("    .status-review { background: #F59E0B; color: #1E293B; }");
            sb.AppendLine("    h1 { color: #FFFFFF; font-size: 24px; margin: 12px 0 6px 0; }");
            sb.AppendLine("    .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin: 20px 0; background: #0A0F1D; padding: 16px; border-radius: 8px; border: 1px solid #1E293B; }");
            sb.AppendLine("    .meta-item span { color: #94A3B8; font-size: 13px; display: block; }");
            sb.AppendLine("    .meta-item strong { color: #F8FAFC; font-size: 15px; }");
            sb.AppendLine("    .files-list { list-style: none; padding: 0; margin: 20px 0; }");
            sb.AppendLine("    .files-list li { padding: 10px 14px; border-bottom: 1px solid #1E293B; font-family: monospace; font-size: 13px; color: #CBD5E1; }");
            sb.AppendLine("    .files-list li:last-child { border-bottom: none; }");
            sb.AppendLine("    .footer { text-align: center; color: #64748B; font-size: 12px; margin-top: 32px; border-top: 1px solid #1E293B; padding-top: 16px; }");
            sb.AppendLine("  </style>");
            sb.AppendLine("</head>");
            sb.AppendLine("<body>");
            sb.AppendLine("  <div class=\"container\">");
            sb.AppendLine("    <div class=\"header\">");
            sb.AppendLine("      <span class=\"badge\">SuamiSihat Creative Handover</span>");
            sb.AppendLine("      <h1>" + System.Net.WebUtility.HtmlEncode(projectName) + "</h1>");
            sb.AppendLine("      <p style=\"color: #94A3B8; margin: 0;\">Package Generated: " + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + "</p>");
            sb.AppendLine("    </div>");

            sb.AppendLine("    <div class=\"meta-grid\">");
            sb.AppendLine("      <div class=\"meta-item\"><span>Status</span><strong>" + (status != null && !string.IsNullOrWhiteSpace(status.Status) ? status.Status.ToUpper() : "UNKNOWN") + "</strong></div>");
            sb.AppendLine("      <div class=\"meta-item\"><span>Priority</span><strong>" + (status != null && !string.IsNullOrWhiteSpace(status.Priority) ? status.Priority.ToUpper() : "NORMAL") + "</strong></div>");
            sb.AppendLine("      <div class=\"meta-item\"><span>Designer</span><strong>" + (status != null && !string.IsNullOrWhiteSpace(status.Designer) ? status.Designer : "Unassigned") + "</strong></div>");
            sb.AppendLine("      <div class=\"meta-item\"><span>Revision Round</span><strong>Rev " + (status != null ? status.Revision : 0) + "</strong></div>");
            sb.AppendLine("    </div>");

            sb.AppendLine("    <h3 style=\"color: #FFFFFF; font-size: 16px; margin-top: 24px;\">Included Asset Manifest (" + files.Count + " items)</h3>");
            sb.AppendLine("    <ul class=\"files-list\">");
            foreach (string f in files)
            {
                sb.AppendLine("      <li>📁 " + System.Net.WebUtility.HtmlEncode(f) + "</li>");
            }
            sb.AppendLine("    </ul>");

            sb.AppendLine("    <div class=\"footer\">");
            sb.AppendLine("      SuamiSihat Creative Assets Management (SS-CAM) • Verified Production Export");
            sb.AppendLine("    </div>");
            sb.AppendLine("  </div>");
            sb.AppendLine("</body>");
            sb.AppendLine("</html>");

            return sb.ToString();
        }

        private static string FormatBytes(long bytes)
        {
            if (bytes <= 0) return "0 B";
            string[] sizes = new[] { "B", "KB", "MB", "GB", "TB" };
            int i = (int)Math.Floor(Math.Log(bytes) / Math.Log(1024));
            if (i >= sizes.Length) i = sizes.Length - 1;
            double num = Math.Round(bytes / Math.Pow(1024, i), 1);
            return num.ToString("0.#") + " " + sizes[i];
        }
    }
}
