using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows;

namespace SS_CAM.Services
{
    public static class ClipboardService
    {
        public static bool SetText(string text)
        {
            if (text == null) text = string.Empty;

            for (int attempt = 1; attempt <= 3; attempt++)
            {
                try
                {
                    Clipboard.SetText(text);
                    return true;
                }
                catch (ExternalException ex)
                {
                    Debug.WriteLine(string.Format("[ClipboardService] Attempt {0} failed (ExternalException): {1}", attempt, ex.Message));
                    Thread.Sleep(50 * attempt);
                }
                catch (Exception ex)
                {
                    Debug.WriteLine(string.Format("[ClipboardService] Attempt {0} error: {1}", attempt, ex.Message));
                    break;
                }
            }

            return false;
        }
    }
}
