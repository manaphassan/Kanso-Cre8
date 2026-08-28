using System;
using System.IO;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;

namespace SS_CAM.Linux.ViewModels;

public partial class MainViewModel : ViewModelBase
{
    [ObservableProperty]
    private string _appName = "SS-CAM Desktop (Linux / Fedora Edition)";

    [ObservableProperty]
    private string _appVersion = "v4.5.0-linux";

    [ObservableProperty]
    private string _synologyDrivePath = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
        "SynologyDrive"
    );

    [ObservableProperty]
    private string _selectedNavTab = "Dashboard";

    [ObservableProperty]
    private string _statusMessage = "Synology Drive client integration active.";

    [RelayCommand]
    private void SelectTab(string tabName)
    {
        SelectedNavTab = tabName;
        StatusMessage = $"Navigated to {tabName}";
    }

    [RelayCommand]
    private void CreateDesktopShortcut()
    {
        try
        {
            string userHome = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
            string desktopDir = Path.Combine(userHome, "Desktop");
            
            if (!Directory.Exists(desktopDir))
            {
                Directory.CreateDirectory(desktopDir);
            }

            string shortcutPath = Path.Combine(desktopDir, "SS-CAM.desktop");
            string execPath = System.Diagnostics.Process.GetCurrentProcess().MainModule?.FileName ?? "SS-CAM.Linux";

            string content = $"[Desktop Entry]\nType=Application\nName=SS-CAM Desktop\nComment=SuamiSihat Creative Assets Management\nExec={execPath}\nIcon=avalonia-logo\nTerminal=false\nCategories=Graphics;Development;\n";
            File.WriteAllText(shortcutPath, content);

            StatusMessage = $"Desktop shortcut created at {shortcutPath}";
        }
        catch (Exception ex)
        {
            StatusMessage = $"Failed to create desktop shortcut: {ex.Message}";
        }
    }
}
