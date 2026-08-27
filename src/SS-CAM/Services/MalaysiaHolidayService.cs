using System;
using System.Collections.Generic;

namespace SS_CAM.Services
{
    public class MalaysiaHolidayItem
    {
        public DateTime Date { get; set; }
        public string Name { get; set; }
        public string ShortName { get; set; }
        public bool IsNational { get; set; }
        public string Description { get; set; }
    }

    public static class MalaysiaHolidayService
    {
        private static readonly Dictionary<string, MalaysiaHolidayItem> Holidays = new Dictionary<string, MalaysiaHolidayItem>(StringComparer.OrdinalIgnoreCase);

        static MalaysiaHolidayService()
        {
            InitializeHolidays();
        }

        private static void AddHoliday(int year, int month, int day, string name, string shortName, bool isNational = true, string description = "")
        {
            try
            {
                DateTime dt = new DateTime(year, month, day);
                string key = dt.ToString("yyyy-MM-dd");
                Holidays[key] = new MalaysiaHolidayItem
                {
                    Date = dt,
                    Name = name,
                    ShortName = shortName,
                    IsNational = isNational,
                    Description = string.IsNullOrWhiteSpace(description) ? ("Official Malaysia Public Holiday: " + name) : description
                };
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[MalaysiaHolidayService] AddHoliday: " + ex.Message);
            }
        }

