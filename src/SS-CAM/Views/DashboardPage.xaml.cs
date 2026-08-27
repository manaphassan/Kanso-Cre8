using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Threading;
using System.Xml.Linq;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class DashboardPage : Page
    {
        private string workspaceRoot = string.Empty;
        private DispatcherTimer _tipTimer;
        private int _tipIndex = 0;
        private bool _articlesVisible = false;
        private bool _articlesFetched = false;

        // Singleton HttpClient — avoids socket exhaustion on repeated use
        private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(6) };

        // ────────────────────────────────────────────────
        // Design Tip data class (C#5 compatible — no tuples)
        // ────────────────────────────────────────────────
        private class DesignTip
        {
            public string Title { get; set; }
            public string Body { get; set; }
            public DesignTip(string title, string body) { Title = title; Body = body; }
        }

        private static readonly DesignTip[] _tips = new DesignTip[]
        {
            new DesignTip("Use the 60-30-10 Colour Rule", "Allocate 60% to a dominant colour, 30% to a secondary, and 10% to an accent. This creates balanced, professional palettes without guesswork."),
            new DesignTip("White Space Is Not Wasted Space", "Generous padding and margins reduce cognitive load and direct the viewer's eye to what actually matters. Crowded designs exhaust the audience."),
            new DesignTip("Limit Typefaces to Two", "One typeface for headings, one for body copy. Mixing more than two creates visual noise. Use weight and size variation instead of a third font."),
            new DesignTip("Align Everything to a Grid", "An 8-point grid (multiples of 8 px for all spacing and sizing) keeps your layouts consistent across breakpoints and artboards."),
            new DesignTip("Test Contrast for Accessibility", "WCAG AA requires a minimum contrast ratio of 4.5:1 for normal text. Run every brand colour pair through a contrast checker before finalising."),
            new DesignTip("Kerning vs Tracking", "Kerning is the space between two specific characters; tracking is uniform spacing across a word. Fine-tune kerning at display sizes; adjust tracking for headlines and all-caps."),
            new DesignTip("The Hierarchy Rule of Three", "Organise content into three visual levels: primary (largest, boldest), secondary (medium), tertiary (small, muted). Users scan in this order."),
            new DesignTip("Print at 300 DPI Minimum", "Any asset destined for offset or digital print should be at 300 DPI at final output size in CMYK. Designing at 72 DPI and scaling up always ends in regret."),
            new DesignTip("Name Your Layers", "A file with 47 layers named 'Rectangle Copy 12' is unusable. Layer and group names like 'hero-bg', 'cta-button', 'logo-primary' make handoffs seamless."),
            new DesignTip("Bleed 3 mm on All Print Sides", "Any artwork that reaches the edge of the page must extend 3 mm beyond the trim line as bleed. Missing bleed causes white edges after cutting."),
            new DesignTip("Avoid Pure Black Text (#000000)", "Pure black on white creates harsh contrast that fatigues the eyes during reading. Use near-black (#1E293B or #0F172A) for body text instead."),
            new DesignTip("Colour Psychology: Blue Signals Trust", "Blue is the single most universally trusted colour in healthcare and financial branding, which is why SuamiSihat's brand anchor is a deep blue (#043388)."),
            new DesignTip("Use SVG for Logos, Not PNG", "SVGs are resolution-independent — they look sharp on any screen and any size. PNGs pixelate when scaled. Deliver client logos as SVG whenever possible."),
            new DesignTip("Brand Consistency Over Creativity", "For established brands, consistency builds recognition faster than creative novelty. Reserve experimentation for campaign sub-identities and event branding."),
            new DesignTip("The Gestalt Principle of Proximity", "Elements placed near each other are perceived as belonging to the same group. Use spacing deliberately to form logical visual clusters."),
            new DesignTip("Optical Centring vs Mathematical Centring", "A shape that is mathematically centred often looks slightly too low. Optical centring — nudged a hair upward — feels more balanced to the human eye."),
            new DesignTip("Limit Body Text to 65-75 Characters per Line", "Line lengths beyond 80 characters impair readability. Use column widths or max-width settings to keep body text in the comfortable reading range."),
            new DesignTip("Use Semibold Instead of Bold for Subheadings", "Bold at small display sizes can look heavy and cramp letter spacing. Semibold (600 weight) gives emphasis without sacrificing elegance."),
            new DesignTip("Save Source Files Before Export", "Always save the native editable file (.afdesign, .psd, .ai) before running your export. Exported files are not your source — they are your output."),
            new DesignTip("RGB for Screens, CMYK for Print", "Designing a digital banner in CMYK means the software is converting your colours and they may shift on screen. Work in sRGB for digital; switch to CMYK only for print."),
            new DesignTip("Colour Profiles Matter", "Embed your ICC colour profile when saving files intended for print handoff. Missing profiles cause colour shifts between design, proof, and press."),
            new DesignTip("Leading Affects Readability", "Line height (leading) should be 1.4 to 1.6 times the font size for body text. Tight leading makes text claustrophobic; loose makes it feel disconnected."),
            new DesignTip("The Rule of Odds", "Groupings of an odd number of elements (3, 5, 7) appear more natural and visually interesting than even groupings. Apply to icon rows, card grids, and image collages."),
            new DesignTip("Design for the Fastest Scan First", "Users read in an F-pattern: across the top, then down the left. Put your most critical information in the first two horizontal bands."),
            new DesignTip("Master Canvas = Creative Insurance", "A master canvas file containing every approved asset at source resolution means any future adaptation can be produced in minutes."),
            new DesignTip("Snap to Pixel Grid", "Sub-pixel rendering creates blurry edges on screen. Enable 'Snap to Pixel Grid' in Affinity or Photoshop to ensure all strokes and shapes stay crisp."),
            new DesignTip("File Naming Is Documentation", "A file called 202608_0042S_SSC_Raya-Campaign.afdesign communicates project, date, brand, and context instantly. Generic names like 'Final_v3_FINAL.psd' cost the team time."),
            new DesignTip("Mockups Sell Ideas", "Even a rough concept presented in a contextual mockup (billboard, phone screen, tote bag) lands significantly better with stakeholders than a flat artboard."),
            new DesignTip("Scale Your Text Optically", "At display sizes (above 36 pt), reduce letter-spacing and tighten line height. At small sizes (below 12 pt), do the opposite. Type behaves differently at scale."),
            new DesignTip("Always Outline Text for Final Delivery", "When sending vector files to a printer, outline all fonts. This eliminates missing-font errors regardless of what software the recipient uses."),
            new DesignTip("The Hick-Hyman Law", "Every additional choice increases the time a user takes to decide. Fewer options on a poster or UI lead to faster, more decisive responses."),
            new DesignTip("Aspect Ratio Discipline", "Define the aspect ratios allowed per platform in your brief before opening Affinity. Retrofitting square assets into stories is always inefficient."),
            new DesignTip("Dark Mode Needs Separate Colour Tokens", "A dark-mode asset is not simply an inverted version of the light-mode one. Define separate token values rather than applying CSS/filter invert."),
            new DesignTip("Consistent Radius = Cohesive Brand", "Pick one corner-radius value for cards and buttons and apply it system-wide. Mixing radii makes a UI feel unfinished."),
            new DesignTip("Export Artboards, Not the Document", "When exporting from Affinity, always export named artboards rather than the whole document page. This gives you clean individual files without clipping artefacts."),
            new DesignTip("Grid Overlap Creates Depth", "Layering elements so they cross grid cell boundaries creates visual dynamism while maintaining structural order."),
            new DesignTip("Brief Before Brief Deck", "Write the project brief in plain text first. If you cannot describe the project clearly in three sentences, the scope is not well-defined enough to start designing."),
            new DesignTip("Proof on Multiple Devices", "Colour and resolution look different on a calibrated monitor, a laptop, and a mobile phone. Always proof critical campaigns across at least two device types."),
            new DesignTip("Rest Is Part of the Creative Process", "Cognitive fatigue degrades design quality measurably. A 10-minute break after 90 minutes of focused work restores perceptual accuracy and problem-solving capacity."),
            new DesignTip("Revision Rounds Belong in the Brief", "State the number of included revision rounds in writing before the project begins. Unlimited revisions have no equivalent in any other professional service."),
        };

        public DashboardPage()
        {
            InitializeComponent();

            var version = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version;
            if (TxtVersionBadge != null)
            {
                TxtVersionBadge.Text = string.Format("v{0}", version.ToString(3));
            }

            Loaded += OnPageLoaded;
            Unloaded += OnPageUnloaded;
        }

        private async void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            UserProfile profile = UserProfileService.LoadProfile();
            if (!string.IsNullOrWhiteSpace(profile.WorkspaceRoot))
            {
                workspaceRoot = profile.WorkspaceRoot;
            }

            TxtWorkspacePath.Text = workspaceRoot;
            await RefreshDashboard();

            // Initialise tip widget with a random starting tip
            _tipIndex = new Random().Next(0, _tips.Length);
            ShowCurrentTip();
            StartTipTimer();

            // Initialise Team Board with 30-second polling
            InitTeamBoard();
        }

        private void OnScrollViewerPreviewMouseWheel(object sender, System.Windows.Input.MouseWheelEventArgs e)
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

        private void OnPageUnloaded(object sender, RoutedEventArgs e)
        {
            if (_tipTimer != null)
            {
                _tipTimer.Stop();
                _tipTimer = null;
            }
            StopTeamBoard();
        }

        private async void OnRefreshClicked(object sender, RoutedEventArgs e)
        {
            await RefreshDashboard();
        }

        private void OnVersionBadgeClicked(object sender, MouseButtonEventArgs e)
        {
            try
            {
                var aboutWin = new AboutWindow();
                aboutWin.Owner = Window.GetWindow(this);
                aboutWin.ShowDialog();
                e.Handled = true;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[DashboardPage] OnVersionBadgeClicked: " + ex.Message);
            }
        }

        private async System.Threading.Tasks.Task RefreshDashboard()
        {
            TxtStatus.Text = "Scanning workspace folders...";

            DashboardSnapshot snapshot = await WorkspaceScanner.ScanAsync(workspaceRoot);

            MetricTotalProjects.Text = snapshot.TotalProjects.ToString();
            
            if (snapshot.RecentProjects != null && snapshot.RecentProjects.Count > 0)
            {
                var latest = snapshot.RecentProjects[0];
                TimeSpan diff = DateTime.Now - new DateTime(latest.ModifiedTicks);
                if (diff.TotalDays < 1) MetricLatestProject.Text = "Today";
                else if (diff.TotalDays < 2) MetricLatestProject.Text = "Yesterday";
                else MetricLatestProject.Text = string.Format("{0} days ago", (int)diff.TotalDays);
                
                MetricLatestProjectSubtext.Text = string.IsNullOrWhiteSpace(latest.Project) ? "Unknown" : latest.Project;
            }
            else
            {
                MetricLatestProject.Text = "-";
                MetricLatestProjectSubtext.Text = "None";
            }
            MetricFileSize.Text = snapshot.FormattedTotalSize;
            MetricThisMonth.Text = snapshot.ThisMonth.ToString();
            MetricMonthComparison.Text = snapshot.MonthComparisonText;
            MetricMonthComparison.Foreground = new System.Windows.Media.SolidColorBrush(
                (System.Windows.Media.Color)System.Windows.Media.ColorConverter.ConvertFromString(snapshot.MonthComparisonColor));

            MetricLargestProjectName.Text = snapshot.LargestProjectName;
            MetricLargestProjectSize.Text = snapshot.LargestProjectSize;
            MetricStaleProjects.Text = snapshot.StaleProjects.ToString();

            Recent6ProjectsControl.ItemsSource = snapshot.RecentProjects;

            // Calculate Active WIP Projects (modified in last 7 days)
            int activeWip = 0;
            try
            {
                if (Directory.Exists(workspaceRoot))
                {
                    DateTime sevenDaysAgo = DateTime.Now.AddDays(-7);
                    foreach (string dir in Directory.GetDirectories(workspaceRoot, "*", SearchOption.AllDirectories))
                    {
                        DirectoryInfo di = new DirectoryInfo(dir);
                        if (di.LastWriteTime >= sevenDaysAgo) activeWip++;
                    }
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
            MetricActiveWIP.Text = activeWip.ToString();

            // Charts
            TypeChartControl.ItemsSource = snapshot.TypeChart;
            BrandChartControl.ItemsSource = snapshot.BrandChart;
            StorageChartControl.ItemsSource = snapshot.StorageChart;
            ActivityChartControl.ItemsSource = snapshot.ActivityChart;

            // Flow
            FlowDesignerCount.Text = string.Format("{0} Designers, {1} Projects", snapshot.DesignerCount, snapshot.TotalProjects);
            FlowFileCount.Text = string.Format("{0} files indexed", snapshot.TotalFiles);

            // Designer Workload & Capacity Radar
            if (DesignerWorkloadControl != null)
            {
                DesignerWorkloadControl.ItemsSource = snapshot.DesignerWorkloads;
            }

            // Creative SLA Analytics
            if (snapshot.SlaMetrics != null)
            {
                if (TxtSlaFirstTimeRight != null)
                    TxtSlaFirstTimeRight.Text = string.Format("{0:0.0}%", snapshot.SlaMetrics.FirstTimeRightPercent);
                if (TxtSlaAvgTurnaround != null)
                    TxtSlaAvgTurnaround.Text = string.Format("{0:0.0} Days", snapshot.SlaMetrics.AvgTurnaroundDays);
                if (TxtSlaAvgRevs != null)
                    TxtSlaAvgRevs.Text = string.Format("{0:0.0} Revs", snapshot.SlaMetrics.AvgRevisionsPerProject);
            }

            TxtStatus.Text = string.Format("Scan complete at {0:HH:mm:ss}. Connected to Synology Workspace.", DateTime.Now);
        }

        // ─────────────────────────────────────────────────────────────────────
        // Designer Inspiration Widget
        // ─────────────────────────────────────────────────────────────────────

        private void StartTipTimer()
        {
            _tipTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(60) };
            _tipTimer.Tick += delegate { AdvanceTip(); };
            _tipTimer.Start();
        }

        private void ShowCurrentTip()
        {
            DesignTip tip = _tips[_tipIndex];
            TxtTipTitle.Text = tip.Title;
            TxtTipBody.Text = tip.Body;
            TxtTipCounter.Text = string.Format("{0} / {1}", _tipIndex + 1, _tips.Length);
        }

        private void AdvanceTip()
        {
            _tipIndex = (_tipIndex + 1) % _tips.Length;
            ShowCurrentTip();
        }

        private void OnNextTipClicked(object sender, RoutedEventArgs e)
        {
            AdvanceTip();
        }

        private void OnToggleArticlesClicked(object sender, RoutedEventArgs e)
        {
            _articlesVisible = !_articlesVisible;

            if (_articlesVisible)
            {
                PanelArticles.Visibility = Visibility.Visible;
                TxtArticlesBtn.Text = "Hide";
                TxtInsightMode.Text = "Latest Design Articles";
                TxtInsightIcon.Text = "\uE774"; // Globe icon

                if (!_articlesFetched)
                {
                    _articlesFetched = true;
                    FetchDesignArticlesAsync();
                }
            }
            else
            {
                PanelArticles.Visibility = Visibility.Collapsed;
                TxtArticlesBtn.Text = "Articles";
                TxtInsightMode.Text = "Tip of the Day";
                TxtInsightIcon.Text = "\uE82F"; // Info icon
            }
        }

        private async void FetchDesignArticlesAsync()
        {
            try
            {
                TxtArticlesStatus.Text = "Fetching latest design articles...";
                ArticlesList.ItemsSource = null;

                _httpClient.DefaultRequestHeaders.UserAgent.Clear();
                _httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("SS-CAM/2.6 (+SuamiSihat)");

                string xml = await _httpClient.GetStringAsync("https://www.smashingmagazine.com/feed/");
                    XDocument doc = XDocument.Parse(xml);

                    List<DesignArticleItem> items = new List<DesignArticleItem>();

                    // RSS 2.0 channel/item format
                    foreach (XElement item in doc.Descendants("item"))
                    {
                        string title = item.Element("title") != null ? item.Element("title").Value : "Untitled";
                        string link = item.Element("link") != null ? item.Element("link").Value : "";
                        string pubDate = item.Element("pubDate") != null ? item.Element("pubDate").Value : "";

                        DateTime parsed;
                        string formattedDate = DateTime.TryParse(pubDate, out parsed)
                            ? parsed.ToString("dd MMM yyyy")
                            : pubDate;

                        items.Add(new DesignArticleItem { Title = title, Url = link, PublishedDate = formattedDate });

                        if (items.Count >= 5) break;
                    }

                    if (items.Count > 0)
                    {
                        ArticlesList.ItemsSource = items;
                        TxtArticlesStatus.Text = "Smashing Magazine — latest articles:";
                    }
                    else
                    {
                        TxtArticlesStatus.Text = "No articles found in feed. Check network connection.";
                    }
            }
            catch
            {
                TxtArticlesStatus.Text = "Could not reach article feed. Showing offline tips.";
                _articlesVisible = false;
                PanelArticles.Visibility = Visibility.Collapsed;
                TxtArticlesBtn.Text = "Articles";
                TxtInsightMode.Text = "Tip of the Day";
                TxtInsightIcon.Text = "\uE82F";
            }
        }

        private void OnArticleClicked(object sender, RoutedEventArgs e)
        {
            FrameworkElement border = sender as FrameworkElement;
            if (border != null)
            {
                DesignArticleItem article = border.DataContext as DesignArticleItem;
                if (article != null && !string.IsNullOrWhiteSpace(article.Url))
                {
                    try { System.Diagnostics.Process.Start(article.Url); }
                    catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
                }
            }
        }

        // ─── Team Board ───────────────────────────────────────────────────────

        private DispatcherTimer _teamPollTimer;

        private void InitTeamBoard()
        {
            LoadTeamBoard();
            _teamPollTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(30) };
            _teamPollTimer.Tick += delegate { LoadTeamBoard(); };
            _teamPollTimer.Start();
        }

        private void StopTeamBoard()
        {
            if (_teamPollTimer != null) { _teamPollTimer.Stop(); _teamPollTimer = null; }
        }

        private void LoadTeamBoard()
        {
            try
            {
                System.Collections.Generic.List<TeamNote> notes = TeamBoardService.LoadNotes(workspaceRoot);
                // Show max 10
                if (notes.Count > 10) notes = notes.GetRange(0, 10);
                TeamNoteFeed.ItemsSource = notes;
                TxtTeamBoardStatus.Text = string.Format("Last updated {0}", DateTime.Now.ToString("HH:mm"));
            }
            catch
            {
                TxtTeamBoardStatus.Text = "Could not load team notes";
            }
        }

        private void OnPostTeamNoteClicked(object sender, RoutedEventArgs e)
        {
            string content = NewTeamNoteInput.Text.Trim();
            if (string.IsNullOrWhiteSpace(content)) return;

            UserProfile profile = UserProfileService.LoadProfile();
            string staffId = !string.IsNullOrWhiteSpace(profile.StaffId) ? profile.StaffId : "----";
            string name = !string.IsNullOrWhiteSpace(profile.DesignerName) ? profile.DesignerName : "Designer";

            bool ok = TeamBoardService.PostNote(workspaceRoot, staffId, name, content);
            if (ok)
            {
                NewTeamNoteInput.Text = "";
                LoadTeamBoard();
            }
            else
            {
                TxtTeamBoardStatus.Text = "Could not post note. Check NAS connection.";
            }
        }

        private void OnPinNoteClicked(object sender, RoutedEventArgs e)
        {
            Button btn = sender as Button;
            if (btn == null) return;
            string id = btn.Tag as string;
            if (string.IsNullOrWhiteSpace(id)) return;
            TeamBoardService.TogglePin(workspaceRoot, id);
            LoadTeamBoard();
        }

        private void OnDeleteTeamNoteClicked(object sender, RoutedEventArgs e)
        {
            Button btn = sender as Button;
            if (btn == null) return;
            string id = btn.Tag as string;
            if (string.IsNullOrWhiteSpace(id)) return;
            TeamBoardService.DeleteNote(workspaceRoot, id);
            LoadTeamBoard();
        }
    }

    public class DesignArticleItem
    {
        public string Title { get; set; }
        public string Url { get; set; }
        public string PublishedDate { get; set; }
    }
}
