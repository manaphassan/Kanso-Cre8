namespace SS_CAM.Linux.ViewModels.Pages;

public class DeliverablesViewModel : ViewModelBase
{
    public MainViewModel Main { get; }
    public DeliverablesViewModel(MainViewModel main) => Main = main;
}
