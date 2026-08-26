using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using SS_CAM.Models;
using SS_CAM.Services;
using SS_CAM.Utilities;

namespace SS_CAM.Views
{
    public partial class CopywritingPage : Page
    {
        private string workspaceRoot = string.Empty;
        private List<ProjectItemInfo> discoveredProjects = new List<ProjectItemInfo>();
        private ProjectItemInfo selectedProject = null;
        private bool isInternalChange = false;

        public class ProjectItemInfo
        {
            public string Name { get; set; }
            public string FullPath { get; set; }
            public string ProjectId { get; set; }

            public override string ToString()
            {
                return Name;
            }
        }

        public CopywritingPage()
        {
            InitializeComponent();
            Loaded += OnPageLoaded;
            Unloaded += OnPageUnloaded;
        }

        private async void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            UserProfile profile = UserProfileService.LoadProfile();
            if (profile != null && !string.IsNullOrWhiteSpace(profile.WorkspaceRoot))
            {
                workspaceRoot = profile.WorkspaceRoot;
            }

            WorkspaceWatcherService.Instance.WorkspaceChanged += OnWorkspaceChanged;
            await LoadProjectsAsync();
        }

        private void OnPageUnloaded(object sender, RoutedEventArgs e)
        {
            try
            {
                WorkspaceWatcherService.Instance.WorkspaceChanged -= OnWorkspaceChanged;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[CopywritingPage] PageUnload error: " + ex.Message);
            }
        }

        private void OnWorkspaceChanged(object sender, WorkspaceChangedEventArgs e)
        {
            if (e.ChangeType == WorkspaceChangeType.ProjectCopywriting)
            {
                Dispatcher.Invoke(delegate
                {
                    try
                    {
                        if (selectedProject != null && string.Equals(e.ProjectPath, selectedProject.FullPath, StringComparison.OrdinalIgnoreCase))
                        {
                            string content = CopywritingDesktopService.LoadCopywriting(selectedProject.FullPath, selectedProject.ProjectId, workspaceRoot, selectedProject.Name);
                            CopyScriptEditor.Text = content;
                            if (RenderedCopyViewer != null)
                            {
                                RenderedCopyViewer.Document = MarkdownHelper.ToFlowDocument(content);
                            }
                            UpdateMetrics(content);
                        }
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine("[CopywritingPage] OnWorkspaceChanged error: " + ex.Message);
                    }
                });
            }
        }

