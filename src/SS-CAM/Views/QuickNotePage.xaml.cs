using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Input;
using System.Windows.Navigation;
using System.Windows.Threading;
using SS_CAM.Services;
using SS_CAM.Utilities;

namespace SS_CAM.Views
{
    public partial class QuickNotePage : Page
    {
        private List<QuickNoteItem> _notes = new List<QuickNoteItem>();
        private QuickNoteItem _currentNote = null;
        private DispatcherTimer _autoSaveTimer;
        private bool _isLoading = false;
        private int _activeFilter = 0; // 0 = All, 1 = Pinned, 2 = High, 3 = Tasks
        private int _currentViewMode = 0; // 0 = Split, 1 = Edit, 2 = Preview

        public QuickNotePage()
        {
            InitializeComponent();
            Loaded += OnPageLoaded;
            Unloaded += OnPageUnloaded;
        }

        private void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            SetupAutoSaveTimer();
            RefreshNoteList();
        }

        private void OnPageUnloaded(object sender, RoutedEventArgs e)
        {
            if (_autoSaveTimer != null) { _autoSaveTimer.Stop(); _autoSaveTimer = null; }
            SaveCurrentNote();
        }

        private void SetupAutoSaveTimer()
        {
            _autoSaveTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(3) };
            _autoSaveTimer.Tick += delegate { DoAutoSave(); };
        }

        private void RefreshNoteList()
        {
            _notes = QuickNoteService.ListNotes();
            ApplyNoteFilter();
        }

        private void OnNewNoteClicked(object sender, RoutedEventArgs e)
        {
            SaveCurrentNote();
            string path = QuickNoteService.CreateNote();
            _notes = QuickNoteService.ListNotes();
            ApplyNoteFilter();

            // Select the new note (first in list)
            if (_notes.Count > 0)
            {
                NotesList.SelectedIndex = 0;
            }
        }

        private void OnNoteSelected(object sender, SelectionChangedEventArgs e)
        {
            if (_isLoading) return;
            SaveCurrentNote();

            QuickNoteItem selected = NotesList.SelectedItem as QuickNoteItem;
            if (selected == null)
            {
                _currentNote = null;
                PanelEmptyState.Visibility = Visibility.Visible;
                PanelActiveWorkspace.Visibility = Visibility.Collapsed;
                TxtWordCount.Text = "0 words";
                TxtCharCount.Text = "0 chars";
                TxtTaskStats.Visibility = Visibility.Collapsed;
                return;
            }

            _currentNote = selected;
            _isLoading = true;

            // Load clean text WITHOUT raw YAML frontmatter
            NoteEditor.Text = QuickNoteService.StripFrontmatter(selected.Content);

            BtnTogglePin.ToolTip = selected.IsPinned ? "Unpin note from top" : "Pin note to top";
            BtnTogglePin.Appearance = selected.IsPinned ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
            CmbPriority.SelectedIndex = (int)selected.Priority;
            _isLoading = false;

            PanelEmptyState.Visibility = Visibility.Collapsed;
            PanelActiveWorkspace.Visibility = Visibility.Visible;
            TxtSavedStatus.Text = "Saved ✓";

            UpdateTelemetry();
            ApplyViewMode(_currentViewMode);
        }

        private void OnTogglePinClicked(object sender, RoutedEventArgs e)
        {
            if (_currentNote == null) return;
            _currentNote.IsPinned = !_currentNote.IsPinned;
            SaveCurrentNote();
            RefreshNoteListAndKeepSelection(_currentNote.FilePath);
        }

        private void OnPriorityChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_isLoading || _currentNote == null) return;
            int idx = CmbPriority.SelectedIndex;
            if (idx < 0) return;
            NotePriority newPriority = (NotePriority)idx;
            if (_currentNote.Priority == newPriority) return;
            _currentNote.Priority = newPriority;
            SaveCurrentNote();
            RefreshNoteListAndKeepSelection(_currentNote.FilePath);
        }

        private void RefreshNoteListAndKeepSelection(string targetFilePath)
        {
            _isLoading = true;
            _notes = QuickNoteService.ListNotes();
            ApplyNoteFilter();

            if (!string.IsNullOrEmpty(targetFilePath))
            {
                QuickNoteItem found = _notes.Find(delegate(QuickNoteItem n) { return n.FilePath == targetFilePath; });
                if (found != null)
                {
                    NotesList.SelectedItem = found;
                    _currentNote = found;
                    BtnTogglePin.ToolTip = found.IsPinned ? "Unpin note from top" : "Pin note to top";
                    BtnTogglePin.Appearance = found.IsPinned ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
                    CmbPriority.SelectedIndex = (int)found.Priority;
                }
            }
            _isLoading = false;
        }

        private void OnNoteEditorChanged(object sender, TextChangedEventArgs e)
        {
            if (_isLoading || _currentNote == null) return;
            TxtSavedStatus.Text = "Unsaved...";
            UpdateTelemetry();
            if (_currentViewMode == 0 || _currentViewMode == 2)
            {
                UpdateLivePreview();
            }
            if (_autoSaveTimer != null) { _autoSaveTimer.Stop(); _autoSaveTimer.Start(); }
        }

        private void DoAutoSave()
        {
            if (_autoSaveTimer != null) _autoSaveTimer.Stop();
            SaveCurrentNote();
            TxtSavedStatus.Text = "Saved ✓";

            if (_currentNote != null)
            {
                string newTitle = QuickNoteService.ExtractTitle(NoteEditor.Text, _currentNote.Title);
                _currentNote.Title = newTitle;
                _currentNote.ModifiedDisplay = DateTime.Now.ToString("dd MMM yyyy, HH:mm");
                ApplyNoteFilter();
            }
        }

        private void SaveCurrentNote()
        {
            if (_currentNote == null) return;
            QuickNoteService.SaveNote(_currentNote.FilePath, NoteEditor.Text, _currentNote.IsPinned, _currentNote.Priority);
            _currentNote.Content = NoteEditor.Text;
            _currentNote.Snippet = QuickNoteService.ExtractSnippet(NoteEditor.Text, _currentNote.Title);
            int comp, tot;
            QuickNoteService.ExtractTaskStats(NoteEditor.Text, out comp, out tot);
            _currentNote.CompletedTasks = comp;
            _currentNote.TotalTasks = tot;
        }

        private void OnDeleteNoteClicked(object sender, RoutedEventArgs e)
        {
            if (_currentNote == null) return;
            MessageBoxResult result = MessageBox.Show(
                string.Format("Delete \"{0}\"? This cannot be undone.", _currentNote.Title),
                "Delete Note", MessageBoxButton.YesNo, MessageBoxImage.Warning);
            if (result != MessageBoxResult.Yes) return;

            QuickNoteService.DeleteNote(_currentNote.FilePath);
            _currentNote = null;
            RefreshNoteList();

            PanelEmptyState.Visibility = Visibility.Visible;
            PanelActiveWorkspace.Visibility = Visibility.Collapsed;
        }

        // ─── Search & Sidebar Filtering ──────────────────────────────────────

        private void OnSearchNotesChanged(object sender, TextChangedEventArgs e)
        {
            ApplyNoteFilter();
        }

        private void OnFilterAllClicked(object sender, RoutedEventArgs e)
        {
            SetFilter(0);
        }

        private void OnFilterPinnedClicked(object sender, RoutedEventArgs e)
        {
            SetFilter(1);
        }

        private void OnFilterHighClicked(object sender, RoutedEventArgs e)
        {
            SetFilter(2);
        }

        private void OnFilterTasksClicked(object sender, RoutedEventArgs e)
        {
            SetFilter(3);
        }

        private void SetFilter(int filterIndex)
        {
            _activeFilter = filterIndex;
            BtnFilterAll.Appearance = filterIndex == 0 ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
            BtnFilterPinned.Appearance = filterIndex == 1 ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
            BtnFilterHigh.Appearance = filterIndex == 2 ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
            BtnFilterTasks.Appearance = filterIndex == 3 ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
            ApplyNoteFilter();
        }

        private void ApplyNoteFilter()
        {
            if (_notes == null) return;
            string query = (TxtSearchNotes != null && !string.IsNullOrWhiteSpace(TxtSearchNotes.Text))
                ? TxtSearchNotes.Text.Trim().ToLowerInvariant()
                : null;

            List<QuickNoteItem> filtered = _notes.FindAll(delegate(QuickNoteItem n)
            {
                // Filter chips check
                if (_activeFilter == 1 && !n.IsPinned) return false;
                if (_activeFilter == 2 && n.Priority != NotePriority.High) return false;
                if (_activeFilter == 3 && n.TotalTasks == 0) return false;

                // Search query check
                if (!string.IsNullOrEmpty(query))
                {
                    bool matchTitle = n.Title != null && n.Title.ToLowerInvariant().Contains(query);
                    bool matchBody = n.Content != null && n.Content.ToLowerInvariant().Contains(query);
                    if (!matchTitle && !matchBody) return false;
                }

                return true;
            });

            _isLoading = true;
            QuickNoteItem currentlySelected = _currentNote;
            NotesList.ItemsSource = null;
            NotesList.ItemsSource = filtered;

            if (currentlySelected != null)
            {
                QuickNoteItem found = filtered.Find(delegate(QuickNoteItem n) { return n.FilePath == currentlySelected.FilePath; });
                if (found != null) NotesList.SelectedItem = found;
            }

            TxtNoteCount.Text = string.Format("{0} note{1}", filtered.Count, filtered.Count == 1 ? "" : "s");
            _isLoading = false;
        }

        // ─── 3-Way Mode Switcher & Live Split View ────────────────────────────

        private void OnModeSplit(object sender, RoutedEventArgs e)
        {
            ApplyViewMode(0);
        }

        private void OnModeEdit(object sender, RoutedEventArgs e)
        {
            ApplyViewMode(1);
        }

        private void OnModePreview(object sender, RoutedEventArgs e)
        {
            ApplyViewMode(2);
        }

        private void ApplyViewMode(int mode)
        {
            _currentViewMode = mode;
            System.Windows.Media.Brush brandBrush = FindResource("FluentBrand80") as System.Windows.Media.Brush;
            System.Windows.Media.Brush textBrush = FindResource("TextFillColorPrimaryBrush") as System.Windows.Media.Brush;

            BtnModeSplit.Background = System.Windows.Media.Brushes.Transparent;
            BtnModeSplit.Foreground = textBrush ?? System.Windows.Media.Brushes.Black;
            BtnModeSplit.FontWeight = FontWeights.Normal;

            BtnModeEdit.Background = System.Windows.Media.Brushes.Transparent;
            BtnModeEdit.Foreground = textBrush ?? System.Windows.Media.Brushes.Black;
            BtnModeEdit.FontWeight = FontWeights.Normal;

            BtnModePreview.Background = System.Windows.Media.Brushes.Transparent;
            BtnModePreview.Foreground = textBrush ?? System.Windows.Media.Brushes.Black;
            BtnModePreview.FontWeight = FontWeights.Normal;

            if (mode == 0) // Split View (Side-by-Side)
            {
                BtnModeSplit.Background = brandBrush ?? System.Windows.Media.Brushes.DodgerBlue;
                BtnModeSplit.Foreground = System.Windows.Media.Brushes.White;
                BtnModeSplit.FontWeight = FontWeights.SemiBold;

                ColNoteEditor.Width = new GridLength(1, GridUnitType.Star);
                ColNoteSplitter.Width = new GridLength(6, GridUnitType.Pixel);
                ColNotePreview.Width = new GridLength(1, GridUnitType.Star);

                NoteEditor.Visibility = Visibility.Visible;
                NoteGridSplitter.Visibility = Visibility.Visible;
                NotePreviewViewer.Visibility = Visibility.Visible;

                UpdateLivePreview();
            }
            else if (mode == 1) // Edit Only
            {
                BtnModeEdit.Background = brandBrush ?? System.Windows.Media.Brushes.DodgerBlue;
                BtnModeEdit.Foreground = System.Windows.Media.Brushes.White;
                BtnModeEdit.FontWeight = FontWeights.SemiBold;

                ColNoteEditor.Width = new GridLength(1, GridUnitType.Star);
                ColNoteSplitter.Width = new GridLength(0, GridUnitType.Pixel);
                ColNotePreview.Width = new GridLength(0, GridUnitType.Pixel);

                NoteEditor.Visibility = Visibility.Visible;
                NoteGridSplitter.Visibility = Visibility.Collapsed;
                NotePreviewViewer.Visibility = Visibility.Collapsed;
            }
            else if (mode == 2) // Preview Only
            {
                BtnModePreview.Background = brandBrush ?? System.Windows.Media.Brushes.DodgerBlue;
                BtnModePreview.Foreground = System.Windows.Media.Brushes.White;
                BtnModePreview.FontWeight = FontWeights.SemiBold;

                ColNoteEditor.Width = new GridLength(0, GridUnitType.Pixel);
                ColNoteSplitter.Width = new GridLength(0, GridUnitType.Pixel);
                ColNotePreview.Width = new GridLength(1, GridUnitType.Star);

                NoteEditor.Visibility = Visibility.Collapsed;
                NoteGridSplitter.Visibility = Visibility.Collapsed;
                NotePreviewViewer.Visibility = Visibility.Visible;

                UpdateLivePreview();
            }
        }

        private void UpdateLivePreview()
        {
            if (_currentNote == null) return;
            string markdown = NoteEditor.Text ?? "";
            try
            {
                NotePreviewViewer.Document = MarkdownHelper.ToFlowDocument(markdown);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[QuickNotePage] Live preview render error: " + ex.Message);
            }
        }

        private void UpdateTelemetry()
        {
            string text = NoteEditor.Text ?? "";
            int chars = text.Length;

            int words = 0;
            string[] tokens = text.Split(new char[] { ' ', '\r', '\n', '\t' }, StringSplitOptions.RemoveEmptyEntries);
            words = tokens.Length;

            int completed, total;
            QuickNoteService.ExtractTaskStats(text, out completed, out total);

            TxtWordCount.Text = string.Format("{0} word{1}", words, words == 1 ? "" : "s");
            TxtCharCount.Text = string.Format("{0} char{1}", chars, chars == 1 ? "" : "s");

            if (total > 0)
            {
                TxtTaskStats.Text = string.Format("{0}/{1} tasks done", completed, total);
                TxtTaskStats.Visibility = Visibility.Visible;
            }
            else
            {
                TxtTaskStats.Visibility = Visibility.Collapsed;
            }
        }

        // ─── Starter Templates ───────────────────────────────────────────────

        private void OnTemplatesButtonClicked(object sender, RoutedEventArgs e)
        {
            if (BtnTemplates != null && BtnTemplates.ContextMenu != null)
            {
                BtnTemplates.ContextMenu.PlacementTarget = BtnTemplates;
                BtnTemplates.ContextMenu.IsOpen = true;
            }
        }

        private void OnTemplateBriefClicked(object sender, RoutedEventArgs e)
        {
            InsertTemplateText("# Creative Brief: [Project Title]\n\n" +
                "**Client / Brand:** \n" +
                "**Campaign Goal:** Direct Response Conversion\n" +
                "**Target Audience:** \n\n" +
                "## Key Message\n" +
                "- Main problem solved:\n" +
                "- Offer / Hook angle:\n\n" +
                "## Deliverables Checklist\n" +
                "- [ ] 1x Video Ad (9:16 TikTok / Reels)\n" +
                "- [ ] 3x Carousel Feed (1:1 / 4:5)\n" +
                "- [ ] 1x Landing Page Banner\n\n" +
                "## Deadlines & Review\n" +
                "- Draft: \n" +
                "- Final Approval: \n");
        }

        private void OnTemplateFeedbackClicked(object sender, RoutedEventArgs e)
        {
            InsertTemplateText("# Client Feedback — " + DateTime.Now.ToString("dd MMM yyyy") + "\n\n" +
                "**Reviewer:** \n" +
                "**Status:** Needs Revision\n\n" +
                "## Changes Requested\n" +
                "1. **Opening Hook:** \n" +
                "2. **Color Grading:** \n" +
                "3. **Call-To-Action:** \n\n" +
                "## Action Items\n" +
                "- [ ] Apply revisions to video cut\n" +
                "- [ ] Send updated preview link\n" +
                "- [ ] Obtain final client sign-off\n");
        }

        private void OnTemplateMeetingClicked(object sender, RoutedEventArgs e)
        {
            InsertTemplateText("# Creative Sync — " + DateTime.Now.ToString("dd MMM yyyy") + "\n\n" +
                "**Attendees:** \n" +
                "**Topic:** \n\n" +
                "## Discussion Points\n" +
                "- Point 1: \n" +
                "- Point 2: \n\n" +
                "## Decisions Made\n" +
                "- Decision 1:\n\n" +
                "## Next Steps\n" +
                "- [ ] Action item 1 (Assigned to: )\n" +
                "- [ ] Action item 2 (Assigned to: )\n");
        }

        private void OnTemplateTikTokClicked(object sender, RoutedEventArgs e)
        {
            InsertTemplateText("# TikTok & Reels 3-Hook Matrix\n\n" +
                "| Hook # | Angle Type | Opening Line (0-3s) | Visual Retention Driver |\n" +
                "| :--- | :--- | :--- | :--- |\n" +
                "| Hook 1 | Problem Callout | \"Ramai tak perasan punca sebenar...\" | Fast zoom cut |\n" +
                "| Hook 2 | Story & Shock | \"Saya ingat biasa je, rupanya...\" | Close-up expression |\n" +
                "| Hook 3 | Quick Demo | \"Tengok beza lepas 3 hari pakai...\" | Before/after split |\n\n" +
                "## Body Script\n" +
                "- Core Value: \n" +
                "- Social Proof: \n" +
                "- Urgency: \n\n" +
                "## Call-To-Action\n" +
                "> \"Tekan beg kuning sekarang sebelum promosi tamat!\"\n");
        }

        private void OnTemplateChecklistClicked(object sender, RoutedEventArgs e)
        {
            InsertTemplateText("# Task Checklist & Priorities\n\n" +
                "## High Priority (Today)\n" +
                "- [ ] \n" +
                "- [ ] \n\n" +
                "## Medium Priority\n" +
                "- [ ] \n" +
                "- [ ] \n\n" +
                "## Completed\n" +
                "- [x] Setup scratchpad notes\n");
        }

        private void InsertTemplateText(string template)
        {
            if (_currentNote == null) return;
            if (string.IsNullOrWhiteSpace(NoteEditor.Text) || NoteEditor.Text.Trim() == "# New Note")
            {
                NoteEditor.Text = template;
                NoteEditor.CaretIndex = NoteEditor.Text.Length;
            }
            else
            {
                int caret = NoteEditor.CaretIndex;
                NoteEditor.Text = NoteEditor.Text.Insert(caret, "\n\n" + template);
                NoteEditor.CaretIndex = caret + template.Length + 2;
            }
            NoteEditor.Focus();
        }

        // ─── Clean Plain Text Export ─────────────────────────────────────────

        private void OnCopyCleanTextClicked(object sender, RoutedEventArgs e)
        {
            if (string.IsNullOrWhiteSpace(NoteEditor.Text)) return;
            try
            {
                string clean = StripMarkdownFormatting(NoteEditor.Text);
                Clipboard.SetText(clean);
                TxtSavedStatus.Text = "Copied to clipboard!";
                DispatcherTimer t = new DispatcherTimer { Interval = TimeSpan.FromSeconds(2) };
                t.Tick += delegate { TxtSavedStatus.Text = "Saved ✓"; t.Stop(); };
                t.Start();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[QuickNotePage] Copy clean text error: " + ex.Message);
            }
        }

        private string StripMarkdownFormatting(string md)
        {
            if (string.IsNullOrWhiteSpace(md)) return "";
            string text = QuickNoteService.StripFrontmatter(md);
            string[] lines = text.Split(new char[] { '\r', '\n' });
            System.Text.StringBuilder sb = new System.Text.StringBuilder();
            foreach (string l in lines)
            {
                string line = l.Trim();
                if (line.StartsWith("#")) line = line.TrimStart('#', ' ');
                if (line.StartsWith("- [ ] ")) line = "☐ " + line.Substring(6);
                else if (line.StartsWith("- [x] ") || line.StartsWith("- [X] ")) line = "☑ " + line.Substring(6);
                else if (line.StartsWith("- ") || line.StartsWith("* ")) line = "• " + line.Substring(2);
                else if (line.StartsWith("> ")) line = "\"" + line.Substring(2) + "\"";

                line = line.Replace("**", "").Replace("*", "").Replace("~~", "").Replace("`", "");
                sb.AppendLine(line);
            }
            return sb.ToString().Trim();
        }

        // ─── Keyboard Shortcuts ──────────────────────────────────────────────

        private void OnPageKeyDown(object sender, KeyEventArgs e)
        {
            if ((Keyboard.Modifiers & ModifierKeys.Control) == ModifierKeys.Control)
            {
                if (e.Key == Key.N)
                {
                    e.Handled = true;
                    OnNewNoteClicked(this, null);
                }
                else if (e.Key == Key.S)
                {
                    e.Handled = true;
                    DoAutoSave();
                }
            }
        }

        // ─── Markdown Toolbar ─────────────────────────────────────────────────

        private void ApplyMarkdownWrap(string prefix, string suffix, bool linePrefix)
        {
            if (suffix == null) suffix = prefix;
            int start = NoteEditor.SelectionStart;
            int length = NoteEditor.SelectionLength;

            if (linePrefix)
            {
                int lineStart = NoteEditor.Text.LastIndexOf('\n', start > 0 ? start - 1 : 0);
                lineStart = lineStart < 0 ? 0 : lineStart + 1;
                NoteEditor.Select(lineStart, 0);
                NoteEditor.SelectedText = prefix;
                NoteEditor.SelectionStart = lineStart + prefix.Length + (length > 0 ? length : 0);
                NoteEditor.Focus();
                return;
            }

            string replacement;
            if (length > 0)
            {
                replacement = prefix + NoteEditor.SelectedText + suffix;
                NoteEditor.SelectedText = replacement;
                NoteEditor.SelectionStart = start + replacement.Length;
            }
            else
            {
                replacement = prefix + "text" + suffix;
                NoteEditor.SelectedText = replacement;
                NoteEditor.Select(start + prefix.Length, 4);
            }
            NoteEditor.Focus();
        }

        private void OnNMdBold(object sender, RoutedEventArgs e)      { ApplyMarkdownWrap("**", "**", false); }
        private void OnNMdItalic(object sender, RoutedEventArgs e)    { ApplyMarkdownWrap("*", "*", false); }
        private void OnNMdStrike(object sender, RoutedEventArgs e)    { ApplyMarkdownWrap("~~", "~~", false); }
        private void OnNMdCode(object sender, RoutedEventArgs e)      { ApplyMarkdownWrap("`", "`", false); }
        private void OnNMdH1(object sender, RoutedEventArgs e)        { ApplyMarkdownWrap("# ", "", true); }
        private void OnNMdH2(object sender, RoutedEventArgs e)        { ApplyMarkdownWrap("## ", "", true); }
        private void OnNMdH3(object sender, RoutedEventArgs e)        { ApplyMarkdownWrap("### ", "", true); }
        private void OnNMdList(object sender, RoutedEventArgs e)      { ApplyMarkdownWrap("- ", "", true); }
        private void OnNMdNumList(object sender, RoutedEventArgs e)   { ApplyMarkdownWrap("1. ", "", true); }
        private void OnNMdCheck(object sender, RoutedEventArgs e)     { ApplyMarkdownWrap("- [ ] ", "", true); }
        private void OnNMdQuote(object sender, RoutedEventArgs e)     { ApplyMarkdownWrap("> ", "", true); }
        private void OnNMdCodeBlock(object sender, RoutedEventArgs e)
        {
            int pos = NoteEditor.SelectionStart;
            string insert = "\n```\ncode\n```\n";
            NoteEditor.Text = NoteEditor.Text.Insert(pos, insert);
            NoteEditor.Select(pos + 5, 4);
            NoteEditor.Focus();
        }
        private void OnNMdHR(object sender, RoutedEventArgs e)
        {
            int pos = NoteEditor.SelectionStart;
            string insert = "\n---\n";
            NoteEditor.Text = NoteEditor.Text.Insert(pos, insert);
            NoteEditor.SelectionStart = pos + insert.Length;
            NoteEditor.Focus();
        }
        private void OnNMdLink(object sender, RoutedEventArgs e)
        {
            int start = NoteEditor.SelectionStart;
            string selected = NoteEditor.SelectedText;
            string replacement = string.IsNullOrWhiteSpace(selected)
                ? "[link text](url)"
                : string.Format("[{0}](url)", selected);
            NoteEditor.SelectedText = replacement;
            NoteEditor.SelectionStart = start + replacement.Length;
            NoteEditor.Focus();
        }
        private void OnNMdImage(object sender, RoutedEventArgs e)
        {
            int start = NoteEditor.SelectionStart;
            string selected = NoteEditor.SelectedText;
            string replacement = string.IsNullOrWhiteSpace(selected)
                ? "![alt text](url)"
                : string.Format("![{0}](url)", selected);
            NoteEditor.SelectedText = replacement;
            NoteEditor.SelectionStart = start + replacement.Length;
            NoteEditor.Focus();
        }

        // ─── Markdown Guide Drawer ───────────────────────────────────────────

        private void OnToggleMarkdownHelp(object sender, RoutedEventArgs e)
        {
            if (PanelMarkdownHelp == null) return;
            PanelMarkdownHelp.Visibility = PanelMarkdownHelp.Visibility == Visibility.Visible
                ? Visibility.Collapsed
                : Visibility.Visible;
        }

        private void OnCloseMarkdownHelp(object sender, RoutedEventArgs e)
        {
            if (PanelMarkdownHelp != null)
                PanelMarkdownHelp.Visibility = Visibility.Collapsed;
        }
    }
}

