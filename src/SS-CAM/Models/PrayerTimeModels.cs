using System;

namespace SS_CAM.Models
{
    /// <summary>Prayer times for a single day and zone.</summary>
    public class PrayerTimeEntry
    {
        public string Zone    { get; set; }
        public string Date    { get; set; }   // dd-MM-yyyy from API
        public string Day     { get; set; }   // e.g. ISNIN
        public string Hijri   { get; set; }   // e.g. 15 Safar 1448H

        public DateTime Imsak   { get; set; }
        public DateTime Subuh   { get; set; }   // Fajr
        public DateTime Syuruk  { get; set; }   // Sunrise
        public DateTime Zohor   { get; set; }   // Dhuhr
        public DateTime Asar    { get; set; }
        public DateTime Maghrib { get; set; }
        public DateTime Isyak   { get; set; }   // Isha
    }

    /// <summary>Computed state relative to the current time.</summary>
    public class PrayerState
    {
        public string   CurrentPrayer    { get; set; }
        public string   NextPrayer       { get; set; }
        public DateTime NextPrayerTime   { get; set; }
        public TimeSpan TimeRemaining    { get; set; }
        public double   ProgressPercent  { get; set; }  // 0-100
        public bool     IsPrayerTime     { get; set; }  // true ~30 s around adhan
        public string   CurrentPrayerKey { get; set; }  // exact name for row highlighting
    }

    /// <summary>Zone code + human-readable label.</summary>
    public class PrayerZoneInfo
    {
        public string Code { get; set; }
        public string Name { get; set; }
        public override string ToString() { return Name; }
    }
}
