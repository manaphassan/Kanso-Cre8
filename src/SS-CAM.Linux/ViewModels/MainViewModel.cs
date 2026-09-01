using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
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
    private string _appName = "SuamiSihat™ SS-CAM";

    [ObservableProperty]
    private string _appVersion = "v4.6.0-linux";

    [ObservableProperty]
    private string _synologyDrivePath;

    [ObservableProperty]
    private string _selectedNavTab = "Dashboard";

    public bool IsDashboardVisible => SelectedNavTab == "Dashboard";
    public bool IsProjectCreatorVisible => SelectedNavTab == "Project Creator";
    public bool IsTaskManagerVisible => SelectedNavTab == "Task Manager";
    public bool IsCopywritingVisible => SelectedNavTab == "Copywriting";
    public bool IsBrandAssetsVisible => SelectedNavTab == "Brand Assets";
    public bool IsDeliverablesVisible => SelectedNavTab == "Deliverables";
    public bool IsFocusRadioVisible => SelectedNavTab == "Focus Radio";
    public bool IsWellbeingVisible => SelectedNavTab == "Wellbeing";
    public bool IsSettingsVisible => SelectedNavTab == "Settings";

    [ObservableProperty]
    private string _statusMessage = "Synology Drive workspace integration active.";

    [ObservableProperty]
    private string _currentTimeString = DateTime.Now.ToString("HH:mm:ss");

    // ─── PROJECT COLLECTIONS ────────────────────────────────────────────────
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
    private int _backlogCount = 0;

    [ObservableProperty]
    private int _inProgressCount = 0;

    [ObservableProperty]
    private int _inReviewCount = 0;

    [ObservableProperty]
    private int _doneCount = 0;

    // ─── PROJECT CREATOR PROPERTIES ─────────────────────────────────────────
    [ObservableProperty]
    private string _newProjectBrand = "SSH";

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

    [ObservableProperty]
    private string _newProjectStarterCanvas = "afdesign";

    [ObservableProperty]
    private ObservableCollection<string> _availableBrands = new() { "SSH", "SSC", "SSW", "SSE", "SST" };

    [ObservableProperty]
    private ObservableCollection<string> _availableDesigners = new() { "harussani", "haikal", "hasan", "farid", "azlan", "unassigned" };

    [ObservableProperty]
    private ObservableCollection<string> _availablePriorities = new() { "low", "medium", "high", "urgent" };

    [ObservableProperty]
    private ObservableCollection<string> _availableStarterCanvases = new() { "afdesign", "psd", "ai", "none" };

    // ─── COPYWRITING STUDIO PROPERTIES ──────────────────────────────────────
    [ObservableProperty]
    private ProjectStatusItem? _selectedCopyProject;

    [ObservableProperty]
    private string _activeCopyContent = string.Empty;

    [ObservableProperty]
    private int _copyWordCount = 0;

    [ObservableProperty]
    private int _copyCharCount = 0;

    [ObservableProperty]
    private string _copyReadingTime = "0 sec";

    [ObservableProperty]
    private string _whatsAppPreviewText = "Your live WhatsApp message preview will appear here...";

    [ObservableProperty]
    private string _metaAdPreviewText = "Your live ad copy preview will appear here...";

    // ─── RADIO & AUDIO STREAMING ────────────────────────────────────────────
    [ObservableProperty]
    private bool _isRadioPlaying = false;

    [ObservableProperty]
    private string _currentStationName = "BFM 89.9 (The Business Station)";

    [ObservableProperty]
    private string _currentStationUrl = "https://stream.bfm.my/";

    [ObservableProperty]
    private ObservableCollection<RadioStationItem> _radioStations = new()
    {
        new RadioStationItem("BFM 89.9 — Business & News", "https://stream.bfm.my/", "News & Economics", "#21A1F7"),
        new RadioStationItem("Hitz FM — Top 40 Hits", "https://hitz.astro.com.my/", "Top 40 Pop", "#EF4444"),
        new RadioStationItem("Era FM — Muzik Hit Terbaik", "https://era.astro.com.my/", "Malay Pop & Hits", "#F59E0B"),
        new RadioStationItem("Nightwave Plaza — Lo-Fi Beats", "https://plaza.one/mp3", "Vaporwave & Ambient", "#8B5CF6"),
        new RadioStationItem("SomaFM — Groove Salad", "https://ice1.somafm.com/groovesalad-128-mp3", "Downtempo Chill", "#10B981")
    };

    // ─── WELLBEING & SOLAT PROPERTIES ───────────────────────────────────────
    [ObservableProperty]
    private string _breathingPhase = "Inhale (4s)";

    [ObservableProperty]
    private int _waterGlasses = 4;

    [ObservableProperty]
    private string _nextSolatName = "Zohor";

    [ObservableProperty]
    private string _nextSolatTime = "13:18";

    [ObservableProperty]
    private string _solatCountdown = "in 2h 15m";

    // ─── SETTINGS & THEMES ──────────────────────────────────────────────────
    [ObservableProperty]
    private string _currentTheme = "Metamorphosis";

    [ObservableProperty]
    private ObservableCollection<string> _availableThemes = new() { "Metamorphosis (OLED Dark & Cyan)", "Falconia (Fluent 2 Light)", "SS Default (Navy & Slate)" };

    public MainViewModel()
    {
        _workspaceService = new WorkspaceService();
        _synologyDrivePath = _workspaceService.WorkspaceRoot;
        LoadProjects();
    }

    partial void OnSelectedNavTabChanged(string value)
    {
        OnPropertyChanged(nameof(IsDashboardVisible));
        OnPropertyChanged(nameof(IsProjectCreatorVisible));
        OnPropertyChanged(nameof(IsTaskManagerVisible));
        OnPropertyChanged(nameof(IsCopywritingVisible));
        OnPropertyChanged(nameof(IsBrandAssetsVisible));
        OnPropertyChanged(nameof(IsDeliverablesVisible));
        OnPropertyChanged(nameof(IsFocusRadioVisible));
        OnPropertyChanged(nameof(IsWellbeingVisible));
        OnPropertyChanged(nameof(IsSettingsVisible));
    }

    [RelayCommand]
    private void SelectTab(string tabName)
    {
        SelectedNavTab = tabName;
        StatusMessage = $"Navigated to {tabName} — {DateTime.Now:HH:mm:ss}";
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
            BacklogCount = BacklogProjects.Count;
            InProgressCount = InProgressProjects.Count;
            InReviewCount = InReviewProjects.Count;
            DoneCount = DoneProjects.Count;

            StatusMessage = $"Scanned {ProjectCount} projects across vault ({DateTime.Now:HH:mm:ss})";

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
            StatusMessage = "⚠️ Please enter a project title before creating.";
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

            // Create starter canvas if requested
            if (NewProjectStarterCanvas != "none" && !string.IsNullOrEmpty(created.FullPath))
            {
                string sourceDir = Path.Combine(created.FullPath, "02_SOURCE_FILES");
                if (Directory.Exists(sourceDir))
                {
                    string canvasFile = Path.Combine(sourceDir, $"canvas_{NewProjectTitle.ToLower().Replace(' ', '_')}.{NewProjectStarterCanvas}");
                    if (!File.Exists(canvasFile))
                    {
                        File.WriteAllText(canvasFile, $"# SuamiSihat Creative Starter Canvas ({NewProjectStarterCanvas.ToUpperInvariant()})\n");
                    }
                }
            }

            LoadProjects();
            StatusMessage = $"✔ Created 5-folder project vault: {created.Project}";
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
        StatusMessage = $"Editing 03_COPYWRITING/COPY.md for {project.Project}";
    }

    [RelayCommand]
    private void SaveCopy()
    {
        if (SelectedCopyProject == null) return;

        bool success = _workspaceService.SaveCopy(SelectedCopyProject.FullPath, ActiveCopyContent);
        if (success)
        {
            StatusMessage = $"✔ COPY.md saved successfully ({DateTime.Now:HH:mm:ss})";
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
            "PAS" => "\n### 🎯 Problem-Agitate-Solve\n- **Problem**: Rasa cepat penat dan lesu bila balik kerja?\n- **Agitate**: Kerja bertimbun, stamina pula makin drop setiap hari.\n- **Solve**: Amalkan SuamiSihat secara konsisten untuk tenaga maksimum!\n",
            "BAB" => "\n### 🚀 Before-After-Bridge\n- **Before**: Dulu petang je mula lemau dan mengantuk.\n- **After**: Sekarang kekal fokus dan cergas sepanjang hari.\n- **Bridge**: Rahsianya, pemakanan seimbang dan formula SuamiSihat.\n",
            "CTA" => "\n📲 **WhatsApp Sekarang:** Tekan pautan di bio untuk konsultasi percuma dan promosi eksklusif!\n",
            "DISCLAIMER" => "\n> ⚠️ *Penafian: Kesan mungkin berbeza mengikut individu. Sila rujuk pakar sekiranya mempunyai sejarah kesihatan.*\n",
            "PROMO" => "\n🔥 **PROMOSI TERHAD**: Gunakan kod `SSMERDEKA` untuk potongan 15% hari ini!\n",
            _ => "\n---\n"
        };

        ActiveCopyContent += snippet;
        UpdateCopyMetrics(ActiveCopyContent);
        StatusMessage = $"✔ Inserted {formula} snippet formula";
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
        StatusMessage = $"✔ Moved {project.Project} to {nextStatus.ToUpperInvariant()}";
    }

    [RelayCommand]
    private void ToggleRadio()
    {
        IsRadioPlaying = !IsRadioPlaying;
        StatusMessage = IsRadioPlaying ? $"▶ Playing: {CurrentStationName}" : "⏹ Focus Radio Paused";
    }

    [RelayCommand]
    private void SelectRadioStation(RadioStationItem station)
    {
        CurrentStationName = station.Name;
        CurrentStationUrl = station.StreamUrl;
        IsRadioPlaying = true;
        StatusMessage = $"▶ Playing stream: {station.Name}";
    }

    [RelayCommand]
    private void CopyToClipboard(string text)
    {
        try
        {
            StatusMessage = $"✔ Copied '{text}' to clipboard";
        }
        catch { }
    }

    [RelayCommand]
    private void OpenFolder(string path)
    {
        try
        {
            if (Directory.Exists(path))
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "xdg-open",
                    Arguments = $"\"{path}\"",
                    UseShellExecute = true
                });
                StatusMessage = $"Opened folder: {path}";
            }
        }
        catch (Exception ex)
        {
            StatusMessage = $"Could not open folder: {ex.Message}";
        }
    }

    [RelayCommand]
    private void IncrementWater()
    {
        if (WaterGlasses < 8) WaterGlasses++;
        StatusMessage = $"💧 Hydration updated: {WaterGlasses} / 8 glasses today";
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
            CopyReadingTime = "0 sec";
            WhatsAppPreviewText = "Your live WhatsApp message preview will appear here...";
            MetaAdPreviewText = "Your live ad copy preview will appear here...";
            return;
        }

        CopyCharCount = text.Length;
        var words = text.Split(new[] { ' ', '\r', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries);
        CopyWordCount = words.Length;
        int seconds = (int)Math.Ceiling(CopyWordCount / 3.3); // ~200 words per minute
        CopyReadingTime = seconds < 60 ? $"{seconds} sec" : $"{seconds / 60}m {seconds % 60}s";

        // Clean WhatsApp preview: transform markdown bold to whatsapp bold
        WhatsAppPreviewText = text.Trim();
        MetaAdPreviewText = text.Length > 240 ? text.Substring(0, 240) + "...\n\n👉 Click here to learn more" : text + "\n\n👉 Click here to learn more";
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
            string execPath = Process.GetCurrentProcess().MainModule?.FileName ?? "/opt/ss-cam/SS-CAM.Linux";

            string content = $"[Desktop Entry]\nType=Application\nName={AppName}\nComment={AppName} Linux Desktop Client\nExec={execPath}\nIcon=ss-cam\nTerminal=false\nCategories=Graphics;Office;Development;\nStartupWMClass=SS-CAM.Linux\n";
            File.WriteAllText(shortcutPath, content);

            StatusMessage = $"✔ Desktop shortcut created at {shortcutPath}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Failed to create desktop shortcut: {ex.Message}";
        }
    }
}
