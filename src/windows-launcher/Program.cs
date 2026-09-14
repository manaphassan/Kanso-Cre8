using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Animation;
using System.Windows.Media.Imaging;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.Wpf;

namespace KansoCre8.Native
{
    public class App : Application
    {
        [STAThread]
        public static void Main()
        {
            AppDomain.CurrentDomain.AssemblyResolve += (s, args) =>
            {
                try
                {
                    string assemblyName = new AssemblyName(args.Name).Name + ".dll";
                    string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                    string[] searchPaths = new string[]
                    {
                        Path.Combine(baseDir, assemblyName),
                        Path.Combine(baseDir, "lib", assemblyName),
                        Path.Combine(baseDir, "app", assemblyName)
                    };
                    foreach (string path in searchPaths)
                    {
                        if (File.Exists(path))
                        {
                            return Assembly.LoadFrom(path);
                        }
                    }
                }
                catch { }
                return null;
            };

            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            {
                KansoMainWindow.StaticLog("UnhandledException: " + e.ExceptionObject);
            };

            RunApp();
        }

        [MethodImpl(MethodImplOptions.NoInlining)]
        private static void RunApp()
        {
            App app = new App();
            app.DispatcherUnhandledException += (s, e) =>
            {
                KansoMainWindow.StaticLog("DispatcherUnhandledException: " + e.Exception);
            };
            app.Run(new KansoMainWindow());
        }
    }

    public class KansoMainWindow : Window
    {
        private Grid rootGrid;
        private Grid splashGrid;
        private Grid errorGrid;
        private TextBlock statusText;
        private TextBlock errorDetailText;
        private WebView2 webView;
        private Process serverProcess = null;
        private StringBuilder serverLog = new StringBuilder();
        private readonly object logLock = new object();
        private string appDir;
        private string baseDir;
        private string logFilePath;
        private bool isLightTheme = false;
        private bool splashDismissed = false;

        public KansoMainWindow()
        {
            Title = "Kanso Cre8 (簡素) — Mindful Creative Vault";
            Width = 1380;
            Height = 860;
            MinWidth = 1024;
            MinHeight = 680;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;

            baseDir = AppDomain.CurrentDomain.BaseDirectory;
            appDir = Path.Combine(baseDir, "app");
            if (!Directory.Exists(appDir))
            {
                appDir = baseDir;
            }
            logFilePath = Path.Combine(appDir, "launcher.log");

            // Read user theme preference (light vs dark)
            string savedTheme = ReadSavedTheme();
            isLightTheme = (savedTheme == "light" || savedTheme == "oceanic-light" || savedTheme == "eink");

            // Instant Theme Canvas: Light (#ECE8DF) or Dark (#09090B) — Zero blank dark screen
            System.Windows.Media.Color canvasColor = isLightTheme
                ? System.Windows.Media.Color.FromRgb(0xEC, 0xE8, 0xDF)
                : System.Windows.Media.Color.FromRgb(0x09, 0x09, 0x0B);
            Background = new SolidColorBrush(canvasColor);

            // Set Application Icon if present
            string iconPath = Path.Combine(appDir, "icon.ico");
            if (!File.Exists(iconPath))
            {
                iconPath = Path.Combine(baseDir, "icon.ico");
            }
            if (File.Exists(iconPath))
            {
                try
                {
                    Icon = BitmapFrame.Create(new Uri(iconPath, UriKind.Absolute));
                }
                catch { }
            }

            if (Icon == null)
            {
                try
                {
                    string exePath = System.Reflection.Assembly.GetExecutingAssembly().Location;
                    using (System.Drawing.Icon sysIcon = System.Drawing.Icon.ExtractAssociatedIcon(exePath))
                    {
                        if (sysIcon != null)
                        {
                            Icon = System.Windows.Interop.Imaging.CreateBitmapSourceFromHIcon(
                                sysIcon.Handle,
                                System.Windows.Int32Rect.Empty,
                                System.Windows.Media.Imaging.BitmapSizeOptions.FromEmptyOptions());
                        }
                    }
                }
                catch { }
            }

            BuildUI(canvasColor);

            Loaded += MainWindow_Loaded;
            Closing += MainWindow_Closing;
        }

