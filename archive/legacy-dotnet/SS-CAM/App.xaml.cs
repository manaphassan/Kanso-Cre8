using System;
using System.Diagnostics;
using System.IO;
using System.Windows;
using SS_CAM.Services;

namespace SS_CAM
{
    public partial class App : Application
    {
        protected override void OnStartup(StartupEventArgs e)
        {
            LogTrace("=== SS-CAM APPLICATION STARTUP ===");
            AppDomain.CurrentDomain.ProcessExit += (s, args) => LogTrace("=== AppDomain ProcessExit fired ===");
            AppDomain.CurrentDomain.UnhandledException += (s, args) =>
            {
                Exception ex = args.ExceptionObject as Exception;
                LogTrace("Unhandled AppDomain Exception: " + (ex != null ? ex.ToString() : (args.ExceptionObject != null ? args.ExceptionObject.ToString() : "null")));
                LogException(ex);
            };
            DispatcherUnhandledException += (s, args) =>
            {
                LogTrace("DispatcherUnhandledException: " + (args.Exception != null ? args.Exception.ToString() : "null"));
                LogException(args.Exception);
                args.Handled = true;
            };

            base.OnStartup(e);

            Views.SplashWindow splash = new Views.SplashWindow();
            splash.Show();
            LogTrace("SplashWindow shown");

            System.Threading.Tasks.Task.Run(() =>
            {
                try
                {
                    LogTrace("Step 1: Initializing");
                    splash.UpdateStatus("Initializing SuamiSihat CAM...");
                    System.Threading.Thread.Sleep(200);

                    LogTrace("Step 2: RegisterUserAppPlacement");
                    splash.UpdateStatus("Deploying brand assets & fonts...");
                    RegisterUserAppPlacement();
                    RegisterCustomUriScheme();

                    LogTrace("Step 3: UserProfileService.LoadProfile");
                    splash.UpdateStatus("Synchronizing NAS preferences...");
                    UserProfileService.LoadProfile();

                    LogTrace("Step 4: Preparing workstation shell");
                    splash.UpdateStatus("Preparing workstation shell...");
                    System.Threading.Thread.Sleep(150);

                    LogTrace("Step 5: Invoking MainWindow creation on UI thread");
                    Dispatcher.Invoke(new Action(() =>
                    {
                        try
                        {
                            LogTrace("Dispatcher.Invoke: Instantiating MainWindow");
                            MainWindow main = new MainWindow();
                            this.MainWindow = main;
                            main.Closed += (s, args) => { LogTrace("MainWindow Closed -> Shutting down application"); Shutdown(); };
                            LogTrace("Dispatcher.Invoke: Showing MainWindow");
                            main.Show();
                            LogTrace("Dispatcher.Invoke: Fading out splash");
                            splash.FadeOutAndClose();
                        }
                        catch (Exception ex)
                        {
                            LogTrace("FATAL during MainWindow creation: " + ex.ToString());
                            LogException(ex);
                            splash.Close();
                            MessageBox.Show("Unable to load SS-CAM workstation:\n" + ex.Message, "SS-CAM Startup Error", MessageBoxButton.OK, MessageBoxImage.Error);
                            Shutdown(1);
                        }
                    }));
                }
                catch (Exception ex)
                {
                    LogTrace("FATAL during background startup: " + ex.ToString());
                    LogException(ex);
                    Dispatcher.Invoke(new Action(() =>
                    {
                        try
                        {
                            splash.Close();
                            MessageBox.Show("SS-CAM startup failure:\n" + ex.Message, "SS-CAM Startup Error", MessageBoxButton.OK, MessageBoxImage.Error);
                            Shutdown(1);
                        }
                        catch (Exception innerEx) { System.Diagnostics.Debug.WriteLine(innerEx); }
                    }));
                }
            });
        }

        protected override void OnExit(ExitEventArgs e)
        {
            LogTrace(string.Format("=== SS-CAM APPLICATION EXIT (ExitCode={0}) ===", e.ApplicationExitCode));
            base.OnExit(e);
        }

