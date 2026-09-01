using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Avalonia.Controls;
using Avalonia.Media.Imaging;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using QRCoder;
using SS_CAM.Linux.Models;
using SS_CAM.Linux.Services;
using SS_CAM.Linux.Views.Pages;

namespace SS_CAM.Linux.ViewModels;

// ─── Prayer time row model ───────────────────────────────────────────────────
public class PrayerTimeRow
{
    public string Icon        { get; set; } = "🕌";
    public string Name        { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string TimeStr     { get; set; } = "--:--";
    public bool   IsNext      { get; set; }
    public string TimeFg      => IsNext ? "#38BDF8" : "#F8FAFC";
    public string RowBg       => IsNext ? "#022057" : "#0F172A";
    public string BadgeBg     => "#1E4D7B";
}

public partial class MainViewModel : ViewModelBase
{
    // ─── Services ────────────────────────────────────────────────────────────
    private readonly WorkspaceService        _workspaceService;
    private readonly RadioStreamService      _radioService;
    private readonly PrayerTimeService       _prayerService;
    private readonly QuickNoteService        _noteService;
    private readonly WorkstationHealthService _wsService;

    // Page cache — created once, reused on re-navigation
    private readonly Dictionary<string, Control> _pageCache = new();

    // ─── App core ────────────────────────────────────────────────────────────
    [ObservableProperty] private string _appName    = "SuamiSihat™ SS-CAM";
    [ObservableProperty] private string _appVersion = "v4.6.0-linux";
    [ObservableProperty] private string _synologyDrivePath;
    [ObservableProperty] private string _selectedNavTab = "Dashboard";
    [ObservableProperty] private Control? _currentPage;
    [ObservableProperty] private string _statusMessage = "Synology Drive workspace integration active.";
    [ObservableProperty] private string _currentTimeString = DateTime.Now.ToString("HH:mm:ss");

    // ─── Sidebar active-state constants ──────────────────────────────────────
    private const string ActiveBg   = "#1E3A5F";
    private const string ActiveFg   = "#38BDF8";
    private const string InactiveFg = "#CBD5E1";

    // All 14 nav item active checks
    public bool IsDashboardActive       => SelectedNavTab == "Dashboard";
    public bool IsProjectCreatorActive  => SelectedNavTab == "Project Creator";
    public bool IsSearchCopyActive      => SelectedNavTab == "Search & Copy";
    public bool IsCopywritingActive     => SelectedNavTab == "Copywriting";
    public bool IsBrandAssetsActive     => SelectedNavTab == "Brand Assets";
    public bool IsTaskManagerActive     => SelectedNavTab == "Task Manager";
    public bool IsCalendarActive        => SelectedNavTab == "Big Calendar";
    public bool IsQuickNoteActive       => SelectedNavTab == "Quick Notes";
    public bool IsWellbeingActive       => SelectedNavTab == "Wellbeing";
    public bool IsWaktuSolatActive      => SelectedNavTab == "Waktu Solat";
    public bool IsRadioActive           => SelectedNavTab == "Radio Player";
    public bool IsQrCodeActive          => SelectedNavTab == "QR Code";
    public bool IsWorkstationActive     => SelectedNavTab == "Workstation Health";
    public bool IsSettingsActive        => SelectedNavTab == "Settings";

    // Nav background helpers
    public string NavBgDashboard      => IsDashboardActive      ? ActiveBg : "Transparent";
    public string NavBgProjectCreator => IsProjectCreatorActive  ? ActiveBg : "Transparent";
    public string NavBgSearchCopy     => IsSearchCopyActive      ? ActiveBg : "Transparent";
    public string NavBgCopywriting    => IsCopywritingActive     ? ActiveBg : "Transparent";
    public string NavBgBrandAssets    => IsBrandAssetsActive     ? ActiveBg : "Transparent";
    public string NavBgTaskManager    => IsTaskManagerActive     ? ActiveBg : "Transparent";
    public string NavBgCalendar       => IsCalendarActive        ? ActiveBg : "Transparent";
    public string NavBgQuickNote      => IsQuickNoteActive       ? ActiveBg : "Transparent";
    public string NavBgWellbeing      => IsWellbeingActive       ? ActiveBg : "Transparent";
    public string NavBgWaktuSolat     => IsWaktuSolatActive      ? ActiveBg : "Transparent";
    public string NavBgRadio          => IsRadioActive           ? ActiveBg : "Transparent";
    public string NavBgQrCode         => IsQrCodeActive          ? ActiveBg : "Transparent";
    public string NavBgWorkstation    => IsWorkstationActive     ? ActiveBg : "Transparent";
    public string NavBgSettings       => IsSettingsActive        ? ActiveBg : "Transparent";

    // Nav foreground helpers
    public string NavFgDashboard      => IsDashboardActive      ? ActiveFg : InactiveFg;
    public string NavFgProjectCreator => IsProjectCreatorActive  ? ActiveFg : InactiveFg;
    public string NavFgSearchCopy     => IsSearchCopyActive      ? ActiveFg : InactiveFg;
    public string NavFgCopywriting    => IsCopywritingActive     ? ActiveFg : InactiveFg;
    public string NavFgBrandAssets    => IsBrandAssetsActive     ? ActiveFg : InactiveFg;
    public string NavFgTaskManager    => IsTaskManagerActive     ? ActiveFg : InactiveFg;
    public string NavFgCalendar       => IsCalendarActive        ? ActiveFg : InactiveFg;
    public string NavFgQuickNote      => IsQuickNoteActive       ? ActiveFg : InactiveFg;
    public string NavFgWellbeing      => IsWellbeingActive       ? ActiveFg : InactiveFg;
    public string NavFgWaktuSolat     => IsWaktuSolatActive      ? ActiveFg : InactiveFg;
    public string NavFgRadio          => IsRadioActive           ? ActiveFg : InactiveFg;
    public string NavFgQrCode         => IsQrCodeActive          ? ActiveFg : InactiveFg;
    public string NavFgWorkstation    => IsWorkstationActive     ? ActiveFg : InactiveFg;
    public string NavFgSettings       => IsSettingsActive        ? ActiveFg : InactiveFg;

    // ─── Sidebar footer status ───────────────────────────────────────────────
    [ObservableProperty] private string _nasStatusText  = "SSNAS Offline";
    [ObservableProperty] private string _nasStatusColor = "#94A3B8";
    [ObservableProperty] private string _focusTimerText = "Focus Timer: Ready";
    [ObservableProperty] private string _activeThemeText = "Theme: Metamorphosis";