        private void BuildUI(System.Windows.Media.Color canvasColor)
        {
            rootGrid = new Grid();
            Content = rootGrid;

            // 1. WebView2 Control (Hidden behind native splash until ready)
            webView = new WebView2
            {
                Visibility = Visibility.Hidden,
                DefaultBackgroundColor = isLightTheme
                    ? System.Drawing.Color.FromArgb(236, 232, 223)
                    : System.Drawing.Color.FromArgb(9, 9, 11)
            };
            rootGrid.Children.Add(webView);

            // 2. Native Splash / Loading Screen (VISIBLE IMMEDIATELY ON CLICK — NO BLANK DARK SCREEN)
            splashGrid = new Grid
            {
                Background = new SolidColorBrush(canvasColor),
                Visibility = Visibility.Visible,
                Opacity = 1.0
            };

            StackPanel splashPanel = new StackPanel
            {
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };

            // Calligraphy Logo Banner
            string bannerPath = FindCalligraphyBanner(isLightTheme);
            if (!string.IsNullOrEmpty(bannerPath) && File.Exists(bannerPath))
            {
                try
                {
                    Image bannerImage = new Image
                    {
                        Source = new BitmapImage(new Uri(bannerPath, UriKind.Absolute)),
                        MaxWidth = 440,
                        MaxHeight = 125,
                        Stretch = Stretch.Uniform,
                        HorizontalAlignment = HorizontalAlignment.Center,
                        Margin = new Thickness(0, 0, 0, 16)
                    };
                    splashPanel.Children.Add(bannerImage);
                }
                catch
                {
                    AddTextLogoFallback(splashPanel, isLightTheme);
                }
            }
            else
            {
                AddTextLogoFallback(splashPanel, isLightTheme);
            }

            // Tagline: THE MINDFUL CREATIVE VAULT
            TextBlock tagline = new TextBlock
            {
                Text = "THE MINDFUL CREATIVE VAULT",
                FontSize = 11,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(isLightTheme
                    ? System.Windows.Media.Color.FromRgb(0x6B, 0x75, 0x64)
                    : System.Windows.Media.Color.FromRgb(0x71, 0x71, 0x7A)),
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 0, 0, 14)
            };
            splashPanel.Children.Add(tagline);

            // Version Badge: "v0.1.0 • Zen Atelier"
            Border versionBadge = new Border
            {
                Background = new SolidColorBrush(isLightTheme
                    ? System.Windows.Media.Color.FromRgb(0xF7, 0xF5, 0xF0)
                    : System.Windows.Media.Color.FromRgb(0x18, 0x18, 0x1B)),
                BorderBrush = new SolidColorBrush(isLightTheme
                    ? System.Windows.Media.Color.FromRgb(0xD3, 0xCE, 0xBF)
                    : System.Windows.Media.Color.FromRgb(0x27, 0x27, 0x2A)),
                BorderThickness = new Thickness(1),
                CornerRadius = new CornerRadius(12),
                Padding = new Thickness(14, 4, 14, 4),
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 0, 0, 18)
            };
            TextBlock versionText = new TextBlock
            {
                Text = "v0.1.0 • Zen Atelier",
                FontSize = 10.5,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(isLightTheme
                    ? System.Windows.Media.Color.FromRgb(0xDE, 0x69, 0x4B)
                    : System.Windows.Media.Color.FromRgb(0x38, 0xBD, 0xF8))
            };
            versionBadge.Child = versionText;
            splashPanel.Children.Add(versionBadge);

