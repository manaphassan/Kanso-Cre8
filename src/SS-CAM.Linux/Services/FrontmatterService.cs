using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using SS_CAM.Linux.Models;

namespace SS_CAM.Linux.Services;

public static class FrontmatterService
{
    private const string Delimiter = "---";

    public static ProjectStatusItem ReadStatus(string projectFolderPath)
    {
        var item = new ProjectStatusItem
        {
            Project = Path.GetFileName(projectFolderPath) ?? string.Empty,
            FullPath = projectFolderPath
        };

        string readmePath = Path.Combine(projectFolderPath, "README.md");
        if (!File.Exists(readmePath)) return item;

        try
        {
            string[] lines = File.ReadAllLines(readmePath, Encoding.UTF8);
            var fm = ParseFrontmatter(lines);
            if (fm != null)
            {
                item.HasFrontmatter = true;
                item.Status = GetValue(fm, "status", "backlog");
                item.Designer = GetValue(fm, "designer", string.Empty);
                item.Client = GetValue(fm, "client", string.Empty);
                item.Deadline = GetValue(fm, "deadline", string.Empty);
                item.CreatedDate = GetValue(fm, "created", string.Empty);
                item.Priority = GetValue(fm, "priority", "medium");
                item.Duration = GetValue(fm, "duration", string.Empty);
                item.Revision = int.TryParse(GetValue(fm, "revision", "0"), out int rev) ? rev : 0;
                item.Tags = ParseTags(GetValue(fm, "tags", string.Empty));
            }
            item.NotesBody = ExtractBody(lines);
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[FrontmatterService] ReadStatus error for '{projectFolderPath}': {ex.Message}");
        }

        return item;
    }

    public static void WriteStatus(ProjectStatusItem item)
    {
        string readmePath = Path.Combine(item.FullPath, "README.md");
        try
        {
            var sb = new StringBuilder();
            sb.AppendLine(Delimiter);
            sb.AppendLine($"status: {item.Status}");
            sb.AppendLine($"designer: {item.Designer}");
            sb.AppendLine($"client: {item.Client}");
            sb.AppendLine($"created: {item.CreatedDate}");
            sb.AppendLine($"deadline: {item.Deadline}");
            sb.AppendLine($"priority: {item.Priority}");
            sb.AppendLine($"duration: {item.Duration}");
            sb.AppendLine($"revision: {item.Revision}");
            sb.AppendLine($"tags: [{string.Join(", ", item.Tags)}]");
            sb.AppendLine(Delimiter);
            sb.AppendLine();

            if (!string.IsNullOrWhiteSpace(item.NotesBody))
            {
                sb.AppendLine(item.NotesBody);
            }
            else
            {
                sb.AppendLine($"# {item.Project}");
                sb.AppendLine();
                sb.AppendLine("## Brief & Assets");
                sb.AppendLine("- Source: `01_BRIEF_ASSETS`");
                sb.AppendLine("- Working files: `02_SOURCE_FILES`");
                sb.AppendLine("- Copywriting: `03_COPYWRITING/COPY.md`");
                sb.AppendLine("- Output: `05_DELIVERABLES`");
            }

            File.WriteAllText(readmePath, sb.ToString(), new UTF8Encoding(true));
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[FrontmatterService] WriteStatus error for '{item.FullPath}': {ex.Message}");
        }
    }

    private static Dictionary<string, string>? ParseFrontmatter(string[] lines)
    {
        if (lines.Length < 2 || lines[0].Trim() != Delimiter) return null;

        var fm = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        for (int i = 1; i < lines.Length; i++)
        {
            string line = lines[i].Trim();
            if (line == Delimiter) return fm;

            int colonIdx = line.IndexOf(':');
            if (colonIdx > 0)
            {
                string key = line.Substring(0, colonIdx).Trim();
                string val = line.Substring(colonIdx + 1).Trim();
                fm[key] = val;
            }
        }
        return fm;
    }

    private static string ExtractBody(string[] lines)
    {
        int secondDelimiter = -1;
        int count = 0;
        for (int i = 0; i < lines.Length; i++)
        {
            if (lines[i].Trim() == Delimiter)
            {
                count++;
                if (count == 2)
                {
                    secondDelimiter = i;
                    break;
                }
            }
        }

        if (secondDelimiter >= 0 && secondDelimiter + 1 < lines.Length)
        {
            var sb = new StringBuilder();
            for (int i = secondDelimiter + 1; i < lines.Length; i++)
            {
                sb.AppendLine(lines[i]);
            }
            return sb.ToString().Trim();
        }

        return string.Empty;
    }

    private static string GetValue(Dictionary<string, string> fm, string key, string def)
    {
        return fm.TryGetValue(key, out var val) && !string.IsNullOrWhiteSpace(val) ? val : def;
    }

    private static List<string> ParseTags(string raw)
    {
        var list = new List<string>();
        if (string.IsNullOrWhiteSpace(raw)) return list;
        string cleaned = raw.Trim('[', ']', ' ');
        foreach (var part in cleaned.Split(','))
        {
            string trimmed = part.Trim();
            if (!string.IsNullOrEmpty(trimmed)) list.Add(trimmed);
        }
        return list;
    }
}
