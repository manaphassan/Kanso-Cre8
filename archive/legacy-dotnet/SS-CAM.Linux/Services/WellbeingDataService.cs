using System;
using System.IO;
using Newtonsoft.Json;

namespace SS_CAM.Linux.Services
{
    public class WellbeingDataService
    {
        private static readonly string DataFile = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".config", "ss-cam", "wellbeing_stats.json");

        public class WellbeingState
        {
            public int HydrationGlasses { get; set; } = 4;
            public int DailyHydrationGoal { get; set; } = 8;
            public int CompletedBreathingCycles { get; set; } = 3;
            public int StandBreaksTaken { get; set; } = 2;
            public string LastLoggedDate { get; set; } = DateTime.Today.ToString("yyyy-MM-dd");
        }

        public static WellbeingState LoadState()
        {
            try
            {
                if (File.Exists(DataFile))
                {
                    string json = File.ReadAllText(DataFile);
                    var state = JsonConvert.DeserializeObject<WellbeingState>(json);
                    if (state != null)
                    {
                        // Reset if a new day
                        if (state.LastLoggedDate != DateTime.Today.ToString("yyyy-MM-dd"))
                        {
                            state.HydrationGlasses = 0;
                            state.CompletedBreathingCycles = 0;
                            state.StandBreaksTaken = 0;
                            state.LastLoggedDate = DateTime.Today.ToString("yyyy-MM-dd");
                            SaveState(state);
                        }
                        return state;
                    }
                }
            }
            catch { }

            return new WellbeingState();
        }

        public static void SaveState(WellbeingState state)
        {
            try
            {
                string dir = Path.GetDirectoryName(DataFile)!;
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                string json = JsonConvert.SerializeObject(state, Formatting.Indented);
                File.WriteAllText(DataFile, json);
            }
            catch { }
        }
    }
}
