package com.suamisihat.sscam.ui.screens

import android.content.Context
import android.widget.Toast
import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.StickyNote2
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.suamisihat.sscam.AuthPreferences
import com.suamisihat.sscam.data.api.CreateNoteRequest
import com.suamisihat.sscam.data.api.NoteItemDto
import com.suamisihat.sscam.data.api.SscamApiService
import com.suamisihat.sscam.data.sync.SyncQueueManager
import com.suamisihat.sscam.ui.components.*
import com.suamisihat.sscam.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class StudioNote(
    val id: String,
    val title: String,
    val body: String,
    val priority: String = "normal",
    val isPinned: Boolean = false,
    val dateText: String = "",
    val modified: Long = 0L
)

object QuickNotesCache {
    private const val PREFS_NAME = "sscam_quick_notes_cache"
    private const val KEY_CACHED_NOTES = "cached_notes_json"

    fun getCachedNotes(context: Context): List<StudioNote> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val json = prefs.getString(KEY_CACHED_NOTES, null) ?: return emptyList()
        val type = object : TypeToken<List<StudioNote>>() {}.type
        return try {
            Gson().fromJson(json, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveCachedNotes(context: Context, notes: List<StudioNote>) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val json = Gson().toJson(notes)
        prefs.edit().putString(KEY_CACHED_NOTES, json).apply()
    }
}

@Composable
fun QuickNotesScreen() {
    QuickNotesContentView()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun QuickNotesContentView() {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current
    val colors = LocalSscamColors.current
    val scope = rememberCoroutineScope()

    var searchQuery by remember { mutableStateOf("") }
    var selectedFilter by remember { mutableStateOf("All") } // All, Pinned, High, Medium, Normal
    var isAddNoteOpen by remember { mutableStateOf(false) }
    var editingNote by remember { mutableStateOf<StudioNote?>(null) }
    var isLoading by remember { mutableStateOf(false) }
    var syncStatusText by remember { mutableStateOf("SYNCHRONIZED") }

    val notes = remember { mutableStateListOf<StudioNote>() }

    suspend fun fetchLiveNotes() {
        try {
            val token = AuthPreferences.getSavedToken(context)
            val api = SscamApiService.create(authToken = token)
            SyncQueueManager.flushQueue(context, api)

            val res = withContext(Dispatchers.IO) { api.getNotes() }
            if (res.isSuccessful && res.body()?.success == true) {
                val liveDtos = res.body()?.notes ?: emptyList()
                if (liveDtos.isNotEmpty()) {
                    val liveNotes = liveDtos.map { dto ->
                        StudioNote(
                            id = dto.id,
                            title = dto.title,
                            body = dto.body,
                            priority = dto.priority,
                            isPinned = dto.isPinned,
                            dateText = dto.dateText,
                            modified = dto.modified.toLong()
                        )
                    }
                    notes.clear()
                    notes.addAll(liveNotes)
                    QuickNotesCache.saveCachedNotes(context, liveNotes)
                }
                syncStatusText = "LIVE NAS SYNC"
            } else {
                syncStatusText = "OFFLINE CACHED"
            }
        } catch (e: Exception) {
            syncStatusText = "OFFLINE CACHED"
        }
    }

    // Load initial cached notes and poll for live updates
    LaunchedEffect(Unit) {
        val cached = QuickNotesCache.getCachedNotes(context)
        if (cached.isNotEmpty()) {
            notes.clear()
            notes.addAll(cached)
        }

        isLoading = true
        fetchLiveNotes()
        isLoading = false

        while (true) {
            kotlinx.coroutines.delay(20_000)
            fetchLiveNotes()
        }
    }

    fun syncNoteToServer(note: StudioNote) {
        val currentUsername = AuthPreferences.getSavedUsername(context)
        scope.launch(Dispatchers.IO) {
            val noteReq = CreateNoteRequest(
                id = note.id,
                title = note.title,
                body = note.body,
                isPinned = note.isPinned,
                priority = note.priority,
                user = currentUsername
            )
            try {
                val token = AuthPreferences.getSavedToken(context)
                val api = SscamApiService.create(authToken = token)
                val res = api.createNote(noteReq)
                if (!res.isSuccessful) {
                    SyncQueueManager.queueCreateNote(context, noteReq)
                }
            } catch (e: Exception) {
                SyncQueueManager.queueCreateNote(context, noteReq)
            }
        }
    }

    fun deleteNoteFromServer(noteId: String) {
        scope.launch(Dispatchers.IO) {
            try {
                val token = AuthPreferences.getSavedToken(context)
                val api = SscamApiService.create(authToken = token)
                val res = api.deleteNote(noteId)
                if (!res.isSuccessful) {
                    SyncQueueManager.queueDeleteNote(context, noteId)
                }
            } catch (e: Exception) {
                SyncQueueManager.queueDeleteNote(context, noteId)
            }
        }
    }

    val filterOptions = listOf("All", "Pinned", "P2 (High)", "P1 (Medium)", "Low")

    val filteredNotes = notes.filter { note ->
        val matchesFilter = when (selectedFilter) {
            "All" -> true
            "Pinned" -> note.isPinned
            "P2 (High)" -> note.priority.equals("high", ignoreCase = true)
            "P1 (Medium)" -> note.priority.equals("medium", ignoreCase = true)
            "Low" -> note.priority.equals("normal", ignoreCase = true) || note.priority.equals("low", ignoreCase = true)
            else -> true
        }
        val matchesSearch = searchQuery.isBlank() ||
                note.title.contains(searchQuery, ignoreCase = true) ||
                note.body.contains(searchQuery, ignoreCase = true)
        matchesFilter && matchesSearch
    }

    Box(modifier = Modifier.fillMaxSize()) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            // 1. Sleek Search & New Note Action Row
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Search Input
                    Surface(
                        color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                        modifier = Modifier
                            .weight(1f)
                            .height(38.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 10.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Search,
                                contentDescription = null,
                                tint = colors.textMuted,
                                modifier = Modifier.size(15.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            BasicTextField(
                                value = searchQuery,
                                onValueChange = { searchQuery = it },
                                singleLine = true,
                                textStyle = TextStyle(
                                    fontSize = 12.sp,
                                    color = colors.textPrimary
                                ),
                                cursorBrush = SolidColor(colors.primary),
                                modifier = Modifier.fillMaxWidth(),
                                decorationBox = { innerTextField ->
                                    if (searchQuery.isEmpty()) {
                                        Text(
                                            "Search notes, specs...",
                                            fontSize = 11.5.sp,
                                            color = colors.textMuted
                                        )
                                    }
                                    innerTextField()
                                }
                            )
                        }
                    }

                    // Compact New Note Button
                    TactileButton(
                        onClick = {
                            editingNote = null
                            isAddNoteOpen = true
                        },
                        icon = Icons.Default.Add,
                        text = "New Note",
                        height = 38.dp
                    )
                }
            }

            // 2. Filter Pills + Live Sync Status Row
            item {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    LazyRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        modifier = Modifier.weight(1f, fill = false)
                    ) {
                        items(filterOptions) { filter ->
                            val isSelected = selectedFilter == filter
                            Surface(
                                color = if (isSelected) (if (colors.isMonochrome) Color(0xFF18181B) else colors.primary) else colors.surface,
                                shape = RoundedCornerShape(12.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) Color.Transparent else colors.border),
                                modifier = Modifier.clickable { selectedFilter = filter }
                            ) {
                                Text(
                                    text = filter,
                                    fontSize = 10.5.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                                    color = if (isSelected) Color.White else colors.textPrimary,
                                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
                                )
                            }
                        }
                    }

