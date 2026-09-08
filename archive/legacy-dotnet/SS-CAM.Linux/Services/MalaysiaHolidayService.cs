using System;
using System.Collections.Generic;

namespace SS_CAM.Linux.Services
{
    public class MalaysiaHolidayItem
    {
        public DateTime Date { get; set; }
        public string Name { get; set; } = "";
        public string ShortName { get; set; } = "";
        public bool IsNational { get; set; } = true;
        public string Description { get; set; } = "";
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
                var dt = new DateTime(year, month, day);
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
            catch { }
        }

        private static void InitializeHolidays()
        {
            // 2025
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

            // 2026
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
        }

        public static bool IsHoliday(DateTime date, out MalaysiaHolidayItem? holiday)
        {
            string key = date.ToString("yyyy-MM-dd");
            return Holidays.TryGetValue(key, out holiday);
        }

        public static List<MalaysiaHolidayItem> GetHolidaysForMonth(int year, int month)
        {
            var list = new List<MalaysiaHolidayItem>();
            foreach (var h in Holidays.Values)
            {
                if (h.Date.Year == year && h.Date.Month == month)
                {
                    list.Add(h);
                }
            }
            list.Sort((a, b) => a.Date.CompareTo(b.Date));
            return list;
        }

        public static DateTime CalculateWorkingDaysDeadline(DateTime start, int workingDays)
        {
            var current = start;
            int added = 0;
            while (added < workingDays)
            {
                current = current.AddDays(1);
                // Skip weekends (Saturday and Sunday)
                if (current.DayOfWeek == DayOfWeek.Saturday || current.DayOfWeek == DayOfWeek.Sunday)
                    continue;

                // Skip public holidays
                if (IsHoliday(current, out _))
                    continue;

                added++;
            }
            return current;
        }
    }
}
