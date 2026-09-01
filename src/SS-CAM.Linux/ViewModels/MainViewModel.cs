using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Avalonia.Media.Imaging;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using QRCoder;
using SS_CAM.Linux.Models;
using SS_CAM.Linux.Services;
using SS_CAM.Linux.Views.Pages;

namespace SS_CAM.Linux.ViewModels
{
    public partial class MainViewModel : ObservableObject
    {
        // ── Navigation & Page Routing ──────────────────────────────────────────
        [ObservableProperty] private object? _currentPage;
        [ObservableProperty] private string _currentTabName = "Dashboard";
        [ObservableProperty] private string _appName = "SuamiSihat™ SS-CAM";
        [ObservableProperty] private string _appVersion = "v4.6.0-linux";
        [ObservableProperty] private string _statusMessage = "Ready.";
        [ObservableProperty] private string _currentTimeString = "";
        [ObservableProperty] private string _focusTimerText = "25:00 Focus";
        [ObservableProperty] private string _activeThemeText = "SS Default";
        [ObservableProperty] private string _nasStatusText = "Synology Drive Active";
        [ObservableProperty] private string _nasStatusColor = "#10B981";

        // Navigation Highlight Colors
        [ObservableProperty] private string _navBgDashboard = "#043388";
        [ObservableProperty] private string _navFgDashboard = "#FFFFFF";
        [ObservableProperty] private string _navBgProjectCreator = "Transparent";
        [ObservableProperty] private string _navFgProjectCreator = "#94A3B8";
        [ObservableProperty] private string _navBgSearchCopy = "Transparent";
        [ObservableProperty] private string _navFgSearchCopy = "#94A3B8";
        [ObservableProperty] private string _navBgCopywriting = "Transparent";
        [ObservableProperty] private string _navFgCopywriting = "#94A3B8";
        [ObservableProperty] private string _navBgBrandAssets = "Transparent";
        [ObservableProperty] private string _navFgBrandAssets = "#94A3B8";
        [ObservableProperty] private string _navBgDeliverables = "Transparent";
        [ObservableProperty] private string _navFgDeliverables = "#94A3B8";
        [ObservableProperty] private string _navBgTaskManager = "Transparent";
        [ObservableProperty] private string _navFgTaskManager = "#94A3B8";
        [ObservableProperty] private string _navBgCalendar = "Transparent";
        [ObservableProperty] private string _navFgCalendar = "#94A3B8";
        [ObservableProperty] private string _navBgQuickNote = "Transparent";
        [ObservableProperty] private string _navFgQuickNote = "#94A3B8";
        [ObservableProperty] private string _navBgWellbeing = "Transparent";
        [ObservableProperty] private string _navFgWellbeing = "#94A3B8";
        [ObservableProperty] private string _navBgWaktuSolat = "Transparent";
        [ObservableProperty] private string _navFgWaktuSolat = "#94A3B8";
        [ObservableProperty] private string _navBgRadio = "Transparent";
        [ObservableProperty] private string _navFgRadio = "#94A3B8";
        [ObservableProperty] private string _navBgQrCode = "Transparent";
        [ObservableProperty] private string _navFgQrCode = "#94A3B8";
        [ObservableProperty] private string _navBgWorkstation = "Transparent";
        [ObservableProperty] private string _navFgWorkstation = "#94A3B8";
        [ObservableProperty] private string _navBgSettings = "Transparent";
        [ObservableProperty] private string _navFgSettings = "#94A3B8";

        // ══════════════════════════════════════════════════════════════════════
        // 1. DASHBOARD TELEMETRY & KPIS
        // ══════════════════════════════════════════════════════════════════════
        [ObservableProperty] private int _totalProjects = 0;
        [ObservableProperty] private int _activeWipProjects = 0;
        [ObservableProperty] private string _latestProjectName = "-";
        [ObservableProperty] private string _totalStorageSize = "0 MB";
        [ObservableProperty] private int _thisMonthOutput = 0;
        [ObservableProperty] private string _monthComparisonText = "+0% vs last month";
        [ObservableProperty] private string _largestProjectSize = "0 MB";
        [ObservableProperty] private string _largestProjectName = "None";
        [ObservableProperty] private int _staleProjectsCount = 0;
        [ObservableProperty] private string _creativeTeamFlowText = "0 Designers, 0 Projects";
        [ObservableProperty] private ObservableCollection<DesignerFolderItem> _recentProjects = new();
        [ObservableProperty] private ObservableCollection<DesignerCapacityItem> _designerCapacities = new();

        // ══════════════════════════════════════════════════════════════════════
        // 2. STANDARDIZED PROJECT CREATOR
        // ══════════════════════════════════════════════════════════════════════
        [ObservableProperty] private ObservableCollection<string> _years = new() { "2026", "2025", "2027" };
        [ObservableProperty] private string _selectedYear = "2026";
        [ObservableProperty] private ObservableCollection<string> _subBrands = new(CategoryPresetService.GetSubBrands());
        [ObservableProperty] private string _selectedSubBrand = "SSH - SuamiSihat Holding";
        [ObservableProperty] private string _projectIdSuffix = "0001D";
        [ObservableProperty] private string _projectTitle = "Brand Awareness Campaign";
        [ObservableProperty] private string _projectBriefMarkdown = "";
        [ObservableProperty] private ObservableCollection<CategoryPreset> _categoryPresets = new(CategoryPresetService.GetDefaultPresets());
        [ObservableProperty] private CategoryPreset? _selectedCategoryPreset;
        [ObservableProperty] private ObservableCollection<CanvasPlatformPreset> _platformPresets = new(CategoryPresetService.GetPlatformPresets());
        [ObservableProperty] private CanvasPlatformPreset? _selectedPlatformPreset;
        [ObservableProperty] private int _slaTargetDays = 3;
        [ObservableProperty] private string _slaDeadlineDisplay = "Target Due Date: 3 Days";
        [ObservableProperty] private string _previewFolderPath = "";
        [ObservableProperty] private string _previewCopyMarkdown = "";
        [ObservableProperty] private string _previewYamlFrontmatter = "";
        [ObservableProperty] private ObservableCollection<string> _designers = new(CategoryPresetService.GetDesigners());
        [ObservableProperty] private string _selectedDesigner = "Harussani";

        // ══════════════════════════════════════════════════════════════════════
        // 3. COPYWRITING STUDIO & PREVIEWS
        // ══════════════════════════════════════════════════════════════════════
        [ObservableProperty] private ObservableCollection<ProjectStatusItem> _workspaceProjects = new();
        [ObservableProperty] private ProjectStatusItem? _selectedCopyProject;
        [ObservableProperty] private string _copyContent = "";
        [ObservableProperty] private string _copyFilePath = "No project selected";
        [ObservableProperty] private string _copySaveStatus = "Ready";
        [ObservableProperty] private int _copyWordCount = 0;
        [ObservableProperty] private double _copyReadTimeMinutes = 0;
        [ObservableProperty] private int _copyEmojiCount = 0;
        [ObservableProperty] private string _metaAdHeadline = "";
        [ObservableProperty] private string _metaAdPrimaryText = "";
        [ObservableProperty] private string _metaAdCta = "Order Now";
        [ObservableProperty] private string _whatsAppPreviewText = "";

