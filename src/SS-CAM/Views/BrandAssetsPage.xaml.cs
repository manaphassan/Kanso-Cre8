using System;
using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class BrandAssetsPage : Page
    {
        private void OnScrollViewerPreviewMouseWheel(object sender, System.Windows.Input.MouseWheelEventArgs e)
        {
            try
            {
                var scroller = sender as ScrollViewer ?? PageScrollViewer;
                if (scroller != null)
                {
                    scroller.ScrollToVerticalOffset(scroller.VerticalOffset - e.Delta * 0.5);
                    e.Handled = true;
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[BrandAssetsPage] OnScrollViewerPreviewMouseWheel: " + ex.Message); }
        }

        public BrandAssetsPage()
        {
            InitializeComponent();
        }

        private void OnOpenServiceDashboard(object sender, RoutedEventArgs e)
        {
            OpenUrl("https://suamisihat.myds.me");
        }

        private void OnOpenInternalAssets(object sender, RoutedEventArgs e)
        {
            OpenUrl("https://assets.suamisihat.myds.me/");
        }

        private void OnOpenPublicAssets(object sender, RoutedEventArgs e)
        {
            OpenUrl("https://suamisihat.com.my/brand-assets");
        }

        private void OnSwatchClicked(object sender, RoutedEventArgs e)
        {
            FrameworkElement element = sender as FrameworkElement;
            if (element != null && element.Tag != null)
            {
                string tag = element.Tag.ToString();
                string[] parts = tag.Split('|');
                if (parts.Length >= 5)
                {
                    string hex = parts[0];
                    string rgb = parts[1];
                    string cmyk = parts[2];
                    string pantone = parts[3];
                    string name = parts[4];

                    Clipboard.SetText(hex);
                    CopyStatusText.Text = string.Format("✓ Copied {0} ({1} | RGB {2}) to clipboard!", name, hex, rgb);
                }
            }
        }

        private void OnInstallFontsClicked(object sender, RoutedEventArgs e)
        {
            string result = PayloadInstallerService.InstallBrandFonts();
            PayloadStatusText.Text = result;
            MessageBox.Show(result, "Brand Fonts Deployment", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void OnDeployAssetsClicked(object sender, RoutedEventArgs e)
        {
            string result = PayloadInstallerService.DeployBrandAssets();
            PayloadStatusText.Text = result;
            MessageBox.Show(result, "Brand Assets Deployment", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void OnCreateShortcutsClicked(object sender, RoutedEventArgs e)
        {
            string result = PayloadInstallerService.CreateDesktopShortcuts();
            PayloadStatusText.Text = result;
            MessageBox.Show(result, "Desktop Shortcuts Created", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void OnOpenPalettesFolder(object sender, RoutedEventArgs e)
        {
            OpenSubAssetFolder("Colour Palettes");
        }

        private void OnOpenLogosFolder(object sender, RoutedEventArgs e)
        {
            OpenSubAssetFolder("Logos");
        }

        private void OnOpenLibrariesFolder(object sender, RoutedEventArgs e)
        {
            OpenSubAssetFolder("Libraries");
        }

        private void OpenSubAssetFolder(string subName)
        {
            try
            {
                PayloadInstallerService.DeployBrandAssets();
                string path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SuamiSihat", "Assets", subName);
                if (!Directory.Exists(path)) Directory.CreateDirectory(path);
                Process.Start("explorer.exe", path);
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
        }

        private void OnOpenAssetsFolder(object sender, RoutedEventArgs e)
        {
            try
            {
                PayloadInstallerService.DeployBrandAssets();
                string path = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SuamiSihat", "Assets");
                if (!Directory.Exists(path)) Directory.CreateDirectory(path);
                Process.Start("explorer.exe", path);
            }
            catch (Exception ex)
            {
                MessageBox.Show(string.Format("Could not open assets folder: {0}", ex.Message), "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void OpenUrl(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                });
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
        }
    }
}
