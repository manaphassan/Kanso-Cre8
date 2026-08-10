using System;
using System.Collections.Generic;
using System.IO;
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
        private string workspaceRoot = @"D:\Testing";
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

            // Populate Designer filter with only current user's name (no 'All Designers' noise)
            string myName = !string.IsNullOrWhiteSpace(profile.DesignerName) ? profile.DesignerName : "Brand";
            List<string> designers = new List<string> { myName };
            DesignerFilterCmb.ItemsSource = designers;
            DesignerFilterCmb.SelectedIndex = 0;
            DesignerFilterCmb.Visibility = System.Windows.Visibility.Collapsed; // hide single-item filter

            await PerformSearch();
        }

        private async void OnFilterChanged(object sender, SelectionChangedEventArgs e)
        {
            if (IsLoaded) await PerformSearch();
        }

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
    }

    public class ProjectImageItem
    {
        public string FileName { get; set; }
        public string ImagePath { get; set; }
        public string FullPath { get; set; }
        public string SubFolder { get; set; }
    }
}
