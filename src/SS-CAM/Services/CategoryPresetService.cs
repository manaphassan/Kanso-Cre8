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
                    SlaDays = 3,
                    SlotWeight = 1.0,
                    Folders = new List<string> { "01_BRIEF_ASSETS", "02_SOURCE_FILES", "03_COPYWRITING", "04_WORK_IN_PROGRESS", "05_DELIVERABLES" }
                },
                new CategoryPreset
                {
                    Id = "preset_social",
                    Name = "Social Media Content",
                    Suffix = "S",
                    IsDefault = true,
                    SlaDays = 2,
                    SlotWeight = 0.7,
                    Folders = new List<string> { "01_BRIEF_ASSETS", "02_SOURCE_FILES", "03_COPYWRITING", "04_WORK_IN_PROGRESS", "05_DELIVERABLES" }
                },
                new CategoryPreset
                {
                    Id = "preset_video",
                    Name = "Video Production",
                    Suffix = "V",
                    IsDefault = true,
                    SlaDays = 7,
                    SlotWeight = 2.0,
                    Folders = new List<string> { "01_BRIEF_ASSETS", "02_SOURCE_FILES", "03_COPYWRITING", "04_WORK_IN_PROGRESS", "05_DELIVERABLES" }
                },
                new CategoryPreset
                {
                    Id = "preset_brand",
                    Name = "Brand Identity",
                    Suffix = "P",
                    IsDefault = true,
                    SlaDays = 10,
                    SlotWeight = 2.5,
                    Folders = new List<string> { "01_BRIEF_ASSETS", "02_SOURCE_FILES", "03_COPYWRITING", "04_WORK_IN_PROGRESS", "05_DELIVERABLES" }
                },
                new CategoryPreset
                {
                    Id = "preset_ecommerce",
                    Name = "E-Commerce",
                    Suffix = "E",
                    IsDefault = true,
                    SlaDays = 3,
                    SlotWeight = 1.0,
                    Folders = new List<string> { "01_BRIEF_ASSETS", "02_SOURCE_FILES", "03_COPYWRITING", "04_WORK_IN_PROGRESS", "05_DELIVERABLES" }
                },
                new CategoryPreset
                {
                    Id = "preset_web",
                    Name = "Web Design",
                    Suffix = "W",
                    IsDefault = true,
                    SlaDays = 5,
                    SlotWeight = 1.5,
                    Folders = new List<string> { "01_BRIEF_ASSETS", "02_SOURCE_FILES", "03_COPYWRITING", "04_WORK_IN_PROGRESS", "05_DELIVERABLES" }
                }
            };
        }

        public static CategoryPreset GetPresetBySuffix(string suffix)
        {
            if (string.IsNullOrWhiteSpace(suffix)) return null;
            List<CategoryPreset> presets = LoadPresets();
            return presets.FirstOrDefault(p => string.Equals(p.Suffix, suffix.Trim(), StringComparison.OrdinalIgnoreCase));
        }

        public static DateTime CalculateTargetDeadline(CategoryPreset preset, DateTime? startDate = null)
        {
            DateTime start = startDate ?? DateTime.Today;
            int days = (preset != null && preset.SlaDays > 0) ? preset.SlaDays : 3;
            return start.AddDays(days);
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
                try
                {
                    var profile = UserProfileService.LoadProfile();
                    if (profile != null && !string.IsNullOrWhiteSpace(profile.WorkspaceRoot))
                    {
                        NasConfigSyncService.SyncFromNasIfNewer(profile.WorkspaceRoot, "category_presets.json");
                    }
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[CategoryPresetService] LoadPresets NAS sync error: " + ex.Message); }

                if (File.Exists(ConfigFilePath))
                {
                    string json = File.ReadAllText(ConfigFilePath);
                    List<CategoryPreset> list = JsonConvert.DeserializeObject<List<CategoryPreset>>(json);
                    if (list != null && list.Count > 0)
                    {
                        // Ensure built-in defaults (e.g. preset_web) are merged if missing
                        List<CategoryPreset> defaults = GetDefaultPresets();
                        bool updated = false;
                        foreach (CategoryPreset def in defaults)
                        {
                            if (!list.Any(p => string.Equals(p.Id, def.Id, StringComparison.OrdinalIgnoreCase)))
                            {
                                list.Add(def);
                                updated = true;
                            }
                        }
                        if (updated) SavePresets(list);
                        return list;
                    }
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }

            List<CategoryPreset> defaultList = GetDefaultPresets();
            SavePresets(defaultList);
            return defaultList;
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

                try
                {
                    var profile = UserProfileService.LoadProfile();
                    if (profile != null && !string.IsNullOrWhiteSpace(profile.WorkspaceRoot))
                    {
                        NasConfigSyncService.SaveToNas(profile.WorkspaceRoot, "category_presets.json");
                    }
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[CategoryPresetService] SavePresets NAS sync error: " + ex.Message); }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
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
