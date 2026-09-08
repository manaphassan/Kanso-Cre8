using System;
using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class BrandAssetsPage : Page
    {
        private string _currentHex = "#022057";
        private string _currentToken = "--ss-prussian-blue";

        public BrandAssetsPage()
        {
            InitializeComponent();
        }

        private void OnScrollViewerPreviewMouseWheel(object sender, MouseWheelEventArgs e)
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
            catch (Exception ex)
            {
                Debug.WriteLine("[BrandAssetsPage] OnScrollViewerPreviewMouseWheel: " + ex.Message);
            }
        }

        private void OnSwatchClicked(object sender, MouseButtonEventArgs e)
        {
            try
            {
                FrameworkElement element = sender as FrameworkElement;
                if (element != null && element.Tag != null)
                {
                    string tag = element.Tag.ToString();
                    string[] parts = tag.Split('|');
                    if (parts.Length >= 8)
                    {
                        string hex = parts[0];
                        string rgb = parts[1];
                        string cmyk = parts[2];
                        string pantone = parts[3];
                        string balRal = parts[4];
                        string tokenName = parts[5];
                        string colorName = parts[6];
                        string roleDesc = parts[7];

                        _currentHex = hex;
                        _currentToken = tokenName;

                        Clipboard.SetText(hex);
                        CopyStatusText.Text = string.Format("✓ Copied {0} ({1} | {2}) to clipboard!", colorName, hex, tokenName);

                        if (InspectorColorTile != null)
                        {
                            InspectorColorTile.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString(hex));
                        }
                        if (InspectorColorName != null) InspectorColorName.Text = colorName;
                        if (InspectorRoleText != null) InspectorRoleText.Text = roleDesc;
                        if (InspectorHexText != null) InspectorHexText.Text = hex;
                        if (InspectorTokenText != null) InspectorTokenText.Text = tokenName;
                        if (InspectorRgbText != null) InspectorRgbText.Text = rgb;
                        if (InspectorCmykText != null) InspectorCmykText.Text = cmyk;
                        if (InspectorBalRalText != null) InspectorBalRalText.Text = balRal;
                        if (InspectorPantoneText != null) InspectorPantoneText.Text = pantone;
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[BrandAssetsPage] OnSwatchClicked error: " + ex.Message);
            }
        }

        private void OnCopyHexClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                if (!string.IsNullOrEmpty(_currentHex))
                {
                    Clipboard.SetText(_currentHex);
                    CopyStatusText.Text = string.Format("✓ Copied HEX value ({0}) to clipboard!", _currentHex);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[BrandAssetsPage] OnCopyHexClicked error: " + ex.Message);
            }
        }

        private void OnCopyTokenClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                if (!string.IsNullOrEmpty(_currentToken))
                {
                    Clipboard.SetText(_currentToken);
                    CopyStatusText.Text = string.Format("✓ Copied Design Token ({0}) to clipboard!", _currentToken);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[BrandAssetsPage] OnCopyTokenClicked error: " + ex.Message);
            }
        }

        private void OnSelectContrastLight(object sender, RoutedEventArgs e)
        {
            try
            {
                LogoContrastStage.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FCFAF6"));
                LogoPreviewWordmark.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#022057"));
                LogoPreviewSubtext.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#043388"));
                LogoContrastInfoText.Text = "Lightness Rule (L ≥ 50%): Primary Light variant active for porcelain/white canvases.";
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[BrandAssetsPage] OnSelectContrastLight error: " + ex.Message);
            }
        }

        private void OnSelectContrastDark(object sender, RoutedEventArgs e)
        {
            try
            {
                LogoContrastStage.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#090D16"));
                LogoPreviewWordmark.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));
                LogoPreviewSubtext.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#21A1F7"));
                LogoContrastInfoText.Text = "Lightness Rule (L < 50%): Primary Dark (White) variant active for deep void canvases.";
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[BrandAssetsPage] OnSelectContrastDark error: " + ex.Message);
            }
        }

        private void OnSelectContrastPrussian(object sender, RoutedEventArgs e)
        {
            try
            {
                LogoContrastStage.Background = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#022057"));
                LogoPreviewWordmark.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#FFFFFF"));
                LogoPreviewSubtext.Foreground = new SolidColorBrush((Color)ColorConverter.ConvertFromString("#6DC6EC"));
                LogoContrastInfoText.Text = "Corporate Surface (#022057): Luminous white wordmark & Malibu cyan subtext standard.";
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[BrandAssetsPage] OnSelectContrastPrussian error: " + ex.Message);
            }
        }

        private void OnOpenMasterLogos(object sender, RoutedEventArgs e)
        {
            OpenLogoSubFolder("00_logo_SuamiSihat");
        }

        private void OnOpenSsHealth(object sender, RoutedEventArgs e)
        {
            OpenLogoSubFolder("01_logo_ssHealth");
        }

        private void OnOpenSsClinic(object sender, RoutedEventArgs e)
        {
            OpenLogoSubFolder("02_logo_ssClinic");
        }

        private void OnOpenSsWellness(object sender, RoutedEventArgs e)
        {
            OpenLogoSubFolder("03_logo_ssWellness");
        }

        private void OnOpenSsEcom(object sender, RoutedEventArgs e)
        {
            OpenLogoSubFolder("04_logo_ssEcom");
        }

        private void OnOpenSsTech(object sender, RoutedEventArgs e)
        {
            OpenLogoSubFolder("05_logo_ssTech");
        }

        private void OpenLogoSubFolder(string subFolderName)
        {
            try
            {
                PayloadInstallerService.DeployBrandAssets();
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                string path = Path.Combine(localAppData, "SuamiSihat", "Assets", "Logos", subFolderName);

                if (!Directory.Exists(path))
                {
                    string payloadDir = PayloadInstallerService.FindPayloadDirectory();
                    string payloadSub = !string.IsNullOrEmpty(payloadDir) ? Path.Combine(payloadDir, "Brand Assets", "Logos", subFolderName) : "";
                    if (Directory.Exists(payloadSub))
                    {
                        path = payloadSub;
                    }
                    else
                    {
                        Directory.CreateDirectory(path);
                    }
                }
                Process.Start("explorer.exe", path);
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[BrandAssetsPage] OpenLogoSubFolder error: " + ex.Message);
            }
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
                Debug.WriteLine("[BrandAssetsPage] OnOpenAssetsFolder error: " + ex.Message);
                MessageBox.Show(string.Format("Could not open assets folder: {0}", ex.Message), "Error", MessageBoxButton.OK, MessageBoxImage.Error);
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
            catch (Exception ex)
            {
                Debug.WriteLine("[BrandAssetsPage] OpenUrl error: " + ex.Message);
            }
        }
    }
}
