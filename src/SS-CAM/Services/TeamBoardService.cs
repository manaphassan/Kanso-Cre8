using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using Newtonsoft.Json;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    /// <summary>
    /// Reads and writes the shared team notes board stored at
    /// &lt;WorkspaceRoot&gt;\_Team\team-notes.json on the NAS.
    /// </summary>
    public static class TeamBoardService
    {
        private const string TeamFolder = "_Team";
        private const string NotesFile = "team-notes.json";

        private static string GetNotesPath(string workspaceRoot)
        {
            string teamDir = Path.Combine(workspaceRoot, TeamFolder);
            if (!Directory.Exists(teamDir))
            {
                try { Directory.CreateDirectory(teamDir); } catch { }
            }
            return Path.Combine(teamDir, NotesFile);
        }

        /// <summary>
        /// Loads all team notes. Returns an empty list if the file doesn't exist or can't be read.
        /// Notes are returned pinned-first, then newest-first.
        /// </summary>
        public static List<TeamNote> LoadNotes(string workspaceRoot)
        {
            if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot))
                return new List<TeamNote>();

            string path = GetNotesPath(workspaceRoot);
            if (!File.Exists(path)) return new List<TeamNote>();

            try
            {
                string json = File.ReadAllText(path, Encoding.UTF8);
                List<TeamNote> notes = JsonConvert.DeserializeObject<List<TeamNote>>(json);
                if (notes == null) return new List<TeamNote>();

                // Sort: pinned first, then newest first
                notes.Sort(delegate(TeamNote a, TeamNote b)
                {
                    if (a.Pinned != b.Pinned) return b.Pinned.CompareTo(a.Pinned);
                    return string.Compare(b.Timestamp, a.Timestamp, StringComparison.Ordinal);
                });
                return notes;
            }
            catch { return new List<TeamNote>(); }
        }

        /// <summary>
        /// Posts a new note to the shared board.
        /// </summary>
        public static bool PostNote(string workspaceRoot, string staffId, string designerName, string content)
        {
            if (string.IsNullOrWhiteSpace(content)) return false;

            List<TeamNote> notes = LoadNotes(workspaceRoot);
            TeamNote note = new TeamNote
            {
                Author = string.Format("{0} - {1}", staffId, designerName),
                StaffId = staffId,
                Content = content.Trim(),
                Pinned = false
            };

            notes.Insert(0, note);

            // Keep last 200 notes max
            if (notes.Count > 200) notes.RemoveRange(200, notes.Count - 200);

            return Save(workspaceRoot, notes);
        }

        /// <summary>
        /// Toggles the pin state of a note by ID.
        /// </summary>
        public static bool TogglePin(string workspaceRoot, string noteId)
        {
            List<TeamNote> notes = LoadNotes(workspaceRoot);
            foreach (TeamNote n in notes)
            {
                if (n.Id == noteId) { n.Pinned = !n.Pinned; break; }
            }
            return Save(workspaceRoot, notes);
        }

        /// <summary>
        /// Deletes a note by ID.
        /// </summary>
        public static bool DeleteNote(string workspaceRoot, string noteId)
        {
            List<TeamNote> notes = LoadNotes(workspaceRoot);
            notes.RemoveAll(delegate(TeamNote n) { return n.Id == noteId; });
            return Save(workspaceRoot, notes);
        }

        private static bool Save(string workspaceRoot, List<TeamNote> notes)
        {
            try
            {
                string path = GetNotesPath(workspaceRoot);
                string json = JsonConvert.SerializeObject(notes, Formatting.Indented);
                File.WriteAllText(path, json, Encoding.UTF8);
                return true;
            }
            catch { return false; }
        }
    }
}
