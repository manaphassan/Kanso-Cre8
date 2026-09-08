namespace SS_CAM.Linux.ViewModels.Pages;

public class WellbeingViewModel : ViewModelBase
{
    public MainViewModel Main { get; }
    public WellbeingViewModel(MainViewModel main) => Main = main;
}
