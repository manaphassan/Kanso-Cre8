using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using SS_CAM.Utilities;

namespace SS_CAM.Services
{
    /// <summary>
    /// Manages Markdown note files stored in %LOCALAPPDATA%\SuamiSihat\SS-CAM\Notes\.
    /// Each note is a plain .md file; the filename encodes the creation timestamp.
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
        /// Lists all notes sorted newest first.
        /// </summary>
        public static List<QuickNoteItem> ListNotes()
        {
            List<QuickNoteItem> notes = new List<QuickNoteItem>();
            string dir = NotesDirectory;

            string[] files;
            try { files = Directory.GetFiles(dir, "*.md"); }
            catch { return notes; }

            foreach (string file in files)
            {
                try
                {
                    string content = File.ReadAllText(file, Encoding.UTF8);
                    string title = ExtractTitle(content, Path.GetFileNameWithoutExtension(file));
                    DateTime modified = File.GetLastWriteTime(file);

                    notes.Add(new QuickNoteItem
                    {
                        FilePath = file,
                        Title = title,
                        Content = content,
                        ModifiedTicks = modified.Ticks,
                        ModifiedDisplay = modified.ToString("dd MMM yyyy, HH:mm")
                    });
                }
                catch { }
            }

            notes.Sort(delegate(QuickNoteItem a, QuickNoteItem b) { return b.ModifiedTicks.CompareTo(a.ModifiedTicks); });
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
            string initialContent = string.Format("# New Note\n\n_{0}_\n\n", DateTime.Now.ToString("dd MMMM yyyy"));
            File.WriteAllText(filePath, initialContent, Encoding.UTF8);
            return filePath;
        }

        /// <summary>
        /// Saves content to the given file path.
        /// </summary>
        public static void SaveNote(string filePath, string content)
        {
            if (string.IsNullOrWhiteSpace(filePath)) return;
            try { File.WriteAllText(filePath, content, Encoding.UTF8); }
            catch { }
        }

        /// <summary>
        /// Deletes a note file.
        /// </summary>
        public static void DeleteNote(string filePath)
        {
            if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath)) return;
            try { File.Delete(filePath); }
            catch { }
        }

        /// <summary>
        /// Extracts the first non-empty line as the note title, stripping Markdown heading markers.
        /// </summary>
        public static string ExtractTitle(string content, string fallback)
        {
            if (string.IsNullOrWhiteSpace(content)) return fallback;
            foreach (string line in content.Split(new char[] { '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries))
            {
                string trimmed = line.Trim().TrimStart('#').Trim();
                if (!string.IsNullOrWhiteSpace(trimmed)) return trimmed;
            }
            return fallback;
        }
    }

    public class QuickNoteItem
    {
        public string FilePath { get; set; }
        public string Title { get; set; }
        public string Content { get; set; }
        public long ModifiedTicks { get; set; }
        public string ModifiedDisplay { get; set; }
    }
}
