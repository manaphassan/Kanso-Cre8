using System;
using System.Collections.ObjectModel;
using System.IO;
using System.Linq;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using SS_CAM.Linux.Models;
using SS_CAM.Linux.Services;

namespace SS_CAM.Linux.ViewModels;

public partial class MainViewModel : ViewModelBase
{
    private readonly WorkspaceService _workspaceService;

    [ObservableProperty]
    private string _appName = "SS-CAM Desktop (Linux / Fedora Edition)";

    [ObservableProperty]
    private string _appVersion = "v4.5.0-linux";

    [ObservableProperty]
    private string _synologyDrivePath;

    [ObservableProperty]
    private string _selectedNavTab = "Dashboard";

    [ObservableProperty]
    private string _statusMessage = "Synology Drive client integration active.";

    [ObservableProperty]
    private ObservableCollection<ProjectStatusItem> _projects = new();

    [ObservableProperty]
    private ObservableCollection<ProjectStatusItem> _backlogProjects = new();

    [ObservableProperty]
    private ObservableCollection<ProjectStatusItem> _inProgressProjects = new();

    [ObservableProperty]
    private ObservableCollection<ProjectStatusItem> _inReviewProjects = new();

    [ObservableProperty]
    private ObservableCollection<ProjectStatusItem> _doneProjects = new();

    [ObservableProperty]
    private int _projectCount = 0;

    [ObservableProperty]
    private string _newProjectBrand = "SuamiSihat";

    [ObservableProperty]
    private string _newProjectTitle = string.Empty;

    [ObservableProperty]
    private string _newProjectDesigner = "harussani";

    [ObservableProperty]
    private string _newProjectClient = "SuamiSihat Holding";

    [ObservableProperty]
    private string _newProjectPriority = "medium";

    [ObservableProperty]
    private string _newProjectDeadline = DateTime.Now.AddDays(7).ToString("yyyy-MM-dd");

    // Copywriting Studio Properties
    [ObservableProperty]
    private ProjectStatusItem? _selectedCopyProject;

    [ObservableProperty]
    private string _activeCopyContent = string.Empty;

    [ObservableProperty]
    private int _copyWordCount = 0;

    [ObservableProperty]
    private int _copyCharCount = 0;

    public MainViewModel()
    {
        _workspaceService = new WorkspaceService();
        _synologyDrivePath = _workspaceService.WorkspaceRoot;
        LoadProjects();
    }

    [RelayCommand]
    private void SelectTab(string tabName)
    {
        SelectedNavTab = tabName;
        StatusMessage = $"Navigated to {tabName}";
    }

    [RelayCommand]
    private void LoadProjects()
    {
        try
        {
            var scanned = _workspaceService.ScanProjects();
            Projects.Clear();
            BacklogProjects.Clear();
            InProgressProjects.Clear();
            InReviewProjects.Clear();
            DoneProjects.Clear();

            foreach (var p in scanned)
            {
                Projects.Add(p);
                switch (p.Status.ToLowerInvariant())
                {
                    case "in_progress": InProgressProjects.Add(p); break;
                    case "review":
                    case "in_review": InReviewProjects.Add(p); break;
                    case "done":
                    case "completed": DoneProjects.Add(p); break;
                    default: BacklogProjects.Add(p); break;
                }
            }

            ProjectCount = Projects.Count;
            StatusMessage = $"Scanned {ProjectCount} projects in {SynologyDrivePath}";

            if (SelectedCopyProject == null && Projects.Count > 0)
            {
                OpenCopyEditor(Projects.First());
            }
        }
        catch (Exception ex)
        {
            StatusMessage = $"Workspace scan failed: {ex.Message}";
        }
    }

    [RelayCommand]
    private void CreateProject()
    {
        if (string.IsNullOrWhiteSpace(NewProjectTitle))
        {
            StatusMessage = "Please enter a valid project title.";
            return;
        }

        try
        {
            var created = _workspaceService.CreateProject(
                NewProjectBrand,
                NewProjectTitle,
                NewProjectDesigner,
                NewProjectClient,
                NewProjectPriority,
                NewProjectDeadline
            );

            Projects.Insert(0, created);
            InProgressProjects.Insert(0, created);
            ProjectCount = Projects.Count;
            StatusMessage = $"Created project folder: {created.Project}";
            NewProjectTitle = string.Empty;
            SelectedNavTab = "Dashboard";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Failed to create project: {ex.Message}";
        }
    }

