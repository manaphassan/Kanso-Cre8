using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using SS_CAM.Models;
using SS_CAM.Services;
using SS_CAM.Utilities;
using Wpf.Ui.Controls;

namespace SS_CAM.Views
{
    public partial class TaskManagerPage : Page
    {
        private string _workspaceRoot = "";
        private List<ProjectStatusItem> _allProjects = new List<ProjectStatusItem>();
        private ProjectStatusItem _editingProject = null;

        private bool _isPopulatingFilter = false;
        private Point _dragStartPoint;
        private bool _isDragging = false;

        public TaskManagerPage()
        {
            InitializeComponent();
            Loaded += OnPageLoaded;
        }

        private void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            try
            {
                var profile = UserProfileService.LoadProfile();
                _workspaceRoot = profile != null ? profile.WorkspaceRoot : "";
                PopulateDesignerFilter();
                LoadProjects();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("TaskManager PageLoad error: " + ex);
            }
        }

        private void PopulateDesignerFilter()
        {
            try
            {
                _isPopulatingFilter = true;
                DesignerFilterTM.Items.Clear();
                DesignerFilterTM.Items.Add("All Designers");

                if (!string.IsNullOrWhiteSpace(_workspaceRoot))
                {
                    List<DesignerFolderChoice> designers = WorkspaceScanner.GetDesignerFolders(_workspaceRoot);
                    if (designers != null)
                    {
                        foreach (DesignerFolderChoice d in designers)
                        {
                            if (d != null && !string.IsNullOrEmpty(d.StaffId))
                                DesignerFilterTM.Items.Add(d.StaffId);
                        }
                    }
                }

                DesignerFilterTM.SelectedIndex = 0;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("PopulateFilter error: " + ex);
            }
            finally
            {
                _isPopulatingFilter = false;
            }
        }

        private void LoadProjects()
        {
            try
            {
                _allProjects.Clear();

                if (string.IsNullOrWhiteSpace(_workspaceRoot) ||
                    !System.IO.Directory.Exists(_workspaceRoot))
                {
                    UpdateBoard();
                    return;
                }

                // Scan all project folders via WorkspaceScanner then read their frontmatter
                List<DesignerFolderItem> folders = WorkspaceScanner.ListDesignerFolders(_workspaceRoot, "", "", 500);
                if (folders != null)
                {
                    foreach (DesignerFolderItem folder in folders)
                    {
                        if (folder != null && !string.IsNullOrEmpty(folder.FullPath))
                        {
                            ProjectStatusItem item = FrontmatterService.ReadStatus(folder.FullPath);
                            if (item != null)
                                _allProjects.Add(item);
                        }
                    }
                }

                UpdateMetricSummaryCards();
                ApplyFiltersAndUpdateBoard();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("LoadProjects error: " + ex);
                UpdateBoard();
            }
        }

        private void UpdateMetricSummaryCards()
        {
            try
            {
                int total = _allProjects.Count;
                int inProgressCount = 0;
                int reviewCount = 0;
                int urgentCount = 0;
                int doneCount = 0;

                foreach (ProjectStatusItem p in _allProjects)
                {
                    if (p == null) continue;
                    string status = (p.Status ?? "").ToLowerInvariant();
                    string priority = (p.Priority ?? "").ToLowerInvariant();
                    string deadlineDisp = p.DeadlineDisplay ?? "";

                    if (status == "in-progress") inProgressCount++;
                    else if (status == "review") reviewCount++;
                    else if (status == "done") doneCount++;

                    if (priority == "urgent" || deadlineDisp.StartsWith("Overdue", StringComparison.OrdinalIgnoreCase))
                    {
                        urgentCount++;
                    }
                }

                if (MetricTotalProjects != null) MetricTotalProjects.Text = total.ToString();
                if (MetricInProgress != null) MetricInProgress.Text = inProgressCount.ToString();
                if (MetricReview != null) MetricReview.Text = reviewCount.ToString();
                if (MetricUrgent != null) MetricUrgent.Text = urgentCount.ToString();
                if (MetricDone != null) MetricDone.Text = doneCount.ToString();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("UpdateMetricSummaryCards error: " + ex);
            }
        }

