using System;
using System.Collections.Generic;

namespace SS_CAM.Linux.Models;

public class ProjectStatusItem
{
    public string Project { get; set; } = string.Empty;
    public string FullPath { get; set; } = string.Empty;
    public string Status { get; set; } = "backlog"; // backlog, in_progress, review, done
    public string Designer { get; set; } = string.Empty;
    public string Client { get; set; } = string.Empty;
    public string Deadline { get; set; } = string.Empty;
    public string CreatedDate { get; set; } = string.Empty;
    public string Priority { get; set; } = "medium"; // low, medium, high, urgent
    public string Duration { get; set; } = string.Empty;
    public int Revision { get; set; } = 0;
    public List<string> Tags { get; set; } = new();
    public bool HasFrontmatter { get; set; } = false;
    public string NotesBody { get; set; } = string.Empty;

    public string StatusBadgeColor => Status.ToLowerInvariant() switch
    {
        "done" => "#10B981",
        "review" => "#F59E0B",
        "in_progress" => "#3B82F6",
        _ => "#6B7280"
    };

    public string PriorityBadgeColor => Priority.ToLowerInvariant() switch
    {
        "urgent" => "#EF4444",
        "high" => "#F97316",
        "medium" => "#3B82F6",
        _ => "#6B7280"
    };
}
