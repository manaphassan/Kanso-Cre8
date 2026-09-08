using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace SS_CAM.Linux.Services
{
    public class PrayerTimeRow
    {
        public string Name { get; set; } = "";
        public string Time { get; set; } = "";
        public string Description { get; set; } = "";
    }

    public class NextPrayerInfo
    {
        public string Name { get; set; } = "Zohor";
        public string Time { get; set; } = "13:18";
        public string Countdown { get; set; } = "2h 30m";
    }

    public static class PrayerTimeService
    {
        private static readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(8) };

        public class WaktuSolatResponse
        {
            [JsonPropertyName("status")]    public string? Status { get; set; }
            [JsonPropertyName("zone")]      public string? Zone   { get; set; }
            [JsonPropertyName("imsak")]     public string? Imsak  { get; set; }
            [JsonPropertyName("subuh")]     public string? Subuh  { get; set; }
            [JsonPropertyName("syuruk")]    public string? Syuruk { get; set; }
            [JsonPropertyName("dhuha")]     public string? Dhuha  { get; set; }
            [JsonPropertyName("zohor")]     public string? Zohor  { get; set; }
            [JsonPropertyName("asar")]      public string? Asar   { get; set; }
            [JsonPropertyName("maghrib")]   public string? Maghrib { get; set; }
            [JsonPropertyName("isyak")]     public string? Isyak  { get; set; }
        }

        public static async Task<List<PrayerTimeRow>> GetPrayerTimesAsync(string zone = "WLY01")
        {
            try
            {
                string today = DateTime.Now.ToString("yyyy-MM-dd");
                string url = $"https://api.waktusolat.app/v2/solat/{zone}?startdate={today}&enddate={today}";
                var result = await _http.GetFromJsonAsync<WaktuSolatResponse[]>(url);
                if (result != null && result.Length > 0)
                {
                    var r = result[0];
                    return new List<PrayerTimeRow>
                    {
                        new() { Name = "Imsak", Time = r.Imsak ?? "05:45", Description = "Waktu Imsak (10 minit sebelum Subuh)" },
                        new() { Name = "Subuh", Time = r.Subuh ?? "05:55", Description = "Solat Fardhu Subuh (Fajar / Dawn)" },
                        new() { Name = "Syuruk", Time = r.Syuruk ?? "07:08", Description = "Terbit Matahari (Sunrise)" },
                        new() { Name = "Dhuha", Time = r.Dhuha ?? "07:35", Description = "Solat Sunat Dhuha" },
                        new() { Name = "Zohor", Time = r.Zohor ?? "13:18", Description = "Solat Fardhu Zohor (Tengahari / Noon)" },
                        new() { Name = "Asar", Time = r.Asar ?? "16:25", Description = "Solat Fardhu Asar (Petang / Afternoon)" },
                        new() { Name = "Maghrib", Time = r.Maghrib ?? "19:22", Description = "Solat Fardhu Maghrib & Terbenam Matahari (Sunset)" },
                        new() { Name = "Isyak", Time = r.Isyak ?? "20:32", Description = "Solat Fardhu Isyak (Malam / Night)" }
                    };
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine($"[PrayerTimeService] API error: {ex.Message}");
            }

            // Default fallback times
            return new List<PrayerTimeRow>
            {
                new() { Name = "Imsak", Time = "05:45", Description = "Waktu Imsak (10 minit sebelum Subuh)" },
                new() { Name = "Subuh", Time = "05:55", Description = "Solat Fardhu Subuh (Fajar / Dawn)" },
                new() { Name = "Syuruk", Time = "07:08", Description = "Terbit Matahari (Sunrise)" },
                new() { Name = "Dhuha", Time = "07:35", Description = "Solat Sunat Dhuha" },
                new() { Name = "Zohor", Time = "13:18", Description = "Solat Fardhu Zohor (Tengahari / Noon)" },
                new() { Name = "Asar", Time = "16:25", Description = "Solat Fardhu Asar (Petang / Afternoon)" },
                new() { Name = "Maghrib", Time = "19:22", Description = "Solat Fardhu Maghrib & Terbenam Matahari (Sunset)" },
                new() { Name = "Isyak", Time = "20:32", Description = "Solat Fardhu Isyak (Malam / Night)" }
            };
        }

        public static NextPrayerInfo GetNextPrayer(List<PrayerTimeRow> rows)
        {
            var now = DateTime.Now;
            foreach (var r in rows)
            {
                if (r.Name == "Imsak" || r.Name == "Syuruk" || r.Name == "Dhuha") continue;
                if (DateTime.TryParse(r.Time, out var dt))
                {
                    var pTime = new DateTime(now.Year, now.Month, now.Day, dt.Hour, dt.Minute, 0);
                    if (pTime > now)
                    {
                        var diff = pTime - now;
                        return new NextPrayerInfo
                        {
                            Name = r.Name,
                            Time = r.Time,
                            Countdown = $"{diff.Hours}h {diff.Minutes}m"
                        };
                    }
                }
            }

            return new NextPrayerInfo
            {
                Name = "Subuh",
                Time = "05:55",
                Countdown = "Tomorrow morning"
            };
        }
    }
}
