using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using SS_CAM.Models;

namespace SS_CAM.Services
{
    public enum NotificationType
    {
        Info,
        Success,
        Warning,
        Error
    }

    public class NotificationEventArgs : EventArgs
    {
        public string Title { get; set; }
        public string Message { get; set; }
        public NotificationType Type { get; set; }
        public int DurationMs { get; set; }
        public NotificationItem Item { get; set; }

        public NotificationEventArgs(string title, string message, NotificationType type, int durationMs)
        {
            Title = title;
            Message = message;
            Type = type;
            DurationMs = durationMs;
            Item = null;
        }

        public NotificationEventArgs(string title, string message, NotificationType type, int durationMs, NotificationItem item)
        {
            Title = title;
            Message = message;
            Type = type;
            DurationMs = durationMs;
            Item = item;
        }
    }

    public static class NotificationService
    {
        public static event EventHandler<NotificationEventArgs> OnNotificationReceived;
        public static event EventHandler OnHistoryUpdated;

        private static readonly ObservableCollection<NotificationItem> _history = new ObservableCollection<NotificationItem>();
        private static readonly object _lock = new object();

        public static ObservableCollection<NotificationItem> History
        {
            get { return _history; }
        }

        public static int UnreadCount
        {
            get
            {
                int count = 0;
                lock (_lock)
                {
                    foreach (var item in _history)
                    {
                        if (!item.IsRead) count++;
                    }
                }
                return count;
            }
        }

        public static void Show(string title, string message, NotificationType type = NotificationType.Info, int durationMs = 4000, string projectPath = null)
        {
            NotificationItem item = new NotificationItem
            {
                Title = title,
                Message = message,
                Type = type,
                Timestamp = DateTime.Now,
                IsRead = false,
                ProjectPath = projectPath
            };

            lock (_lock)
            {
                // Max 50 items in memory history
                _history.Insert(0, item);
                while (_history.Count > 50)
                {
                    _history.RemoveAt(_history.Count - 1);
                }
            }

            EventHandler<NotificationEventArgs> handler = OnNotificationReceived;
            if (handler != null)
            {
                handler(null, new NotificationEventArgs(title, message, type, durationMs, item));
            }

            NotifyHistoryChanged();
        }

        public static void ShowInfo(string title, string message, string projectPath = null)
        {
            Show(title, message, NotificationType.Info, 4000, projectPath);
        }

        public static void ShowSuccess(string title, string message, string projectPath = null)
        {
            Show(title, message, NotificationType.Success, 4000, projectPath);
        }

        public static void ShowWarning(string title, string message, string projectPath = null)
        {
            Show(title, message, NotificationType.Warning, 5000, projectPath);
        }

        public static void ShowError(string title, string message, string projectPath = null)
        {
            Show(title, message, NotificationType.Error, 6000, projectPath);
        }

        public static void MarkAllAsRead()
        {
            lock (_lock)
            {
                foreach (var item in _history)
                {
                    item.IsRead = true;
                }
            }
            NotifyHistoryChanged();
        }

        public static void MarkAsRead(string id)
        {
            lock (_lock)
            {
                foreach (var item in _history)
                {
                    if (item.Id == id)
                    {
                        item.IsRead = true;
                        break;
                    }
                }
            }
            NotifyHistoryChanged();
        }

        public static void ClearAll()
        {
            lock (_lock)
            {
                _history.Clear();
            }
            NotifyHistoryChanged();
        }

        private static void NotifyHistoryChanged()
        {
            EventHandler handler = OnHistoryUpdated;
            if (handler != null)
            {
                handler(null, EventArgs.Empty);
            }
        }
    }
}
