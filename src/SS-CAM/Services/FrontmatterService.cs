using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    /// <summary>
    /// Parses and writes YAML-style frontmatter blocks from/to project README.md files.
    /// Frontmatter is delimited by lines containing only "---".
    /// </summary>
    public static class FrontmatterService
    {
        private const string Delimiter = "---";

        /// <summary>
        /// Reads the README.md in the given project folder and returns a populated ProjectStatusItem.
        /// Returns an item with HasFrontmatter=false if no frontmatter is found.
        /// </summary>
        public static ProjectStatusItem ReadStatus(string projectFolderPath)
        {
            ProjectStatusItem item = new ProjectStatusItem
            {
                Project = Path.GetFileName(projectFolderPath),
                FullPath = projectFolderPath
            };

            string readmePath = Path.Combine(projectFolderPath, "README.md");
            if (!File.Exists(readmePath)) return item;

            try
            {
                string[] lines = File.ReadAllLines(readmePath, Encoding.UTF8);
                Dictionary<string, string> fm = ParseFrontmatter(lines);
                if (fm == null) return item;

                item.HasFrontmatter = true;
                item.Status = GetValue(fm, "status", "backlog");
                item.Designer = GetValue(fm, "designer", "");
                item.Client = GetValue(fm, "client", "");
                item.Deadline = GetValue(fm, "deadline", "");
                item.Priority = GetValue(fm, "priority", "medium");
                item.Revision = ParseInt(GetValue(fm, "revision", "0"));

                string tagsRaw = GetValue(fm, "tags", "");
                item.Tags = ParseTags(tagsRaw);
            }
            catch (Exception ex)
            {
                Debug.WriteLine(string.Format("[FrontmatterService] ReadStatus failed for '{0}': {1}", projectFolderPath, ex.Message));
            }

            return item;
        }

        /// <summary>
        /// Writes updated frontmatter fields back to the project's README.md.
        /// The body content below the frontmatter is preserved verbatim.
        /// </summary>
        public static void WriteStatus(ProjectStatusItem item)
        {
            if (item == null || string.IsNullOrWhiteSpace(item.FullPath)) return;
            string readmePath = Path.Combine(item.FullPath, "README.md");

            string body = "";
            if (File.Exists(readmePath))
            {
                string[] lines = File.ReadAllLines(readmePath, Encoding.UTF8);
                body = ExtractBody(lines);
            }

            StringBuilder sb = new StringBuilder();
            sb.AppendLine(Delimiter);
            sb.AppendLine(string.Format("status: {0}", item.Status ?? "backlog"));
            sb.AppendLine(string.Format("designer: {0}", item.Designer ?? ""));
            sb.AppendLine(string.Format("client: {0}", item.Client ?? ""));
            sb.AppendLine(string.Format("deadline: {0}", item.Deadline ?? ""));
            sb.AppendLine(string.Format("priority: {0}", item.Priority ?? "medium"));
            if (item.Tags != null && item.Tags.Count > 0)
                sb.AppendLine(string.Format("tags: [{0}]", string.Join(", ", item.Tags.ToArray())));
            else
                sb.AppendLine("tags: []");
            sb.AppendLine(string.Format("revision: {0}", item.Revision));
            sb.AppendLine(Delimiter);
            if (!string.IsNullOrWhiteSpace(body))
            {
                sb.AppendLine();
                sb.Append(body);
            }

            try { File.WriteAllText(readmePath, sb.ToString(), Encoding.UTF8); }
            catch (Exception ex)
            {
                Debug.WriteLine(string.Format("[FrontmatterService] WriteStatus failed for '{0}': {1}", item.FullPath, ex.Message));
            }
        }

        /// <summary>
        /// Generates the default frontmatter block for a new project.
        /// </summary>
        public static string BuildDefaultFrontmatter(string designerStaffId, string client)
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendLine(Delimiter);
            sb.AppendLine("status: backlog");
            sb.AppendLine(string.Format("designer: {0}", designerStaffId ?? ""));
            sb.AppendLine(string.Format("client: {0}", client ?? ""));
            sb.AppendLine("deadline: ");
            sb.AppendLine("priority: medium");
            sb.AppendLine("tags: []");
            sb.AppendLine("revision: 0");
            sb.AppendLine(Delimiter);
            return sb.ToString();
        }

        // ─── Private helpers ──────────────────────────────────────────────────

        private static Dictionary<string, string> ParseFrontmatter(string[] lines)
        {
            if (lines == null || lines.Length == 0) return null;
            if (lines[0].Trim() != Delimiter) return null;

            Dictionary<string, string> result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            for (int i = 1; i < lines.Length; i++)
            {
                if (lines[i].Trim() == Delimiter) return result;
                int colon = lines[i].IndexOf(':');
                if (colon > 0)
                {
                    string key = lines[i].Substring(0, colon).Trim();
                    string val = lines[i].Substring(colon + 1).Trim();
                    result[key] = val;
                }
            }
            return result; // no closing delimiter found — return whatever was parsed
        }

        private static string ExtractBody(string[] lines)
        {
            if (lines == null || lines.Length == 0) return "";
            if (lines[0].Trim() != Delimiter)
                return string.Join(Environment.NewLine, lines);

            for (int i = 1; i < lines.Length; i++)
            {
                if (lines[i].Trim() == Delimiter)
                {
                    List<string> body = new List<string>();
                    for (int j = i + 1; j < lines.Length; j++) body.Add(lines[j]);
                    return string.Join(Environment.NewLine, body.ToArray()).TrimStart('\r', '\n');
                }
            }
            return "";
        }

        private static string GetValue(Dictionary<string, string> fm, string key, string def)
        {
            string val;
            return fm.TryGetValue(key, out val) && !string.IsNullOrWhiteSpace(val) ? val : def;
        }

        private static int ParseInt(string s)
        {
            int v;
            return int.TryParse(s, out v) ? v : 0;
        }

        private static List<string> ParseTags(string raw)
        {
            List<string> tags = new List<string>();
            if (string.IsNullOrWhiteSpace(raw)) return tags;
            raw = raw.Trim('[', ']');
            foreach (string t in raw.Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries))
            {
                string tag = t.Trim();
                if (!string.IsNullOrWhiteSpace(tag)) tags.Add(tag);
            }
            return tags;
        }
    }
}
