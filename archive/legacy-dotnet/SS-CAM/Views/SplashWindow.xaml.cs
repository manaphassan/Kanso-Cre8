using System;
using System.Windows;
using System.Windows.Media.Animation;

namespace SS_CAM.Views
{
    public partial class SplashWindow : Window
    {
        public SplashWindow()
        {
            InitializeComponent();
            if (TxtVersionBadge != null)
                TxtVersionBadge.Text = SS_CAM.Services.AppVersion.DisplayVersion;
        }

        public void UpdateStatus(string status)
        {
            if (string.IsNullOrWhiteSpace(status)) return;
            
            if (!Dispatcher.CheckAccess())
            {
                Dispatcher.Invoke(new Action(() => UpdateStatus(status)));
                return;
            }

            TxtStatus.Text = status;
        }

        public void FadeOutAndClose(Action onClosed = null)
        {
            if (!Dispatcher.CheckAccess())
            {
                Dispatcher.Invoke(new Action(() => FadeOutAndClose(onClosed)));
                return;
            }

            App.LogTrace("SplashWindow: FadeOutAndClose started");
            DoubleAnimation fadeAnim = new DoubleAnimation(1.0, 0.0, new Duration(TimeSpan.FromMilliseconds(400)));
            fadeAnim.Completed += (s, e) =>
            {
                try
                {
                    App.LogTrace("SplashWindow: Windows count before close: " + Application.Current.Windows.Count);
                    foreach (Window w in Application.Current.Windows)
                    {
                        App.LogTrace(string.Format("  - Win: {0}, Vis={1}, IsLoaded={2}, Handle={3}", w.GetType().Name, w.Visibility, w.IsLoaded, new System.Windows.Interop.WindowInteropHelper(w).Handle));
                    }
                    App.LogTrace("SplashWindow: Current.MainWindow is: " + (Application.Current.MainWindow != null ? Application.Current.MainWindow.GetType().Name : "null"));
                    App.LogTrace("SplashWindow: Calling Close()");
                    Close();
                    App.LogTrace("SplashWindow: Windows count after close: " + Application.Current.Windows.Count);
                    foreach (Window w in Application.Current.Windows)
                    {
                        App.LogTrace(string.Format("  - Remaining Win: {0}, Vis={1}, IsLoaded={2}, Handle={3}", w.GetType().Name, w.Visibility, w.IsLoaded, new System.Windows.Interop.WindowInteropHelper(w).Handle));
                    }
                }
                catch (Exception ex)
                {
                    App.LogTrace("SplashWindow: Close() error: " + ex.Message);
                    System.Diagnostics.Debug.WriteLine("[SplashWindow] Close error: " + ex.Message);
                }
                if (onClosed != null) onClosed();
            };

            RootContainer.BeginAnimation(UIElement.OpacityProperty, fadeAnim);
        }
    }
}