        private void ApplyFiltersAndUpdateBoard()
        {
            try
            {
                string designerFilter = DesignerFilterTM.SelectedItem != null
                    ? DesignerFilterTM.SelectedItem.ToString() : "All Designers";
                string priorityFilter = "";
                if (PriorityFilter != null && PriorityFilter.SelectedItem is ComboBoxItem)
                {
                    string sel = ((ComboBoxItem)PriorityFilter.SelectedItem).Content.ToString();
                    if (sel != "All Priorities") priorityFilter = sel;
                }
                string searchQuery = TxtSearchQuery != null ? TxtSearchQuery.Text.Trim().ToLowerInvariant() : "";

                List<ProjectStatusItem> filtered = new List<ProjectStatusItem>();
                foreach (ProjectStatusItem p in _allProjects)
                {
                    if (p == null) continue;
                    if (designerFilter != "All Designers" &&
                        !string.Equals(p.Designer, designerFilter, StringComparison.OrdinalIgnoreCase)) continue;
                    if (!string.IsNullOrEmpty(priorityFilter) &&
                        !string.Equals(p.Priority, priorityFilter, StringComparison.OrdinalIgnoreCase)) continue;
                    if (!string.IsNullOrEmpty(searchQuery))
                    {
                        string projName = (p.Project ?? "").ToLowerInvariant();
                        string clientName = (p.Client ?? "").ToLowerInvariant();
                        if (!projName.Contains(searchQuery) && !clientName.Contains(searchQuery)) continue;
                    }
                    filtered.Add(p);
                }

                SortProjects(filtered);
                UpdateBoard(filtered);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("ApplyFilters error: " + ex);
            }
        }

        private void SortProjects(List<ProjectStatusItem> list)
        {
            if (list == null || list.Count <= 1) return;

            string sortSel = "Oldest First";
            if (SortFilter != null && SortFilter.SelectedItem is ComboBoxItem)
            {
                sortSel = ((ComboBoxItem)SortFilter.SelectedItem).Content.ToString();
            }

            if (sortSel.Contains("Oldest First"))
            {
                list.Sort((a, b) => a.ParsedCreatedDate.CompareTo(b.ParsedCreatedDate));
            }
            else if (sortSel.Contains("Newest First"))
            {
                list.Sort((a, b) => b.ParsedCreatedDate.CompareTo(a.ParsedCreatedDate));
            }
            else if (sortSel.Contains("Deadline"))
            {
                list.Sort((a, b) =>
                {
                    DateTime dtA, dtB;
                    bool hasA = DateTime.TryParse(a.Deadline, out dtA);
                    bool hasB = DateTime.TryParse(b.Deadline, out dtB);
                    if (hasA && hasB) return dtA.CompareTo(dtB);
                    if (hasA) return -1;
                    if (hasB) return 1;
                    return 0;
                });
            }
            else if (sortSel.Contains("Priority"))
            {
                list.Sort((a, b) => PriorityRank(b.Priority).CompareTo(PriorityRank(a.Priority)));
            }
        }

        private static int PriorityRank(string priority)
        {
            if (string.IsNullOrWhiteSpace(priority)) return 0;
            string p = priority.ToLowerInvariant();
            if (p == "urgent") return 4;
            if (p == "high") return 3;
            if (p == "medium") return 2;
            if (p == "low") return 1;
            return 0;
        }

        private void UpdateBoard(List<ProjectStatusItem> projects = null)
        {
            try
            {
                if (projects == null) projects = _allProjects;

                List<ProjectStatusItem> backlog = new List<ProjectStatusItem>();
                List<ProjectStatusItem> inProgress = new List<ProjectStatusItem>();
                List<ProjectStatusItem> review = new List<ProjectStatusItem>();
                List<ProjectStatusItem> done = new List<ProjectStatusItem>();
                List<ProjectStatusItem> other = new List<ProjectStatusItem>();

                foreach (ProjectStatusItem p in projects)
                {
                    if (p == null) continue;
                    string s = (p.Status ?? "").ToLowerInvariant();
                    if (s == "backlog") backlog.Add(p);
                    else if (s == "in-progress") inProgress.Add(p);
                    else if (s == "review") review.Add(p);
                    else if (s == "done") done.Add(p);
                    else other.Add(p);   // on-hold, untracked, empty
                }

                if (ListBacklog != null) ListBacklog.ItemsSource = backlog;
                if (ListInProgress != null) ListInProgress.ItemsSource = inProgress;
                if (ListReview != null) ListReview.ItemsSource = review;
                if (ListDone != null) ListDone.ItemsSource = done;
                if (ListOther != null) ListOther.ItemsSource = other;

                if (CountBacklog != null) CountBacklog.Text = backlog.Count.ToString();
                if (CountInProgress != null) CountInProgress.Text = inProgress.Count.ToString();
                if (CountReview != null) CountReview.Text = review.Count.ToString();
                if (CountDone != null) CountDone.Text = done.Count.ToString();
                if (CountOther != null) CountOther.Text = other.Count.ToString();

                if (TxtTaskCount != null) TxtTaskCount.Text = string.Format("{0} projects", projects.Count);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("UpdateBoard error: " + ex);
            }
        }

