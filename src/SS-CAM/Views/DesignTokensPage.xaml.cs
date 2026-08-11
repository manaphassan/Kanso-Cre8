using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Net.Http;
using System.Text.RegularExpressions;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Threading;

namespace SS_CAM.Views
{
    public partial class DesignTokensPage : Page
    {
        // ── Constants ─────────────────────────────────────────────────────────
        private const string FLUENT_CSS_URL = "https://assets.suamisihat.myds.me/assets/css/fluent.css";

        // ── State ─────────────────────────────────────────────────────────────
        private static readonly HttpClient _http = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
        private List<TokenEntry> _allTokens = new List<TokenEntry>();
        private DispatcherTimer _copiedTimer;

        // ── Token data model ──────────────────────────────────────────────────
        private class TokenEntry
        {
            public string Name    { get; set; }
            public string Value   { get; set; }
            public string Group   { get; set; }
            public bool   IsColor { get; set; }
        }

        // ── Constructor ───────────────────────────────────────────────────────
        public DesignTokensPage()
        {
            InitializeComponent();
            _copiedTimer = new DispatcherTimer { Interval = TimeSpan.FromSeconds(2) };
            _copiedTimer.Tick += (s, e) => { CopiedNotice.Text = ""; _copiedTimer.Stop(); };
            Loaded += (s, e) => LoadTokensAsync();
        }

        // ── Load / parse ──────────────────────────────────────────────────────
        private async void LoadTokensAsync()
        {
            ShowLoading();
            try
            {
                string css = await _http.GetStringAsync(FLUENT_CSS_URL);
                _allTokens = ParseCssTokens(css);
                SubtitleText.Text = string.Format(
                    "Fetched from  {0}  ·  {1}",
                    FLUENT_CSS_URL,
                    DateTime.Now.ToString("HH:mm"));
                RenderTokens(_allTokens);
            }
            catch (Exception ex)
            {
                ShowError("Could not reach server: " + ex.Message);
            }
        }

        // ── CSS parser: extract --variable: value; from :root { } ────────────
        private List<TokenEntry> ParseCssTokens(string css)
        {
            var tokens = new List<TokenEntry>();

            // Strip comments
            css = Regex.Replace(css, @"/\*[\s\S]*?\*/", "");

            // Find :root blocks
            var rootBlocks = Regex.Matches(css, @":root\s*\{([^}]+)\}", RegexOptions.Singleline);
            foreach (Match block in rootBlocks)
            {
                string body = block.Groups[1].Value;
                // Match --name: value;
                var varMatches = Regex.Matches(body, @"(--[\w-]+)\s*:\s*([^;]+);");
                foreach (Match vm in varMatches)
                {
                    string name  = vm.Groups[1].Value.Trim();
                    string value = vm.Groups[2].Value.Trim();
                    tokens.Add(new TokenEntry
                    {
                        Name    = name,
                        Value   = value,
                        Group   = InferGroup(name),
                        IsColor = IsColorValue(value),
                    });
                }
            }
            return tokens;
        }

        private string InferGroup(string name)
        {
            // Map token name prefixes to friendly group labels
            if (name.StartsWith("--ss-color") || name.StartsWith("--color-brand"))   return "Brand Colours";
            if (name.StartsWith("--color-neutral"))                                   return "Neutral Colours";
            if (name.StartsWith("--color-status") || name.StartsWith("--color-err")
                || name.StartsWith("--color-warn") || name.StartsWith("--color-suc")) return "Status Colours";
            if (name.StartsWith("--color"))                                           return "Colours";
            if (name.StartsWith("--shadow"))                                          return "Shadows";
            if (name.StartsWith("--radius") || name.StartsWith("--border-radius"))   return "Border Radius";
            if (name.StartsWith("--spacing") || name.StartsWith("--space"))          return "Spacing";
            if (name.StartsWith("--font-size") || name.StartsWith("--text"))         return "Typography";
            if (name.StartsWith("--font-weight"))                                     return "Font Weights";
            if (name.StartsWith("--font-family"))                                     return "Font Families";
            if (name.StartsWith("--transition") || name.StartsWith("--duration"))    return "Motion";
            if (name.StartsWith("--z-"))                                              return "Z-Index";
            return "Other";
        }

        private bool IsColorValue(string value)
        {
            string v = value.ToLowerInvariant().Trim();
            return v.StartsWith("#") ||
                   v.StartsWith("rgb") ||
                   v.StartsWith("hsl") ||
                   v == "white" || v == "black" || v == "transparent";
        }

        // ── Render ────────────────────────────────────────────────────────────
        private void RenderTokens(List<TokenEntry> tokens)
        {
            TokenPanel.Children.Clear();

            if (tokens.Count == 0)
            {
                ShowError("No CSS custom properties found in fluent.css.");
                return;
            }

            // Group tokens
            var groups = tokens.GroupBy(t => t.Group).OrderBy(g => g.Key);

            foreach (var group in groups)
            {
                // Group header
                TokenPanel.Children.Add(new TextBlock
                {
                    Text             = group.Key,
                    Style            = (Style)FindResource("GroupHeaderStyle"),
                });

                foreach (var token in group)
                {
                    TokenPanel.Children.Add(BuildTokenCard(token));
                }
            }

            TokenCountText.Text = string.Format("{0} tokens", tokens.Count);
            ShowTokenList();
        }

