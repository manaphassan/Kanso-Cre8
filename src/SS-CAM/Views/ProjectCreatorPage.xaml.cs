using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class ProjectCreatorPage : Page
    {
        private string workspaceRoot = @"D:\Testing";
        private UserProfile currentProfile;

        public ProjectCreatorPage()
        {
            InitializeComponent();
            Loaded += OnPageLoaded;
        }

        private void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            currentProfile = UserProfileService.LoadProfile();
            if (!string.IsNullOrWhiteSpace(currentProfile.WorkspaceRoot))
            {
                workspaceRoot = currentProfile.WorkspaceRoot;
            }

            PopulateDropdowns();
            AutoCalculateNextJobId();
            UpdateLivePreview();
            LoadRecentProjects();
        }

        private void AutoCalculateNextJobId()
        {
            try
            {
                string designerFolder = !string.IsNullOrWhiteSpace(currentProfile.DesignerName) ? currentProfile.DesignerName : "Brand";
                string targetDir = Path.Combine(workspaceRoot, designerFolder);
                
                int maxId = 0;

                if (Directory.Exists(targetDir))
                {
                    string[] dirs = Directory.GetDirectories(targetDir);
                    // Match folder names like: 202608_0001D_SS_project
                    Regex regex = new Regex(@"^\d{6}_(\d{4})[A-Z]_");
                    
                    foreach (string dir in dirs)
                    {
                        string dirName = new DirectoryInfo(dir).Name;
                        Match m = regex.Match(dirName);
                        if (m.Success)
                        {
                            int id;
                            if (int.TryParse(m.Groups[1].Value, out id))
                            {
                                if (id > maxId) maxId = id;
                            }
                        }
                    }
                }

                maxId++; // Start at 1 if maxId was 0, or next if found
                
                string preset = PresetComboBox.SelectedItem != null ? PresetComboBox.SelectedItem.ToString() : "";
                string suffix = GetPresetSuffix(preset);

                JobIdInput.Text = maxId.ToString("D4") + suffix;
            }
            catch { }
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

            // Presets matching v1.9.10
            List<string> presets = new List<string>
            {
                "Graphic & Print Design",
                "Social Media Content",
                "Video Production",
                "Brand Identity",
                "E-Commerce"
            };
            PresetComboBox.ItemsSource = presets;
            PresetComboBox.SelectedIndex = 0;

            // Target Platforms
            List<string> platforms = new List<string>
            {
                "Meta / IG Square (1:1 - 1080x1080 RGB)",
                "Meta / IG Story (9:16 - 1080x1920 RGB)",
                "YouTube / Video (16:9 - 1920x1080 RGB)",
                "Print Production (CMYK 300 DPI)",
                "Flexible / Custom Canvas"
            };
            PlatformComboBox.ItemsSource = platforms;
            PlatformComboBox.SelectedIndex = 0;

            // Canvas extensions
            List<string> extensions = new List<string> { ".afdesign", ".psd", ".ai", ".prproj", ".catcomp" };
            TemplateExtensionComboBox.ItemsSource = extensions;
            TemplateExtensionComboBox.SelectedIndex = 0;
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

        private string GetPresetSuffix(string presetName)
        {
            if (string.IsNullOrWhiteSpace(presetName)) return "D";
            if (presetName.Contains("Video")) return "V";
            if (presetName.Contains("Brand")) return "P";
            if (presetName.Contains("Social")) return "S";
            if (presetName.Contains("Commerce")) return "E";
            return "D";
        }

        private List<string> GetPresetFolders(string preset)
        {
            List<string> subFolders = new List<string>();
            string lowerPreset = preset != null ? preset.ToLowerInvariant() : "";
            
            if (lowerPreset.Contains("social"))
            {
                subFolders.AddRange(new[] { "01_Working_Files", "02_Source_Assets", "03_Copywriting", "04_Final_Exports" });
            }
            else if (lowerPreset.Contains("video"))
            {
                subFolders.AddRange(new[] { "01_Project_Files", "02_Footage", "03_Audio", "04_Renders", "05_Final_Exports" });
            }
            else if (lowerPreset.Contains("brand"))
            {
                subFolders.AddRange(new[] { "01_Vector_Master", "02_Brand_Guidelines", "03_Colour_Palettes", "04_Export_Packages" });
            }
            else
            {
                subFolders.AddRange(new[] { "01_Artwork_Design", "02_Artwork_Mockup", "03_Assets", "04_Production" });
            }

            return subFolders;
        }

        private void OnFormInputChanged(object sender, SelectionChangedEventArgs e)
        {
            if (!IsLoaded) return;

            // Update Job ID Suffix automatically when Preset changes
            if (sender == PresetComboBox && PresetComboBox.SelectedItem != null)
            {
                string preset = PresetComboBox.SelectedItem.ToString();
                string suffix = GetPresetSuffix(preset);
                string currentNum = "0001";
                if (!string.IsNullOrWhiteSpace(JobIdInput.Text))
                {
                    Match m = Regex.Match(JobIdInput.Text, @"^(\d+)");
                    if (m.Success) currentNum = m.Groups[1].Value;
                }
                JobIdInput.Text = string.Format("{0}{1}", currentNum, suffix);
            }

            // Update Target Platform Specifications Info Card
            if (PlatformComboBox.SelectedItem != null)
            {
                string platform = PlatformComboBox.SelectedItem.ToString();
                if (platform.Contains("1:1")) PlatformSpecsText.Text = "1080 x 1080 px · 72 DPI · sRGB Color Mode";
                else if (platform.Contains("9:16")) PlatformSpecsText.Text = "1080 x 1920 px · 72 DPI · sRGB Color Mode";
                else if (platform.Contains("16:9")) PlatformSpecsText.Text = "1920 x 1080 px · 72 DPI · sRGB Color Mode";
                else if (platform.Contains("Print")) PlatformSpecsText.Text = "A4 / Custom · 300 DPI · CMYK Color Mode";
                else PlatformSpecsText.Text = "Custom Dimensions · Flexible DPI & Color Mode";
            }

            UpdateLivePreview();
        }

        private void OnFormInputChanged(object sender, TextChangedEventArgs e)
        {
            if (IsLoaded) UpdateLivePreview();
        }

        private void OnFormInputChanged(object sender, RoutedEventArgs e)
        {
            if (IsLoaded) UpdateLivePreview();
        }

        private string GenerateFolderName()
        {
            string datePrefix = DateTime.Now.ToString("yyyyMM");
            string jobId = JobIdInput != null && !string.IsNullOrWhiteSpace(JobIdInput.Text) ? JobIdInput.Text.Trim() : "0001D";
            string selectedBrandFull = SubBrandComboBox != null && SubBrandComboBox.SelectedItem != null ? SubBrandComboBox.SelectedItem.ToString() : "SS";
            string brandCode = GetSubBrandCode(selectedBrandFull);
            string name = ProjectNameInput != null && !string.IsNullOrWhiteSpace(ProjectNameInput.Text) ? ProjectNameInput.Text.Trim() : "project name";

            name = Regex.Replace(name, @"[\\/:*?""<>|]", "_");
            return string.Format("{0}_{1}_{2}_{3}", datePrefix, jobId, brandCode, name);
        }

        private void UpdateLivePreview()
        {
            string folderName = GenerateFolderName();
            string designerFolder = !string.IsNullOrWhiteSpace(currentProfile.DesignerName) ? currentProfile.DesignerName : "Brand";
            string targetPath = Path.Combine(workspaceRoot, designerFolder, folderName);

            PreviewPathText.Text = targetPath;

            string preset = PresetComboBox != null && PresetComboBox.SelectedItem != null ? PresetComboBox.SelectedItem.ToString() : "";
            List<string> presetFolders = GetPresetFolders(preset);

            List<string> lines = new List<string>();
            lines.Add("📁 " + folderName);
            
            foreach (var folder in presetFolders)
            {
                lines.Add(" ├── 📁 " + folder);
                if (folder.StartsWith("01_") && InjectCanvasCheck != null && InjectCanvasCheck.IsChecked == true)
                {
                    lines.Add(" │   └── 📄 master_canvas" + (TemplateExtensionComboBox.SelectedItem ?? ".afdesign"));
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

        private void OnCopyFolderNameClicked(object sender, RoutedEventArgs e)
        {
            string folderName = GenerateFolderName();
            Clipboard.SetText(folderName);
            CreateStatusText.Text = "Copied folder name to clipboard!";
        }

        private void OnCreateProjectClicked(object sender, RoutedEventArgs e)
        {
            string folderName = GenerateFolderName();
            string designerFolder = !string.IsNullOrWhiteSpace(currentProfile.DesignerName) ? currentProfile.DesignerName : "Brand";
            string targetDir = Path.Combine(workspaceRoot, designerFolder, folderName);

            try
            {
                CreateStatusText.Text = "Creating project folders...";
                if (!Directory.Exists(targetDir)) Directory.CreateDirectory(targetDir);

                string preset = PresetComboBox != null && PresetComboBox.SelectedItem != null ? PresetComboBox.SelectedItem.ToString() : "";
                List<string> presetFolders = GetPresetFolders(preset);

                foreach (var folder in presetFolders)
                {
                    string fPath = Path.Combine(targetDir, folder);
                    Directory.CreateDirectory(fPath);

                    // Inject Starter Master Canvas File into the first folder
                    if (folder.StartsWith("01_") && InjectCanvasCheck != null && InjectCanvasCheck.IsChecked == true)
                    {
                        string ext = TemplateExtensionComboBox.SelectedItem != null ? TemplateExtensionComboBox.SelectedItem.ToString() : ".afdesign";
                        string canvasFilePath = Path.Combine(fPath, string.Format("master_canvas{0}", ext));
                        
                        string sampleHeader = string.Format("// SuamiSihat Master Canvas Template\n// Created: {0:yyyy-MM-dd HH:mm}\n// Project: {1}\n", DateTime.Now, folderName);
                        File.WriteAllText(canvasFilePath, sampleHeader);
                    }
                }

                if (IncludeRevisionsCheck.IsChecked == true)
                    Directory.CreateDirectory(Path.Combine(targetDir, "Client_Revisions"));

                if (IncludeRawMediaCheck.IsChecked == true)
                    Directory.CreateDirectory(Path.Combine(targetDir, "RAW_Media"));

                // Create README.md with project brief
                string readmeContent = string.Format(@"# {0}

- **Created**: {1:yyyy-MM-dd HH:mm}
- **Designer**: {2}
- **Job ID**: {3}
- **Preset**: {4}
- **Platform**: {5}
- **Platform Specs**: {6}

## Project Brief & Remarks
{7}
", folderName, DateTime.Now, designerFolder, JobIdInput.Text, PresetComboBox.SelectedItem, PlatformComboBox.SelectedItem, PlatformSpecsText.Text, ProjectDescriptionInput.Text);

                File.WriteAllText(Path.Combine(targetDir, "README.md"), readmeContent);

                CreateStatusText.Text = "Project created successfully!";
                LoadRecentProjects();
                
                // Auto-increment for the next project
                AutoCalculateNextJobId();
                ProjectNameInput.Text = "";

                Process.Start("explorer.exe", targetDir);
            }
            catch (Exception ex)
            {
                MessageBox.Show(string.Format("Could not create project: {0}", ex.Message), "Creation Error", MessageBoxButton.OK, MessageBoxImage.Error);
                CreateStatusText.Text = "Project creation failed.";
            }
        }

        private async void LoadRecentProjects()
        {
            string designerFolder = !string.IsNullOrWhiteSpace(currentProfile.DesignerName) ? currentProfile.DesignerName : "Brand";
            List<DesignerFolderItem> items = await WorkspaceScanner.ListDesignerFoldersAsync(workspaceRoot, designerFolder, "", 10);
            RecentProjectsList.ItemsSource = items;
            RecentProjectsList.DisplayMemberPath = "Project";
        }

        private void OnRecentProjectDoubleClicked(object sender, MouseButtonEventArgs e)
        {
            DesignerFolderItem selected = RecentProjectsList.SelectedItem as DesignerFolderItem;
            if (selected != null && Directory.Exists(selected.FullPath))
            {
                try
                {
                    Process.Start("explorer.exe", selected.FullPath);
                }
                catch { }
            }
        }
    }
}
