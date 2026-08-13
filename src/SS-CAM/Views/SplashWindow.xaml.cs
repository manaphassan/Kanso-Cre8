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

            DoubleAnimation fadeAnim = new DoubleAnimation(1.0, 0.0, new Duration(TimeSpan.FromMilliseconds(400)));
            fadeAnim.Completed += (s, e) =>
            {
                try
                {
                    Close();
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("[SplashWindow] Close error: " + ex.Message);
                }
                if (onClosed != null) onClosed();
            };

            RootContainer.BeginAnimation(UIElement.OpacityProperty, fadeAnim);
        }
    }
}
