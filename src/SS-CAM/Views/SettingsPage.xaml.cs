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
            Loaded += OnPageLoaded;
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
                catch
                {
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
            MessageBox.Show("You are running SS-CAM v2.1.0. Software is up to date.", "Check for Updates", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void OnManageCategoryPresetsClicked(object sender, RoutedEventArgs e)
        {
            if (Application.Current != null && Application.Current.MainWindow is MainWindow)
            {
                MainWindow mainWin = Application.Current.MainWindow as MainWindow;
                mainWin.NavigateTo(typeof(ProjectCreatorPage), mainWin.NavProjectsBtn);
            }
        }

        private void OnSelectSSDefaultTheme(object sender, RoutedEventArgs e)
        {
            ThemeService.ApplyTheme(AppTheme.SSDefault);
            MessageBox.Show("Applied SS Default (SuamiSihat Brand Theme).", "Theme Applied", MessageBoxButton.OK, MessageBoxImage.Information);
        }

        private void OnSelectWin11FluentTheme(object sender, RoutedEventArgs e)
        {
            ThemeService.ApplyTheme(AppTheme.Win11Fluent);
            MessageBox.Show("Applied Windows 11 Fluent (Mica Slate Theme).", "Theme Applied", MessageBoxButton.OK, MessageBoxImage.Information);
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
                    catch { }
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
