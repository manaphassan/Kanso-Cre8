using System;
using System.Collections.Generic;

namespace SS_CAM.Models
{
    public class ProjectStatusItem
    {
        public string Project { get; set; }       // folder name
        public string FullPath { get; set; }
        public string Status { get; set; }        // backlog|in-progress|review|done|on-hold
        public string Designer { get; set; }
        public string Client { get; set; }
        public string Deadline { get; set; }
        public string CreatedDate { get; set; }   // YYYY-MM-DD
        public string Priority { get; set; }      // low|medium|high|urgent
        public int Revision { get; set; }
        public List<string> Tags { get; set; }
        public bool HasFrontmatter { get; set; }

        public string Duration { get; set; }

        public System.Windows.Visibility DurationVisibility
        {
            get
            {
                return string.IsNullOrWhiteSpace(Duration) ? System.Windows.Visibility.Collapsed : System.Windows.Visibility.Visible;
            }
        }

        public ProjectStatusItem()
        {
            Status = "backlog";
            Priority = "medium";
            Revision = 0;
            Tags = new List<string>();
            HasFrontmatter = false;
            CreatedDate = "";
            Duration = "";
        }

        public DateTime ParsedCreatedDate
        {
            get
            {
                if (!string.IsNullOrWhiteSpace(CreatedDate))
                {
                    DateTime dt;
                    if (DateTime.TryParse(CreatedDate, out dt)) return dt;
                }
                return DateTime.Today;
            }
        }

        public int AgeInDays
        {
            get
            {
                DateTime start = ParsedCreatedDate;
                int days = (int)(DateTime.Today - start.Date).TotalDays;
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
                return string.Format("{0}d in queue", age);
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
                DateTime dt;
                if (DateTime.TryParse(CreatedDate, out dt))
                    return dt.ToString("yyyy-MM-dd");
                return CreatedDate;
            }
        }

        public string StatusDisplay
        {
            get
            {
                if (Status == "in-progress") return "In Progress";
                if (Status == "on-hold") return "On Hold";
                if (string.IsNullOrWhiteSpace(Status)) return "Untracked";
                string s = Status;
                return char.ToUpper(s[0]) + s.Substring(1);
            }
        }

        public string StatusBadgeColor
        {
            get
            {
                if (Status == "done") return "#10B981";
                if (Status == "review") return "#F59E0B";
                if (Status == "in-progress") return "#0078D4";
                if (Status == "on-hold") return "#64748B";
                return "#8B5CF6";
            }
        }

        public string PriorityColor
        {
            get
            {
                if (Priority == "urgent") return "#EF4444";
                if (Priority == "high") return "#F59E0B";
                if (Priority == "medium") return "#21A1F7";
                return "#64748B";
            }
        }

        public string DeadlineDisplay
        {
            get
            {
                if (string.IsNullOrWhiteSpace(Deadline)) return "";
                DateTime dt;
                if (DateTime.TryParse(Deadline, out dt))
                {
                    int days = (int)(dt - DateTime.Today).TotalDays;
                    if (days < 0) return string.Format("Overdue {0}d", Math.Abs(days));
                    if (days == 0) return "Due Today";
                    return string.Format("Due in {0}d", days);
                }
                return Deadline;
            }
        }

        public bool IsOverdue
        {
            get
            {
                if (string.IsNullOrWhiteSpace(Deadline)) return false;
                DateTime dt;
                if (DateTime.TryParse(Deadline, out dt))
                {
                    return (dt - DateTime.Today).TotalDays < 0;
                }
                return false;
            }
        }

        public string DeadlineBadgeBackground
        {
            get
            {
                if (IsOverdue) return "#EF4444"; // Solid Red
                if (string.IsNullOrWhiteSpace(Deadline)) return "Transparent";
                return "Transparent";
            }
        }

        public string DeadlineBadgeForeground
        {
            get
            {
                if (IsOverdue) return "#FFFFFF"; // White text on Red
                return DeadlineColor;
            }
        }

        public string DeadlineColor
        {
            get
            {
                if (string.IsNullOrWhiteSpace(Deadline)) return "#64748B";
                DateTime dt;
                if (DateTime.TryParse(Deadline, out dt))
                {
                    int days = (int)(dt - DateTime.Today).TotalDays;
                    if (days < 0) return "#EF4444";
                    if (days <= 3) return "#F59E0B";
                    return "#10B981";
                }
                return "#64748B";
            }
        }

        public string DesignerColor
        {
            get
            {
                if (string.IsNullOrWhiteSpace(Designer)) return "#0078D4";
                int hash = Math.Abs(Designer.GetHashCode());
                string[] palette = new[] { "#0078D4", "#106EBE", "#043388", "#21A1F7", "#059669", "#D97706", "#7C3AED" };
                return palette[hash % palette.Length];
            }
        }

        public string DesignerInitials
        {
            get
            {
                if (string.IsNullOrWhiteSpace(Designer)) return "S";
                string d = Designer.Trim();
                if (d.Length <= 2) return d.ToUpper();
                string[] parts = d.Split(new[] { ' ', '_', '-' }, StringSplitOptions.RemoveEmptyEntries);
                if (parts.Length >= 2) return (parts[0][0].ToString() + parts[1][0].ToString()).ToUpper();
                return d.Substring(0, 1).ToUpper();
            }
        }
    }
}
