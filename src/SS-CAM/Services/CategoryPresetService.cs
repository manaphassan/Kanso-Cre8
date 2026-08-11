using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using Newtonsoft.Json;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    public class CategoryPresetService
    {
        private static readonly string ConfigFilePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
            "SuamiSihat",
            "category_presets.json"
        );

        public static List<CategoryPreset> GetDefaultPresets()
        {
            return new List<CategoryPreset>
            {
                new CategoryPreset
                {
                    Id = "preset_graphic",
                    Name = "Graphic & Print Design",
                    Suffix = "D",
                    IsDefault = true,
                    Folders = new List<string> { "01_Artwork_Design", "02_Artwork_Mockup", "03_Assets", "04_Production" }
                },
                new CategoryPreset
                {
                    Id = "preset_social",
                    Name = "Social Media Content",
                    Suffix = "S",
                    IsDefault = true,
                    Folders = new List<string> { "01_Working_Files", "02_Source_Assets", "03_Copywriting", "04_Final_Exports" }
                },
                new CategoryPreset
                {
                    Id = "preset_video",
                    Name = "Video Production",
                    Suffix = "V",
                    IsDefault = true,
                    Folders = new List<string> { "01_Project_Files", "02_Footage", "03_Audio", "04_Renders", "05_Final_Exports" }
                },
                new CategoryPreset
                {
                    Id = "preset_brand",
                    Name = "Brand Identity",
                    Suffix = "P",
                    IsDefault = true,
                    Folders = new List<string> { "01_Vector_Master", "02_Brand_Guidelines", "03_Colour_Palettes", "04_Export_Packages" }
                },
                new CategoryPreset
                {
                    Id = "preset_ecommerce",
                    Name = "E-Commerce",
                    Suffix = "E",
                    IsDefault = true,
                    Folders = new List<string> { "01_Product_Shots", "02_Banners", "03_Listing_Assets", "04_Exports" }
                }
            };
        }

        public static List<string> ParseFolderLines(string folderText)
        {
            List<string> subFolders = new List<string>();
            if (string.IsNullOrWhiteSpace(folderText)) return subFolders;

            string[] rawLines = folderText.Split(new[] { "\r\n", "\r", "\n" }, StringSplitOptions.RemoveEmptyEntries);
            string parentFolder = "";

            foreach (string l in rawLines)
            {
                string trimmed = l.Trim();
                if (string.IsNullOrWhiteSpace(trimmed)) continue;

                bool isIndented = l.StartsWith(" ") || l.StartsWith("\t") || l.StartsWith("-") || trimmed.StartsWith("-");

                if (isIndented && !string.IsNullOrEmpty(parentFolder))
                {
                    string subName = trimmed.TrimStart('-', '*', ' ', '\t').Trim();
                    subName = Regex.Replace(subName, @"[\\/:*?""<>|]", "_");
                    if (!string.IsNullOrEmpty(subName))
                    {
                        subFolders.Add(Path.Combine(parentFolder, subName));
                    }
                }
                else
                {
                    string normalized = trimmed.Replace('/', Path.DirectorySeparatorChar);
                    subFolders.Add(normalized);

                    string[] parts = normalized.Split(Path.DirectorySeparatorChar);
                    parentFolder = parts[0];
                }
            }

            return subFolders;
        }

        public static List<CategoryPreset> LoadPresets()
        {
            try
            {
                if (File.Exists(ConfigFilePath))
                {
                    string json = File.ReadAllText(ConfigFilePath);
                    List<CategoryPreset> list = JsonConvert.DeserializeObject<List<CategoryPreset>>(json);
                    if (list != null && list.Count > 0)
                    {
                        return list;
                    }
                }
            }
            catch { }

            List<CategoryPreset> defaults = GetDefaultPresets();
            SavePresets(defaults);
            return defaults;
        }

        public static void SavePresets(List<CategoryPreset> presets)
        {
            try
            {
                string dir = Path.GetDirectoryName(ConfigFilePath);
                if (!Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }

                string json = JsonConvert.SerializeObject(presets, Formatting.Indented);
                File.WriteAllText(ConfigFilePath, json);
            }
            catch { }
        }

        public static void AddOrUpdatePreset(CategoryPreset preset)
        {
            if (preset == null || string.IsNullOrWhiteSpace(preset.Name)) return;

            List<CategoryPreset> presets = LoadPresets();
            CategoryPreset existing = presets.FirstOrDefault(p => p.Id == preset.Id);

            if (existing != null)
            {
                existing.Name = preset.Name;
                existing.Suffix = preset.Suffix;
                existing.Folders = preset.Folders != null ? new List<string>(preset.Folders) : new List<string>();
            }
            else
            {
                if (string.IsNullOrWhiteSpace(preset.Id))
                {
                    preset.Id = "preset_" + Guid.NewGuid().ToString("N").Substring(0, 8);
                }
                presets.Add(preset);
            }

            SavePresets(presets);
        }

        public static void DeletePreset(string presetId)
        {
            if (string.IsNullOrWhiteSpace(presetId)) return;

            List<CategoryPreset> presets = LoadPresets();
            presets.RemoveAll(p => p.Id == presetId);
            SavePresets(presets);
        }

        public static List<CategoryPreset> ResetToDefaults()
        {
            List<CategoryPreset> defaults = GetDefaultPresets();
            SavePresets(defaults);
            return defaults;
        }
    }
}
