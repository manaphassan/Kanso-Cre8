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
        public string Priority { get; set; }      // low|medium|high|urgent
        public int Revision { get; set; }
        public List<string> Tags { get; set; }
        public bool HasFrontmatter { get; set; }

        public ProjectStatusItem()
        {
            Status = "backlog";
            Priority = "medium";
            Revision = 0;
            Tags = new List<string>();
            HasFrontmatter = false;
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
    }
}
