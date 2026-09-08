using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Text;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media.Imaging;
using System.Windows.Threading;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class QrCodePage : Page
    {
        private string _activeContentType = "URL";
        private QrCodeOptions _currentOptions = new QrCodeOptions();
        private bool _isInitializing = true;
        private Bitmap _customLogoBitmap = null;
        private DispatcherTimer _debounceTimer = null;

        public QrCodePage()
        {
            InitializeComponent();
            Loaded += OnPageLoaded;
            Unloaded += OnPageUnloaded;

            // Debounce timer for smooth typing response
            _debounceTimer = new DispatcherTimer
            {
                Interval = TimeSpan.FromMilliseconds(150)
            };
            _debounceTimer.Tick += OnDebounceTimerTick;
        }

        private void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            try
            {
                _isInitializing = false;
                // Default logo: ss_icon_light
                _currentOptions.LogoImage = LoadSsIconLogo();
                RebuildQrCode();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[QrCodePage] OnPageLoaded: " + ex.Message);
            }
        }

        private void OnPageUnloaded(object sender, RoutedEventArgs e)
        {
            if (_debounceTimer != null)
            {
                _debounceTimer.Stop();
            }
        }

        private void OnScrollViewerPreviewMouseWheel(object sender, MouseWheelEventArgs e)
        {
            try
            {
                ScrollViewer scv = sender as ScrollViewer;
                if (scv != null)
                {
                    scv.ScrollToVerticalOffset(scv.VerticalOffset - e.Delta);
                    e.Handled = true;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[QrCodePage] OnScrollViewerPreviewMouseWheel: " + ex.Message);
            }
        }

        private void ScheduleRebuild()
        {
            if (_isInitializing) return;
            if (_debounceTimer != null)
            {
                _debounceTimer.Stop();
                _debounceTimer.Start();
            }
            else
            {
                RebuildQrCode();
            }
        }

        private void OnDebounceTimerTick(object sender, EventArgs e)
        {
            if (_debounceTimer != null) _debounceTimer.Stop();
            RebuildQrCode();
        }

        private void RebuildQrCode()
        {
            if (_isInitializing) return;

            try
            {
                // 1. Build Content String
                string content = BuildContentString();
                _currentOptions.Content = content;

                // 2. Read Resolution Size
                if (SldResolution != null)
                {
                    _currentOptions.PixelSize = (int)SldResolution.Value;
                }

                // 3. Read Error Correction
                if (CmbErrorCorrection != null)
                {
                    switch (CmbErrorCorrection.SelectedIndex)
                    {
                        case 0: _currentOptions.ErrorCorrection = QrErrorCorrectionLevel.H; break;
                        case 1: _currentOptions.ErrorCorrection = QrErrorCorrectionLevel.Q; break;
                        case 2: _currentOptions.ErrorCorrection = QrErrorCorrectionLevel.M; break;
                        case 3: _currentOptions.ErrorCorrection = QrErrorCorrectionLevel.L; break;
                        default: _currentOptions.ErrorCorrection = QrErrorCorrectionLevel.H; break;
                    }
                }

                // 4. Read Eye Shapes
                if (CmbEyeFrameShape != null)
                {
                    switch (CmbEyeFrameShape.SelectedIndex)
                    {
                        case 0: _currentOptions.EyeFrameShape = QrEyeFrameShape.Square; break;
                        case 1: _currentOptions.EyeFrameShape = QrEyeFrameShape.Rounded; break;
                        case 2: _currentOptions.EyeFrameShape = QrEyeFrameShape.Circle; break;
                        default: _currentOptions.EyeFrameShape = QrEyeFrameShape.Square; break;
                    }
                }

                if (CmbEyeDotShape != null)
                {
                    switch (CmbEyeDotShape.SelectedIndex)
                    {
                        case 0: _currentOptions.EyeDotShape = QrEyeDotShape.Square; break;
                        case 1: _currentOptions.EyeDotShape = QrEyeDotShape.Circle; break;
                        case 2: _currentOptions.EyeDotShape = QrEyeDotShape.Diamond; break;
                        default: _currentOptions.EyeDotShape = QrEyeDotShape.Square; break;
                    }
                }

                // 5. Read Gradient & Background Options
                if (ChkUseGradient != null)
                {
                    _currentOptions.UseGradient = ChkUseGradient.IsChecked ?? true;
                }

                if (ChkLogoBackground != null)
                {
                    _currentOptions.DrawLogoBackground = ChkLogoBackground.IsChecked ?? true;
                }

                // 6. Calculate Contrast & Update Live Scannability Badge
                UpdateScannabilityBadge();

                // 7. Generate Bitmap Image for WPF Preview
                BitmapImage bitmapImage = QrCodeEncoderService.Instance.GenerateBitmapImage(_currentOptions);
                ImgQrPreview.Source = bitmapImage;
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[QrCodePage] RebuildQrCode: " + ex.Message);
            }
        }

        private void UpdateScannabilityBadge()
        {
            if (BadgeScannability == null || TxtScannabilityStatus == null) return;

            try
            {
                double contrastRatio = QrCodeEncoderService.Instance.CalculateContrastRatio(_currentOptions.ForegroundColor, _currentOptions.BackgroundColor);

                if (contrastRatio < 3.5)
                {
                    TxtScannabilityStatus.Text = "LOW CONTRAST";
                    BadgeScannability.Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(245, 158, 11)); // Caution Amber #F59E0B
                }
                else if (_currentOptions.LogoImage != null && _currentOptions.ErrorCorrection == QrErrorCorrectionLevel.L)
                {
                    TxtScannabilityStatus.Text = "UNSCANNABLE (EC 7% + LOGO)";
                    BadgeScannability.Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(239, 68, 68)); // Critical Red #EF4444
                }
                else if (_currentOptions.LogoImage != null && _currentOptions.ErrorCorrection == QrErrorCorrectionLevel.M)
                {
                    TxtScannabilityStatus.Text = "RISKY (EC 15% + LOGO)";
                    BadgeScannability.Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(245, 158, 11)); // Caution Amber #F59E0B
                }
                else
                {
                    TxtScannabilityStatus.Text = "100% SCANNABLE";
                    BadgeScannability.Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(16, 185, 129)); // Emerald Green #10B981
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[QrCodePage] UpdateScannabilityBadge: " + ex.Message);
            }
        }

        private string BuildContentString()
        {
            switch (_activeContentType)
            {
                case "TEXT":
                    return TxtFreeText != null ? TxtFreeText.Text : "SuamiSihat";
                case "WIFI":
                    string ssid = TxtWifiSsid != null ? TxtWifiSsid.Text : "SS_Wifi";
                    string pass = TxtWifiPassword != null ? TxtWifiPassword.Text : "";
                    string enc = CmbWifiEnc != null && CmbWifiEnc.SelectedIndex == 1 ? "WEP" : (CmbWifiEnc != null && CmbWifiEnc.SelectedIndex == 2 ? "nopass" : "WPA");
                    return string.Format("WIFI:S:{0};T:{1};P:{2};;", ssid, enc, pass);
                case "VCARD":
                    string name = TxtVCardName != null ? TxtVCardName.Text : "Harussani";
                    string phone = TxtVCardPhone != null ? TxtVCardPhone.Text : "";
                    string email = TxtVCardEmail != null ? TxtVCardEmail.Text : "";
                    string org = TxtVCardOrg != null ? TxtVCardOrg.Text : "";
                    return string.Format("BEGIN:VCARD\nVERSION:3.0\nN:{0}\nFN:{0}\nORG:{1}\nTEL:{2}\nEMAIL:{3}\nEND:VCARD", name, org, phone, email);
                case "WHATSAPP":
                    string waPhone = TxtWaPhone != null ? TxtWaPhone.Text : "";
                    string waMsg = Uri.EscapeDataString(TxtWaMessage != null ? TxtWaMessage.Text : "");
                    return string.Format("https://wa.me/{0}?text={1}", waPhone, waMsg);
                case "EMAIL":
                    string mailTo = TxtEmailTo != null ? TxtEmailTo.Text : "";
                    string mailSub = Uri.EscapeDataString(TxtEmailSubject != null ? TxtEmailSubject.Text : "");
                    return string.Format("mailto:{0}?subject={1}", mailTo, mailSub);
                case "URL":
                default:
                    return TxtUrl != null ? TxtUrl.Text : "https://suamisihat.com.my";
            }
        }

        private void OnContentTypeClicked(object sender, RoutedEventArgs e)
        {
            Wpf.Ui.Controls.Button btn = sender as Wpf.Ui.Controls.Button;
            if (btn == null)
            {
                Button oldBtn = sender as Button;
                if (oldBtn != null && oldBtn.Tag != null) _activeContentType = oldBtn.Tag.ToString();
            }
            else if (btn.Tag != null)
            {
                _activeContentType = btn.Tag.ToString();
            }
            
            // Update Tab Highlight Styles
            if (BtnTabUrl != null) BtnTabUrl.Appearance = _activeContentType == "URL" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnTabText != null) BtnTabText.Appearance = _activeContentType == "TEXT" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnTabWifi != null) BtnTabWifi.Appearance = _activeContentType == "WIFI" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnTabVCard != null) BtnTabVCard.Appearance = _activeContentType == "VCARD" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnTabWhatsApp != null) BtnTabWhatsApp.Appearance = _activeContentType == "WHATSAPP" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnTabEmail != null) BtnTabEmail.Appearance = _activeContentType == "EMAIL" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;

            // Toggle Input Visibility
            if (PanelUrlInput != null) PanelUrlInput.Visibility = _activeContentType == "URL" ? Visibility.Visible : Visibility.Collapsed;
            if (PanelTextInput != null) PanelTextInput.Visibility = _activeContentType == "TEXT" ? Visibility.Visible : Visibility.Collapsed;
            if (PanelWifiInput != null) PanelWifiInput.Visibility = _activeContentType == "WIFI" ? Visibility.Visible : Visibility.Collapsed;
            if (PanelVCardInput != null) PanelVCardInput.Visibility = _activeContentType == "VCARD" ? Visibility.Visible : Visibility.Collapsed;
            if (PanelWhatsAppInput != null) PanelWhatsAppInput.Visibility = _activeContentType == "WHATSAPP" ? Visibility.Visible : Visibility.Collapsed;
            if (PanelEmailInput != null) PanelEmailInput.Visibility = _activeContentType == "EMAIL" ? Visibility.Visible : Visibility.Collapsed;

            ScheduleRebuild();
        }

        private void OnInputTextChanged(object sender, TextChangedEventArgs e)
        {
            ScheduleRebuild();
        }

        private void OnOptionChanged(object sender, RoutedEventArgs e)
        {
            ScheduleRebuild();
        }

        private void OnOptionChanged(object sender, SelectionChangedEventArgs e)
        {
            ScheduleRebuild();
        }

        private void OnResolutionSliderChanged(object sender, RoutedPropertyChangedEventArgs<double> e)
        {
            if (TxtResolutionValue != null)
            {
                TxtResolutionValue.Text = string.Format("{0}px", (int)e.NewValue);
            }
            ScheduleRebuild();
        }

        private void OnBackdropThemeClicked(object sender, RoutedEventArgs e)
        {
            Wpf.Ui.Controls.Button btn = sender as Wpf.Ui.Controls.Button;
            if (btn != null && btn.Tag != null)
            {
                string tag = btn.Tag.ToString();
                if (tag == "DARK")
                {
                    if (BtnBackdropLight != null) BtnBackdropLight.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
                    if (BtnBackdropDark != null) BtnBackdropDark.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
                    if (TxtBgHex != null) TxtBgHex.Text = "#0F172A";
                    if (TxtFg1Hex != null) TxtFg1Hex.Text = "#FFFFFF";
                    if (TxtFg2Hex != null) TxtFg2Hex.Text = "#21A1F7";
                    if (PreviewContainerBorder != null) PreviewContainerBorder.Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromRgb(15, 23, 42));
                }
                else
                {
                    if (BtnBackdropLight != null) BtnBackdropLight.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
                    if (BtnBackdropDark != null) BtnBackdropDark.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
                    if (TxtBgHex != null) TxtBgHex.Text = "#FFFFFF";
                    if (TxtFg1Hex != null) TxtFg1Hex.Text = "#022057";
                    if (TxtFg2Hex != null) TxtFg2Hex.Text = "#21A1F7";
                    if (PreviewContainerBorder != null) PreviewContainerBorder.Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Colors.White);
                }
                ScheduleRebuild();
            }
        }

        private void OnColorPresetClicked(object sender, RoutedEventArgs e)
        {
            Wpf.Ui.Controls.Button btn = sender as Wpf.Ui.Controls.Button;
            if (btn != null && btn.Tag != null)
            {
                string tag = btn.Tag.ToString();
                if (BtnPresetNavy != null) BtnPresetNavy.Appearance = tag == "NAVY_AZURE" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
                if (BtnPresetGold != null) BtnPresetGold.Appearance = tag == "GOLD" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
                if (BtnPresetEmerald != null) BtnPresetEmerald.Appearance = tag == "EMERALD" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
                if (BtnPresetMidnight != null) BtnPresetMidnight.Appearance = tag == "MIDNIGHT" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;

                if (tag == "NAVY_AZURE")
                {
                    TxtFg1Hex.Text = "#022057";
                    TxtFg2Hex.Text = "#21A1F7";
                    TxtBgHex.Text = "#FFFFFF";
                }
                else if (tag == "GOLD")
                {
                    TxtFg1Hex.Text = "#78350F";
                    TxtFg2Hex.Text = "#FCE53D";
                    TxtBgHex.Text = "#FFFFFF";
                }
                else if (tag == "EMERALD")
                {
                    TxtFg1Hex.Text = "#064E3B";
                    TxtFg2Hex.Text = "#10B981";
                    TxtBgHex.Text = "#FFFFFF";
                }
                else if (tag == "MIDNIGHT")
                {
                    TxtFg1Hex.Text = "#0F172A";
                    TxtFg2Hex.Text = "#64748B";
                    TxtBgHex.Text = "#FFFFFF";
                }
                ScheduleRebuild();
            }
        }

        private void OnColorHexChanged(object sender, TextChangedEventArgs e)
        {
            if (_isInitializing) return;

            try
            {
                if (TxtFg1Hex != null && !string.IsNullOrEmpty(TxtFg1Hex.Text) && TxtFg1Hex.Text.StartsWith("#") && TxtFg1Hex.Text.Length == 7)
                {
                    System.Drawing.Color c1 = System.Drawing.ColorTranslator.FromHtml(TxtFg1Hex.Text);
                    _currentOptions.ForegroundColor = c1;
                    ColorTileFg1.Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromArgb(c1.A, c1.R, c1.G, c1.B));
                }
                if (TxtFg2Hex != null && !string.IsNullOrEmpty(TxtFg2Hex.Text) && TxtFg2Hex.Text.StartsWith("#") && TxtFg2Hex.Text.Length == 7)
                {
                    System.Drawing.Color c2 = System.Drawing.ColorTranslator.FromHtml(TxtFg2Hex.Text);
                    _currentOptions.ForegroundColor2 = c2;
                    ColorTileFg2.Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromArgb(c2.A, c2.R, c2.G, c2.B));
                }
                if (TxtBgHex != null && !string.IsNullOrEmpty(TxtBgHex.Text) && TxtBgHex.Text.StartsWith("#") && TxtBgHex.Text.Length == 7)
                {
                    System.Drawing.Color cBg = System.Drawing.ColorTranslator.FromHtml(TxtBgHex.Text);
                    _currentOptions.BackgroundColor = cBg;
                    ColorTileBg.Background = new System.Windows.Media.SolidColorBrush(System.Windows.Media.Color.FromArgb(cBg.A, cBg.R, cBg.G, cBg.B));
                }

                ScheduleRebuild();
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[QrCodePage] OnColorHexChanged: " + ex.Message);
            }
        }

        private void OnBodyShapeClicked(object sender, RoutedEventArgs e)
        {
            Wpf.Ui.Controls.Button btn = sender as Wpf.Ui.Controls.Button;
            if (btn != null && btn.Tag != null)
            {
                string tag = btn.Tag.ToString();
                if (Enum.IsDefined(typeof(QrBodyShape), tag))
                {
                    _currentOptions.BodyShape = (QrBodyShape)Enum.Parse(typeof(QrBodyShape), tag);

                    if (BtnBodySquare != null) BtnBodySquare.Appearance = tag == "Square" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
                    if (BtnBodyRounded != null) BtnBodyRounded.Appearance = tag == "Rounded" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
                    if (BtnBodyCircle != null) BtnBodyCircle.Appearance = tag == "Circle" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
                    if (BtnBodyDots != null) BtnBodyDots.Appearance = tag == "Dots" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
                    if (BtnBodyDiamond != null) BtnBodyDiamond.Appearance = tag == "Diamond" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;
                    if (BtnBodyClassy != null) BtnBodyClassy.Appearance = tag == "Classy" ? Wpf.Ui.Controls.ControlAppearance.Primary : Wpf.Ui.Controls.ControlAppearance.Secondary;

                    ScheduleRebuild();
                }
            }
        }

        private void OnSelectEyeColorsClicked(object sender, RoutedEventArgs e)
        {
            _currentOptions.EyeFrameColor = _currentOptions.ForegroundColor;
            _currentOptions.EyeDotColor = _currentOptions.ForegroundColor2;
            ColorTileEyeFrame.Background = ColorTileFg1.Background;
            ColorTileEyeDot.Background = ColorTileFg2.Background;
            ScheduleRebuild();
        }

        private void OnPresetLogoClicked(object sender, RoutedEventArgs e)
        {
            Wpf.Ui.Controls.Button btn = sender as Wpf.Ui.Controls.Button;
            if (btn != null && btn.Tag != null)
            {
                string tag = btn.Tag.ToString();
                if (tag == "NONE")
                {
                    _currentOptions.LogoImage = null;
                    if (BtnLogoSsIcon != null) BtnLogoSsIcon.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
                    if (BtnLogoNone != null) BtnLogoNone.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
                }
                else
                {
                    _currentOptions.LogoImage = LoadSsIconLogo();
                    if (BtnLogoSsIcon != null) BtnLogoSsIcon.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
                    if (BtnLogoNone != null) BtnLogoNone.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
                }
                ScheduleRebuild();
            }
        }

        private Bitmap LoadSsIconLogo()
        {
            try
            {
                string path = @"e:\Dev\Projects\SS-Brand-Assets\payload\Brand Assets\Logos\ss_icon_light.png";
                if (File.Exists(path))
                {
                    return new Bitmap(path);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[QrCodePage] LoadSsIconLogo: " + ex.Message);
            }
            return GenerateFallbackSsCrest();
        }

        private Bitmap GenerateFallbackSsCrest()
        {
            Bitmap bmp = new Bitmap(160, 160);
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.SmoothingMode = SmoothingMode.HighQuality;
                using (SolidBrush bgBrush = new SolidBrush(System.Drawing.Color.FromArgb(255, 2, 32, 87)))
                {
                    g.FillEllipse(bgBrush, 10, 10, 140, 140);
                }
                using (Font font = new Font("Arial", 42, System.Drawing.FontStyle.Bold))
                using (SolidBrush textBrush = new SolidBrush(System.Drawing.Color.FromArgb(255, 252, 229, 61)))
                {
                    StringFormat sf = new StringFormat
                    {
                        Alignment = StringAlignment.Center,
                        LineAlignment = StringAlignment.Center
                    };
                    g.DrawString("SS", font, textBrush, new RectangleF(0, 0, 160, 160), sf);
                }
            }
            return bmp;
        }

        private void OnUploadCustomLogoClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                var dlg = new Microsoft.Win32.OpenFileDialog
                {
                    Filter = "Image Files (*.png;*.jpg;*.jpeg;*.bmp)|*.png;*.jpg;*.jpeg;*.bmp|All Files (*.*)|*.*",
                    Title = "Select Logo Image for QR Code"
                };

                if (dlg.ShowDialog() == true)
                {
                    _customLogoBitmap = new Bitmap(dlg.FileName);
                    _currentOptions.LogoImage = _customLogoBitmap;
                    ScheduleRebuild();
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[QrCodePage] OnUploadCustomLogoClicked: " + ex.Message);
            }
        }

        private void OnResetDefaultsClicked(object sender, RoutedEventArgs e)
        {
            _currentOptions = new QrCodeOptions();
            _customLogoBitmap = null;
            _currentOptions.LogoImage = LoadSsIconLogo();

            if (BtnLogoSsIcon != null) BtnLogoSsIcon.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
            if (BtnLogoNone != null) BtnLogoNone.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;

            if (BtnPresetNavy != null) BtnPresetNavy.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
            if (BtnPresetGold != null) BtnPresetGold.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnPresetEmerald != null) BtnPresetEmerald.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnPresetMidnight != null) BtnPresetMidnight.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;

            if (BtnBodySquare != null) BtnBodySquare.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
            if (BtnBodyRounded != null) BtnBodyRounded.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnBodyCircle != null) BtnBodyCircle.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnBodyDots != null) BtnBodyDots.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnBodyDiamond != null) BtnBodyDiamond.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnBodyClassy != null) BtnBodyClassy.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;

            _activeContentType = "URL";
            if (BtnTabUrl != null) BtnTabUrl.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
            if (BtnTabText != null) BtnTabText.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnTabWifi != null) BtnTabWifi.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnTabVCard != null) BtnTabVCard.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnTabWhatsApp != null) BtnTabWhatsApp.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;
            if (BtnTabEmail != null) BtnTabEmail.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;

            if (PanelUrlInput != null) PanelUrlInput.Visibility = Visibility.Visible;
            if (PanelTextInput != null) PanelTextInput.Visibility = Visibility.Collapsed;
            if (PanelWifiInput != null) PanelWifiInput.Visibility = Visibility.Collapsed;
            if (PanelVCardInput != null) PanelVCardInput.Visibility = Visibility.Collapsed;
            if (PanelWhatsAppInput != null) PanelWhatsAppInput.Visibility = Visibility.Collapsed;
            if (PanelEmailInput != null) PanelEmailInput.Visibility = Visibility.Collapsed;

            if (BtnBackdropLight != null) BtnBackdropLight.Appearance = Wpf.Ui.Controls.ControlAppearance.Primary;
            if (BtnBackdropDark != null) BtnBackdropDark.Appearance = Wpf.Ui.Controls.ControlAppearance.Secondary;

            if (CmbEyeFrameShape != null) CmbEyeFrameShape.SelectedIndex = 0;
            if (CmbEyeDotShape != null) CmbEyeDotShape.SelectedIndex = 0;
            if (CmbErrorCorrection != null) CmbErrorCorrection.SelectedIndex = 0;

            if (TxtUrl != null) TxtUrl.Text = "https://suamisihat.com.my";
            if (TxtFg1Hex != null) TxtFg1Hex.Text = "#022057";
            if (TxtFg2Hex != null) TxtFg2Hex.Text = "#21A1F7";
            if (TxtBgHex != null) TxtBgHex.Text = "#FFFFFF";
            ScheduleRebuild();
        }

        private void OnExportPrintPackageClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                var dlg = new Microsoft.Win32.SaveFileDialog
                {
                    Filter = "PNG Image (*.png)|*.png",
                    FileName = string.Format("SuamiSihat_QRCode_PrintBundle_{0:yyyyMMdd_HHmmss}.png", DateTime.Now),
                    Title = "Export Complete Print Package"
                };

                if (dlg.ShowDialog() == true)
                {
                    string pngPath = dlg.FileName;
                    string svgPath = Path.ChangeExtension(pngPath, ".svg");

                    // Save 2000px High-Res PNG
                    int originalSize = _currentOptions.PixelSize;
                    _currentOptions.PixelSize = 2000;

                    using (Bitmap bmp = QrCodeEncoderService.Instance.GenerateQrCodeBitmap(_currentOptions))
                    {
                        bmp.Save(pngPath, System.Drawing.Imaging.ImageFormat.Png);
                    }

                    // Save 2000px Vector SVG
                    string svgXml = QrCodeEncoderService.Instance.GenerateSvgXml(_currentOptions);
                    File.WriteAllText(svgPath, svgXml, new UTF8Encoding(true));

                    _currentOptions.PixelSize = originalSize;

                    MessageBox.Show(string.Format("Print Bundle Export Complete!\n\n1. High-Res PNG (2000px):\n{0}\n\n2. Vector SVG:\n{1}", pngPath, svgPath), "Print Bundle Exported", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Print Bundle Export failed: " + ex.Message, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void OnExportPngClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                var dlg = new Microsoft.Win32.SaveFileDialog
                {
                    Filter = "PNG Image (*.png)|*.png|JPEG Image (*.jpg)|*.jpg",
                    FileName = string.Format("SuamiSihat_QRCode_{0:yyyyMMdd_HHmmss}.png", DateTime.Now),
                    Title = "Export QR Code Image"
                };

                if (dlg.ShowDialog() == true)
                {
                    using (Bitmap bmp = QrCodeEncoderService.Instance.GenerateQrCodeBitmap(_currentOptions))
                    {
                        bmp.Save(dlg.FileName, System.Drawing.Imaging.ImageFormat.Png);
                    }
                    MessageBox.Show("QR Code saved successfully to:\n" + dlg.FileName, "Export Complete", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("Export failed: " + ex.Message, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void OnExportSvgClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                var dlg = new Microsoft.Win32.SaveFileDialog
                {
                    Filter = "Vector SVG (*.svg)|*.svg",
                    FileName = string.Format("SuamiSihat_QRCode_{0:yyyyMMdd_HHmmss}.svg", DateTime.Now),
                    Title = "Export QR Code Vector SVG"
                };

                if (dlg.ShowDialog() == true)
                {
                    string svgXml = QrCodeEncoderService.Instance.GenerateSvgXml(_currentOptions);
                    File.WriteAllText(dlg.FileName, svgXml, new UTF8Encoding(true));
                    MessageBox.Show("Vector SVG saved successfully to:\n" + dlg.FileName, "Export Complete", MessageBoxButton.OK, MessageBoxImage.Information);
                }
            }
            catch (Exception ex)
            {
                MessageBox.Show("SVG Export failed: " + ex.Message, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void OnCopyImageToClipboardClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                using (Bitmap bmp = QrCodeEncoderService.Instance.GenerateQrCodeBitmap(_currentOptions))
                {
                    using (MemoryStream ms = new MemoryStream())
                    {
                        bmp.Save(ms, System.Drawing.Imaging.ImageFormat.Png);
                        BitmapImage bi = new BitmapImage();
                        bi.BeginInit();
                        bi.StreamSource = ms;
                        bi.CacheOption = BitmapCacheOption.OnLoad;
                        bi.EndInit();
                        Clipboard.SetImage(bi);
                    }
                }
                MessageBox.Show("QR Code image copied to clipboard!", "Clipboard Success", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to copy image to clipboard: " + ex.Message, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }

        private void OnCopySvgCodeClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                string svgXml = QrCodeEncoderService.Instance.GenerateSvgXml(_currentOptions);
                ClipboardService.SetText(svgXml);
                MessageBox.Show("Vector SVG XML code copied to clipboard!", "Vector SVG Code Copied", MessageBoxButton.OK, MessageBoxImage.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Failed to copy SVG code to clipboard: " + ex.Message, "Error", MessageBoxButton.OK, MessageBoxImage.Error);
            }
        }
    }
}
