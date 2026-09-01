using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using Newtonsoft.Json;

namespace SS_CAM.Linux.Services;

public class QuickNote
{
    public string Id       { get; set; } = Guid.NewGuid().ToString();
    public string Title    { get; set; } = "Untitled Note";
    public string Content  { get; set; } = string.Empty;
    public DateTime Created  { get; set; } = DateTime.Now;
    public DateTime Modified { get; set; } = DateTime.Now;
}

/// <summary>
/// JSON-backed quick notes storage. Stores notes in ~/.config/ss-cam/notes.json
/// Mirrors QuickNoteService from the Windows build.
/// </summary>
public class QuickNoteService
{
    private readonly string _notesPath;
    private List<QuickNote> _notes = new();

    public QuickNoteService()
    {
        var configDir = Path.Combine(
            Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
            ".config", "ss-cam");
        Directory.CreateDirectory(configDir);
        _notesPath = Path.Combine(configDir, "notes.json");
        Load();
    }

    public IReadOnlyList<QuickNote> Notes => _notes.AsReadOnly();

    public QuickNote Create(string title = "New Note")
    {
        var note = new QuickNote { Title = title };
        _notes.Insert(0, note);
        Save();
        return note;
    }

    public bool Save(QuickNote note)
    {
        try
        {
            var existing = _notes.Find(n => n.Id == note.Id);
            if (existing == null) return false;
            existing.Title    = note.Title;
            existing.Content  = note.Content;
            existing.Modified = DateTime.Now;
            Save();
            return true;
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[QuickNoteService] Save(note) error: {ex.Message}");
            return false;
        }
    }

    public bool Delete(string id)
    {
        try
        {
            int removed = _notes.RemoveAll(n => n.Id == id);
            Save();
            return removed > 0;
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[QuickNoteService] Delete error: {ex.Message}");
            return false;
        }
    }

    private void Load()
    {
        try
        {
            if (!File.Exists(_notesPath)) return;
            var json = File.ReadAllText(_notesPath);
            _notes = JsonConvert.DeserializeObject<List<QuickNote>>(json) ?? new();
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[QuickNoteService] Load error: {ex.Message}");
            _notes = new();
        }
    }

    private void Save()
    {
        try
        {
            var json = JsonConvert.SerializeObject(_notes, Formatting.Indented);
            File.WriteAllText(_notesPath, json);
        }
        catch (Exception ex)
        {
            Debug.WriteLine($"[QuickNoteService] Save error: {ex.Message}");
        }
    }
}
