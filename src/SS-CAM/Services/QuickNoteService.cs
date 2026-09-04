using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
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
        private static readonly HttpClient _httpClient = new HttpClient { Timeout = TimeSpan.FromSeconds(4) };
        private const string WebPortalNotesApiUrl = "https://creative.suamisihat.myds.me/api/notes";

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
                    int completedTasks, totalTasks;
                    ExtractTaskStats(content, out completedTasks, out totalTasks);
                    string snippet = ExtractSnippet(content, title);

                    notes.Add(new QuickNoteItem
                    {
                        FilePath = file,
                        Title = title,
                        Content = content,
                        Snippet = snippet,
                        TotalTasks = totalTasks,
                        CompletedTasks = completedTasks,
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

                string noteId = Path.GetFileNameWithoutExtension(filePath);
                string title = ExtractTitle(rawContent, noteId);
                var profile = UserProfileService.LoadProfile();

                try
                {
                    if (profile != null && !string.IsNullOrWhiteSpace(profile.WorkspaceRoot))
                    {
                        NasConfigSyncService.SaveFolderToNas(profile.WorkspaceRoot, "Notes");
                    }
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[QuickNoteService] SaveNote NAS sync error: " + ex.Message); }

                try
                {
                    string username = (profile != null && !string.IsNullOrWhiteSpace(profile.DesignerName)) ? profile.DesignerName.ToLowerInvariant() : "harus";
                    PushNoteToWebPortalAsync(noteId, title, rawContent, isPinned, priority, username);
                }
                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[QuickNoteService] SaveNote Portal push error: " + ex.Message); }
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
        /// Deletes a note file locally and removes it from NAS and Web Portal.
        /// </summary>
        public static void DeleteNote(string filePath)
        {
            if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath)) return;
            try
            {
                string fileName = Path.GetFileName(filePath);
                string noteId = Path.GetFileNameWithoutExtension(filePath);
                File.Delete(filePath);

                var profile = UserProfileService.LoadProfile();
                if (profile != null && !string.IsNullOrWhiteSpace(profile.WorkspaceRoot))
                {
                    NasConfigSyncService.DeleteFileFromNas(profile.WorkspaceRoot, "Notes", fileName);
                }

                DeleteNoteFromWebPortalAsync(noteId);
            }
            catch (Exception ex) { System.Diagnostics.Debug.WriteLine(ex); }
        }

        /// <summary>
        /// Synchronizes notes with the Web Portal / Mobile REST API.
        /// Discovers notes created on mobile or web and downloads them into local storage.
        /// </summary>
        public static async Task SyncWithWebPortalAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync(WebPortalNotesApiUrl);
                if (!response.IsSuccessStatusCode) return;

                string json = await response.Content.ReadAsStringAsync();
                if (string.IsNullOrWhiteSpace(json)) return;

                var root = JObject.Parse(json);
                var notesArray = root["notes"] as JArray;
                if (notesArray == null) return;

                string dir = NotesDirectory;
                var profile = UserProfileService.LoadProfile();
                string wsRoot = (profile != null && !string.IsNullOrWhiteSpace(profile.WorkspaceRoot)) ? profile.WorkspaceRoot : null;
                string nasNotesDir = wsRoot != null ? Path.Combine(wsRoot, "_Team", "_Config", "Notes") : null;

                foreach (var token in notesArray)
                {
                    try
                    {
                        string id = token["id"] != null ? token["id"].ToString() : null;
                        string filename = token["filename"] != null ? token["filename"].ToString() : null;
                        if (string.IsNullOrWhiteSpace(filename))
                        {
                            if (string.IsNullOrWhiteSpace(id)) continue;
                            filename = id + ".md";
                        }

                        string body = token["body"] != null ? token["body"].ToString() : "";
                        bool isPinned = token["isPinned"] != null && (bool)token["isPinned"];
                        string prioStr = token["priority"] != null ? token["priority"].ToString().ToLowerInvariant() : "normal";
                        NotePriority priority = NotePriority.Normal;
                        if (prioStr == "high") priority = NotePriority.High;
                        else if (prioStr == "medium") priority = NotePriority.Medium;

                        long modifiedMs = 0L;
                        if (token["modified"] != null)
                        {
                            try { modifiedMs = Convert.ToInt64(token["modified"]); }
                            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[QuickNoteService] modified timestamp parse: " + ex.Message); }
                        }
                        DateTime serverModified = modifiedMs > 0
                            ? new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc).AddMilliseconds(modifiedMs)
                            : DateTime.UtcNow;

                        string localPath = Path.Combine(dir, filename);
                        bool needsWrite = false;

                        if (!File.Exists(localPath))
                        {
                            needsWrite = true;
                        }
                        else
                        {
                            DateTime localModified = File.GetLastWriteTimeUtc(localPath);
                            if (serverModified > localModified.AddSeconds(2))
                            {
                                needsWrite = true;
                            }
                        }

                        if (needsWrite)
                        {
                            string fullContent = BuildContentWithFrontmatter(body, isPinned, priority);
                            File.WriteAllText(localPath, fullContent, Encoding.UTF8);
                            try { File.SetLastWriteTimeUtc(localPath, serverModified); }
                            catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[QuickNoteService] SetLastWriteTimeUtc: " + ex.Message); }

                            if (nasNotesDir != null && Directory.Exists(nasNotesDir))
                            {
                                try
                                {
                                    string nasPath = Path.Combine(nasNotesDir, filename);
                                    File.Copy(localPath, nasPath, true);
                                }
                                catch (Exception ex) { System.Diagnostics.Debug.WriteLine("[QuickNoteService] NAS notes mirror: " + ex.Message); }
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine("[QuickNoteService] Note sync item: " + ex.Message);
                    }
                }
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("[QuickNoteService] SyncWithWebPortal error: " + ex.Message);
            }
        }

        private static void PushNoteToWebPortalAsync(string id, string title, string body, bool isPinned, NotePriority priority, string username)
        {
            Task.Run(async () =>
            {
                try
                {
                    var payload = new
                    {
                        id = id,
                        title = title,
                        body = body,
                        isPinned = isPinned,
                        priority = priority.ToString().ToLowerInvariant(),
                        user = username
                    };
                    string json = JsonConvert.SerializeObject(payload);
                    var content = new StringContent(json, Encoding.UTF8, "application/json");
                    await _httpClient.PostAsync(WebPortalNotesApiUrl, content);
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("[QuickNoteService] PushNoteToWebPortal error: " + ex.Message);
                }
            });
        }

        private static void DeleteNoteFromWebPortalAsync(string id)
        {
            Task.Run(async () =>
            {
                try
                {
                    await _httpClient.DeleteAsync(WebPortalNotesApiUrl + "/" + id);
                }
                catch (Exception ex)
                {
                    System.Diagnostics.Debug.WriteLine("[QuickNoteService] DeleteNoteFromWebPortal error: " + ex.Message);
                }
            });
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

        /// <summary>
        /// Extracts a clean 1-line text snippet (skipping title and frontmatter) for sidebar display.
        /// </summary>
        public static string ExtractSnippet(string content, string title)
        {
            if (string.IsNullOrWhiteSpace(content)) return "Empty note";
            string body = StripFrontmatter(content);
            string[] lines = body.Split(new char[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (string rawLine in lines)
            {
                string line = rawLine.Trim();
                if (string.IsNullOrWhiteSpace(line)) continue;
                string cleanLine = line.TrimStart('#', '*', '_', '-', '>', ' ', '`');
                if (cleanLine.Equals(title, StringComparison.OrdinalIgnoreCase)) continue;
                if (cleanLine.Length > 0)
                {
                    cleanLine = cleanLine.Replace("**", "").Replace("*", "").Replace("_", "").Replace("~~", "").Replace("[ ]", "").Replace("[x]", "").Trim();
                    if (cleanLine.Length > 60) cleanLine = cleanLine.Substring(0, 57) + "...";
                    return cleanLine;
                }
            }
            return "No additional text";
        }

        /// <summary>
        /// Extracts completed and total task checkbox count (- [ ] and - [x]).
        /// </summary>
        public static void ExtractTaskStats(string content, out int completed, out int total)
        {
            completed = 0;
            total = 0;
            if (string.IsNullOrWhiteSpace(content)) return;
            string[] lines = content.Split(new char[] { '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (string line in lines)
            {
                string t = line.Trim();
                if (t.StartsWith("- [ ]", StringComparison.OrdinalIgnoreCase) || t.StartsWith("* [ ]", StringComparison.OrdinalIgnoreCase))
                {
                    total++;
                }
                else if (t.StartsWith("- [x]", StringComparison.OrdinalIgnoreCase) || t.StartsWith("* [x]", StringComparison.OrdinalIgnoreCase))
                {
                    total++;
                    completed++;
                }
            }
        }
    }

    public class QuickNoteItem
    {
        public string FilePath { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public string Snippet { get; set; }
        public int TotalTasks { get; set; }
        public int CompletedTasks { get; set; }
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

        public System.Windows.Visibility TaskBadgeVisibility
        {
            get { return TotalTasks > 0 ? System.Windows.Visibility.Visible : System.Windows.Visibility.Collapsed; }
        }

        public string TaskProgressDisplay
        {
            get { return string.Format("{0}/{1} tasks", CompletedTasks, TotalTasks); }
        }

        public string PriorityLabel
        {
            get
            {
                switch (Priority)
                {
                    case NotePriority.High: return "P2";
                    case NotePriority.Medium: return "P1";
                    default: return "";
                }
            }
        }
    }
}
