namespace SS_CAM.Linux.ViewModels.Pages;

public class DashboardViewModel : ViewModelBase
{
    public MainViewModel Main { get; }
    public DashboardViewModel(MainViewModel main) => Main = main;
}
