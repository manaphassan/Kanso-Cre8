namespace SS_CAM.Linux.ViewModels.Pages;

public class SettingsViewModel : ViewModelBase
{
    public MainViewModel Main { get; }
    public SettingsViewModel(MainViewModel main) => Main = main;
}