            // Status row with pulse dot
            StackPanel statusRow = new StackPanel
            {
                Orientation = Orientation.Horizontal,
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 0, 0, 16)
            };
            Border pulseDot = new Border
            {
                Width = 7,
                Height = 7,
                CornerRadius = new CornerRadius(3.5),
                Background = new SolidColorBrush(isLightTheme
                    ? System.Windows.Media.Color.FromRgb(0xDE, 0x69, 0x4B)
                    : System.Windows.Media.Color.FromRgb(0x38, 0xBD, 0xF8)),
                VerticalAlignment = VerticalAlignment.Center,
                Margin = new Thickness(0, 0, 8, 0)
            };
            statusText = new TextBlock
            {
                Text = "Mounting Visual Atelier Interface...",
                FontSize = 11.5,
                Foreground = new SolidColorBrush(isLightTheme
                    ? System.Windows.Media.Color.FromRgb(0x4A, 0x54, 0x45)
                    : System.Windows.Media.Color.FromRgb(0xA1, 0xA1, 0xAA)),
                VerticalAlignment = VerticalAlignment.Center
            };
            statusRow.Children.Add(pulseDot);
            statusRow.Children.Add(statusText);
            splashPanel.Children.Add(statusRow);

            ProgressBar progressBar = new ProgressBar
            {
                IsIndeterminate = true,
                Width = 180,
                Height = 2,
                BorderThickness = new Thickness(0),
                Background = new SolidColorBrush(isLightTheme
                    ? System.Windows.Media.Color.FromRgb(0xD3, 0xCE, 0xBF)
                    : System.Windows.Media.Color.FromRgb(0x27, 0x27, 0x2A)),
                Foreground = new SolidColorBrush(isLightTheme
                    ? System.Windows.Media.Color.FromRgb(0xDE, 0x69, 0x4B)
                    : System.Windows.Media.Color.FromRgb(0x38, 0xBD, 0xF8)),
                HorizontalAlignment = HorizontalAlignment.Center
            };
            splashPanel.Children.Add(progressBar);

            splashGrid.Children.Add(splashPanel);
            rootGrid.Children.Add(splashGrid);

            // 3. Error Screen (Hidden by default)
            errorGrid = new Grid
            {
                Background = new SolidColorBrush(canvasColor),
                Visibility = Visibility.Collapsed
            };

            StackPanel errorPanel = new StackPanel
            {
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center,
                MaxWidth = 600
            };

            TextBlock errorTitle = new TextBlock
            {
                Text = "Failed to Start Vault Backend",
                FontSize = 20,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(System.Windows.Media.Color.FromRgb(0xEF, 0x44, 0x44)),
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 0, 0, 8)
            };

            errorDetailText = new TextBlock
            {
                Text = "",
                FontSize = 12,
                Foreground = new SolidColorBrush(System.Windows.Media.Color.FromRgb(0xA1, 0xA1, 0xAA)),
                TextWrapping = TextWrapping.Wrap,
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 0, 0, 16),
                TextAlignment = TextAlignment.Center
            };

            Button retryButton = new Button
            {
                Content = "Retry Connection",
                Padding = new Thickness(16, 8, 16, 8),
                Background = new SolidColorBrush(System.Windows.Media.Color.FromRgb(0x27, 0x27, 0x2A)),
                Foreground = new SolidColorBrush(System.Windows.Media.Color.FromRgb(0xF4, 0xF4, 0xF5)),
                BorderBrush = new SolidColorBrush(System.Windows.Media.Color.FromRgb(0x3F, 0x3F, 0x46)),
                BorderThickness = new Thickness(1),
                HorizontalAlignment = HorizontalAlignment.Center,
                Cursor = System.Windows.Input.Cursors.Hand
            };
            retryButton.Click += async (s, e) =>
            {
                errorGrid.Visibility = Visibility.Collapsed;
                splashGrid.Visibility = Visibility.Visible;
                statusText.Text = "Retrying vault connection...";
                await Task.Run(() => EnsureServerReady());
                await MountWebViewAsync();
            };

            errorPanel.Children.Add(errorTitle);
            errorPanel.Children.Add(errorDetailText);
            errorPanel.Children.Add(retryButton);
            errorGrid.Children.Add(errorPanel);
            rootGrid.Children.Add(errorGrid);
        }

        public void DismissSplash()
        {
            if (splashDismissed) return;
            splashDismissed = true;

            Dispatcher.Invoke(() =>
            {
                webView.Visibility = Visibility.Visible;
                DoubleAnimation fadeOut = new DoubleAnimation(1.0, 0.0, new Duration(TimeSpan.FromMilliseconds(400)))
                {
                    EasingFunction = new CubicEase { EasingMode = EasingMode.EaseOut }
                };
                fadeOut.Completed += (s, e) =>
                {
                    splashGrid.Visibility = Visibility.Collapsed;
                };
                splashGrid.BeginAnimation(UIElement.OpacityProperty, fadeOut);
            });
        }

        private string FindCalligraphyBanner(bool light)
        {
            string fileName = light ? "kanso-calligraphy-light.png" : "kanso-calligraphy-dark.png";
            string[] searchPaths = new string[]
            {
                Path.Combine(appDir, "client", "dist", "brand", fileName),
                Path.Combine(baseDir, "app", "client", "dist", "brand", fileName),
                Path.Combine(baseDir, "brand", fileName),
                Path.Combine(appDir, "brand", fileName),
                Path.Combine(baseDir, "..", "src", "app", "client", "public", "brand", fileName),
                Path.Combine(baseDir, "..", "..", "src", "app", "client", "public", "brand", fileName),
                Path.Combine(baseDir, "..", "src", "app", "client", "dist", "brand", fileName)
            };
            foreach (string p in searchPaths)
            {
                if (File.Exists(p)) return Path.GetFullPath(p);
            }
            return null;
        }

        private static void AddTextLogoFallback(StackPanel panel, bool light)
        {
            TextBlock kanjiLogo = new TextBlock
            {
                Text = "簡素Cre8",
                FontSize = 36,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(light
                    ? System.Windows.Media.Color.FromRgb(0x1F, 0x24, 0x1E)
                    : System.Windows.Media.Color.FromRgb(0xF4, 0xF4, 0xF5)),
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 0, 0, 10)
            };
            panel.Children.Add(kanjiLogo);
        }

        private static string ReadSavedTheme()
        {
            try
            {
                string localDataTheme = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "KansoCre8", "theme.txt");
                if (File.Exists(localDataTheme))
                {
                    string t = File.ReadAllText(localDataTheme).Trim().ToLowerInvariant();
                    if (!string.IsNullOrEmpty(t)) return t;
                }

                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string appDir = Path.Combine(baseDir, "app");
                string[] candidates = new string[]
                {
                    Path.Combine(appDir, "sample-workspace", "_Team", "_Config", "theme.txt"),
                    Path.Combine(baseDir, "sample-workspace", "_Team", "_Config", "theme.txt"),
                    Path.Combine(baseDir, "..", "src", "app", "sample-workspace", "_Team", "_Config", "theme.txt"),
                    Path.Combine(appDir, "theme.txt"),
                    Path.Combine(baseDir, "theme.txt")
                };
                foreach (string candidate in candidates)
                {
                    if (File.Exists(candidate))
                    {
                        string t = File.ReadAllText(candidate).Trim().ToLowerInvariant();
                        if (!string.IsNullOrEmpty(t)) return t;
                    }
                }
            }
            catch { }
            return "dark";
        }

        private static void SaveThemePref(string json)
        {
            try
            {
                string theme = "dark";
                if (json.Contains("\"theme\":\"light\"") || json.Contains("\"theme\":\"oceanic-light\"") || json.Contains("\"theme\":\"eink\""))
                {
                    theme = "light";
                }
                string themeFile = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "KansoCre8", "theme.txt");
                Directory.CreateDirectory(Path.GetDirectoryName(themeFile));
                File.WriteAllText(themeFile, theme);
            }
            catch { }
        }

        private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
        {
            await Task.Run(() => EnsureServerReady());
            await MountWebViewAsync();
        }

        private void EnsureServerReady()
        {
            Log("Starting Kanso Cre8 Native Desktop Runtime...");
            Log("Base directory: " + baseDir);
            Log("App directory: " + appDir);

            // 1. Check if server already running on port 4000
            bool isPortActive = IsPortInUse(4000);
            if (!isPortActive)
            {
                UpdateStatus("Launching offline Markdown vault engine...");
                string startErr = StartBackgroundServer();
                if (!string.IsNullOrEmpty(startErr))
                {
                    ShowError(startErr);
                    return;
                }

                UpdateStatus("Connecting to vault engine on port 4000...");
                for (int i = 0; i < 50; i++)
                {
                    if (IsPortInUse(4000))
                    {
                        isPortActive = true;
                        UpdateStatus("Mounting Visual Atelier Interface...");
                        break;
                    }

                    if (serverProcess != null && serverProcess.HasExited)
                    {
                        string errLogs;
                        lock (logLock)
                        {
                            errLogs = serverLog.ToString();
                        }
                        ShowError(string.Format("Vault backend exited with code {0}.\n\n{1}",
                            serverProcess.ExitCode,
                            string.IsNullOrEmpty(errLogs) ? "(No log details captured)" : errLogs));
                        return;
                    }

                    System.Threading.Thread.Sleep(200);
                }

                if (!isPortActive)
                {
                    ShowError("Timed out waiting for vault backend on port 4000.\nPlease verify launcher.log in the application folder.");
                    return;
                }
            }
        }

        private async Task MountWebViewAsync()
        {
            try
            {
                string userDataFolder = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "KansoCre8", "WebView2Data"
                );
                Directory.CreateDirectory(userDataFolder);
                Log("UserDataFolder: " + userDataFolder);

                Log("Calling CoreWebView2Environment.CreateAsync...");
                CoreWebView2Environment env = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
                Log("Environment created successfully. Calling EnsureCoreWebView2Async...");
                await webView.EnsureCoreWebView2Async(env);
                Log("EnsureCoreWebView2Async finished.");

                webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
                webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
                webView.CoreWebView2.Settings.IsStatusBarEnabled = false;

                // Handle communication signals from Svelte client
                webView.CoreWebView2.WebMessageReceived += (s, args) =>
                {
                    try
                    {
                        string json = args.WebMessageAsJson;
                        if (json.Contains("SPLASH_DISMISS"))
                        {
                            DismissSplash();
                        }
                        if (json.Contains("SET_THEME"))
                        {
                            SaveThemePref(json);
                        }
                    }
                    catch { }
                };

                webView.NavigationCompleted += (s, args) =>
                {
                    if (args.IsSuccess)
                    {
                        Log("WebView2 navigation completed successfully.");
                        // Failsafe dismiss after 1000ms if client postMessage was delayed
                        Task.Delay(1000).ContinueWith(_ => DismissSplash());
                    }
                    else
                    {
                        ShowError("Failed to render interface: " + args.WebErrorStatus);
                    }
                };

                Log("Navigating to http://localhost:4000...");
                webView.Source = new Uri("http://localhost:4000");
            }
            catch (Exception ex)
            {
                Log("WebView2 initialization error: " + ex);
                ShowError("WebView2 failed to initialize: " + ex.Message + "\n\nIf the Microsoft Edge WebView2 runtime is missing, please download and install Evergreen Bootstrapper from:\nhttps://go.microsoft.com/fwlink/p/?LinkId=2124703");
            }
        }

        private string StartBackgroundServer()
        {
            string nodePath = FindNodeRuntime();
            if (string.IsNullOrEmpty(nodePath))
            {
                return "Node.js runtime not found.\nKanso Cre8 requires Node.js (v18+) to run offline Markdown vaults.\nEnsure runtime is bundled in 'app\\runtime\\node.exe' or installed on your system.";
            }

            string scriptPath = null;
            string[] candidates = new string[]
            {
                Path.Combine(appDir, "server.bundle.cjs"),
                Path.Combine(baseDir, "app", "server.bundle.cjs"),
                Path.Combine(appDir, "server", "index.js"),
                Path.Combine(appDir, "index.js"),
                Path.Combine(baseDir, "..", "app", "server", "index.js"),
                Path.Combine(baseDir, "..", "..", "src", "app", "server", "index.js")
            };

            foreach (string candidate in candidates)
            {
                if (File.Exists(candidate))
                {
                    scriptPath = Path.GetFullPath(candidate);
                    break;
                }
            }

            if (string.IsNullOrEmpty(scriptPath))
            {
                return "Vault backend script not found.\nExpected: " + Path.Combine(appDir, "server.bundle.cjs");
            }

            string workDir = appDir;
            string scriptDir = Path.GetDirectoryName(scriptPath);
            if (File.Exists(Path.Combine(scriptDir, "package.json")))
            {
                workDir = scriptDir;
            }
            else if (File.Exists(Path.Combine(scriptDir, "..", "package.json")))
            {
                workDir = Path.GetFullPath(Path.Combine(scriptDir, ".."));
            }

            Log("Using Node.js: " + nodePath);
            Log("Using Script: " + scriptPath);
            Log("Working Dir: " + workDir);

            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = nodePath,
                Arguments = string.Format("\"{0}\"", scriptPath),
                WorkingDirectory = workDir,
                CreateNoWindow = true,
                UseShellExecute = false,
                WindowStyle = ProcessWindowStyle.Hidden,
                RedirectStandardOutput = true,
                RedirectStandardError = true
            };

            psi.EnvironmentVariables["NODE_ENV"] = "production";
            psi.EnvironmentVariables["PORT"] = "4000";

            try
            {
                serverProcess = new Process { StartInfo = psi };
                serverProcess.OutputDataReceived += (s, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data))
                    {
                        lock (logLock)
                        {
                            serverLog.AppendLine(e.Data);
                            if (serverLog.Length > 8192) serverLog.Remove(0, 4096);
                        }
                        Log("[Server stdout] " + e.Data);
                    }
                };
                serverProcess.ErrorDataReceived += (s, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data))
                    {
                        lock (logLock)
                        {
                            serverLog.AppendLine("[ERR] " + e.Data);
                            if (serverLog.Length > 8192) serverLog.Remove(0, 4096);
                        }
                        Log("[Server stderr] " + e.Data);
                    }
                };

                serverProcess.Start();
                serverProcess.BeginOutputReadLine();
                serverProcess.BeginErrorReadLine();
                return null;
            }
            catch (Exception ex)
            {
                Log("Failed to start server: " + ex);
                return "Failed to launch server process: " + ex.Message;
            }
        }

        private string FindNodeRuntime()
        {
            string[] directCandidates = new string[]
            {
                Path.Combine(appDir, "runtime", "node.exe"),
                Path.Combine(baseDir, "runtime", "node.exe"),
                Path.Combine(baseDir, "app", "runtime", "node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), @"nodejs\node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), @"nodejs\node.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\node\node.exe")
            };

            foreach (string candidate in directCandidates)
            {
                if (File.Exists(candidate)) return candidate;
            }

            return FindInPath("node.exe");
        }

        private static string FindInPath(string name)
        {
            string pathEnv = Environment.GetEnvironmentVariable("PATH");
            if (!string.IsNullOrEmpty(pathEnv))
            {
                foreach (string dir in pathEnv.Split(';'))
                {
                    string trimmed = dir.Trim();
                    if (!string.IsNullOrEmpty(trimmed))
                    {
                        try
                        {
                            string candidate = Path.Combine(trimmed, name);
                            if (File.Exists(candidate)) return candidate;
                        }
                        catch { }
                    }
                }
            }
            return null;
        }

        private static bool IsPortInUse(int port)
        {
            try
            {
                using (TcpClient client = new TcpClient())
                {
                    IAsyncResult result = client.BeginConnect("127.0.0.1", port, null, null);
                    bool success = result.AsyncWaitHandle.WaitOne(300);
                    if (success)
                    {
                        client.EndConnect(result);
                        return true;
                    }
                    return false;
                }
            }
            catch
            {
                return false;
            }
        }

        private void UpdateStatus(string message)
        {
            Dispatcher.Invoke(() =>
            {
                if (statusText != null) statusText.Text = message;
            });
            Log("[Status] " + message);
        }

        private void ShowError(string message)
        {
            Dispatcher.Invoke(() =>
            {
                if (splashGrid != null) splashGrid.Visibility = Visibility.Collapsed;
                if (webView != null) webView.Visibility = Visibility.Collapsed;
                if (errorDetailText != null) errorDetailText.Text = message;
                if (errorGrid != null) errorGrid.Visibility = Visibility.Visible;
            });
            Log("[Error] " + message);
        }

        private void MainWindow_Closing(object sender, System.ComponentModel.CancelEventArgs e)
        {
            Log("MainWindow closing. Shutting down server...");
            KillServer();
        }

        private void KillServer()
        {
            try
            {
                if (serverProcess != null && !serverProcess.HasExited)
                {
                    serverProcess.Kill();
                    serverProcess.Dispose();
                    serverProcess = null;
                }
            }
            catch { }
        }

        private void Log(string message)
        {
            try
            {
                if (!string.IsNullOrEmpty(logFilePath))
                {
                    string entry = string.Format("[{0:yyyy-MM-dd HH:mm:ss.fff}] {1}\r\n", DateTime.Now, message);
                    File.AppendAllText(logFilePath, entry);
                }
            }
            catch { }
        }

        public static void StaticLog(string message)
        {
            try
            {
                string baseDir = AppDomain.CurrentDomain.BaseDirectory;
                string logPath = Path.Combine(baseDir, "app", "launcher.log");
                string entry = string.Format("[{0:yyyy-MM-dd HH:mm:ss.fff}] {1}\r\n", DateTime.Now, message);
                File.AppendAllText(logPath, entry);
            }
            catch { }
        }
    }
}