        // ══════════════════════════════════════════════════════════════════════
        // 4. TASK MANAGER (KANBAN 4-COLUMNS)
        // ══════════════════════════════════════════════════════════════════════
        [ObservableProperty] private ObservableCollection<ProjectStatusItem> _allTasks = new();
        [ObservableProperty] private ObservableCollection<ProjectStatusItem> _backlogTasks = new();
        [ObservableProperty] private ObservableCollection<ProjectStatusItem> _inProgressTasks = new();
        [ObservableProperty] private ObservableCollection<ProjectStatusItem> _reviewTasks = new();
        [ObservableProperty] private ObservableCollection<ProjectStatusItem> _doneTasks = new();
        [ObservableProperty] private int _metricTotalTasks = 0;
        [ObservableProperty] private int _metricInProgressTasks = 0;
        [ObservableProperty] private int _metricReviewTasks = 0;
        [ObservableProperty] private int _metricUrgentTasks = 0;
        [ObservableProperty] private int _metricDoneTasks = 0;
        [ObservableProperty] private string _taskSearchQuery = "";
        [ObservableProperty] private string _selectedDesignerFilter = "All Designers";
        [ObservableProperty] private ObservableCollection<string> _designerFilterOptions = new() { "All Designers", "Harussani", "Adam", "Sarah", "Afif", "Syahmi" };

        // ══════════════════════════════════════════════════════════════════════
        // 5. BRAND ASSETS VAULT & MULTI-FORMAT TOKEN INSPECTOR
        // ══════════════════════════════════════════════════════════════════════
        [ObservableProperty] private ObservableCollection<ColorTokenItem> _primaryPalette = new(BrandAssetsService.GetPrimaryPalette());
        [ObservableProperty] private ObservableCollection<SubBrandPalette> _subBrandPalettes = new(BrandAssetsService.GetSubBrandPalettes());
        [ObservableProperty] private ColorTokenItem? _inspectedColorToken;
        [ObservableProperty] private string _copyNotificationText = "Click any color swatch to inspect multi-format values (HEX, RGB, CMYK, RAL, Pantone, Token) or copy to clipboard.";
        [ObservableProperty] private bool _isCopyNotificationVisible = true;

        // ══════════════════════════════════════════════════════════════════════
        // 6. SEARCH & COPY / DELIVERABLES & DAM
        // ══════════════════════════════════════════════════════════════════════
        [ObservableProperty] private string _searchCopyQuery = "";
        [ObservableProperty] private ObservableCollection<ProjectStatusItem> _filteredSearchProjects = new();

        // ══════════════════════════════════════════════════════════════════════
        // 7. BIG CALENDAR & HOLIDAYS
        // ══════════════════════════════════════════════════════════════════════
        [ObservableProperty] private DateTime _calendarCurrentMonth = DateTime.Today;
        [ObservableProperty] private string _calendarMonthYearHeader = "";
        [ObservableProperty] private ObservableCollection<CalendarWeekRow> _calendarWeeks = new();
        [ObservableProperty] private ObservableCollection<MalaysiaHolidayItem> _monthlyHolidays = new();

        // ══════════════════════════════════════════════════════════════════════
        // 8. QUICK NOTES
        // ══════════════════════════════════════════════════════════════════════
        [ObservableProperty] private ObservableCollection<QuickNoteItem> _notes = new();
        [ObservableProperty] private QuickNoteItem? _selectedNote;
        [ObservableProperty] private string _noteEditorTitle = "";
        [ObservableProperty] private string _noteEditorContent = "";
        [ObservableProperty] private string _noteEditorCategory = "General";

        // ══════════════════════════════════════════════════════════════════════
        // 9. CREATIVE WELLBEING & BOX BREATHING
        // ══════════════════════════════════════════════════════════════════════
        [ObservableProperty] private string _breathingPhaseText = "Ready — Press Start to Begin";
        [ObservableProperty] private string _breathingInstruction = "Inhale (4s) → Hold (4s) → Exhale (4s) → Hold (4s)";
        [ObservableProperty] private int _breathingCountdown = 4;
        [ObservableProperty] private double _breathingCircleScale = 1.0;
        [ObservableProperty] private bool _isBreathingActive = false;
        [ObservableProperty] private string _breathingButtonText = "▶ Start 16s Box Breathing";
        [ObservableProperty] private int _hydrationGlasses = 4;
        [ObservableProperty] private int _hydrationGoal = 8;
        [ObservableProperty] private string _hydrationProgressText = "4 / 8 Glasses Logged";
        [ObservableProperty] private string _ergonomicTimerText = "45m until next posture reset";

        // ══════════════════════════════════════════════════════════════════════
        // 10. WAKTU SOLAT
        // ══════════════════════════════════════════════════════════════════════
        [ObservableProperty] private ObservableCollection<PrayerTimeRow> _prayerTimes = new();
        [ObservableProperty] private string _nextPrayerName = "Zohor";
        [ObservableProperty] private string _nextPrayerTime = "13:18";
        [ObservableProperty] private string _nextPrayerCountdown = "in 2h 45m";
        [ObservableProperty] private string _hijriDateString = "1448 Hijri";
        [ObservableProperty] private string _selectedPrayerZone = "WLY01 - Kuala Lumpur, Putrajaya";
        [ObservableProperty] private ObservableCollection<string> _prayerZones = new()
        {
            "WLY01 - Kuala Lumpur, Putrajaya",
            "SGR01 - Shah Alam, Petaling, Klang",
            "JHR02 - Johor Bahru, Kota Tinggi",
            "PNG01 - Pulau Pinang",
            "PRK02 - Ipoh, Batu Gajah, Kampar"
        };

        // ══════════════════════════════════════════════════════════════════════
        // 11. FOCUS RADIO PLAYER
        // ══════════════════════════════════════════════════════════════════════
        [ObservableProperty] private ObservableCollection<RadioStationItem> _radioStations = new();
        [ObservableProperty] private RadioStationItem? _selectedStation;
        [ObservableProperty] private string _currentStationName = "BFM 89.9 (The Business Station)";
        [ObservableProperty] private bool _isRadioPlaying = false;
        [ObservableProperty] private string _radioPlayIcon = "▶";
        [ObservableProperty] private double _radioVolume = 0.8;

