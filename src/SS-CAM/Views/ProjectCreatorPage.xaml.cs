using System;
using System.Windows;
using System.Windows.Controls;
using SS_CAM.Services;

namespace SS_CAM.Views
{
    public partial class ProjectCreatorPage : Page
    {
        private readonly ProjectGeneratorService _projectService;

        public ProjectCreatorPage()
        {
            InitializeComponent();
            _projectService = new ProjectGeneratorService();
            BtnGenerate.Click += BtnGenerate_Click;
        }

        private void BtnGenerate_Click(object sender, RoutedEventArgs e)
        {
            var projectName = TxtProjectName.Text;
            var subBrandItem = CmbSubBrand.SelectedItem as ComboBoxItem;
            var subBrand = (subBrandItem != null && subBrandItem.Content != null) ? subBrandItem.Content.ToString() : "SS";
            
            var jobNumber = TxtJobNumber.Text;
            
            var presetItem = CmbPreset.SelectedItem as ComboBoxItem;
            var preset = (presetItem != null && presetItem.Content != null) ? presetItem.Content.ToString() : "Standard Artwork";
            
            // Hardcode root directory for now, ideally retrieved from Settings
            var rootDir = Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments);

            try
            {
                var resultPath = _projectService.GenerateProjectFolder(
                    rootDir, projectName, subBrand, DateTime.Now.Year.ToString(), 
                    jobNumber, preset, null);

                TxtResult.Text = string.Format("Success! Created at: {0}", resultPath);
                TxtResult.Visibility = Visibility.Visible;
                TxtProjectName.Text = string.Empty;
                TxtJobNumber.Text = string.Empty;
            }
            catch (Exception ex)
            {
                TxtResult.Text = string.Format("Error: {0}", ex.Message);
                TxtResult.Foreground = System.Windows.Media.Brushes.Red;
                TxtResult.Visibility = Visibility.Visible;
            }
        }
    }
}
