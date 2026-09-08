using System;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using Microsoft.Win32;
using SS_CAM.Models;
using SS_CAM.Services;
using Wpf.Ui.Controls;

namespace SS_CAM.Dialogs
{
    public partial class FirstRunSetupDialog : FluentWindow
    {
        public UserProfile ConfiguredProfile { get; private set; }

        public FirstRunSetupDialog(UserProfile currentProfile = null)
        {
            InitializeComponent();
            ConfiguredProfile = currentProfile ?? UserProfileService.LoadProfile();
            Loaded += OnPageLoaded;
        }

        private void OnPageLoaded(object sender, RoutedEventArgs e)
        {
            try
            {
                if (ConfiguredProfile != null)
                {
                    TxtWorkspaceRoot.Text = ConfiguredProfile.WorkspaceRoot ?? "";
                    TxtDesignerName.Text = ConfiguredProfile.DesignerName ?? Environment.UserName;
                    TxtStaffId.Text = ConfiguredProfile.StaffId ?? "";
                    TxtEmail.Text = ConfiguredProfile.Email ?? "";
                }

                if (string.IsNullOrWhiteSpace(TxtWorkspaceRoot.Text))
                {
                    OnAutoDetectClicked(null, null);
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[FirstRunSetupDialog] OnPageLoaded error: " + ex.Message);
            }
        }

        private void OnAutoDetectClicked(object sender, RoutedEventArgs e)
        {
            string detected = NasConfigSyncService.DiscoverWorkspaceRoot();
            if (!string.IsNullOrWhiteSpace(detected))
            {
                TxtWorkspaceRoot.Text = detected;
                TxtWorkspaceStatus.Text = "Auto-detected valid Creative-Team workspace \u2713";
            }
            else
            {
                TxtWorkspaceStatus.Text = "No standard Creative-Team folder auto-detected. Click Browse to select.";
            }
        }

        private void OnBrowseWorkspaceClicked(object sender, RoutedEventArgs e)
        {
            try
            {
                var dialog = new System.Windows.Forms.FolderBrowserDialog
                {
                    Description = "Select your Creative-Team workspace root directory"
                };

                if (dialog.ShowDialog() == System.Windows.Forms.DialogResult.OK)
                {
                    TxtWorkspaceRoot.Text = dialog.SelectedPath;
                    TxtWorkspaceStatus.Text = "Selected path: " + dialog.SelectedPath;
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[FirstRunSetupDialog] Browse error: " + ex.Message);
            }
        }

        private void OnSaveClicked(object sender, RoutedEventArgs e)
        {
            TxtError.Text = "";
            string wsRoot = TxtWorkspaceRoot.Text.Trim();
            string dName = TxtDesignerName.Text.Trim();
            string staffId = TxtStaffId.Text.Trim();
            string email = TxtEmail.Text.Trim();
            string dept = CmbDepartment.SelectedItem is ComboBoxItem 
                ? ((ComboBoxItem)CmbDepartment.SelectedItem).Content.ToString() 
                : "Creative & Brand";

            if (string.IsNullOrWhiteSpace(wsRoot) || !Directory.Exists(wsRoot))
            {
                TxtError.Text = "Please select a valid Workspace Root folder.";
                return;
            }

            if (string.IsNullOrWhiteSpace(dName))
            {
                TxtError.Text = "Please enter your Designer Name.";
                return;
            }

            if (ConfiguredProfile == null) ConfiguredProfile = new UserProfile();

            ConfiguredProfile.WorkspaceRoot = wsRoot;
            ConfiguredProfile.DesignerName = dName;
            ConfiguredProfile.StaffId = staffId;
            ConfiguredProfile.Department = dept;
            ConfiguredProfile.Email = email;
            ConfiguredProfile.IsConfigured = true;

            try
            {
                UserProfileService.SaveProfile(ConfiguredProfile);
                NasConfigSyncService.SaveToNas(wsRoot, "user_profile.json");
                DialogResult = true;
                Close();
            }
            catch (Exception ex)
            {
                TxtError.Text = "Failed to save profile: " + ex.Message;
            }
        }
    }
}
