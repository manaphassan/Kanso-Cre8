using System;
using System.Diagnostics;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;

namespace SS_CAM.Linux.Services;

/// <summary>
/// Fetches prayer times from the waktusolat.app API (JAKIM-based e-Solat data).
/// Zone: WLY01 = Kuala Lumpur / Putrajaya
/// </summary>
public class PrayerTimeService
{
    private static readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(8) };

    public record SolatEntry(string Name, string TimeStr, DateTime Time);

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

    /// <summary>Fetch today's prayer times for the given zone (default WLY01).</summary>
    public async Task<WaktuSolatResponse?> FetchTodayAsync(string zone = "WLY01")
    {
        try
        {
            string today = DateTime.Now.ToString("yyyy-MM-dd");
            string url   = $"https://api.waktusolat.app/v2/solat/{zone}?startdate={today}&enddate={today}";
            var result = await _http.GetFromJsonAsync<WaktuSolatResponse[]>(url);
            return result?.Length > 0 ? result[0] : null;
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[PrayerTimeService] FetchTodayAsync error: {ex.Message}");
            return null;
        }
    }

    /// <summary>Returns the next prayer entry relative to now.</summary>
    public SolatEntry? GetNextPrayer(WaktuSolatResponse times)
    {
        try
        {
            var now = DateTime.Now;
            var today = now.Date;
            var schedule = new[]
            {
                new SolatEntry("Subuh",   times.Subuh   ?? "--:--", ParseTime(today, times.Subuh)),
                new SolatEntry("Zohor",   times.Zohor   ?? "--:--", ParseTime(today, times.Zohor)),
                new SolatEntry("Asar",    times.Asar    ?? "--:--", ParseTime(today, times.Asar)),
                new SolatEntry("Maghrib", times.Maghrib ?? "--:--", ParseTime(today, times.Maghrib)),
                new SolatEntry("Isyak",   times.Isyak   ?? "--:--", ParseTime(today, times.Isyak)),
            };

            foreach (var entry in schedule)
                if (entry.Time > now) return entry;

            // All done for today — return Subuh tomorrow
            return new SolatEntry("Subuh (esok)", times.Subuh ?? "--:--", ParseTime(today.AddDays(1), times.Subuh));
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[PrayerTimeService] GetNextPrayer error: {ex.Message}");
            return null;
        }
    }

    /// <summary>Returns formatted Hijri date string (approximate).</summary>
    public string GetHijriDate()
    {
        try
        {
            var cal = new System.Globalization.HijriCalendar();
            var now = DateTime.Now;
            int day   = cal.GetDayOfMonth(now);
            int month = cal.GetMonth(now);
            int year  = cal.GetYear(now);
            string[] monthNames = { "", "Muharram", "Safar", "Rabiulawal", "Rabiulakhir",
                                       "Jamadilawal", "Jamadilakhir", "Rejab", "Syaaban",
                                       "Ramadan", "Syawal", "Zulkaedah", "Zulhijjah" };
            return $"{day} {monthNames[month]} {year}H";
        }
        catch
        {
            return "Hijri date unavailable";
        }
    }

    private static DateTime ParseTime(DateTime date, string? timeStr)
    {
        if (string.IsNullOrEmpty(timeStr)) return date.AddDays(1);
        if (DateTime.TryParseExact($"{date:yyyy-MM-dd} {timeStr}",
                                   "yyyy-MM-dd HH:mm",
                                   null,
                                   System.Globalization.DateTimeStyles.None,
                                   out var result))
            return result;
        return date.AddDays(1);
    }
}
