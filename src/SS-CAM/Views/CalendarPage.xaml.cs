using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
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
        public string DesignerDisplay { get; set; }
    }

    public partial class CalendarPage : Page
    {
        private string _workspaceRoot = "";
        private int _currentYear = DateTime.Today.Year;
        private int _currentMonth = DateTime.Today.Month;
        private List<ProjectStatusItem> _allProjects = new List<ProjectStatusItem>();
        private bool _isPopulatingFilter = false;

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

        private void PopulateDesignerFilter()
        {
            try
            {
                _isPopulatingFilter = true;
                DesignerFilter.Items.Clear();
                DesignerFilter.Items.Add("All Designers");

                if (!string.IsNullOrWhiteSpace(_workspaceRoot))
                {
                    List<DesignerFolderChoice> designers = WorkspaceScanner.GetDesignerFolders(_workspaceRoot);
                    if (designers != null)
                    {
                        foreach (DesignerFolderChoice d in designers)
                        {
                            if (d != null && !string.IsNullOrEmpty(d.StaffId))
                                DesignerFilter.Items.Add(d.StaffId);
                        }
                    }
                }

                DesignerFilter.SelectedIndex = 0;
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
                                _allProjects.Add(item);
                        }
                    }
                }

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
                if (designerFilter != "All Designers" &&
                    !string.Equals(p.Designer, designerFilter, StringComparison.OrdinalIgnoreCase)) continue;
                if (!string.IsNullOrEmpty(statusFilter) &&
                    !string.Equals(p.Status, statusFilter, StringComparison.OrdinalIgnoreCase)) continue;
                if (!string.IsNullOrEmpty(searchQuery))
                {
                    string projName = (p.Project ?? "").ToLowerInvariant();
                    string clientName = (p.Client ?? "").ToLowerInvariant();
                    if (!projName.Contains(searchQuery) && !clientName.Contains(searchQuery)) continue;
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
                        if (dtDeadline < DateTime.Today && (p.Status ?? "").ToLowerInvariant() != "done")
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
                    TxtCurrentMonthTitle.Text = activeMonthDate.ToString("MMMM yyyy", CultureInfo.InvariantCulture);
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
                MinHeight = 90,
                Margin = new Thickness(0, 0, 4, 4),
                Padding = new Thickness(6),
                Cursor = Cursors.Hand,
                Tag = date,
                Opacity = isCurrentMonth ? 1.0 : 0.4
            };

            card.Click += OnDayCardClicked;

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

            Grid.SetRow(topPanel, 0);
            cellGrid.Children.Add(topPanel);

            // Stack of Event Chips
            StackPanel eventStack = new StackPanel();
            Grid.SetRow(eventStack, 1);

            int displayCount = Math.Min(3, events.Count);
            for (int e = 0; e < displayCount; e++)
            {
                CalendarDayEventItem item = events[e];
                Border chip = new Border
                {
                    CornerRadius = new CornerRadius(3),
                    Padding = new Thickness(4, 2, 4, 2),
                    Margin = new Thickness(0, 0, 0, 3),
                    Background = (Brush)Application.Current.Resources["CardBackgroundFillColorSecondaryBrush"]
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
                    Foreground = (Brush)Application.Current.Resources["TextFillColorPrimaryBrush"],
                    VerticalAlignment = VerticalAlignment.Center
                };
                chipPanel.Children.Add(txtEvent);

                chip.Child = chipPanel;
                eventStack.Children.Add(chip);
            }

            if (events.Count > 3)
            {
                TextBlock txtMore = new TextBlock
                {
                    Text = string.Format("+{0} more", events.Count - 3),
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
            RenderCalendarGrid();
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
            RenderCalendarGrid();
        }

        private void OnTodayClicked(object sender, RoutedEventArgs e)
        {
            _currentYear = DateTime.Today.Year;
            _currentMonth = DateTime.Today.Month;
            UpdateMetrics();
            RenderCalendarGrid();
        }

        private void OnSearchQueryChanged(object sender, TextChangedEventArgs e)
        {
            if (!IsLoaded || _isPopulatingFilter) return;
            UpdateMetrics();
            RenderCalendarGrid();
        }

        private void OnFilterChanged(object sender, SelectionChangedEventArgs e)
        {
            if (!IsLoaded || _isPopulatingFilter) return;
            UpdateMetrics();
            RenderCalendarGrid();
        }

        private void OnRefreshClicked(object sender, RoutedEventArgs e)
        {
            LoadProjects();
        }
    }
}
