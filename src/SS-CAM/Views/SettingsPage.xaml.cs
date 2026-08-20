using System;
using System.Collections.Generic;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Media.Imaging;
using Microsoft.Win32;
using SS_CAM.Models;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class SettingsPage : Page
    {
        private UserProfile currentProfile;

        public SettingsPage()
        {
            InitializeComponent();
            if (TxtVersionBadge != null)
                TxtVersionBadge.Text = string.Format("SS-CAM {0}", AppVersion.DisplayVersion);
            Loaded += OnPageLoaded;
            Unloaded += OnPageUnloaded;
        }

        private void OnPageUnloaded(object sender, RoutedEventArgs e)
        {
            // Reserved for future cleanup
        }

        private void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            LoadProfileData();
        }

        private void LoadProfileData()
        {
            currentProfile = UserProfileService.LoadProfile();

            DesignerNameInput.Text = currentProfile.DesignerName;
            StaffIdInput.Text = currentProfile.StaffId;
            DepartmentInput.Text = currentProfile.Department;
            EmailInput.Text = currentProfile.Email;
            WorkspaceRootInput.Text = currentProfile.WorkspaceRoot;

            ProfileHeaderName.Text = string.IsNullOrWhiteSpace(currentProfile.DesignerName) ? "Brand" : currentProfile.DesignerName;
            ProfileHeaderDept.Text = string.IsNullOrWhiteSpace(currentProfile.Department) ? "Creative & Brand" : currentProfile.Department;
            ProfileHeaderStaffId.Text = string.Format("Staff ID: {0}", string.IsNullOrWhiteSpace(currentProfile.StaffId) ? "0001D" : currentProfile.StaffId);

            UpdateAvatarPreview(currentProfile.AvatarPath);
            PopulateStaffDirectory();
        }

        private void PopulateStaffDirectory()
        {
            try
            {
                var directory = UserProfileService.GetStaffDirectory(currentProfile != null ? currentProfile.WorkspaceRoot : null);
                StaffDirectoryCombo.ItemsSource = directory;

                if (currentProfile != null && !string.IsNullOrWhiteSpace(currentProfile.StaffId))
                {
                    foreach (var item in directory)
                    {
                        if (string.Equals(item.StaffId, currentProfile.StaffId, StringComparison.OrdinalIgnoreCase))
                        {
                            StaffDirectoryCombo.SelectedItem = item;
                            break;
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[SettingsPage] PopulateStaffDirectory error: " + ex.Message);
            }
        }

        private void OnStaffDirectoryComboSelectionChanged(object sender, SelectionChangedEventArgs e)
        {
            var selected = StaffDirectoryCombo.SelectedItem as StaffDirectoryItem;
            if (selected != null)
            {
                DesignerNameInput.Text = selected.Name;
                StaffIdInput.Text = selected.StaffId;
                DepartmentInput.Text = selected.Department;

                ProfileHeaderName.Text = selected.Name;
                ProfileHeaderDept.Text = selected.Department;
                ProfileHeaderStaffId.Text = string.Format("Staff ID: {0}", selected.StaffId);
            }
        }

        private void UpdateAvatarPreview(string path)
        {
            if (!string.IsNullOrWhiteSpace(path) && File.Exists(path))
            {
                try
                {
                    BitmapImage bmp = new BitmapImage();
                    bmp.BeginInit();
                    bmp.UriSource = new Uri(path, UriKind.Absolute);
                    bmp.CacheOption = BitmapCacheOption.OnLoad;
                    bmp.EndInit();

                    AvatarPreviewImg.Source = bmp;
                    AvatarPreviewImg.Visibility = Visibility.Visible;
                    AvatarEmojiText.Visibility = Visibility.Collapsed;
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("[SettingsPage] LoadAvatar: " + ex.Message);
                    AvatarPreviewImg.Visibility = Visibility.Collapsed;
                    AvatarEmojiText.Visibility = Visibility.Visible;
                }
            }
            else
            {
                AvatarPreviewImg.Visibility = Visibility.Collapsed;
                AvatarEmojiText.Visibility = Visibility.Visible;
            }
        }

        private void OnChangeAvatarClicked(object sender, RoutedEventArgs e)
        {
            OpenFileDialog dlg = new OpenFileDialog();
            dlg.Filter = "Image Files (*.png;*.jpg;*.jpeg;*.webp;*.bmp)|*.png;*.jpg;*.jpeg;*.webp;*.bmp|All Files (*.*)|*.*";
            dlg.Title = "Select Avatar Profile Picture";

            if (dlg.ShowDialog() == true)
            {
                try
                {
                    string targetFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SuamiSihat");
                    if (!Directory.Exists(targetFolder)) Directory.CreateDirectory(targetFolder);

                    string ext = Path.GetExtension(dlg.FileName);
                    string targetPath = Path.Combine(targetFolder, string.Format("avatar{0}", ext));

                    File.Copy(dlg.FileName, targetPath, true);
                    currentProfile.AvatarPath = targetPath;

                    UpdateAvatarPreview(targetPath);
                }
                catch (Exception ex)
                {
                    MessageBox.Show(string.Format("Could not update avatar: {0}", ex.Message), "Avatar Error", MessageBoxButton.OK, MessageBoxImage.Error);
                }
            }
        }

        private void OnSaveProfileClicked(object sender, RoutedEventArgs e)
        {
            currentProfile.DesignerName = DesignerNameInput.Text;
            currentProfile.StaffId = StaffIdInput.Text;
            currentProfile.Department = DepartmentInput.Text;
            currentProfile.Email = EmailInput.Text;
            currentProfile.WorkspaceRoot = WorkspaceRootInput.Text;

            UserProfileService.SaveProfile(currentProfile);

            ProfileHeaderName.Text = currentProfile.DesignerName;
            ProfileHeaderDept.Text = string.IsNullOrWhiteSpace(currentProfile.Department) ? "Creative & Brand" : currentProfile.Department;
            ProfileHeaderStaffId.Text = string.Format("Staff ID: {0}", currentProfile.StaffId);

            ProfileSaveStatus.Text = "Profile saved!";

            // Notify MainWindow to refresh header / sidebar avatar badge
            if (Application.Current != null)
            {
                MainWindow mainWin = Application.Current.MainWindow as MainWindow;
                if (mainWin != null)
                {
                    mainWin.RefreshProfileUI();
                }
            }

            MessageBox.Show("Profile identity and workstation settings saved successfully.", "Profile Saved", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void OnBrowseWorkspace(object sender, RoutedEventArgs e)
        {
            using (var dialog = new System.Windows.Forms.FolderBrowserDialog())
            {
                dialog.SelectedPath = WorkspaceRootInput.Text;
                if (dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                {
                    WorkspaceRootInput.Text = dialog.SelectedPath;
                }
            }
        }

        private void OnCreateDesktopShortcut(object sender, RoutedEventArgs e)
        {
            string result = PayloadInstallerService.CreateAppDesktopShortcut();
            MessageBox.Show(result, "Desktop Shortcut", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void OnRepairFonts(object sender, RoutedEventArgs e)
        {
            string result = PayloadInstallerService.InstallBrandFonts();
            MessageBox.Show(result, "Font Deployment", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void OnDeployAssets(object sender, RoutedEventArgs e)
        {
            string result = PayloadInstallerService.DeployBrandAssets(WorkspaceRootInput.Text);
            MessageBox.Show(result, "Brand Assets Deployment", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void OnCheckUpdates(object sender, RoutedEventArgs e)
        {
            // Disable button while checking to prevent double-clicks
            var btn = sender as System.Windows.Controls.Button;
            if (btn != null) btn.IsEnabled = false;

            System.Threading.ThreadPool.QueueUserWorkItem(_ =>
            {
                string latestVersion = "";
                string downloadUrl = "";
                string releaseNotes = "";
                bool networkError = false;

                try
                {
                    // Primary: GitHub Releases API (always reflects published releases)
                    const string GithubApiUrl = "https://api.github.com/repos/SuamiSihat/ss_cam/releases/latest";
                    System.Net.ServicePointManager.SecurityProtocol =
                        System.Net.SecurityProtocolType.Tls12 | System.Net.SecurityProtocolType.Tls11;

                    System.Net.HttpWebRequest req = (System.Net.HttpWebRequest)System.Net.WebRequest.Create(GithubApiUrl);
                    req.Timeout = 8000;
                    req.Method = "GET";
                    req.Accept = "application/vnd.github+json";
                    req.UserAgent = "SS-CAM/" + AppVersion.VersionString;

                    using (System.Net.HttpWebResponse resp = (System.Net.HttpWebResponse)req.GetResponse())
                    using (System.IO.StreamReader reader = new System.IO.StreamReader(resp.GetResponseStream()))
                    {
                        string json = reader.ReadToEnd();

                        // Parse "tag_name": "v4.0.0"  → strip leading 'v'
                        string tag = ExtractJsonValue(json, "tag_name");
                        if (!string.IsNullOrEmpty(tag))
                            latestVersion = tag.TrimStart('v', 'V');

                        // "body": "Release notes..."
                        releaseNotes = ExtractJsonValue(json, "body");
                        if (!string.IsNullOrEmpty(releaseNotes) && releaseNotes.Length > 120)
                            releaseNotes = releaseNotes.Substring(0, 120) + "…";

                        // Build the exe download URL from known naming convention
                        downloadUrl = string.Format(
                            "https://github.com/SuamiSihat/ss_cam/releases/download/v{0}/SS-CAM-v{0}.exe",
                            latestVersion);
                    }
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("[SettingsPage] OnCheckUpdates (GitHub): " + ex.Message);

                    // Fallback: NAS version.json
                    try
                    {
                        System.Net.ServicePointManager.ServerCertificateValidationCallback = (s, c, ch, er) => true;
                        System.Net.HttpWebRequest req2 = (System.Net.HttpWebRequest)System.Net.WebRequest.Create("https://suamisihat.myds.me/ss-cam/version.json");
                        req2.Timeout = 5000;
                        req2.Method = "GET";
                        req2.Accept = "application/json";
                        using (System.Net.HttpWebResponse resp2 = (System.Net.HttpWebResponse)req2.GetResponse())
                        using (System.IO.StreamReader reader2 = new System.IO.StreamReader(resp2.GetResponseStream()))
                        {
                            string json2 = reader2.ReadToEnd();
                            latestVersion = ExtractJsonValue(json2, "version");
                            releaseNotes  = ExtractJsonValue(json2, "releaseNotes");
                            downloadUrl   = ExtractJsonValue(json2, "downloadUrl");
                        }
                    }
                    catch (Exception ex2)
                    {
                        System.Diagnostics.Debug.WriteLine("[SettingsPage] OnCheckUpdates (NAS fallback): " + ex2.Message);
                        networkError = true;
                    }
                }

                // Back on UI thread
                if (Application.Current != null)
                {
                    Application.Current.Dispatcher.Invoke(() =>
                    {
                        if (btn != null) btn.IsEnabled = true;

                        if (networkError || string.IsNullOrEmpty(latestVersion))
                        {
                            MessageBox.Show(
                                "Could not reach the update server.\nPlease check your internet or NAS connection and try again.",
                                "Update Check Failed",
                                MessageBoxButton.OK,
                                MessageBoxImage.Warning);
                            return;
                        }

                        bool isNewer = false;
                        try
                        {
                            isNewer = new Version(latestVersion).CompareTo(new Version(AppVersion.VersionString)) > 0;
                        }
                        catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[SettingsPage] VersionCompare: " + ex.Message); }

                        if (isNewer)
                        {
                            string notes = string.IsNullOrWhiteSpace(releaseNotes)
                                ? ""
                                : "\n\nWhat's new:\n" + releaseNotes;
                            string msg = string.Format(
                                "SS-CAM v{0} is available.{1}\n\nYou are running {2}.\n\nWould you like to download the update now?",
                                latestVersion, notes, AppVersion.DisplayVersion);

                            MessageBoxResult result = MessageBox.Show(
                                msg,
                                "Update Available",
                                MessageBoxButton.YesNo,
                                MessageBoxImage.Information);

                            if (result == MessageBoxResult.Yes && !string.IsNullOrEmpty(downloadUrl))
                            {
                                try
                                {
                                    System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                                    {
                                        FileName = downloadUrl,
                                        UseShellExecute = true
                                    });
                                }
                                catch (Exception ex3) { System.Diagnostics.Debug.WriteLine("[SettingsPage] OpenDownloadUrl: " + ex3.Message); }
                            }
                        }
                        else
                        {
                            MessageBox.Show(
                                string.Format("You are running SS-CAM {0}.\nThis is the latest version.", AppVersion.DisplayVersion),
                                "Up to Date",
                                MessageBoxButton.OK,
                                MessageBoxImage.Information);
                        }
                    });
                }
            });
        }

        /// <summary>
        /// Lightweight JSON string value extractor — no external dependencies.
        /// </summary>
        private static string ExtractJsonValue(string json, string key)
        {
            try
            {
                string search = string.Format("\"{0}\"", key);
                int keyIdx = json.IndexOf(search, StringComparison.OrdinalIgnoreCase);
                if (keyIdx < 0) return "";
                int colon = json.IndexOf(':', keyIdx + search.Length);
                if (colon < 0) return "";
                // Trim whitespace after colon
                int open = colon + 1;
                while (open < json.Length && (json[open] == ' ' || json[open] == '\t')) open++;
                if (open >= json.Length) return "";
                if (json[open] == '"')
                {
                    // String value
                    open++; // skip opening quote
                    int close = open;
                    while (close < json.Length)
                    {
                        if (json[close] == '\\') { close += 2; continue; } // skip escaped chars
                        if (json[close] == '"') break;
                        close++;
                    }
                    return json.Substring(open, close - open);
                }
                else
                {
                    // Non-string value (number, bool) — read until delimiter
                    int end = open;
                    while (end < json.Length && json[end] != ',' && json[end] != '}' && json[end] != '\n') end++;
                    return json.Substring(open, end - open).Trim();
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[SettingsPage] ExtractJsonValue: " + ex.Message); return ""; }
        }

        private void OnManageCategoryPresetsClicked(object sender, RoutedEventArgs e)
        {
            if (Application.Current != null && Application.Current.MainWindow is MainWindow)
            {
                MainWindow mainWin = Application.Current.MainWindow as MainWindow;
                mainWin.NavigateTo(typeof(ProjectCreatorPage));
            }
        }

        private void OnSelectFalconiaTheme(object sender, RoutedEventArgs e)
        {
            ThemeService.ApplyTheme(AppTheme.Falconia);
        }

        private void OnSelectMetamorphosisTheme(object sender, RoutedEventArgs e)
        {
            ThemeService.ApplyTheme(AppTheme.Metamorphosis);
        }

        private void OnSelectCatppuccinTheme(object sender, RoutedEventArgs e)
        {
            ThemeService.ApplyTheme(AppTheme.Catppuccin);
        }

        private void OnSelectRosePineTheme(object sender, RoutedEventArgs e)
        {
            ThemeService.ApplyTheme(AppTheme.RosePine);
        }

        private void OnSelectNordTheme(object sender, RoutedEventArgs e)
        {
            ThemeService.ApplyTheme(AppTheme.Nord);
        }

        private void OnScrollViewerPreviewMouseWheel(object sender, System.Windows.Input.MouseWheelEventArgs e)
        {
            try
            {
                var sv = sender as ScrollViewer;
                if (sv == null) return;
                sv.ScrollToVerticalOffset(sv.VerticalOffset - e.Delta * 0.5);
                e.Handled = true;
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[SettingsPage] OnScrollViewerPreviewMouseWheel: " + ex.Message); }
        }


        public void OnDownloadSoftwareClicked(object sender, RoutedEventArgs e)
        {
            Button btn = sender as Button;
            if (btn != null && btn.Tag != null)
            {
                string url = btn.Tag.ToString();
                if (!string.IsNullOrEmpty(url))
                {
                    try
                    {
                        System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo
                        {
                            FileName = url,
                            UseShellExecute = true
                        });
                    }
                    catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
                }
            }
        }

        private void OnResetProfileDefaults(object sender, RoutedEventArgs e)
        {
            if (MessageBox.Show("Are you sure you want to reset profile credentials to default SS Branding details?\n\n• Name: SS Branding\n• Department: Creative Department\n• Email: branding@suamisihat.com\n• Staff ID: SS000X", "Reset Profile Defaults", MessageBoxButton.YesNo, MessageBoxImage.Question) == MessageBoxResult.Yes)
            {
                currentProfile = UserProfileService.ResetToDefaults();
                LoadProfileData();

                if (Application.Current != null)
                {
                    MainWindow mainWin = Application.Current.MainWindow as MainWindow;
                    if (mainWin != null)
                    {
                        mainWin.RefreshProfileUI();
                    }
                }

                ProfileSaveStatus.Text = "Profile reset to default SS Branding credentials!";
                MessageBox.Show("Profile identity successfully reset:\n• Name: SS Branding\n• Department: Creative Department\n• Email: branding@suamisihat.com\n• Staff ID: SS000X", "Reset Complete", MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }

        private void OnClearAllData(object sender, RoutedEventArgs e)
        {
            if (MessageBox.Show("Are you sure you want to clear all local cache, session history, and reset profile to defaults?", "Clear Data & Cache", MessageBoxButton.YesNo, MessageBoxImage.Warning) == MessageBoxResult.Yes)
            {
                UserProfileService.ClearAllDataAndCache();
                LoadProfileData();

                if (Application.Current != null)
                {
                    MainWindow mainWin = Application.Current.MainWindow as MainWindow;
                    if (mainWin != null)
                    {
                        mainWin.RefreshProfileUI();
                    }
                }

                ProfileSaveStatus.Text = "All local data cleared and profile reset!";
                MessageBox.Show("All local data & cache have been cleared, and profile has been reset to default SS Branding credentials.", "Data Cleared", MessageBoxButton.OK, MessageBoxImage.Information);
            }
        }
    }
}




