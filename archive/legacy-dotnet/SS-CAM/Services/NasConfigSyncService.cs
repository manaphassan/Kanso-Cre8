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
        /// When syncing "Notes", discovers user-scoped Notes_* folders and shared Notes folder on NAS.
        /// </summary>
        public static void SyncFolderFromNasIfNewer(string workspaceRoot, string subFolder)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot)) return;

                string localDir = Path.Combine(AppPaths.AppDataFolder, subFolder);
                if (!Directory.Exists(localDir)) Directory.CreateDirectory(localDir);

                string teamConfigDir = Path.Combine(workspaceRoot, TeamConfigSubfolder);
                if (!Directory.Exists(teamConfigDir)) return;

                System.Collections.Generic.List<string> sourceDirs = new System.Collections.Generic.List<string>();

                if (string.Equals(subFolder, "Notes", StringComparison.OrdinalIgnoreCase))
                {
                    string userDirName = GetUserScopedFolderName("Notes");
                    string userDirPath = Path.Combine(teamConfigDir, userDirName);
                    if (Directory.Exists(userDirPath)) sourceDirs.Add(userDirPath);

                    string teamDirPath = Path.Combine(teamConfigDir, "Notes");
                    if (Directory.Exists(teamDirPath) && !sourceDirs.Contains(teamDirPath)) sourceDirs.Add(teamDirPath);

                    try
                    {
                        foreach (string d in Directory.GetDirectories(teamConfigDir, "Notes_*"))
                        {
                            if (!sourceDirs.Contains(d)) sourceDirs.Add(d);
                        }
                    }
                    catch (Exception ex) { Debug.WriteLine("[NasConfigSyncService] Notes folder discovery: " + ex.Message); }
                }
                else
                {
                    string nasSubDirName = GetUserScopedFolderName(subFolder);
                    string nasDir = Path.Combine(teamConfigDir, nasSubDirName);
                    if (Directory.Exists(nasDir)) sourceDirs.Add(nasDir);
                }

                foreach (string srcDir in sourceDirs)
                {
                    if (!Directory.Exists(srcDir)) continue;

                    foreach (string nasFile in Directory.GetFiles(srcDir))
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

        /// <summary>
        /// Deletes a file from user's NAS folder and team shared folder.
        /// </summary>
        public static void DeleteFileFromNas(string workspaceRoot, string subFolder, string fileName)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot)) return;
                string teamConfigDir = Path.Combine(workspaceRoot, TeamConfigSubfolder);
                if (!Directory.Exists(teamConfigDir)) return;

                string userDirName = GetUserScopedFolderName(subFolder);
                string userFilePath = Path.Combine(teamConfigDir, userDirName, fileName);
                if (File.Exists(userFilePath))
                {
                    File.Delete(userFilePath);
                    Debug.WriteLine("[NasConfigSyncService] Deleted " + fileName + " from NAS " + userDirName);
                }

                string teamFilePath = Path.Combine(teamConfigDir, subFolder, fileName);
                if (File.Exists(teamFilePath))
                {
                    File.Delete(teamFilePath);
                    Debug.WriteLine("[NasConfigSyncService] Deleted " + fileName + " from NAS " + subFolder);
                }

                if (string.Equals(subFolder, "Notes", StringComparison.OrdinalIgnoreCase))
                {
                    try
                    {
                        foreach (string d in Directory.GetDirectories(teamConfigDir, "Notes_*"))
                        {
                            string targetFile = Path.Combine(d, fileName);
                            if (File.Exists(targetFile))
                            {
                                File.Delete(targetFile);
                            }
                        }
                    }
                    catch (Exception ex) { Debug.WriteLine("[NasConfigSyncService] Notes_* delete: " + ex.Message); }
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[NasConfigSyncService] DeleteFileFromNas error for " + fileName + ": " + ex.Message);
            }
        }

        /// <summary>
        /// Automatically discovers potential Creative-Team workspace root directories on local mapped drives or Synology Drive sync paths.
        /// </summary>
        public static string DiscoverWorkspaceRoot()
        {
            try
            {
                string[] primaryCandidates = new[]
                {
                    @"E:\SynologyDrive\Creative-Team",
                    @"D:\SynologyDrive\Creative-Team",
                    @"C:\SynologyDrive\Creative-Team",
                    @"E:\Creative-Team",
                    @"D:\Creative-Team",
                    @"C:\Creative-Team",
                    @"Z:\Creative-Team"
                };

                foreach (string candidate in primaryCandidates)
                {
                    if (Directory.Exists(candidate))
                    {
                        Debug.WriteLine("[NasConfigSyncService] Auto-discovered workspace root: " + candidate);
                        return candidate;
                    }
                }

                // Dynamic drive scan fallback
                DriveInfo[] drives = DriveInfo.GetDrives();
                foreach (DriveInfo drive in drives)
                {
                    if (drive.IsReady && (drive.DriveType == DriveType.Fixed || drive.DriveType == DriveType.Network))
                    {
                        string candidate1 = Path.Combine(drive.RootDirectory.FullName, "SynologyDrive", "Creative-Team");
                        if (Directory.Exists(candidate1)) return candidate1;

                        string candidate2 = Path.Combine(drive.RootDirectory.FullName, "Creative-Team");
                        if (Directory.Exists(candidate2)) return candidate2;
                    }
                }

                // App base directory fallback
                string appDir = AppDomain.CurrentDomain.BaseDirectory;
                if (Directory.Exists(appDir)) return appDir;

                string currentDir = Directory.GetCurrentDirectory();
                if (Directory.Exists(currentDir)) return currentDir;

                // Documents workspace fallback
                string docWorkspace = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "SS-CAM Workspace");
                if (!Directory.Exists(docWorkspace))
                {
                    Directory.CreateDirectory(docWorkspace);
                }
                return docWorkspace;
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[NasConfigSyncService] DiscoverWorkspaceRoot error: " + ex.Message);
            }
            return AppDomain.CurrentDomain.BaseDirectory;
        }

        /// <summary>
        /// Attempts to auto-restore existing user profile and theme config from NAS workspace _Team\_Config directory.
        /// Returns true if an existing user profile was restored.
        /// </summary>
        public static bool TryAutoRestoreUserConfig(string workspaceRoot)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(workspaceRoot) || !Directory.Exists(workspaceRoot)) return false;

                string nasDir = Path.Combine(workspaceRoot, TeamConfigSubfolder);
                if (!Directory.Exists(nasDir)) return false;

                string userProfileNasName = GetUserScopedFileName("user_profile.json");
                string userProfileNasPath = Path.Combine(nasDir, userProfileNasName);

                if (File.Exists(userProfileNasPath))
                {
                    string localProfilePath = Path.Combine(AppPaths.AppDataFolder, "user_profile.json");
                    File.Copy(userProfileNasPath, localProfilePath, true);
                    Debug.WriteLine("[NasConfigSyncService] Auto-restored user_profile.json from NAS for " + Environment.UserName);

                    // Also restore theme_config if present
                    string themeNasName = GetUserScopedFileName("theme_config.json");
                    string themeNasPath = Path.Combine(nasDir, themeNasName);
                    if (File.Exists(themeNasPath))
                    {
                        string localThemePath = Path.Combine(AppPaths.AppDataFolder, "theme_config.json");
                        File.Copy(themeNasPath, localThemePath, true);
                    }

                    return true;
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine("[NasConfigSyncService] TryAutoRestoreUserConfig error: " + ex.Message);
            }
            return false;
        }
    }
}
