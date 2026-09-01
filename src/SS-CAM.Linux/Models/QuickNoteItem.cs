namespace SS_CAM.Linux.Models;

public class QuickNoteItem
{
    public string Id       { get; set; } = System.Guid.NewGuid().ToString();
    public string Title    { get; set; } = "Untitled Note";
    public string Content  { get; set; } = string.Empty;
    public string Modified { get; set; } = System.DateTime.Now.ToString("dd MMM, HH:mm");
}
