using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;

namespace SS_CAM.Services
{
    public class ProjectGeneratorService
    {
        public string GenerateProjectFolder(
            string rootDirectory, 
            string projectName, 
            string subBrand, 
            string year, 
            string jobNumber, 
            string presetType, 
            List<string> extraSubFolders)
        {
            var cleanProjectName = string.IsNullOrWhiteSpace(projectName) 
                ? "Untitled_Project" 
                : Regex.Replace(projectName.Trim(), @"[^a-zA-Z0-9\-_]", "_");

            string cleanSubBrand;
            var brandMatch = Regex.Match(subBrand.Trim(), @"^([A-Z]{2,4})\s+-\s+");
            if (brandMatch.Success)
            {
                cleanSubBrand = brandMatch.Groups[1].Value.ToUpperInvariant();
            }
            else
            {
                var lowerBrand = subBrand.ToLowerInvariant();
                if (lowerBrand.Contains("holding")) cleanSubBrand = "SSH";
                else if (lowerBrand.Contains("healthcare")) cleanSubBrand = "SSC";
                else if (lowerBrand.Contains("wellness")) cleanSubBrand = "SSW";
                else if (lowerBrand.Contains("ecom")) cleanSubBrand = "SSE";
                else if (lowerBrand.Contains("tech")) cleanSubBrand = "SST";
                else if (subBrand == "SSH" || subBrand == "SSC" || subBrand == "SSW" || subBrand == "SSE" || subBrand == "SST")
                    cleanSubBrand = subBrand.ToUpperInvariant();
                else cleanSubBrand = "SS";
            }

            var cleanYear = Regex.IsMatch(year, @"^\d{4}$") ? year : DateTime.Now.ToString("yyyy");
            var curMonthNum = DateTime.Now.ToString("MM");
            var curMonthFull = System.Threading.Thread.CurrentThread.CurrentCulture.TextInfo.ToTitleCase(DateTime.Now.ToString("MMMM"));
            
            var yearFolder = string.Format("SS-{0}", cleanYear);
            var monthFolder = string.Format("{0}{1}_{2}", cleanYear, curMonthNum, curMonthFull);
            var dateCode = string.Format("{0}{1}", cleanYear, curMonthNum);

            var cleanJob = jobNumber != null ? jobNumber.Trim() : string.Empty;
            if (Regex.IsMatch(cleanJob, @"^\d+$")) cleanJob = string.Format("{0}D", cleanJob);
            if (string.IsNullOrWhiteSpace(cleanJob)) cleanJob = "0001D";

            var folderName = string.Format("{0}_{1}_{2}_{3}", dateCode, cleanJob, cleanSubBrand, cleanProjectName);
            
            var yearRoot = Regex.IsMatch(rootDirectory, @"\\SS-\d{4}$") 
                ? Path.GetDirectoryName(rootDirectory) 
                : rootDirectory;
                
            var yearPath = Path.Combine(yearRoot, yearFolder);
            var monthlyRoot = Path.Combine(yearPath, monthFolder);
            var projectRoot = Path.Combine(monthlyRoot, folderName);

            var subFolders = new List<string>();
            var lowerPreset = presetType != null ? presetType.ToLowerInvariant() : "";
            
            if (lowerPreset.Contains("social"))
            {
                subFolders.AddRange(new[] { "Working Files", "Source Assets", "Copywriting", "Final Exports" });
            }
            else if (lowerPreset.Contains("video"))
            {
                subFolders.AddRange(new[] { "Project Files", "Footage", "Audio", "Renders", "Final Exports" });
            }
            else if (lowerPreset.Contains("brand"))
            {
                subFolders.AddRange(new[] { "Vector Master", "Brand Guidelines", "Colour Palettes", "Export Packages" });
            }
            else
            {
                subFolders.AddRange(new[] { "Artwork Design", "Artwork Mockup", "Assets", "Production" });
            }

            if (extraSubFolders != null && extraSubFolders.Count > 0)
            {
                foreach (var extra in extraSubFolders)
                {
                    if (!string.IsNullOrWhiteSpace(extra) && !subFolders.Contains(extra))
                    {
                        subFolders.Add(extra.Trim());
                    }
                }
            }

            foreach (var sf in subFolders)
            {
                var path = Path.Combine(projectRoot, sf);
                Directory.CreateDirectory(path);
            }

            return projectRoot;
        }
    }
}
