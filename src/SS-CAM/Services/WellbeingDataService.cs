using System;
using System.IO;
using System.Security.Cryptography;
using System.Text;
using Newtonsoft.Json;
using SS_CAM.Models;
using System.Linq;

namespace SS_CAM.Services
{
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
                // Log decryption failure, return empty
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

                // Expiry/Purge Logic for MindDrops
                var todayStr = DateTime.Now.ToString("yyyy-MM-dd");
                var retainedDrops = data.MindDrops.Where(drop => 
                {
                    if (drop.RetentionMode == "Session") return false; // Purged
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
                return new WellbeingData(); // Fallback on corruption
            }
        }

        public void SaveWellbeingData(WellbeingData data)
        {
            var json = JsonConvert.SerializeObject(data, Formatting.Indented);
            File.WriteAllText(_dataPath, json, Encoding.UTF8);
        }
    }
}
