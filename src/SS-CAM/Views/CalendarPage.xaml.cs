using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using SS_CAM.Models;
using SS_CAM.Services;
using SS_CAM.Utilities;
using Wpf.Ui.Controls;
using TextBlock = System.Windows.Controls.TextBlock;

namespace SS_CAM.Views
{
    public class CalendarDayEventItem
    {
        public string Project { get; set; }
        public string FullPath { get; set; }
        public string Priority { get; set; }
        public string PriorityColor { get; set; }
        public string EventType { get; set; }  // "Deadline" or "Started"
        public string Status { get; set; }
        public string DesignerDisplay { get; set; }
    }

    public partial class CalendarPage : Page
    {
        private string _workspaceRoot = "";
        private int _currentYear = DateTime.Today.Year;
        private int _currentMonth = DateTime.Today.Month;
        private List<ProjectStatusItem> _allProjects = new List<ProjectStatusItem>();
        private bool _isPopulatingFilter = false;
        private bool _isGanttView = false;

        public CalendarPage()
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
                Debug.WriteLine("[CalendarPage] OnPageLoaded error: " + ex.Message);
            }
        }

        private void OnScrollViewerPreviewMouseWheel(object sender, MouseWheelEventArgs e)
        {
            var scroller = (sender as ScrollViewer) ?? PageScrollViewer;
            if (scroller != null)
            {
                scroller.ScrollToVerticalOffset(scroller.VerticalOffset - (e.Delta / 2.0));
                e.Handled = true;
            }
        }

        private void PopulateDesignerFilter()
        {
            try
            {
                _isPopulatingFilter = true;
                string currentSelection = DesignerFilter.SelectedItem != null ? DesignerFilter.SelectedItem.ToString() : "All Designers";

                HashSet<string> designerSet = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                List<StaffDirectoryItem> staffList = null;
                try { staffList = UserProfileService.GetStaffDirectory(_workspaceRoot); }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[CalendarPage] GetStaffDirectory: " + ex.Message); }

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

                DesignerFilter.Items.Clear();
                DesignerFilter.Items.Add("All Designers");
                foreach (string d in designerSet)
                {
                    DesignerFilter.Items.Add(d);
                }

                int selectedIdx = 0;
                for (int i = 0; i < DesignerFilter.Items.Count; i++)
                {
                    if (string.Equals(DesignerFilter.Items[i].ToString(), currentSelection, StringComparison.OrdinalIgnoreCase))
                    {
                        selectedIdx = i;
                        break;
                    }
                }
                DesignerFilter.SelectedIndex = selectedIdx;
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CalendarPage] PopulateFilter error: " + ex.Message);
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

                if (string.IsNullOrWhiteSpace(_workspaceRoot) || !Directory.Exists(_workspaceRoot))
                {
                    PopulateDesignerFilter();
                    RenderCalendarGrid();
                    return;
                }

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
                UpdateMetrics();
                RenderCalendarGrid();
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CalendarPage] LoadProjects error: " + ex.Message);
                RenderCalendarGrid();
            }
        }

        private List<ProjectStatusItem> GetFilteredProjects()
        {
            List<ProjectStatusItem> filtered = new List<ProjectStatusItem>();
            string designerFilter = DesignerFilter.SelectedItem != null ? DesignerFilter.SelectedItem.ToString() : "All Designers";
            string statusFilter = "";
            if (StatusFilter != null && StatusFilter.SelectedItem is ComboBoxItem)
            {
                string sel = ((ComboBoxItem)StatusFilter.SelectedItem).Content.ToString();
                if (sel != "All Statuses") statusFilter = sel;
            }
            string searchQuery = TxtSearchQuery != null ? TxtSearchQuery.Text.Trim().ToLowerInvariant() : "";

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
            return filtered;
        }

        private void UpdateMetrics()
        {
            try
            {
                List<ProjectStatusItem> filtered = GetFilteredProjects();
                int total = filtered.Count;
                int deadlinesThisMonth = 0;
                int startedThisMonth = 0;
                int overdueCount = 0;

                DateTime firstDayOfMonth = new DateTime(_currentYear, _currentMonth, 1);
                DateTime lastDayOfMonth = firstDayOfMonth.AddMonths(1).AddDays(-1);

                foreach (ProjectStatusItem p in filtered)
                {
                    if (p == null) continue;

                    // Deadlines this month
                    DateTime dtDeadline;
                    if (!string.IsNullOrWhiteSpace(p.Deadline) && DateTime.TryParse(p.Deadline, out dtDeadline))
                    {
                        if (dtDeadline >= firstDayOfMonth && dtDeadline <= lastDayOfMonth)
                        {
                            deadlinesThisMonth++;
                        }
                        string st = (p.Status ?? "").ToLowerInvariant();
                        if (dtDeadline < DateTime.Today && st != "done" && st != "approved" && st != "completed")
                        {
                            overdueCount++;
                        }
                    }

                    // Started this month
                    DateTime dtCreated = p.ParsedCreatedDate;
                    if (dtCreated >= firstDayOfMonth && dtCreated <= lastDayOfMonth)
                    {
                        startedThisMonth++;
                    }
                }

                if (MetricDeadlinesMonth != null) MetricDeadlinesMonth.Text = deadlinesThisMonth.ToString();
                if (MetricStartedMonth != null) MetricStartedMonth.Text = startedThisMonth.ToString();
                if (MetricOverdue != null) MetricOverdue.Text = overdueCount.ToString();
                if (MetricTotalProjects != null) MetricTotalProjects.Text = total.ToString();
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CalendarPage] UpdateMetrics error: " + ex.Message);
            }
        }

        private void RenderCalendarGrid()
        {
            try
            {
                if (TxtCurrentMonthTitle != null)
                {
                    DateTime activeMonthDate = new DateTime(_currentYear, _currentMonth, 1);
                    List<MalaysiaHolidayItem> monthHolidays = MalaysiaHolidayService.GetHolidaysForMonth(_currentYear, _currentMonth);
                    if (monthHolidays != null && monthHolidays.Count > 0)
                    {
                        TxtCurrentMonthTitle.Text = string.Format("{0}  (🇲🇾 {1} Public Holiday{2})",
                            activeMonthDate.ToString("MMMM yyyy", CultureInfo.InvariantCulture),
                            monthHolidays.Count,
                            monthHolidays.Count > 1 ? "s" : "");
                    }
                    else
                    {
                        TxtCurrentMonthTitle.Text = activeMonthDate.ToString("MMMM yyyy", CultureInfo.InvariantCulture);
                    }
                }

                if (CalendarGrid == null) return;
                CalendarGrid.Children.Clear();

                DateTime firstOfMonth = new DateTime(_currentYear, _currentMonth, 1);
                int dayOfWeek = (int)firstOfMonth.DayOfWeek; // 0 = Sunday
                int daysInMonth = DateTime.DaysInMonth(_currentYear, _currentMonth);

                List<ProjectStatusItem> filtered = GetFilteredProjects();

                // Map events by date (key: YYYY-MM-DD)
                Dictionary<string, List<CalendarDayEventItem>> eventMap = new Dictionary<string, List<CalendarDayEventItem>>(StringComparer.OrdinalIgnoreCase);

                foreach (ProjectStatusItem p in filtered)
                {
                    if (p == null) continue;

                    // 1. Deadline event
                    DateTime dtDeadline;
                    if (!string.IsNullOrWhiteSpace(p.Deadline) && DateTime.TryParse(p.Deadline, out dtDeadline))
                    {
                        string key = dtDeadline.ToString("yyyy-MM-dd");
                        if (!eventMap.ContainsKey(key)) eventMap[key] = new List<CalendarDayEventItem>();
                        eventMap[key].Add(new CalendarDayEventItem
                        {
                            Project = p.Project,
                            FullPath = p.FullPath,
                            Priority = p.Priority ?? "medium",
                            PriorityColor = p.PriorityColor,
                            EventType = "Deadline",
                            Status = p.Status ?? "in-progress",
                            DesignerDisplay = string.Format("Designer: {0} | Client: {1}", p.Designer ?? "N/A", p.Client ?? "SS")
                        });
                    }

                    // 2. Creation date event
                    string createdKey = p.CreatedDateDisplay;
                    if (!string.IsNullOrWhiteSpace(createdKey) && createdKey != "N/A")
                    {
                        if (!eventMap.ContainsKey(createdKey)) eventMap[createdKey] = new List<CalendarDayEventItem>();
                        eventMap[createdKey].Add(new CalendarDayEventItem
                        {
                            Project = p.Project,
                            FullPath = p.FullPath,
                            Priority = p.Priority ?? "medium",
                            PriorityColor = p.PriorityColor,
                            EventType = "Started",
                            Status = p.Status ?? "in-progress",
                            DesignerDisplay = string.Format("Designer: {0} | Client: {1}", p.Designer ?? "N/A", p.Client ?? "SS")
                        });
                    }
                }

                // Render 35 cells (5 weeks) or 42 cells (6 weeks)
                int totalCells = (dayOfWeek + daysInMonth > 35) ? 42 : 35;
                DateTime startDate = firstOfMonth.AddDays(-dayOfWeek);

                for (int i = 0; i < totalCells; i++)
                {
                    DateTime cellDate = startDate.AddDays(i);
                    bool isCurrentMonth = cellDate.Month == _currentMonth;
                    bool isToday = cellDate.Date == DateTime.Today;
                    string dateKey = cellDate.ToString("yyyy-MM-dd");

                    List<CalendarDayEventItem> dayEvents = eventMap.ContainsKey(dateKey) ? eventMap[dateKey] : new List<CalendarDayEventItem>();

                    UIElement cellUI = CreateDayCellUI(cellDate, isCurrentMonth, isToday, dayEvents);
                    CalendarGrid.Children.Add(cellUI);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CalendarPage] RenderCalendarGrid error: " + ex.Message);
            }
        }

        private UIElement CreateDayCellUI(DateTime date, bool isCurrentMonth, bool isToday, List<CalendarDayEventItem> events)
        {
            CardAction card = new CardAction
            {
                MinHeight = 135,
                Margin = new Thickness(0, 0, 4, 4),
                Padding = new Thickness(6),
                Cursor = Cursors.Hand,
                Tag = date,
                Opacity = isCurrentMonth ? 1.0 : 0.4
            };

            card.Click += OnDayCardClicked;
            card.PreviewMouseWheel += OnScrollViewerPreviewMouseWheel;

            Grid cellGrid = new Grid();
            cellGrid.RowDefinitions.Add(new RowDefinition { Height = GridLength.Auto });
            cellGrid.RowDefinitions.Add(new RowDefinition { Height = new GridLength(1, GridUnitType.Star) });

            // Top Bar: Day Number + Today Badge
            StackPanel topPanel = new StackPanel { Orientation = Orientation.Horizontal, Margin = new Thickness(0, 0, 0, 4) };
            
            Border numBadge = new Border
            {
                CornerRadius = new CornerRadius(10),
                Padding = new Thickness(6, 2, 6, 2),
                Background = isToday ? (Brush)Application.Current.Resources["FluentBrand80"] : Brushes.Transparent
            };

            TextBlock txtNum = new TextBlock
            {
                Text = date.Day.ToString(),
                FontSize = 11,
                FontWeight = isToday ? FontWeights.Bold : FontWeights.SemiBold,
                Foreground = isToday ? Brushes.White : (Brush)Application.Current.Resources["TextFillColorPrimaryBrush"]
            };
            numBadge.Child = txtNum;
            topPanel.Children.Add(numBadge);

            if (date.DayOfWeek == DayOfWeek.Friday)
            {
                TextBlock friBadge = new TextBlock
                {
                    Text = " Solat",
                    FontSize = 9,
                    Foreground = (Brush)Application.Current.Resources["FluentBrand80"],
                    VerticalAlignment = VerticalAlignment.Center,
                    Margin = new Thickness(4, 0, 0, 0)
                };
                topPanel.Children.Add(friBadge);
            }

            // Malaysia Public Holiday Tag
            MalaysiaHolidayItem holiday = MalaysiaHolidayService.GetHoliday(date);
            if (holiday != null)
            {
                Border holBadge = new Border
                {
                    CornerRadius = new CornerRadius(3),
                    Padding = new Thickness(4, 1, 4, 1),
                    Margin = new Thickness(4, 0, 0, 0),
                    Background = new SolidColorBrush(Color.FromArgb(40, 239, 68, 68)),
                    BorderBrush = new SolidColorBrush(Color.FromArgb(120, 239, 68, 68)),
                    BorderThickness = new Thickness(1),
                    ToolTip = "Malaysia Public Holiday: " + holiday.Name
                };
                TextBlock holTxt = new TextBlock
                {
                    Text = "🇲🇾 " + holiday.ShortName,
                    FontSize = 8.5,
                    FontWeight = FontWeights.Bold,
                    Foreground = new SolidColorBrush(Color.FromRgb(220, 38, 38)),
                    VerticalAlignment = VerticalAlignment.Center
                };
                holBadge.Child = holTxt;
                topPanel.Children.Add(holBadge);
            }

            Grid.SetRow(topPanel, 0);
            cellGrid.Children.Add(topPanel);

            // Stack of Event Chips
            StackPanel eventStack = new StackPanel();
            Grid.SetRow(eventStack, 1);

            // Prepend Holiday Chip if applicable
            if (holiday != null)
            {
                Border holChip = new Border
                {
                    CornerRadius = new CornerRadius(3),
                    Padding = new Thickness(4, 2, 4, 2),
                    Margin = new Thickness(0, 0, 0, 3),
                    Background = new SolidColorBrush(Color.FromArgb(30, 239, 68, 68)),
                    BorderBrush = new SolidColorBrush(Color.FromArgb(90, 239, 68, 68)),
                    BorderThickness = new Thickness(1),
                    ToolTip = "Malaysia Public Holiday: " + holiday.Name
                };
                StackPanel holPanel = new StackPanel { Orientation = Orientation.Horizontal };
                TextBlock holIcon = new TextBlock
                {
                    Text = "🇲🇾",
                    FontSize = 9.5,
                    Margin = new Thickness(0, 0, 4, 0),
                    VerticalAlignment = VerticalAlignment.Center
                };
                TextBlock holTitle = new TextBlock
                {
                    Text = holiday.Name,
                    FontSize = 9.5,
                    FontWeight = FontWeights.SemiBold,
                    TextTrimming = TextTrimming.CharacterEllipsis,
                    Foreground = new SolidColorBrush(Color.FromRgb(220, 38, 38)),
                    VerticalAlignment = VerticalAlignment.Center
                };
                holPanel.Children.Add(holIcon);
                holPanel.Children.Add(holTitle);
                holChip.Child = holPanel;
                eventStack.Children.Add(holChip);
            }

            int displayCount = Math.Min(holiday != null ? 2 : 3, events.Count);
            for (int e = 0; e < displayCount; e++)
            {
                CalendarDayEventItem item = events[e];
                Border chip = new Border
                {
                    CornerRadius = new CornerRadius(3),
                    Padding = new Thickness(4, 2, 4, 2),
                    Margin = new Thickness(0, 0, 0, 3),
                    Background = (item.EventType == "Deadline" && date.Date < DateTime.Today && (item.Status ?? "").ToLower() != "done")
                        ? (Brush)Application.Current.Resources["SystemFillColorCriticalBrush"]
                        : (item.EventType == "Deadline" && date.Date == DateTime.Today)
                            ? (Brush)Application.Current.Resources["SystemFillColorCautionBrush"]
                            : (Brush)Application.Current.Resources["CardBackgroundFillColorSecondaryBrush"],
                    ContextMenu = CreateQuickStatusContextMenu(item.FullPath, item.Status)
                };

                StackPanel chipPanel = new StackPanel { Orientation = Orientation.Horizontal };

                Border dot = new Border
                {
                    Width = 6,
                    Height = 6,
                    CornerRadius = new CornerRadius(3),
                    Margin = new Thickness(0, 0, 4, 0),
                    VerticalAlignment = VerticalAlignment.Center,
                    Background = GetPriorityBrush(item.PriorityColor)
                };
                chipPanel.Children.Add(dot);

                TextBlock txtEvent = new TextBlock
                {
                    Text = string.Format("{0}: {1}", item.EventType == "Deadline" ? "Due" : "Start", item.Project),
                    FontSize = 9.5,
                    TextTrimming = TextTrimming.CharacterEllipsis,
                    Foreground = (item.EventType == "Deadline" && date.Date < DateTime.Today && (item.Status ?? "").ToLower() != "done")
                        ? Brushes.White
                        : (Brush)Application.Current.Resources["TextFillColorPrimaryBrush"],
                    VerticalAlignment = VerticalAlignment.Center
                };
                chipPanel.Children.Add(txtEvent);

                chip.Child = chipPanel;
                eventStack.Children.Add(chip);
            }

            int maxDisplay = holiday != null ? 2 : 3;
            if (events.Count > maxDisplay)
            {
                TextBlock txtMore = new TextBlock
                {
                    Text = string.Format("+{0} more", events.Count - maxDisplay),
                    FontSize = 9,
                    FontWeight = FontWeights.Bold,
                    Foreground = (Brush)Application.Current.Resources["TextFillColorSecondaryBrush"],
                    Margin = new Thickness(2, 2, 0, 0)
                };
                eventStack.Children.Add(txtMore);
            }

            cellGrid.Children.Add(eventStack);
            card.Content = cellGrid;
            return card;
        }

        private static SolidColorBrush GetPriorityBrush(string hex)
        {
            try
            {
                if (!string.IsNullOrWhiteSpace(hex))
                    return (SolidColorBrush)new BrushConverter().ConvertFromString(hex);
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CalendarPage] GetPriorityBrush error: " + ex.Message);
            }
            return new SolidColorBrush(Color.FromRgb(33, 161, 247));
        }

        private void OnDayCardClicked(object sender, RoutedEventArgs e)
        {
            CardAction card = sender as CardAction;
            if (card == null || card.Tag == null) return;

            DateTime cellDate = (DateTime)card.Tag;
            string dateKey = cellDate.ToString("yyyy-MM-dd");

            List<ProjectStatusItem> filtered = GetFilteredProjects();
            List<CalendarDayEventItem> dayEvents = new List<CalendarDayEventItem>();

            // Prepend Malaysia Public Holiday if applicable
            MalaysiaHolidayItem holiday = MalaysiaHolidayService.GetHoliday(cellDate);
            if (holiday != null)
            {
                dayEvents.Add(new CalendarDayEventItem
                {
                    Project = "🇲🇾 " + holiday.Name,
                    FullPath = "",
                    Priority = "Holiday",
                    PriorityColor = "#EF4444",
                    EventType = "Public Holiday",
                    DesignerDisplay = holiday.Description
                });
            }

            foreach (ProjectStatusItem p in filtered)
            {
                if (p == null) continue;

                DateTime dtDead;
                if (!string.IsNullOrWhiteSpace(p.Deadline) &&
                    DateTime.TryParse(p.Deadline, out dtDead) &&
                    dtDead.Date == cellDate.Date)
                {
                    dayEvents.Add(new CalendarDayEventItem
                    {
                        Project = p.Project,
                        FullPath = p.FullPath,
                        Priority = p.Priority ?? "medium",
                        PriorityColor = p.PriorityColor,
                        EventType = "Deadline",
                        DesignerDisplay = string.Format("Designer: {0} | Client: {1}", p.Designer ?? "N/A", p.Client ?? "SS")
                    });
                }

                if (p.ParsedCreatedDate.Date == cellDate.Date)
                {
                    dayEvents.Add(new CalendarDayEventItem
                    {
                        Project = p.Project,
                        FullPath = p.FullPath,
                        Priority = p.Priority ?? "medium",
                        PriorityColor = p.PriorityColor,
                        EventType = "Started",
                        DesignerDisplay = string.Format("Designer: {0} | Client: {1}", p.Designer ?? "N/A", p.Client ?? "SS")
                    });
                }
            }

            DayDetailTitle.Text = cellDate.ToString("MMMM dd, yyyy", CultureInfo.InvariantCulture);
            DayDetailSubtitle.Text = string.Format("{0} scheduled item(s)", dayEvents.Count);
            DayDetailItemsList.ItemsSource = dayEvents;
            DayDetailPanel.Visibility = Visibility.Visible;
        }

        private void OnCloseDayDetail(object sender, RoutedEventArgs e)
        {
            DayDetailPanel.Visibility = Visibility.Collapsed;
        }

        private void OnOpenProjectFolderClicked(object sender, RoutedEventArgs e)
        {
            FrameworkElement el = sender as FrameworkElement;
            if (el == null || el.Tag == null) return;
            string path = el.Tag.ToString();

            try
            {
                if (Directory.Exists(path))
                {
                    Process.Start(new ProcessStartInfo
                    {
                        FileName = path,
                        UseShellExecute = true
                    });
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CalendarPage] OpenFolder error: " + ex.Message);
            }
        }

        private void OnPrevMonthClicked(object sender, RoutedEventArgs e)
        {
            _currentMonth--;
            if (_currentMonth < 1)
            {
                _currentMonth = 12;
                _currentYear--;
            }
            UpdateMetrics();
            if (_isGanttView) RenderGanttTimeline(); else RenderCalendarGrid();
        }

        private void OnNextMonthClicked(object sender, RoutedEventArgs e)
        {
            _currentMonth++;
            if (_currentMonth > 12)
            {
                _currentMonth = 1;
                _currentYear++;
            }
            UpdateMetrics();
            if (_isGanttView) RenderGanttTimeline(); else RenderCalendarGrid();
        }

        private void OnTodayClicked(object sender, RoutedEventArgs e)
        {
            _currentYear = DateTime.Today.Year;
            _currentMonth = DateTime.Today.Month;
            UpdateMetrics();
            if (_isGanttView) RenderGanttTimeline(); else RenderCalendarGrid();
        }

        private void OnSearchQueryChanged(object sender, TextChangedEventArgs e)
        {
            if (!IsLoaded || _isPopulatingFilter) return;
            UpdateMetrics();
            if (_isGanttView) RenderGanttTimeline(); else RenderCalendarGrid();
        }

        private void OnFilterChanged(object sender, SelectionChangedEventArgs e)
        {
            if (!IsLoaded || _isPopulatingFilter) return;
            UpdateMetrics();
            if (_isGanttView) RenderGanttTimeline(); else RenderCalendarGrid();
        }

        private void OnRefreshClicked(object sender, RoutedEventArgs e)
        {
            LoadProjects();
        }

        private System.Windows.Controls.ContextMenu CreateQuickStatusContextMenu(string projectPath, string currentStatus)
        {
            System.Windows.Controls.ContextMenu menu = new System.Windows.Controls.ContextMenu();
            string[] statuses = new[] { "backlog", "in-progress", "review", "done", "on-hold" };

            System.Windows.Controls.MenuItem header = new System.Windows.Controls.MenuItem
            {
                Header = "Change Status to:",
                IsEnabled = false,
                FontWeight = FontWeights.Bold
            };
            menu.Items.Add(header);
            menu.Items.Add(new System.Windows.Controls.Separator());

            foreach (string st in statuses)
            {
                System.Windows.Controls.MenuItem item = new System.Windows.Controls.MenuItem
                {
                    Header = st,
                    IsChecked = string.Equals(st, currentStatus, StringComparison.OrdinalIgnoreCase),
                    Tag = new Tuple<string, string>(projectPath, st)
                };
                item.Click += OnQuickStatusMenuClicked;
                menu.Items.Add(item);
            }

            return menu;
        }

        private void OnQuickStatusMenuClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                System.Windows.Controls.MenuItem item = sender as System.Windows.Controls.MenuItem;
                if (item == null || item.Tag == null) return;

                Tuple<string, string> data = item.Tag as Tuple<string, string>;
                if (data == null) return;

                string projectPath = data.Item1;
                string newStatus = data.Item2;

                if (!string.IsNullOrWhiteSpace(projectPath) && Directory.Exists(projectPath))
                {
                    ProjectStatusItem statusItem = FrontmatterService.ReadStatus(projectPath);
                    if (statusItem != null)
                    {
                        statusItem.Status = newStatus;
                        FrontmatterService.WriteStatus(statusItem);
                        LoadProjects();
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CalendarPage] Quick status menu error: " + ex.Message);
            }
        }

        private void OnViewGridClicked(object sender, RoutedEventArgs e)
        {
            _isGanttView = false;
            if (BtnViewGrid != null) BtnViewGrid.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
            if (BtnViewGantt != null) BtnViewGantt.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (CalendarGridContainer != null) CalendarGridContainer.Visibility = Visibility.Visible;
            if (GanttContainer != null) GanttContainer.Visibility = Visibility.Collapsed;
            RenderCalendarGrid();
        }

        private void OnViewGanttClicked(object sender, RoutedEventArgs e)
        {
            _isGanttView = true;
            if (BtnViewGrid != null) BtnViewGrid.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnViewGantt != null) BtnViewGantt.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
            if (CalendarGridContainer != null) CalendarGridContainer.Visibility = Visibility.Collapsed;
            if (GanttContainer != null) GanttContainer.Visibility = Visibility.Visible;
            RenderGanttTimeline();
        }

        private void RenderGanttTimeline()
        {
            try
            {
                if (GanttHeaderGrid == null || GanttRowsStack == null) return;

                if (TxtCurrentMonthTitle != null)
                {
                    DateTime activeMonthDate = new DateTime(_currentYear, _currentMonth, 1);
                    List<MalaysiaHolidayItem> monthHolidays = MalaysiaHolidayService.GetHolidaysForMonth(_currentYear, _currentMonth);
                    if (monthHolidays != null && monthHolidays.Count > 0)
                    {
                        TxtCurrentMonthTitle.Text = string.Format("{0}  (🇲🇾 {1} Public Holiday{2})",
                            activeMonthDate.ToString("MMMM yyyy", CultureInfo.InvariantCulture),
                            monthHolidays.Count,
                            monthHolidays.Count > 1 ? "s" : "");
                    }
                    else
                    {
                        TxtCurrentMonthTitle.Text = activeMonthDate.ToString("MMMM yyyy", CultureInfo.InvariantCulture);
                    }
                }

                GanttHeaderGrid.Children.Clear();
                GanttHeaderGrid.ColumnDefinitions.Clear();
                GanttRowsStack.Children.Clear();

                int daysInMonth = DateTime.DaysInMonth(_currentYear, _currentMonth);

                // Column 0 for Project Title label (width 160)
                GanttHeaderGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(160) });
                TextBlock titleHeader = new TextBlock
                {
                    Text = "PROJECT NAME",
                    FontWeight = FontWeights.Bold,
                    FontSize = 10,
                    Foreground = (Brush)Application.Current.FindResource("TextFillColorSecondaryBrush"),
                    VerticalAlignment = VerticalAlignment.Center,
                    Margin = new Thickness(4, 0, 0, 0)
                };
                Grid.SetColumn(titleHeader, 0);
                GanttHeaderGrid.Children.Add(titleHeader);

                // Columns 1 to daysInMonth for days
                for (int day = 1; day <= daysInMonth; day++)
                {
                    GanttHeaderGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });

                    DateTime dt = new DateTime(_currentYear, _currentMonth, day);
                    bool isToday = (dt.Date == DateTime.Today);
                    MalaysiaHolidayItem holiday = MalaysiaHolidayService.GetHoliday(dt);

                    TextBlock dayText = new TextBlock
                    {
                        Text = day.ToString(),
                        FontWeight = isToday || holiday != null ? FontWeights.Bold : FontWeights.Normal,
                        FontSize = 10,
                        Foreground = isToday 
                            ? (Brush)Application.Current.FindResource("FluentBrand80")
                            : (holiday != null ? new SolidColorBrush(Color.FromRgb(220, 38, 38)) : (Brush)Application.Current.FindResource("TextFillColorSecondaryBrush")),
                        ToolTip = holiday != null ? ("🇲🇾 " + holiday.Name) : null,
                        HorizontalAlignment = HorizontalAlignment.Center,
                        VerticalAlignment = VerticalAlignment.Center
                    };
                    Grid.SetColumn(dayText, day);
                    GanttHeaderGrid.Children.Add(dayText);
                }

                // Filter projects matching search, designer, and status
                List<ProjectStatusItem> filtered = GetFilteredProjects();

                if (filtered.Count == 0)
                {
                    TextBlock emptyMsg = new TextBlock
                    {
                        Text = "No projects active for this period.",
                        Foreground = (Brush)Application.Current.FindResource("TextFillColorSecondaryBrush"),
                        FontSize = 12,
                        Margin = new Thickness(0, 16, 0, 16),
                        HorizontalAlignment = HorizontalAlignment.Center
                    };
                    GanttRowsStack.Children.Add(emptyMsg);
                    return;
                }

                foreach (ProjectStatusItem p in filtered)
                {
                    if (p == null) continue;

                    Border rowBorder = new Border
                    {
                        BorderBrush = (Brush)Application.Current.FindResource("CardStrokeColorDefaultBrush"),
                        BorderThickness = new Thickness(0, 0, 0, 1),
                        Padding = new Thickness(0, 6, 0, 6)
                    };

                    Grid rowGrid = new Grid();
                    rowGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(160) });
                    for (int day = 1; day <= daysInMonth; day++)
                    {
                        rowGrid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) });
                    }

                    // Project Title Label Column
                    StackPanel nameStack = new StackPanel { VerticalAlignment = VerticalAlignment.Center };
                    TextBlock pName = new TextBlock
                    {
                        Text = p.Project ?? "Untitled",
                        FontSize = 11,
                        FontWeight = FontWeights.SemiBold,
                        Foreground = (Brush)Application.Current.FindResource("TextFillColorPrimaryBrush"),
                        TextTrimming = TextTrimming.CharacterEllipsis
                    };
                    TextBlock pSub = new TextBlock
                    {
                        Text = string.Format("{0} • {1}", p.Designer ?? "Unknown", p.Status ?? "backlog"),
                        FontSize = 9,
                        Foreground = (Brush)Application.Current.FindResource("TextFillColorSecondaryBrush"),
                        TextTrimming = TextTrimming.CharacterEllipsis
                    };
                    nameStack.Children.Add(pName);
                    nameStack.Children.Add(pSub);
                    Grid.SetColumn(nameStack, 0);
                    rowGrid.Children.Add(nameStack);

                    // Determine start and end day for timeline bar
                    DateTime monthStart = new DateTime(_currentYear, _currentMonth, 1);
                    DateTime monthEnd = new DateTime(_currentYear, _currentMonth, daysInMonth);

                    DateTime startDt = monthStart;
                    DateTime endDt = monthEnd;

                    DateTime parsedCreated;
                    if (DateTime.TryParse(p.CreatedDate, out parsedCreated))
                    {
                        startDt = parsedCreated;
                    }

                    DateTime parsedDeadline;
                    if (DateTime.TryParse(p.Deadline, out parsedDeadline))
                    {
                        endDt = parsedDeadline;
                    }

                    // Clamp to current month view range
                    if (startDt < monthStart) startDt = monthStart;
                    if (endDt > monthEnd) endDt = monthEnd;

                    int startDay = (startDt.Month == _currentMonth && startDt.Year == _currentYear) ? startDt.Day : 1;
                    int endDay = (endDt.Month == _currentMonth && endDt.Year == _currentYear) ? endDt.Day : daysInMonth;

                    if (startDay > endDay) startDay = endDay;

                    int colSpan = Math.Max(1, (endDay - startDay) + 1);

                    // Timeline bar element
                    Brush barBrush = GetStatusBrush(p.Status);
                    Border bar = new Border
                    {
                        Background = barBrush,
                        CornerRadius = new CornerRadius(4),
                        Height = 18,
                        VerticalAlignment = VerticalAlignment.Center,
                        Margin = new Thickness(1, 0, 1, 0),
                        ToolTip = string.Format("Project: {0}\nDesigner: {1}\nStatus: {2}\nStart: {3}\nDeadline: {4}",
                            p.Project, p.Designer, p.Status, p.CreatedDateDisplay, p.DeadlineDisplay)
                    };

                    TextBlock barText = new TextBlock
                    {
                        Text = p.Project,
                        FontSize = 9,
                        FontWeight = FontWeights.Bold,
                        Foreground = Brushes.White,
                        HorizontalAlignment = HorizontalAlignment.Center,
                        VerticalAlignment = VerticalAlignment.Center,
                        TextTrimming = TextTrimming.CharacterEllipsis,
                        Margin = new Thickness(4, 0, 4, 0)
                    };
                    bar.Child = barText;

                    Grid.SetColumn(bar, startDay);
                    Grid.SetColumnSpan(bar, colSpan);
                    rowGrid.Children.Add(bar);

                    rowBorder.Child = rowGrid;
                    GanttRowsStack.Children.Add(rowBorder);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[CalendarPage] RenderGanttTimeline error: " + ex.Message);
            }
        }

        private Brush GetStatusBrush(string status)
        {
            string st = (status ?? "").ToLowerInvariant();
            switch (st)
            {
                case "in-progress":
                    return (Brush)Application.Current.FindResource("FluentBrand80");
                case "review":
                    return (Brush)Application.Current.FindResource("SystemFillColorCautionBrush");
                case "done":
                    return (Brush)Application.Current.FindResource("SystemFillColorSuccessBrush");
                case "on-hold":
                    return new SolidColorBrush((Color)ColorConverter.ConvertFromString("#94A3B8"));
                default: // backlog
                    return new SolidColorBrush((Color)ColorConverter.ConvertFromString("#64748B"));
            }
        }
    }
}
