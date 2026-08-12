using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Threading;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class QuickNotePage : Page
    {
        private List<QuickNoteItem> _notes = new List<QuickNoteItem>();
        private QuickNoteItem _currentNote = null;
        private DispatcherTimer _autoSaveTimer;
        private bool _isLoading = false;

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
            NotesList.ItemsSource = null;
            NotesList.ItemsSource = _notes;
            TxtNoteCount.Text = string.Format("{0} note{1}", _notes.Count, _notes.Count == 1 ? "" : "s");
        }

        private void OnNewNoteClicked(object sender, RoutedEventArgs e)
        {
            SaveCurrentNote();
            string path = QuickNoteService.CreateNote();
            RefreshNoteList();

            // Select the new note (it will be first in the list — newest)
            if (_notes.Count > 0) NotesList.SelectedIndex = 0;
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
                NoteEditor.Visibility = Visibility.Collapsed;
                NotePreviewViewer.Visibility = Visibility.Collapsed;
                return;
            }

            _currentNote = selected;
            _isLoading = true;
            NoteEditor.Text = selected.Content;
            BtnTogglePin.ToolTip = selected.IsPinned ? "Unpin note from top" : "Pin note to top";
            BtnTogglePin.Appearance = selected.IsPinned ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
            CmbPriority.SelectedIndex = (int)selected.Priority;
            _isLoading = false;

            PanelEmptyState.Visibility = Visibility.Collapsed;
            NoteEditor.Visibility = Visibility.Visible;
            NotePreviewViewer.Visibility = Visibility.Collapsed;
            TxtSavedStatus.Text = "";

            // Reset to Edit mode
            UpdateModeVisuals(isEdit: true);
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
            NotesList.ItemsSource = null;
            NotesList.ItemsSource = _notes;
            TxtNoteCount.Text = string.Format("{0} note{1}", _notes.Count, _notes.Count == 1 ? "" : "s");

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

        private void UpdateModeVisuals(bool isEdit)
        {
            System.Windows.Media.Brush brandBrush = FindResource("FluentBrand80") as System.Windows.Media.Brush;
            System.Windows.Media.Brush textBrush = FindResource("TextFillColorPrimaryBrush") as System.Windows.Media.Brush;

            if (isEdit)
            {
                if (brandBrush != null) BtnModeEdit.Background = brandBrush;
                BtnModeEdit.Foreground = System.Windows.Media.Brushes.White;
                BtnModeEdit.FontWeight = FontWeights.SemiBold;

                BtnModePreview.Background = System.Windows.Media.Brushes.Transparent;
                if (textBrush != null) BtnModePreview.Foreground = textBrush;
                BtnModePreview.FontWeight = FontWeights.Normal;
            }
            else
            {
                if (brandBrush != null) BtnModePreview.Background = brandBrush;
                BtnModePreview.Foreground = System.Windows.Media.Brushes.White;
                BtnModePreview.FontWeight = FontWeights.SemiBold;

                BtnModeEdit.Background = System.Windows.Media.Brushes.Transparent;
                if (textBrush != null) BtnModeEdit.Foreground = textBrush;
                BtnModeEdit.FontWeight = FontWeights.Normal;
            }
        }

        private void OnNoteEditorChanged(object sender, TextChangedEventArgs e)
        {
            if (_isLoading || _currentNote == null) return;
            TxtSavedStatus.Text = "Unsaved...";
            if (_autoSaveTimer != null) { _autoSaveTimer.Stop(); _autoSaveTimer.Start(); }
        }

        private void DoAutoSave()
        {
            if (_autoSaveTimer != null) _autoSaveTimer.Stop();
            SaveCurrentNote();
            TxtSavedStatus.Text = "Saved \u2713";

            // Update the title in the list
            if (_currentNote != null)
            {
                string newTitle = QuickNoteService.ExtractTitle(NoteEditor.Text, _currentNote.Title);
                _currentNote.Title = newTitle;
                _isLoading = true;
                int idx = NotesList.SelectedIndex;
                NotesList.ItemsSource = null;
                NotesList.ItemsSource = _notes;
                NotesList.SelectedIndex = idx;
                _isLoading = false;
            }
        }

        private void SaveCurrentNote()
        {
            if (_currentNote == null) return;
            QuickNoteService.SaveNote(_currentNote.FilePath, NoteEditor.Text, _currentNote.IsPinned, _currentNote.Priority);
            _currentNote.Content = NoteEditor.Text;
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
            NoteEditor.Visibility = Visibility.Collapsed;
            NotePreviewViewer.Visibility = Visibility.Collapsed;
        }

        // ─── View Mode Toggle ─────────────────────────────────────────────────

        private void OnModeEdit(object sender, RoutedEventArgs e)
        {
            if (_currentNote == null) return;
            NoteEditor.Visibility = Visibility.Visible;
            NotePreviewViewer.Visibility = Visibility.Collapsed;
            UpdateModeVisuals(isEdit: true);
        }

        private void OnModePreview(object sender, RoutedEventArgs e)
        {
            if (_currentNote == null) return;
            RenderPreview(NoteEditor.Text);
            NoteEditor.Visibility = Visibility.Collapsed;
            NotePreviewViewer.Visibility = Visibility.Visible;
            UpdateModeVisuals(isEdit: false);
        }

        private void RenderPreview(string markdown)
        {
            FlowDocument doc = new FlowDocument();
            doc.FontFamily = new System.Windows.Media.FontFamily("Segoe UI");
            doc.FontSize = 13;
            doc.PagePadding = new Thickness(0);

            System.Windows.Media.Brush mainTextBrush = FindResource("TextFillColorPrimaryBrush") as System.Windows.Media.Brush;
            if (mainTextBrush != null)
            {
                doc.Foreground = mainTextBrush;
            }

            if (string.IsNullOrWhiteSpace(markdown)) { NotePreviewViewer.Document = doc; return; }

            // Hide frontmatter in preview (only show when in edit mode)
            string content = QuickNoteService.StripFrontmatter(markdown);

            foreach (string line in content.Split(new char[] { '\n' }))
            {
                string l = line.TrimEnd('\r');
                Paragraph para = new Paragraph();
                para.Margin = new Thickness(0, 2, 0, 2);

                if (l.StartsWith("### "))
                {
                    para.FontSize = 14; para.FontWeight = FontWeights.SemiBold;
                    para.Inlines.Add(l.Substring(4));
                }
                else if (l.StartsWith("## "))
                {
                    para.FontSize = 16; para.FontWeight = FontWeights.Bold;
                    System.Windows.Media.Brush brandBrush = FindResource("FluentBrand80") as System.Windows.Media.Brush;
                    if (brandBrush != null) para.Foreground = brandBrush;
                    para.Inlines.Add(l.Substring(3));
                }
                else if (l.StartsWith("# "))
                {
                    para.FontSize = 20; para.FontWeight = FontWeights.Bold;
                    System.Windows.Media.Brush brandBrush = FindResource("FluentBrand80") as System.Windows.Media.Brush;
                    if (brandBrush != null) para.Foreground = brandBrush;
                    para.Inlines.Add(l.Substring(2));
                }
                else if (l == "---")
                {
                    doc.Blocks.Add(new BlockUIContainer(new Separator()));
                    continue;
                }
                else if (l.StartsWith("- "))
                {
                    List list = new List();
                    ListItem li = new ListItem(new Paragraph(new Run(l.Substring(2))));
                    list.ListItems.Add(li);
                    doc.Blocks.Add(list);
                    continue;
                }
                else
                {
                    para.Inlines.Add(l);
                }
                doc.Blocks.Add(para);
            }
            NotePreviewViewer.Document = doc;
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

        private void OnNMdBold(object sender, RoutedEventArgs e) { ApplyMarkdownWrap("**", "**", false); }
        private void OnNMdItalic(object sender, RoutedEventArgs e) { ApplyMarkdownWrap("*", "*", false); }
        private void OnNMdCode(object sender, RoutedEventArgs e) { ApplyMarkdownWrap("`", "`", false); }
        private void OnNMdH2(object sender, RoutedEventArgs e) { ApplyMarkdownWrap("## ", "", true); }
        private void OnNMdList(object sender, RoutedEventArgs e) { ApplyMarkdownWrap("- ", "", true); }
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
            int length = NoteEditor.SelectionLength;
            string selected = NoteEditor.SelectedText;
            string replacement = string.IsNullOrWhiteSpace(selected)
                ? "[link text](url)"
                : string.Format("[{0}](url)", selected);
            NoteEditor.SelectedText = replacement;
            NoteEditor.SelectionStart = start + replacement.Length;
            NoteEditor.Focus();
        }
    }
}
