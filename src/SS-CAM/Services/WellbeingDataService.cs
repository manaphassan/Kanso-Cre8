using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using Newtonsoft.Json;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    public class WellbeingDayMetrics
    {
        public int TotalFocusMinutes { get; set; }
        public int CompletedSessions { get; set; }
        public int MindDropCount { get; set; }
    }

    public class WellbeingDataService
    {
        private readonly string _dataPath;

        public WellbeingDataService()
        {
            var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var dir = Path.Combine(localAppData, "SuamiSihat", "SS-CAM", "wellbeing");
            if (!Directory.Exists(dir))
            {
                Directory.CreateDirectory(dir);
            }
            _dataPath = Path.Combine(dir, "wellbeing_data.json");
        }

        public string ProtectText(string plainText)
        {
            if (string.IsNullOrEmpty(plainText)) return string.Empty;
            var plainBytes = Encoding.UTF8.GetBytes(plainText);
            var encryptedBytes = ProtectedData.Protect(plainBytes, null, DataProtectionScope.CurrentUser);
            return Convert.ToBase64String(encryptedBytes);
        }

        public string UnprotectText(string encryptedBase64)
        {
            if (string.IsNullOrEmpty(encryptedBase64)) return string.Empty;
            try
            {
                var encryptedBytes = Convert.FromBase64String(encryptedBase64);
                var plainBytes = ProtectedData.Unprotect(encryptedBytes, null, DataProtectionScope.CurrentUser);
                return Encoding.UTF8.GetString(plainBytes);
            }
            catch
            {
                return string.Empty;
            }
        }

        public WellbeingData GetWellbeingData()
        {
            if (!File.Exists(_dataPath))
            {
                var newData = new WellbeingData();
                SaveWellbeingData(newData);
                return newData;
            }

            try
            {
                var json = File.ReadAllText(_dataPath, Encoding.UTF8);
                var data = JsonConvert.DeserializeObject<WellbeingData>(json) ?? new WellbeingData();

                if (data.FocusSessions == null) data.FocusSessions = new List<FocusSession>();
                if (data.CheckIns == null) data.CheckIns = new List<CheckIn>();
                if (data.ResetSessions == null) data.ResetSessions = new List<ResetSession>();
                if (data.MindDrops == null) data.MindDrops = new List<MindDrop>();
                if (data.Preferences == null) data.Preferences = new WellbeingPreferences();

                var todayStr = DateTime.Now.ToString("yyyy-MM-dd");
                var retainedDrops = data.MindDrops.Where(drop =>
                {
                    if (drop.RetentionMode == "Session") return false;
                    if (drop.RetentionMode == "EndOfDay")
                    {
                        DateTime dropDate;
                        if (DateTime.TryParse(drop.CreatedAt, out dropDate))
                        {
                            return dropDate.ToString("yyyy-MM-dd") == todayStr;
                        }
                        return false;
                    }
                    return true;
                }).ToList();

                data.MindDrops = retainedDrops;
                return data;
            }
            catch
            {
                return new WellbeingData();
            }
        }

        public void SaveWellbeingData(WellbeingData data)
        {
            var json = JsonConvert.SerializeObject(data, Formatting.Indented);
            File.WriteAllText(_dataPath, json, Encoding.UTF8);
        }

        public void SaveMindDrop(string plainText, string retentionMode)
        {
            WellbeingData data = GetWellbeingData();
            data.MindDrops.Add(new MindDrop
            {
                Id = Guid.NewGuid().ToString("N"),
                CreatedAt = DateTime.Now.ToString("o"),
                ContentBase64 = ProtectText(plainText),
                RetentionMode = retentionMode
            });
            SaveWellbeingData(data);
        }

        public void SaveCheckIn(WellbeingCheckIn checkin)
        {
            WellbeingData data = GetWellbeingData();
            data.CheckIns.Add(new CheckIn
            {
                Timestamp = checkin.Timestamp.ToString("o"),
                EnergyScore = checkin.EnergyLevel,
                MoodScore = checkin.MoodLevel,
                PressureScore = checkin.PressureLevel
            });
            SaveWellbeingData(data);
        }

        public WellbeingDayMetrics GetMetricsForDay(DateTime day)
        {
            WellbeingData data = GetWellbeingData();
            string targetDateStr = day.ToString("yyyy-MM-dd");

            int totalMinutes = 0;
            int completed = 0;
            foreach (var session in data.FocusSessions)
            {
                DateTime st;
                if (DateTime.TryParse(session.StartTime, out st) && st.ToString("yyyy-MM-dd") == targetDateStr)
                {
                    if (session.Completed)
                    {
                        completed++;
                        int mins = session.DurationMinutes > 0 ? session.DurationMinutes : (session.ActualSeconds / 60);
                        totalMinutes += Math.Max(1, mins);
                    }
                    else if (session.ActualSeconds >= 30)
                    {
                        totalMinutes += Math.Max(1, session.ActualSeconds / 60);
                    }
                }
            }

            int dropsCount = data.MindDrops.Count(d =>
            {
                DateTime dt;
                return DateTime.TryParse(d.CreatedAt, out dt) && dt.ToString("yyyy-MM-dd") == targetDateStr;
            });

            return new WellbeingDayMetrics
            {
                TotalFocusMinutes = totalMinutes,
                CompletedSessions = completed,
                MindDropCount = dropsCount
            };
        }
    }
}
