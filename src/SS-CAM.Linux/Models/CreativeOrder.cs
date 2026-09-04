using System;

namespace SS_CAM.Linux.Models
{
    public class CreativeOrder
    {
        public string Id { get; set; } = "";
        public string Title { get; set; } = "";
        public string Entity { get; set; } = "SSH";
        public string Priority { get; set; } = "tier_1";
        public string Format { get; set; } = "1_1_feed";
        public string Copy { get; set; } = "";
        public string TargetDate { get; set; } = "";
        public string AttachmentNote { get; set; } = "";
        public string Requester { get; set; } = "Staff";
        public string RequesterRole { get; set; } = "";
        public string Status { get; set; } = "pending";
        public string SubmittedAt { get; set; } = "";
        public string UpdatedAt { get; set; } = "";
        public string? AssignedTo { get; set; } = null;
        public string? ProjectId { get; set; } = null;
        public string InternalNote { get; set; } = "";

        public string SafeTitle => string.IsNullOrWhiteSpace(Title) ? "Untitled Request" : Title.Trim();
        public string SafeEntity => string.IsNullOrWhiteSpace(Entity) ? "SSH" : Entity.Trim().ToUpperInvariant();

        public string EntityFullName => SafeEntity switch
        {
            "SSC" => "SuamiSihat Healthcare / Clinic",
            "SSH" => "SuamiSihat Holding",
            "SSE" => "SuamiSihat E-Commerce",
            "SSW" => "SuamiSihat Wellness",
            "SST" => "SuamiSihat Technology",
            _     => "SuamiSihat Brand"
        };

        public string EntityColor => SafeEntity switch
        {
            "SSC" => "#06B6D4",
            "SSH" => "#3B82F6",
            "SSE" => "#8B5CF6",
            "SSW" => "#10B981",
            "SST" => "#F97316",
            _     => "#2563EB"
        };

        public string PriorityBadge
        {
            get
            {
                string p = (Priority ?? "").ToLowerInvariant();
                if (p.Contains("3") || p.Contains("urgent")) return "P3";
                if (p.Contains("2") || p.Contains("fast") || p.Contains("high")) return "P2";
                return "P1";
            }
        }

        public string PriorityLabel => PriorityBadge switch
        {
            "P3" => "P3 (Urgent)",
            "P2" => "P2 (Fast-Track)",
            _    => "P1 (Standard)"
        };

        public string PriorityColor => PriorityBadge switch
        {
            "P3" => "#EF4444",
            "P2" => "#F59E0B",
            _    => "#10B981"
        };

        public string FormatLabel => (Format ?? "").ToLowerInvariant() switch
        {
            "9_16_video"     => "9:16 Video / Reels",
            "1_1_feed"       => "1:1 Feed Post",
            "16_9_landscape" => "16:9 Landscape HD",
            "print_posm"     => "Print / POSM Poster",
            "print_digital"  => "Digital Banner / Web",
            _ => string.IsNullOrWhiteSpace(Format) ? "Standard Asset" : Format.Replace('_', ' ')
        };

        public string StatusLabel => (Status ?? "").ToLowerInvariant() switch
        {
            "pending"      => "Pending Review",
            "in_progress"  => "In Progress",
            "for_approval" => "For Approval",
            "done" or "completed" => "Completed",
            "cancelled"    => "Cancelled",
            _ => Status ?? "Pending"
        };

        public string StatusColor => (Status ?? "").ToLowerInvariant() switch
        {
            "pending"      => "#F59E0B",
            "in_progress"  => "#3B82F6",
            "for_approval" => "#8B5CF6",
            "done" or "completed" => "#10B981",
            "cancelled"    => "#64748B",
            _ => "#94A3B8"
        };

        public bool IsConverted => !string.IsNullOrWhiteSpace(ProjectId);

        public string FormattedTargetDate
        {
            get
            {
                if (DateTime.TryParse(TargetDate, out var dt))
                    return dt.ToString("dd MMM yyyy (ddd)");
                return TargetDate ?? "No Deadline";
            }
        }

        public string CopySnippet
        {
            get
            {
                if (string.IsNullOrWhiteSpace(Copy)) return "No copy provided.";
                string clean = Copy.Replace('\r', ' ').Replace('\n', ' ').Trim();
                return clean.Length > 120 ? clean.Substring(0, 117) + "..." : clean;
            }
        }
    }
}
