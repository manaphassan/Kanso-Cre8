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

        public TaskManagerPage()
        {
            InitializeComponent();
            Loaded += OnPageLoaded;
        }

        private void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            _workspaceRoot = UserProfileService.LoadProfile().WorkspaceRoot;
            PopulateDesignerFilter();
            LoadProjects();
        }

        private void PopulateDesignerFilter()
        {
            DesignerFilterTM.Items.Clear();
            DesignerFilterTM.Items.Add("All Designers");

            List<DesignerFolderChoice> designers = WorkspaceScanner.GetDesignerFolders(_workspaceRoot);
            foreach (DesignerFolderChoice d in designers)
                DesignerFilterTM.Items.Add(d.StaffId);

            DesignerFilterTM.SelectedIndex = 0;
        }

        private void LoadProjects()
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
            foreach (DesignerFolderItem folder in folders)
            {
                ProjectStatusItem item = FrontmatterService.ReadStatus(folder.FullPath);
                _allProjects.Add(item);
            }

            ApplyFiltersAndUpdateBoard();
        }

        private void ApplyFiltersAndUpdateBoard()
        {
            string designerFilter = DesignerFilterTM.SelectedItem != null
                ? DesignerFilterTM.SelectedItem.ToString() : "All Designers";
            string priorityFilter = "";
            if (PriorityFilter.SelectedItem is ComboBoxItem)
            {
                string sel = ((ComboBoxItem)PriorityFilter.SelectedItem).Content.ToString();
                if (sel != "All Priorities") priorityFilter = sel;
            }

            List<ProjectStatusItem> filtered = new List<ProjectStatusItem>();
            foreach (ProjectStatusItem p in _allProjects)
            {
                if (designerFilter != "All Designers" &&
                    !string.Equals(p.Designer, designerFilter, StringComparison.OrdinalIgnoreCase)) continue;
                if (!string.IsNullOrEmpty(priorityFilter) &&
                    !string.Equals(p.Priority, priorityFilter, StringComparison.OrdinalIgnoreCase)) continue;
                filtered.Add(p);
            }

            UpdateBoard(filtered);
        }

        private void UpdateBoard(List<ProjectStatusItem> projects = null)
        {
            if (projects == null) projects = _allProjects;

            List<ProjectStatusItem> backlog = new List<ProjectStatusItem>();
            List<ProjectStatusItem> inProgress = new List<ProjectStatusItem>();
            List<ProjectStatusItem> review = new List<ProjectStatusItem>();
            List<ProjectStatusItem> done = new List<ProjectStatusItem>();
            List<ProjectStatusItem> other = new List<ProjectStatusItem>();

            foreach (ProjectStatusItem p in projects)
            {
                string s = (p.Status ?? "").ToLowerInvariant();
                if (s == "backlog") backlog.Add(p);
                else if (s == "in-progress") inProgress.Add(p);
                else if (s == "review") review.Add(p);
                else if (s == "done") done.Add(p);
                else other.Add(p);   // on-hold, untracked, empty
            }

            ListBacklog.ItemsSource = backlog;
            ListInProgress.ItemsSource = inProgress;
            ListReview.ItemsSource = review;
            ListDone.ItemsSource = done;
            ListOther.ItemsSource = other;

            CountBacklog.Text = backlog.Count.ToString();
            CountInProgress.Text = inProgress.Count.ToString();
            CountReview.Text = review.Count.ToString();
            CountDone.Text = done.Count.ToString();
            CountOther.Text = other.Count.ToString();

            TxtTaskCount.Text = string.Format("{0} projects", projects.Count);
        }

        private void OnTMRefreshClicked(object sender, RoutedEventArgs e)
        {
            LoadProjects();
        }

        private void OnTMFilterChanged(object sender, SelectionChangedEventArgs e)
        {
            ApplyFiltersAndUpdateBoard();
        }

        // ─── Project Card Click → Open Detail Drawer ─────────────────────────

        private void OnProjectCardClicked(object sender, MouseButtonEventArgs e)
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
