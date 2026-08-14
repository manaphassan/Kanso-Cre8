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
    private string _appVersion = "v3.5.0-linux";

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
}
