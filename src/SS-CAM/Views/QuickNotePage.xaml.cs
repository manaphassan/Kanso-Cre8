using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Documents;
using System.Windows.Navigation;
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
            System.Windows.Media.Brush brandBrush    = FindResource("FluentBrand80")             as System.Windows.Media.Brush;
            System.Windows.Media.Brush secondaryBrush = FindResource("TextFillColorSecondaryBrush") as System.Windows.Media.Brush;

            if (mainTextBrush != null) doc.Foreground = mainTextBrush;
            if (string.IsNullOrWhiteSpace(markdown)) { NotePreviewViewer.Document = doc; return; }

            string content = QuickNoteService.StripFrontmatter(markdown);
            bool inCodeBlock = false;
            Paragraph codePara = null;

            foreach (string line in content.Split(new char[] { '\n' }))
            {
                string l = line.TrimEnd('\r');

                // ── Code fence (``` ... ```) ───────────────────────────────────
                if (l.TrimStart().StartsWith("```"))
                {
                    inCodeBlock = !inCodeBlock;
                    if (inCodeBlock)
                    {
                        codePara = new Paragraph();
                        codePara.Margin = new Thickness(0, 4, 0, 4);
                        codePara.FontFamily = new System.Windows.Media.FontFamily("Consolas");
                        codePara.FontSize = 12;
                        if (secondaryBrush != null) codePara.Foreground = secondaryBrush;
                    }
                    else if (codePara != null)
                    {
                        doc.Blocks.Add(codePara);
                        codePara = null;
                    }
                    continue;
                }
                if (inCodeBlock)
                {
                    if (codePara != null) codePara.Inlines.Add(new Run(l + "\n"));
                    continue;
                }

                // ── Headings ───────────────────────────────────────────────────
                if (l.StartsWith("### "))
                {
                    Paragraph p = new Paragraph(); p.Margin = new Thickness(0, 6, 0, 2);
                    p.FontSize = 14; p.FontWeight = FontWeights.SemiBold;
                    AddInlines(p.Inlines, l.Substring(4), brandBrush, mainTextBrush);
                    doc.Blocks.Add(p); continue;
                }
                if (l.StartsWith("## "))
                {
                    Paragraph p = new Paragraph(); p.Margin = new Thickness(0, 8, 0, 2);
                    p.FontSize = 16; p.FontWeight = FontWeights.Bold;
                    if (brandBrush != null) p.Foreground = brandBrush;
                    AddInlines(p.Inlines, l.Substring(3), brandBrush, mainTextBrush);
                    doc.Blocks.Add(p); continue;
                }
                if (l.StartsWith("# "))
                {
                    Paragraph p = new Paragraph(); p.Margin = new Thickness(0, 10, 0, 4);
                    p.FontSize = 20; p.FontWeight = FontWeights.Bold;
                    if (brandBrush != null) p.Foreground = brandBrush;
                    AddInlines(p.Inlines, l.Substring(2), brandBrush, mainTextBrush);
                    doc.Blocks.Add(p); continue;
                }

                // ── Horizontal rule ────────────────────────────────────────────
                if (l == "---" || l == "***" || l == "___")
                {
                    doc.Blocks.Add(new BlockUIContainer(new System.Windows.Controls.Separator()));
                    continue;
                }

                // ── Blockquote ─────────────────────────────────────────────────
                if (l.StartsWith("> "))
                {
                    Paragraph p = new Paragraph(); p.Margin = new Thickness(16, 2, 0, 2);
                    p.BorderBrush = brandBrush; p.BorderThickness = new Thickness(3, 0, 0, 0);
                    p.Padding = new Thickness(8, 0, 0, 0);
                    if (secondaryBrush != null) p.Foreground = secondaryBrush;
                    AddInlines(p.Inlines, l.Substring(2), brandBrush, mainTextBrush);
                    doc.Blocks.Add(p); continue;
                }

                // ── Task checkbox ──────────────────────────────────────────────
                if (l.StartsWith("- [ ] ") || l.StartsWith("- [x] ") || l.StartsWith("- [X] "))
                {
                    bool done = l[3] != ' ';
                    List taskList = new List(); taskList.MarkerStyle = TextMarkerStyle.None;
                    Paragraph inner = new Paragraph();
                    inner.Inlines.Add(new Run(done ? "\u2611 " : "\u2610 "));
                    AddInlines(inner.Inlines, l.Substring(6), brandBrush, mainTextBrush);
                    if (done && secondaryBrush != null) inner.TextDecorations = TextDecorations.Strikethrough;
                    taskList.ListItems.Add(new ListItem(inner));
                    doc.Blocks.Add(taskList); continue;
                }

                // ── Bullet list ────────────────────────────────────────────────
                if (l.StartsWith("- ") || l.StartsWith("* "))
                {
                    List list = new List();
                    Paragraph inner = new Paragraph();
                    AddInlines(inner.Inlines, l.Substring(2), brandBrush, mainTextBrush);
                    list.ListItems.Add(new ListItem(inner));
                    doc.Blocks.Add(list); continue;
                }

                // ── Numbered list ──────────────────────────────────────────────
                int dotIdx = l.IndexOf(". ");
                if (dotIdx > 0 && dotIdx < 4)
                {
                    string numStr = l.Substring(0, dotIdx);
                    int dummy;
                    if (int.TryParse(numStr, out dummy))
                    {
                        List list = new List(); list.MarkerStyle = TextMarkerStyle.Decimal;
                        Paragraph inner = new Paragraph();
                        AddInlines(inner.Inlines, l.Substring(dotIdx + 2), brandBrush, mainTextBrush);
                        list.ListItems.Add(new ListItem(inner));
                        doc.Blocks.Add(list); continue;
                    }
                }

                // ── Normal paragraph ───────────────────────────────────────────
                Paragraph para = new Paragraph(); para.Margin = new Thickness(0, 2, 0, 2);
                AddInlines(para.Inlines, l, brandBrush, mainTextBrush);
                doc.Blocks.Add(para);
            }

            if (codePara != null) doc.Blocks.Add(codePara); // unclosed fence
            NotePreviewViewer.Document = doc;
        }

        // ── Inline span parser: bold, italic, code, links ─────────────────────
        private void AddInlines(InlineCollection inlines, string text,
                                System.Windows.Media.Brush brandBrush,
                                System.Windows.Media.Brush mainTextBrush)
        {
            int i = 0;
            while (i < text.Length)
            {
                // Bold+Italic ***text***
                if (i + 2 < text.Length && text[i] == '*' && text[i+1] == '*' && text[i+2] == '*')
                {
                    int end = text.IndexOf("***", i + 3);
                    if (end >= 0)
                    {
                        var r = new Run(text.Substring(i + 3, end - i - 3));
                        r.FontWeight = FontWeights.Bold; r.FontStyle = FontStyles.Italic;
                        inlines.Add(r); i = end + 3; continue;
                    }
                }
                // Bold **text**
                if (i + 1 < text.Length && text[i] == '*' && text[i+1] == '*')
                {
                    int end = text.IndexOf("**", i + 2);
                    if (end >= 0)
                    {
                        var r = new Run(text.Substring(i + 2, end - i - 2));
                        r.FontWeight = FontWeights.Bold; inlines.Add(r); i = end + 2; continue;
                    }
                }
                // Italic *text*
                if (text[i] == '*')
                {
                    int end = text.IndexOf('*', i + 1);
                    if (end >= 0)
                    {
                        var r = new Run(text.Substring(i + 1, end - i - 1));
                        r.FontStyle = FontStyles.Italic; inlines.Add(r); i = end + 1; continue;
                    }
                }
                // Strikethrough ~~text~~
                if (i + 1 < text.Length && text[i] == '~' && text[i+1] == '~')
                {
                    int end = text.IndexOf("~~", i + 2);
                    if (end >= 0)
                    {
                        var r = new Run(text.Substring(i + 2, end - i - 2));
                        r.TextDecorations = TextDecorations.Strikethrough; inlines.Add(r); i = end + 2; continue;
                    }
                }
                // Inline code `text`
                if (text[i] == '`')
                {
                    int end = text.IndexOf('`', i + 1);
                    if (end >= 0)
                    {
                        var r = new Run(text.Substring(i + 1, end - i - 1));
                        r.FontFamily = new System.Windows.Media.FontFamily("Consolas");
                        r.FontSize = 12; inlines.Add(r); i = end + 1; continue;
                    }
                }
                // Link [text](url)
                if (text[i] == '[')
                {
                    int closeBracket = text.IndexOf(']', i + 1);
                    if (closeBracket >= 0 && closeBracket + 1 < text.Length && text[closeBracket + 1] == '(')
                    {
                        int closeParen = text.IndexOf(')', closeBracket + 2);
                        if (closeParen >= 0)
                        {
                            string linkText = text.Substring(i + 1, closeBracket - i - 1);
                            string url      = text.Substring(closeBracket + 2, closeParen - closeBracket - 2);
                            try
                            {
                                Hyperlink hl = new Hyperlink(new Run(linkText));
                                hl.NavigateUri = new Uri(url, UriKind.RelativeOrAbsolute);
                                hl.RequestNavigate += (s, ev) => { System.Diagnostics.Process.Start(ev.Uri.AbsoluteUri); ev.Handled = true; };
                                if (brandBrush != null) hl.Foreground = brandBrush;
                                inlines.Add(hl);
                            }
                            catch { inlines.Add(new Run(string.Format("[{0}]({1})", linkText, url))); }
                            i = closeParen + 1; continue;
                        }
                    }
                }
                // Image ![alt](url) — show alt text in italics
                if (i + 1 < text.Length && text[i] == '!' && text[i+1] == '[')
                {
                    int closeBracket = text.IndexOf(']', i + 2);
                    if (closeBracket >= 0 && closeBracket + 1 < text.Length && text[closeBracket + 1] == '(')
                    {
                        int closeParen = text.IndexOf(')', closeBracket + 2);
                        if (closeParen >= 0)
                        {
                            string alt = text.Substring(i + 2, closeBracket - i - 2);
                            var r = new Run(string.Format("[image: {0}]", alt)); r.FontStyle = FontStyles.Italic;
                            if (brandBrush != null) r.Foreground = brandBrush;
                            inlines.Add(r); i = closeParen + 1; continue;
                        }
                    }
                }
                // Plain character
                int runStart = i;
                while (i < text.Length && text[i] != '*' && text[i] != '`' && text[i] != '[' && text[i] != '~' && !(i + 1 < text.Length && text[i] == '!' && text[i+1] == '['))
                    i++;
                if (i > runStart) inlines.Add(new Run(text.Substring(runStart, i - runStart)));
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