        // ══════════════════════════════════════════════════════════════════════
        // 12. QR CODE STUDIO
        // ══════════════════════════════════════════════════════════════════════
        [ObservableProperty] private string _qrText = "https://suamisihat.com.my";
        [ObservableProperty] private string _qrFgColor = "#022057";
        [ObservableProperty] private string _qrBgColor = "#FFFFFF";
        [ObservableProperty] private int _qrPixelsPerModule = 15;
        [ObservableProperty] private Bitmap? _qrBitmap;
        [ObservableProperty] private string _qrStatusText = "Ready to generate";

        // ══════════════════════════════════════════════════════════════════════
        // 13. WORKSTATION HEALTH DIAGNOSTICS
        // ══════════════════════════════════════════════════════════════════════
        [ObservableProperty] private string _cpuInfo = "Scanning...";
        [ObservableProperty] private string _ramInfo = "Scanning...";
        [ObservableProperty] private string _diskRootInfo = "Scanning...";
        [ObservableProperty] private string _diskHomeInfo = "Scanning...";
        [ObservableProperty] private string _kernelInfo = "Linux";
        [ObservableProperty] private string _nasPingStatus = "NAS Latency: Checking...";
        [ObservableProperty] private ObservableCollection<SoftwareCheckItem> _softwareChecks = new();

        // ══════════════════════════════════════════════════════════════════════
        // 14. SETTINGS & PREFERENCES
        // ══════════════════════════════════════════════════════════════════════
        [ObservableProperty] private string _synologyDrivePath = "";
        [ObservableProperty] private string _selectedTheme = "SS Default (Deep Navy / Azure)";
        [ObservableProperty] private ObservableCollection<string> _themes = new()
        {
            "SS Default (Deep Navy / Azure)",
            "Falconia (Charcoal / Gold)",
            "Metamorphosis (OLED Dark / Emerald)",
            "Rose Pine (Rosé / Iris)",
            "Nord (Polar Night / Frost)",
            "Catppuccin (Mocha / Lavender)"
        };

        // ── Cache of Views ───────────────────────────────────────────────────
        private readonly Dictionary<string, object> _viewCache = new();
        private System.Threading.Timer? _breathingTimer;
        private int _breathingPhaseIndex = 0; // 0=Inhale, 1=Hold, 2=Exhale, 3=Hold
        private int _breathingSecondsRemaining = 4;

        public MainViewModel()
        {
            // Initialise default paths
            string home = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            SynologyDrivePath = Path.Combine(home, "SynologyDrive", "Creative-Team");

            // Setup radio stations (Latest Official SS-CAM Desktop v4.6.0 Presets)
            RadioStations = new ObservableCollection<RadioStationItem>
            {
                new() { Name = "SuamiSihat Radio", StreamUrl = "https://dj.suamisihat.myds.me/listen/suamisihat-radio/radio.mp3", Genre = "Health / Lifestyle (Official)", AccentColor = "#043388", Bitrate = "192 kbps" },
                new() { Name = "Initial D World Radio Broadcast", StreamUrl = "http://165.227.19.100:9001/listen.aac", Genre = "Eurobeat / High Energy", AccentColor = "#DC2626", Bitrate = "128 kbps" },
                new() { Name = "BABYMETAL & J-Rock Radio", StreamUrl = "https://animefm.stream.laut.fm/animefm", Genre = "J-Rock / Kawaii Metal", AccentColor = "#E11D48", Bitrate = "128 kbps" },
                new() { Name = "BFM 89.9 The Business Station", StreamUrl = "https://stream.rcs.revma.com/s91qy9p0zs3vv", Genre = "News, Business & Interviews", AccentColor = "#F59E0B", Bitrate = "128 kbps" },
                new() { Name = "Lo-Fi Focus Beats (BigFM)", StreamUrl = "https://stream.bigfm.de/lofifocus/mp3-128/radiobrowser", Genre = "Lo-Fi & Study Beats", AccentColor = "#8B5CF6", Bitrate = "128 kbps" },
                new() { Name = "Nightwave Plaza (Vaporwave)", StreamUrl = "https://radio.plaza.one/mp3", Genre = "Synthwave / Vaporwave", AccentColor = "#EC4899", Bitrate = "128 kbps" },
                new() { Name = "SomaFM: Groove Salad", StreamUrl = "https://ice6.somafm.com/groovesalad-256-mp3", Genre = "Downtempo & Ambient Chill", AccentColor = "#10B981", Bitrate = "256 kbps" },
                new() { Name = "Chillhop Lounge", StreamUrl = "https://stream.laut.fm/lofi", Genre = "Smooth Lo-Fi Chillhop", AccentColor = "#06B6D4", Bitrate = "128 kbps" },
                new() { Name = "Smooth Jazz Workstation", StreamUrl = "https://0nlineradio.radioho.st/0r-jazz?ref=radio-browser", Genre = "Instrumental Jazz", AccentColor = "#D97706", Bitrate = "128 kbps" }
            };
            SelectedStation = RadioStations[0];

            // Initialise Project Creator
            SelectedCategoryPreset = CategoryPresets[0];
            SelectedPlatformPreset = PlatformPresets[0];
            UpdateProjectCreatorPreviews();

            // Load Wellbeing Stats
            var wb = WellbeingDataService.LoadState();
            HydrationGlasses = wb.HydrationGlasses;
            HydrationGoal = wb.DailyHydrationGoal;
            UpdateHydrationText();

            // Initialise Notes
            Notes = new ObservableCollection<QuickNoteItem>(QuickNoteService.LoadNotes());
            if (Notes.Count > 0) SelectNote(Notes[0]);

            // Initialise Calendar
            UpdateCalendarView();

            // Generate initial QR
            GenerateQr();

            // Initialise Clock & Background timers
            StartLiveClock();

            // Run initial data scans in background
            Task.Run(async () =>
            {
                await LoadProjectsAsync();
                await LoadPrayerTimesAsync();
                await RescanHealthAsync();
            });

            // Start on Dashboard
            NavigateTo("Dashboard");
        }

        // ══════════════════════════════════════════════════════════════════════
        // NAVIGATION CONTROLLER
        // ══════════════════════════════════════════════════════════════════════
        [RelayCommand]
        public void SelectTab(string tabName)
        {
            NavigateTo(tabName);
        }

