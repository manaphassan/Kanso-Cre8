using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
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
        private string workspaceRoot = string.Empty;
        private UserProfile currentProfile;
        private List<CategoryPreset> _categoryPresets;
        private CategoryPreset _selectedEditingPreset;

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

            ReloadCategoryPresets();
            PopulateDropdowns();
            AutoCalculateNextProjectId();
            UpdateLivePreview();
            LoadRecentProjects();
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

        private void AutoCalculateNextProjectId()
        {
            try
            {
                string designerFolder = !string.IsNullOrWhiteSpace(currentProfile.DesignerName) ? currentProfile.DesignerName : "Brand";
                string targetDir = Path.Combine(workspaceRoot, designerFolder);
                
                int maxId = 0;

                if (Directory.Exists(targetDir))
                {
                    string[] dirs = Directory.GetDirectories(targetDir);
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

                maxId++;
                
                CategoryPreset selectedPreset = GetSelectedCategoryPreset();
                string suffix = selectedPreset != null ? selectedPreset.Suffix : "D";

                ProjectIdInput.Text = maxId.ToString("D4") + suffix;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[ProjectCreatorPage] AutoGenerateNextProjectId: " + ex.Message);
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
            }

            if (PlatformComboBox.SelectedItem != null)
            {
                string platform = PlatformComboBox.SelectedItem.ToString();
                if (platform.Contains("1:1")) PlatformSpecsText.Text = "1080 x 1080 px • 72 DPI • sRGB Color Mode";
                else if (platform.Contains("9:16")) PlatformSpecsText.Text = "1080 x 1920 px • 72 DPI • sRGB Color Mode";
                else if (platform.Contains("16:9")) PlatformSpecsText.Text = "1920 x 1080 px • 72 DPI • sRGB Color Mode";
                else if (platform.Contains("Print")) PlatformSpecsText.Text = "A4 / Custom • 300 DPI • CMYK Color Mode";
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
                for (int i = 0; i < PlatformComboBox.Items.Count; i++)
                {
                    string itemStr = PlatformComboBox.Items[i].ToString();
                    if (itemStr.Contains(tag))
                    {
                        PlatformComboBox.SelectedIndex = i;
                        break;
                    }
                }
            }
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
            string jobId = ProjectIdInput != null && !string.IsNullOrWhiteSpace(ProjectIdInput.Text) ? ProjectIdInput.Text.Trim() : "0001D";
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

            CategoryPreset selectedPreset = GetSelectedCategoryPreset();
            List<string> presetFolders = GetPresetFolders(selectedPreset);

            List<string> lines = new List<string>();
            lines.Add("ðŸ“ " + folderName);
            
            foreach (var folder in presetFolders)
            {
                if (folder.Contains(Path.DirectorySeparatorChar.ToString()) || folder.Contains("/"))
                {
                    string[] parts = folder.Split(new[] { Path.DirectorySeparatorChar, '/' }, StringSplitOptions.RemoveEmptyEntries);
                    lines.Add(" │   └── ðŸ“ " + string.Join("/", parts.Skip(1)));
                }
                else
                {
                    lines.Add(" ├── ðŸ“ " + folder);
                    if (folder.StartsWith("01_") && InjectCanvasCheck != null && InjectCanvasCheck.IsChecked == true)
                    {
                        lines.Add(" │   └── 📄 " + folderName + GetSelectedExtension());
                    }
                }
            }

            if (IncludeRevisionsCheck != null && IncludeRevisionsCheck.IsChecked == true)
            {
                lines.Add(" ├── ðŸ“ Client_Revisions");
            }
            if (IncludeRawMediaCheck != null && IncludeRawMediaCheck.IsChecked == true)
            {
                lines.Add(" ├── ðŸ“ RAW_Media");
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

                CategoryPreset selectedPreset = GetSelectedCategoryPreset();
                List<string> presetFolders = GetPresetFolders(selectedPreset);

                foreach (var folder in presetFolders)
                {
                    string fPath = Path.Combine(targetDir, folder);
                    Directory.CreateDirectory(fPath);

                    if (folder.StartsWith("01_") && InjectCanvasCheck != null && InjectCanvasCheck.IsChecked == true)
                    {
                        string ext = GetSelectedExtension();
                        string canvasFilePath = Path.Combine(fPath, string.Format("{0}{1}", folderName, ext));
                        
                        string sampleHeader = string.Format("// SuamiSihat Master Canvas Template\n// Created: {0:yyyy-MM-dd HH:mm}\n// Project: {1}\n", DateTime.Now, folderName);
                        File.WriteAllText(canvasFilePath, sampleHeader);
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

                string frontmatter = FrontmatterService.BuildDefaultFrontmatter(
                    currentProfile.StaffId ?? "",
                    subBrandCode);

                string readmeContent = string.Format("{0}\n# {1}\n\n- **Created**: {2:yyyy-MM-dd HH:mm}\n- **Designer**: {3}\n- **Project ID**: {4}\n- **Preset**: {5}\n- **Platform**: {6}\n- **Platform Specs**: {7}\n\n## Project Brief & Remarks\n{8}\n",
                    frontmatter,
                    folderName,
                    DateTime.Now,
                    designerFolder,
                    ProjectIdInput.Text,
                    PresetComboBox.SelectedItem,
                    PlatformComboBox.SelectedItem,
                    PlatformSpecsText.Text,
                    ProjectDescriptionInput.Text);

                File.WriteAllText(Path.Combine(targetDir, "README.md"), readmeContent);

                CreateStatusText.Text = "Project created successfully!";
                LoadRecentProjects();
                
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

        private void OnBrowseTargetDirectory(object sender, RoutedEventArgs e)
        {
            var dialog = new System.Windows.Forms.FolderBrowserDialog();
            if (dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
            {
                TargetDirectoryInput.Text = dialog.SelectedPath;
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
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("[ProjectCreatorPage] OpenExplorer: " + ex.Message);
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
                PresetFormTitle.Text = "âœï¸ Edit Category Preset — " + selected.Name;
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
            string val = TemplateExtensionComboBox.Text;
            if (string.IsNullOrWhiteSpace(val))
                return ".afdesign";
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

