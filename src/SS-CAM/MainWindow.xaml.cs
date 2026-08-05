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
            // Force window to correct size and state after Mica/FluentWindow initialisation
            WindowState = WindowState.Normal;
            Width  = 1366;
            Height = 768;
            Activate();
        }
    }
}