        public void NavigateTo(string tabName)
        {
            CurrentTabName = tabName;
            ResetNavHighlights();

            switch (tabName)
            {
                case "Dashboard":
                    NavBgDashboard = "#043388"; NavFgDashboard = "#FFFFFF";
                    CurrentPage = GetOrCreateView("Dashboard", () => new DashboardView { DataContext = this });
                    break;
                case "Project Creator":
                    NavBgProjectCreator = "#043388"; NavFgProjectCreator = "#FFFFFF";
                    CurrentPage = GetOrCreateView("Project Creator", () => new ProjectCreatorView { DataContext = this });
                    break;
                case "Search & Copy":
                    NavBgSearchCopy = "#043388"; NavFgSearchCopy = "#FFFFFF";
                    CurrentPage = GetOrCreateView("Search & Copy", () => new SearchCopyView { DataContext = this });
                    break;
                case "Copywriting":
                    NavBgCopywriting = "#043388"; NavFgCopywriting = "#FFFFFF";
                    CurrentPage = GetOrCreateView("Copywriting", () => new CopywritingView { DataContext = this });
                    break;
                case "Brand Assets":
                    NavBgBrandAssets = "#043388"; NavFgBrandAssets = "#FFFFFF";
                    CurrentPage = GetOrCreateView("Brand Assets", () => new BrandAssetsView { DataContext = this });
                    break;
                case "Deliverables":
                case "Deliverables & DAM":
                    NavBgDeliverables = "#043388"; NavFgDeliverables = "#FFFFFF";
                    CurrentPage = GetOrCreateView("Deliverables", () => new DeliverablesView { DataContext = this });
                    break;
                case "Task Manager":
                    NavBgTaskManager = "#043388"; NavFgTaskManager = "#FFFFFF";
                    CurrentPage = GetOrCreateView("Task Manager", () => new TaskManagerView { DataContext = this });
                    break;
                case "Big Calendar":
                    NavBgCalendar = "#043388"; NavFgCalendar = "#FFFFFF";
                    CurrentPage = GetOrCreateView("Big Calendar", () => new CalendarView { DataContext = this });
                    break;
                case "Quick Notes":
                    NavBgQuickNote = "#043388"; NavFgQuickNote = "#FFFFFF";
                    CurrentPage = GetOrCreateView("Quick Notes", () => new QuickNoteView { DataContext = this });
                    break;
                case "Wellbeing":
                    NavBgWellbeing = "#043388"; NavFgWellbeing = "#FFFFFF";
                    CurrentPage = GetOrCreateView("Wellbeing", () => new WellbeingView { DataContext = this });
                    break;
                case "Waktu Solat":
                    NavBgWaktuSolat = "#043388"; NavFgWaktuSolat = "#FFFFFF";
                    CurrentPage = GetOrCreateView("Waktu Solat", () => new WaktuSolatView { DataContext = this });
                    break;
                case "Radio Player":
                case "Focus Radio Player":
                    NavBgRadio = "#043388"; NavFgRadio = "#FFFFFF";
                    CurrentPage = GetOrCreateView("Radio Player", () => new FocusRadioView { DataContext = this });
                    break;
                case "QR Code":
                case "QR Code Studio":
                    NavBgQrCode = "#043388"; NavFgQrCode = "#FFFFFF";
                    CurrentPage = GetOrCreateView("QR Code", () => new QrCodeView { DataContext = this });
                    break;
                case "Workstation Health":
                    NavBgWorkstation = "#043388"; NavFgWorkstation = "#FFFFFF";
                    CurrentPage = GetOrCreateView("Workstation Health", () => new WorkstationHealthView { DataContext = this });
                    break;
                case "Settings":
                case "Settings & Vault":
                    NavBgSettings = "#043388"; NavFgSettings = "#FFFFFF";
                    CurrentPage = GetOrCreateView("Settings", () => new SettingsView { DataContext = this });
                    break;
                default:
                    CurrentPage = GetOrCreateView("Dashboard", () => new DashboardView { DataContext = this });
                    break;
            }

            StatusMessage = $"Navigated to {tabName} — {DateTime.Now:HH:mm:ss}";
        }

        private object GetOrCreateView(string key, Func<object> factory)
        {
            if (!_viewCache.TryGetValue(key, out var view))
            {
                view = factory();
                _viewCache[key] = view;
            }
            return view;
        }

        private void ResetNavHighlights()
        {
            NavBgDashboard = NavBgProjectCreator = NavBgSearchCopy = NavBgCopywriting =
            NavBgBrandAssets = NavBgDeliverables = NavBgTaskManager = NavBgCalendar =
            NavBgQuickNote = NavBgWellbeing = NavBgWaktuSolat = NavBgRadio =
            NavBgQrCode = NavBgWorkstation = NavBgSettings = "Transparent";

            NavFgDashboard = NavFgProjectCreator = NavFgSearchCopy = NavFgCopywriting =
            NavFgBrandAssets = NavFgDeliverables = NavFgTaskManager = NavFgCalendar =
            NavFgQuickNote = NavFgWellbeing = NavFgWaktuSolat = NavFgRadio =
            NavFgQrCode = NavFgWorkstation = NavFgSettings = "#94A3B8";
        }

        // ══════════════════════════════════════════════════════════════════════
        // WORKSPACE SCANNING & TELEMETRY
        // ══════════════════════════════════════════════════════════════════════
        [RelayCommand]
        public async Task LoadProjectsAsync()
        {
            StatusMessage = "Scanning workspace vault...";
            var snapshot = await WorkspaceScanner.ScanAsync(SynologyDrivePath);

            TotalProjects = snapshot.TotalProjects;
            ActiveWipProjects = snapshot.ActiveWIP;
            LatestProjectName = snapshot.LatestProject;
            TotalStorageSize = snapshot.StorageSizeFormatted;
            ThisMonthOutput = snapshot.ThisMonth;
            MonthComparisonText = snapshot.MonthComparisonText;
            LargestProjectSize = snapshot.LargestProjectSize;
            LargestProjectName = snapshot.LargestProjectName;
            StaleProjectsCount = snapshot.StaleProjects;
            CreativeTeamFlowText = snapshot.FlowSummaryText;

            RecentProjects.Clear();
            foreach (var p in snapshot.RecentProjects) RecentProjects.Add(p);

            DesignerCapacities.Clear();
            foreach (var d in snapshot.DesignerCapacities) DesignerCapacities.Add(d);

            // Populate all tasks for Kanban
            var tasks = new List<ProjectStatusItem>();
            foreach (var rp in snapshot.RecentProjects)
            {
                tasks.Add(new ProjectStatusItem
                {
                    Project = rp.Project,
                    FullPath = rp.FullPath,
                    Designer = rp.Designer,
                    CreatedDate = DateTime.Now.ToString("yyyy-MM-dd"),
                    Status = "in-progress",
                    Priority = "medium",
                    Deadline = DateTime.Now.AddDays(3).ToString("yyyy-MM-dd")
                });
            }

            // Add demo mock tasks if scan is empty
            if (tasks.Count == 0)
            {
                tasks = GetDefaultKanbanTasks();
            }

            AllTasks = new ObservableCollection<ProjectStatusItem>(tasks);
            WorkspaceProjects = new ObservableCollection<ProjectStatusItem>(tasks);
            if (WorkspaceProjects.Count > 0 && SelectedCopyProject == null)
            {
                SelectedCopyProject = WorkspaceProjects[0];
                LoadSelectedCopyProject();
            }

            FilterKanbanTasks();
            FilterSearchProjects();

            StatusMessage = $"Workspace indexed: {TotalProjects} projects found.";
        }

