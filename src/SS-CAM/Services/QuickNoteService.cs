using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using SS_CAM.Utilities;

namespace SS_CAM.Services
{
    public enum NotePriority
    {
        Normal = 0,
        Medium = 1,
        High = 2
    }

    /// <summary>
    /// Manages Markdown note files stored in %LOCALAPPDATA%\SuamiSihat\SS-CAM\Notes\.
    /// Each note is a plain .md file with optional YAML frontmatter header.
    /// </summary>
    public static class QuickNoteService
    {
        private static string NotesDirectory
        {
            get
            {
                string dir = Path.Combine(AppPaths.AppDataFolder, "Notes");
                if (!Directory.Exists(dir)) Directory.CreateDirectory(dir);
                return dir;
            }
        }

        /// <summary>
        /// Lists all notes sorted: Pinned first, then Priority (High > Medium > Normal), then newest modification.
        /// </summary>
        public static List<QuickNoteItem> ListNotes()
        {
            try
            {
                var profile = UserProfileService.LoadProfile();
                if (profile != null && !string.IsNullOrWhiteSpace(profile.WorkspaceRoot))
                {
                    NasConfigSyncService.SyncFolderFromNasIfNewer(profile.WorkspaceRoot, "Notes");
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[QuickNoteService] NAS sync error: " + ex.Message); }

            List<QuickNoteItem> notes = new List<QuickNoteItem>();
            string dir = NotesDirectory;

            string[] files;
            try { files = Directory.GetFiles(dir, "*.md"); }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); return notes; }

            foreach (string file in files)
            {
                try
                {
                    string content = File.ReadAllText(file, Encoding.UTF8);
                    bool isPinned = false;
                    NotePriority priority = NotePriority.Normal;

                    ParseFrontmatter(content, out isPinned, out priority);

                    string title = ExtractTitle(content, Path.GetFileNameWithoutExtension(file));
                    DateTime modified = File.GetLastWriteTime(file);

                    notes.Add(new QuickNoteItem
                    {
                        FilePath = file,
                        Title = title,
                        Content = content,
                        IsPinned = isPinned,
                        Priority = priority,
                        ModifiedTicks = modified.Ticks,
                        ModifiedDisplay = modified.ToString("dd MMM yyyy, HH:mm")
                    });
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
            }

            notes.Sort(delegate(QuickNoteItem a, QuickNoteItem b)
            {
                if (a.IsPinned != b.IsPinned)
                    return b.IsPinned.CompareTo(a.IsPinned);
                if (a.Priority != b.Priority)
                    return ((int)b.Priority).CompareTo((int)a.Priority);
                return b.ModifiedTicks.CompareTo(a.ModifiedTicks);
            });

            return notes;
        }

        /// <summary>
        /// Creates a new empty note and returns its file path.
        /// </summary>
        public static string CreateNote()
        {
            string timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");
            string fileName = string.Format("{0}.md", timestamp);
            string filePath = Path.Combine(NotesDirectory, fileName);
            string body = string.Format("# New Note\n\n_{0}_\n\n", DateTime.Now.ToString("dd MMMM yyyy"));
            string fullContent = BuildContentWithFrontmatter(body, false, NotePriority.Normal);
            File.WriteAllText(filePath, fullContent, Encoding.UTF8);
            return filePath;
        }

        /// <summary>
        /// Saves note content with pinned and priority metadata in YAML frontmatter.
        /// </summary>
        public static void SaveNote(string filePath, string rawContent, bool isPinned, NotePriority priority)
        {
            if (string.IsNullOrWhiteSpace(filePath)) return;
            try
            {
                string fullContent = BuildContentWithFrontmatter(rawContent, isPinned, priority);
                File.WriteAllText(filePath, fullContent, Encoding.UTF8);

                try
                {
                    var profile = UserProfileService.LoadProfile();
                    if (profile != null && !string.IsNullOrWhiteSpace(profile.WorkspaceRoot))
                    {
                        NasConfigSyncService.SaveFolderToNas(profile.WorkspaceRoot, "Notes");
                    }
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[QuickNoteService] SaveNote NAS sync error: " + ex.Message); }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
        }

        /// <summary>
        /// Saves plain content to file.
        /// </summary>
        public static void SaveNote(string filePath, string content)
        {
            if (string.IsNullOrWhiteSpace(filePath)) return;
            try { File.WriteAllText(filePath, content, Encoding.UTF8); }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
        }

        /// <summary>
        /// Deletes a note file locally and removes it from NAS.
        /// </summary>
        public static void DeleteNote(string filePath)
        {
            if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath)) return;
            try
            {
                string fileName = Path.GetFileName(filePath);
                File.Delete(filePath);

                var profile = UserProfileService.LoadProfile();
                if (profile != null && !string.IsNullOrWhiteSpace(profile.WorkspaceRoot))
                {
                    NasConfigSyncService.DeleteFileFromNas(profile.WorkspaceRoot, "Notes", fileName);
                }
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
        }

        /// <summary>
        /// Strips YAML frontmatter block from markdown content if present.
        /// </summary>
        public static string StripFrontmatter(string content)
        {
            if (string.IsNullOrWhiteSpace(content)) return "";
            string text = content.Trim();
            if (!text.StartsWith("---")) return text;

            int end = text.IndexOf("---", 3);
            if (end > 0)
            {
                return text.Substring(end + 3).TrimStart('\r', '\n', ' ');
            }
            int nextBlank = text.IndexOf("\n\n");
            if (nextBlank > 0)
            {
                return text.Substring(nextBlank + 2).TrimStart('\r', '\n', ' ');
            }
            return text;
        }

        /// <summary>
        /// Extracts the first non-empty line as title, skipping YAML frontmatter.
        /// </summary>
        public static string ExtractTitle(string content, string fallback)
        {
            if (string.IsNullOrWhiteSpace(content)) return fallback;
            string text = StripFrontmatter(content);
            foreach (string line in text.Split(new char[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries))
            {
                string trimmed = line.Trim().TrimStart('#').Trim();
                if (!string.IsNullOrWhiteSpace(trimmed)) return trimmed;
            }
            return fallback;
        }

        /// <summary>
        /// Parses pinned and priority metadata from YAML frontmatter block if present.
        /// </summary>
        public static void ParseFrontmatter(string content, out bool isPinned, out NotePriority priority)
        {
            isPinned = false;
            priority = NotePriority.Normal;
            if (string.IsNullOrWhiteSpace(content)) return;

            string text = content.Trim();
            if (!text.StartsWith("---")) return;

            int end = text.IndexOf("---", 3);
            if (end <= 0) return;

            string header = text.Substring(3, end - 3);
            foreach (string line in header.Split(new char[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries))
            {
                int colonIdx = line.IndexOf(':');
                if (colonIdx > 0)
                {
                    string key = line.Substring(0, colonIdx).Trim().ToLowerInvariant();
                    string val = line.Substring(colonIdx + 1).Trim().ToLowerInvariant();

                    if (key == "pinned")
                    {
                        isPinned = val == "true" || val == "yes" || val == "1";
                    }
                    else if (key == "priority")
                    {
                        if (val == "high" || val == "2") priority = NotePriority.High;
                        else if (val == "medium" || val == "med" || val == "1") priority = NotePriority.Medium;
                        else priority = NotePriority.Normal;
                    }
                }
            }
        }

        /// <summary>
        /// Rebuilds note content with standardized YAML frontmatter header.
        /// </summary>
        public static string BuildContentWithFrontmatter(string content, bool isPinned, NotePriority priority)
        {
            string body = content != null ? content.Trim() : "";
            if (body.StartsWith("---"))
            {
                int end = body.IndexOf("---", 3);
                if (end > 0) body = body.Substring(end + 3).TrimStart('\r', '\n');
            }

            if (!isPinned && priority == NotePriority.Normal)
            {
                return body;
            }

            StringBuilder sb = new StringBuilder();
            sb.AppendLine("---");
            if (isPinned) sb.AppendLine("pinned: true");
            if (priority == NotePriority.High) sb.AppendLine("priority: high");
            else if (priority == NotePriority.Medium) sb.AppendLine("priority: medium");
            sb.AppendLine("---");
            sb.AppendLine();
            sb.Append(body);

            return sb.ToString();
        }
    }

    public class QuickNoteItem
    {
        public string FilePath { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public bool IsPinned { get; set; }
        public NotePriority Priority { get; set; }
        public long ModifiedTicks { get; set; }
        public string ModifiedDisplay { get; set; }

        public System.Windows.Visibility PinBadgeVisibility
        {
            get { return IsPinned ? System.Windows.Visibility.Visible : System.Windows.Visibility.Collapsed; }
        }

        public System.Windows.Visibility PriorityBadgeVisibility
        {
            get { return Priority != NotePriority.Normal ? System.Windows.Visibility.Visible : System.Windows.Visibility.Collapsed; }
        }

        public string PriorityLabel
        {
            get
            {
                switch (Priority)
                {
                    case NotePriority.High: return "HIGH";
                    case NotePriority.Medium: return "MED";
                    default: return "";
                }
            }
        }
    }
}