    // ─── Dashboard KPIs ──────────────────────────────────────────────────────
    [ObservableProperty] private string _metricTotalProjects   = "0";
    [ObservableProperty] private string _metricActiveWip       = "0";
    [ObservableProperty] private string _metricLatestProject   = "—";
    [ObservableProperty] private string _metricFileSize        = "0 MB";
    [ObservableProperty] private string _metricThisMonth       = "0";
    [ObservableProperty] private string _metricMonthComparison = "▲ +0% vs last month";
    [ObservableProperty] private string _metricTeamOutput      = "0";
    [ObservableProperty] private string _metricWorkspacePath   = string.Empty;

    // ─── Project collections ─────────────────────────────────────────────────
    [ObservableProperty] private ObservableCollection<ProjectStatusItem> _projects       = new();
    [ObservableProperty] private ObservableCollection<ProjectStatusItem> _filteredProjects = new();
    [ObservableProperty] private ObservableCollection<ProjectStatusItem> _backlogProjects = new();
    [ObservableProperty] private ObservableCollection<ProjectStatusItem> _inProgressProjects = new();
    [ObservableProperty] private ObservableCollection<ProjectStatusItem> _inReviewProjects = new();
    [ObservableProperty] private ObservableCollection<ProjectStatusItem> _doneProjects   = new();

    [ObservableProperty] private int _projectCount   = 0;
    [ObservableProperty] private int _backlogCount   = 0;
    [ObservableProperty] private int _inProgressCount = 0;
    [ObservableProperty] private int _inReviewCount  = 0;
    [ObservableProperty] private int _doneCount      = 0;

    // Selected project for Search & Copy inspector
    [ObservableProperty] private ProjectStatusItem? _selectedProject;

    // Search & filter
    [ObservableProperty] private string _searchQuery     = string.Empty;
    [ObservableProperty] private string _filterDesigner  = "All Designers";
    [ObservableProperty] private string _filterBrand     = "All Brands";

    // ─── Project Creator ─────────────────────────────────────────────────────
    [ObservableProperty] private string _newProjectBrand         = "SSH";
    [ObservableProperty] private string _newProjectTitle         = string.Empty;
    [ObservableProperty] private string _newProjectDesigner      = "harussani";
    [ObservableProperty] private string _newProjectClient        = "SuamiSihat Holding";
    [ObservableProperty] private string _newProjectPriority      = "medium";
    [ObservableProperty] private string _newProjectDeadline      = DateTime.Now.AddDays(7).ToString("yyyy-MM-dd");
    [ObservableProperty] private string _newProjectStarterCanvas = "afdesign";
    [ObservableProperty] private string _folderPreview           = string.Empty;

    [ObservableProperty] private ObservableCollection<string> _availableBrands     = new() { "SSH", "SSC", "SSW", "SSE", "SST" };
    [ObservableProperty] private ObservableCollection<string> _availableDesigners  = new() { "harussani", "haikal", "hasan", "farid", "azlan", "unassigned" };
    [ObservableProperty] private ObservableCollection<string> _availablePriorities = new() { "low", "medium", "high", "urgent" };
    [ObservableProperty] private ObservableCollection<string> _availableStarterCanvases = new() { "afdesign", "psd", "ai", "none" };

    // ─── Copywriting Studio ──────────────────────────────────────────────────
    [ObservableProperty] private ProjectStatusItem? _selectedCopyProject;
    [ObservableProperty] private string _activeCopyContent    = string.Empty;
    [ObservableProperty] private int    _copyWordCount        = 0;
    [ObservableProperty] private int    _copyCharCount        = 0;
    [ObservableProperty] private string _copyReadingTime      = "0 sec";
    [ObservableProperty] private string _whatsAppPreviewText  = "Your live WhatsApp message preview will appear here...";
    [ObservableProperty] private string _metaAdPreviewText    = "Your live ad copy preview will appear here...";

    // ─── Calendar ────────────────────────────────────────────────────────────
    [ObservableProperty] private int    _deadlinesThisMonth = 0;
    [ObservableProperty] private int    _startedThisMonth   = 0;
    [ObservableProperty] private int    _overdueCount       = 0;
    [ObservableProperty] private string _calendarMonthLabel = DateTime.Now.ToString("MMMM yyyy");
    [ObservableProperty] private ObservableCollection<CalendarWeekRow> _calendarWeeks = new();
    private DateTime _calendarMonth = new(DateTime.Now.Year, DateTime.Now.Month, 1);

    // ─── Quick Notes ─────────────────────────────────────────────────────────
    [ObservableProperty] private ObservableCollection<QuickNoteItem> _noteItems = new();
    [ObservableProperty] private QuickNoteItem? _selectedNoteItem;
    [ObservableProperty] private string _selectedNoteTitle   = string.Empty;
    [ObservableProperty] private string _selectedNoteContent = string.Empty;
    [ObservableProperty] private string _noteWordCount       = "0 words";
    [ObservableProperty] private string _noteSaveStatus      = "Autosaved";
    [ObservableProperty] private string _noteCountLabel      = "0 notes";

    // ─── Radio ───────────────────────────────────────────────────────────────
    [ObservableProperty] private bool   _isRadioPlaying     = false;
    [ObservableProperty] private string _currentStationName = "BFM 89.9 (The Business Station)";
    [ObservableProperty] private string _currentStationUrl  = "https://stream.bfm.my/";
    [ObservableProperty] private string _radioPlayIcon       = "▶";
    [ObservableProperty] private bool   _mpvAvailable       = false;

    [ObservableProperty]
    private ObservableCollection<RadioStationItem> _radioStations = new()
    {
        new RadioStationItem("BFM 89.9 — Business & News",     "https://stream.bfm.my/",                      "News & Economics",   "#21A1F7"),
        new RadioStationItem("Hitz FM — Top 40 Hits",           "https://hitz.astro.com.my/",                  "Top 40 Pop",         "#EF4444"),
        new RadioStationItem("Era FM — Muzik Hit Terbaik",      "https://era.astro.com.my/",                   "Malay Pop & Hits",   "#F59E0B"),
        new RadioStationItem("Nightwave Plaza — Lo-Fi Beats",   "https://plaza.one/mp3",                       "Vaporwave & Ambient","#8B5CF6"),
        new RadioStationItem("SomaFM — Groove Salad",           "https://ice1.somafm.com/groovesalad-128-mp3", "Downtempo Chill",    "#10B981"),
        new RadioStationItem("SuamiSihat Radio — SS Official",  "https://radio.suamisihat.myds.me/stream",     "Brand Station",      "#38BDF8"),
    };

