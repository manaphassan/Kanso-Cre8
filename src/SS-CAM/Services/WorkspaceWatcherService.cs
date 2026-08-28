using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Timers;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    public enum WorkspaceChangeType
    {
        ProjectMetadata,
        ProjectComments,
        ProjectCopywriting,
        ProjectFolderStructure
    }

    public class WorkspaceChangedEventArgs : EventArgs
    {
        public string ProjectPath { get; set; }
        public string ProjectId { get; set; }
        public WorkspaceChangeType ChangeType { get; set; }
        public string ChangedFile { get; set; }

        public WorkspaceChangedEventArgs(string projectPath, string projectId, WorkspaceChangeType changeType, string changedFile)
        {
            ProjectPath = projectPath;
            ProjectId = projectId;
            ChangeType = changeType;
            ChangedFile = changedFile;
        }
    }

    /// <summary>
    /// Background FileSystemWatcher managing real-time file change notifications across the Synology NAS / workspace root.
    /// Uses debouncing to prevent network event storms.
    /// </summary>
    public class WorkspaceWatcherService : IDisposable
    {
        private static WorkspaceWatcherService _instance;
        private static readonly object _syncLock = new object();

        public static WorkspaceWatcherService Instance
        {
            get
            {
                if (_instance == null)
                {
                    lock (_syncLock)
                    {
                        if (_instance == null)
                        {
                            _instance = new WorkspaceWatcherService();
                        }
                    }
                }
                return _instance;
            }
        }

        public event EventHandler<WorkspaceChangedEventArgs> WorkspaceChanged;

        private FileSystemWatcher _watcher;
        private readonly Timer _debounceTimer;
        private readonly Dictionary<string, WorkspaceChangedEventArgs> _pendingChanges;
        private readonly object _pendingLock = new object();
        private string _currentWatchPath = "";
        private bool _isDisposed = false;

        public WorkspaceWatcherService()
        {
            _pendingChanges = new Dictionary<string, WorkspaceChangedEventArgs>(StringComparer.OrdinalIgnoreCase);
            _debounceTimer = new Timer(600); // 600ms debounce
            _debounceTimer.AutoReset = false;
            _debounceTimer.Elapsed += OnDebounceTimerElapsed;
        }

        public void Start(string workspaceRoot)
        {
            if (string.IsNullOrWhiteSpace(workspaceRoot)) return;

            try
            {
                if (!Directory.Exists(workspaceRoot))
                {
                    Debug.WriteLine(string.Format("[WorkspaceWatcherService] Workspace root '{0}' does not exist.", workspaceRoot));
                    return;
                }

                if (_watcher != null && string.Equals(_currentWatchPath, workspaceRoot, StringComparison.OrdinalIgnoreCase))
                {
                    return; // Already watching this path
                }

                Stop();

                _currentWatchPath = workspaceRoot;
                _watcher = new FileSystemWatcher(workspaceRoot);
                _watcher.IncludeSubdirectories = true;
                _watcher.NotifyFilter = NotifyFilters.FileName | NotifyFilters.DirectoryName | NotifyFilters.LastWrite | NotifyFilters.Size;
                
                _watcher.Changed += OnFileSystemEvent;
                _watcher.Created += OnFileSystemEvent;
                _watcher.Deleted += OnFileSystemEvent;
                _watcher.Renamed += OnFileSystemRenamed;
                _watcher.Error += OnWatcherError;

                _watcher.EnableRaisingEvents = true;
                Debug.WriteLine(string.Format("[WorkspaceWatcherService] Started watching '{0}'", workspaceRoot));
            }
            catch (Exception ex)
            {
                Debug.WriteLine(string.Format("[WorkspaceWatcherService] Start failed: {0}", ex.Message));
            }
        }

        public void Stop()
        {
            try
            {
                if (_watcher != null)
                {
                    _watcher.EnableRaisingEvents = false;
                    _watcher.Changed -= OnFileSystemEvent;
                    _watcher.Created -= OnFileSystemEvent;
                    _watcher.Deleted -= OnFileSystemEvent;
                    _watcher.Renamed -= OnFileSystemRenamed;
                    _watcher.Error -= OnWatcherError;
                    _watcher.Dispose();
                    _watcher = null;
                }
                _currentWatchPath = "";
            }
            catch (Exception ex)
            {
                Debug.WriteLine(string.Format("[WorkspaceWatcherService] Stop error: {0}", ex.Message));
            }
        }

        private void OnFileSystemEvent(object sender, FileSystemEventArgs e)
        {
            ProcessFileChange(e.FullPath, e.Name);
        }

        private void OnFileSystemRenamed(object sender, RenamedEventArgs e)
        {
            ProcessFileChange(e.FullPath, e.Name);
        }

        private void ProcessFileChange(string fullPath, string relativeName)
        {
            if (string.IsNullOrWhiteSpace(fullPath)) return;

            string fileName = Path.GetFileName(fullPath);
            if (string.IsNullOrWhiteSpace(fileName)) return;

            WorkspaceChangeType changeType = WorkspaceChangeType.ProjectFolderStructure;
            bool isRelevant = false;

            if (string.Equals(fileName, "README.md", StringComparison.OrdinalIgnoreCase))
            {
                changeType = WorkspaceChangeType.ProjectMetadata;
                isRelevant = true;
            }
            else if (string.Equals(fileName, "_comments.jsonl", StringComparison.OrdinalIgnoreCase) || fileName.EndsWith(".jsonl", StringComparison.OrdinalIgnoreCase))
            {
                changeType = WorkspaceChangeType.ProjectComments;
                isRelevant = true;
            }
            else if (string.Equals(fileName, "COPY.md", StringComparison.OrdinalIgnoreCase))
            {
                changeType = WorkspaceChangeType.ProjectCopywriting;
                isRelevant = true;
            }
            else if (string.Equals(fileName, "team-notes.json", StringComparison.OrdinalIgnoreCase) ||
                     string.Equals(fileName, "staff-directory.json", StringComparison.OrdinalIgnoreCase) ||
                     fullPath.IndexOf("05_DELIVERABLES", StringComparison.OrdinalIgnoreCase) >= 0 ||
                     fullPath.IndexOf("04_DELIVERABLES", StringComparison.OrdinalIgnoreCase) >= 0 ||
                     fullPath.IndexOf("04_WORK_IN_PROGRESS", StringComparison.OrdinalIgnoreCase) >= 0 ||
                     fullPath.IndexOf("01_BRIEF_ASSETS", StringComparison.OrdinalIgnoreCase) >= 0 ||
                     fullPath.IndexOf("01_ASSETS", StringComparison.OrdinalIgnoreCase) >= 0)
            {
                changeType = WorkspaceChangeType.ProjectFolderStructure;
                isRelevant = true;
            }

            if (!isRelevant) return;

            // Extract project directory and ID
            string projectDir = FindProjectDirectory(fullPath);
            string projectId = !string.IsNullOrWhiteSpace(projectDir) ? Path.GetFileName(projectDir) : "";

            string key = string.Format("{0}_{1}", projectDir, changeType);
            lock (_pendingLock)
            {
                _pendingChanges[key] = new WorkspaceChangedEventArgs(projectDir, projectId, changeType, fullPath);
            }

            // Restart debounce timer
            _debounceTimer.Stop();
            _debounceTimer.Start();
        }

        private string FindProjectDirectory(string filePath)
        {
            try
            {
                string dir = Path.GetDirectoryName(filePath);
                while (!string.IsNullOrWhiteSpace(dir) && !string.Equals(dir, _currentWatchPath, StringComparison.OrdinalIgnoreCase))
                {
                    string name = Path.GetFileName(dir);
                    if (name.Length >= 6 && char.IsDigit(name[0]) && char.IsDigit(name[1]))
                    {
                        return dir;
                    }
                    dir = Path.GetDirectoryName(dir);
                }
            }
            catch (Exception ex)
            {
                Debug.WriteLine(string.Format("[WorkspaceWatcherService] FindProjectDirectory: {0}", ex.Message));
            }
            return Path.GetDirectoryName(filePath);
        }

        private void OnDebounceTimerElapsed(object sender, ElapsedEventArgs e)
        {
            List<WorkspaceChangedEventArgs> eventsToFire = new List<WorkspaceChangedEventArgs>();
            lock (_pendingLock)
            {
                foreach (var item in _pendingChanges.Values)
                {
                    eventsToFire.Add(item);
                }
                _pendingChanges.Clear();
            }

            foreach (var evt in eventsToFire)
            {
                try
                {
                    EventHandler<WorkspaceChangedEventArgs> handler = WorkspaceChanged;
                    if (handler != null)
                    {
                        handler(this, evt);
                    }
                }
                catch (Exception ex)
                {
                    Debug.WriteLine(string.Format("[WorkspaceWatcherService] Dispatch event error: {0}", ex.Message));
                }
            }
        }

        private void OnWatcherError(object sender, ErrorEventArgs e)
        {
            Exception ex = e.GetException();
            Debug.WriteLine(string.Format("[WorkspaceWatcherService] Watcher error on NAS: {0}", ex != null ? ex.Message : "Unknown"));

            // Attempt reconnect after 5 seconds if connection was interrupted
            Timer retryTimer = new Timer(5000);
            retryTimer.AutoReset = false;
            retryTimer.Elapsed += delegate
            {
                try
                {
                    if (!_isDisposed && !string.IsNullOrWhiteSpace(_currentWatchPath))
                    {
                        Start(_currentWatchPath);
                    }
                }
                catch (Exception rex)
                {
                    Debug.WriteLine(string.Format("[WorkspaceWatcherService] Reconnect failed: {0}", rex.Message));
                }
                finally
                {
                    retryTimer.Dispose();
                }
            };
            retryTimer.Start();
        }

        public void Dispose()
        {
            _isDisposed = true;
            Stop();
            if (_debounceTimer != null)
            {
                _debounceTimer.Dispose();
            }
        }
    }
}