        public static void LogTrace(string message)
        {
            try
            {
                string dir = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "SuamiSihat");
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                string path = Path.Combine(dir, "startup_trace.log");
                File.AppendAllText(path, string.Format("[{0:yyyy-MM-dd HH:mm:ss.fff}] {1}\r\n", DateTime.Now, message));
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[App] LogTrace error: " + ex.Message); }
        }

        private static void LogException(Exception ex)
        {
            if (ex == null) return;
            try
            {
                string log = string.Format("[{0}] UNHANDLED EXCEPTION:\n{1}\n\n", DateTime.Now, ex.ToString());
                string dir = System.IO.Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                    "SuamiSihat");
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                string logPath = System.IO.Path.Combine(dir, "crash_log.txt");
                File.AppendAllText(logPath, log);
            }
            catch (Exception innerEx) { System.Diagnostics.Debug.WriteLine("[App] LogException error: " + innerEx.Message); }
        }

        public static void RegisterUserAppPlacement()
        {
            try
            {
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string installFolder = Path.Combine(localAppData, "Programs", "SuamiSihat");
                if (!Directory.Exists(installFolder)) Directory.CreateDirectory(installFolder);

                string targetExe = Path.Combine(installFolder, "SS-CAM.exe");
                string currentExe = System.Reflection.Assembly.GetExecutingAssembly().Location;

                // Copy binary to protected Programs folder if running from somewhere else (e.g. Downloads or Desktop)
                if (!string.IsNullOrWhiteSpace(currentExe) && File.Exists(currentExe) && !currentExe.Equals(targetExe, StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        File.Copy(currentExe, targetExe, true);
                    }
                    catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
                }

                // Deploy Brand Assets & Fonts to LocalAppData automatically
                PayloadInstallerService.DeployBrandAssets();
                PayloadInstallerService.InstallBrandFonts();

                string exeForShortcut = File.Exists(targetExe) ? targetExe : currentExe;

                // Register in Windows Start Menu for Windows Search indexing
                string startMenuFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs");
                string shortcutPath = Path.Combine(startMenuFolder, "SuamiSihat Creative Assets Management.lnk");

                if (!File.Exists(shortcutPath))
                {
                    try
                    {
                        Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                        if (shellType != null)
                        {
                            dynamic shell = Activator.CreateInstance(shellType);
                            dynamic shortcut = shell.CreateShortcut(shortcutPath);
                            shortcut.TargetPath = exeForShortcut;
                            shortcut.WorkingDirectory = Path.GetDirectoryName(exeForShortcut);
                            shortcut.Save();
                        }
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine("[App] Shortcut creation error: " + ex.Message);
                    }
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
        }

        public static void RegisterCustomUriScheme()
        {
            try
            {
                string currentExe = System.Reflection.Assembly.GetExecutingAssembly().Location;
                if (string.IsNullOrEmpty(currentExe) || !File.Exists(currentExe)) return;

                using (var key = Microsoft.Win32.Registry.CurrentUser.CreateSubKey(@"Software\Classes\sscam"))
                {
                    if (key != null)
                    {
                        key.SetValue("", "URL:SuamiSihat CAM Protocol");
                        key.SetValue("URL Protocol", "");
                        using (var defaultIcon = key.CreateSubKey("DefaultIcon"))
                        {
                            if (defaultIcon != null) defaultIcon.SetValue("", currentExe + ",1");
                        }
                        using (var shell = key.CreateSubKey("shell"))
                        {
                            if (shell != null)
                            {
                                using (var open = shell.CreateSubKey("open"))
                                {
                                    if (open != null)
                                    {
                                        using (var command = open.CreateSubKey("command"))
                                        {
                                            if (command != null) command.SetValue("", "\"" + currentExe + "\" \"%1\"");
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[App] RegisterCustomUriScheme error: " + ex.Message);
            }
        }
    }
}
