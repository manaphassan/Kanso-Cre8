using System;
using System.Collections.Generic;

namespace SS_CAM.Linux.Models
{
    public class ProjectStatusItem
    {
        public string Project { get; set; } = "";
        public string FullPath { get; set; } = "";
        public string Status { get; set; } = "backlog"; // backlog|in-progress|review|done|on-hold
        public string Designer { get; set; } = "";
        public string Client { get; set; } = "";
        public string Deadline { get; set; } = "";
        public string CreatedDate { get; set; } = "";   // YYYY-MM-DD
        public string Priority { get; set; } = "medium"; // low|medium|high|urgent
        public int Revision { get; set; } = 0;
        public List<string> Tags { get; set; } = new List<string>();
        public bool HasFrontmatter { get; set; } = false;
        public string Duration { get; set; } = "";
        public string NotesBody { get; set; } = "";

        public DateTime ParsedCreatedDate
        {
            get
            {
                if (!string.IsNullOrWhiteSpace(CreatedDate) && DateTime.TryParse(CreatedDate, out var dt))
                    return dt;
                return DateTime.Today;
            }
        }

        public int AgeInDays
        {
            get
            {
                var days = (int)(DateTime.Today - ParsedCreatedDate.Date).TotalDays;
                return days >= 0 ? days : 0;
            }
        }

        public string AgeDisplay
        {
            get
            {
                int age = AgeInDays;
                if (age == 0) return "Started today";
                if (age == 1) return "1d in queue";
                return $"{age}d in queue";
            }
        }

        public string AgeBadgeColor
        {
            get
            {
                int age = AgeInDays;
                if (age > 60) return "#EF4444";
                if (age > 30) return "#F59E0B";
                return "#64748B";
            }
        }

        public string CreatedDateDisplay
        {
            get
            {
                if (string.IsNullOrWhiteSpace(CreatedDate)) return "N/A";
                if (DateTime.TryParse(CreatedDate, out var dt))
                    return dt.ToString("yyyy-MM-dd");
                return CreatedDate;
            }
        }

        public string StatusDisplay
        {
            get
            {
                switch (Status?.ToLowerInvariant())
                {
                    case "in-progress": return "In Progress";
                    case "review": return "In Review";
                    case "done": return "Completed";
                    case "on-hold": return "On Hold";
                    default: return "Backlog";
                }
            }
        }

        public string PriorityColor
        {
            get
            {
                switch (Priority?.ToLowerInvariant())
                {
                    case "urgent": return "#EF4444";
                    case "high": return "#F97316";
                    case "medium": return "#3B82F6";
                    case "low": return "#10B981";
                    default: return "#64748B";
                }
            }
        }

        public bool IsCompletedStatus
        {
            get
            {
                string s = (Status ?? "").ToLowerInvariant().Trim();
                return s == "done" || s == "approved" || s == "completed";
            }
        }

        public string DeadlineDisplay
        {
            get
            {
                if (string.IsNullOrWhiteSpace(Deadline)) return "No deadline";
                string cleanDeadline = (Deadline ?? "").Trim().Trim('"', '\'');
                if (string.IsNullOrWhiteSpace(cleanDeadline)) return "No deadline";

                if (IsCompletedStatus)
                {
                    if (DateTime.TryParse(cleanDeadline, out var dtComp))
                    {
                        return dtComp.ToString("yyyy-MM-dd");
                    }
                    return cleanDeadline;
                }

                if (DateTime.TryParse(cleanDeadline, out var dt))
                {
                    int daysLeft = (int)(dt.Date - DateTime.Today).TotalDays;
                    if (daysLeft < 0) return $"Overdue ({-daysLeft}d)";
                    if (daysLeft == 0) return "Due Today";
                    if (daysLeft == 1) return "Due Tomorrow";
                    return $"Due in {daysLeft}d ({dt:dd MMM})";
                }
                return cleanDeadline;
            }
        }

        public string DeadlineBadgeBackground
        {
            get
            {
                if (IsCompletedStatus) return "Transparent";
                if (string.IsNullOrWhiteSpace(Deadline)) return "#1E293B";
                string cleanDeadline = (Deadline ?? "").Trim().Trim('"', '\'');
                if (DateTime.TryParse(cleanDeadline, out var dt))
                {
                    int daysLeft = (int)(dt.Date - DateTime.Today).TotalDays;
                    if (daysLeft < 0) return "#450A0A";
                    if (daysLeft <= 2) return "#451A03";
                    return "#064E3B";
                }
                return "#1E293B";
            }
        }

        public string DeadlineBadgeForeground
        {
            get
            {
                if (IsCompletedStatus) return "#10B981";
                if (string.IsNullOrWhiteSpace(Deadline)) return "#94A3B8";
                string cleanDeadline = (Deadline ?? "").Trim().Trim('"', '\'');
                if (DateTime.TryParse(cleanDeadline, out var dt))
                {
                    int daysLeft = (int)(dt.Date - DateTime.Today).TotalDays;
                    if (daysLeft < 0) return "#F87171";
                    if (daysLeft <= 2) return "#FDBA74";
                    return "#6EE7B7";
                }
                return "#94A3B8";
            }
        }
    }
}
