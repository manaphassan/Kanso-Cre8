using System;
using System.Diagnostics;
using System.IO;
using System.Net.Sockets;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
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
            AppDomain.CurrentDomain.UnhandledException += (s, e) =>
            {
                KansoMainWindow.StaticLog("UnhandledException: " + e.ExceptionObject);
            };
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

        public KansoMainWindow()
        {
            Title = "Kanso Cre8 (簡素) — Mindful Creative Vault";
            Width = 1380;
            Height = 860;
            MinWidth = 1024;
            MinHeight = 680;
            WindowStartupLocation = WindowStartupLocation.CenterScreen;

            // #09090B Dark Canvas
            System.Windows.Media.Color canvasColor = System.Windows.Media.Color.FromRgb(0x09, 0x09, 0x0B);
            Background = new SolidColorBrush(canvasColor);

            baseDir = AppDomain.CurrentDomain.BaseDirectory;
            appDir = Path.Combine(baseDir, "app");
            if (!Directory.Exists(appDir))
            {
                appDir = baseDir;
            }
            logFilePath = Path.Combine(appDir, "launcher.log");

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

            BuildUI(canvasColor);

            Loaded += MainWindow_Loaded;
            Closing += MainWindow_Closing;
        }

        private void BuildUI(System.Windows.Media.Color canvasColor)
        {
            rootGrid = new Grid();
            Content = rootGrid;

            // 1. WebView2 Control
            webView = new WebView2
            {
                Visibility = Visibility.Hidden,
                DefaultBackgroundColor = System.Drawing.Color.FromArgb(9, 9, 11)
            };
            rootGrid.Children.Add(webView);

            // 2. Splash / Loading Screen (Linear/Geist Studio Aesthetics)
            splashGrid = new Grid
            {
                Background = new SolidColorBrush(canvasColor)
            };

            StackPanel splashPanel = new StackPanel
            {
                HorizontalAlignment = HorizontalAlignment.Center,
                VerticalAlignment = VerticalAlignment.Center
            };

            TextBlock kanjiLogo = new TextBlock
            {
                Text = "簡素",
                FontSize = 38,
                FontWeight = FontWeights.Bold,
                Foreground = new SolidColorBrush(System.Windows.Media.Color.FromRgb(0xF4, 0xF4, 0xF5)),
                HorizontalAlignment = HorizontalAlignment.Center,
                TextAlignment = TextAlignment.Center
            };

            TextBlock brandTitle = new TextBlock
            {
                Text = "KANSO CRE8",
                FontSize = 13,
                FontWeight = FontWeights.SemiBold,
                Foreground = new SolidColorBrush(System.Windows.Media.Color.FromRgb(0x38, 0xBD, 0xF8)),
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 6, 0, 16)
            };

            statusText = new TextBlock
            {
                Text = "Initializing Mindful Creative Vault...",
                FontSize = 12,
                Foreground = new SolidColorBrush(System.Windows.Media.Color.FromRgb(0x71, 0x71, 0x7A)),
                HorizontalAlignment = HorizontalAlignment.Center,
                Margin = new Thickness(0, 0, 0, 12)
            };

            ProgressBar progressBar = new ProgressBar
            {
                IsIndeterminate = true,
                Width = 200,
                Height = 2,
                BorderThickness = new Thickness(0),
                Background = new SolidColorBrush(System.Windows.Media.Color.FromRgb(0x27, 0x27, 0x2A)),
                Foreground = new SolidColorBrush(System.Windows.Media.Color.FromRgb(0x38, 0xBD, 0xF8)),
                HorizontalAlignment = HorizontalAlignment.Center
            };

            splashPanel.Children.Add(kanjiLogo);
            splashPanel.Children.Add(brandTitle);
            splashPanel.Children.Add(statusText);
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
            UpdateStatus("Mounting visual atelier interface...");
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
                webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
                webView.CoreWebView2.Settings.IsStatusBarEnabled = false;

                webView.NavigationCompleted += (s, args) =>
                {
                    if (args.IsSuccess)
                    {
                        splashGrid.Visibility = Visibility.Collapsed;
                        webView.Visibility = Visibility.Visible;
                        Log("WebView2 navigation completed successfully.");
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
                ShowError("WebView2 failed to initialize: " + ex.Message);
            }
        }

        private string StartBackgroundServer()
        {
            string nodePath = FindNodeRuntime();
            if (string.IsNullOrEmpty(nodePath))
            {
                return "Node.js runtime not found.\nKanso Cre8 requires Node.js (v18+) to run offline Markdown vaults.\nEnsure runtime is bundled in 'app\\runtime\\node.exe'.";
            }

            string scriptPath = null;
            string[] candidates = new string[]
            {
                Path.Combine(appDir, "server.bundle.cjs"),
                Path.Combine(appDir, "server", "index.js"),
                Path.Combine(appDir, "index.js")
            };

            foreach (string candidate in candidates)
            {
                if (File.Exists(candidate))
                {
                    scriptPath = candidate;
                    break;
                }
            }

            if (string.IsNullOrEmpty(scriptPath))
            {
                return "Vault backend script not found.\nExpected: " + Path.Combine(appDir, "server.bundle.cjs");
            }

            Log("Using Node.js: " + nodePath);
            Log("Using Script: " + scriptPath);

            ProcessStartInfo psi = new ProcessStartInfo
            {
                FileName = nodePath,
                Arguments = string.Format("\"{0}\"", scriptPath),
                WorkingDirectory = appDir,
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
