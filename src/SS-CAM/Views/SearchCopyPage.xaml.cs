using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Media;
using System.Windows.Input;

using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class SearchCopyPage : Page
    {
        private string workspaceRoot = string.Empty;
        private List<DesignerFolderItem> allItems = new List<DesignerFolderItem>();
        private DesignerFolderItem selectedItem;
        private string rawReadmeText = "";
        private string cleanedReadmeText = "";
        private ProjectStatusItem currentStatusItem = null;
        private bool isInternalInspectorUpdate = false;

        public SearchCopyPage()
        {
            InitializeComponent();
            Loaded += OnPageLoaded;
            Unloaded += OnPageUnloaded;
        }

        private async void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            UserProfile profile = UserProfileService.LoadProfile();
            if (!string.IsNullOrWhiteSpace(profile.WorkspaceRoot))
            {
                workspaceRoot = profile.WorkspaceRoot;
            }

            WorkspaceWatcherService.Instance.WorkspaceChanged += OnWorkspaceChanged;

            // Populate Designer filter by scanning workspace root
            DesignerFilterCmb.Items.Clear();
            DesignerFilterCmb.Items.Add("All Designers");
            List<DesignerFolderChoice> designers = WorkspaceScanner.GetDesignerFolders(workspaceRoot);
            foreach (DesignerFolderChoice d in designers)
            {
                if (d != null && !string.IsNullOrWhiteSpace(d.Name))
                    DesignerFilterCmb.Items.Add(d.Name);
            }

            // Populate Category filter
            if (CategoryFilterCmb != null)
            {
                CategoryFilterCmb.Items.Clear();
                CategoryFilterCmb.Items.Add("All Categories");
                CategoryFilterCmb.Items.Add("Web Design");
                CategoryFilterCmb.Items.Add("Social Media");
                CategoryFilterCmb.Items.Add("Graphic & Print");
                CategoryFilterCmb.Items.Add("Video Production");
                CategoryFilterCmb.Items.Add("Brand Identity");
                CategoryFilterCmb.Items.Add("E-Commerce");
                CategoryFilterCmb.SelectedIndex = 0;
            }

            // Default to current user's Name or Staff ID if it appears in the list
            bool found = false;
            string targetDesigner = !string.IsNullOrWhiteSpace(profile.DesignerName) ? profile.DesignerName : profile.StaffId;
            if (!string.IsNullOrWhiteSpace(targetDesigner))
            {
                for (int i = 0; i < DesignerFilterCmb.Items.Count; i++)
                {
                    if (string.Equals(DesignerFilterCmb.Items[i].ToString(), targetDesigner, StringComparison.OrdinalIgnoreCase) ||
                        DesignerFilterCmb.Items[i].ToString().IndexOf(targetDesigner, StringComparison.OrdinalIgnoreCase) >= 0)
                    {
                        DesignerFilterCmb.SelectedIndex = i;
                        found = true;
                        break;
                    }
                }
            }
            if (!found) DesignerFilterCmb.SelectedIndex = 0;

            await PerformSearch();
        }

        private void OnPageUnloaded(object sender, RoutedEventArgs e)
        {
            try
            {
                WorkspaceWatcherService.Instance.WorkspaceChanged -= OnWorkspaceChanged;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[SearchCopyPage] PageUnload error: " + ex.Message);
            }
        }

        private void OnWorkspaceChanged(object sender, WorkspaceChangedEventArgs e)
        {
            Dispatcher.Invoke(async delegate
            {
                try
                {
                    if (e.ChangeType == WorkspaceChangeType.ProjectMetadata || e.ChangeType == WorkspaceChangeType.ProjectComments)
                    {
                        if (selectedItem != null && string.Equals(e.ProjectPath, selectedItem.FullPath, StringComparison.OrdinalIgnoreCase))
                        {
                            UpdateReadmeDisplay();
                        }
                    }
                    else if (e.ChangeType == WorkspaceChangeType.ProjectFolderStructure)
                    {
                        await PerformSearch();
                    }
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("[SearchCopyPage] OnWorkspaceChanged: " + ex.Message);
                }
            });
        }

        private void OnScrollViewerPreviewMouseWheel(object sender, MouseWheelEventArgs e)
        {
            var scroller = (sender as ScrollViewer) ?? PageScrollViewer;
            if (scroller != null)
            {
                scroller.ScrollToVerticalOffset(scroller.VerticalOffset - (e.Delta / 2.0));
                e.Handled = true;
            }
        }

        private async void OnFilterChanged(object sender, SelectionChangedEventArgs e)
        {
            if (IsLoaded) await PerformSearch();
        }

        // ─── Edit Brief ──────────────────────────────────────────────────────

        private void OnEditBriefClicked(object sender, RoutedEventArgs e)
        {
            if (selectedItem == null) return;
            // Pre-load the editor with the current raw README (incl. frontmatter if present)
            BriefEditor.Text = rawReadmeText;
            // Hide README viewer; show editor
            RenderedMarkdownViewer.Visibility = Visibility.Collapsed;
            RawMarkdownBox.Visibility = Visibility.Collapsed;
            EditBriefPanel.Visibility = Visibility.Visible;
        }

        private void OnSaveBriefClicked(object sender, RoutedEventArgs e)
        {
            if (selectedItem == null) return;
            string readmePath = Path.Combine(selectedItem.FullPath, "README.md");
            try
            {
                File.WriteAllText(readmePath, BriefEditor.Text, System.Text.Encoding.UTF8);
                rawReadmeText = BriefEditor.Text;
                cleanedReadmeText = StripFrontmatter(rawReadmeText);
                NotificationService.ShowSuccess("README.md Saved", "Project brief successfully updated.");
            }
            catch (Exception ex)
            {
                NotificationService.ShowError("Save Failed", ex.Message);
            }
            OnCancelEditClicked(sender, e);
        }

        private void OnCancelEditClicked(object sender, RoutedEventArgs e)
        {
            EditBriefPanel.Visibility = Visibility.Collapsed;
            // Restore whichever view mode was active
            RenderedMarkdownViewer.Visibility = Visibility.Visible;
            RawMarkdownBox.Visibility = Visibility.Collapsed;
            RenderFormattedMarkdown(cleanedReadmeText);
        }

        // ─── Edit Brief Markdown Toolbar ─────────────────────────────────────

        private void ApplyEditMarkdownWrap(string prefix, string suffix, bool linePrefix)
        {
            if (suffix == null) suffix = prefix;
            int start = BriefEditor.SelectionStart;
            int length = BriefEditor.SelectionLength;

            if (linePrefix)
            {
                int lineStart = start > 0 ? BriefEditor.Text.LastIndexOf('\n', start - 1) : -1;
                lineStart = lineStart < 0 ? 0 : lineStart + 1;
                BriefEditor.Select(lineStart, 0);
                BriefEditor.SelectedText = prefix;
                BriefEditor.SelectionStart = lineStart + prefix.Length + length;
                BriefEditor.Focus();
                return;
            }

            string replacement;
            if (length > 0)
            {
                replacement = prefix + BriefEditor.SelectedText + suffix;
                BriefEditor.SelectedText = replacement;
                BriefEditor.SelectionStart = start + replacement.Length;
            }
            else
            {
                replacement = prefix + "text" + suffix;
                BriefEditor.SelectedText = replacement;
                BriefEditor.Select(start + prefix.Length, 4);
            }
            BriefEditor.Focus();
        }

        private void OnEditMdBold(object sender, RoutedEventArgs e) { ApplyEditMarkdownWrap("**", "**", false); }
        private void OnEditMdItalic(object sender, RoutedEventArgs e) { ApplyEditMarkdownWrap("*", "*", false); }
        private void OnEditMdCode(object sender, RoutedEventArgs e) { ApplyEditMarkdownWrap("`", "`", false); }
        private void OnEditMdH2(object sender, RoutedEventArgs e) { ApplyEditMarkdownWrap("## ", "", true); }
        private void OnEditMdList(object sender, RoutedEventArgs e) { ApplyEditMarkdownWrap("- ", "", true); }

        private async void OnSearchInputChanged(object sender, TextChangedEventArgs e)
        {
            if (IsLoaded) await PerformSearch();
        }

        private async void OnSearchClicked(object sender, RoutedEventArgs e)
        {
            await PerformSearch();
        }

        private async System.Threading.Tasks.Task PerformSearch()
        {
            string selectedDesigner = DesignerFilterCmb.SelectedItem != null ? DesignerFilterCmb.SelectedItem.ToString() : "All Designers";
            if (selectedDesigner == "All Designers") selectedDesigner = "";

            string query = SearchInput != null ? SearchInput.Text.Trim() : "";

            allItems = await WorkspaceScanner.ListDesignerFoldersAsync(workspaceRoot, selectedDesigner, query, 50);

            string selectedCat = CategoryFilterCmb != null && CategoryFilterCmb.SelectedItem != null ? CategoryFilterCmb.SelectedItem.ToString() : "All Categories";
            if (selectedCat != "All Categories")
            {
                allItems = allItems.Where(item =>
                {
                    if (item == null) return false;
                    string name = item.Project ?? "";
                    string path = item.FullPath ?? "";
                    return name.IndexOf(selectedCat, StringComparison.OrdinalIgnoreCase) >= 0 ||
                           path.IndexOf(selectedCat, StringComparison.OrdinalIgnoreCase) >= 0;
                }).ToList();
            }

            ResultsListBox.ItemsSource = allItems;

            // Update sidebar project count label
            TxtProjectCount.Text = allItems.Count == 1 ? "1 project" : string.Format("{0} projects", allItems.Count);

            if (allItems.Count > 0)
            {
                ResultsListBox.SelectedIndex = 0;
            }
            else
            {
                selectedItem = null;
                UpdateReadmeDisplay();
            }
        }

        private void OnListSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (ResultsListBox.SelectedItems.Count > 1)
            {
                BatchActionBar.Visibility = Visibility.Visible;
                TxtBatchCount.Text = string.Format("{0} selected", ResultsListBox.SelectedItems.Count);
                isInternalInspectorUpdate = true;
                BatchStatusCmb.SelectedIndex = 0;
                BatchPriorityCmb.SelectedIndex = 0;
                isInternalInspectorUpdate = false;
            }
            else
            {
                BatchActionBar.Visibility = Visibility.Collapsed;
                selectedItem = ResultsListBox.SelectedItem as DesignerFolderItem;
                UpdateReadmeDisplay();
            }
        }

        private void OnBatchStatusChanged(object sender, SelectionChangedEventArgs e)
        {
            if (isInternalInspectorUpdate || ResultsListBox.SelectedItems.Count <= 1) return;

            ComboBoxItem item = BatchStatusCmb.SelectedItem as ComboBoxItem;
            if (item == null || item.Content == null) return;
            string status = item.Content.ToString();
            if (status.StartsWith("Set Status")) return;

            int count = 0;
            foreach (var sel in ResultsListBox.SelectedItems)
            {
                DesignerFolderItem dfi = sel as DesignerFolderItem;
                if (dfi != null && Directory.Exists(dfi.FullPath))
                {
                    ProjectStatusItem psi = FrontmatterService.ReadStatus(dfi.FullPath);
                    psi.Status = status;
                    FrontmatterService.WriteStatus(psi);
                    count++;
                }
            }

            NotificationService.ShowSuccess("Batch Status Updated", string.Format("Updated status to '{0}' for {1} projects.", status, count));
            isInternalInspectorUpdate = true;
            BatchStatusCmb.SelectedIndex = 0;
            isInternalInspectorUpdate = false;
        }

        private void OnBatchPriorityChanged(object sender, SelectionChangedEventArgs e)
        {
            if (isInternalInspectorUpdate || ResultsListBox.SelectedItems.Count <= 1) return;

            ComboBoxItem item = BatchPriorityCmb.SelectedItem as ComboBoxItem;
            if (item == null || item.Content == null) return;
            string priority = item.Content.ToString();
            if (priority.StartsWith("Set Priority")) return;

            int count = 0;
            foreach (var sel in ResultsListBox.SelectedItems)
            {
                DesignerFolderItem dfi = sel as DesignerFolderItem;
                if (dfi != null && Directory.Exists(dfi.FullPath))
                {
                    ProjectStatusItem psi = FrontmatterService.ReadStatus(dfi.FullPath);
                    psi.Priority = priority;
                    FrontmatterService.WriteStatus(psi);
                    count++;
                }
            }

            NotificationService.ShowSuccess("Batch Priority Updated", string.Format("Updated priority to '{0}' for {1} projects.", priority, count));
            isInternalInspectorUpdate = true;
            BatchPriorityCmb.SelectedIndex = 0;
            isInternalInspectorUpdate = false;
        }

        private void OnBatchDeselectClicked(object sender, RoutedEventArgs e)
        {
            ResultsListBox.SelectedItems.Clear();
            if (ResultsListBox.Items.Count > 0)
            {
                ResultsListBox.SelectedIndex = 0;
            }
        }

        private void UpdateReadmeDisplay()
        {
            if (selectedItem != null && Directory.Exists(selectedItem.FullPath))
            {
                SelectedProjectTitle.Text = selectedItem.Project;
                SelectedProjectPath.Text = selectedItem.FullPath;
                SelectedHighlightBadge.Visibility = Visibility.Visible;

                // Load frontmatter
                currentStatusItem = FrontmatterService.ReadStatus(selectedItem.FullPath);
                UpdateInspectorUI();

                // Load comments
                LoadComments();

                string readmePath = Path.Combine(selectedItem.FullPath, "README.md");
                if (File.Exists(readmePath))
                {
                    try
                    {
                        rawReadmeText = File.ReadAllText(readmePath);
                        cleanedReadmeText = StripFrontmatter(rawReadmeText);
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine("[SearchCopyPage] Read README: " + ex.Message);
                        rawReadmeText = "Could not read README.md.";
                        cleanedReadmeText = rawReadmeText;
                    }
                }
                else
                {
                    rawReadmeText = string.Format("# {0}\n\nNo README.md documentation file present in this folder.", selectedItem.Project);
                    cleanedReadmeText = rawReadmeText;
                }
            }
            else
            {
                SelectedProjectTitle.Text = "None Selected";
                SelectedProjectPath.Text = "Select a folder in the table to inspect.";
                rawReadmeText = "";
                cleanedReadmeText = "";
                currentStatusItem = null;
                UpdateInspectorUI();
                if (CommentsList != null) CommentsList.ItemsSource = null;
                if (TxtCommentCount != null) TxtCommentCount.Text = "0 comments";
            }

            RawMarkdownBox.Text = rawReadmeText;
            RenderFormattedMarkdown(cleanedReadmeText);
        }

        private void UpdateInspectorUI()
        {
            if (InspectorStatusCmb == null) return;

            isInternalInspectorUpdate = true;
            try
            {
                if (currentStatusItem != null)
                {
                    string status = string.IsNullOrWhiteSpace(currentStatusItem.Status) ? "in-progress" : currentStatusItem.Status.ToLowerInvariant();
                    TxtInspectorStatusBadge.Text = status;

                    for (int i = 0; i < InspectorStatusCmb.Items.Count; i++)
                    {
                        ComboBoxItem item = InspectorStatusCmb.Items[i] as ComboBoxItem;
                        if (item != null && string.Equals(item.Content.ToString(), status, StringComparison.OrdinalIgnoreCase))
                        {
                            InspectorStatusCmb.SelectedIndex = i;
                            break;
                        }
                    }

                    string priority = string.IsNullOrWhiteSpace(currentStatusItem.Priority) ? "medium" : currentStatusItem.Priority.ToLowerInvariant();
                    for (int i = 0; i < InspectorPriorityCmb.Items.Count; i++)
                    {
                        ComboBoxItem item = InspectorPriorityCmb.Items[i] as ComboBoxItem;
                        if (item != null && string.Equals(item.Content.ToString(), priority, StringComparison.OrdinalIgnoreCase))
                        {
                            InspectorPriorityCmb.SelectedIndex = i;
                            break;
                        }
                    }

                    TxtInspectorRev.Text = currentStatusItem.Revision.ToString();
                }
                else
                {
                    TxtInspectorStatusBadge.Text = "none";
                    TxtInspectorRev.Text = "0";
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[SearchCopyPage] UpdateInspectorUI: " + ex.Message);
            }
            finally
            {
                isInternalInspectorUpdate = false;
            }
        }

        private void LoadComments()
        {
            if (selectedItem == null || CommentsList == null) return;

            try
            {
                List<ProjectComment> comments = ProjectCommentService.GetComments(selectedItem.FullPath, selectedItem.Project, workspaceRoot);
                CommentsList.ItemsSource = comments;
                TxtCommentCount.Text = string.Format("{0} comment{1}", comments.Count, comments.Count == 1 ? "" : "s");
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[SearchCopyPage] LoadComments: " + ex.Message);
            }
        }

        private string StripFrontmatter(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return "";

            // Regex pattern to strip YAML frontmatter enclosed in --- ... ---
            string pattern = @"^---\s*[\s\S]*?---\s*";
            return Regex.Replace(text, pattern, "").Trim();
        }

        private void RenderFormattedMarkdown(string markdown)
        {
            FlowDocument doc = new FlowDocument();
            doc.FontFamily = new FontFamily("Segoe UI");
            doc.FontSize = 12;
            doc.PagePadding = new Thickness(12);

            if (string.IsNullOrWhiteSpace(markdown))
            {
                doc.Blocks.Add(new Paragraph(new Run("No documentation content available.")) { Foreground = Brushes.Gray });
            }
            else
            {
                string[] lines = markdown.Split(new[] { "\r\n", "\n" }, StringSplitOptions.None);
                foreach (string rawLine in lines)
                {
                    string line = rawLine.Trim();
                    if (string.IsNullOrWhiteSpace(line)) continue;

                    if (line.StartsWith("# "))
                    {
                        Paragraph p = new Paragraph();
                        p.FontSize = 18;
                        p.FontWeight = FontWeights.Bold;
                        p.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"));
                        p.Margin = new Thickness(0, 10, 0, 4);
                        AddFormattedInlines(p, line.Substring(2).Trim());
                        doc.Blocks.Add(p);
                    }
                    else if (line.StartsWith("## "))
                    {
                        Paragraph p = new Paragraph();
                        p.FontSize = 14;
                        p.FontWeight = FontWeights.Bold;
                        p.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"));
                        p.Margin = new Thickness(0, 8, 0, 4);
                        AddFormattedInlines(p, line.Substring(3).Trim());
                        doc.Blocks.Add(p);
                    }
                    else if (line.StartsWith("### "))
                    {
                        Paragraph p = new Paragraph();
                        p.FontSize = 13;
                        p.FontWeight = FontWeights.Bold;
                        p.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#21A1F7"));
                        p.Margin = new Thickness(0, 6, 0, 2);
                        AddFormattedInlines(p, line.Substring(4).Trim());
                        doc.Blocks.Add(p);
                    }
                    else if (line.StartsWith("- ") || line.StartsWith("* "))
                    {
                        Paragraph p = new Paragraph();
                        p.Margin = new Thickness(14, 2, 0, 2);
                        p.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
                        p.Inlines.Add(new Run("• ") { FontWeight = FontWeights.Bold, Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#21A1F7")) });
                        AddFormattedInlines(p, line.Substring(2).Trim());
                        doc.Blocks.Add(p);
                    }
                    else
                    {
                        Paragraph p = new Paragraph();
                        p.Margin = new Thickness(0, 3, 0, 3);
                        p.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
                        AddFormattedInlines(p, line);
                        doc.Blocks.Add(p);
                    }
                }
            }

            RenderedMarkdownViewer.Document = doc;
        }

        private void AddFormattedInlines(Paragraph p, string text)
        {
            if (string.IsNullOrEmpty(text)) return;

            // Simple regex tokenizer for **bold** text
            string pattern = @"(\*\*.*?\*\*)";
            string[] parts = Regex.Split(text, pattern);

            foreach (string part in parts)
            {
                if (part.StartsWith("**") && part.EndsWith("**") && part.Length >= 4)
                {
                    string boldContent = part.Substring(2, part.Length - 4);
                    p.Inlines.Add(new Run(boldContent) { FontWeight = FontWeights.Bold });
                }
                else if (!string.IsNullOrEmpty(part))
                {
                    p.Inlines.Add(new Run(part));
                }
            }
        }

        private void OnModeRenderedClicked(object sender, RoutedEventArgs e)
        {
            RenderedMarkdownViewer.Visibility = Visibility.Visible;
            RawMarkdownBox.Visibility = Visibility.Collapsed;
            ImageGalleryViewer.Visibility = Visibility.Collapsed;

            BtnModeRendered.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"));
            BtnModeRendered.Foreground = Brushes.White;
            BtnModeRaw.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeRaw.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
            BtnModeImages.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeImages.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
        }

        private void OnModeRawClicked(object sender, RoutedEventArgs e)
        {
            RenderedMarkdownViewer.Visibility = Visibility.Collapsed;
            RawMarkdownBox.Visibility = Visibility.Visible;
            ImageGalleryViewer.Visibility = Visibility.Collapsed;

            BtnModeRaw.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"));
            BtnModeRaw.Foreground = Brushes.White;
            BtnModeRendered.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeRendered.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
            BtnModeImages.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeImages.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
        }

        private void OnModeImagesClicked(object sender, RoutedEventArgs e)
        {
            RenderedMarkdownViewer.Visibility = Visibility.Collapsed;
            RawMarkdownBox.Visibility = Visibility.Collapsed;
            ImageGalleryViewer.Visibility = Visibility.Visible;

            BtnModeImages.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"));
            BtnModeImages.Foreground = Brushes.White;
            BtnModeRendered.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeRendered.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
            BtnModeRaw.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeRaw.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));

            LoadProjectImages();
        }

        private async void LoadProjectImages()
        {
            if (selectedItem == null || !Directory.Exists(selectedItem.FullPath))
            {
                ImageGalleryList.ItemsSource = null;
                return;
            }

            string projectPath = selectedItem.FullPath;
            List<ProjectImageItem> images = await System.Threading.Tasks.Task.Factory.StartNew(delegate
            {
                List<ProjectImageItem> list = new List<ProjectImageItem>();
                try
                {
                    string[] exts = new[] { "*.png", "*.jpg", "*.jpeg", "*.gif", "*.bmp", "*.webp", "*.svg" };
                    foreach (string ext in exts)
                    {
                        foreach (string file in Directory.GetFiles(projectPath, ext, SearchOption.AllDirectories))
                        {
                            FileInfo fi = new FileInfo(file);
                            string relDir = fi.DirectoryName.Replace(projectPath, "").TrimStart('\\', '/');
                            System.Windows.Media.ImageSource thumb = ThumbnailCacheService.GetThumbnail(fi.FullName, 320);
                            list.Add(new ProjectImageItem
                            {
                                FileName = fi.Name,
                                ImagePath = fi.FullName,
                                FullPath = fi.FullName,
                                SubFolder = string.IsNullOrWhiteSpace(relDir) ? "Root" : relDir,
                                ThumbnailSource = thumb
                            });
                        }
                    }
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("[SearchCopyPage] LoadImageGallery: " + ex.Message);
                }
                return list;
            });

            ImageGalleryList.ItemsSource = images;
        }

        private void OnImageGalleryDoubleClicked(object sender, MouseButtonEventArgs e)
        {
            ProjectImageItem item = ImageGalleryList.SelectedItem as ProjectImageItem;
            if (item != null && File.Exists(item.FullPath))
            {
                ShowFullImageModal(item.FullPath, item.FileName);
            }
        }

        private void ShowFullImageModal(string imagePath, string title)
        {
            Window win = new Window
            {
                Title = title,
                Width = 900,
                Height = 650,
                WindowStartupLocation = WindowStartupLocation.CenterScreen,
                Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#0F172A"))
            };

            Grid g = new Grid();
            Image img = new Image
            {
                Source = new System.Windows.Media.Imaging.BitmapImage(new Uri(imagePath)),
                Stretch = Stretch.Uniform,
                Margin = new Thickness(16)
            };
            g.Children.Add(img);
            win.Content = g;
            win.ShowDialog();
        }

        private void OnInspectorStatusChanged(object sender, SelectionChangedEventArgs e)
        {
            if (isInternalInspectorUpdate || currentStatusItem == null) return;

            ComboBoxItem item = InspectorStatusCmb.SelectedItem as ComboBoxItem;
            if (item != null && item.Content != null)
            {
                currentStatusItem.Status = item.Content.ToString();
                TxtInspectorStatusBadge.Text = currentStatusItem.Status;
                FrontmatterService.WriteStatus(currentStatusItem);
            }
        }

        private void OnInspectorPriorityChanged(object sender, SelectionChangedEventArgs e)
        {
            if (isInternalInspectorUpdate || currentStatusItem == null) return;

            ComboBoxItem item = InspectorPriorityCmb.SelectedItem as ComboBoxItem;
            if (item != null && item.Content != null)
            {
                currentStatusItem.Priority = item.Content.ToString();
                FrontmatterService.WriteStatus(currentStatusItem);
            }
        }

        private void OnInspectorRevIncClicked(object sender, RoutedEventArgs e)
        {
            if (currentStatusItem == null) return;
            currentStatusItem.Revision++;
            TxtInspectorRev.Text = currentStatusItem.Revision.ToString();
            FrontmatterService.WriteStatus(currentStatusItem);
        }

        private void OnInspectorRevDecClicked(object sender, RoutedEventArgs e)
        {
            if (currentStatusItem == null || currentStatusItem.Revision <= 0) return;
            currentStatusItem.Revision--;
            TxtInspectorRev.Text = currentStatusItem.Revision.ToString();
            FrontmatterService.WriteStatus(currentStatusItem);
        }

        private void OnSignOffClicked(object sender, RoutedEventArgs e)
        {
            if (currentStatusItem == null || selectedItem == null) return;

            currentStatusItem.Status = "done";
            FrontmatterService.WriteStatus(currentStatusItem);
            UpdateReadmeDisplay();
            NotificationService.ShowSuccess("Sign-Off Approved", string.Format("Project '{0}' signed off and marked as Done.", selectedItem.Project), selectedItem.FullPath);
        }

        private void OnRequestRevisionClicked(object sender, RoutedEventArgs e)
        {
            if (currentStatusItem == null || selectedItem == null) return;

            currentStatusItem.Revision++;
            currentStatusItem.Status = "review";
            FrontmatterService.WriteStatus(currentStatusItem);
            UpdateReadmeDisplay();
            NotificationService.ShowWarning("Revision Requested", string.Format("Project '{0}' revision round bumped to #{1}.", selectedItem.Project, currentStatusItem.Revision), selectedItem.FullPath);
        }

        private void OnPostCommentClicked(object sender, RoutedEventArgs e)
        {
            PostNewComment();
        }

        private void OnCommentInputKeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.Enter)
            {
                e.Handled = true;
                PostNewComment();
            }
        }

        private void PostNewComment()
        {
            if (selectedItem == null || CommentInputBox == null) return;

            string content = CommentInputBox.Text.Trim();
            if (string.IsNullOrWhiteSpace(content)) return;

            UserProfile profile = UserProfileService.LoadProfile();
            ProjectComment comment = new ProjectComment();
            comment.Author = (profile != null && !string.IsNullOrWhiteSpace(profile.DesignerName)) ? profile.DesignerName : "Designer";
            comment.Content = content;
            comment.ProjectId = selectedItem.Project;

            bool added = ProjectCommentService.AddComment(selectedItem.FullPath, selectedItem.Project, workspaceRoot, comment);
            if (added)
            {
                CommentInputBox.Text = string.Empty;
                LoadComments();
            }
        }

        private void OnCopyPathClicked(object sender, RoutedEventArgs e)
        {
            if (selectedItem != null)
            {
                ClipboardService.SetText(selectedItem.FullPath);
                MessageBox.Show("Project folder path copied to clipboard.", "Path Copied", MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }

        private async void OnExportHandoverZipClicked(object sender, RoutedEventArgs e)
        {
            if (selectedItem == null || !Directory.Exists(selectedItem.FullPath))
            {
                MessageBox.Show("Select a valid project folder first.", "No Project Selected", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            Microsoft.Win32.SaveFileDialog sfd = new Microsoft.Win32.SaveFileDialog
            {
                Title = "Export Creative Handover Package (ZIP)",
                FileName = string.Format("{0}_Handover.zip", selectedItem.Project),
                Filter = "ZIP Archive (*.zip)|*.zip|All Files (*.*)|*.*",
                DefaultExt = ".zip"
            };

            if (sfd.ShowDialog() == true)
            {
                try
                {
                    ExportPackageOptions options = new ExportPackageOptions
                    {
                        IncludeDeliverables = true,
                        IncludeWipMockups = false,
                        IncludeCopywriting = true,
                        IncludeBriefMarkdown = true,
                        IncludeHtmlSummary = true
                    };

                    ExportPackageResult result = await ExportPackagingService.CreateHandoverPackageAsync(selectedItem.FullPath, sfd.FileName, options);
                    if (result.Success)
                    {
                        NotificationService.ShowSuccess("Handover Exported", string.Format("Packaged {0} files into:\n{1}", result.FileCount, Path.GetFileName(result.ZipFilePath)));
                        if (MessageBox.Show(string.Format("Creative Handover Package created successfully with {0} files.\n\nOpen target directory?", result.FileCount), "Export Complete", MessageBoxButton.YesNo, MessageBoxImage.Information) == MessageBoxResult.Yes)
                        {
                            System.Diagnostics.Process.Start("explorer.exe", string.Format("/select,\"{0}\"", sfd.FileName));
                        }
                    }
                    else
                    {
                        MessageBox.Show(string.Format("Failed to create package: {0}", result.ErrorMessage), "Export Error", MessageBoxButton.OK, MessageBoxImage.Error);
                    }
                }
                catch (Exception ex)
                {
                    MessageBox.Show(string.Format("Export failed: {0}", ex.Message), "Export Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void OnAuditNamingClicked(object sender, RoutedEventArgs e)
        {
            if (selectedItem == null || !Directory.Exists(selectedItem.FullPath))
            {
                MessageBox.Show("Select a valid project folder first.", "No Project Selected", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            AssetNamingAuditReport report = AssetNamingService.AuditProjectAssets(selectedItem.FullPath);
            if (report.TotalAudited == 0)
            {
                MessageBox.Show("No deliverable files found to audit in this project.", "Asset Naming Audit", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            if (report.IssueCount == 0)
            {
                MessageBox.Show(string.Format("All {0} audited deliverable assets follow SuamiSihat canonical naming standards.", report.TotalAudited), "Asset Naming Audit - 100% Compliant", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            else
            {
                StringBuilder sb = new StringBuilder();
                sb.AppendLine(string.Format("Audited {0} assets: {1} compliant, {2} non-standard.\n", report.TotalAudited, report.ValidCount, report.IssueCount));
                sb.AppendLine("Suggested Renames:");
                for (int i = 0; i < Math.Min(5, report.Issues.Count); i++)
                {
                    sb.AppendLine(string.Format("• {0} -> {1}", report.Issues[i].CurrentFileName, report.Issues[i].SuggestedFileName));
                }
                if (report.Issues.Count > 5)
                {
                    sb.AppendLine(string.Format("... and {0} more.", report.Issues.Count - 5));
                }
                sb.AppendLine("\nWould you like to automatically rename non-standard files to match canonical naming conventions?");

                if (MessageBox.Show(sb.ToString(), "Asset Naming Audit & Sanitizer", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)
                {
                    int renamed = AssetNamingService.ApplySuggestedRenames(report.Issues);
                    NotificationService.ShowSuccess("Asset Naming Standardized", string.Format("Renamed {0} files to canonical naming standard.", renamed));
                    LoadProjectImages();
                }
            }
        }

        private void OnCopyWholeFolderClicked(object sender, RoutedEventArgs e)
        {
            if (selectedItem == null || !Directory.Exists(selectedItem.FullPath))
            {
                MessageBox.Show("Select a valid project folder first.", "No Folder Selected", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            using (var dialog = new System.Windows.Forms.FolderBrowserDialog())
            {
                dialog.Description = string.Format("Select target directory to copy project '{0}' into:", selectedItem.Project);
                if (dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                {
                    try
                    {
                        string destinationDir = Path.Combine(dialog.SelectedPath, selectedItem.Project);
                        CopyDirectory(selectedItem.FullPath, destinationDir);
                        MessageBox.Show(string.Format("Project folder successfully copied to:\n{0}", destinationDir), "Folder Copied", MessageBoxButton.OK, MessageBoxImage.Information);
                    }
                    catch (Exception ex)
                    {
                        MessageBox.Show(string.Format("Could not copy project folder: {0}", ex.Message), "Copy Error", MessageBoxButton.OK, MessageBoxImage.Error);
                    }
                }
            }
        }

        private static void CopyDirectory(string sourceDir, string destinationDir)
        {
            DirectoryInfo dir = new DirectoryInfo(sourceDir);
            if (!dir.Exists) throw new DirectoryNotFoundException(string.Format("Source directory not found: {0}", sourceDir));

            Directory.CreateDirectory(destinationDir);

            foreach (FileInfo file in dir.GetFiles())
            {
                string targetFilePath = Path.Combine(destinationDir, file.Name);
                file.CopyTo(targetFilePath, true);
            }

            foreach (DirectoryInfo subDir in dir.GetDirectories())
            {
                string targetSubDir = Path.Combine(destinationDir, subDir.Name);
                CopyDirectory(subDir.FullName, targetSubDir);
            }
        }
    }

    public class ProjectImageItem
    {
        public string FileName { get; set; }
        public string ImagePath { get; set; }
        public string FullPath { get; set; }
        public string SubFolder { get; set; }
        public System.Windows.Media.ImageSource ThumbnailSource { get; set; }
    }
}