        private void OnTMSearchQueryChanged(object sender, TextChangedEventArgs e)
        {
            if (!IsLoaded || _isPopulatingFilter) return;
            ApplyFiltersAndUpdateBoard();
        }

        private void OnTMResetFiltersClicked(object sender, RoutedEventArgs e)
        {
            if (TxtSearchQuery != null) TxtSearchQuery.Text = "";
            if (DesignerFilterTM != null && DesignerFilterTM.Items.Count > 0) DesignerFilterTM.SelectedIndex = 0;
            if (PriorityFilter != null && PriorityFilter.Items.Count > 0) PriorityFilter.SelectedIndex = 0;
            if (SortFilter != null && SortFilter.Items.Count > 0) SortFilter.SelectedIndex = 0;
            ApplyFiltersAndUpdateBoard();
        }

        private void OnTMRefreshClicked(object sender, RoutedEventArgs e)
        {
            LoadProjects();
        }

        private void OnTMFilterChanged(object sender, SelectionChangedEventArgs e)
        {
            if (!IsLoaded || _isPopulatingFilter) return;
            ApplyFiltersAndUpdateBoard();
        }

        // ─── Drag and Drop Implementation ──────────────────────────────────────

        private void OnCardPreviewMouseLeftButtonDown(object sender, MouseButtonEventArgs e)
        {
            _dragStartPoint = e.GetPosition(null);
            _isDragging = false;
        }

        private void OnCardMouseMove(object sender, MouseEventArgs e)
        {
            if (e.LeftButton != MouseButtonState.Pressed || _isDragging) return;

            Point mousePos = e.GetPosition(null);
            Vector diff = _dragStartPoint - mousePos;

            if (Math.Abs(diff.X) > SystemParameters.MinimumHorizontalDragDistance ||
                Math.Abs(diff.Y) > SystemParameters.MinimumVerticalDragDistance)
            {
                FrameworkElement card = sender as FrameworkElement;
                if (card == null) return;

                ProjectStatusItem item = card.DataContext as ProjectStatusItem;
                if (item == null) return;

                _isDragging = true;
                try
                {
                    DataObject dragData = new DataObject("ProjectStatusItem", item);
                    DragDrop.DoDragDrop(card, dragData, DragDropEffects.Move);
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("DragDrop error: " + ex.Message);
                }
                finally
                {
                    _isDragging = false;
                }
            }
        }