        // ══════════════════════════════════════════════════════════════════════
        // PROJECT CREATOR LOGIC
        // ══════════════════════════════════════════════════════════════════════
        partial void OnSelectedYearChanged(string value) => UpdateProjectCreatorPreviews();
        partial void OnSelectedSubBrandChanged(string value) => UpdateProjectCreatorPreviews();
        partial void OnProjectIdSuffixChanged(string value) => UpdateProjectCreatorPreviews();
        partial void OnProjectTitleChanged(string value) => UpdateProjectCreatorPreviews();
        partial void OnSelectedCategoryPresetChanged(CategoryPreset? value)
        {
            if (value != null)
            {
                SlaTargetDays = value.SlaDays;
                var deadline = MalaysiaHolidayService.CalculateWorkingDaysDeadline(DateTime.Today, value.SlaDays);
                SlaDeadlineDisplay = $"SLA Target: {value.SlaDays} Days • Due: {deadline:yyyy-MM-dd}";
            }
            UpdateProjectCreatorPreviews();
        }

        [RelayCommand]
        public void SelectPlatform(string key)
        {
            var p = PlatformPresets.FirstOrDefault(x => x.Key == key);
            if (p != null) SelectedPlatformPreset = p;
        }

        [RelayCommand]
        public void InsertMarkdown(string snippet)
        {
            ProjectBriefMarkdown += snippet;
        }

        private void UpdateProjectCreatorPreviews()
        {
            string cleanBrand = "SSH";
            var m = Regex.Match(SelectedSubBrand ?? "", @"^([A-Z]{2,4})");
            if (m.Success) cleanBrand = m.Groups[1].Value;

            string cleanYear = SelectedYear ?? DateTime.Now.ToString("yyyy");
            string curMonth = DateTime.Now.ToString("MM");
            string curMonthName = DateTime.Now.ToString("MMMM");
            string dateCode = $"{cleanYear}{curMonth}";
            string cleanSuffix = string.IsNullOrWhiteSpace(ProjectIdSuffix) ? "0001D" : ProjectIdSuffix.Trim();
            string cleanTitle = string.IsNullOrWhiteSpace(ProjectTitle) ? "untitled" : Regex.Replace(ProjectTitle.Trim(), @"[^a-zA-Z0-9\-_]", "_");

            string folderName = $"{dateCode}_{cleanSuffix}_{cleanBrand}_{cleanTitle}";
            PreviewFolderPath = Path.Combine(SynologyDrivePath, $"SS-{cleanYear}", $"{cleanYear}{curMonth}_{curMonthName}", folderName);

            PreviewYamlFrontmatter = 
$@"project_id: {dateCode}_{cleanSuffix}_{cleanBrand}
title: ""{ProjectTitle}""
sub_brand: {cleanBrand}
designer: {SelectedDesigner}
created_date: {DateTime.Now:yyyy-MM-dd}
category: {SelectedCategoryPreset?.Name ?? "Graphic Design"}
status: in-progress
priority: medium
";

            PreviewCopyMarkdown = CopywritingDesktopService.GetDefaultTemplate(ProjectTitle);
        }