        private static void InitializeHolidays()
        {
            // ═════════════════════════════════════════════════════════════════════
            // 2025 MALAYSIA PUBLIC HOLIDAYS
            // ═════════════════════════════════════════════════════════════════════
            AddHoliday(2025, 1, 1, "New Year's Day", "New Year");
            AddHoliday(2025, 1, 29, "Chinese New Year (Day 1)", "CNY Day 1");
            AddHoliday(2025, 1, 30, "Chinese New Year (Day 2)", "CNY Day 2");
            AddHoliday(2025, 2, 1, "Federal Territory Day", "Hari Wilayah");
            AddHoliday(2025, 2, 11, "Thaipusam", "Thaipusam");
            AddHoliday(2025, 3, 18, "Nuzul Al-Quran", "Nuzul Quran");
            AddHoliday(2025, 3, 31, "Hari Raya Aidilfitri (Day 1)", "Raya Aidilfitri 1");
            AddHoliday(2025, 4, 1, "Hari Raya Aidilfitri (Day 2)", "Raya Aidilfitri 2");
            AddHoliday(2025, 5, 1, "Labour Day", "Hari Pekerja");
            AddHoliday(2025, 5, 12, "Wesak Day", "Hari Wesak");
            AddHoliday(2025, 6, 2, "Agong's Birthday", "Keputeraan Agong");
            AddHoliday(2025, 6, 7, "Hari Raya Haji / Aidiladha", "Raya Haji");
            AddHoliday(2025, 6, 27, "Awal Muharram (Maal Hijrah)", "Awal Muharram");
            AddHoliday(2025, 8, 31, "National Day / Merdeka", "Hari Kebangsaan");
            AddHoliday(2025, 9, 5, "Maulidur Rasul", "Maulidur Rasul");
            AddHoliday(2025, 9, 16, "Malaysia Day", "Hari Malaysia");
            AddHoliday(2025, 10, 20, "Deepavali", "Deepavali");
            AddHoliday(2025, 12, 25, "Christmas Day", "Hari Krismas");

            // ═════════════════════════════════════════════════════════════════════
            // 2026 MALAYSIA PUBLIC HOLIDAYS
            // ═════════════════════════════════════════════════════════════════════
            AddHoliday(2026, 1, 1, "New Year's Day", "New Year");
            AddHoliday(2026, 2, 1, "Federal Territory Day", "Hari Wilayah");
            AddHoliday(2026, 2, 1, "Thaipusam", "Thaipusam");
            AddHoliday(2026, 2, 17, "Chinese New Year (Day 1)", "CNY Day 1");
            AddHoliday(2026, 2, 18, "Chinese New Year (Day 2)", "CNY Day 2");
            AddHoliday(2026, 3, 7, "Nuzul Al-Quran", "Nuzul Quran");
            AddHoliday(2026, 3, 20, "Hari Raya Aidilfitri (Day 1)", "Raya Aidilfitri 1");
            AddHoliday(2026, 3, 21, "Hari Raya Aidilfitri (Day 2)", "Raya Aidilfitri 2");
            AddHoliday(2026, 5, 1, "Labour Day", "Hari Pekerja");
            AddHoliday(2026, 5, 27, "Hari Raya Haji / Aidiladha", "Raya Haji");
            AddHoliday(2026, 5, 31, "Wesak Day", "Hari Wesak");
            AddHoliday(2026, 6, 1, "Agong's Birthday", "Keputeraan Agong");
            AddHoliday(2026, 6, 17, "Awal Muharram (Maal Hijrah)", "Awal Muharram");
            AddHoliday(2026, 8, 26, "Maulidur Rasul", "Maulidur Rasul");
            AddHoliday(2026, 8, 31, "National Day / Merdeka", "Hari Kebangsaan");
            AddHoliday(2026, 9, 16, "Malaysia Day", "Hari Malaysia");
            AddHoliday(2026, 11, 8, "Deepavali", "Deepavali");
            AddHoliday(2026, 12, 25, "Christmas Day", "Hari Krismas");

            // ═════════════════════════════════════════════════════════════════════
            // 2027 MALAYSIA PUBLIC HOLIDAYS
            // ═════════════════════════════════════════════════════════════════════
            AddHoliday(2027, 1, 1, "New Year's Day", "New Year");
            AddHoliday(2027, 1, 21, "Thaipusam", "Thaipusam");
            AddHoliday(2027, 2, 1, "Federal Territory Day", "Hari Wilayah");
            AddHoliday(2027, 2, 6, "Chinese New Year (Day 1)", "CNY Day 1");
            AddHoliday(2027, 2, 7, "Chinese New Year (Day 2)", "CNY Day 2");
            AddHoliday(2027, 2, 24, "Nuzul Al-Quran", "Nuzul Quran");
            AddHoliday(2027, 3, 10, "Hari Raya Aidilfitri (Day 1)", "Raya Aidilfitri 1");
            AddHoliday(2027, 3, 11, "Hari Raya Aidilfitri (Day 2)", "Raya Aidilfitri 2");
            AddHoliday(2027, 5, 1, "Labour Day", "Hari Pekerja");
            AddHoliday(2027, 5, 16, "Hari Raya Haji / Aidiladha", "Raya Haji");
            AddHoliday(2027, 5, 20, "Wesak Day", "Hari Wesak");
            AddHoliday(2027, 6, 6, "Awal Muharram (Maal Hijrah)", "Awal Muharram");
            AddHoliday(2027, 6, 7, "Agong's Birthday", "Keputeraan Agong");
            AddHoliday(2027, 8, 16, "Maulidur Rasul", "Maulidur Rasul");
            AddHoliday(2027, 8, 31, "National Day / Merdeka", "Hari Kebangsaan");
            AddHoliday(2027, 9, 16, "Malaysia Day", "Hari Malaysia");
            AddHoliday(2027, 10, 29, "Deepavali", "Deepavali");
            AddHoliday(2027, 12, 25, "Christmas Day", "Hari Krismas");
        }

        public static MalaysiaHolidayItem GetHoliday(DateTime date)
        {
            string key = date.ToString("yyyy-MM-dd");
            MalaysiaHolidayItem item;
            if (Holidays.TryGetValue(key, out item))
            {
                return item;
            }
            return null;
        }

        public static bool IsHoliday(DateTime date)
        {
            return Holidays.ContainsKey(date.ToString("yyyy-MM-dd"));
        }

        public static List<MalaysiaHolidayItem> GetHolidaysForMonth(int year, int month)
        {
            List<MalaysiaHolidayItem> list = new List<MalaysiaHolidayItem>();
            int days = DateTime.DaysInMonth(year, month);
            for (int d = 1; d <= days; d++)
            {
                DateTime dt = new DateTime(year, month, d);
                MalaysiaHolidayItem h = GetHoliday(dt);
                if (h != null) list.Add(h);
            }
            return list;
        }
    }
}
