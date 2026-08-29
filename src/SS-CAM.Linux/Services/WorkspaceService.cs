using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using SS_CAM.Linux.Models;

namespace SS_CAM.Linux.Services;

public class WorkspaceService
{
    public string WorkspaceRoot { get; private set; }

    public WorkspaceService()
    {
        string userHome = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        string defaultPath = Path.Combine(userHome, "SynologyDrive", "Creative-Team");
        WorkspaceRoot = Directory.Exists(defaultPath) ? defaultPath : Path.Combine(userHome, "SynologyDrive");
    }

    public void SetWorkspaceRoot(string path)
    {
        if (!string.IsNullOrWhiteSpace(path))
        {
            WorkspaceRoot = path;
        }
    }

    public List<ProjectStatusItem> ScanProjects()
    {
        var results = new List<ProjectStatusItem>();
        if (!Directory.Exists(WorkspaceRoot)) return results;

        try
        {
            // Scan year/month folders (e.g. 2026/202608_August/...) or direct folders
            var dirs = Directory.GetDirectories(WorkspaceRoot, "*", SearchOption.AllDirectories)
                .Where(d => !d.Contains("#recycle") && !d.Contains("_Team") && !d.Contains(".git"))
                .Where(d => File.Exists(Path.Combine(d, "README.md")) || Directory.Exists(Path.Combine(d, "01_BRIEF_ASSETS")))
                .ToList();

            foreach (var dir in dirs)
            {
                var item = FrontmatterService.ReadStatus(dir);
                results.Add(item);
            }
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[WorkspaceService] ScanProjects error: {ex.Message}");
        }

        return results.OrderByDescending(p => p.CreatedDate).ToList();
    }

    public ProjectStatusItem CreateProject(string brand, string projectTitle, string designer, string client, string priority, string deadline)
    {
        string nowYear = DateTime.Now.ToString("yyyy");
        string nowMonth = DateTime.Now.ToString("yyyyMM") + "_" + DateTime.Now.ToString("MMMM");
        string targetMonthDir = Path.Combine(WorkspaceRoot, nowYear, nowMonth);

        if (!Directory.Exists(targetMonthDir))
        {
            Directory.CreateDirectory(targetMonthDir);
        }

        // Project Folder Naming: YYYYMM_BRAND_ProjectTitle
        string sanitizedTitle = string.Concat(projectTitle.Split(Path.GetInvalidFileNameChars())).Replace(" ", "_");
        string sanitizedBrand = string.Concat(brand.Split(Path.GetInvalidFileNameChars())).Replace(" ", "");
        string folderName = $"{DateTime.Now:yyyyMM}_{sanitizedBrand}_{sanitizedTitle}";
        string projectPath = Path.Combine(targetMonthDir, folderName);

        Directory.CreateDirectory(projectPath);
        Directory.CreateDirectory(Path.Combine(projectPath, "01_BRIEF_ASSETS"));
        Directory.CreateDirectory(Path.Combine(projectPath, "02_SOURCE_FILES"));
        Directory.CreateDirectory(Path.Combine(projectPath, "03_COPYWRITING"));
        Directory.CreateDirectory(Path.Combine(projectPath, "04_WORK_IN_PROGRESS"));
        Directory.CreateDirectory(Path.Combine(projectPath, "05_DELIVERABLES"));

        // Initialize COPY.md template
        string copyMdPath = Path.Combine(projectPath, "03_COPYWRITING", "COPY.md");
        if (!File.Exists(copyMdPath))
        {
            string copyTemplate = $@"---
brand: {brand}
project: {projectTitle}
created: {DateTime.Now:yyyy-MM-dd}
author: {designer}
---

# {brand} — {projectTitle}

## 🎯 Viral Hook Formulas
- **Hook 1 (Problem-Agitate)**: Rasa lesu dan tak bertenaga bila balik kerja?
- **Hook 2 (Before-After)**: Dulu cepat penat, sekarang kekal cergas sampai malam.

## 📝 Body Copy & Script
- **CTA**: WhatsApp Team SuamiSihat sekarang!
";
            File.WriteAllText(copyMdPath, copyTemplate, System.Text.Encoding.UTF8);
        }

        var item = new ProjectStatusItem
        {
            Project = folderName,
            FullPath = projectPath,
            Status = "in_progress",
            Designer = designer,
            Client = client,
            Priority = priority,
            Deadline = deadline,
            CreatedDate = DateTime.Now.ToString("yyyy-MM-dd"),
            Tags = new List<string> { brand, "design", "campaign" },
            HasFrontmatter = true
        };

        FrontmatterService.WriteStatus(item);
        return item;
    }

    public string ReadCopy(string projectPath)
    {
        string copyPath = Path.Combine(projectPath, "03_COPYWRITING", "COPY.md");
        if (File.Exists(copyPath))
        {
            return File.ReadAllText(copyPath, System.Text.Encoding.UTF8);
        }
        return string.Empty;
    }

    public bool SaveCopy(string projectPath, string content)
    {
        try
        {
            string copyDir = Path.Combine(projectPath, "03_COPYWRITING");
            if (!Directory.Exists(copyDir)) Directory.CreateDirectory(copyDir);

            string copyPath = Path.Combine(copyDir, "COPY.md");
            File.WriteAllText(copyPath, content, new System.Text.UTF8Encoding(true));
            return true;
        }
        catch (Exception ex)
        {
            System.Diagnostics.Debug.WriteLine($"[WorkspaceService] SaveCopy error: {ex.Message}");
            return false;
        }
    }

    public void UpdateProjectStatus(ProjectStatusItem item, string newStatus)
    {
        item.Status = newStatus;
        FrontmatterService.WriteStatus(item);
    }
}
