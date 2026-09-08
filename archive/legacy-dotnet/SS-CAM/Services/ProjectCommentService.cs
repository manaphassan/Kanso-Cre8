using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Text;
using System.Text.RegularExpressions;
using Newtonsoft.Json;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    /// <summary>
    /// Reads and writes project-level contextual comments stored in JSONL format
    /// at &lt;ProjectFolder&gt;\_comments.jsonl or fallback _Team\comments\&lt;ProjectId&gt;.jsonl.
    /// </summary>
    public static class ProjectCommentService
    {
        public static string GetCommentsPath(string projectPath, string projectId, string workspaceRoot)
        {
            if (!string.IsNullOrWhiteSpace(projectPath) && Directory.Exists(projectPath))
            {
                return Path.Combine(projectPath, "_comments.jsonl");
            }

            if (!string.IsNullOrWhiteSpace(workspaceRoot) && Directory.Exists(workspaceRoot))
            {
                string teamDir = Path.Combine(workspaceRoot, "_Team", "comments");
                if (!Directory.Exists(teamDir))
                {
                    try { Directory.CreateDirectory(teamDir); }
                    catch (Exception ex)
                    {
                        Debug.WriteLine(string.Format("[ProjectCommentService] Create team comments dir: {0}", ex.Message));
                    }
                }
                if (!string.IsNullOrWhiteSpace(projectId))
                {
                    return Path.Combine(teamDir, string.Format("{0}.jsonl", projectId));
                }
            }

            return null;
        }

        public static List<ProjectComment> GetComments(string projectPath, string projectId, string workspaceRoot)
        {
            List<ProjectComment> results = new List<ProjectComment>();
            string filePath = GetCommentsPath(projectPath, projectId, workspaceRoot);

            if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
            {
                return results;
            }

            try
            {
                using (FileStream fs = new FileStream(filePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite))
                using (StreamReader reader = new StreamReader(fs, Encoding.UTF8))
                {
                    string line;
                    while ((line = reader.ReadLine()) != null)
                    {
                        if (string.IsNullOrWhiteSpace(line)) continue;
                        try
                        {
                            ProjectComment comment = JsonConvert.DeserializeObject<ProjectComment>(line);
                            if (comment != null)
                            {
                                results.Add(comment);
                            }
                        }
                        catch (Exception ex)
                        {
                            Debug.WriteLine(string.Format("[ProjectCommentService] Parse line error: {0}", ex.Message));
                        }
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine(string.Format("[ProjectCommentService] Read comments error: {0}", ex.Message));
            }

            return results;
        }

        public static bool AddComment(string projectPath, string projectId, string workspaceRoot, ProjectComment comment)
        {
            if (comment == null || string.IsNullOrWhiteSpace(comment.Content))
                return false;

            string filePath = GetCommentsPath(projectPath, projectId, workspaceRoot);
            if (string.IsNullOrWhiteSpace(filePath))
                return false;

            try
            {
                // Auto-extract @mentions if empty
                if (comment.Mentions == null || comment.Mentions.Count == 0)
                {
                    comment.Mentions = ExtractMentions(comment.Content);
                }

                string line = JsonConvert.SerializeObject(comment, Formatting.None) + Environment.NewLine;
                File.AppendAllText(filePath, line, Encoding.UTF8);
                return true;
            }
            catch (Exception ex)
            {
                Debug.WriteLine(string.Format("[ProjectCommentService] AddComment error: {0}", ex.Message));
                return false;
            }
        }

        public static bool ToggleResolve(string projectPath, string projectId, string workspaceRoot, string commentId)
        {
            if (string.IsNullOrWhiteSpace(commentId)) return false;

            string filePath = GetCommentsPath(projectPath, projectId, workspaceRoot);
            if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath)) return false;

            try
            {
                List<ProjectComment> comments = GetComments(projectPath, projectId, workspaceRoot);
                bool modified = false;

                for (int i = 0; i < comments.Count; i++)
                {
                    if (string.Equals(comments[i].Id, commentId, StringComparison.OrdinalIgnoreCase))
                    {
                        comments[i].Resolved = !comments[i].Resolved;
                        modified = true;
                        break;
                    }
                }

                if (!modified) return false;

                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < comments.Count; i++)
                {
                    sb.AppendLine(JsonConvert.SerializeObject(comments[i], Formatting.None));
                }

                File.WriteAllText(filePath, sb.ToString(), Encoding.UTF8);
                return true;
            }
            catch (Exception ex)
            {
                Debug.WriteLine(string.Format("[ProjectCommentService] ToggleResolve error: {0}", ex.Message));
                return false;
            }
        }

        public static List<string> ExtractMentions(string text)
        {
            List<string> mentions = new List<string>();
            if (string.IsNullOrWhiteSpace(text)) return mentions;

            MatchCollection matches = Regex.Matches(text, @"@([a-zA-Z0-9_-]+)");
            for (int i = 0; i < matches.Count; i++)
            {
                string name = matches[i].Groups[1].Value.ToLowerInvariant();
                if (!mentions.Contains(name))
                {
                    mentions.Add(name);
                }
            }
            return mentions;
        }
    }
}
