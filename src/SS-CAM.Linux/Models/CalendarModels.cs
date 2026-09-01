namespace SS_CAM.Linux.Models;

public class CalendarDay
{
    public string DayNumber    { get; set; } = string.Empty;
    public string Badge        { get; set; } = string.Empty;
    public bool   IsToday      { get; set; }
    public bool   IsCurrentMonth { get; set; } = true;
    public string CellBg       => IsToday ? "#1E4D7B" : IsCurrentMonth ? "#0F172A" : "#080E1B";
    public string DayFg        => IsToday ? "#38BDF8" : IsCurrentMonth ? "#F8FAFC" : "#334155";
    public string DayFontWeight => IsToday ? "Bold" : "Normal";
}

public class CalendarWeekRow
{
    public CalendarDay Day0 { get; set; } = new();
    public CalendarDay Day1 { get; set; } = new();
    public CalendarDay Day2 { get; set; } = new();
    public CalendarDay Day3 { get; set; } = new();
    public CalendarDay Day4 { get; set; } = new();
    public CalendarDay Day5 { get; set; } = new();
    public CalendarDay Day6 { get; set; } = new();
}