        [RelayCommand]
        public void GenerateProject()
        {
            try
            {
                var generator = new ProjectGeneratorService();
                string createdPath = generator.GenerateProjectFolder(
                    SynologyDrivePath,
                    ProjectTitle,
                    SelectedSubBrand,
                    SelectedYear,
                    ProjectIdSuffix,
                    SelectedCategoryPreset?.Name ?? "Graphic Design",
                    null,
                    ProjectBriefMarkdown,
                    SelectedDesigner
                );

                StatusMessage = $"✔ Project generated at: {createdPath}";
                // Refresh workspace in background
                _ = LoadProjectsAsync();
            }
            catch (Exception ex)
            {
                StatusMessage = $"[-] Project creation failed: {ex.Message}";
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // COPYWRITING STUDIO
        // ══════════════════════════════════════════════════════════════════════
        partial void OnSelectedCopyProjectChanged(ProjectStatusItem? value)
        {
            LoadSelectedCopyProject();
        }

        partial void OnCopyContentChanged(string value)
        {
            UpdateCopyMetrics();
        }

        private void LoadSelectedCopyProject()
        {
            if (SelectedCopyProject == null)
            {
                CopyContent = CopywritingDesktopService.GetDefaultTemplate("Sample Campaign");
                CopyFilePath = "No active project folder";
                CopySaveStatus = "Ready";
                return;
            }

            CopyFilePath = CopywritingDesktopService.GetCopyFilePath(SelectedCopyProject.FullPath) ?? "COPY.md";
            CopyContent = CopywritingDesktopService.LoadCopywriting(SelectedCopyProject.FullPath, SelectedCopyProject.Project);
            CopySaveStatus = "Loaded";
        }

        private void UpdateCopyMetrics()
        {
            var m = CopywritingDesktopService.ComputeMetrics(CopyContent);
            CopyWordCount = m.words;
            CopyReadTimeMinutes = m.readTimeMinutes;
            CopyEmojiCount = m.emojis;
            MetaAdHeadline = m.headline;
            MetaAdPrimaryText = m.primaryText;
            MetaAdCta = m.cta;
            WhatsAppPreviewText = m.primaryText;
        }

        [RelayCommand]
        public void SaveCopyScript()
        {
            if (SelectedCopyProject != null)
            {
                bool ok = CopywritingDesktopService.SaveCopywriting(SelectedCopyProject.FullPath, CopyContent);
                CopySaveStatus = ok ? "Saved to NAS" : "Save Error";
                StatusMessage = ok ? "✔ COPY.md saved to Synology vault." : "[-] Failed to save COPY.md";
            }
        }

        [RelayCommand]
        public async Task CopyPlainTextAsync()
        {
            string plain = CopywritingDesktopService.FormatPlainTextForAd(CopyContent);
            await ClipboardService.SetTextAsync(plain);
            StatusMessage = "✔ Clean plain text copied to clipboard.";
        }

        [RelayCommand]
        public async Task CopyMarkdownScriptAsync()
        {
            await ClipboardService.SetTextAsync(CopyContent);
            StatusMessage = "✔ Full Markdown script copied to clipboard.";
        }

        // ══════════════════════════════════════════════════════════════════════
        // TASK MANAGER & KANBAN
        // ══════════════════════════════════════════════════════════════════════
        partial void OnTaskSearchQueryChanged(string value) => FilterKanbanTasks();
        partial void OnSelectedDesignerFilterChanged(string value) => FilterKanbanTasks();

        [RelayCommand]
        public void StartTask(ProjectStatusItem task)
        {
            if (task != null)
            {
                task.Status = "in-progress";
                FilterKanbanTasks();
                StatusMessage = $"Task '{task.Project}' moved to In Progress.";
            }
        }

        [RelayCommand]
        public void ReviewTask(ProjectStatusItem task)
        {
            if (task != null)
            {
                task.Status = "review";
                FilterKanbanTasks();
                StatusMessage = $"Task '{task.Project}' moved to In Review.";
            }
        }

        [RelayCommand]
        public void ApproveTask(ProjectStatusItem task)
        {
            if (task != null)
            {
                task.Status = "done";
                FilterKanbanTasks();
                StatusMessage = $"Task '{task.Project}' marked as Completed.";
            }
        }

        [RelayCommand]
        public void BacklogTask(ProjectStatusItem task)
        {
            if (task != null)
            {
                task.Status = "backlog";
                FilterKanbanTasks();
                StatusMessage = $"Task '{task.Project}' moved to Backlog.";
            }
        }

        private void FilterKanbanTasks()
        {
            var query = TaskSearchQuery?.Trim().ToLowerInvariant() ?? "";
            var designer = SelectedDesignerFilter;

            var filtered = AllTasks.Where(t =>
            {
                bool matchQuery = string.IsNullOrWhiteSpace(query) ||
                    t.Project.ToLowerInvariant().Contains(query) ||
                    t.Designer.ToLowerInvariant().Contains(query);

                bool matchDesigner = designer == "All Designers" ||
                    string.Equals(t.Designer, designer, StringComparison.OrdinalIgnoreCase);

                return matchQuery && matchDesigner;
            }).ToList();

            BacklogTasks = new ObservableCollection<ProjectStatusItem>(filtered.Where(t => t.Status == "backlog"));
            InProgressTasks = new ObservableCollection<ProjectStatusItem>(filtered.Where(t => t.Status == "in-progress"));
            ReviewTasks = new ObservableCollection<ProjectStatusItem>(filtered.Where(t => t.Status == "review" || t.Status == "revision"));
            DoneTasks = new ObservableCollection<ProjectStatusItem>(filtered.Where(t => t.Status == "done"));

            MetricTotalTasks = filtered.Count;
            MetricInProgressTasks = InProgressTasks.Count;
            MetricReviewTasks = ReviewTasks.Count;
            MetricDoneTasks = DoneTasks.Count;
            MetricUrgentTasks = filtered.Count(t => t.Priority == "urgent");
        }

        private List<ProjectStatusItem> GetDefaultKanbanTasks()
        {
            return new List<ProjectStatusItem>
            {
                new() { Project = "202609_0001D_SSH_Brand_Identity_Master", Designer = "Harussani", Status = "in-progress", Priority = "urgent", Deadline = DateTime.Today.AddDays(2).ToString("yyyy-MM-dd"), CreatedDate = DateTime.Today.AddDays(-1).ToString("yyyy-MM-dd") },
                new() { Project = "202609_0002S_SSC_Kopi_Tongkat_Ali_MetaAds", Designer = "Adam", Status = "in-progress", Priority = "high", Deadline = DateTime.Today.AddDays(3).ToString("yyyy-MM-dd"), CreatedDate = DateTime.Today.AddDays(-2).ToString("yyyy-MM-dd") },
                new() { Project = "202609_0003V_SSW_Testimonial_Reels_Video", Designer = "Sarah", Status = "review", Priority = "medium", Deadline = DateTime.Today.AddDays(4).ToString("yyyy-MM-dd"), CreatedDate = DateTime.Today.AddDays(-5).ToString("yyyy-MM-dd") },
                new() { Project = "202609_0004P_SSE_Shopee_Product_Hero_Banner", Designer = "Afif", Status = "backlog", Priority = "low", Deadline = DateTime.Today.AddDays(7).ToString("yyyy-MM-dd"), CreatedDate = DateTime.Today.AddDays(-3).ToString("yyyy-MM-dd") },
                new() { Project = "202608_0012D_SST_DAM_Web_Portal_Dashboard", Designer = "Harussani", Status = "done", Priority = "medium", Deadline = DateTime.Today.AddDays(-2).ToString("yyyy-MM-dd"), CreatedDate = DateTime.Today.AddDays(-10).ToString("yyyy-MM-dd") }
            };
        }

        // ══════════════════════════════════════════════════════════════════════
        // BRAND ASSETS TOKEN INSPECTOR & CLICK-TO-COPY
        // ══════════════════════════════════════════════════════════════════════
        [RelayCommand]
        public async Task InspectAndCopyTokenAsync(ColorTokenItem token)
        {
            if (token == null) return;
            InspectedColorToken = token;

            await ClipboardService.SetTextAsync(token.Hex);

            CopyNotificationText = $"✔ Copied {token.Name} ({token.Hex}) to clipboard! RGB: {token.Rgb} • CMYK: {token.Cmyk} • {token.Pantone}";
            IsCopyNotificationVisible = true;
            StatusMessage = $"Copied: {token.Hex} ({token.Name})";
        }

        [RelayCommand]
        public async Task CopySpecificValueAsync(string value)
        {
            if (string.IsNullOrWhiteSpace(value)) return;
            await ClipboardService.SetTextAsync(value);
            CopyNotificationText = $"✔ Copied to clipboard: {value}";
            StatusMessage = $"Copied: {value}";
        }

        // ══════════════════════════════════════════════════════════════════════
        // SEARCH & COPY / DELIVERABLES
        // ══════════════════════════════════════════════════════════════════════
        partial void OnSearchCopyQueryChanged(string value) => FilterSearchProjects();

        private void FilterSearchProjects()
        {
            string q = SearchCopyQuery?.Trim().ToLowerInvariant() ?? "";
            if (string.IsNullOrWhiteSpace(q))
            {
                FilteredSearchProjects = new ObservableCollection<ProjectStatusItem>(WorkspaceProjects);
            }
            else
            {
                FilteredSearchProjects = new ObservableCollection<ProjectStatusItem>(
                    WorkspaceProjects.Where(p => p.Project.ToLowerInvariant().Contains(q) || p.Designer.ToLowerInvariant().Contains(q)));
            }
        }

        [RelayCommand]
        public void OpenProjectFolder(string? path)
        {
            if (string.IsNullOrWhiteSpace(path)) path = SynologyDrivePath;
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
                }
            }
            catch { }
        }

        // ══════════════════════════════════════════════════════════════════════
        // BIG CALENDAR & HOLIDAYS
        // ══════════════════════════════════════════════════════════════════════
        [RelayCommand] public void NextMonth() { CalendarCurrentMonth = CalendarCurrentMonth.AddMonths(1); UpdateCalendarView(); }
        [RelayCommand] public void PrevMonth() { CalendarCurrentMonth = CalendarCurrentMonth.AddMonths(-1); UpdateCalendarView(); }
        [RelayCommand] public void TodayCalendar() { CalendarCurrentMonth = DateTime.Today; UpdateCalendarView(); }

