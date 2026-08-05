using System;
using System.IO;
using System.Windows;
using System.Reflection;

namespace SS_CAM
{
    public partial class App : Application
    {
        static App()
        {
            AppDomain.CurrentDomain.AssemblyResolve += (s, e) => {
                string logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ss-cam-assembly-resolve.log");
                File.AppendAllText(logPath, "Failed to resolve: " + e.Name + Environment.NewLine);
                return null;
            };
        }

        public App()
        {
            AppDomain.CurrentDomain.UnhandledException += OnUnhandledException;
            DispatcherUnhandledException += OnDispatcherUnhandledException;
        }

        private static void OnUnhandledException(object sender, UnhandledExceptionEventArgs e)
        {
            var ex = e.ExceptionObject as Exception;
            ShowError(ex);
        }

        private static void OnDispatcherUnhandledException(object sender, System.Windows.Threading.DispatcherUnhandledExceptionEventArgs e)
        {
            e.Handled = true;
            ShowError(e.Exception);
        }

        private static void ShowError(Exception ex)
        {
            string msg = ex != null ? BuildMessage(ex) : "An unknown error occurred.";
            try
            {
                string logPath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "ss-cam-error.log");
                File.WriteAllText(logPath, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + Environment.NewLine + msg);
            }
            catch { }
            MessageBox.Show(msg, "SS-CAM - Startup Error", MessageBoxButton.OK, MessageBoxImage.Error);
        }

        private static string BuildMessage(Exception ex)
        {
            var sb = new System.Text.StringBuilder();
            var current = ex;
            int depth = 0;
            while (current != null && depth < 5)
            {
                if (depth > 0) sb.AppendLine().AppendLine("--- Inner Exception ---");
                sb.AppendLine(current.GetType().FullName + ": " + current.Message);
                sb.AppendLine(current.StackTrace);
                current = current.InnerException;
                depth++;
            }
            return sb.ToString();
        }
    }
}
