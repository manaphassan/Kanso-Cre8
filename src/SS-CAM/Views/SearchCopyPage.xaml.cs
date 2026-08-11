using System;
using System.Collections.Generic;
using System.IO;
using System.IO.Compression;
using System.Linq;
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

        public SearchCopyPage()
        {
            InitializeComponent();
            Loaded += OnPageLoaded;
        }

        private async void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            UserProfile profile = UserProfileService.LoadProfile();
            if (!string.IsNullOrWhiteSpace(profile.WorkspaceRoot))
            {
                workspaceRoot = profile.WorkspaceRoot;
            }

            // Populate Designer filter by scanning workspace root
            DesignerFilterCmb.Items.Clear();
            DesignerFilterCmb.Items.Add("All Designers");
            List<DesignerFolderChoice> designers = WorkspaceScanner.GetDesignerFolders(workspaceRoot);
            foreach (DesignerFolderChoice d in designers)
                DesignerFilterCmb.Items.Add(d.StaffId);

            // Default to current user's Staff ID if it appears in the list
            bool found = false;
            if (!string.IsNullOrWhiteSpace(profile.StaffId))
            {
                for (int i = 0; i < DesignerFilterCmb.Items.Count; i++)
                {
                    if (string.Equals(DesignerFilterCmb.Items[i].ToString(), profile.StaffId,
                        StringComparison.OrdinalIgnoreCase))
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
                MessageBox.Show("README.md saved successfully.", "Saved",
                    MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show(string.Format("Save failed: {0}", ex.Message), "Error",
                    MessageBoxButton.OK, MessageBoxImage.Error);
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
            selectedItem = ResultsListBox.SelectedItem as DesignerFolderItem;
            UpdateReadmeDisplay();
        }

        private void UpdateReadmeDisplay()
        {
            if (selectedItem != null && Directory.Exists(selectedItem.FullPath))
            {
                SelectedProjectTitle.Text = selectedItem.Project;
                SelectedProjectPath.Text = selectedItem.FullPath;
                SelectedHighlightBadge.Visibility = Visibility.Visible;

                string readmePath = Path.Combine(selectedItem.FullPath, "README.md");
                if (File.Exists(readmePath))
                {
                    try
                    {
                        rawReadmeText = File.ReadAllText(readmePath);
                        cleanedReadmeText = StripFrontmatter(rawReadmeText);
                    }
                    catch
                    {
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
            }

            RawMarkdownBox.Text = rawReadmeText;
            RenderFormattedMarkdown(cleanedReadmeText);
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
            TimelineViewer.Visibility = Visibility.Collapsed;

            BtnModeRendered.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"));
            BtnModeRendered.Foreground = Brushes.White;
            BtnModeRaw.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeRaw.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
            BtnModeImages.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeImages.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
            BtnModeTimeline.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeTimeline.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
        }

        private void OnModeRawClicked(object sender, RoutedEventArgs e)
        {
            RenderedMarkdownViewer.Visibility = Visibility.Collapsed;
            RawMarkdownBox.Visibility = Visibility.Visible;
            ImageGalleryViewer.Visibility = Visibility.Collapsed;
            TimelineViewer.Visibility = Visibility.Collapsed;

            BtnModeRaw.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"));
            BtnModeRaw.Foreground = Brushes.White;
            BtnModeRendered.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeRendered.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
            BtnModeImages.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeImages.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
            BtnModeTimeline.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeTimeline.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
        }

        private void OnModeImagesClicked(object sender, RoutedEventArgs e)
        {
            RenderedMarkdownViewer.Visibility = Visibility.Collapsed;
            RawMarkdownBox.Visibility = Visibility.Collapsed;
            ImageGalleryViewer.Visibility = Visibility.Visible;
            TimelineViewer.Visibility = Visibility.Collapsed;

            BtnModeImages.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"));
            BtnModeImages.Foreground = Brushes.White;
            BtnModeRendered.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeRendered.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
            BtnModeRaw.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeRaw.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
            BtnModeTimeline.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeTimeline.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));

            LoadProjectImages();
        }

        private void OnModeTimelineClicked(object sender, RoutedEventArgs e)
        {
            RenderedMarkdownViewer.Visibility = Visibility.Collapsed;
            RawMarkdownBox.Visibility = Visibility.Collapsed;
            ImageGalleryViewer.Visibility = Visibility.Collapsed;
            TimelineViewer.Visibility = Visibility.Visible;

            BtnModeTimeline.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"));
            BtnModeTimeline.Foreground = Brushes.White;
            BtnModeRendered.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeRendered.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
            BtnModeRaw.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeRaw.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));
            BtnModeImages.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0"));
            BtnModeImages.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B"));

            LoadProjectTimeline();
        }

        private void LoadProjectTimeline()
        {
            TimelineStack.Children.Clear();

            if (selectedItem == null || !Directory.Exists(selectedItem.FullPath))
            {
                TimelineStack.Children.Add(new TextBlock { Text = "Select a project to view its revision timeline.", Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#64748B")), Margin = new Thickness(0, 10, 0, 0) });
                return;
            }

            try
            {
                var files = new DirectoryInfo(selectedItem.FullPath)
                    .GetFiles("*.*", SearchOption.AllDirectories)
                    .Where(f => !f.Name.Equals("README.md", StringComparison.OrdinalIgnoreCase))
                    .OrderByDescending(f => f.LastWriteTime)
                    .Take(30)
                    .ToList();

                if (files.Count == 0)
                {
                    TimelineStack.Children.Add(new TextBlock { Text = "No revision files found in this project folder.", Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#64748B")) });
                    return;
                }

                foreach (var f in files)
                {
                    string relPath = f.FullName.Replace(selectedItem.FullPath, "").TrimStart('\\', '/');
                    double sizeMb = (double)f.Length / (1024 * 1024);
                    string sizeStr = sizeMb >= 1.0 ? string.Format("{0:F2} MB", sizeMb) : string.Format("{0:F0} KB", f.Length / 1024.0);
                    string ext = f.Extension.ToLower();

                    // Determine status tag & dot color
                    string tagText = "Asset";
                    string dotColor = "#043388"; // SS Blue
                    if (relPath.Contains("Client_Revisions")) { tagText = "Revision"; dotColor = "#EAB308"; }
                    else if (relPath.Contains("04_Production") || relPath.Contains("_Deliverables")) { tagText = "Production"; dotColor = "#10B981"; }
                    else if (ext == ".psd" || ext == ".ai" || ext == ".afdesign") { tagText = "Master Canvas"; dotColor = "#6366F1"; }

                    // Build timeline node
                    Grid nodeGrid = new Grid { Margin = new Thickness(0, 0, 0, 16) };
                    nodeGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(28) });
                    nodeGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

                    // Timeline line & dot
                    StackPanel lineCol = new StackPanel { HorizontalAlignment = HorizontalAlignment.Center };
                    Border dot = new Border
                    {
                        Width = 12,
                        Height = 12,
                        CornerRadius = new CornerRadius(6),
                        Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(dotColor)),
                        Margin = new Thickness(0, 4, 0, 0)
                    };
                    lineCol.Children.Add(dot);
                    Grid.SetColumn(lineCol, 0);

                    // Content card
                    Border card = new Border
                    {
                        Background = Brushes.White,
                        BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#E2E8F0")),
                        BorderThickness = new Thickness(1),
                        CornerRadius = new CornerRadius(6),
                        Padding = new Thickness(12, 10, 12, 10)
                    };
                    Grid cardGrid = new Grid();
                    cardGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                    cardGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });

                    StackPanel cardText = new StackPanel();
                    StackPanel titleRow = new StackPanel { Orientation = Orientation.Horizontal };
                    titleRow.Children.Add(new TextBlock { Text = f.Name, FontWeight = FontWeights.Bold, FontSize = 12, Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#0F172A")) });
                    
                    Border badge = new Border
                    {
                        Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(dotColor + "20")),
                        CornerRadius = new CornerRadius(4),
                        Padding = new Thickness(6, 1, 6, 1),
                        Margin = new Thickness(8, 0, 0, 0)
                    };
                    badge.Child = new TextBlock { Text = tagText, FontSize = 10, FontWeight = FontWeights.SemiBold, Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString(dotColor)) };
                    titleRow.Children.Add(badge);
                    cardText.Children.Add(titleRow);

                    string subText = string.Format("{0:yyyy-MM-dd HH:mm}  •  {1}  •  {2}", f.LastWriteTime, sizeStr, relPath);
                    cardText.Children.Add(new TextBlock { Text = subText, FontSize = 11, Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#64748B")), Margin = new Thickness(0, 4, 0, 0) });

                    // Action buttons on card
                    StackPanel btns = new StackPanel { Orientation = Orientation.Horizontal, VerticalAlignment = VerticalAlignment.Center };
                    string targetFile = f.FullName;
                    Button btnOpen = new Button { Content = "Open", Height = 26, Padding = new Thickness(8, 0, 8, 0), Margin = new Thickness(0, 0, 4, 0), FontSize = 11, Cursor = Cursors.Hand };
                    btnOpen.Click += (s, e) => { try { System.Diagnostics.Process.Start(targetFile); } catch { } };

                    Button btnCopy = new Button { Content = "Copy Path", Height = 26, Padding = new Thickness(8, 0, 8, 0), FontSize = 11, Cursor = Cursors.Hand };
                    btnCopy.Click += (s, e) => { Clipboard.SetText(targetFile); MessageBox.Show("Path copied!", "Copied", MessageBoxButton.OK, MessageBoxImage.Information); };

                    btns.Children.Add(btnOpen);
                    btns.Children.Add(btnCopy);

                    Grid.SetColumn(cardText, 0);
                    Grid.SetColumn(btns, 1);
                    cardGrid.Children.Add(cardText);
                    cardGrid.Children.Add(btns);

                    card.Child = cardGrid;
                    Grid.SetColumn(card, 1);

                    nodeGrid.Children.Add(lineCol);
                    nodeGrid.Children.Add(card);

                    TimelineStack.Children.Add(nodeGrid);
                }
            }
            catch (Exception ex)
            {
                TimelineStack.Children.Add(new TextBlock { Text = string.Format("Error loading timeline: {0}", ex.Message), Foreground = Brushes.Red });
            }
        }

        private void LoadProjectImages()
        {
            if (selectedItem == null || !Directory.Exists(selectedItem.FullPath))
            {
                ImageGalleryList.ItemsSource = null;
                return;
            }

            List<ProjectImageItem> images = new List<ProjectImageItem>();
            try
            {
                string[] exts = new[] { "*.png", "*.jpg", "*.jpeg", "*.gif", "*.bmp", "*.webp", "*.svg" };
                foreach (string ext in exts)
                {
                    foreach (string file in Directory.GetFiles(selectedItem.FullPath, ext, SearchOption.AllDirectories))
                    {
                        FileInfo fi = new FileInfo(file);
                        string relDir = fi.DirectoryName.Replace(selectedItem.FullPath, "").TrimStart('\\', '/');
                        images.Add(new ProjectImageItem
                        {
                            FileName = fi.Name,
                            ImagePath = fi.FullName,
                            FullPath = fi.FullName,
                            SubFolder = string.IsNullOrWhiteSpace(relDir) ? "Root" : relDir
                        });
                    }
                }
            }
            catch { }

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
            try
            {
                FileInfo fi = new FileInfo(imagePath);
                var bitmap = new System.Windows.Media.Imaging.BitmapImage();
                bitmap.BeginInit();
                bitmap.UriSource = new Uri(imagePath);
                bitmap.CacheOption = System.Windows.Media.Imaging.BitmapCacheOption.OnLoad;
                bitmap.EndInit();

                double sizeMb = fi.Exists ? (double)fi.Length / (1024 * 1024) : 0;
                string sizeStr = sizeMb >= 1.0 ? string.Format("{0:F2} MB", sizeMb) : string.Format("{0:F0} KB", fi.Length / 1024.0);
                string metaInfo = string.Format("{0} × {1} px  •  {2}  •  {3}", bitmap.PixelWidth, bitmap.PixelHeight, sizeStr, fi.Extension.ToUpper().TrimStart('.'));

                Window win = new Window
                {
                    Title = string.Format("Lightbox — {0}", title),
                    Width = 980,
                    Height = 700,
                    MinWidth = 600,
                    MinHeight = 450,
                    WindowStartupLocation = WindowStartupLocation.CenterScreen,
                    Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#0B1120")),
                    Foreground = Brushes.White
                };

                Grid mainGrid = new Grid();
                mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(50) });
                mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });
                mainGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(54) });

                // Top Header Panel
                Border header = new Border
                {
                    Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B")),
                    Padding = new Thickness(16, 8, 16, 8),
                    BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#334155")),
                    BorderThickness = new Thickness(0, 0, 0, 1)
                };
                StackPanel headerText = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
                headerText.Children.Add(new TextBlock { Text = title, FontSize = 14, FontWeight = FontWeights.Bold, Foreground = Brushes.White });
                headerText.Children.Add(new TextBlock { Text = metaInfo, FontSize = 11, Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#94A3B8")), Margin = new Thickness(0, 2, 0, 0) });
                header.Child = headerText;
                Grid.SetRow(header, 0);

                // Image Viewer Container
                Border imgBorder = new Border { Padding = new Thickness(20), Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#090D16")) };
                Image img = new Image
                {
                    Source = bitmap,
                    Stretch = Stretch.Uniform
                };
                RenderOptions.SetBitmapScalingMode(img, BitmapScalingMode.HighQuality);
                imgBorder.Child = img;
                Grid.SetRow(imgBorder, 1);

                // Bottom Action Footer Bar
                Border footer = new Border
                {
                    Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#1E293B")),
                    Padding = new Thickness(16, 8, 16, 8),
                    BorderBrush = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#334155")),
                    BorderThickness = new Thickness(0, 1, 0, 0)
                };
                StackPanel actionPanel = new StackPanel { Orientation = Orientation.Horizontal, HorizontalAlignment = HorizontalAlignment.Right };

                Button btnCopyPath = new Button { Content = "📋 Copy Path", Height = 32, Padding = new Thickness(12, 0, 12, 0), Margin = new Thickness(0, 0, 8, 0), Cursor = Cursors.Hand };
                btnCopyPath.Click += (s, e) => { Clipboard.SetText(imagePath); MessageBox.Show("Image path copied to clipboard!", "Copied", MessageBoxButton.OK, MessageBoxImage.Information); };

                Button btnOpenApp = new Button { Content = "⚡ Open File", Height = 32, Padding = new Thickness(12, 0, 12, 0), Margin = new Thickness(0, 0, 8, 0), Cursor = Cursors.Hand };
                btnOpenApp.Click += (s, e) => { try { System.Diagnostics.Process.Start(imagePath); } catch { } };

                Button btnClose = new Button { Content = "Close", Height = 32, Padding = new Thickness(16, 0, 16, 0), Cursor = Cursors.Hand };
                btnClose.Click += (s, e) => win.Close();

                actionPanel.Children.Add(btnCopyPath);
                actionPanel.Children.Add(btnOpenApp);
                actionPanel.Children.Add(btnClose);
                footer.Child = actionPanel;
                Grid.SetRow(footer, 2);

                mainGrid.Children.Add(header);
                mainGrid.Children.Add(imgBorder);
                mainGrid.Children.Add(footer);

                win.Content = mainGrid;
                win.ShowDialog();
            }
            catch (Exception ex)
            {
                MessageBox.Show(string.Format("Could not open lightbox: {0}", ex.Message), "Lightbox Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void OnCopyPathClicked(object sender, RoutedEventArgs e)
        {
            if (selectedItem != null)
            {
                Clipboard.SetText(selectedItem.FullPath);
                MessageBox.Show("Project folder path copied to clipboard.", "Path Copied", MessageBoxButton.OK, MessageBoxImage.Information);
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

        private void OnFinalizeProjectClicked(object sender, RoutedEventArgs e)
        {
            if (selectedItem == null || !Directory.Exists(selectedItem.FullPath))
            {
                MessageBox.Show("Select a valid project folder first.", "No Folder Selected", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            MessageBoxResult confirm = MessageBox.Show(string.Format("This will archive deliverables and raw assets for '{0}'.\nProceed?", selectedItem.Project), "Confirm Finalize", MessageBoxButton.YesNo, MessageBoxImage.Question);
            if (confirm != MessageBoxResult.Yes) return;

            try
            {
                // Deliverables mapping
                string delivPath = Path.Combine(selectedItem.FullPath, "04_Production");
                if (!Directory.Exists(delivPath)) delivPath = Path.Combine(selectedItem.FullPath, "03_Final_Exports");
                if (!Directory.Exists(delivPath)) delivPath = Path.Combine(selectedItem.FullPath, "_Deliverables");

                if (Directory.Exists(delivPath))
                {
                    string delivZip = Path.Combine(selectedItem.FullPath, string.Format("{0}_Deliverables.zip", selectedItem.Project));
                    if (!File.Exists(delivZip)) ZipFile.CreateFromDirectory(delivPath, delivZip);
                }

                // Raw Assets mapping
                string rawPath = Path.Combine(selectedItem.FullPath, "01_Artwork_Design");
                if (!Directory.Exists(rawPath)) rawPath = Path.Combine(selectedItem.FullPath, "RAW_Media");
                if (!Directory.Exists(rawPath)) rawPath = Path.Combine(selectedItem.FullPath, "_Raw_Assets");

                if (Directory.Exists(rawPath))
                {
                    string rawZip = Path.Combine(selectedItem.FullPath, string.Format("{0}_Raw_Archive.zip", selectedItem.Project));
                    if (!File.Exists(rawZip)) ZipFile.CreateFromDirectory(rawPath, rawZip);
                }

                MessageBox.Show("Project successfully finalized and archived.", "Success", MessageBoxButton.OK, MessageBoxImage.Information);
                System.Diagnostics.Process.Start("explorer.exe", selectedItem.FullPath);
            }
            catch (Exception ex)
            {
                MessageBox.Show(string.Format("Error finalizing project: {0}", ex.Message), "Finalize Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }

    public class ProjectImageItem
    {
        public string FileName { get; set; }
        public string ImagePath { get; set; }
        public string FullPath { get; set; }
        public string SubFolder { get; set; }
    }
}
