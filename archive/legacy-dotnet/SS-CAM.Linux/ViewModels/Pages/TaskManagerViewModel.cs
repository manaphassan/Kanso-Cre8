namespace SS_CAM.Linux.ViewModels.Pages;

public class TaskManagerViewModel : ViewModelBase
{
    public MainViewModel Main { get; }
    public TaskManagerViewModel(MainViewModel main) => Main = main;
}
