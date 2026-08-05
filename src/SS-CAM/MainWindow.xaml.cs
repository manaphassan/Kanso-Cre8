using System.Windows;
using Wpf.Ui.Controls;

namespace SS_CAM
{
    public partial class MainWindow : FluentWindow
    {
        public MainWindow()
        {
            InitializeComponent();
            Loaded += OnLoaded;
        }

        private void OnLoaded(object sender, RoutedEventArgs e)
        {
            WindowState = WindowState.Normal;
            Width  = 1366;
            Height = 768;
            Activate();

            // Navigate to Dashboard so content area is never blank on startup
            RootNavigation.Navigate(typeof(Views.DashboardPage));
        }
    }
}

