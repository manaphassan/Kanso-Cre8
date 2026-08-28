using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using Microsoft.Win32;
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
        private bool _isPopulatingDetail = false;
        private Point _dragStartPoint;
        private bool _isDragging = false;

        public TaskManagerPage()
        {
            InitializeComponent();
            Loaded += OnPageLoaded;
            Unloaded += OnPageUnloaded;
        }

        private void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            try
            {
                var profile = UserProfileService.LoadProfile();
                _workspaceRoot = profile != null ? profile.WorkspaceRoot : "";
                PopulateDesignerFilter();
                LoadProjects();
                WorkspaceWatcherService.Instance.WorkspaceChanged += OnWorkspaceChanged;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("TaskManager PageLoad error: " + ex);
            }
        }

        private void OnPageUnloaded(object sender, RoutedEventArgs e)
        {
            try
            {
                WorkspaceWatcherService.Instance.WorkspaceChanged -= OnWorkspaceChanged;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("TaskManager PageUnload error: " + ex);
            }
        }

        private void OnScrollViewerPreviewMouseWheel(object sender, System.Windows.Input.MouseWheelEventArgs e)
        {
            try
            {
                var scroller = sender as ScrollViewer;
                if (scroller == null || e.Handled) return;
                int steps = Math.Max(1, Math.Min(8, Math.Abs(e.Delta) / 30));
                if (scroller.ScrollableHeight > 0)
                {
                    if (e.Delta < 0) for (int i = 0; i < steps; i++) scroller.LineDown();
                    else for (int i = 0; i < steps; i++) scroller.LineUp();
                }
                else if (scroller.ScrollableWidth > 0)
                {
                    if (e.Delta < 0) for (int i = 0; i < steps; i++) scroller.LineRight();
                    else for (int i = 0; i < steps; i++) scroller.LineLeft();
                }
                e.Handled = true;
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[TaskManagerPage] OnScrollViewerPreviewMouseWheel: " + ex.Message); }
        }

        private void OnWorkspaceChanged(object sender, WorkspaceChangedEventArgs e)
        {
            Dispatcher.Invoke(delegate
            {
                try
                {
                    LoadProjects();
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("[TaskManagerPage] WorkspaceChanged refresh error: " + ex.Message);
                }
            });
        }

        private void PopulateDesignerFilter()
        {
            try
            {
                _isPopulatingFilter = true;
                string currentSelection = DesignerFilterTM.SelectedItem != null ? DesignerFilterTM.SelectedItem.ToString() : "All Designers";

                HashSet<string> designerSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                List<StaffDirectoryItem> staffList = null;
                try { staffList = UserProfileService.GetStaffDirectory(_workspaceRoot); }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[TaskManagerPage] GetStaffDirectory: " + ex.Message); }

                if (!string.IsNullOrWhiteSpace(_workspaceRoot))
                {
                    List<DesignerFolderChoice> designers = WorkspaceScanner.GetDesignerFolders(_workspaceRoot);
                    if (designers != null)
                    {
                        foreach (DesignerFolderChoice d in designers)
                        {
                            if (d != null && !string.IsNullOrWhiteSpace(d.Name))
                                designerSet.Add(d.Name);
                        }
                    }
                }

                foreach (ProjectStatusItem p in _allProjects)
                {
                    if (p != null && !string.IsNullOrWhiteSpace(p.Designer))
                    {
                        if (!Regex.IsMatch(p.Designer, @"^\d{4}$") && !Regex.IsMatch(p.Designer, @"^\d{6}") &&
                            !p.Designer.StartsWith("#") && !p.Designer.StartsWith("_"))
                        {
                            if (staffList != null)
                            {
                                var matched = staffList.Find(s => string.Equals(s.Name, p.Designer, StringComparison.OrdinalIgnoreCase) ||
                                                                  string.Equals(s.StaffId, p.Designer, StringComparison.OrdinalIgnoreCase));
                                if (matched != null && !WorkloadSlaService.IsDesignerOrAdminRole(matched.Role, matched.Department))
                                {
                                    continue; // Exclude manager role
                                }
                            }
                            designerSet.Add(p.Designer);
                        }
                    }
                }

                DesignerFilterTM.Items.Clear();
                DesignerFilterTM.Items.Add("All Designers");
                foreach (string d in designerSet)
                {
                    DesignerFilterTM.Items.Add(d);
                }

                int selectedIdx = 0;
                for (int i = 0; i < DesignerFilterTM.Items.Count; i++)
                {
                    if (string.Equals(DesignerFilterTM.Items[i].ToString(), currentSelection, StringComparison.OrdinalIgnoreCase))
                    {
                        selectedIdx = i;
                        break;
                    }
                }
                DesignerFilterTM.SelectedIndex = selectedIdx;
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
                    PopulateDesignerFilter();
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
                            {
                                if (string.IsNullOrWhiteSpace(item.Designer) && !string.IsNullOrWhiteSpace(folder.Designer))
                                {
                                    item.Designer = folder.Designer;
                                }
                                _allProjects.Add(item);
                            }
                        }
                    }
                }

                PopulateDesignerFilter();
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

                    if (status == "in-progress" || status == "revision") inProgressCount++;
                    else if (status == "review") reviewCount++;
                    else if (status == "done" || status == "approved") doneCount++;

                    if (priority == "urgent" || status == "revision" || p.IsOverdue || deadlineDisp.StartsWith("Overdue", StringComparison.OrdinalIgnoreCase))
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
                string statusFilter = "";
                if (StatusFilter != null && StatusFilter.SelectedItem is ComboBoxItem)
                {
                    string sel = ((ComboBoxItem)StatusFilter.SelectedItem).Content.ToString();
                    if (sel != "All Statuses") statusFilter = sel;
                }
                string searchQuery = TxtSearchQuery != null ? TxtSearchQuery.Text.Trim().ToLowerInvariant() : "";

                List<ProjectStatusItem> filtered = new List<ProjectStatusItem>();
                foreach (ProjectStatusItem p in _allProjects)
                {
                    if (p == null) continue;
                    if (designerFilter != "All Designers" && !string.IsNullOrWhiteSpace(designerFilter))
                    {
                        bool match = false;
                        if (!string.IsNullOrWhiteSpace(p.Designer))
                        {
                            if (string.Equals(p.Designer, designerFilter, StringComparison.OrdinalIgnoreCase) ||
                                p.Designer.IndexOf(designerFilter, StringComparison.OrdinalIgnoreCase) >= 0 ||
                                designerFilter.IndexOf(p.Designer, StringComparison.OrdinalIgnoreCase) >= 0)
                            {
                                match = true;
                            }
                        }
                        if (!match && !string.IsNullOrWhiteSpace(p.FullPath))
                        {
                            if (p.FullPath.IndexOf(designerFilter, StringComparison.OrdinalIgnoreCase) >= 0)
                            {
                                match = true;
                            }
                        }
                        if (!match) continue;
                    }
                    if (!string.IsNullOrEmpty(priorityFilter) &&
                        !string.Equals(p.Priority, priorityFilter, StringComparison.OrdinalIgnoreCase)) continue;
                    if (!string.IsNullOrEmpty(statusFilter) &&
                        !string.Equals(p.Status, statusFilter, StringComparison.OrdinalIgnoreCase)) continue;
                    if (!string.IsNullOrEmpty(searchQuery))
                    {
                        string projName = (p.Project ?? "").ToLowerInvariant();
                        string clientName = (p.Client ?? "").ToLowerInvariant();
                        string designerName = (p.Designer ?? "").ToLowerInvariant();
                        if (!projName.Contains(searchQuery) && !clientName.Contains(searchQuery) && !designerName.Contains(searchQuery)) continue;
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
                List<ProjectStatusItem> revision = new List<ProjectStatusItem>();
                List<ProjectStatusItem> done = new List<ProjectStatusItem>();
                List<ProjectStatusItem> other = new List<ProjectStatusItem>();

                foreach (ProjectStatusItem p in projects)
                {
                    if (p == null) continue;
                    string s = (p.Status ?? "").ToLowerInvariant();
                    if (s == "backlog") backlog.Add(p);
                    else if (s == "in-progress") inProgress.Add(p);
                    else if (s == "review") review.Add(p);
                    else if (s == "revision") revision.Add(p);
                    else if (s == "done" || s == "approved") done.Add(p);
                    else other.Add(p);   // on-hold, untracked, empty
                }

                if (ListBacklog != null) ListBacklog.ItemsSource = backlog;
                if (ListInProgress != null) ListInProgress.ItemsSource = inProgress;
                if (ListReview != null) ListReview.ItemsSource = review;
                if (ListRevision != null) ListRevision.ItemsSource = revision;
                if (ListDone != null) ListDone.ItemsSource = done;
                if (ListOther != null) ListOther.ItemsSource = other;

                if (CountBacklog != null) CountBacklog.Text = backlog.Count.ToString();
                if (CountInProgress != null) CountInProgress.Text = inProgress.Count.ToString();
                if (CountReview != null) CountReview.Text = review.Count.ToString();
                if (CountRevision != null) CountRevision.Text = revision.Count.ToString();
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
            if (StatusFilter != null && StatusFilter.Items.Count > 0) StatusFilter.SelectedIndex = 0;
            if (PriorityFilter != null && PriorityFilter.Items.Count > 0) PriorityFilter.SelectedIndex = 0;
            if (SortFilter != null && SortFilter.Items.Count > 0) SortFilter.SelectedIndex = 0;
            ApplyFiltersAndUpdateBoard();
        }

        private void OnQuickStatusMenuClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                System.Windows.Controls.MenuItem menu = sender as System.Windows.Controls.MenuItem;
                if (menu != null && menu.Tag != null)
                {
                    string newStatus = menu.Tag.ToString();
                    ProjectStatusItem item = menu.DataContext as ProjectStatusItem;
                    if (item != null && !string.IsNullOrEmpty(item.FullPath))
                    {
                        item.Status = newStatus;
                        FrontmatterService.WriteStatus(item);
                        LoadProjects();
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("OnQuickStatusMenuClicked error: " + ex);
            }
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
                    DataObject dragData = new DataObject(typeof(ProjectStatusItem), item);
                    dragData.SetData("ProjectStatusItem", item);
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
            if (e.Data.GetDataPresent(typeof(ProjectStatusItem)) || e.Data.GetDataPresent("ProjectStatusItem"))
            {
                e.Effects = DragDropEffects.Move;
                e.Handled = true;

                Wpf.Ui.Controls.Card columnCard = sender as Wpf.Ui.Controls.Card;
                if (columnCard != null)
                {
                    columnCard.BorderThickness = new Thickness(2);
                    columnCard.BorderBrush = (System.Windows.Media.Brush)Application.Current.FindResource("FluentBrand80");
                }
            }
            else
            {
                e.Effects = DragDropEffects.None;
            }
        }

        private void OnColumnDragLeave(object sender, DragEventArgs e)
        {
            Wpf.Ui.Controls.Card columnCard = sender as Wpf.Ui.Controls.Card;
            if (columnCard != null)
            {
                columnCard.BorderThickness = new Thickness(1);
                columnCard.BorderBrush = (System.Windows.Media.Brush)Application.Current.FindResource("CardStrokeColorDefaultBrush");
            }
        }

        private void OnColumnDrop(object sender, DragEventArgs e)
        {
            Wpf.Ui.Controls.Card columnCard = sender as Wpf.Ui.Controls.Card;
            if (columnCard != null)
            {
                columnCard.BorderThickness = new Thickness(1);
                columnCard.BorderBrush = (System.Windows.Media.Brush)Application.Current.FindResource("CardStrokeColorDefaultBrush");
            }

            try
            {
                ProjectStatusItem item = null;
                if (e.Data.GetDataPresent(typeof(ProjectStatusItem)))
                    item = e.Data.GetData(typeof(ProjectStatusItem)) as ProjectStatusItem;
                else if (e.Data.GetDataPresent("ProjectStatusItem"))
                    item = e.Data.GetData("ProjectStatusItem") as ProjectStatusItem;

                FrameworkElement targetEl = sender as FrameworkElement;
                string targetStatus = targetEl != null ? targetEl.Tag as string : null;

                if (item != null && !string.IsNullOrEmpty(targetStatus) && !string.Equals(item.Status, targetStatus, StringComparison.OrdinalIgnoreCase))
                {
                    item.Status = targetStatus;
                    FrontmatterService.WriteStatus(item);

                    NotificationService.ShowSuccess(
                        "Project Status Updated",
                        string.Format("'{0}' moved to {1}", item.Project, targetStatus),
                        item.FullPath);

                    UpdateMetricSummaryCards();
                    ApplyFiltersAndUpdateBoard();
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("ColumnDrop error: " + ex.Message);
                NotificationService.ShowError(
                    "Update Failed",
                    "Could not update status: " + ex.Message);
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

            DetailPanel.Visibility = Visibility.Visible;
            _editingProject = item;
            _isPopulatingDetail = true;

            DetailProjectName.Text = item.Project;

            // Set Status combobox
            SelectComboItemByContent(DetailStatus, item.Status ?? "backlog");
            SelectComboItemByContent(DetailPriority, item.Priority ?? "medium");
            
            DateTime dtDeadline;
            if (DateTime.TryParse(item.Deadline, out dtDeadline))
                DetailDeadline.SelectedDate = dtDeadline;
            else
                DetailDeadline.SelectedDate = null;

            DateTime dtCreated;
            if (DateTime.TryParse(item.CreatedDate, out dtCreated))
                DetailCreatedDate.SelectedDate = dtCreated;
            else
                DetailCreatedDate.SelectedDate = null;

            if (DetailDuration != null) DetailDuration.Text = item.Duration ?? "";
            DetailRevision.Text = item.Revision.ToString();

            // Load README body content notes
            string body = FrontmatterService.ReadBody(item.FullPath);
            DetailReadmePreview.Text = body ?? "";
            DetailReadmeRendered.Document = MarkdownHelper.ToFlowDocument(body);

            // Default to Preview Mode
            SwitchToReadmePreviewMode();

            DetailSaveStatus.Text = "";
            _isPopulatingDetail = false;
        }

        private void OnDateChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_isPopulatingDetail) return;
            
            if (DetailCreatedDate != null && DetailDeadline != null && DetailDuration != null)
            {
                if (DetailCreatedDate.SelectedDate.HasValue && DetailDeadline.SelectedDate.HasValue)
                {
                    TimeSpan diff = DetailDeadline.SelectedDate.Value - DetailCreatedDate.SelectedDate.Value;
                    if (diff.TotalDays >= 0)
                    {
                        int days = (int)diff.TotalDays;
                        DetailDuration.Text = days == 1 ? "1 Day" : string.Format("{0} Days", days);
                    }
                }
            }
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
            
            _editingProject.Deadline = DetailDeadline.SelectedDate.HasValue 
                ? DetailDeadline.SelectedDate.Value.ToString("yyyy-MM-dd") 
                : "";
            
            if (DetailCreatedDate != null) 
            {
                _editingProject.CreatedDate = DetailCreatedDate.SelectedDate.HasValue 
                    ? DetailCreatedDate.SelectedDate.Value.ToString("yyyy-MM-dd") 
                    : "";
            }

            if (DetailDuration != null)
                _editingProject.Duration = DetailDuration.Text.Trim();

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

        private void OnDetailOpenFolderClicked(object sender, RoutedEventArgs e)
        {
            if (_editingProject != null && Directory.Exists(_editingProject.FullPath))
            {
                try
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = _editingProject.FullPath,
                        UseShellExecute = true
                    });
                }
                catch (Exception ex)
                {
                    Debug.WriteLine("[TaskManagerPage] OpenFolder error: " + ex.Message);
                }
            }
        }

        private void OnDetailOpenSourceClicked(object sender, RoutedEventArgs e)
        {
            if (_editingProject != null && Directory.Exists(_editingProject.FullPath))
            {
                string srcDir = Path.Combine(_editingProject.FullPath, "02_SOURCE_FILES");
                string targetFile = null;
                if (Directory.Exists(srcDir))
                {
                    string[] files = Directory.GetFiles(srcDir);
                    foreach (string f in files)
                    {
                        string ext = Path.GetExtension(f).ToLowerInvariant();
                        if (ext == ".afdesign" || ext == ".psd" || ext == ".ai" || ext == ".afphoto" || ext == ".afpub")
                        {
                            targetFile = f;
                            break;
                        }
                    }
                }

                if (targetFile != null && File.Exists(targetFile))
                {
                    try
                    {
                        Process.Start(new ProcessStartInfo
                        {
                            FileName = targetFile,
                            UseShellExecute = true
                        });
                        NotificationService.ShowInfo("Launching Source File", Path.GetFileName(targetFile));
                    }
                    catch (Exception ex)
                    {
                        Debug.WriteLine("[TaskManagerPage] OpenSource error: " + ex.Message);
                    }
                }
                else
                {
                    System.Windows.MessageBox.Show("No working source file (.afdesign, .psd, .ai) found in 02_SOURCE_FILES.", "Source File Not Found", System.Windows.MessageBoxButton.OK, System.Windows.MessageBoxImage.Information);
                }
            }
        }

        private async void OnDetailHandoverZipClicked(object sender, RoutedEventArgs e)
        {
            if (_editingProject == null || !Directory.Exists(_editingProject.FullPath)) return;

            SaveFileDialog sfd = new SaveFileDialog
            {
                Title = "Export Creative Handover Package (ZIP)",
                Filter = "ZIP Archive (*.zip)|*.zip",
                FileName = string.Format("{0}_Handover.zip", _editingProject.Project),
                InitialDirectory = Environment.GetFolderPath(Environment.SpecialFolder.Desktop)
            };

            if (sfd.ShowDialog() == true)
            {
                ExportPackageOptions options = new ExportPackageOptions
                {
                    IncludeDeliverables = true,
                    IncludeCopywriting = true,
                    IncludeBriefMarkdown = true,
                    IncludeHtmlSummary = true,
                    IncludeWipMockups = false
                };

                ExportPackageResult res = await ExportPackagingService.CreateHandoverPackageAsync(_editingProject.FullPath, sfd.FileName, options);
                if (res != null && res.Success)
                {
                    NotificationService.ShowSuccess("Handover Exported", string.Format("Packaged {0} files into {1}", res.FileCount, Path.GetFileName(res.ZipFilePath)));
                    if (System.Windows.MessageBox.Show(string.Format("Creative Handover Package created with {0} files.\n\nOpen destination folder?", res.FileCount), "Export Complete", System.Windows.MessageBoxButton.YesNo, System.Windows.MessageBoxImage.Information) == System.Windows.MessageBoxResult.Yes)
                    {
                        try
                        {
                            Process.Start(new ProcessStartInfo
                            {
                                FileName = Path.GetDirectoryName(sfd.FileName),
                                UseShellExecute = true
                            });
                        }
                        catch (Exception ex)
                        {
                            Debug.WriteLine("[TaskManagerPage] Open exported folder error: " + ex.Message);
                        }
                    }
                }
                else
                {
                    System.Windows.MessageBox.Show(res != null ? res.ErrorMessage : "Packaging failed", "Export Error", System.Windows.MessageBoxButton.OK, System.Windows.MessageBoxImage.Error);
                }
            }
        }

        private void OnAssetDropzoneOver(object sender, DragEventArgs e)
        {
            if (e.Data.GetDataPresent(DataFormats.FileDrop))
            {
                e.Effects = DragDropEffects.Copy;
                e.Handled = true;
                if (CardAssetDropzone != null)
                {
                    CardAssetDropzone.BorderBrush = (System.Windows.Media.Brush)Application.Current.FindResource("FluentBrand80");
                    CardAssetDropzone.BorderThickness = new Thickness(2);
                }
            }
        }

        private void OnAssetDropzoneLeave(object sender, DragEventArgs e)
        {
            if (CardAssetDropzone != null)
            {
                CardAssetDropzone.BorderBrush = (System.Windows.Media.Brush)Application.Current.FindResource("CardStrokeColorDefaultBrush");
                CardAssetDropzone.BorderThickness = new Thickness(1);
            }
        }

        private void OnAssetDropzoneDrop(object sender, DragEventArgs e)
        {
            if (CardAssetDropzone != null)
            {
                CardAssetDropzone.BorderBrush = (System.Windows.Media.Brush)Application.Current.FindResource("CardStrokeColorDefaultBrush");
                CardAssetDropzone.BorderThickness = new Thickness(1);
            }

            if (_editingProject == null || !Directory.Exists(_editingProject.FullPath)) return;

            if (e.Data.GetDataPresent(DataFormats.FileDrop))
            {
                string[] files = (string[])e.Data.GetData(DataFormats.FileDrop);
                if (files != null && files.Length > 0)
                {
                    int ingestedCount = 0;
                    foreach (string src in files)
                    {
                        if (File.Exists(src))
                        {
                            string ext = Path.GetExtension(src).ToLowerInvariant();
                            string targetFolder = (ext == ".png" || ext == ".jpg" || ext == ".jpeg" || ext == ".mp4" || ext == ".mov")
                                ? "05_DELIVERABLES"
                                : (ext == ".afdesign" || ext == ".psd" || ext == ".ai" ? "02_SOURCE_FILES" : "01_BRIEF_ASSETS");

                            string destDir = Path.Combine(_editingProject.FullPath, targetFolder);
                            if (!Directory.Exists(destDir)) Directory.CreateDirectory(destDir);

                            string destPath = Path.Combine(destDir, Path.GetFileName(src));
                            File.Copy(src, destPath, true);
                            ingestedCount++;
                        }
                    }

                    if (ingestedCount > 0)
                    {
                        if (TxtAssetDropHint != null)
                        {
                            TxtAssetDropHint.Text = string.Format("\u2713 Ingested {0} file(s) successfully!", ingestedCount);
                        }
                        NotificationService.ShowSuccess("Assets Ingested", string.Format("Ingested {0} file(s) into project vault.", ingestedCount));
                    }
                }
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
