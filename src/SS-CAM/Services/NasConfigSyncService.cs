using System;
using System.Diagnostics;
using System.IO;
using System.Text.RegularExpressions;
using SS_CAM.Utilities;

namespace SS_CAM.Services
{
    /// <summary>
    /// Synchronizes local application settings and preferences (user profile, theme config, category presets, quick notes)
    /// with the NAS/Synology Drive workspace root (_Team\_Config).
    /// Supports multi-user isolation on shared NAS drives via Windows username scoping.
    /// </summary>
    public static class NasConfigSyncService
    {
        private const string TeamConfigSubfolder = @"_Team\_Config";

        public static string GetNasConfigDir(string workspaceRoot)
        {
            if (string.IsNullOrWhiteSpace(workspaceRoot)) return null;

            try
            {
                if (!Directory.Exists(workspaceRoot)) return null;
                string dir = Path.Combine(workspaceRoot, TeamConfigSubfolder);
                if (!Directory.Exists(dir))
                {
                    Directory.CreateDirectory(dir);
                }
                return dir;
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[NasConfigSyncService] GetNasConfigDir error: " + ex.Message);
                return null;
            }
        }

        private static string GetUserScopedFileName(string fileName)
        {
            if (string.Equals(fileName, "category_presets.json", StringComparison.OrdinalIgnoreCase))
            {
                // Presets are shared team-wide
                return fileName;
            }

            string user = Environment.UserName.ToLowerInvariant();
            user = Regex.Replace(user, @"[^a-z0-9_]", "");
            if (string.IsNullOrEmpty(user)) user = "user";

            string ext = Path.GetExtension(fileName);
            string baseName = Path.GetFileNameWithoutExtension(fileName);
            return string.Format("{0}_{1}{2}", baseName, user, ext);
        }

        private static string GetUserScopedFolderName(string subFolder)
        {
            string user = Environment.UserName.ToLowerInvariant();
            user = Regex.Replace(user, @"[^a-z0-9_]", "");
            if (string.IsNullOrEmpty(user)) user = "user";

            return string.Format("{0}_{1}", subFolder, user);
        }

        /// <summary>
        /// Syncs a config file from local to NAS or from NAS to local depending on timestamp.
        /// Returns true if local file was updated from NAS.
        /// </summary>
        public static bool SyncFromNasIfNewer(string workspaceRoot, string fileName)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot)) return false;

                string localPath = Path.Combine(AppPaths.AppDataFolder, fileName);
                string nasDir = Path.Combine(workspaceRoot, TeamConfigSubfolder);
                string nasFileName = GetUserScopedFileName(fileName);
                string nasPath = Path.Combine(nasDir, nasFileName);

                if (!File.Exists(nasPath)) return false;

                if (!File.Exists(localPath))
                {
                    File.Copy(nasPath, localPath, true);
                    Debug.WriteLine("[NasConfigSyncService] Copied " + nasFileName + " from NAS to local (local missing).");
                    return true;
                }

                DateTime localTime = File.GetLastWriteTimeUtc(localPath);
                DateTime nasTime = File.GetLastWriteTimeUtc(nasPath);

                if (nasTime > localTime.AddSeconds(2))
                {
                    File.Copy(nasPath, localPath, true);
                    Debug.WriteLine("[NasConfigSyncService] Copied " + nasFileName + " from NAS to local (NAS newer).");
                    return true;
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[NasConfigSyncService] SyncFromNasIfNewer error for " + fileName + ": " + ex.Message);
            }
            return false;
        }

        /// <summary>
        /// Copies a local config file to NAS if workspace root is valid.
        /// </summary>
        public static void SaveToNas(string workspaceRoot, string fileName)
        {
            try
            {
                string nasDir = GetNasConfigDir(workspaceRoot);
                if (string.IsNullOrEmpty(nasDir)) return;

                string localPath = Path.Combine(AppPaths.AppDataFolder, fileName);
                if (!File.Exists(localPath)) return;

                string nasFileName = GetUserScopedFileName(fileName);
                string nasPath = Path.Combine(nasDir, nasFileName);
                File.Copy(localPath, nasPath, true);
                Debug.WriteLine("[NasConfigSyncService] Mirrored " + fileName + " to NAS as " + nasFileName);
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[NasConfigSyncService] SaveToNas error for " + fileName + ": " + ex.Message);
            }
        }

        /// <summary>
        /// Syncs a directory of files from NAS to local if newer.
        /// </summary>
        public static void SyncFolderFromNasIfNewer(string workspaceRoot, string subFolder)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot)) return;

                string localDir = Path.Combine(AppPaths.AppDataFolder, subFolder);
                string nasSubDirName = GetUserScopedFolderName(subFolder);
                string nasDir = Path.Combine(workspaceRoot, TeamConfigSubfolder, nasSubDirName);

                if (!Directory.Exists(nasDir)) return;
                if (!Directory.Exists(localDir)) Directory.CreateDirectory(localDir);

                foreach (string nasFile in Directory.GetFiles(nasDir))
                {
                    string name = Path.GetFileName(nasFile);
                    string localFile = Path.Combine(localDir, name);

                    if (!File.Exists(localFile))
                    {
                        File.Copy(nasFile, localFile, true);
                    }
                    else if (File.GetLastWriteTimeUtc(nasFile) > File.GetLastWriteTimeUtc(localFile).AddSeconds(2))
                    {
                        File.Copy(nasFile, localFile, true);
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[NasConfigSyncService] SyncFolderFromNasIfNewer error for " + subFolder + ": " + ex.Message);
            }
        }

        /// <summary>
        /// Mirrors a local subfolder to NAS.
        /// </summary>
        public static void SaveFolderToNas(string workspaceRoot, string subFolder)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot)) return;

                string localDir = Path.Combine(AppPaths.AppDataFolder, subFolder);
                if (!Directory.Exists(localDir)) return;

                string nasSubDirName = GetUserScopedFolderName(subFolder);
                string nasDir = Path.Combine(workspaceRoot, TeamConfigSubfolder, nasSubDirName);
                if (!Directory.Exists(nasDir)) Directory.CreateDirectory(nasDir);

                foreach (string localFile in Directory.GetFiles(localDir))
                {
                    string name = Path.GetFileName(localFile);
                    string nasFile = Path.Combine(nasDir, name);

                    if (!File.Exists(nasFile) || File.GetLastWriteTimeUtc(localFile) > File.GetLastWriteTimeUtc(nasFile).AddSeconds(2))
                    {
                        File.Copy(localFile, nasFile, true);
                    }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[NasConfigSyncService] SaveFolderToNas error for " + subFolder + ": " + ex.Message);
            }
        }
    }
}
