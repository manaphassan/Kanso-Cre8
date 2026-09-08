using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class OrderRequestsPage : Page
    {
        private string _workspaceRoot = string.Empty;
        private UserProfile _currentProfile;
        private List<CreativeOrder> _allOrders = new List<CreativeOrder>();
        private CreativeOrder _selectedOrder;

        public OrderRequestsPage()
        {
            InitializeComponent();
            Loaded += OnPageLoaded;
        }

        private void OnScrollViewerPreviewMouseWheel(object sender, MouseWheelEventArgs e)
        {
            var scroller = sender as ScrollViewer;
            if (scroller != null)
            {
                int steps = Math.Abs(e.Delta) / 30;
                if (steps < 1) steps = 1;
                if (steps > 8) steps = 8;

                if (e.Delta < 0)
                {
                    for (int i = 0; i < steps; i++) scroller.LineDown();
                }
                else if (e.Delta > 0)
                {
                    for (int i = 0; i < steps; i++) scroller.LineUp();
                }
                e.Handled = true;
            }
        }

        private async void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            try
            {
                _currentProfile = UserProfileService.LoadProfile();
                _workspaceRoot = (_currentProfile != null && !string.IsNullOrWhiteSpace(_currentProfile.WorkspaceRoot) && Directory.Exists(_currentProfile.WorkspaceRoot))
                    ? _currentProfile.WorkspaceRoot
                    : NasConfigSyncService.DiscoverWorkspaceRoot();

                PopulateAssigneeDropdown();
                await ReloadOrdersQueueAsync();
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[OrderRequestsPage] OnPageLoaded error: " + ex.Message);
            }
        }

        private void PopulateAssigneeDropdown()
        {
            try
            {
                var staffList = UserProfileService.GetStaffDirectory(_workspaceRoot);
                List<string> designers = new List<string>();

                if (staffList != null && staffList.Count > 0)
                {
                    foreach (var staff in staffList)
                    {
                        if (staff == null || !staff.Active) continue;
                        string label = string.Format("{0} - {1}", staff.StaffId ?? "SS0000", staff.Name ?? "Staff");
                        if (!designers.Contains(label))
                        {
                            designers.Add(label);
                        }
                    }
                }

                string loggedInUser = null;
                if (_currentProfile != null && !string.IsNullOrWhiteSpace(_currentProfile.DesignerName))
                {
                    string id = _currentProfile.StaffId ?? "SS0004";
                    loggedInUser = string.Format("{0} - {1}", id, _currentProfile.DesignerName);
                    if (!designers.Contains(loggedInUser))
                    {
                        designers.Insert(0, loggedInUser);
                    }
                }

                CmbAssignee.ItemsSource = designers;

                if (!string.IsNullOrEmpty(loggedInUser) && designers.Contains(loggedInUser))
                {
                    CmbAssignee.SelectedItem = loggedInUser;
                }
                else if (designers.Count > 0)
                {
                    CmbAssignee.SelectedIndex = 0;
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[OrderRequestsPage] PopulateAssigneeDropdown error: " + ex.Message);
            }
        }

        private async Task ReloadOrdersQueueAsync()
        {
            try
            {
                string designerName = _currentProfile != null ? _currentProfile.DesignerName : null;
                _allOrders = await CreativeOrderService.LoadOrdersAsync(_workspaceRoot, designerName);
                UpdateMetricCounters();
                ApplyFilters();
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[OrderRequestsPage] ReloadOrdersQueueAsync error: " + ex.Message);
            }
        }

        private void UpdateMetricCounters()
        {
            try
            {
                int total = _allOrders.Count;
                int pending = _allOrders.Count(o => string.Equals(o.Status, "pending", StringComparison.OrdinalIgnoreCase));
                int inProgress = _allOrders.Count(o => string.Equals(o.Status, "in_progress", StringComparison.OrdinalIgnoreCase));
                int converted = _allOrders.Count(o => o.IsConverted);

                TxtMetricTotal.Text = total.ToString();
                TxtMetricPending.Text = pending.ToString();
                TxtMetricInProgress.Text = inProgress.ToString();
                TxtMetricConverted.Text = converted.ToString();
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[OrderRequestsPage] UpdateMetricCounters error: " + ex.Message);
            }
        }

        private void ApplyFilters()
        {
            try
            {
                string query = (TxtSearchQuery != null && !string.IsNullOrWhiteSpace(TxtSearchQuery.Text)) ? TxtSearchQuery.Text.Trim().ToLowerInvariant() : "";
                string statusFilter = "all";
                if (RadioFilterPending != null && RadioFilterPending.IsChecked == true) statusFilter = "pending";
                else if (RadioFilterInProgress != null && RadioFilterInProgress.IsChecked == true) statusFilter = "in_progress";
                else if (RadioFilterDone != null && RadioFilterDone.IsChecked == true) statusFilter = "done";

                string entityFilter = "all";
                if (CmbEntityFilter != null && CmbEntityFilter.SelectedItem != null)
                {
                    ComboBoxItem item = CmbEntityFilter.SelectedItem as ComboBoxItem;
                    if (item != null)
                    {
                        string content = item.Content != null ? item.Content.ToString() : "";
                        if (content.StartsWith("SSC")) entityFilter = "SSC";
                        else if (content.StartsWith("SSH")) entityFilter = "SSH";
                        else if (content.StartsWith("SSE")) entityFilter = "SSE";
                        else if (content.StartsWith("SSW")) entityFilter = "SSW";
                        else if (content.StartsWith("SST")) entityFilter = "SST";
                    }
                }

                var filtered = _allOrders.Where(o =>
                {
                    // Status match
                    if (statusFilter != "all")
                    {
                        if (statusFilter == "done")
                        {
                            if (!string.Equals(o.Status, "done", StringComparison.OrdinalIgnoreCase) &&
                                !string.Equals(o.Status, "completed", StringComparison.OrdinalIgnoreCase))
                                return false;
                        }
                        else if (!string.Equals(o.Status, statusFilter, StringComparison.OrdinalIgnoreCase))
                        {
                            return false;
                        }
                    }

                    // Entity match
                    if (entityFilter != "all")
                    {
                        if (!string.Equals(o.SafeEntity, entityFilter, StringComparison.OrdinalIgnoreCase))
                            return false;
                    }

                    // Search query match
                    if (!string.IsNullOrWhiteSpace(query))
                    {
                        bool matchTitle = (o.Title ?? "").ToLowerInvariant().Contains(query);
                        bool matchReq = (o.Requester ?? "").ToLowerInvariant().Contains(query);
                        bool matchId = (o.Id ?? "").ToLowerInvariant().Contains(query);
                        bool matchCopy = (o.Copy ?? "").ToLowerInvariant().Contains(query);
                        if (!matchTitle && !matchReq && !matchId && !matchCopy) return false;
                    }

                    return true;
                }).ToList();

                ListOrdersQueue.ItemsSource = filtered;

                bool hasResults = filtered.Count > 0;
                PanelEmptyQueue.Visibility = hasResults ? Visibility.Collapsed : Visibility.Visible;
                ListOrdersQueue.Visibility = hasResults ? Visibility.Visible : Visibility.Collapsed;

                // Retain selection if valid, or select top item
                if (_selectedOrder != null && filtered.Any(o => o.Id == _selectedOrder.Id))
                {
                    ListOrdersQueue.SelectedItem = filtered.First(o => o.Id == _selectedOrder.Id);
                }
                else if (hasResults)
                {
                    ListOrdersQueue.SelectedIndex = 0;
                }
                else
                {
                    DisplayOrderDetails(null);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[OrderRequestsPage] ApplyFilters error: " + ex.Message);
            }
        }

        private void OnOrderSelectedChanged(object sender, SelectionChangedEventArgs e)
        {
            var selected = ListOrdersQueue.SelectedItem as CreativeOrder;
            DisplayOrderDetails(selected);
        }

        private void DisplayOrderDetails(CreativeOrder order)
        {
            _selectedOrder = order;

            if (order == null)
            {
                CardNoSelection.Visibility = Visibility.Visible;
                PanelOrderDetails.Visibility = Visibility.Collapsed;
                return;
            }

            CardNoSelection.Visibility = Visibility.Collapsed;
            PanelOrderDetails.Visibility = Visibility.Visible;

            // Header Meta
            TxtDetailOrderId.Text = order.Id;
            TxtDetailEntity.Text = order.SafeEntity;
            BadgeDetailEntity.Background = order.EntityBrush;

            TxtDetailPriority.Text = order.PriorityLabel;
            BadgeDetailPriority.Background = order.PriorityBrush;

            TxtDetailStatus.Text = order.StatusLabel;
            TxtDetailStatus.Foreground = order.StatusBrush;
            BadgeDetailStatus.BorderBrush = order.StatusBrush;

            TxtDetailSubmittedAt.Text = order.FormattedSubmittedAt;
            TxtDetailTitle.Text = order.SafeTitle;

            // Submitter
            TxtDetailRequester.Text = order.Requester ?? "Unknown";
            TxtDetailRequesterRole.Text = order.RequesterRole ?? "Staff";

            // Deadline
            TxtDetailTargetDate.Text = order.FormattedTargetDate;
            if (order.IsOverdue)
            {
                TxtDetailDeadlineStatus.Text = "Overdue Target";
                TxtDetailDeadlineStatus.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#EF4444"));
            }
            else
            {
                TxtDetailDeadlineStatus.Text = "Target Active";
                TxtDetailDeadlineStatus.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#10B981"));
            }

            // Format & Specs
            TxtDetailFormat.Text = order.FormatLabel;
            TxtDetailFormatSpecs.Text = GetFormatSpecsGuide(order.Format);

            // Copywriting Script
            string script = order.Copy ?? "";
            TxtDetailCopy.Text = script;
            TxtCopyCharCount.Text = string.Format("({0} characters)", script.Length);

            // Attachment Note
            if (!string.IsNullOrWhiteSpace(order.AttachmentNote))
            {
                CardProductionNotes.Visibility = Visibility.Visible;
                TxtDetailAttachmentNote.Text = order.AttachmentNote;
            }
            else
            {
                CardProductionNotes.Visibility = Visibility.Collapsed;
            }

            // Assignee sync
            if (!string.IsNullOrWhiteSpace(order.AssignedTo))
            {
                foreach (var item in CmbAssignee.Items)
                {
                    if (item.ToString().Contains(order.AssignedTo))
                    {
                        CmbAssignee.SelectedItem = item;
                        break;
                    }
                }
            }

            // Project Scaffolding State
            UpdateProjectConversionState(order);
        }

        private string GetFormatSpecsGuide(string format)
        {
            switch ((format ?? "").ToLowerInvariant())
            {
                case "9_16_video":
                    return "1080 x 1920 px (9:16) • 60 FPS • Safe Action Area • Reels / TikTok";
                case "1_1_feed":
                    return "1080 x 1080 px (1:1) • 72 DPI • sRGB • Meta Feed Post";
                case "16_9_landscape":
                    return "1920 x 1080 px (16:9) • Full HD • YouTube / Presentation";
                case "print_posm":
                    return "A4/A3 POSM Poster • 300 DPI • CMYK Print Ready";
                case "print_digital":
                    return "Digital Banner • Flexible Web Dimensions • sRGB";
                default:
                    return "Standard Creative Deliverable Canvas";
            }
        }

        private void UpdateProjectConversionState(CreativeOrder order)
        {
            if (order.IsConverted)
            {
                PanelUnconvertedActions.Visibility = Visibility.Collapsed;
                PanelConvertedActions.Visibility = Visibility.Visible;

                string targetPid = order.ProjectId;
                TxtExistingProjectPath.Text = string.Format("Project: {0} (Resolving path...)", targetPid);
                System.Threading.Tasks.Task.Run(() => ResolveExistingProjectDirectory(targetPid)).ContinueWith(t =>
                {
                    string dir = t.Result;
                    Dispatcher.Invoke(() =>
                    {
                        if (_selectedOrder != null && _selectedOrder.ProjectId == targetPid)
                        {
                            TxtExistingProjectPath.Text = !string.IsNullOrEmpty(dir)
                                ? dir
                                : string.Format("Project: {0} (Check active workspace)", targetPid);
                        }
                    });
                });
            }
            else
            {
                PanelUnconvertedActions.Visibility = Visibility.Visible;
                PanelConvertedActions.Visibility = Visibility.Collapsed;

                // Live preview of target folder path
                string cleanTitle = Regex.Replace(order.Title ?? "Creative_Project", @"[\\/:*?""<>|]", "_").Trim();
                cleanTitle = Regex.Replace(cleanTitle, @"\s+", "_");
                string datePrefix = DateTime.Now.ToString("yyyyMM");
                string monthFolder = datePrefix + "_" + DateTime.Now.ToString("MMMM", System.Globalization.CultureInfo.InvariantCulture);
                string yearStr = DateTime.Now.Year.ToString();

                string preview = Path.Combine(
                    string.IsNullOrWhiteSpace(_workspaceRoot) ? @"\\SSNAS\Creative-Team" : _workspaceRoot,
                    yearStr,
                    monthFolder,
                    string.Format("{0}_[AUTO]_{1}_{2}", datePrefix, order.SafeEntity, cleanTitle)
                );

                TxtTargetFolderPreview.Text = preview;
            }
        }

        private string ResolveExistingProjectDirectory(string projectId)
        {
            if (string.IsNullOrWhiteSpace(projectId) || string.IsNullOrWhiteSpace(_workspaceRoot) || !Directory.Exists(_workspaceRoot))
                return null;

            try
            {
                // 1. Scan current year
                string yearDir = Path.Combine(_workspaceRoot, DateTime.Now.Year.ToString());
                if (Directory.Exists(yearDir))
                {
                    string match = Directory.GetDirectories(yearDir, projectId, SearchOption.AllDirectories).FirstOrDefault();
                    if (!string.IsNullOrEmpty(match)) return match;
                }

                // 2. Scan whole workspace
                string broadMatch = Directory.GetDirectories(_workspaceRoot, projectId, SearchOption.AllDirectories).FirstOrDefault();
                if (!string.IsNullOrEmpty(broadMatch)) return broadMatch;
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[OrderRequestsPage] ResolveExistingProjectDirectory error: " + ex.Message);
            }

            return null;
        }

        // ─── Interactive Event Handlers ──────────────────────────────────────────

        private void OnSearchTextChanged(object sender, TextChangedEventArgs e)
        {
            ApplyFilters();
        }

        private void OnFilterStatusChanged(object sender, RoutedEventArgs e)
        {
            ApplyFilters();
        }

        private void OnEntityFilterChanged(object sender, SelectionChangedEventArgs e)
        {
            ApplyFilters();
        }

        private async void OnAssigneeSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            if (_selectedOrder == null || CmbAssignee == null || CmbAssignee.SelectedItem == null) return;
            string selected = CmbAssignee.SelectedItem.ToString();
            string assigneeName = selected;
            var parts = selected.Split(new[] { " - " }, StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 2) assigneeName = parts[1].Trim();

            if (!string.Equals(_selectedOrder.AssignedTo, assigneeName, StringComparison.OrdinalIgnoreCase))
            {
                _selectedOrder.AssignedTo = assigneeName;
                await CreativeOrderService.UpdateOrderAsync(_workspaceRoot, _selectedOrder.Id, null, assigneeName);
                ShowStatusMessage(string.Format("Assigned to {0}.", assigneeName));
            }
        }

        private async void OnRefreshQueueClicked(object sender, RoutedEventArgs e)
        {
            await ReloadOrdersQueueAsync();
            ShowStatusMessage("Queue refreshed from NAS ledger.");
        }

        private void OnOpenWebPortalClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = "https://creative.suamisihat.myds.me/#order-form",
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[OrderRequestsPage] OpenWebPortal error: " + ex.Message);
            }
        }

        private void OnNewOrderClicked(object sender, RoutedEventArgs e)
        {
            if (NavigationService != null)
            {
                NavigationService.Navigate(new ProjectCreatorPage());
            }
        }

        private void OnCopyScriptClicked(object sender, RoutedEventArgs e)
        {
            if (_selectedOrder != null && !string.IsNullOrWhiteSpace(_selectedOrder.Copy))
            {
                ClipboardService.SetText(_selectedOrder.Copy);
                ShowStatusMessage("Script copied to clipboard!");
            }
        }

        private async void OnConvertOrderClicked(object sender, RoutedEventArgs e)
        {
            if (_selectedOrder == null) return;

            if (string.IsNullOrWhiteSpace(_workspaceRoot) || !Directory.Exists(_workspaceRoot))
            {
                MessageBox.Show(
                    "Workspace root path is not configured or currently inaccessible.\nPlease verify your Synology NAS connection in Settings.",
                    "Workspace Not Available",
                    MessageBoxButton.OK,
                    MessageBoxImage.Warning
                );
                return;
            }

            try
            {
                BtnConvertProject.IsEnabled = false;
                ShowStatusMessage("Scaffolding project folders and COPY.md on NAS...");

                string assignee = (CmbAssignee != null && CmbAssignee.SelectedItem != null) ? CmbAssignee.SelectedItem.ToString() : "0001D - Harussani";
                string staffId = "0001D";
                string staffName = "Harussani";

                var parts = assignee.Split(new[] { " - " }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length == 2)
                {
                    staffId = parts[0].Trim();
                    staffName = parts[1].Trim();
                }

                // Execute complete project conversion and scaffolding
                string createdPath = await CreativeOrderService.ConvertOrderToProjectAsync(
                    _selectedOrder,
                    _workspaceRoot,
                    staffId,
                    staffName,
                    ".af"
                );

                ShowStatusMessage("Project created successfully!");
                NotificationService.ShowSuccess("Project Scaffolded", string.Format("Converted order {0} into official project on NAS.", _selectedOrder.Id));

                // Reload queue to reflect 'in_progress' and new 'projectId'
                await ReloadOrdersQueueAsync();

                // Ask to open in Explorer
                var dlg = MessageBox.Show(
                    string.Format("Project successfully scaffolded on NAS:\n\n{0}\n\nWould you like to open this folder in Windows Explorer?", createdPath),
                    "Project Conversion Complete",
                    MessageBoxButton.YesNo,
                    MessageBoxImage.Information
                );

                if (dlg == MessageBoxResult.Yes && Directory.Exists(createdPath))
                {
                    Process.Start("explorer.exe", createdPath);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show(
                    string.Format("Could not convert order: {0}", ex.Message),
                    "Conversion Error",
                    MessageBoxButton.OK,
                    MessageBoxImage.Error
                );
                ShowStatusMessage("Failed to convert project.");
            }
            finally
            {
                BtnConvertProject.IsEnabled = true;
            }
        }

        private async void OnMarkInProgressClicked(object sender, RoutedEventArgs e)
        {
            if (_selectedOrder == null) return;
            string designer = (CmbAssignee != null && CmbAssignee.SelectedItem != null) ? CmbAssignee.SelectedItem.ToString() : "Designer";

            await CreativeOrderService.UpdateOrderAsync(
                _workspaceRoot,
                _selectedOrder.Id,
                "in_progress",
                designer
            );

            ShowStatusMessage("Order status updated to In Progress.");
            await ReloadOrdersQueueAsync();
        }

        private async void OnMarkCompletedClicked(object sender, RoutedEventArgs e)
        {
            if (_selectedOrder == null) return;

            await CreativeOrderService.UpdateOrderAsync(
                _workspaceRoot,
                _selectedOrder.Id,
                "done"
            );

            ShowStatusMessage("Order marked as Completed.");
            await ReloadOrdersQueueAsync();
        }

        private void OnOpenExistingProjectClicked(object sender, RoutedEventArgs e)
        {
            if (_selectedOrder == null || !_selectedOrder.IsConverted) return;

            string projectDir = ResolveExistingProjectDirectory(_selectedOrder.ProjectId);
            if (!string.IsNullOrEmpty(projectDir) && Directory.Exists(projectDir))
            {
                Process.Start("explorer.exe", projectDir);
            }
            else
            {
                MessageBox.Show(
                    string.Format("Could not locate project directory '{0}' in active workspace.", _selectedOrder.ProjectId),
                    "Folder Not Found",
                    MessageBoxButton.OK,
                    MessageBoxImage.Warning
                );
            }
        }

        private async void OnRejectOrderClicked(object sender, RoutedEventArgs e)
        {
            if (_selectedOrder == null) return;

            var confirm = MessageBox.Show(
                string.Format("Are you sure you want to reject and cancel this creative order request?\n\nTitle: {0}\nOrder ID: {1}\nRequester: {2}\n\nThis will mark the order as Cancelled and remove it from active processing.", 
                    _selectedOrder.SafeTitle, _selectedOrder.Id, _selectedOrder.Requester ?? "Requester"),
                "Reject / Cancel Order Request",
                MessageBoxButton.YesNo,
                MessageBoxImage.Warning
            );

            if (confirm != MessageBoxResult.Yes) return;

            try
            {
                await CreativeOrderService.CancelOrderAsync(_workspaceRoot, _selectedOrder.Id, "Cancelled by designer / admin in SS-CAM Desktop");
                ShowStatusMessage(string.Format("Order {0} has been cancelled.", _selectedOrder.Id));
                NotificationService.ShowWarning("Order Cancelled", string.Format("Order {0} has been cancelled.", _selectedOrder.Id));
                await ReloadOrdersQueueAsync();
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[OrderRequestsPage] OnRejectOrderClicked error: " + ex.Message);
                MessageBox.Show("Failed to cancel order: " + ex.Message, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void OnContextMenuAcceptClicked(object sender, RoutedEventArgs e)
        {
            OnMarkInProgressClicked(sender, e);
        }

        private void OnContextMenuConvertClicked(object sender, RoutedEventArgs e)
        {
            OnConvertOrderClicked(sender, e);
        }

        private void OnContextMenuCopyScriptClicked(object sender, RoutedEventArgs e)
        {
            OnCopyScriptClicked(sender, e);
        }

        private void OnContextMenuRejectClicked(object sender, RoutedEventArgs e)
        {
            OnRejectOrderClicked(sender, e);
        }

        private void OnListBoxItemPreviewMouseRightButtonDown(object sender, MouseButtonEventArgs e)
        {
            var item = sender as ListBoxItem;
            if (item != null)
            {
                item.IsSelected = true;
                item.Focus();
            }
        }

        private void ShowStatusMessage(string msg)
        {
            if (TxtActionStatusMessage != null)
            {
                TxtActionStatusMessage.Text = msg;
                TxtActionStatusMessage.Visibility = Visibility.Visible;
            }
        }
    }
}