    // ─── Waktu Solat ─────────────────────────────────────────────────────────
    [ObservableProperty] private string _gregorianDate      = DateTime.Now.ToString("dddd, d MMMM yyyy");
    [ObservableProperty] private string _hijriDate          = "Loading...";
    [ObservableProperty] private string _liveClockTime      = DateTime.Now.ToString("HH:mm:ss");
    [ObservableProperty] private string _liveClockDate      = DateTime.Now.ToString("ddd, d MMM");
    [ObservableProperty] private string _nextPrayerName     = "—";
    [ObservableProperty] private string _nextPrayerTime     = "--:--";
    [ObservableProperty] private string _nextPrayerCountdown = "Fetching...";
    [ObservableProperty] private string _qiblaDirection     = "295.4°";
    [ObservableProperty] private string _dailyHadith        = "\"Sesungguhnya amalan itu bergantung kepada niat, dan setiap orang mendapat balasan mengikut apa yang diniatkan.\"";
    [ObservableProperty] private string _dailyHadithSource  = "— Hadis Riwayat Bukhari & Muslim (No. 1)";
    [ObservableProperty] private ObservableCollection<PrayerTimeRow> _prayerTimeRows = new();
    [ObservableProperty] private ObservableCollection<string> _solatZones = new()
    {
        "WLY01", "SGR01", "PHG01", "KDH01", "KTN01", "TRG01",
        "PRK01", "NSN01", "MLK01", "JHR01", "PNG01", "SBH01", "SWK01"
    };
    [ObservableProperty] private string _selectedSolatZone = "WLY01";

    // ─── Wellbeing ───────────────────────────────────────────────────────────
    [ObservableProperty] private string _breathingPhase     = "Inhale (4s)";
    [ObservableProperty] private int    _waterGlasses       = 4;
    [ObservableProperty] private string _pomodoroStatus     = "Ready";
    [ObservableProperty] private string _pomodoroTime       = "25:00";
    [ObservableProperty] private bool   _isPomodoroRunning  = false;

    // ─── QR Code Studio ──────────────────────────────────────────────────────
    [ObservableProperty] private string  _qrUrl         = "https://creative.suamisihat.myds.me";
    [ObservableProperty] private string  _qrEcLevel     = "M";
    [ObservableProperty] private string  _qrSize        = "512 × 512";
    [ObservableProperty] private string  _qrMargin      = "4";
    [ObservableProperty] private string  _qrForeground  = "#000000";
    [ObservableProperty] private string  _qrBackground  = "#FFFFFF";
    [ObservableProperty] private string  _qrPreviewLabel = "Enter a URL and click Generate";
    [ObservableProperty] private Bitmap? _qrPreviewBitmap;

    [ObservableProperty] private ObservableCollection<string> _qrEcLevels      = new() { "L", "M", "Q", "H" };
    [ObservableProperty] private ObservableCollection<string> _qrSizes         = new() { "256 × 256", "512 × 512", "1024 × 1024", "2048 × 2048" };
    [ObservableProperty] private ObservableCollection<string> _qrMarginOptions = new() { "0", "2", "4", "8" };

    // ─── Workstation Health ──────────────────────────────────────────────────
    [ObservableProperty] private string _wsDistro        = "Loading...";
    [ObservableProperty] private string _wsCpuCores      = "?";
    [ObservableProperty] private string _wsCpuName       = "...";
    [ObservableProperty] private string _wsKernel        = "...";
    [ObservableProperty] private string _wsRamAvailable  = "...";
    [ObservableProperty] private string _wsRamTotal      = "...";
    [ObservableProperty] private string _wsDiskFree      = "...";
    [ObservableProperty] private string _wsDiskTotal     = "...";
    [ObservableProperty] private string _wsSoftwareInstalledLabel = "0 / 0 installed";
    [ObservableProperty] private ObservableCollection<SoftwareCheckItem> _softwareChecks = new();

    // ─── Settings ────────────────────────────────────────────────────────────
    [ObservableProperty] private string _currentTheme = "Metamorphosis";
    [ObservableProperty] private ObservableCollection<string> _availableThemes = new()
        { "Metamorphosis (OLED Dark & Cyan)", "Falconia (Fluent 2 Light)", "SS Default (Navy & Slate)" };

    // ─── Constructor ─────────────────────────────────────────────────────────
    public MainViewModel()
    {
        _workspaceService = new WorkspaceService();
        _radioService     = new RadioStreamService();
        _prayerService    = new PrayerTimeService();
        _noteService      = new QuickNoteService();
        _wsService        = new WorkstationHealthService();

        SynologyDrivePath = _workspaceService.WorkspaceRoot;
        _mpvAvailable     = _radioService.IsMpvAvailable;

        // Populate initial empty prayer rows
        BuildDefaultPrayerRows();
        HijriDate = _prayerService.GetHijriDate();

        NavigateToPage("Dashboard");
        LoadProjects();
        LoadNotes();
        BuildCalendar();

        // Start live clock tick (non-blocking)
        _ = StartClockAsync();
    }