        private async Task LoadProjectsAsync()
        {
            discoveredProjects.Clear();
            ProjectSelectorCmb.Items.Clear();

            if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot))
            {
                TxtFilePath.Text = "Workspace root not found or not configured in Settings.";
                return;
            }

            TxtSaveStatus.Text = "Scanning projects...";
            List<ProjectItemInfo> projects = await Task.Factory.StartNew(delegate
            {
                List<ProjectItemInfo> list = new List<ProjectItemInfo>();
                try
                {
                    Queue<string> queue = new Queue<string>();
                    queue.Enqueue(workspaceRoot);
                    Regex pattern = new Regex(@"^\d{6}_\d[A-Z0-9]*", RegexOptions.IgnoreCase);

                    while (queue.Count > 0)
                    {
                        string current = queue.Dequeue();
                        string[] subdirs;
                        try { subdirs = Directory.GetDirectories(current); }
                        catch (Exception ex) { Debug.WriteLine("[CopywritingPage] GetDirectories: " + ex.Message); continue; }

                        foreach (string sub in subdirs)
                        {
                            string dirName = Path.GetFileName(sub);
                            if (dirName.StartsWith(".") || dirName.Equals("_Team", StringComparison.OrdinalIgnoreCase) || dirName.Equals("#recycle", StringComparison.OrdinalIgnoreCase))
                                continue;

                            if (pattern.IsMatch(dirName))
                            {
                                ProjectItemInfo info = new ProjectItemInfo();
                                info.Name = dirName;
                                info.FullPath = sub;
                                info.ProjectId = dirName;
                                list.Add(info);
                            }
                            else
                            {
                                queue.Enqueue(sub);
                            }
                        }
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine("[CopywritingPage] Scan error: " + ex.Message);
                }

                // Sort descending (newest projects first)
                list.Sort(delegate (ProjectItemInfo a, ProjectItemInfo b)
                {
                    return string.Compare(b.Name, a.Name, StringComparison.OrdinalIgnoreCase);
                });

                return list;
            });

            discoveredProjects = projects;
            foreach (ProjectItemInfo p in discoveredProjects)
            {
                ProjectSelectorCmb.Items.Add(p);
            }

            if (ProjectSelectorCmb.Items.Count > 0)
            {
                ProjectSelectorCmb.SelectedIndex = 0;
            }
            else
            {
                TxtFilePath.Text = "No project vaults discovered in workspace.";
                TxtSaveStatus.Text = "Idle";
            }
        }

        private void OnProjectSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            selectedProject = ProjectSelectorCmb.SelectedItem as ProjectItemInfo;
            if (selectedProject == null)
            {
                TxtFilePath.Text = "No project selected";
                CopyScriptEditor.Text = string.Empty;
                if (RenderedCopyViewer != null)
                {
                    RenderedCopyViewer.Document = MarkdownHelper.ToFlowDocument(string.Empty);
                }
                UpdateMetrics(string.Empty);
                return;
            }

            string filePath = CopywritingDesktopService.GetCopyFilePath(selectedProject.FullPath, selectedProject.ProjectId, workspaceRoot);
            TxtFilePath.Text = filePath ?? "Unknown path";

            string content = CopywritingDesktopService.LoadCopywriting(selectedProject.FullPath, selectedProject.ProjectId, workspaceRoot, selectedProject.Name);

            isInternalChange = true;
            CopyScriptEditor.Text = content;
            isInternalChange = false;

            UpdateMetrics(content);
            TxtSaveStatus.Text = "Loaded from NAS";

            // Always show rendered preview by default
            SetPreviewMode(true);
        }

        private void OnModePreviewClicked(object sender, RoutedEventArgs e)
        {
            SetPreviewMode(true);
        }

        private void OnModeEditClicked(object sender, RoutedEventArgs e)
        {
            SetPreviewMode(false);
        }

        private void SetPreviewMode(bool isPreview)
        {
            if (isPreview)
            {
                if (RenderedCopyViewer != null && CopyScriptEditor != null)
                {
                    RenderedCopyViewer.Document = MarkdownHelper.ToFlowDocument(CopyScriptEditor.Text);
                    RenderedCopyViewer.Visibility = Visibility.Visible;
                    CopyScriptEditor.Visibility = Visibility.Collapsed;
                }
                if (TxtCanvasHeader != null) TxtCanvasHeader.Text = "Rendered Copy Preview";
                if (TxtEditorShortcutHint != null) TxtEditorShortcutHint.Visibility = Visibility.Collapsed;
                if (BtnModePreview != null) BtnModePreview.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
                if (BtnModeEdit != null) BtnModeEdit.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
            }
            else
            {
                if (RenderedCopyViewer != null && CopyScriptEditor != null)
                {
                    RenderedCopyViewer.Visibility = Visibility.Collapsed;
                    CopyScriptEditor.Visibility = Visibility.Visible;
                    CopyScriptEditor.Focus();
                }
                if (TxtCanvasHeader != null) TxtCanvasHeader.Text = "Markdown Copy Script (COPY.md)";
                if (TxtEditorShortcutHint != null) TxtEditorShortcutHint.Visibility = Visibility.Visible;
                if (BtnModePreview != null) BtnModePreview.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
                if (BtnModeEdit != null) BtnModeEdit.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
            }
        }

        private void OnCopyScriptTextChanged(object sender, TextChangedEventArgs e)
        {
            if (isInternalChange) return;

            UpdateMetrics(CopyScriptEditor.Text);
            TxtSaveStatus.Text = "Unsaved changes";
        }

        private void UpdateMetrics(string content)
        {
            int words, chars, lines, readingSec;
            CopywritingDesktopService.ComputeMetrics(content, out words, out chars, out lines, out readingSec);

            TxtMetricWords.Text = string.Format("{0} words", words);
            TxtMetricChars.Text = string.Format("{0} chars", chars);
            TxtMetricLines.Text = string.Format("{0} lines", lines);

            if (readingSec < 60)
            {
                TxtMetricReadingTime.Text = string.Format("~{0} sec", readingSec);
            }
            else
            {
                int min = readingSec / 60;
                int sec = readingSec % 60;
                TxtMetricReadingTime.Text = string.Format("~{0}m {1}s", min, sec);
            }
        }

        private void OnSaveScriptClicked(object sender, RoutedEventArgs e)
        {
            SaveCurrentScript();
        }

        private void SaveCurrentScript()
        {
            if (selectedProject == null)
            {
                MessageBox.Show("Please select a project first.", "No Project Selected", MessageBoxButton.OK, MessageBoxImage.Warning);
                return;
            }

            string text = CopyScriptEditor.Text;
            bool success = CopywritingDesktopService.SaveCopywriting(selectedProject.FullPath, selectedProject.ProjectId, workspaceRoot, text);

            if (success)
            {
                TxtSaveStatus.Text = string.Format("Saved at {0}", DateTime.Now.ToString("HH:mm:ss"));
                if (RenderedCopyViewer != null)
                {
                    RenderedCopyViewer.Document = MarkdownHelper.ToFlowDocument(text);
                }
                NotificationService.ShowSuccess("Script Saved", "Script saved to 03_COPYWRITING/COPY.md on NAS.");
            }
            else
            {
                TxtSaveStatus.Text = "Save failed";
                MessageBox.Show("Failed to write COPY.md to NAS. Please check directory permissions.", "Save Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void OnCopyClipboardClicked(object sender, RoutedEventArgs e)
        {
            string text = CopyScriptEditor.Text;
            if (string.IsNullOrEmpty(text))
            {
                MessageBox.Show("No copy text to copy.", "Copywriting Studio", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            try
            {
                ClipboardService.SetText(text);
                TxtSaveStatus.Text = "Copied to clipboard";
                NotificationService.ShowInfo("Clipboard", "Full copy script copied to clipboard!");
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CopywritingPage] Copy error: " + ex.Message);
            }
        }

        private void OnInsertTikTokClicked(object sender, RoutedEventArgs e)
        {
            InsertPresetFramework("tiktok");
        }

        private void OnInsertMetaPasClicked(object sender, RoutedEventArgs e)
        {
            InsertPresetFramework("meta_pas");
        }

        private void OnInsertClaimsClicked(object sender, RoutedEventArgs e)
        {
            InsertPresetFramework("claims");
        }

        private void InsertPresetFramework(string presetKey)
        {
            SetPreviewMode(false);
            string projectTitle = selectedProject != null ? selectedProject.Name : "Project";
            string snippet = CopywritingDesktopService.GetPresetTemplate(presetKey, projectTitle);

            int caret = CopyScriptEditor.CaretIndex;
            string current = CopyScriptEditor.Text ?? string.Empty;

            if (caret >= 0 && caret <= current.Length)
            {
                string updated = current.Insert(caret, Environment.NewLine + snippet + Environment.NewLine);
                CopyScriptEditor.Text = updated;
                CopyScriptEditor.CaretIndex = caret + snippet.Length + 4;
            }
            else
            {
                CopyScriptEditor.Text = current + Environment.NewLine + snippet;
            }

            TxtSaveStatus.Text = "Framework inserted (Unsaved)";
        }

        private void OnResetTemplateClicked(object sender, RoutedEventArgs e)
        {
            if (MessageBox.Show("Are you sure you want to replace current content with the standard brand copywriting template?", "Reset Template", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)
            {
                string projectTitle = selectedProject != null ? selectedProject.Name : "Project";
                string def = CopywritingDesktopService.GetDefaultTemplate(projectTitle);
                CopyScriptEditor.Text = def;
                if (RenderedCopyViewer != null)
                {
                    RenderedCopyViewer.Document = MarkdownHelper.ToFlowDocument(def);
                }
                TxtSaveStatus.Text = "Template reset (Unsaved)";
            }
        }

        private void OnOpenFolderClicked(object sender, RoutedEventArgs e)
        {
            if (selectedProject != null && Directory.Exists(selectedProject.FullPath))
            {
                try
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = selectedProject.FullPath,
                        UseShellExecute = true
                    });
                }
                catch (Exception ex)
                {
                    Debug.WriteLine("[CopywritingPage] Open folder error: " + ex.Message);
                }
            }
        }

        private async void OnReloadProjectsClicked(object sender, RoutedEventArgs e)
        {
            await LoadProjectsAsync();
        }

        private void OnEditorKeyDown(object sender, KeyEventArgs e)
        {
            if (e.Key == Key.S && (Keyboard.Modifiers & ModifierKeys.Control) == ModifierKeys.Control)
            {
                e.Handled = true;
                SaveCurrentScript();
            }
        }

        private void OnScrollViewerPreviewMouseWheel(object sender, MouseWheelEventArgs e)
        {
            ScrollViewer scroller = (sender as ScrollViewer) ?? PageScrollViewer;
            if (scroller != null)
            {
                scroller.ScrollToVerticalOffset(scroller.VerticalOffset - (e.Delta / 2.0));
                e.Handled = true;
            }
        }
    }
}
