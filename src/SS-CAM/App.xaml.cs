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
            AppDomain.CurrentDomain.UnhandledException += (s, args) => LogException(args.ExceptionObject as Exception);
            DispatcherUnhandledException += (s, args) => { LogException(args.Exception); args.Handled = true; };

            base.OnStartup(e);

            Views.SplashWindow splash = new Views.SplashWindow();
            splash.Show();

            System.Threading.Tasks.Task.Run(() =>
            {
                try
                {
                    splash.UpdateStatus("Initializing SuamiSihat CAM...");
                    System.Threading.Thread.Sleep(300);

                    splash.UpdateStatus("Deploying brand assets & fonts...");
                    RegisterUserAppPlacement();
                    RegisterCustomUriScheme();

                    splash.UpdateStatus("Synchronizing NAS preferences...");
                    UserProfileService.LoadProfile();

                    splash.UpdateStatus("Preparing workstation shell...");
                    System.Threading.Thread.Sleep(200);

                    Dispatcher.Invoke(new Action(() =>
                    {
                        MainWindow main = new MainWindow();
                        this.MainWindow = main;
                        main.Show();
                        splash.FadeOutAndClose();
                    }));
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("[App] Startup error: " + ex.Message);
                    Dispatcher.Invoke(new Action(() =>
                    {
                        MainWindow main = new MainWindow();
                        this.MainWindow = main;
                        main.Show();
                        splash.Close();
                    }));
                }
            });
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

                string psCommand = string.Format(
                    "$s=(New-Object -COM WScript.Shell).CreateShortcut('{0}');$s.TargetPath='{1}';$s.WorkingDirectory='{2}';$s.Save()",
                    shortcutPath.Replace("'", "''"),
                    exeForShortcut.Replace("'", "''"),
                    Path.GetDirectoryName(exeForShortcut).Replace("'", "''")
                );

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = "powershell.exe",
                    Arguments = string.Format("-NoProfile -ExecutionPolicy Bypass -Command \"{0}\"", psCommand),
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using (Process p = Process.Start(psi))
                {
                    p.WaitForExit(3000);
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