    // ─── Nav tab change handler ───────────────────────────────────────────────
    partial void OnSelectedNavTabChanged(string value)
    {
        // Fire all active/bg/fg property notifications
        OnPropertyChanged(nameof(IsDashboardActive));     OnPropertyChanged(nameof(NavBgDashboard));     OnPropertyChanged(nameof(NavFgDashboard));
        OnPropertyChanged(nameof(IsProjectCreatorActive));OnPropertyChanged(nameof(NavBgProjectCreator));OnPropertyChanged(nameof(NavFgProjectCreator));
        OnPropertyChanged(nameof(IsSearchCopyActive));    OnPropertyChanged(nameof(NavBgSearchCopy));    OnPropertyChanged(nameof(NavFgSearchCopy));
        OnPropertyChanged(nameof(IsCopywritingActive));   OnPropertyChanged(nameof(NavBgCopywriting));   OnPropertyChanged(nameof(NavFgCopywriting));
        OnPropertyChanged(nameof(IsBrandAssetsActive));   OnPropertyChanged(nameof(NavBgBrandAssets));   OnPropertyChanged(nameof(NavFgBrandAssets));
        OnPropertyChanged(nameof(IsTaskManagerActive));   OnPropertyChanged(nameof(NavBgTaskManager));   OnPropertyChanged(nameof(NavFgTaskManager));
        OnPropertyChanged(nameof(IsCalendarActive));      OnPropertyChanged(nameof(NavBgCalendar));      OnPropertyChanged(nameof(NavFgCalendar));
        OnPropertyChanged(nameof(IsQuickNoteActive));     OnPropertyChanged(nameof(NavBgQuickNote));     OnPropertyChanged(nameof(NavFgQuickNote));
        OnPropertyChanged(nameof(IsWellbeingActive));     OnPropertyChanged(nameof(NavBgWellbeing));     OnPropertyChanged(nameof(NavFgWellbeing));
        OnPropertyChanged(nameof(IsWaktuSolatActive));    OnPropertyChanged(nameof(NavBgWaktuSolat));    OnPropertyChanged(nameof(NavFgWaktuSolat));
        OnPropertyChanged(nameof(IsRadioActive));         OnPropertyChanged(nameof(NavBgRadio));         OnPropertyChanged(nameof(NavFgRadio));
        OnPropertyChanged(nameof(IsQrCodeActive));        OnPropertyChanged(nameof(NavBgQrCode));        OnPropertyChanged(nameof(NavFgQrCode));
        OnPropertyChanged(nameof(IsWorkstationActive));   OnPropertyChanged(nameof(NavBgWorkstation));   OnPropertyChanged(nameof(NavFgWorkstation));
        OnPropertyChanged(nameof(IsSettingsActive));      OnPropertyChanged(nameof(NavBgSettings));      OnPropertyChanged(nameof(NavFgSettings));

        NavigateToPage(value);
    }

    private void NavigateToPage(string tabName)
    {
        if (!_pageCache.TryGetValue(tabName, out var page))
        {
            page = tabName switch
            {
                "Dashboard"         => new DashboardView         { DataContext = this },
                "Project Creator"   => new ProjectCreatorView    { DataContext = this },
                "Search & Copy"     => new SearchCopyView        { DataContext = this },
                "Copywriting"       => new CopywritingView       { DataContext = this },
                "Brand Assets"      => new BrandAssetsView       { DataContext = this },
                "Task Manager"      => new TaskManagerView       { DataContext = this },
                "Big Calendar"      => new CalendarView          { DataContext = this },
                "Quick Notes"       => new QuickNoteView         { DataContext = this },
                "Wellbeing"         => new WellbeingView         { DataContext = this },
                "Waktu Solat"       => new WaktuSolatView        { DataContext = this },
                "Radio Player"      => new FocusRadioView        { DataContext = this },
                "QR Code"           => new QrCodeView            { DataContext = this },
                "Workstation Health"=> new WorkstationHealthView { DataContext = this },
                "Settings"          => new SettingsView          { DataContext = this },
                _                   => new DashboardView         { DataContext = this },
            };
            _pageCache[tabName] = page;
        }
        CurrentPage = page;
    }

    // ─── Navigation command ───────────────────────────────────────────────────
    [RelayCommand]
    private void SelectTab(string tabName)
    {
        SelectedNavTab = tabName;
        StatusMessage  = $"Navigated to {tabName} — {DateTime.Now:HH:mm:ss}";
    }

