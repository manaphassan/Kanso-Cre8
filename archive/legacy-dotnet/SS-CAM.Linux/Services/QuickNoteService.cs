using System;
using System.Collections.Generic;
using System.IO;
using Newtonsoft.Json;
using SS_CAM.Linux.Models;

namespace SS_CAM.Linux.Services
{
    public static class QuickNoteService
    {
        private static readonly string NotesFilePath = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".config", "ss-cam", "quick_notes.json");

        public static List<QuickNoteItem> LoadNotes()
        {
            try
            {
                if (File.Exists(NotesFilePath))
                {
                    string json = File.ReadAllText(NotesFilePath);
                    var list = JsonConvert.DeserializeObject<List<QuickNoteItem>>(json);
                    if (list != null && list.Count > 0) return list;
                }
            }
            catch { }

            return new List<QuickNoteItem>
            {
                new()
                {
                    Title = "Campaign Deliverable Checklist",
                    Category = "Deliverables",
                    Content = "# Campaign Deliverables Checklist\n- [x] 1:1 Social Square renders (1080x1080)\n- [x] 9:16 Reels video assets (1080x1920)\n- [ ] Export package zipped for client\n- [ ] Synology Drive synced to NAS"
                },
                new()
                {
                    Title = "Brand Color Tokens SSoT",
                    Category = "Brand Assets",
                    Content = "# SuamiSihat Core Brand Tokens\n- SSH Navy: #022057\n- SS Azure: #21A1F7\n- Warm Gold: #BD9A73\n- Care Emerald: #107C10"
                }
            };
        }

        public static void SaveNotes(List<QuickNoteItem> notes)
        {
            try
            {
                string dir = Path.GetDirectoryName(NotesFilePath)!;
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                string json = JsonConvert.SerializeObject(notes ?? new List<QuickNoteItem>(), Formatting.Indented);
                File.WriteAllText(NotesFilePath, json);
            }
            catch { }
        }
    }
}