        private void OnColumnDragOver(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent("ProjectStatusItem"))
            {
                e.Effects = DragDropEffects.Move;
                e.Handled = true;
            }
            else
            {
                e.Effects = DragDropEffects.None;
            }
        }

        private void OnColumnDragLeave(object sender, DragEventArgs e)
        {
        }

        private void OnColumnDrop(object sender, DragEventArgs e)
        {
            try
            {
                if (e.Data.GetDataPresent("ProjectStatusItem"))
                {
                    ProjectStatusItem item = e.Data.GetData("ProjectStatusItem") as ProjectStatusItem;
                    FrameworkElement targetEl = sender as FrameworkElement;
                    string targetStatus = targetEl != null ? targetEl.Tag as string : null;

                    if (item != null && !string.IsNullOrEmpty(targetStatus) && !string.Equals(item.Status, targetStatus, StringComparison.OrdinalIgnoreCase))
                    {
                        item.Status = targetStatus;
                        FrontmatterService.WriteStatus(item);

                        UpdateMetricSummaryCards();
                        ApplyFiltersAndUpdateBoard();
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("ColumnDrop error: " + ex.Message);
            }
        }

        // ─── Project Card Click → Open Detail Drawer ───────────────────────────

        private void OnProjectCardClicked(object sender, RoutedEventArgs e)
        {
            if (_isDragging) return;

            FrameworkElement el = sender as FrameworkElement;
            if (el == null) return;
            ProjectStatusItem item = el.DataContext as ProjectStatusItem;
            if (item == null) return;

            _editingProject = item;
            DetailProjectName.Text = item.Project;

            // Set Status combobox
            SelectComboItemByContent(DetailStatus, item.Status ?? "backlog");
            SelectComboItemByContent(DetailPriority, item.Priority ?? "medium");
            DetailDeadline.Text = item.Deadline ?? "";
            if (DetailCreatedDate != null) DetailCreatedDate.Text = item.CreatedDateDisplay;
            DetailRevision.Text = item.Revision.ToString();

            // Load README body content notes
            string body = FrontmatterService.ReadBody(item.FullPath);
            DetailReadmePreview.Text = body ?? "";
            DetailReadmeRendered.Document = MarkdownHelper.ToFlowDocument(body);

            // Default to Preview Mode
            SwitchToReadmePreviewMode();

            DetailSaveStatus.Text = "";
            DetailPanel.Visibility = Visibility.Visible;
        }

        private void OnReadmeModePreviewClicked(object sender, RoutedEventArgs e)
        {
            SwitchToReadmePreviewMode();
        }

        private void OnReadmeModeEditClicked(object sender, RoutedEventArgs e)
        {
            SwitchToReadmeEditMode();
        }

        private void SwitchToReadmePreviewMode()
        {
            if (DetailReadmePreview != null && DetailReadmeRendered != null)
            {
                DetailReadmeRendered.Document = MarkdownHelper.ToFlowDocument(DetailReadmePreview.Text);
                DetailReadmeRendered.Visibility = Visibility.Visible;
                DetailReadmePreview.Visibility = Visibility.Collapsed;
            }
            if (BtnModePreview != null) BtnModePreview.Appearance = ControlAppearance.Primary;
            if (BtnModeEdit != null) BtnModeEdit.Appearance = ControlAppearance.Secondary;
        }

        private void SwitchToReadmeEditMode()
        {
            if (DetailReadmePreview != null && DetailReadmeRendered != null)
            {
                DetailReadmeRendered.Visibility = Visibility.Collapsed;
                DetailReadmePreview.Visibility = Visibility.Visible;
            }
            if (BtnModePreview != null) BtnModePreview.Appearance = ControlAppearance.Secondary;
            if (BtnModeEdit != null) BtnModeEdit.Appearance = ControlAppearance.Primary;
        }

        private void OnOpenRawReadmeClicked(object sender, RoutedEventArgs e)
        {
            if (_editingProject == null || string.IsNullOrWhiteSpace(_editingProject.FullPath)) return;
            string readmePath = System.IO.Path.Combine(_editingProject.FullPath, "README.md");

            try
            {
                if (!System.IO.File.Exists(readmePath))
                {
                    FrontmatterService.WriteStatus(_editingProject);
                }

                if (System.IO.File.Exists(readmePath))
                {
                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                    {
                        FileName = readmePath,
                        UseShellExecute = true
                    });
                }
            }
            catch (Exception ex)
            {
                DetailSaveStatus.Text = "Cannot open README: " + ex.Message;
            }
        }

        private void OnDetailClose(object sender, RoutedEventArgs e)
        {
            DetailPanel.Visibility = Visibility.Collapsed;
            _editingProject = null;
        }

        private void OnRevisionDecrementClicked(object sender, RoutedEventArgs e)
        {
            int val;
            if (int.TryParse(DetailRevision.Text, out val))
            {
                val = Math.Max(0, val - 1);
                DetailRevision.Text = val.ToString();
            }
            else
            {
                DetailRevision.Text = "0";
            }
        }

        private void OnRevisionIncrementClicked(object sender, RoutedEventArgs e)
        {
            int val;
            if (!int.TryParse(DetailRevision.Text, out val))
            {
                val = 0;
            }
            val++;
            DetailRevision.Text = val.ToString();
        }

        private void OnDetailSave(object sender, RoutedEventArgs e)
        {
            if (_editingProject == null) return;

            if (DetailStatus.SelectedItem is ComboBoxItem)
                _editingProject.Status = ((ComboBoxItem)DetailStatus.SelectedItem).Content.ToString();
            if (DetailPriority.SelectedItem is ComboBoxItem)
                _editingProject.Priority = ((ComboBoxItem)DetailPriority.SelectedItem).Content.ToString();
            _editingProject.Deadline = DetailDeadline.Text.Trim();
            if (DetailCreatedDate != null) _editingProject.CreatedDate = DetailCreatedDate.Text.Trim();

            int revVal;
            if (int.TryParse(DetailRevision.Text, out revVal))
            {
                _editingProject.Revision = revVal;
            }

            string newBody = DetailReadmePreview.Text;

            try
            {
                FrontmatterService.WriteStatusAndBody(_editingProject, newBody);
                DetailSaveStatus.Text = "Saved to README.md \u2713";

                // Update rendered markdown preview document
                DetailReadmeRendered.Document = MarkdownHelper.ToFlowDocument(newBody);

                // Refresh metrics & board
                UpdateMetricSummaryCards();
                ApplyFiltersAndUpdateBoard();
            }
            catch (Exception ex)
            {
                DetailSaveStatus.Text = string.Format("Error: {0}", ex.Message);
            }
        }

        private static void SelectComboItemByContent(ComboBox cmb, string value)
        {
            foreach (ComboBoxItem item in cmb.Items)
            {
                if (string.Equals(item.Content.ToString(), value, StringComparison.OrdinalIgnoreCase))
                {
                    cmb.SelectedItem = item;
                    return;
                }
            }
            if (cmb.Items.Count > 0) cmb.SelectedIndex = 0;
        }
    }
}
