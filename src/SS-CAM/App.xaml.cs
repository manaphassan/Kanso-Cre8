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
            RegisterUserAppPlacement();
        }

        private static void LogException(Exception ex)
        {
            if (ex == null) return;
            try
            {
                string log = string.Format("[{0}] UNHANDLED EXCEPTION:\n{1}\n\n", DateTime.Now, ex.ToString());
                File.AppendAllText(@"e:\Dev\Projects\SS-Brand-Assets\crash_log.txt", log);
            }
            catch { }
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
                    catch { }
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
            catch { }
        }
    }
}