        private void UpdateCalendarView()
        {
            CalendarMonthYearHeader = CalendarCurrentMonth.ToString("MMMM yyyy");
            MonthlyHolidays = new ObservableCollection<MalaysiaHolidayItem>(
                MalaysiaHolidayService.GetHolidaysForMonth(CalendarCurrentMonth.Year, CalendarCurrentMonth.Month));

            var firstDay = new DateTime(CalendarCurrentMonth.Year, CalendarCurrentMonth.Month, 1);
            int daysInMonth = DateTime.DaysInMonth(CalendarCurrentMonth.Year, CalendarCurrentMonth.Month);
            int startOffset = (int)firstDay.DayOfWeek; // 0=Sunday

            var weeks = new List<CalendarWeekRow>();
            var currentWeek = new CalendarWeekRow();
            int cellCount = 0;

            // Previous month trailing days
            var prevMonth = firstDay.AddMonths(-1);
            int prevMonthDays = DateTime.DaysInMonth(prevMonth.Year, prevMonth.Month);
            for (int i = startOffset - 1; i >= 0; i--)
            {
                currentWeek.Days.Add(new CalendarDay { DayNumber = prevMonthDays - i, IsCurrentMonth = false });
                cellCount++;
            }

            // Current month days
            for (int day = 1; day <= daysInMonth; day++)
            {
                var dt = new DateTime(CalendarCurrentMonth.Year, CalendarCurrentMonth.Month, day);
                bool isToday = dt.Date == DateTime.Today;
                bool isHoliday = MalaysiaHolidayService.IsHoliday(dt, out var hol);

                currentWeek.Days.Add(new CalendarDay
                {
                    DayNumber = day,
                    IsCurrentMonth = true,
                    IsToday = isToday,
                    HolidayName = hol?.ShortName ?? "",
                    HasHoliday = isHoliday
                });

                cellCount++;
                if (cellCount % 7 == 0)
                {
                    weeks.Add(currentWeek);
                    currentWeek = new CalendarWeekRow();
                }
            }

            // Next month leading days
            int nextDay = 1;
            while (cellCount % 7 != 0 || weeks.Count < 5)
            {
                currentWeek.Days.Add(new CalendarDay { DayNumber = nextDay++, IsCurrentMonth = false });
                cellCount++;
                if (cellCount % 7 == 0)
                {
                    weeks.Add(currentWeek);
                    currentWeek = new CalendarWeekRow();
                }
            }

            CalendarWeeks = new ObservableCollection<CalendarWeekRow>(weeks);
        }

        // ══════════════════════════════════════════════════════════════════════
        // QUICK NOTES
        // ══════════════════════════════════════════════════════════════════════
        [RelayCommand]
        public void SelectNote(QuickNoteItem note)
        {
            SelectedNote = note;
            if (note != null)
            {
                NoteEditorTitle = note.Title;
                NoteEditorContent = note.Content;
                NoteEditorCategory = note.Category;
            }
        }

        [RelayCommand]
        public void NewNote()
        {
            var note = new QuickNoteItem
            {
                Title = "Untitled Note",
                Content = "",
                Category = "General",
                CreatedDate = DateTime.Now.ToString("yyyy-MM-dd HH:mm")
            };
            Notes.Insert(0, note);
            SelectNote(note);
            SaveNotes();
        }

        [RelayCommand]
        public void DeleteNote()
        {
            if (SelectedNote != null)
            {
                Notes.Remove(SelectedNote);
                SelectedNote = Notes.FirstOrDefault();
                SelectNote(SelectedNote!);
                SaveNotes();
            }
        }

        [RelayCommand]
        public void SaveCurrentNote()
        {
            if (SelectedNote != null)
            {
                SelectedNote.Title = NoteEditorTitle;
                SelectedNote.Content = NoteEditorContent;
                SelectedNote.Category = NoteEditorCategory;
                SaveNotes();
                StatusMessage = "✔ Note saved.";
            }
        }

        private void SaveNotes()
        {
            QuickNoteService.SaveNotes(Notes.ToList());
        }

        // ══════════════════════════════════════════════════════════════════════
        // CREATIVE WELLBEING & BOX BREATHING STATE MACHINE
        // ══════════════════════════════════════════════════════════════════════
        [RelayCommand]
        public void ToggleBreathing()
        {
            if (IsBreathingActive)
            {
                _breathingTimer?.Dispose();
                _breathingTimer = null;
                IsBreathingActive = false;
                BreathingButtonText = "▶ Start 16s Box Breathing";
                BreathingPhaseText = "Paused — Press Start to Resume";
                BreathingCircleScale = 1.0;
            }
            else
            {
                IsBreathingActive = true;
                BreathingButtonText = "⏸ Pause Breathing Coach";
                _breathingPhaseIndex = 0;
                _breathingSecondsRemaining = 4;
                UpdateBreathingPhaseDisplay();

                _breathingTimer = new System.Threading.Timer(_ =>
                {
                    _breathingSecondsRemaining--;
                    if (_breathingSecondsRemaining <= 0)
                    {
                        _breathingPhaseIndex = (_breathingPhaseIndex + 1) % 4;
                        _breathingSecondsRemaining = 4;
                    }
                    Avalonia.Threading.Dispatcher.UIThread.Post(UpdateBreathingPhaseDisplay);
                }, null, 1000, 1000);
            }
        }

        private void UpdateBreathingPhaseDisplay()
        {
            BreathingCountdown = _breathingSecondsRemaining;
            switch (_breathingPhaseIndex)
            {
                case 0:
                    BreathingPhaseText = "🌬️ INHALE DEEPLY...";
                    BreathingInstruction = "Fill your lungs with creative energy";
                    BreathingCircleScale = 1.0 + (4 - _breathingSecondsRemaining) * 0.12;
                    break;
                case 1:
                    BreathingPhaseText = "⏸️ HOLD BREATH...";
                    BreathingInstruction = "Stay centered and maintain calm stillness";
                    BreathingCircleScale = 1.48;
                    break;
                case 2:
                    BreathingPhaseText = "💨 EXHALE SLOWLY...";
                    BreathingInstruction = "Release stress, tension, and fatigue";
                    BreathingCircleScale = 1.48 - (4 - _breathingSecondsRemaining) * 0.12;
                    break;
                case 3:
                    BreathingPhaseText = "✨ REST & HOLD...";
                    BreathingInstruction = "Empty stillness before next cycle";
                    BreathingCircleScale = 1.0;
                    break;
            }
        }