    // ─── Projects ────────────────────────────────────────────────────────────
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
                    case "in_review":  InReviewProjects.Add(p); break;
                    case "done":
                    case "completed":  DoneProjects.Add(p); break;
                    default:           BacklogProjects.Add(p); break;
                }
            }

            ProjectCount    = Projects.Count;
            BacklogCount    = BacklogProjects.Count;
            InProgressCount = InProgressProjects.Count;
            InReviewCount   = InReviewProjects.Count;
            DoneCount       = DoneProjects.Count;

            ApplyProjectFilter();
            UpdateDashboardKpis();
            BuildCalendar();
            StatusMessage = $"Scanned {ProjectCount} projects ({DateTime.Now:HH:mm:ss})";

            if (SelectedCopyProject == null && Projects.Count > 0)
                OpenCopyEditor(Projects.First());
        }
        catch (Exception ex)
        {
            StatusMessage = $"Workspace scan failed: {ex.Message}";
            Debug.WriteLine($"[MainViewModel] LoadProjects: {ex.Message}");
        }
    }

    private void UpdateDashboardKpis()
    {
        MetricTotalProjects = ProjectCount.ToString();
        MetricActiveWip     = InProgressCount.ToString();
        MetricLatestProject = Projects.FirstOrDefault()?.Project ?? "—";
        MetricThisMonth     = Projects.Count(p =>
            DateTime.TryParse(p.CreatedDate, out var d) &&
            d.Month == DateTime.Now.Month && d.Year == DateTime.Now.Year).ToString();
        MetricWorkspacePath = SynologyDrivePath;

        // Calculate rough workspace size
        try
        {
            if (Directory.Exists(SynologyDrivePath))
            {
                long bytes = Directory.GetFiles(SynologyDrivePath, "*", SearchOption.AllDirectories).Sum(f =>
                {
                    try { return new FileInfo(f).Length; } catch { return 0; }
                });
                MetricFileSize = FormatBytes(bytes);
            }
        }
        catch (Exception ex) { Debug.WriteLine($"[MainViewModel] Size calc: {ex.Message}"); }
    }

    [RelayCommand]
    private void SelectProject(ProjectStatusItem project)
    {
        SelectedProject = project;
    }

    partial void OnSearchQueryChanged(string value)    => ApplyProjectFilter();
    partial void OnFilterDesignerChanged(string value) => ApplyProjectFilter();
    partial void OnFilterBrandChanged(string value)    => ApplyProjectFilter();

    private void ApplyProjectFilter()
    {
        var q   = SearchQuery?.ToLowerInvariant() ?? string.Empty;
        var des = FilterDesigner == "All Designers" ? null : FilterDesigner;
        var brn = FilterBrand    == "All Brands"    ? null : FilterBrand;

        FilteredProjects.Clear();
        foreach (var p in Projects)
        {
            bool matchQ  = string.IsNullOrEmpty(q) || p.Project.ToLowerInvariant().Contains(q);
            bool matchD  = des == null || p.Designer == des;
            bool matchB  = brn == null || p.Project.StartsWith(brn, StringComparison.OrdinalIgnoreCase);
            if (matchQ && matchD && matchB)
                FilteredProjects.Add(p);
        }
    }

    // ─── Project Creator ─────────────────────────────────────────────────────
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
                NewProjectBrand, NewProjectTitle, NewProjectDesigner,
                NewProjectClient, NewProjectPriority, NewProjectDeadline);

            if (NewProjectStarterCanvas != "none" && !string.IsNullOrEmpty(created.FullPath))
            {
                string src = Path.Combine(created.FullPath, "02_SOURCE_FILES");
                if (Directory.Exists(src))
                {
                    string canvas = Path.Combine(src, $"canvas_{NewProjectTitle.ToLower().Replace(' ', '_')}.{NewProjectStarterCanvas}");
                    if (!File.Exists(canvas))
                        File.WriteAllText(canvas, $"# SuamiSihat Creative Starter Canvas ({NewProjectStarterCanvas.ToUpperInvariant()})\n");
                }
            }

            LoadProjects();
            StatusMessage  = $"✔ Created project vault: {created.Project}";
            NewProjectTitle = string.Empty;
            SelectedNavTab  = "Dashboard";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Failed to create project: {ex.Message}";
            Debug.WriteLine($"[MainViewModel] CreateProject: {ex.Message}");
        }
    }

    partial void OnNewProjectBrandChanged(string value)  => UpdateFolderPreview();
    partial void OnNewProjectTitleChanged(string value)  => UpdateFolderPreview();
    private void UpdateFolderPreview()
    {
        if (string.IsNullOrWhiteSpace(NewProjectTitle)) { FolderPreview = string.Empty; return; }
        string year  = DateTime.Now.Year.ToString();
        string slug  = NewProjectTitle.Trim().Replace(' ', '-').ToUpperInvariant();
        string root  = $"{year}_{NewProjectBrand}_{slug}";
        FolderPreview = string.Join("\n",
            $"📁 {root}/",
            $"  📁 01_DESIGN_FILES/",
            $"  📁 02_SOURCE_FILES/",
            $"  📁 03_COPYWRITING/",
            $"  📁 04_EXPORTED_ASSETS/",
            $"  📁 05_CLIENT_REFERENCES/",
            $"  📄 PROJECT.md");
    }

    // ─── Copywriting ─────────────────────────────────────────────────────────
    [RelayCommand]
    private void OpenCopyEditor(ProjectStatusItem project)
    {
        SelectedCopyProject = project;
        ActiveCopyContent   = _workspaceService.ReadCopy(project.FullPath);
        UpdateCopyMetrics(ActiveCopyContent);
        SelectedNavTab = "Copywriting";
        StatusMessage  = $"Editing 03_COPYWRITING/COPY.md for {project.Project}";
    }

    [RelayCommand]
    private void SaveCopy()
    {
        if (SelectedCopyProject == null) return;
        bool ok = _workspaceService.SaveCopy(SelectedCopyProject.FullPath, ActiveCopyContent);
        StatusMessage = ok ? $"✔ COPY.md saved ({DateTime.Now:HH:mm:ss})" : "⚠️ Failed to save COPY.md";
    }

    [RelayCommand]
    private void InsertCopyHook(string formula)
    {
        string snippet = formula switch
        {
            "PAS"        => "\n### 🎯 Problem-Agitate-Solve\n- **Problem**: Rasa cepat penat dan lesu?\n- **Agitate**: Kerja bertimbun, stamina pula makin drop.\n- **Solve**: Amalkan SuamiSihat untuk tenaga maksimum!\n",
            "BAB"        => "\n### 🚀 Before-After-Bridge\n- **Before**: Dulu petang je mula lemau.\n- **After**: Sekarang kekal fokus sepanjang hari.\n- **Bridge**: Rahsianya, pemakanan seimbang dan formula SuamiSihat.\n",
            "CTA"        => "\n📲 **WhatsApp Sekarang:** Tekan pautan di bio untuk konsultasi percuma!\n",
            "DISCLAIMER" => "\n> ⚠️ *Kesan mungkin berbeza mengikut individu. Sila rujuk pakar.*\n",
            "PROMO"      => "\n🔥 **PROMOSI TERHAD**: Gunakan kod `SSMERDEKA` untuk potongan 15%!\n",
            _            => "\n---\n"
        };
        ActiveCopyContent += snippet;
        UpdateCopyMetrics(ActiveCopyContent);
        StatusMessage = $"✔ Inserted {formula} snippet";
    }

    partial void OnActiveCopyContentChanged(string value) => UpdateCopyMetrics(value);

    private void UpdateCopyMetrics(string text)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            CopyWordCount = 0; CopyCharCount = 0; CopyReadingTime = "0 sec";
            WhatsAppPreviewText = "Your live WhatsApp message preview will appear here...";
            MetaAdPreviewText   = "Your live ad copy preview will appear here...";
            return;
        }
        CopyCharCount = text.Length;
        var words     = text.Split(new[] { ' ', '\r', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries);
        CopyWordCount = words.Length;
        int sec       = (int)Math.Ceiling(CopyWordCount / 3.3);
        CopyReadingTime     = sec < 60 ? $"{sec} sec" : $"{sec / 60}m {sec % 60}s";
        WhatsAppPreviewText = text.Trim();
        MetaAdPreviewText   = text.Length > 240 ? text[..240] + "...\n\n👉 Click here to learn more" : text + "\n\n👉 Click here to learn more";
    }

    // ─── Task Manager / Move Status ──────────────────────────────────────────
    [RelayCommand]
    private void MoveStatus(ProjectStatusItem project)
    {
        string next = project.Status switch
        {
            "backlog"     => "in_progress",
            "in_progress" => "in_review",
            "in_review"   => "done",
            _             => "backlog"
        };
        _workspaceService.UpdateProjectStatus(project, next);
        LoadProjects();
        StatusMessage = $"✔ Moved {project.Project} to {next.ToUpperInvariant()}";
    }

    // ─── Calendar ────────────────────────────────────────────────────────────
    [RelayCommand]
    private void PrevMonth()
    {
        _calendarMonth = _calendarMonth.AddMonths(-1);
        CalendarMonthLabel = _calendarMonth.ToString("MMMM yyyy");
        BuildCalendar();
    }

    [RelayCommand]
    private void NextMonth()
    {
        _calendarMonth = _calendarMonth.AddMonths(1);
        CalendarMonthLabel = _calendarMonth.ToString("MMMM yyyy");
        BuildCalendar();
    }

    private void BuildCalendar()
    {
        var deadlines = Projects
            .Where(p => DateTime.TryParse(p.Deadline, out _))
            .ToDictionary(p => DateTime.Parse(p.Deadline).Date, p => p.Project);

        var now    = DateTime.Now.Date;
        var first  = new DateTime(_calendarMonth.Year, _calendarMonth.Month, 1);
        int offset = (int)first.DayOfWeek; // 0 = Sun
        int daysInMonth = DateTime.DaysInMonth(_calendarMonth.Year, _calendarMonth.Month);

        CalendarWeeks.Clear();
        int day = 1 - offset;
        for (int row = 0; row < 6; row++)
        {
            var week = new CalendarWeekRow();
            var days = new[] { week.Day0, week.Day1, week.Day2, week.Day3, week.Day4, week.Day5, week.Day6 };
            for (int col = 0; col < 7; col++, day++)
            {
                bool inMonth = day >= 1 && day <= daysInMonth;
                var cell = new CalendarDay
                {
                    DayNumber      = inMonth ? day.ToString() : string.Empty,
                    IsCurrentMonth = inMonth,
                    IsToday        = inMonth && new DateTime(_calendarMonth.Year, _calendarMonth.Month, day) == now,
                };
                if (inMonth && deadlines.TryGetValue(new DateTime(_calendarMonth.Year, _calendarMonth.Month, day), out var proj))
                    cell.Badge = proj.Length > 16 ? proj[..16] + "…" : proj;

                switch (col)
                {
                    case 0: week.Day0 = cell; break; case 1: week.Day1 = cell; break;
                    case 2: week.Day2 = cell; break; case 3: week.Day3 = cell; break;
                    case 4: week.Day4 = cell; break; case 5: week.Day5 = cell; break;
                    case 6: week.Day6 = cell; break;
                }
            }
            CalendarWeeks.Add(week);
            if (day > daysInMonth) break;
        }

        DeadlinesThisMonth = Projects.Count(p =>
            DateTime.TryParse(p.Deadline, out var d) && d.Month == _calendarMonth.Month && d.Year == _calendarMonth.Year);
        StartedThisMonth = Projects.Count(p =>
            DateTime.TryParse(p.CreatedDate, out var d) && d.Month == _calendarMonth.Month && d.Year == _calendarMonth.Year);
        OverdueCount = Projects.Count(p =>
            DateTime.TryParse(p.Deadline, out var d) && d.Date < now && p.Status != "done" && p.Status != "completed");
    }

    // ─── Quick Notes ─────────────────────────────────────────────────────────
    private void LoadNotes()
    {
        NoteItems.Clear();
        foreach (var n in _noteService.Notes)
        {
            NoteItems.Add(new QuickNoteItem
            {
                Id       = n.Id,
                Title    = n.Title,
                Content  = n.Content,
                Modified = n.Modified.ToString("dd MMM, HH:mm")
            });
        }
        NoteCountLabel = $"{NoteItems.Count} notes";
    }

    [RelayCommand]
    private void NewNote()
    {
        var note = _noteService.Create("New Note");
        var item = new QuickNoteItem { Id = note.Id, Title = note.Title };
        NoteItems.Insert(0, item);
        NoteCountLabel = $"{NoteItems.Count} notes";
        SelectNote(item);
    }

    [RelayCommand]
    private void SelectNote(QuickNoteItem item)
    {
        SelectedNoteItem    = item;
        SelectedNoteTitle   = item.Title;
        SelectedNoteContent = item.Content;
        UpdateNoteMetrics(item.Content);
        NoteSaveStatus = "Unsaved";
    }

    [RelayCommand]
    private void SaveNote()
    {
        if (SelectedNoteItem == null) return;
        SelectedNoteItem.Title   = SelectedNoteTitle;
        SelectedNoteItem.Content = SelectedNoteContent;
        _noteService.Save(new Services.QuickNote
        {
            Id      = SelectedNoteItem.Id,
            Title   = SelectedNoteTitle,
            Content = SelectedNoteContent
        });
        NoteSaveStatus = $"Saved {DateTime.Now:HH:mm:ss}";
        LoadNotes();
    }

    [RelayCommand]
    private void DeleteNote()
    {
        if (SelectedNoteItem == null) return;
        _noteService.Delete(SelectedNoteItem.Id);
        LoadNotes();
        SelectedNoteItem    = null;
        SelectedNoteTitle   = string.Empty;
        SelectedNoteContent = string.Empty;
        NoteWordCount = "0 words";
        NoteSaveStatus = "—";
    }

    partial void OnSelectedNoteContentChanged(string value) => UpdateNoteMetrics(value);

    private void UpdateNoteMetrics(string content)
    {
        var words     = (content ?? string.Empty).Split(new[] { ' ', '\n', '\r', '\t' }, StringSplitOptions.RemoveEmptyEntries);
        NoteWordCount = $"{words.Length} words · {(content ?? "").Length} chars";
        NoteSaveStatus = "Unsaved";
    }

    // ─── Radio ───────────────────────────────────────────────────────────────
    [RelayCommand]
    private async Task ToggleRadio()
    {
        if (IsRadioPlaying)
        {
            _radioService.Stop();
            IsRadioPlaying = false;
            RadioPlayIcon  = "▶";
            StatusMessage  = "⏹ Radio stopped";
        }
        else
        {
            await _radioService.PlayAsync(CurrentStationUrl);
            IsRadioPlaying = true;
            RadioPlayIcon  = "⏸";
            StatusMessage  = $"▶ Streaming: {CurrentStationName}";
        }
    }

    [RelayCommand]
    private async Task SelectRadioStation(RadioStationItem station)
    {
        CurrentStationName = station.Name;
        CurrentStationUrl  = station.StreamUrl;
        await _radioService.PlayAsync(station.StreamUrl);
        IsRadioPlaying = true;
        RadioPlayIcon  = "⏸";
        StatusMessage  = $"▶ Streaming: {station.Name}";
    }

    // ─── Waktu Solat ─────────────────────────────────────────────────────────
    [RelayCommand]
    private async Task FetchSolat()
    {
        NextPrayerCountdown = "Fetching...";
        var data = await _prayerService.FetchTodayAsync(SelectedSolatZone);
        if (data == null) { NextPrayerCountdown = "API unavailable"; return; }

        BuildPrayerRows(data);
        HijriDate = _prayerService.GetHijriDate();

        var next = _prayerService.GetNextPrayer(data);
        if (next != null)
        {
            NextPrayerName     = next.Name;
            NextPrayerTime     = next.TimeStr;
            var diff           = next.Time - DateTime.Now;
            NextPrayerCountdown = diff.TotalMinutes > 0
                ? $"dalam {(int)diff.TotalHours}j {diff.Minutes}m"
                : "Sekarang";
        }
    }

    private void BuildPrayerRows(PrayerTimeService.WaktuSolatResponse data)
    {
        PrayerTimeRows.Clear();
        var next = _prayerService.GetNextPrayer(data);
        var rows = new[]
        {
            new PrayerTimeRow { Icon="🌙", Name="Imsak",   Description="Henti makan sahur",   TimeStr=data.Imsak   ?? "--:--" },
            new PrayerTimeRow { Icon="🌅", Name="Subuh",   Description="Fajar sadiq",          TimeStr=data.Subuh   ?? "--:--" },
            new PrayerTimeRow { Icon="🌄", Name="Syuruk",  Description="Terbit matahari",      TimeStr=data.Syuruk  ?? "--:--" },
            new PrayerTimeRow { Icon="☀️", Name="Dhuha",   Description="Waktu dhuha",          TimeStr=data.Dhuha   ?? "--:--" },
            new PrayerTimeRow { Icon="🌞", Name="Zohor",   Description="Tengah hari",          TimeStr=data.Zohor   ?? "--:--" },
            new PrayerTimeRow { Icon="🌤", Name="Asar",    Description="Petang",               TimeStr=data.Asar    ?? "--:--" },
            new PrayerTimeRow { Icon="🌇", Name="Maghrib", Description="Matahari terbenam",    TimeStr=data.Maghrib ?? "--:--" },
            new PrayerTimeRow { Icon="🌙", Name="Isyak",   Description="Malam",                TimeStr=data.Isyak   ?? "--:--" },
        };
        foreach (var r in rows)
        {
            if (next != null) r.IsNext = r.Name == next.Name;
            PrayerTimeRows.Add(r);
        }
    }

    private void BuildDefaultPrayerRows()
    {
        PrayerTimeRows.Clear();
        string[] names = { "Imsak","Subuh","Syuruk","Dhuha","Zohor","Asar","Maghrib","Isyak" };
        string[] icons = { "🌙","🌅","🌄","☀️","🌞","🌤","🌇","🌙" };
        for (int i = 0; i < names.Length; i++)
            PrayerTimeRows.Add(new PrayerTimeRow { Icon=icons[i], Name=names[i], TimeStr="--:--" });
    }

    // ─── Wellbeing ───────────────────────────────────────────────────────────
    [RelayCommand]
    private void IncrementWater()
    {
        if (WaterGlasses < 8) WaterGlasses++;
        StatusMessage = $"💧 Hydration: {WaterGlasses}/8 glasses today";
    }

    [RelayCommand]
    private void TogglePomodoro()
    {
        IsPomodoroRunning = !IsPomodoroRunning;
        PomodoroStatus    = IsPomodoroRunning ? "Running — Focus Mode" : "Paused";
        if (IsPomodoroRunning) _ = RunPomodoroAsync();
    }

    private async Task RunPomodoroAsync()
    {
        int seconds = 25 * 60;
        while (IsPomodoroRunning && seconds > 0)
        {
            await Task.Delay(1000);
            seconds--;
            PomodoroTime = $"{seconds / 60:D2}:{seconds % 60:D2}";
        }
        if (seconds == 0) { PomodoroStatus = "✔ Session Complete!"; IsPomodoroRunning = false; }
    }

    // ─── QR Code ─────────────────────────────────────────────────────────────
    [RelayCommand]
    private void GenerateQr()
    {
        try
        {
            if (string.IsNullOrWhiteSpace(QrUrl)) { QrPreviewLabel = "⚠️ Enter a URL first"; return; }

            using var qrGenerator = new QRCodeGenerator();
            var ecLevel = QrEcLevel switch
            {
                "L" => QRCodeGenerator.ECCLevel.L,
                "Q" => QRCodeGenerator.ECCLevel.Q,
                "H" => QRCodeGenerator.ECCLevel.H,
                _   => QRCodeGenerator.ECCLevel.M,
            };
            using var data = qrGenerator.CreateQrCode(QrUrl, ecLevel);
            // BitmapByteQRCode uses plain byte[] (no System.Drawing dependency)
            using var code = new BitmapByteQRCode(data);
            byte[] bytes   = code.GetGraphic(20);

            using var ms = new MemoryStream(bytes);
            QrPreviewBitmap = new Bitmap(ms);
            string label    = QrUrl.Length > 30 ? (QrUrl[..30] + "…") : QrUrl;
            int size        = QrSize.Split('x', 'x', '×')[0].Trim() is { } s && int.TryParse(s, out var px) ? px : 512;
            QrPreviewLabel  = $"{label} — {size}×{size}px";
            StatusMessage   = $"✔ QR Code generated for: {QrUrl}";
        }
        catch (Exception ex)
        {
            QrPreviewLabel = $"Error: {ex.Message}";
            Debug.WriteLine($"[MainViewModel] GenerateQr: {ex.Message}");
        }
    }

    [RelayCommand]
    private void SaveQrPng()
    {
        if (QrPreviewBitmap == null) { StatusMessage = "⚠️ Generate a QR code first"; return; }
        try
        {
            string home   = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string output = Path.Combine(home, $"ss-cam-qr-{DateTime.Now:yyyyMMdd-HHmmss}.png");
            using (var fs = new FileStream(output, FileMode.Create))
#pragma warning disable CS0618
                QrPreviewBitmap.Save(fs);
#pragma warning restore CS0618
            StatusMessage = $"✔ Saved QR PNG to: {output}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Save failed: {ex.Message}";
            Debug.WriteLine($"[MainViewModel] SaveQrPng: {ex.Message}");
        }
    }

    [RelayCommand]
    private void CopyQr() => StatusMessage = "📋 QR image copied to clipboard (use Save PNG for now)";

    [RelayCommand]
    private void ResetQr()
    {
        QrUrl           = "https://creative.suamisihat.myds.me";
        QrEcLevel       = "M";
        QrSize          = "512 × 512";
        QrMargin        = "4";
        QrForeground    = "#000000";
        QrBackground    = "#FFFFFF";
        QrPreviewBitmap = null;
        QrPreviewLabel  = "Enter a URL and click Generate";
    }

    // ─── Workstation Health ──────────────────────────────────────────────────
    [RelayCommand]
    private async Task RescanWorkstation()
    {
        WsDistro = "Scanning...";
        WsCpuCores = "...";
        await Task.Run(() =>
        {
            var info = _wsService.GetSystemInfo();
            var checks = _wsService.CheckCreativeSoftware();

            Avalonia.Threading.Dispatcher.UIThread.Post(() =>
            {
                WsDistro       = info.Distro;
                WsKernel       = info.Kernel;
                WsCpuCores     = info.CpuCores.ToString();
                WsCpuName      = info.CpuName;
                WsRamAvailable = info.RamAvailable;
                WsRamTotal     = $"of {info.RamTotal} total";
                WsDiskFree     = info.DiskFree;
                WsDiskTotal    = $"of {info.DiskTotal} total";

                SoftwareChecks.Clear();
                foreach (var c in checks)
                    SoftwareChecks.Add(new SoftwareCheckItem { Name = c.Name, IsInstalled = c.IsInstalled, Version = c.Version });

                int installed = checks.Count(c => c.IsInstalled);
                WsSoftwareInstalledLabel = $"{installed} / {checks.Length} installed";
                StatusMessage = $"✔ Workstation scan complete ({DateTime.Now:HH:mm:ss})";
            });
        });
    }

    // ─── Open folder ─────────────────────────────────────────────────────────
    [RelayCommand]
    private void OpenFolder(string? path)
    {
        if (string.IsNullOrWhiteSpace(path)) { StatusMessage = "⚠️ No folder path"; return; }
        try
        {
            if (Directory.Exists(path))
            {
                Process.Start(new ProcessStartInfo { FileName = "xdg-open", Arguments = $"\"{path}\"", UseShellExecute = true });
                StatusMessage = $"Opened: {path}";
            }
            else StatusMessage = $"Folder not found: {path}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Could not open folder: {ex.Message}";
            Debug.WriteLine($"[MainViewModel] OpenFolder: {ex.Message}");
        }
    }

    // ─── Clipboard ───────────────────────────────────────────────────────────
    [RelayCommand]
    private void CopyToClipboard(string text)
    {
        StatusMessage = $"✔ Copied to clipboard";
        Debug.WriteLine($"[MainViewModel] CopyToClipboard: {text}");
    }

    // ─── Desktop shortcut ────────────────────────────────────────────────────
    [RelayCommand]
    private void CreateDesktopShortcut()
    {
        try
        {
            string desktop = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Desktop");
            Directory.CreateDirectory(desktop);
            string exec    = Process.GetCurrentProcess().MainModule?.FileName ?? "/opt/ss-cam/SS-CAM.Linux";
            string path    = Path.Combine(desktop, "SS-CAM.desktop");
            File.WriteAllText(path,
                $"[Desktop Entry]\nType=Application\nName={AppName}\nExec={exec}\nIcon=ss-cam\nTerminal=false\nCategories=Graphics;Office;\nStartupWMClass=SS-CAM.Linux\n");
            StatusMessage = $"✔ Desktop shortcut created: {path}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Shortcut failed: {ex.Message}";
            Debug.WriteLine($"[MainViewModel] CreateDesktopShortcut: {ex.Message}");
        }
    }

    // ─── NAS check ───────────────────────────────────────────────────────────
    [RelayCommand]
    private async Task CheckNasStatus()
    {
        NasStatusText  = "Checking...";
        NasStatusColor = "#94A3B8";
        await Task.Run(() =>
        {
            bool ok = false;
            try { ok = Directory.Exists(SynologyDrivePath); } catch { /* offline */ }
            Avalonia.Threading.Dispatcher.UIThread.Post(() =>
            {
                NasStatusText  = ok ? "SSNAS Online" : "SSNAS Offline";
                NasStatusColor = ok ? "#34D399"      : "#F87171";
                StatusMessage  = ok ? $"✔ NAS connected: {SynologyDrivePath}" : "⚠️ NAS not reachable";
            });
        });
    }

    // ─── Live clock ──────────────────────────────────────────────────────────
    private async Task StartClockAsync()
    {
        while (true)
        {
            await Task.Delay(1000);
            var now = DateTime.Now;
            CurrentTimeString   = now.ToString("HH:mm:ss");
            LiveClockTime       = now.ToString("HH:mm:ss");
            LiveClockDate       = now.ToString("ddd, d MMM");
            GregorianDate       = now.ToString("dddd, d MMMM yyyy");

            // Update next prayer countdown if rows exist
            UpdatePrayerCountdown();
        }
    }

    private void UpdatePrayerCountdown()
    {
        // Simple countdown refresh without re-fetching
        if (string.IsNullOrEmpty(NextPrayerTime) || NextPrayerTime == "--:--") return;
        if (DateTime.TryParseExact($"{DateTime.Now:yyyy-MM-dd} {NextPrayerTime}", "yyyy-MM-dd HH:mm", null, System.Globalization.DateTimeStyles.None, out var pt))
        {
            var diff = pt - DateTime.Now;
            NextPrayerCountdown = diff.TotalMinutes > 0 ? $"dalam {(int)diff.TotalHours}j {diff.Minutes}m" : "Sekarang";
        }
    }

    // ─── Utilities ───────────────────────────────────────────────────────────
    private static string FormatBytes(long bytes)
    {
        if (bytes >= 1_099_511_627_776L) return $"{bytes / 1_099_511_627_776.0:F1} TB";
        if (bytes >= 1_073_741_824L)    return $"{bytes / 1_073_741_824.0:F1} GB";
        if (bytes >= 1_048_576L)        return $"{bytes / 1_048_576.0:F0} MB";
        return $"{bytes / 1024} KB";
    }
}
