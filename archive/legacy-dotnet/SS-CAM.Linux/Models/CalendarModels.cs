using System.Collections.Generic;

namespace SS_CAM.Linux.Models
{
    public class CalendarDay
    {
        public int DayNumber { get; set; }
        public bool IsToday { get; set; } = false;
        public bool IsCurrentMonth { get; set; } = true;
        public bool HasHoliday { get; set; } = false;
        public string HolidayName { get; set; } = "";
        public string CellBg => IsToday ? "#1E3A8A" : HasHoliday ? "#451A03" : IsCurrentMonth ? "#0F172A" : "#080E1B";
        public string DayFg => IsToday ? "#38BDF8" : HasHoliday ? "#FDE68A" : IsCurrentMonth ? "#F8FAFC" : "#475569";
    }

    public class CalendarWeekRow
    {
        public List<CalendarDay> Days { get; set; } = new List<CalendarDay>();
    }
}
