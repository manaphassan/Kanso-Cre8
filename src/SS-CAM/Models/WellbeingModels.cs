using System;
using System.Collections.Generic;

namespace SS_CAM.Models
{
    public class WellbeingData
    {
        public int SchemaVersion { get; set; }
        public List<FocusSession> FocusSessions { get; set; }
        public List<CheckIn> CheckIns { get; set; }
        public List<ResetSession> ResetSessions { get; set; }
        public List<MindDrop> MindDrops { get; set; }
        public ActiveSessionState ActiveSessionState { get; set; }
        public WellbeingPreferences Preferences { get; set; }

        public WellbeingData()
        {
            SchemaVersion = 1;
            FocusSessions = new List<FocusSession>();
            CheckIns = new List<CheckIn>();
            ResetSessions = new List<ResetSession>();
            MindDrops = new List<MindDrop>();
            Preferences = new WellbeingPreferences();
        }
    }

    public class FocusSession
    {
        public string Id { get; set; }
        public string StartTime { get; set; }
        public string EndTime { get; set; }
        public int DurationMinutes { get; set; }
        public string PresetName { get; set; }
        public bool Completed { get; set; }
    }

    public class CheckIn
    {
        public string Timestamp { get; set; }
        public string EnergyLevel { get; set; }
        public string FatigueReason { get; set; }
        public bool RecommendedReset { get; set; }
        public string ActionTaken { get; set; }
    }

    public class ResetSession
    {
        public string Id { get; set; }
        public string StartTime { get; set; }
        public string EndTime { get; set; }
        public int DurationMinutes { get; set; }
        public bool Completed { get; set; }
    }

    public class MindDrop
    {
        public string Id { get; set; }
        public string CreatedAt { get; set; }
        public string ContentBase64 { get; set; } // Encrypted content
        public string RetentionMode { get; set; }
    }

    public class ActiveSessionState
    {
        public string SessionType { get; set; }
        public string StartTime { get; set; }
        public int DurationMinutes { get; set; }
    }

    public class WellbeingPreferences
    {
        public string DefaultFocusPreset { get; set; }
        public int DefaultCustomFocusDuration { get; set; }
        public int DefaultResetDuration { get; set; }
        public bool CheckInsEnabled { get; set; }
        public bool HistoryEnabled { get; set; }
        public string WorkdayEndTime { get; set; }
        public bool FatigueRemindersEnabled { get; set; }
        public string MindDropRetention { get; set; }

        public WellbeingPreferences()
        {
            DefaultFocusPreset = "Standard Focus";
            DefaultCustomFocusDuration = 25;
            DefaultResetDuration = 5;
            CheckInsEnabled = true;
            HistoryEnabled = true;
            WorkdayEndTime = "17:00";
            FatigueRemindersEnabled = true;
            MindDropRetention = "EndOfDay";
        }
    }
}