        [RelayCommand]
        public void AddWater()
        {
            HydrationGlasses = Math.Min(12, HydrationGlasses + 1);
            UpdateHydrationText();
            WellbeingDataService.SaveState(new WellbeingDataService.WellbeingState { HydrationGlasses = HydrationGlasses, DailyHydrationGoal = HydrationGoal });
        }

        [RelayCommand]
        public void ResetWater()
        {
            HydrationGlasses = 0;
            UpdateHydrationText();
            WellbeingDataService.SaveState(new WellbeingDataService.WellbeingState { HydrationGlasses = HydrationGlasses, DailyHydrationGoal = HydrationGoal });
        }

        private void UpdateHydrationText()
        {
            HydrationProgressText = $"{HydrationGlasses} / {HydrationGoal} Glasses Logged ({(HydrationGlasses * 100 / Math.Max(1, HydrationGoal))}%)";
        }

        // ══════════════════════════════════════════════════════════════════════
        // WAKTU SOLAT REST API
        // ══════════════════════════════════════════════════════════════════════
        partial void OnSelectedPrayerZoneChanged(string value) => _ = LoadPrayerTimesAsync();

        public async Task LoadPrayerTimesAsync()
        {
            string zoneCode = "WLY01";
            var m = Regex.Match(SelectedPrayerZone ?? "", @"^([A-Z]{3}\d{2})");
            if (m.Success) zoneCode = m.Groups[1].Value;

            var rows = await PrayerTimeService.GetPrayerTimesAsync(zoneCode);
            PrayerTimes = new ObservableCollection<PrayerTimeRow>(rows);

            var next = PrayerTimeService.GetNextPrayer(rows);
            NextPrayerName = next.Name;
            NextPrayerTime = next.Time;
            NextPrayerCountdown = $"in {next.Countdown}";
            HijriDateString = $"{DateTime.Now:dd MMMM yyyy} • JAKIM Malaysia ({zoneCode})";
        }

        // ══════════════════════════════════════════════════════════════════════
        // FOCUS RADIO PLAYER (mpv subprocess)
        // ══════════════════════════════════════════════════════════════════════
        [RelayCommand]
        public void ToggleRadio()
        {
            if (IsRadioPlaying)
            {
                RadioStreamService.StopStream();
                IsRadioPlaying = false;
                RadioPlayIcon = "▶";
                StatusMessage = "Radio stopped.";
            }
            else
            {
                if (SelectedStation != null)
                {
                    RadioStreamService.PlayStream(SelectedStation.StreamUrl);
                    IsRadioPlaying = true;
                    RadioPlayIcon = "⏸";
                    CurrentStationName = SelectedStation.Name;
                    StatusMessage = $"Streaming: {SelectedStation.Name}";
                }
            }
        }

        [RelayCommand]
        public void PlayStation(RadioStationItem station)
        {
            SelectedStation = station;
            if (station != null)
            {
                RadioStreamService.PlayStream(station.StreamUrl);
                IsRadioPlaying = true;
                RadioPlayIcon = "⏸";
                CurrentStationName = station.Name;
                StatusMessage = $"Streaming: {station.Name}";
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // QR CODE STUDIO (pure C# QRCoder)
        // ══════════════════════════════════════════════════════════════════════
        [RelayCommand]
        public void GenerateQr()
        {
            try
            {
                if (string.IsNullOrWhiteSpace(QrText)) return;
                using var qrGen = new QRCodeGenerator();
                using var qrData = qrGen.CreateQrCode(QrText, QRCodeGenerator.ECCLevel.Q);
                var qrCode = new BitmapByteQRCode(qrData);
                byte[] qrBytes = qrCode.GetGraphic(Math.Max(5, QrPixelsPerModule));
                using var ms = new MemoryStream(qrBytes);
                QrBitmap = new Bitmap(ms);
                QrStatusText = $"Generated {QrBitmap.Size.Width}×{QrBitmap.Size.Height}px QR code.";
            }
            catch (Exception ex)
            {
                QrStatusText = $"Error: {ex.Message}";
            }
        }

        // ══════════════════════════════════════════════════════════════════════
        // WORKSTATION HEALTH DIAGNOSTICS
        // ══════════════════════════════════════════════════════════════════════
        [RelayCommand]
        public async Task RescanHealthAsync()
        {
            var health = await WorkstationHealthService.GetDiagnosticsAsync();
            CpuInfo = health.CpuModel;
            RamInfo = $"{health.UsedRamGb:F1} GB / {health.TotalRamGb:F1} GB ({health.RamUsagePercent}%)";
            DiskRootInfo = $"{health.DiskRootUsedGb:F1} GB / {health.DiskRootTotalGb:F1} GB ({health.DiskRootUsagePercent}%)";
            DiskHomeInfo = $"{health.DiskHomeUsedGb:F1} GB / {health.DiskHomeTotalGb:F1} GB";
            KernelInfo = health.KernelVersion;
            NasPingStatus = health.NasPingLatencyMs >= 0 ? $"NAS Ping: {health.NasPingLatencyMs}ms (Online)" : "NAS Ping: Offline / Unreachable";

            SoftwareChecks = new ObservableCollection<SoftwareCheckItem>(health.SoftwareChecks);
        }

        // ══════════════════════════════════════════════════════════════════════
        // SETTINGS & SAVE
        // ══════════════════════════════════════════════════════════════════════
        [RelayCommand]
        public void SaveSettings()
        {
            try
            {
                string configDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".config", "ss-cam");
                Directory.CreateDirectory(configDir);
                string json = Newtonsoft.Json.JsonConvert.SerializeObject(new { WorkspaceRoot = SynologyDrivePath, Theme = SelectedTheme, Designer = SelectedDesigner }, Newtonsoft.Json.Formatting.Indented);
                File.WriteAllText(Path.Combine(configDir, "settings.json"), json);
                StatusMessage = "✔ Settings saved successfully.";
            }
            catch (Exception ex)
            {
                StatusMessage = $"[-] Failed to save settings: {ex.Message}";
            }
        }

        [RelayCommand]
        public void CheckNasStatus()
        {
            bool exists = Directory.Exists(SynologyDrivePath);
            NasStatusText = exists ? "Synology Drive Active" : "Synology Drive Offline";
            NasStatusColor = exists ? "#10B981" : "#EF4444";
            StatusMessage = exists ? "✔ Synology Drive workspace reachable." : "[-] Synology Drive workspace offline.";
        }

        // ══════════════════════════════════════════════════════════════════════
        // LIVE CLOCK LOOP
        // ══════════════════════════════════════════════════════════════════════
        private void StartLiveClock()
        {
            Task.Run(async () =>
            {
                while (true)
                {
                    CurrentTimeString = DateTime.Now.ToString("HH:mm:ss");
                    await Task.Delay(1000);
                }
            });
        }
    }
}
