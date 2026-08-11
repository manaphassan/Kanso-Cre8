using System;
using System.Collections.Generic;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class TaskManagerPage : Page
    {
        private string _workspaceRoot = "";
        private List<ProjectStatusItem> _allProjects = new List<ProjectStatusItem>();
        private ProjectStatusItem _editingProject = null;

        private bool _isPopulatingFilter = false;

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

                ApplyFiltersAndUpdateBoard();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("LoadProjects error: " + ex);
                UpdateBoard();
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

                List<ProjectStatusItem> filtered = new List<ProjectStatusItem>();
                foreach (ProjectStatusItem p in _allProjects)
                {
                    if (p == null) continue;
                    if (designerFilter != "All Designers" &&
                        !string.Equals(p.Designer, designerFilter, StringComparison.OrdinalIgnoreCase)) continue;
                    if (!string.IsNullOrEmpty(priorityFilter) &&
                        !string.Equals(p.Priority, priorityFilter, StringComparison.OrdinalIgnoreCase)) continue;
                    filtered.Add(p);
                }

                UpdateBoard(filtered);
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("ApplyFilters error: " + ex);
            }
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

        private void OnTMRefreshClicked(object sender, RoutedEventArgs e)
        {
            LoadProjects();
        }

        private void OnTMFilterChanged(object sender, SelectionChangedEventArgs e)
        {
            if (!IsLoaded || _isPopulatingFilter) return;
            ApplyFiltersAndUpdateBoard();
        }

        // ─── Project Card Click → Open Detail Drawer ───────────────────────────

        private void OnProjectCardClicked(object sender, RoutedEventArgs e)
        {
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
            DetailRevision.Text = item.Revision.ToString();
            DetailSaveStatus.Text = "";
            DetailPanel.Visibility = Visibility.Visible;
        }

        private void OnDetailClose(object sender, RoutedEventArgs e)
        {
            DetailPanel.Visibility = Visibility.Collapsed;
            _editingProject = null;
        }

        private void OnDetailSave(object sender, RoutedEventArgs e)
        {
            if (_editingProject == null) return;

            if (DetailStatus.SelectedItem is ComboBoxItem)
                _editingProject.Status = ((ComboBoxItem)DetailStatus.SelectedItem).Content.ToString();
            if (DetailPriority.SelectedItem is ComboBoxItem)
                _editingProject.Priority = ((ComboBoxItem)DetailPriority.SelectedItem).Content.ToString();
            _editingProject.Deadline = DetailDeadline.Text.Trim();

            int rev;
            _editingProject.Revision = int.TryParse(DetailRevision.Text.Trim(), out rev) ? rev : 0;

            try
            {
                FrontmatterService.WriteStatus(_editingProject);
                DetailSaveStatus.Text = "Saved to README.md \u2713";

                // Re-sort board
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