                    // Compact Live Sync Indicator
                    Surface(
                        color = if (colors.isMonochrome) Color(0xFFE4E4E7) else if (syncStatusText.contains("LIVE")) SshSuccessGreen.copy(alpha = 0.15f) else Color(0xFFD97706).copy(alpha = 0.15f),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(0.8.dp, if (colors.isMonochrome) Color(0xFFD4D4D8) else if (syncStatusText.contains("LIVE")) SshSuccessGreen else Color(0xFFD97706))
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(5.dp)
                                    .clip(CircleShape)
                                    .background(if (syncStatusText.contains("LIVE")) SshSuccessGreen else Color(0xFFD97706))
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = if (syncStatusText.contains("LIVE")) "LIVE NAS" else "OFFLINE",
                                fontSize = 8.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (syncStatusText.contains("LIVE")) SshSuccessGreen else Color(0xFFD97706)
                            )
                        }
                    }
                }
            }

            // 3. Notes List (Empty State or Tactile Note Cards)
            if (filteredNotes.isEmpty()) {
                item {
                    TactileCard(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp)
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(16.dp),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Icon(
                                Icons.AutoMirrored.Filled.StickyNote2,
                                contentDescription = null,
                                tint = colors.textMuted,
                                modifier = Modifier.size(28.dp)
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                "No Quick Notes",
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textPrimary
                            )
                            Text(
                                "Tap '+ New Note' to capture specs, hooks & reminders synced with NAS.",
                                fontSize = 11.sp,
                                color = colors.textSecondary,
                                textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                                modifier = Modifier.padding(top = 2.dp)
                            )
                        }
                    }
                }
            } else {
                items(filteredNotes, key = { it.id }) { note ->
                    TactileNoteCard(
                        note = note,
                        onPinToggle = {
                            val updated = note.copy(isPinned = !note.isPinned)
                            val idx = notes.indexOfFirst { it.id == note.id }
                            if (idx >= 0) notes[idx] = updated
                            QuickNotesCache.saveCachedNotes(context, notes)
                            syncNoteToServer(updated)
                        },
                        onEdit = {
                            editingNote = note
                            isAddNoteOpen = true
                        },
                        onDelete = {
                            notes.removeAll { it.id == note.id }
                            QuickNotesCache.saveCachedNotes(context, notes)
                            deleteNoteFromServer(note.id)
                            Toast.makeText(context, "Note deleted", Toast.LENGTH_SHORT).show()
                        },
                        onCopy = {
                            clipboardManager.setText(AnnotatedString("${note.title}\n\n${note.body}"))
                            Toast.makeText(context, "Copied note to clipboard", Toast.LENGTH_SHORT).show()
                        }
                    )
                }
            }
        }
    }

    // Add / Edit Note Bottom Sheet
    if (isAddNoteOpen) {
        var noteTitle by remember { mutableStateOf(editingNote?.title ?: "") }
        var noteBody by remember { mutableStateOf(editingNote?.body ?: "") }
        var notePriority by remember { mutableStateOf(editingNote?.priority ?: "normal") }
        var isPinned by remember { mutableStateOf(editingNote?.isPinned ?: false) }

        val scrollState = androidx.compose.foundation.rememberScrollState()
        ModalBottomSheet(
            onDismissRequest = { isAddNoteOpen = false },
            containerColor = colors.card,
            dragHandle = { BottomSheetDefaults.DragHandle() }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(scrollState)
                    .imePadding()
                    .padding(horizontal = 20.dp, vertical = 12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = if (editingNote != null) "Edit Studio Note" else "New Studio Note",
                        fontSize = 17.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary
                    )

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconButton(onClick = { isPinned = !isPinned }) {
                            Icon(
                                Icons.Default.PushPin,
                                contentDescription = "Pin Note",
                                tint = if (isPinned) (if (colors.isMonochrome) Color(0xFF18181B) else SshWarmGoldBright) else colors.textMuted
                            )
                        }
                        IconButton(
                            onClick = {
                                if (noteTitle.isNotBlank()) {
                                    val noteId = editingNote?.id ?: "note_${System.currentTimeMillis()}"
                                    val newNote = StudioNote(
                                        id = noteId,
                                        title = noteTitle.trim(),
                                        body = noteBody.trim(),
                                        priority = notePriority,
                                        isPinned = isPinned,
                                        dateText = "Just now",
                                        modified = System.currentTimeMillis()
                                    )
                                    val idx = notes.indexOfFirst { it.id == noteId }
                                    if (idx >= 0) notes[idx] = newNote else notes.add(0, newNote)
                                    QuickNotesCache.saveCachedNotes(context, notes)
                                    syncNoteToServer(newNote)
                                    isAddNoteOpen = false
                                    Toast.makeText(context, "Note saved & synced to NAS", Toast.LENGTH_SHORT).show()
                                }
                            }
                        ) {
                            Icon(Icons.Default.Check, contentDescription = "Save Note", tint = SshSuccessGreen)
                        }
                        IconButton(onClick = { isAddNoteOpen = false }) {
                            Icon(Icons.Default.Close, contentDescription = "Close", tint = colors.textMuted)
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Title Input
                OutlinedTextField(
                    value = noteTitle,
                    onValueChange = { noteTitle = it },
                    label = { Text("Note Title", fontSize = 12.sp) },
                    singleLine = true,
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.primary,
                        unfocusedBorderColor = colors.border
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Priority Selector Pills
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Priority:", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = colors.textSecondary)
                    listOf("normal" to "Low", "medium" to "P1", "high" to "P2").forEach { (pKey, pLabel) ->
                        val isSel = notePriority.equals(pKey, ignoreCase = true)
                        val pColor = when (pKey) {
                            "high" -> Color(0xFFDC2626)
                            "medium" -> Color(0xFFD97706)
                            else -> colors.primary
                        }
                        Surface(
                            color = if (isSel) pColor else colors.surface,
                            shape = RoundedCornerShape(8.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, if (isSel) Color.Transparent else colors.border),
                            modifier = Modifier.clickable { notePriority = pKey }
                        ) {
                            Text(
                                text = pLabel,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isSel) Color.White else colors.textPrimary,
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(10.dp))

                // Body Markdown Text Area
                OutlinedTextField(
                    value = noteBody,
                    onValueChange = { noteBody = it },
                    label = { Text("Markdown Body / Specifications", fontSize = 12.sp) },
                    shape = RoundedCornerShape(10.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.primary,
                        unfocusedBorderColor = colors.border
                    ),
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(180.dp)
                )

                Spacer(modifier = Modifier.height(16.dp))

                // Save Tactile Button
                TactileButton(
                    onClick = {
                        if (noteTitle.isNotBlank()) {
                            val noteId = editingNote?.id ?: "note_${System.currentTimeMillis()}"
                            val newNote = StudioNote(
                                id = noteId,
                                title = noteTitle.trim(),
                                body = noteBody.trim(),
                                priority = notePriority,
                                isPinned = isPinned,
                                dateText = "Just now",
                                modified = System.currentTimeMillis()
                            )
                            val idx = notes.indexOfFirst { it.id == noteId }
                            if (idx >= 0) notes[idx] = newNote else notes.add(0, newNote)
                            QuickNotesCache.saveCachedNotes(context, notes)
                            syncNoteToServer(newNote)
                            isAddNoteOpen = false
                            Toast.makeText(context, "Note saved & synced to NAS", Toast.LENGTH_SHORT).show()
                        }
                    },
                    text = if (editingNote != null) "UPDATE & SYNC NOTE" else "SAVE & SYNC TO DESKTOP",
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(16.dp))
            }
        }
    }
}

/**
 * Tactile Stationery Note Card Component
 */
@Composable
fun TactileNoteCard(
    note: StudioNote,
    onPinToggle: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit,
    onCopy: () -> Unit
) {
    val colors = LocalSscamColors.current
    val prioColor = when (note.priority.lowercase()) {
        "high" -> Color(0xFFDC2626)
        "medium" -> Color(0xFFD97706)
        else -> if (colors.isMonochrome) Color(0xFF18181B) else colors.primary
    }

    TactileCard(
        showCornerScrews = false,
        cornerRadius = 14.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            // Top Bar: Pin Badge, Title, Priority Stamp & Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.weight(1f)
                ) {
                    if (note.isPinned) {
                        Surface(
                            color = if (colors.isMonochrome) Color(0xFF18181B) else SshWarmGoldBright,
                            shape = RoundedCornerShape(4.dp),
                            modifier = Modifier.padding(end = 6.dp)
                        ) {
                            Icon(
                                Icons.Default.PushPin,
                                contentDescription = "Pinned",
                                tint = Color.White,
                                modifier = Modifier
                                    .size(14.dp)
                                    .padding(2.dp)
                            )
                        }
                    }

                    Text(
                        text = note.title,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Bold,
                        color = colors.textPrimary,
                        maxLines = 1
                    )
                }

                // Priority Stamp Badge (P3 / P2 / P1, Low has no badge)
                val prioBadge = when (note.priority.lowercase().trim()) {
                    "urgent" -> "P3"
                    "high" -> "P2"
                    "medium" -> "P1"
                    else -> ""
                }
                if (prioBadge.isNotEmpty()) {
                    Surface(
                        color = prioColor.copy(alpha = 0.15f),
                        shape = RoundedCornerShape(4.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, prioColor.copy(alpha = 0.4f))
                    ) {
                        Text(
                            text = " $prioBadge ",
                            fontSize = 9.sp,
                            fontWeight = FontWeight.Bold,
                            color = prioColor
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Body Markdown Text
            Text(
                text = note.body,
                fontSize = 11.5.sp,
                color = colors.textSecondary,
                lineHeight = 16.sp,
                maxLines = 4
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Footer: Timestamp + Quick Action Buttons
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = note.dateText.ifEmpty { "Synced" },
                    fontSize = 9.5.sp,
                    color = colors.textMuted
                )

                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    IconButton(onClick = onCopy, modifier = Modifier.size(26.dp)) {
                        Icon(Icons.Default.ContentCopy, contentDescription = "Copy", tint = colors.textMuted, modifier = Modifier.size(14.dp))
                    }
                    IconButton(onClick = onPinToggle, modifier = Modifier.size(26.dp)) {
                        Icon(
                            imageVector = if (note.isPinned) Icons.Default.PushPin else Icons.Default.VerticalAlignTop,
                            contentDescription = "Pin",
                            tint = if (note.isPinned) SshWarmGoldBright else colors.textMuted,
                            modifier = Modifier.size(14.dp)
                        )
                    }
                    IconButton(onClick = onEdit, modifier = Modifier.size(26.dp)) {
                        Icon(Icons.Default.Edit, contentDescription = "Edit", tint = colors.textMuted, modifier = Modifier.size(14.dp))
                    }
                    IconButton(onClick = onDelete, modifier = Modifier.size(26.dp)) {
                        Icon(Icons.Default.Delete, contentDescription = "Delete", tint = colors.textMuted, modifier = Modifier.size(14.dp))
                    }
                }
            }
        }
    }
}
