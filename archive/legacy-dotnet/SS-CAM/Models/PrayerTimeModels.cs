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

    /// <summary>Islamic calendar event with date & countdown.</summary>
    public class IslamicEvent
    {
        public string Name          { get; set; }
        public string HijriDateStr  { get; set; }
        public string GregorianDate { get; set; }
        public int    DaysRemaining { get; set; }
        public string Category      { get; set; }  // Perayaan, Ibadah, Sejarah
        public bool   IsHoliday     { get; set; }
    }

    /// <summary>Daily Hadith entry with translation and source citation.</summary>
    public class HadithEntry
    {
        public int    Id               { get; set; }
        public string Title            { get; set; }
        public string ArabicText       { get; set; }
        public string MalayTranslation { get; set; }
        public string Source           { get; set; }  // e.g., Sahih al-Bukhari #1
        public string Theme            { get; set; }  // e.g., Niat, Masa, Work Ethics
    }

    /// <summary>Sun path solar progress and atmospheric theme parameters.</summary>
    public class SunPhaseInfo
    {
        public string PhaseName          { get; set; }  // Dawn, Sunrise, Morning, Noon, Afternoon, Sunset, Night
        public double SunProgressRatio   { get; set; }  // 0.0 to 1.0 along arc
        public string GradientStartColor { get; set; }  // Hex color
        public string GradientEndColor   { get; set; }  // Hex color
        public string IconGlyph          { get; set; }  // Segoe Fluent Icon glyph
    }
}
