namespace SS_CAM.Linux.ViewModels.Pages;

public class ProjectCreatorViewModel : ViewModelBase
{
    public MainViewModel Main { get; }
    public ProjectCreatorViewModel(MainViewModel main) => Main = main;
}