        private Border BuildTokenCard(TokenEntry token)
        {
            var card = new Border { Style = (Style)FindResource("TokenCardStyle") };

            var grid = new Grid();
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });     // swatch / icon
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = new GridLength(1, GridUnitType.Star) }); // names
            grid.ColumnDefinitions.Add(new ColumnDefinition { Width = GridLength.Auto });     // value + copy btn

            // ── Col 0: colour swatch (or empty spacer) ──
            if (token.IsColor)
            {
                SolidColorBrush brush = TryParseColor(token.Value);
                var swatch = new Border
                {
                    Width        = 28,
                    Height       = 28,
                    CornerRadius = new CornerRadius(5),
                    Background   = brush ?? Brushes.Transparent,
                    BorderBrush  = new SolidColorBrush(Color.FromArgb(60, 255, 255, 255)),
                    BorderThickness = new Thickness(1),
                    Margin       = new Thickness(0, 0, 12, 0),
                    ToolTip      = token.Value,
                };
                Grid.SetColumn(swatch, 0);
                grid.Children.Add(swatch);
            }
            else
            {
                var spacer = new Border { Width = 28, Margin = new Thickness(0, 0, 12, 0) };
                Grid.SetColumn(spacer, 0);
                grid.Children.Add(spacer);
            }

            // ── Col 1: token name ──
            var nameBlock = new TextBlock
            {
                Text             = token.Name,
                Foreground       = new SolidColorBrush(Color.FromRgb(200, 200, 200)),
                FontSize         = 12,
                FontFamily       = new FontFamily("Segoe UI Variable Text"),
                VerticalAlignment = VerticalAlignment.Center,
                TextTrimming     = TextTrimming.CharacterEllipsis,
            };
            Grid.SetColumn(nameBlock, 1);
            grid.Children.Add(nameBlock);

            // ── Col 2: value + copy ──
            var rightPanel = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                VerticalAlignment = VerticalAlignment.Center,
            };

            var valueBlock = new TextBlock
            {
                Text             = token.Value.Length > 40 ? token.Value.Substring(0, 37) + "…" : token.Value,
                Foreground       = new SolidColorBrush(Color.FromRgb(100, 116, 139)),
                FontSize         = 11,
                FontFamily       = new FontFamily("Consolas, Segoe UI Variable Text"),
                VerticalAlignment = VerticalAlignment.Center,
                Margin           = new Thickness(0, 0, 10, 0),
                ToolTip          = token.Value,
            };
            rightPanel.Children.Add(valueBlock);

            var copyBtn = new Button
            {
                Content = "Copy",
                Style   = (Style)FindResource("CopyBtnStyle"),
                Tag     = token.Name + ": " + token.Value,
            };
            copyBtn.Click += OnCopyTokenClicked;
            rightPanel.Children.Add(copyBtn);

            Grid.SetColumn(rightPanel, 2);
            grid.Children.Add(rightPanel);

            card.Child = grid;
            return card;
        }

        // ── Try parse a CSS colour to WPF brush ──────────────────────────────
        private SolidColorBrush TryParseColor(string value)
        {
            try
            {
                string v = value.Trim();
                if (v.StartsWith("#"))
                {
                    var color = (Color)ColorConverter.ConvertFromString(v);
                    return new SolidColorBrush(color);
                }
                if (v.Equals("white",       StringComparison.OrdinalIgnoreCase)) return Brushes.White;
                if (v.Equals("black",       StringComparison.OrdinalIgnoreCase)) return Brushes.Black;
                if (v.Equals("transparent", StringComparison.OrdinalIgnoreCase)) return Brushes.Transparent;
                // rgb(r,g,b)
                var rgb = Regex.Match(v, @"rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)");
                if (rgb.Success)
                {
                    return new SolidColorBrush(Color.FromRgb(
                        byte.Parse(rgb.Groups[1].Value),
                        byte.Parse(rgb.Groups[2].Value),
                        byte.Parse(rgb.Groups[3].Value)));
                }
            }
            catch { }
            return null;
        }

        // ── Search / filter ───────────────────────────────────────────────────
        private void OnSearchTextChanged(object sender, TextChangedEventArgs e)
        {
            string query = SearchBox.Text.Trim().ToLowerInvariant();
            if (string.IsNullOrEmpty(query))
            {
                RenderTokens(_allTokens);
                return;
            }
            var filtered = _allTokens
                .Where(t => t.Name.ToLowerInvariant().Contains(query) ||
                            t.Value.ToLowerInvariant().Contains(query))
                .ToList();
            RenderTokens(filtered);
        }

        // ── Event handlers ────────────────────────────────────────────────────
        private void OnCopyTokenClicked(object sender, RoutedEventArgs e)
        {
            var btn = sender as Button;
            if (btn != null && btn.Tag is string)
            {
                string text = (string)btn.Tag;
                Clipboard.SetText(text);
                CopiedNotice.Text = "✓ Copied!";
                _copiedTimer.Stop();
                _copiedTimer.Start();
            }
        }

        private void OnRefreshClicked(object sender, RoutedEventArgs e)
        {
            SearchBox.Text = "";
            LoadTokensAsync();
        }

        private void OnOpenInBrowserClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName        = "https://assets.suamisihat.myds.me/pages/brand-system",
                    UseShellExecute = true,
                });
            }
            catch { }
        }

        // ── UI state helpers ──────────────────────────────────────────────────
        private void ShowLoading()
        {
            LoadingPanel.Visibility      = Visibility.Visible;
            ErrorPanel.Visibility        = Visibility.Collapsed;
            TokenScrollViewer.Visibility = Visibility.Collapsed;
        }

        private void ShowError(string message)
        {
            ErrorText.Text               = message;
            LoadingPanel.Visibility      = Visibility.Collapsed;
            ErrorPanel.Visibility        = Visibility.Visible;
            TokenScrollViewer.Visibility = Visibility.Collapsed;
        }

        private void ShowTokenList()
        {
            LoadingPanel.Visibility      = Visibility.Collapsed;
            ErrorPanel.Visibility        = Visibility.Collapsed;
            TokenScrollViewer.Visibility = Visibility.Visible;
        }
    }
}