    [RelayCommand]
    private void OpenCopyEditor(ProjectStatusItem project)
    {
        SelectedCopyProject = project;
        ActiveCopyContent = _workspaceService.ReadCopy(project.FullPath);
        UpdateCopyMetrics(ActiveCopyContent);
        SelectedNavTab = "Copywriting";
        StatusMessage = $"Editing COPY.md for {project.Project}";
    }

    [RelayCommand]
    private void SaveCopy()
    {
        if (SelectedCopyProject == null) return;

        bool success = _workspaceService.SaveCopy(SelectedCopyProject.FullPath, ActiveCopyContent);
        if (success)
        {
            StatusMessage = $"✓ COPY.md saved successfully ({DateTime.Now:HH:mm:ss})";
        }
        else
        {
            StatusMessage = "⚠️ Failed to save COPY.md";
        }
    }

    [RelayCommand]
    private void InsertCopyHook(string formula)
    {
        string snippet = formula switch
        {
            "PAS" => "\n### 🎯 Problem-Agitate-Solve\n- **Problem**: Rasa cepat penat dan lesu setiap hari?\n- **Agitate**: Kerja bertimbun, tenaga pula makin drop.\n- **Solve**: Amalkan SuamiSihat setiap pagi untuk stamina optimum.\n",
            "BAB" => "\n### 🚀 Before-After-Bridge\n- **Before**: Dulu balik kerja terus baring tak bertenaga.\n- **After**: Sekarang cergas sampai malam, boleh luang masa dengan keluarga.\n- **Bridge**: Rahsianya, pemakanan seimbang dan SuamiSihat!\n",
            "CTA" => "\n📲 **WhatsApp Sekarang:** Tekan link di bio untuk konsultasi percuma!\n",
            _ => "\n---\n"
        };

        ActiveCopyContent += snippet;
        UpdateCopyMetrics(ActiveCopyContent);
        StatusMessage = $"Inserted {formula} snippet formula";
    }

    [RelayCommand]
    private void MoveStatus(ProjectStatusItem project)
    {
        string nextStatus = project.Status switch
        {
            "backlog" => "in_progress",
            "in_progress" => "in_review",
            "in_review" => "done",
            _ => "backlog"
        };

        _workspaceService.UpdateProjectStatus(project, nextStatus);
        LoadProjects();
        StatusMessage = $"Moved {project.Project} to {nextStatus.ToUpperInvariant()}";
    }

    partial void OnActiveCopyContentChanged(string value)
    {
        UpdateCopyMetrics(value);
    }

    private void UpdateCopyMetrics(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            CopyWordCount = 0;
            CopyCharCount = 0;
            return;
        }

        CopyCharCount = text.Length;
        var words = text.Split(new[] { ' ', '\r', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries);
        CopyWordCount = words.Length;
    }

    [RelayCommand]
    private void CreateDesktopShortcut()
    {
        try
        {
            string userHome = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string desktopDir = Path.Combine(userHome, "Desktop");
            
            if (!Directory.Exists(desktopDir))
            {
                Directory.CreateDirectory(desktopDir);
            }

            string shortcutPath = Path.Combine(desktopDir, "SS-CAM.desktop");
            string execPath = System.Diagnostics.Process.GetCurrentProcess().MainModule?.FileName ?? "SS-CAM.Linux";

            string content = $"[Desktop Entry]\nType=Application\nName=SS-CAM Desktop\nComment=SuamiSihat Creative Assets Management\nExec={execPath}\nIcon=avalonia-logo\nTerminal=false\nCategories=Graphics;Development;\n";
            File.WriteAllText(shortcutPath, content);

            StatusMessage = $"Desktop shortcut created at {shortcutPath}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Failed to create desktop shortcut: {ex.Message}";
        }
    }
}
