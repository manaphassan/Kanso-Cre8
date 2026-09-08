using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class ProjectCreatorPage : Page
    {
        private string workspaceRoot = string.Empty;
        private UserProfile currentProfile;
        private List<CategoryPreset> _categoryPresets;
        private CategoryPreset _selectedEditingPreset;

        private void OnScrollViewerPreviewMouseWheel(object sender, System.Windows.Input.MouseWheelEventArgs e)
        {
            var scroller = sender as ScrollViewer;
            if (scroller != null)
            {
                int steps = Math.Abs(e.Delta) / 30;
                if (steps < 1) steps = 1;
                if (steps > 8) steps = 8;

                if (e.Delta < 0)
                {
                    for (int i = 0; i < steps; i++) scroller.LineDown();
                }
                else if (e.Delta > 0)
                {
                    for (int i = 0; i < steps; i++) scroller.LineUp();
                }
                e.Handled = true;
            }
        }

        public ProjectCreatorPage()
        {
            InitializeComponent();
            Loaded += OnPageLoaded;
        }

        private void SyncWorkspaceRootFromInput()
        {
            if (TargetDirectoryInput != null && !string.IsNullOrWhiteSpace(TargetDirectoryInput.Text))
            {
                workspaceRoot = TargetDirectoryInput.Text.Trim();
            }
        }

        private void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            currentProfile = UserProfileService.LoadProfile();
            string root = (!string.IsNullOrWhiteSpace(currentProfile.WorkspaceRoot) && Directory.Exists(currentProfile.WorkspaceRoot))
                ? currentProfile.WorkspaceRoot
                : NasConfigSyncService.DiscoverWorkspaceRoot();

            workspaceRoot = root;
            if (TargetDirectoryInput != null)
            {
                TargetDirectoryInput.Text = root;
            }

            ReloadCategoryPresets();
            PopulateDropdowns();
            AutoCalculateNextProjectId();
            UpdateLivePreview();
            LoadRecentProjects();
            LoadCreativeOrders();
        }

        private void ReloadCategoryPresets()
        {
            _categoryPresets = CategoryPresetService.LoadPresets();
            
            int prevIdx = PresetComboBox != null ? PresetComboBox.SelectedIndex : 0;
            if (PresetComboBox != null)
            {
                PresetComboBox.ItemsSource = _categoryPresets.Select(p => p.Name).ToList();
                PresetComboBox.SelectedIndex = prevIdx >= 0 && prevIdx < _categoryPresets.Count ? prevIdx : 0;
            }

            if (PresetsListBox != null)
            {
                PresetsListBox.ItemsSource = null;
                PresetsListBox.ItemsSource = _categoryPresets;
            }
        }

        private CategoryPreset GetSelectedCategoryPreset()
        {
            if (_categoryPresets == null || _categoryPresets.Count == 0) return null;
            
            string selectedName = PresetComboBox != null && PresetComboBox.SelectedItem != null ? PresetComboBox.SelectedItem.ToString() : "";
            CategoryPreset preset = _categoryPresets.FirstOrDefault(p => p.Name.Equals(selectedName, StringComparison.OrdinalIgnoreCase));
            return preset ?? _categoryPresets[0];
        }

        private void ScanDirectoryForMaxProjectId(string dir, Regex regex, ref int maxId)
        {
            if (string.IsNullOrWhiteSpace(dir) || !Directory.Exists(dir)) return;
            try
            {
                string[] subDirs = Directory.GetDirectories(dir);
                foreach (string sub in subDirs)
                {
                    string dirName = Path.GetFileName(sub);
                    Match m = regex.Match(dirName);
                    if (m.Success)
                    {
                        int idVal;
                        if (int.TryParse(m.Groups[1].Value, out idVal))
                        {
                            if (idVal > maxId) maxId = idVal;
                        }
                    }
                    else if (!dirName.StartsWith(".") && !dirName.StartsWith("_"))
                    {
                        try
                        {
                            string[] nested = Directory.GetDirectories(sub);
                            foreach (string n in nested)
                            {
                                string nName = Path.GetFileName(n);
                                Match nm = regex.Match(nName);
                                if (nm.Success)
                                {
                                    int idVal;
                                    if (int.TryParse(nm.Groups[1].Value, out idVal))
                                    {
                                        if (idVal > maxId) maxId = idVal;
                                    }
                                }
                            }
                        }
                        catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[ProjectCreatorPage] Nested scan: " + ex.Message); }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[ProjectCreatorPage] ScanDirectoryForMaxProjectId: " + ex.Message);
            }
        }

        private void AutoCalculateNextProjectId()
        {
            try
            {
                SyncWorkspaceRootFromInput();
                if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot))
                    return;

                int maxId = 0;
                Regex regex = new Regex(@"^\d{6}_(\d{4})[A-Z]", RegexOptions.IgnoreCase);

                // 1. Check current month container directory (e.g. Creative-Team\2026\202608_August)
                string containerDir = GetProjectContainerDirectory();
                if (Directory.Exists(containerDir))
                {
                    ScanDirectoryForMaxProjectId(containerDir, regex, ref maxId);
                }

                // 2. Check current year directory (e.g. Creative-Team\2026)
                string year = DateTime.Now.Year.ToString();
                if (YearComboBox != null && YearComboBox.SelectedItem != null)
                {
                    year = YearComboBox.SelectedItem.ToString();
                }
                string yearDir = Path.Combine(workspaceRoot, year);
                if (Directory.Exists(yearDir) && !string.Equals(yearDir, containerDir, StringComparison.OrdinalIgnoreCase))
                {
                    ScanDirectoryForMaxProjectId(yearDir, regex, ref maxId);
                }

                // 3. Check legacy designer folder (e.g. Creative-Team\Brand)
                string designerFolder = !string.IsNullOrWhiteSpace(currentProfile.DesignerName) ? currentProfile.DesignerName : "Brand";
                string legacyDir = Path.Combine(workspaceRoot, designerFolder);
                if (Directory.Exists(legacyDir))
                {
                    ScanDirectoryForMaxProjectId(legacyDir, regex, ref maxId);
                }

                // 4. Scan existing projects found by WorkspaceScanner
                List<DesignerFolderItem> recentProjects = WorkspaceScanner.ListDesignerFolders(workspaceRoot, "", "", 200);
                if (recentProjects != null)
                {
                    foreach (var item in recentProjects)
                    {
                        if (item != null && !string.IsNullOrWhiteSpace(item.Project))
                        {
                            Match m = regex.Match(item.Project);
                            if (m.Success)
                            {
                                int idVal;
                                if (int.TryParse(m.Groups[1].Value, out idVal))
                                {
                                    if (idVal > maxId) maxId = idVal;
                                }
                            }
                        }
                    }
                }

                int nextId = maxId + 1;
                string staffChar = "D";
                if (!string.IsNullOrWhiteSpace(currentProfile.StaffId))
                {
                    string lastChar = currentProfile.StaffId.Trim().Substring(currentProfile.StaffId.Trim().Length - 1).ToUpper();
                    if (Regex.IsMatch(lastChar, @"[A-Z]")) staffChar = lastChar;
                }

                if (ProjectIdInput != null)
                {
                    ProjectIdInput.Text = string.Format("{0:D4}{1}", nextId, staffChar);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[ProjectCreatorPage] AutoCalculateNextProjectId error: " + ex.Message);
            }
        }

        private void PopulateDropdowns()
        {
            // Years
            int currentYear = DateTime.Now.Year;
            List<string> years = new List<string>();
            for (int y = currentYear; y >= currentYear - 3; y--) years.Add(y.ToString());
            YearComboBox.ItemsSource = years;
            YearComboBox.SelectedIndex = 0;

            // Sub-brands matching official Brand System guidelines
            List<string> subBrands = new List<string>
            {
                "SS - SuamiSihat",
                "SSH - SuamiSihat Holding Sdn. Bhd.",
                "SSC - SuamiSihat Healthcare Sdn. Bhd.",
                "SSW - SuamiSihat Wellness Sdn. Bhd.",
                "SSE - SuamiSihat Ecommerce Sdn. Bhd.",
                "SST - SuamiSihat Technology Sdn. Bhd."
            };
            SubBrandComboBox.ItemsSource = subBrands;
            SubBrandComboBox.SelectedIndex = 0;

            // Target Platforms matching 2026 designer industry specs
            FilterTargetPlatformsByCategory(GetSelectedCategoryPreset());

            // Canvas extensions (.af Affinity format default)
            List<string> extensions = new List<string> { ".af", ".afdesign", ".psd", ".ai", ".prproj", ".catcomp", "Canva (.url)" };
            TemplateExtensionComboBox.ItemsSource = extensions;
            TemplateExtensionComboBox.SelectedIndex = 0;
        }

        private static readonly List<string> AllMasterPlatforms = new List<string>
        {
            "WordPress / Web Desktop (1920x1080 - RGB 72/144 DPI)",
            "WordPress / Mobile Web (390x844 - RGB 72 DPI)",
            "Meta / IG Square (1:1 - 1080x1080 RGB)",
            "Meta / IG Portrait (4:5 - 1080x1350 RGB)",
            "Meta / IG / TikTok Story (9:16 - 1080x1920 RGB)",
            "YouTube / Video Banner (16:9 - 1920x1080 RGB)",
            "Print Poster A4 (210x297mm CMYK 300 DPI)",
            "Print Poster A3 (297x420mm CMYK 300 DPI)",
            "Trifold A4 Brochure (297x210mm CMYK 300 DPI)",
            "A5 Leaflet / Flyer (148x210mm CMYK 300 DPI)",
            "Rollup Bunting (80x200cm CMYK 150 DPI)",
            "Event Bunting 2x5 ft (60x150cm CMYK 150 DPI)",
            "Large Outdoor Billboard (10x4 ft CMYK 100 DPI)",
            "Flexible / Custom Canvas"
        };

        private void FilterTargetPlatformsByCategory(CategoryPreset preset)
        {
            if (PlatformComboBox == null) return;

            string catName = preset != null ? preset.Name : "";
            List<string> filtered;

            if (catName.IndexOf("Web", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                filtered = AllMasterPlatforms.Where(p => p.Contains("WordPress") || p.Contains("Mobile Web") || p.Contains("16:9") || p.Contains("Flexible")).ToList();
            }
            else if (catName.IndexOf("Social", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                filtered = AllMasterPlatforms.Where(p => p.Contains("1:1") || p.Contains("4:5") || p.Contains("9:16") || p.Contains("16:9") || p.Contains("Flexible")).ToList();
            }
            else if (catName.IndexOf("Graphic", StringComparison.OrdinalIgnoreCase) >= 0 || catName.IndexOf("Print", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                filtered = AllMasterPlatforms.Where(p => p.Contains("Print") || p.Contains("Trifold") || p.Contains("A5 Leaflet") || p.Contains("Rollup") || p.Contains("Bunting") || p.Contains("Billboard") || p.Contains("Flexible")).ToList();
            }
            else if (catName.IndexOf("Video", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                filtered = AllMasterPlatforms.Where(p => p.Contains("16:9") || p.Contains("9:16") || p.Contains("WordPress") || p.Contains("Flexible")).ToList();
            }
            else if (catName.IndexOf("Brand", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                filtered = AllMasterPlatforms.Where(p => p.Contains("Print Poster A4") || p.Contains("Trifold") || p.Contains("1:1") || p.Contains("WordPress") || p.Contains("Flexible")).ToList();
            }
            else if (catName.IndexOf("Commerce", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                filtered = AllMasterPlatforms.Where(p => p.Contains("1:1") || p.Contains("4:5") || p.Contains("WordPress") || p.Contains("Flexible")).ToList();
            }
            else
            {
                filtered = new List<string>(AllMasterPlatforms);
            }

            string currentSel = PlatformComboBox.SelectedItem != null ? PlatformComboBox.SelectedItem.ToString() : "";
            PlatformComboBox.ItemsSource = filtered;

            if (!string.IsNullOrEmpty(currentSel) && filtered.Contains(currentSel))
            {
                PlatformComboBox.SelectedItem = currentSel;
            }
            else if (filtered.Count > 0)
            {
                PlatformComboBox.SelectedIndex = 0;
            }

            UpdateVisualCardOpacities(filtered);
        }

        private void UpdateVisualCardOpacities(List<string> activePlatforms)
        {
            SetCardOpacity(CardPlatformWordPress, activePlatforms.Any(p => p.Contains("WordPress")));
            SetCardOpacity(CardPlatform1x1, activePlatforms.Any(p => p.Contains("1:1")));
            SetCardOpacity(CardPlatform9x16, activePlatforms.Any(p => p.Contains("9:16")));
            SetCardOpacity(CardPlatform16x9, activePlatforms.Any(p => p.Contains("16:9")));
            SetCardOpacity(CardPlatformPrint, activePlatforms.Any(p => p.Contains("Print")));
            SetCardOpacity(CardPlatformTrifold, activePlatforms.Any(p => p.Contains("Trifold")));
            SetCardOpacity(CardPlatformA5Leaflet, activePlatforms.Any(p => p.Contains("A5 Leaflet")));
            SetCardOpacity(CardPlatformRollup, activePlatforms.Any(p => p.Contains("Rollup")));
        }

        private void SetCardOpacity(FrameworkElement card, bool isRelevant)
        {
            if (card != null) card.Opacity = isRelevant ? 1.0 : 0.45;
        }

        private string GetSubBrandCode(string fullName)
        {
            if (string.IsNullOrWhiteSpace(fullName)) return "SS";
            if (fullName.StartsWith("SSH")) return "SSH";
            if (fullName.StartsWith("SSC")) return "SSC";
            if (fullName.StartsWith("SSW")) return "SSW";
            if (fullName.StartsWith("SSE")) return "SSE";
            if (fullName.StartsWith("SST")) return "SST";
            return "SS";
        }

        private List<string> GetPresetFolders(CategoryPreset preset)
        {
            if (preset != null && preset.Folders != null && preset.Folders.Count > 0)
            {
                return new List<string>(preset.Folders);
            }
            return new List<string> { "01_Artwork_Design", "02_Artwork_Mockup", "03_Assets", "04_Production" };
        }

        private void OnFormInputChanged(object sender, SelectionChangedEventArgs e)
        {
            if (!IsLoaded) return;

            if (sender == PresetComboBox && PresetComboBox.SelectedItem != null)
            {
                CategoryPreset preset = GetSelectedCategoryPreset();
                string suffix = preset != null ? preset.Suffix : "D";
                string currentNum = "0001";
                if (!string.IsNullOrWhiteSpace(ProjectIdInput.Text))
                {
                    Match m = Regex.Match(ProjectIdInput.Text, @"^(\d+)");
                    if (m.Success) currentNum = m.Groups[1].Value;
                }
                ProjectIdInput.Text = string.Format("{0}{1}", currentNum, suffix);

                FilterTargetPlatformsByCategory(preset);
            }

            if (PlatformComboBox.SelectedItem != null)
            {
                string platform = PlatformComboBox.SelectedItem.ToString();
                if (platform.Contains("WordPress / Web Desktop") || platform.Contains("WordPress")) PlatformSpecsText.Text = "1920 x 1080 px • 72/144 DPI • sRGB Color Mode • WordPress Hero";
                else if (platform.Contains("Mobile Web")) PlatformSpecsText.Text = "390 x 844 px • 72 DPI • sRGB Color Mode • Mobile Viewport";
                else if (platform.Contains("1:1")) PlatformSpecsText.Text = "1080 x 1080 px • 72 DPI • sRGB Color Mode • 1:1 Feed Post";
                else if (platform.Contains("4:5")) PlatformSpecsText.Text = "1080 x 1350 px • 72 DPI • sRGB Color Mode • 4:5 Feed Post";
                else if (platform.Contains("9:16")) PlatformSpecsText.Text = "1080 x 1920 px • 72 DPI • sRGB Color Mode • 9:16 Story/Reels";
                else if (platform.Contains("16:9")) PlatformSpecsText.Text = "1920 x 1080 px • 72 DPI • sRGB Color Mode • 16:9 HD Display";
                else if (platform.Contains("Print Poster A4")) PlatformSpecsText.Text = "2480 x 3508 px (A4 210x297 mm) • 300 DPI • CMYK Color Mode";
                else if (platform.Contains("Print Poster A3")) PlatformSpecsText.Text = "3508 x 4960 px (A3 297x420 mm) • 300 DPI • CMYK Color Mode";
                else if (platform.Contains("Trifold")) PlatformSpecsText.Text = "3508 x 2480 px (A4 297x210 mm Landscape) • 300 DPI • CMYK • 3-Panel Brochure";
                else if (platform.Contains("A5 Leaflet")) PlatformSpecsText.Text = "1748 x 2480 px (A5 148x210 mm) • 300 DPI • CMYK Color Mode • Flyer";
                else if (platform.Contains("Rollup")) PlatformSpecsText.Text = "4724 x 11811 px (80x200 cm) • 150 DPI • CMYK Color Mode • Rollup Banner";
                else if (platform.Contains("Bunting")) PlatformSpecsText.Text = "3600 x 9000 px (2x5 ft / 60x150 cm) • 150 DPI • CMYK Color Mode";
                else if (platform.Contains("Billboard")) PlatformSpecsText.Text = "12000 x 4800 px (10x4 ft) • 100 DPI • CMYK Color Mode";
                else PlatformSpecsText.Text = "Custom Dimensions • Flexible DPI & Color Mode";
            }

            UpdateLivePreview();
        }

        private void OnVisualPlatformCardClicked(object sender, RoutedEventArgs e)
        {
            var btn = sender as FrameworkElement;
            if (btn != null && btn.Tag != null)
            {
                string tag = btn.Tag.ToString();
                
                bool found = false;
                for (int i = 0; i < PlatformComboBox.Items.Count; i++)
                {
                    string itemStr = PlatformComboBox.Items[i].ToString();
                    if (itemStr.Contains(tag))
                    {
                        PlatformComboBox.SelectedIndex = i;
                        found = true;
                        break;
                    }
                }

                if (!found)
                {
                    string masterMatch = AllMasterPlatforms.FirstOrDefault(p => p.Contains(tag));
                    if (!string.IsNullOrEmpty(masterMatch))
                    {
                        List<string> currentItems = PlatformComboBox.ItemsSource as List<string> ?? new List<string>();
                        if (!currentItems.Contains(masterMatch))
                        {
                            currentItems.Add(masterMatch);
                            PlatformComboBox.ItemsSource = null;
                            PlatformComboBox.ItemsSource = currentItems;
                        }
                        PlatformComboBox.SelectedItem = masterMatch;
                    }
                }
            }
        }

        private void OnFormInputChanged(object sender, TextChangedEventArgs e)
        {
            if (IsLoaded)
            {
                if (sender == TargetDirectoryInput)
                {
                    AutoCalculateNextProjectId();
                }
                UpdateLivePreview();
            }
        }

        private void OnFormInputChanged(object sender, RoutedEventArgs e)
        {
            if (IsLoaded)
            {
                if (sender == YearComboBox)
                {
                    AutoCalculateNextProjectId();
                }
                UpdateLivePreview();
            }
        }

        private string GenerateFolderName()
        {
            string datePrefix = DateTime.Now.ToString("yyyyMM");
            string jobId = ProjectIdInput != null && !string.IsNullOrWhiteSpace(ProjectIdInput.Text) ? ProjectIdInput.Text.Trim() : "0001D";
            string selectedBrandFull = SubBrandComboBox != null && SubBrandComboBox.SelectedItem != null ? SubBrandComboBox.SelectedItem.ToString() : "SS";
            string brandCode = GetSubBrandCode(selectedBrandFull);
            string name = ProjectNameInput != null && !string.IsNullOrWhiteSpace(ProjectNameInput.Text) ? ProjectNameInput.Text.Trim() : "project name";

            name = Regex.Replace(name, @"[\\/:*?""<>|]", "_");
            return string.Format("{0}_{1}_{2}_{3}", datePrefix, jobId, brandCode, name);
        }

        private void UpdatePlatformCardHighlighting()
        {
            if (PlatformComboBox == null || CardPlatform1x1 == null) return;
            int idx = PlatformComboBox.SelectedIndex;

            CardPlatform1x1.BorderThickness = new Thickness(idx == 0 ? 2 : 1);
            CardPlatform9x16.BorderThickness = new Thickness(idx == 1 ? 2 : 1);
            CardPlatform16x9.BorderThickness = new Thickness(idx == 2 ? 2 : 1);
            CardPlatformPrint.BorderThickness = new Thickness(idx == 3 ? 2 : 1);
        }

        private string GetProjectContainerDirectory()
        {
            string year = DateTime.Now.Year.ToString();
            if (YearComboBox != null && YearComboBox.SelectedItem != null)
            {
                year = YearComboBox.SelectedItem.ToString();
            }
            string monthFolder = DateTime.Now.ToString("yyyyMM") + "_" + DateTime.Now.ToString("MMMM", System.Globalization.CultureInfo.InvariantCulture);
            return Path.Combine(workspaceRoot, year, monthFolder);
        }

        private void UpdateLivePreview()
        {
            string folderName = GenerateFolderName();
            string containerDir = GetProjectContainerDirectory();
            string targetPath = Path.Combine(containerDir, folderName);

            PreviewPathText.Text = targetPath;

            if (FolderStatusBadge != null)
            {
                bool exists = Directory.Exists(targetPath);
                FolderStatusBadge.Visibility = exists ? Visibility.Visible : Visibility.Collapsed;
                if (exists && FolderStatusBadgeText != null)
                {
                    FolderStatusBadgeText.Text = "Target folder already exists in workspace";
                }
            }

            UpdatePlatformCardHighlighting();

            CategoryPreset selectedPreset = GetSelectedCategoryPreset();
            if (selectedPreset != null)
            {
                DateTime targetDue = CategoryPresetService.CalculateTargetDeadline(selectedPreset);
                if (SlaTargetText != null)
                {
                    SlaTargetText.Text = string.Format("SLA Target: {0} Days", selectedPreset.SlaDays > 0 ? selectedPreset.SlaDays : 3);
                }
                if (SlaDeadlineText != null)
                {
                    SlaDeadlineText.Text = string.Format("Recommended Due Date: {0:yyyy-MM-dd} ({0:ddd})", targetDue);
                }
            }

            List<string> presetFolders = GetPresetFolders(selectedPreset);

            List<string> lines = new List<string>();
            lines.Add("📁 " + folderName);
            
            foreach (var folder in presetFolders)
            {
                if (folder.Contains(Path.DirectorySeparatorChar.ToString()) || folder.Contains("/"))
                {
                    string[] parts = folder.Split(new[] { Path.DirectorySeparatorChar, '/' }, StringSplitOptions.RemoveEmptyEntries);
                    lines.Add(" │   └── 📁 " + string.Join("/", parts.Skip(1)));
                }
                else
                {
                    lines.Add(" ├── 📁 " + folder);
                    if ((folder.Contains("SOURCE") || folder.Contains("Artwork_Design") || folder.Contains("Working")) && InjectCanvasCheck != null && InjectCanvasCheck.IsChecked == true)
                    {
                        lines.Add(" │   └── 📄 " + folderName + GetSelectedExtension());
                        if (CanvaUrlInput != null && !string.IsNullOrWhiteSpace(CanvaUrlInput.Text))
                        {
                            lines.Add(" │   └── 🔗 Open_In_Canva.url");
                        }
                    }
                    else if (folder.Contains("COPYWRITING") || folder.Contains("Copywriting"))
                    {
                        lines.Add(" │   └── 📄 COPY.md");
                    }
                }
            }

            if (IncludeRevisionsCheck != null && IncludeRevisionsCheck.IsChecked == true)
            {
                lines.Add(" ├── 📁 Client_Revisions");
            }
            if (IncludeRawMediaCheck != null && IncludeRawMediaCheck.IsChecked == true)
            {
                lines.Add(" ├── 📁 RAW_Media");
            }
            lines.Add(" └── 📄 README.md");

            FolderStructureBox.Text = string.Join(Environment.NewLine, lines.ToArray());
        }

        private void OnCopyFolderPathClicked(object sender, RoutedEventArgs e)
        {
            string folderName = GenerateFolderName();
            string containerDir = GetProjectContainerDirectory();
            string targetPath = Path.Combine(containerDir, folderName);
            ClipboardService.SetText(targetPath);
            CreateStatusText.Text = "Copied target folder path to clipboard!";
        }

        private void OnCopyFolderNameClicked(object sender, RoutedEventArgs e)
        {
            string folderName = GenerateFolderName();
            ClipboardService.SetText(folderName);
            CreateStatusText.Text = "Copied folder name to clipboard!";
        }

        private void OnCreateProjectClicked(object sender, RoutedEventArgs e)
        {
            string folderName = GenerateFolderName();
            string containerDir = GetProjectContainerDirectory();
            string targetDir = Path.Combine(containerDir, folderName);

            try
            {
                CreateStatusText.Text = "Creating project folders...";
                if (!Directory.Exists(containerDir)) Directory.CreateDirectory(containerDir);
                if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);

                CategoryPreset selectedPreset = GetSelectedCategoryPreset();
                List<string> presetFolders = GetPresetFolders(selectedPreset);

                foreach (var folder in presetFolders)
                {
                    string fPath = Path.Combine(targetDir, folder);
                    Directory.CreateDirectory(fPath);

                    if ((folder.Contains("SOURCE") || folder.Contains("Artwork_Design") || folder.Contains("Working")) && InjectCanvasCheck != null && InjectCanvasCheck.IsChecked == true)
                    {
                        string ext = GetSelectedExtension();
                        InjectCanvasFile(fPath, folderName, ext);
                    }
                    else if (folder.Contains("COPYWRITING") || folder.Contains("Copywriting"))
                    {
                        string copyFilePath = Path.Combine(fPath, "COPY.md");
                        if (!File.Exists(copyFilePath))
                        {
                            string defaultCopy = string.Format("# Copywriting & Script Studio — {0}\n\n## 1. Video Script Hooks\n| Scene / Frame | Visual Action | Voiceover / Audio Hook | On-Screen Caption |\n| :--- | :--- | :--- | :--- |\n| **01 (0-3s)** | Close up product shot | 'Rahsia stamina lelaki aktif...' | STAMINA MAKSIMUM |\n\n## 2. Meta / TikTok Ad Copy Angles\n- **Angle A (Problem / Solution)**: Letih selepas bekerja? Kembalikan tenaga harian.\n- **Angle B (Social Proof)**: Pilihan lebih 50,000 lelaki di seluruh Malaysia.\n", folderName);
                            File.WriteAllText(copyFilePath, defaultCopy);
                        }
                    }
                }

                if (IncludeRevisionsCheck.IsChecked == true)
                    Directory.CreateDirectory(Path.Combine(targetDir, "Client_Revisions"));

                if (IncludeRawMediaCheck.IsChecked == true)
                    Directory.CreateDirectory(Path.Combine(targetDir, "RAW_Media"));

                // Build sub-brand code from the ComboBox selection
                string subBrandCode = "SS";
                if (SubBrandComboBox != null && SubBrandComboBox.SelectedItem != null)
                {
                    string sb = SubBrandComboBox.SelectedItem.ToString().Trim();
                    System.Text.RegularExpressions.Match brandMatch =
                        System.Text.RegularExpressions.Regex.Match(sb, @"^([A-Z]{2,4})\s");
                    if (brandMatch.Success) subBrandCode = brandMatch.Groups[1].Value;
                    else if (sb.Length >= 2) subBrandCode = sb.Substring(0, Math.Min(4, sb.Length)).ToUpper();
                }

                string designerName = !string.IsNullOrWhiteSpace(currentProfile.DesignerName) ? currentProfile.DesignerName : (currentProfile.StaffId ?? "");
                DateTime targetDeadline = CategoryPresetService.CalculateTargetDeadline(selectedPreset);
                string deadlineFormatted = targetDeadline.ToString("yyyy-MM-dd");
                string presetName = selectedPreset != null ? selectedPreset.Name : (PresetComboBox.SelectedItem != null ? PresetComboBox.SelectedItem.ToString() : "Graphic & Print Design");

                CreativeOrderItem selectedOrder = LinkedOrderComboBox != null ? LinkedOrderComboBox.SelectedItem as CreativeOrderItem : null;
                string orderId = (selectedOrder != null && !string.IsNullOrWhiteSpace(selectedOrder.Id) && selectedOrder.Id != "NONE") ? selectedOrder.Id : null;

                string canvaLink = CanvaUrlInput != null ? CanvaUrlInput.Text.Trim() : "";
                string frontmatter = FrontmatterService.BuildDefaultFrontmatter(
                    designerName,
                    subBrandCode,
                    deadlineFormatted,
                    presetName,
                    orderId,
                    string.IsNullOrWhiteSpace(canvaLink) ? null : canvaLink);

                string readmeContent = string.Format("{0}\n# {1}\n\n- **Created**: {2:yyyy-MM-dd HH:mm}\n- **Designer**: {3}\n- **Project ID**: {4}\n- **Preset**: {5}\n- **Platform**: {6}\n- **Platform Specs**: {7}\n\n## Project Brief & Remarks\n{8}\n",
                    frontmatter,
                    folderName,
                    DateTime.Now,
                    designerName,
                    ProjectIdInput.Text,
                    PresetComboBox.SelectedItem,
                    PlatformComboBox.SelectedItem,
                    PlatformSpecsText.Text,
                    ProjectDescriptionInput.Text);

                if (!string.IsNullOrWhiteSpace(canvaLink))
                {
                    readmeContent += string.Format("\n## Canva Cloud Design\n- [Open Project in Canva]({0})\n", canvaLink);
                }
                File.WriteAllText(Path.Combine(targetDir, "README.md"), readmeContent);

                // Auto-generate Open_In_Canva.url in 02_SOURCE if Canva link provided
                if (!string.IsNullOrWhiteSpace(canvaLink))
                {
                    string sourceDir = Path.Combine(targetDir, "02_SOURCE");
                    if (!Directory.Exists(sourceDir))
                    {
                        string altSource = Directory.GetDirectories(targetDir, "*SOURCE*").FirstOrDefault();
                        sourceDir = altSource ?? targetDir;
                    }
                    try
                    {
                        string safeUrl = canvaLink;
                        if (!safeUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && !safeUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                        {
                            safeUrl = "https://" + safeUrl;
                        }
                        string shortcutContent = string.Format("[InternetShortcut]\r\nURL={0}\r\nIconIndex=0\r\n", safeUrl);
                        File.WriteAllText(Path.Combine(sourceDir, "Open_In_Canva.url"), shortcutContent, Encoding.UTF8);
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine("[ProjectCreatorPage] Failed to write Open_In_Canva.url: " + ex.Message);
                    }
                }

                int attachmentsCopied = 0;
                if (!string.IsNullOrWhiteSpace(orderId))
                {
                    string briefAssetsDir = Path.Combine(targetDir, "01_BRIEF_ASSETS");
                    attachmentsCopied = CreativeOrderService.CopyAttachmentsToProject(workspaceRoot, orderId, briefAssetsDir);
                    CreativeOrderService.UpdateOrderProject(workspaceRoot, orderId, folderName, "in_progress");
                }

                CreateStatusText.Text = !string.IsNullOrWhiteSpace(orderId)
                    ? string.Format("Project created! Imported {0} attachment(s) from {1}", attachmentsCopied, orderId)
                    : "Project created successfully!";
                LoadRecentProjects();
                LoadCreativeOrders();
                
                AutoCalculateNextProjectId();
                ProjectNameInput.Text = "";

                Process.Start("explorer.exe", targetDir);
            }
            catch (Exception ex)
            {
                MessageBox.Show(string.Format("Could not create project: {0}", ex.Message), "Creation Error", MessageBoxButton.OK, MessageBoxImage.Error);
                CreateStatusText.Text = "Project creation failed.";
            }
        }

        private void LoadCreativeOrders()
        {
            if (LinkedOrderComboBox == null) return;
            try
            {
                SyncWorkspaceRootFromInput();
                List<CreativeOrderItem> orders = CreativeOrderService.LoadOrders(workspaceRoot);

                List<CreativeOrderItem> displayList = new List<CreativeOrderItem>();
                displayList.Add(new CreativeOrderItem
                {
                    Id = "NONE",
                    Title = "-- Standalone Project (No Order Linked) --",
                    AttachmentCount = 0
                });

                var sorted = orders
                    .OrderByDescending(o => o.CreatedAt)
                    .ToList();

                displayList.AddRange(sorted);

                LinkedOrderComboBox.ItemsSource = displayList;
                LinkedOrderComboBox.SelectedIndex = 0;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[ProjectCreatorPage] LoadCreativeOrders error: " + ex.Message);
            }
        }

        private void OnRefreshOrdersClicked(object sender, RoutedEventArgs e)
        {
            LoadCreativeOrders();
            CreateStatusText.Text = "Synchronized orders from NAS _Orders.";
        }

        private void OnLinkedOrderSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (LinkedOrderComboBox == null) return;
            CreativeOrderItem item = LinkedOrderComboBox.SelectedItem as CreativeOrderItem;

            if (item != null && item.Id != "NONE" && !string.IsNullOrWhiteSpace(item.Id))
            {
                if (ProjectNameInput != null)
                {
                    if (string.IsNullOrWhiteSpace(ProjectNameInput.Text) || ProjectNameInput.Text.Equals("brand campaign", StringComparison.OrdinalIgnoreCase))
                    {
                        ProjectNameInput.Text = item.Title ?? "order task";
                    }
                }

                if (SubBrandComboBox != null && !string.IsNullOrWhiteSpace(item.SubBrand))
                {
                    for (int i = 0; i < SubBrandComboBox.Items.Count; i++)
                    {
                        string b = SubBrandComboBox.Items[i].ToString();
                        if (b.IndexOf(item.SubBrand, StringComparison.OrdinalIgnoreCase) >= 0)
                        {
                            SubBrandComboBox.SelectedIndex = i;
                            break;
                        }
                    }
                }

                if (ProjectDescriptionInput != null)
                {
                    string briefNotes = string.Format("### Order: {0}\n- **Requester**: {1} ({2})\n- **Type**: {3} | **Priority**: {4}\n- **Deadline**: {5}\n\n## Brief / Instructions\n{6}\n",
                        item.Id,
                        item.RequesterName ?? "N/A",
                        item.RequesterEmail ?? "",
                        item.DeliverableType ?? "General",
                        item.Priority ?? "medium",
                        item.Deadline ?? "ASAP",
                        item.Description ?? "No description provided.");
                    ProjectDescriptionInput.Text = briefNotes;
                }

                if (OrderAttachmentsBadge != null)
                {
                    OrderAttachmentsBadge.Text = item.AttachmentCount > 0
                        ? string.Format("📎 {0} attachment(s) will be imported to 01_BRIEF_ASSETS", item.AttachmentCount)
                        : "No attachments";
                }
            }
            else
            {
                if (OrderAttachmentsBadge != null)
                {
                    OrderAttachmentsBadge.Text = "";
                }
            }
        }

        private void InjectCanvasFile(string fPath, string folderName, string ext)
        {
            try
            {
                if (ext == ".url")
                {
                    string canvaLink = CanvaUrlInput != null && !string.IsNullOrWhiteSpace(CanvaUrlInput.Text)
                        ? CanvaUrlInput.Text.Trim()
                        : "https://www.canva.com";
                    if (!canvaLink.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && !canvaLink.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
                    {
                        canvaLink = "https://" + canvaLink;
                    }
                    string sc = string.Format("[InternetShortcut]\r\nURL={0}\r\nIconIndex=0\r\n", canvaLink);
                    File.WriteAllText(Path.Combine(fPath, "Open_In_Canva.url"), sc, Encoding.UTF8);
                    return;
                }
                string projectId = ProjectIdInput != null ? ProjectIdInput.Text.Trim() : "";
                string rawTitle = ProjectNameInput != null ? ProjectNameInput.Text.Trim() : "project";
                string cleanTitle = Regex.Replace(rawTitle, @"[\\/:*?""<>|]", "_");
                string fileName = !string.IsNullOrWhiteSpace(projectId)
                    ? string.Format("{0}_{1}_master{2}", projectId, cleanTitle, ext)
                    : string.Format("{0}_master{2}", folderName, ext);

                string canvasFilePath = Path.Combine(fPath, fileName);

                string appDataTemplates = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "SuamiSihat", "Templates", "starter_template" + ext
                );
                string workspaceTemplates = !string.IsNullOrWhiteSpace(workspaceRoot)
                    ? Path.Combine(workspaceRoot, "Templates", "starter_template" + ext)
                    : "";

                if (File.Exists(appDataTemplates))
                {
                    File.Copy(appDataTemplates, canvasFilePath, true);
                }
                else if (!string.IsNullOrEmpty(workspaceTemplates) && File.Exists(workspaceTemplates))
                {
                    File.Copy(workspaceTemplates, canvasFilePath, true);
                }
                else
                {
                    string platformSpecs = PlatformSpecsText != null ? PlatformSpecsText.Text : "Custom Dimensions";
                    string sampleHeader = string.Format(
                        "// SuamiSihat Creative Asset Starter Canvas\n// Project ID: {0}\n// Title: {1}\n// Platform Specs: {2}\n// Created: {3:yyyy-MM-dd HH:mm:ss}\n",
                        projectId, cleanTitle, platformSpecs, DateTime.Now
                    );
                    File.WriteAllText(canvasFilePath, sampleHeader);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[ProjectCreatorPage] InjectCanvasFile error: " + ex.Message);
            }
        }

        private void OnLaunchCanvaWithDimensionsClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                int width = 1080;
                int height = 1080;
                string unit = "px";

                string specs = PlatformSpecsText != null ? PlatformSpecsText.Text : "";
                var match = Regex.Match(specs, @"(\d+)\s*[xX×]\s*(\d+)");
                if (match.Success)
                {
                    int.TryParse(match.Groups[1].Value, out width);
                    int.TryParse(match.Groups[2].Value, out height);
                }
                else if (specs.Contains("A4"))
                {
                    width = 210;
                    height = 297;
                    unit = "mm";
                }
                else if (specs.Contains("A3"))
                {
                    width = 297;
                    height = 420;
                    unit = "mm";
                }
                else if (specs.Contains("A5"))
                {
                    width = 148;
                    height = 210;
                    unit = "mm";
                }

                string canvaUrl = string.Format("https://www.canva.com/create/?width={0}&height={1}&unit={2}", width, height, unit);
                Process.Start(new ProcessStartInfo(canvaUrl) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                MessageBox.Show("Could not launch Canva: " + ex.Message, "Canva Launch", MessageBoxButton.OK, MessageBoxImage.Warning);
            }
        }

        private void OnTestCanvaLinkClicked(object sender, RoutedEventArgs e)
        {
            string url = CanvaUrlInput != null ? CanvaUrlInput.Text.Trim() : "";
            if (string.IsNullOrWhiteSpace(url))
            {
                MessageBox.Show("Please enter a Canva design URL first.", "Canva Link", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            if (!url.StartsWith("http://", StringComparison.OrdinalIgnoreCase) && !url.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                url = "https://" + url;
            }

            try
            {
                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                MessageBox.Show("Could not open URL: " + ex.Message, "Canva Link", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void OnBrowseTargetDirectory(object sender, RoutedEventArgs e)
        {
            var dialog = new System.Windows.Forms.FolderBrowserDialog();
            if (TargetDirectoryInput != null && !string.IsNullOrWhiteSpace(TargetDirectoryInput.Text))
            {
                dialog.SelectedPath = TargetDirectoryInput.Text;
            }
            if (dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
            {
                TargetDirectoryInput.Text = dialog.SelectedPath;
                SyncWorkspaceRootFromInput();
                AutoCalculateNextProjectId();
                UpdateLivePreview();
                LoadRecentProjects();
            }
        }

        private async void LoadRecentProjects()
        {
            SyncWorkspaceRootFromInput();
            if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot)) return;

            List<ProjectStatusItem> projectList = await Task.Factory.StartNew(delegate
            {
                List<ProjectStatusItem> list = new List<ProjectStatusItem>();
                try
                {
                    string designerFolder = !string.IsNullOrWhiteSpace(currentProfile != null ? currentProfile.DesignerName : null) ? currentProfile.DesignerName : "";
                    List<DesignerFolderItem> folders = WorkspaceScanner.ListDesignerFolders(workspaceRoot, designerFolder, "", 10);
                    if (folders != null)
                    {
                        foreach (DesignerFolderItem f in folders)
                        {
                            if (f != null && !string.IsNullOrWhiteSpace(f.FullPath))
                            {
                                ProjectStatusItem st = FrontmatterService.ReadStatus(f.FullPath);
                                if (st != null)
                                {
                                    if (string.IsNullOrWhiteSpace(st.Designer) && !string.IsNullOrWhiteSpace(f.Designer))
                                    {
                                        st.Designer = f.Designer;
                                    }
                                    list.Add(st);
                                }
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine("[ProjectCreatorPage] LoadRecentProjects: " + ex.Message);
                }
                return list;
            });

            if (RecentProjectsItemsControl != null)
            {
                RecentProjectsItemsControl.ItemsSource = projectList;
            }
        }

        private void OnRecentProjectCardDoubleClicked(object sender, MouseButtonEventArgs e)
        {
            FrameworkElement el = sender as FrameworkElement;
            if (el == null) return;
            ProjectStatusItem selected = el.DataContext as ProjectStatusItem;
            if (selected != null && Directory.Exists(selected.FullPath))
            {
                try
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = selected.FullPath,
                        UseShellExecute = true
                    });
                }
                catch (Exception ex)
                {
                    Debug.WriteLine("[ProjectCreatorPage] OpenExplorer error: " + ex.Message);
                }
            }
        }

        #region Category Presets & Folder Structure Manager Modal Handlers

        private void OnManagePresetsClicked(object sender, RoutedEventArgs e)
        {
            ReloadCategoryPresets();
            if (_categoryPresets.Count > 0)
            {
                PresetsListBox.SelectedIndex = 0;
            }
            ManagePresetsModal.Visibility = Visibility.Visible;
        }

        private void OnClosePresetsModalClicked(object sender, RoutedEventArgs e)
        {
            ManagePresetsModal.Visibility = Visibility.Collapsed;
            ReloadCategoryPresets();
            AutoCalculateNextProjectId();
            UpdateLivePreview();
        }

        private void OnPresetSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            CategoryPreset selected = PresetsListBox.SelectedItem as CategoryPreset;
            if (selected != null)
            {
                _selectedEditingPreset = selected;
                PresetFormTitle.Text = "✏️ Edit Category Preset — " + selected.Name;
                TxtPresetName.Text = selected.Name;
                TxtPresetSuffix.Text = selected.Suffix;
                TxtPresetFolders.Text = string.Join(Environment.NewLine, selected.Folders != null ? selected.Folders.ToArray() : new string[0]);

                BtnDeletePreset.IsEnabled = true;
            }
        }

        private void OnAddNewPresetClicked(object sender, RoutedEventArgs e)
        {
            _selectedEditingPreset = null;
            PresetsListBox.SelectedIndex = -1;
            PresetFormTitle.Text = "➕ Add New Category Preset";
            TxtPresetName.Text = "";
            TxtPresetSuffix.Text = "N";
            TxtPresetFolders.Text = "01_Artwork_Design" + Environment.NewLine + "02_Source_Assets" + Environment.NewLine + "03_Final_Exports";

            BtnDeletePreset.IsEnabled = false;
        }

        private void OnSavePresetClicked(object sender, RoutedEventArgs e)
        {
            string name = TxtPresetName.Text != null ? TxtPresetName.Text.Trim() : "";
            string suffix = TxtPresetSuffix.Text != null ? TxtPresetSuffix.Text.Trim().ToUpper() : "D";
            string folderText = TxtPresetFolders.Text != null ? TxtPresetFolders.Text : "";

            if (string.IsNullOrWhiteSpace(name))
            {
                MessageBox.Show("Please enter a category preset name.", "Validation Warning", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            if (string.IsNullOrWhiteSpace(suffix))
            {
                suffix = "D";
            }

            List<string> folders = CategoryPresetService.ParseFolderLines(folderText);

            if (folders.Count == 0)
            {
                folders = new List<string> { "01_Artwork_Design", "02_Source_Assets", "03_Final_Exports" };
            }

            if (_selectedEditingPreset != null)
            {
                _selectedEditingPreset.Name = name;
                _selectedEditingPreset.Suffix = suffix;
                _selectedEditingPreset.Folders = folders;

                CategoryPresetService.AddOrUpdatePreset(_selectedEditingPreset);
            }
            else
            {
                CategoryPreset newPreset = new CategoryPreset
                {
                    Name = name,
                    Suffix = suffix,
                    Folders = folders,
                    IsDefault = false
                };

                CategoryPresetService.AddOrUpdatePreset(newPreset);
            }

            ReloadCategoryPresets();
            MessageBox.Show("Category Preset & Directory Structure saved successfully!", "Preset Saved", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void OnDeletePresetClicked(object sender, RoutedEventArgs e)
        {
            if (_selectedEditingPreset != null)
            {
                var result = MessageBox.Show(string.Format("Delete preset '{0}'?", _selectedEditingPreset.Name), "Confirm Delete", MessageBoxButton.YesNo, MessageBoxImage.Question);
                if (result == MessageBoxResult.Yes)
                {
                    CategoryPresetService.DeletePreset(_selectedEditingPreset.Id);
                    _selectedEditingPreset = null;
                    ReloadCategoryPresets();
                    if (_categoryPresets.Count > 0) PresetsListBox.SelectedIndex = 0;
                }
            }
        }

        private void OnResetPresetsToDefaultClicked(object sender, RoutedEventArgs e)
        {
            var result = MessageBox.Show("Reset all category presets and subfolder structures to default guidelines?", "Reset Presets", MessageBoxButton.YesNo, MessageBoxImage.Question);
            if (result == MessageBoxResult.Yes)
            {
                CategoryPresetService.ResetToDefaults();
                _selectedEditingPreset = null;
                ReloadCategoryPresets();
                if (_categoryPresets.Count > 0) PresetsListBox.SelectedIndex = 0;
                MessageBox.Show("All category presets reset to default!", "Presets Reset", MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }

        #endregion

        // ─────────────────────────────────────────────────────────────────────
        // Markdown Toolbar Helpers
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Returns the current selected canvas extension from the editable ComboBox.
        /// Falls back to .afdesign if the field is empty.
        /// </summary>
        private string GetSelectedExtension()
        {
            string val = TemplateExtensionComboBox != null ? TemplateExtensionComboBox.Text : "";
            if (string.IsNullOrWhiteSpace(val))
                return ".afdesign";
            if (val.IndexOf("Canva", StringComparison.OrdinalIgnoreCase) >= 0 || val.EndsWith(".url", StringComparison.OrdinalIgnoreCase))
                return ".url";
            // Ensure it starts with a dot
            return val.StartsWith(".") ? val : "." + val;
        }

        /// <summary>
        /// Wraps the currently selected text in ProjectDescriptionInput with
        /// the given prefix and suffix. If nothing is selected, inserts a
        /// placeholder at the caret position.
        /// </summary>
        private void ApplyMarkdownWrap(string prefix, string suffix = null, bool linePrefix = false)
        {
            if (suffix == null) suffix = prefix;
            int start = ProjectDescriptionInput.SelectionStart;
            int length = ProjectDescriptionInput.SelectionLength;
            string selected = ProjectDescriptionInput.SelectedText;

            string replacement;
            int newCaret;

            if (linePrefix)
            {
                // Insert prefix at the beginning of the current line
                int lineStart = ProjectDescriptionInput.Text.LastIndexOf('\n', start > 0 ? start - 1 : 0);
                lineStart = lineStart < 0 ? 0 : lineStart + 1;
                ProjectDescriptionInput.Select(lineStart, 0);
                ProjectDescriptionInput.SelectedText = prefix;
                ProjectDescriptionInput.SelectionStart = lineStart + prefix.Length + (length > 0 ? length : 0);
                ProjectDescriptionInput.Focus();
                return;
            }

            if (length > 0)
            {
                replacement = prefix + selected + suffix;
                newCaret = start + replacement.Length;
            }
            else
            {
                replacement = prefix + "text" + suffix;
                newCaret = start + prefix.Length;
            }

            ProjectDescriptionInput.SelectedText = replacement;
            if (length == 0)
            {
                // Select the placeholder word so user can type over it
                ProjectDescriptionInput.Select(start + prefix.Length, 4);
            }
            else
            {
                ProjectDescriptionInput.SelectionStart = newCaret;
            }
            ProjectDescriptionInput.Focus();
        }

        private void OnMdBold(object sender, System.Windows.RoutedEventArgs e)
        {
            ApplyMarkdownWrap("**");
        }

        private void OnMdItalic(object sender, System.Windows.RoutedEventArgs e)
        {
            ApplyMarkdownWrap("*");
        }

        private void OnMdCode(object sender, System.Windows.RoutedEventArgs e)
        {
            ApplyMarkdownWrap("`");
        }

        private void OnMdHeading(object sender, System.Windows.RoutedEventArgs e)
        {
            ApplyMarkdownWrap("## ", "", true);
        }

        private void OnMdList(object sender, System.Windows.RoutedEventArgs e)
        {
            ApplyMarkdownWrap("- ", "", true);
        }

        private void OnMdSep(object sender, System.Windows.RoutedEventArgs e)
        {
            int pos = ProjectDescriptionInput.SelectionStart;
            string insert = "\n---\n";
            ProjectDescriptionInput.Text = ProjectDescriptionInput.Text.Insert(pos, insert);
            ProjectDescriptionInput.SelectionStart = pos + insert.Length;
            ProjectDescriptionInput.Focus();
        }
    }
}

