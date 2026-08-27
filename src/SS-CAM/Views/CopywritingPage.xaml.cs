using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
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
        private int currentViewMode = 0; // 0 = Split, 1 = RenderedDoc, 2 = EditorOnly

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
                            UpdateLiveSimulation(content);
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
            if (LoadingOverlay != null)
            {
                LoadingOverlay.Visibility = Visibility.Visible;
            }

            try
            {
                discoveredProjects.Clear();
                ProjectSelectorCmb.Items.Clear();

                if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot))
                {
                    TxtFilePath.Text = "Workspace root not found or not configured in Settings.";
                    SetStatusBadge("Not Configured", false);
                    return;
                }

                SetStatusBadge("Scanning...", false);
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
                    SetStatusBadge("Idle", false);
                }
            }
            finally
            {
                if (LoadingOverlay != null)
                {
                    LoadingOverlay.Visibility = Visibility.Collapsed;
                }
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
                UpdateLiveSimulation(string.Empty);
                SetStatusBadge("No Project", false);
                return;
            }

            string filePath = CopywritingDesktopService.GetCopyFilePath(selectedProject.FullPath, selectedProject.ProjectId, workspaceRoot);
            TxtFilePath.Text = filePath ?? "Unknown path";

            string content = CopywritingDesktopService.LoadCopywriting(selectedProject.FullPath, selectedProject.ProjectId, workspaceRoot, selectedProject.Name);

            isInternalChange = true;
            CopyScriptEditor.Text = content;
            isInternalChange = false;

            UpdateMetrics(content);
            UpdateLiveSimulation(content);
            SetStatusBadge("NAS Synced", true);

            // Default to Preview Live Markdown mode (Default View)
            ApplyViewMode(0);
        }

        private void OnModePreviewClicked(object sender, RoutedEventArgs e)
        {
            ApplyViewMode(0);
        }

        private void OnModeSplitClicked(object sender, RoutedEventArgs e)
        {
            ApplyViewMode(1);
        }

        private void OnModeEditClicked(object sender, RoutedEventArgs e)
        {
            ApplyViewMode(2);
        }

        private void OnModeMockupClicked(object sender, RoutedEventArgs e)
        {
            ApplyViewMode(3);
        }

        private void ApplyViewMode(int mode)
        {
            currentViewMode = mode;

            if (mode == 0) // 1. Preview Live Markdown (Default Full-Width View)
            {
                ColEditor.Width = new GridLength(1, GridUnitType.Star);
                ColSplitter.Width = new GridLength(0, GridUnitType.Pixel);
                ColLivePreview.Width = new GridLength(0, GridUnitType.Pixel);

                CopyScriptEditor.Visibility = Visibility.Collapsed;
                RenderedCopyViewer.Visibility = Visibility.Visible;
                LiveGridSplitter.Visibility = Visibility.Collapsed;
                RightPaneContainer.Visibility = Visibility.Collapsed;

                if (RenderedCopyViewer != null && CopyScriptEditor != null)
                {
                    RenderedCopyViewer.Document = MarkdownHelper.ToFlowDocument(CopyScriptEditor.Text ?? string.Empty);
                }

                TxtCanvasHeader.Text = "Rendered Markdown Document (Preview Live)";
                TxtEditorShortcutHint.Visibility = Visibility.Collapsed;

                BtnModePreview.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
                BtnModeSplit.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
                BtnModeEdit.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
                BtnModeMockup.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
            }
            else if (mode == 1) // 2. Split View: Raw Editor (Left) + Live Rendered Markdown (Right) Side-by-Side
            {
                ColEditor.Width = new GridLength(1, GridUnitType.Star);
                ColSplitter.Width = new GridLength(12, GridUnitType.Pixel);
                ColLivePreview.Width = new GridLength(1, GridUnitType.Star);

                CopyScriptEditor.Visibility = Visibility.Visible;
                RenderedCopyViewer.Visibility = Visibility.Collapsed;
                LiveGridSplitter.Visibility = Visibility.Visible;
                RightPaneContainer.Visibility = Visibility.Visible;
                RenderedCopyViewerSplit.Visibility = Visibility.Visible;
                LivePreviewPanel.Visibility = Visibility.Collapsed;

                if (RenderedCopyViewerSplit != null && CopyScriptEditor != null)
                {
                    RenderedCopyViewerSplit.Document = MarkdownHelper.ToFlowDocument(CopyScriptEditor.Text ?? string.Empty);
                }

                TxtCanvasHeader.Text = "Copywriting Studio — Side-by-Side Split View";
                TxtEditorShortcutHint.Visibility = Visibility.Visible;

                BtnModePreview.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
                BtnModeSplit.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
                BtnModeEdit.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
                BtnModeMockup.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
            }
            else if (mode == 2) // 3. Edit Mode: Full Width Monospace Markdown Editor
            {
                ColEditor.Width = new GridLength(1, GridUnitType.Star);
                ColSplitter.Width = new GridLength(0, GridUnitType.Pixel);
                ColLivePreview.Width = new GridLength(0, GridUnitType.Pixel);

                CopyScriptEditor.Visibility = Visibility.Visible;
                RenderedCopyViewer.Visibility = Visibility.Collapsed;
                LiveGridSplitter.Visibility = Visibility.Collapsed;
                RightPaneContainer.Visibility = Visibility.Collapsed;

                TxtCanvasHeader.Text = "Markdown Copy Editor (COPY.md)";
                TxtEditorShortcutHint.Visibility = Visibility.Visible;

                BtnModePreview.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
                BtnModeSplit.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
                BtnModeEdit.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
                BtnModeMockup.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;

                CopyScriptEditor.Focus();
            }
            else // mode == 3: 4. Mockup View: WhatsApp & Meta Ads Live Simulation
            {
                ColEditor.Width = new GridLength(0, GridUnitType.Pixel);
                ColSplitter.Width = new GridLength(0, GridUnitType.Pixel);
                ColLivePreview.Width = new GridLength(1, GridUnitType.Star);

                CopyScriptEditor.Visibility = Visibility.Collapsed;
                RenderedCopyViewer.Visibility = Visibility.Collapsed;
                LiveGridSplitter.Visibility = Visibility.Collapsed;
                RightPaneContainer.Visibility = Visibility.Visible;
                RenderedCopyViewerSplit.Visibility = Visibility.Collapsed;
                LivePreviewPanel.Visibility = Visibility.Visible;

                TxtCanvasHeader.Text = "WhatsApp Broadcast & Meta Ad Live Mockups";
                TxtEditorShortcutHint.Visibility = Visibility.Collapsed;

                BtnModePreview.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
                BtnModeSplit.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
                BtnModeEdit.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
                BtnModeMockup.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;

                UpdateLiveSimulation(CopyScriptEditor.Text ?? string.Empty);
            }
        }

        private void OnCopyScriptTextChanged(object sender, TextChangedEventArgs e)
        {
            if (isInternalChange) return;

            string currentText = CopyScriptEditor.Text ?? string.Empty;
            UpdateMetrics(currentText);
            UpdateLiveSimulation(currentText);

            if (currentViewMode == 0 && RenderedCopyViewer != null)
            {
                RenderedCopyViewer.Document = MarkdownHelper.ToFlowDocument(currentText);
            }
            else if (currentViewMode == 1 && RenderedCopyViewerSplit != null)
            {
                RenderedCopyViewerSplit.Document = MarkdownHelper.ToFlowDocument(currentText);
            }

            SetStatusBadge("Unsaved Changes", false);
        }

        private void UpdateLiveSimulation(string content)
        {
            if (string.IsNullOrWhiteSpace(content))
            {
                if (TxtWhatsAppLiveContent != null)
                    TxtWhatsAppLiveContent.Text = "Drafting your copy in the editor on the left will render formatted WhatsApp & Meta Ad previews here in real time...";
                if (TxtMetaAdLiveContent != null)
                    TxtMetaAdLiveContent.Text = "Primary ad copy will appear here formatted for Facebook & Instagram feed ads.";
                return;
            }

            // Convert Markdown to clean simulated WhatsApp / Ad body
            string clean = CopywritingDesktopService.StripMarkdownToPlainText(content);

            // WhatsApp formatting (simulate bold, emojis, clean line breaks)
            if (TxtWhatsAppLiveContent != null)
            {
                TxtWhatsAppLiveContent.Text = clean.Trim();
            }

            // Meta Ad body formatting (first 400 characters preview with natural wrap)
            if (TxtMetaAdLiveContent != null)
            {
                TxtMetaAdLiveContent.Text = clean.Trim();
            }

            if (TxtWhatsAppTimestamp != null)
            {
                TxtWhatsAppTimestamp.Text = DateTime.Now.ToString("h:mm tt");
            }
        }

        private void SetStatusBadge(string statusText, bool isSuccess)
        {
            if (TxtSaveStatus != null)
            {
                TxtSaveStatus.Text = statusText;
            }

            if (StatusBadgeDot != null)
            {
                if (isSuccess)
                {
                    StatusBadgeDot.Fill = (Brush)FindResource("SystemFillColorSuccessBrush");
                }
                else if (string.Equals(statusText, "Unsaved Changes", StringComparison.OrdinalIgnoreCase))
                {
                    StatusBadgeDot.Fill = (Brush)FindResource("SystemFillColorCautionBrush");
                }
                else
                {
                    StatusBadgeDot.Fill = (Brush)FindResource("TextFillColorSecondaryBrush");
                }
            }
        }

        private void UpdateMetrics(string content)
        {
            int words, chars, lines, readingSec, speakingSec;
            CopywritingDesktopService.ComputeMetrics(content, out words, out chars, out lines, out readingSec, out speakingSec);

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

            if (speakingSec < 60)
            {
                TxtMetricSpeakingTime.Text = string.Format("~{0} sec", speakingSec);
            }
            else
            {
                int sMin = speakingSec / 60;
                int sSec = speakingSec % 60;
                TxtMetricSpeakingTime.Text = string.Format("~{0}m {1}s", sMin, sSec);
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
                // Save local revision snapshot
                CopywritingDesktopService.SaveSnapshot(selectedProject.FullPath, selectedProject.ProjectId, workspaceRoot, text);

                SetStatusBadge(string.Format("Saved {0}", DateTime.Now.ToString("HH:mm:ss")), true);
                if (RenderedCopyViewer != null)
                {
                    RenderedCopyViewer.Document = MarkdownHelper.ToFlowDocument(text);
                }
                NotificationService.ShowSuccess("Script Saved", "Script saved to 03_COPYWRITING/COPY.md on NAS.");
            }
            else
            {
                SetStatusBadge("Save Failed", false);
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
                SetStatusBadge("Markdown Copied", true);
                NotificationService.ShowInfo("Clipboard", "Full Markdown copy script copied to clipboard!");
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CopywritingPage] Copy error: " + ex.Message);
            }
        }

        private void OnCopyPlainTextClicked(object sender, RoutedEventArgs e)
        {
            string text = CopyScriptEditor.Text;
            if (string.IsNullOrEmpty(text))
            {
                MessageBox.Show("No copy text to copy.", "Copywriting Studio", MessageBoxButton.OK, MessageBoxImage.Information);
                return;
            }

            try
            {
                string plain = CopywritingDesktopService.StripMarkdownToPlainText(text);
                ClipboardService.SetText(plain);
                SetStatusBadge("Clean Text Copied", true);
                NotificationService.ShowSuccess("Plain Text Copied", "Clean copy without markdown symbols copied for Ads & WhatsApp!");
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CopywritingPage] Copy plain text error: " + ex.Message);
            }
        }

        // Framework Inserts
        private void OnInsertTikTokClicked(object sender, RoutedEventArgs e)
        {
            InsertPresetFramework("tiktok_3hooks");
        }

        private void OnInsertMetaPasClicked(object sender, RoutedEventArgs e)
        {
            InsertPresetFramework("meta_pas");
        }

        private void OnInsertWhatsAppClicked(object sender, RoutedEventArgs e)
        {
            InsertPresetFramework("whatsapp_broadcast");
        }

        private void OnInsertNeubrutalistClicked(object sender, RoutedEventArgs e)
        {
            InsertPresetFramework("neubrutalist_hook");
        }

        private void OnInsertRetroClicked(object sender, RoutedEventArgs e)
        {
            InsertPresetFramework("retro_story");
        }

        private void OnInsertClaimsClicked(object sender, RoutedEventArgs e)
        {
            InsertPresetFramework("claims");
        }

        // Quick Snippets Inserts
        private void OnSnippetWhatsappLinkClicked(object sender, RoutedEventArgs e)
        {
            InsertSnippetText(Environment.NewLine + "👉 *Klik link untuk WhatsApp Direct:* https://suamisihat.clinic/wsap" + Environment.NewLine);
        }

        private void OnSnippetPromoVoucherClicked(object sender, RoutedEventArgs e)
        {
            InsertSnippetText(Environment.NewLine + "🎟️ *KOD VOUCHER EKSKLUSIF:* `SSPROMO50` (Diskaun RM50 untuk 20 pelanggan terawal)" + Environment.NewLine);
        }

        private void OnSnippetKkmDisclaimerClicked(object sender, RoutedEventArgs e)
        {
            InsertSnippetText(Environment.NewLine + "> ⚠️ *Penafian Kesihatan:* Produk & rawatan ini berdaftar di bawah kawalan pihak berkuasa kesihatan. Kesan mungkin berbeza mengikut individu. Sila rujuk pakar perubatan kami untuk konsultasi penuh." + Environment.NewLine);
        }

        private void OnSnippetHalalGuaranteeClicked(object sender, RoutedEventArgs e)
        {
            InsertSnippetText(Environment.NewLine + "🛡️ *100% DIJAMIN ASLI & HALAL:* Diproses mengikut piawaian GMP & mendapat kelulusan persijilan Halal rasmi." + Environment.NewLine);
        }

        private void OnSnippetUrgencyTimerClicked(object sender, RoutedEventArgs e)
        {
            InsertSnippetText(Environment.NewLine + "⏳ *TAWARAN TERHAD HARI INI SAHAJA!* Slot konsultasi percuma terhad kepada 15 individu terawal." + Environment.NewLine);
        }

        private void InsertPresetFramework(string presetKey)
        {
            string projectTitle = selectedProject != null ? selectedProject.Name : "Project";
            string snippet = CopywritingDesktopService.GetPresetTemplate(presetKey, projectTitle);
            InsertSnippetText(Environment.NewLine + snippet + Environment.NewLine);
        }

        private void InsertSnippetText(string snippet)
        {
            if (currentViewMode == 1)
            {
                ApplyViewMode(0); // Return to split view if currently viewing FlowDocument
            }

            int caret = CopyScriptEditor.CaretIndex;
            string current = CopyScriptEditor.Text ?? string.Empty;

            if (caret >= 0 && caret <= current.Length)
            {
                string updated = current.Insert(caret, snippet);
                CopyScriptEditor.Text = updated;
                CopyScriptEditor.CaretIndex = caret + snippet.Length;
            }
            else
            {
                CopyScriptEditor.Text = current + snippet;
                CopyScriptEditor.CaretIndex = CopyScriptEditor.Text.Length;
            }

            CopyScriptEditor.Focus();
            SetStatusBadge("Unsaved Changes", false);
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
                UpdateLiveSimulation(def);
                SetStatusBadge("Template Reset (Unsaved)", false);
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

