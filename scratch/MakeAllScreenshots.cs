using System;
using System.IO;
using System.Threading;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using Wpf.Ui.Appearance;
using Wpf.Ui.Controls;
using SS_CAM;
using SS_CAM.Services;
using SS_CAM.Views;

namespace SS_CAM.Tools
{
    class MakeAllScreenshots
    {
        [STAThread]
        static void Main(string[] args)
        {
            try
            {
                var app = new Application();

                // Merge WPF-UI and App theme resources
                var res = app.Resources;
                res.MergedDictionaries.Add(new Wpf.Ui.Markup.ThemesDictionary { Theme = Wpf.Ui.Appearance.ApplicationTheme.Dark });
                res.MergedDictionaries.Add(new Wpf.Ui.Markup.ControlsDictionary());
                res.MergedDictionaries.Add(new ResourceDictionary
                {
                    Source = new Uri("pack://application:,,,/SS-CAM;component/Styles/Fluent2Styles.xaml", UriKind.Absolute)
                });
                res.MergedDictionaries.Add(new ResourceDictionary
                {
                    Source = new Uri("pack://application:,,,/SS-CAM;component/Styles/SSDefaultTheme.xaml", UriKind.Absolute)
                });

                var win = new MainWindow();
                win.Width = 1280;
                win.Height = 820;
                win.WindowStartupLocation = WindowStartupLocation.CenterScreen;
                win.Show();

                DoEvents();
                Thread.Sleep(1500);
                DoEvents();

                var nav = win.FindName("RootNavigation") as Wpf.Ui.Controls.NavigationView;
                if (nav == null)
                {
                    Console.WriteLine("Could not find RootNavigation control in MainWindow!");
                    return;
                }

                RenderWindowView(win, nav, typeof(DashboardPage), @"D:\HaNa_Innovation\ss_cam\docs\app-dashboard.png");
                RenderWindowView(win, nav, typeof(ProjectCreatorPage), @"D:\HaNa_Innovation\ss_cam\docs\app-project-creator.png");
                RenderWindowView(win, nav, typeof(SearchCopyPage), @"D:\HaNa_Innovation\ss_cam\docs\app-search-copy.png");
                RenderWindowView(win, nav, typeof(BrandAssetsPage), @"D:\HaNa_Innovation\ss_cam\docs\app-brand-assets.png");
                RenderWindowView(win, nav, typeof(TaskManagerPage), @"D:\HaNa_Innovation\ss_cam\docs\app-task-manager.png");
                RenderWindowView(win, nav, typeof(CalendarPage), @"D:\HaNa_Innovation\ss_cam\docs\app-big-calendar.png");
                RenderWindowView(win, nav, typeof(QuickNotePage), @"D:\HaNa_Innovation\ss_cam\docs\app-quick-notes.png");
                RenderWindowView(win, nav, typeof(WaktuSolatPage), @"D:\HaNa_Innovation\ss_cam\docs\app-waktu-solat.png");
                RenderWindowView(win, nav, typeof(SettingsPage), @"D:\HaNa_Innovation\ss_cam\docs\app-profile-settings.png");

                Console.WriteLine("ALL 9 HIGH-RES SCREENSHOTS RENDERED SUCCESSFULLY!");

                win.Close();
                app.Shutdown();
            }
            catch (Exception ex)
            {
                Console.WriteLine("Error: " + ex.ToString());
            }
        }

        static void RenderWindowView(MainWindow win, Wpf.Ui.Controls.NavigationView nav, Type pageType, string outputPath)
        {
            try
            {
                nav.Navigate(pageType);

                DoEvents();
                Thread.Sleep(1200);
                DoEvents();

                win.Measure(new Size(1280, 820));
                win.Arrange(new Rect(0, 0, 1280, 820));
                win.UpdateLayout();
                DoEvents();

                int w = 1280;
                int h = 820;

                var rtb = new RenderTargetBitmap(w, h, 96, 96, PixelFormats.Pbgra32);
                rtb.Render(win);

                var encoder = new PngBitmapEncoder();
                encoder.Frames.Add(BitmapFrame.Create(rtb));

                using (var stream = File.Create(outputPath))
                {
                    encoder.Save(stream);
                }

                long len = new FileInfo(outputPath).Length;
                Console.WriteLine("Successfully rendered " + Path.GetFileName(outputPath) + " (" + len + " bytes)");
            }
            catch (Exception ex)
            {
                Console.WriteLine("Failed to render " + outputPath + ": " + ex.Message);
            }
        }

        static void DoEvents()
        {
            DispatcherFrame frame = new DispatcherFrame();
            Dispatcher.CurrentDispatcher.BeginInvoke(DispatcherPriority.Background, new DispatcherOperationCallback(ExitFrame), frame);
            Dispatcher.PushFrame(frame);
        }

        static object ExitFrame(object f)
        {
            ((DispatcherFrame)f).Continue = false;
            return null;
        }
    }
}
