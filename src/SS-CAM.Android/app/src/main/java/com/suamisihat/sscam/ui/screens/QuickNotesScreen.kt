package com.suamisihat.sscam.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.ui.theme.*

data class QuickNote(
    val id: String,
    val category: String,
    val title: String,
    val body: String,
    val timeAgo: String,
    val tagColor: Color
)

@Composable
fun QuickNotesScreen() {
    val context = LocalContext.current
    val clipboardManager = LocalClipboardManager.current

    var newNoteText by remember { mutableStateOf("") }
    var selectedCategory by remember { mutableStateOf("💡 Hooks") }

    val initialNotes = remember {
        mutableStateListOf(
            QuickNote("1", "💡 Hooks", "TikTok Hook Formula: Reverse Psychology", "Jangan beli produk ini kalau korang taknak tenaga berpanjangan sampai malam...", "10m ago", SshWarmGold),
            QuickNote("2", "🎨 Visuals", "SSH Merdeka Packaging Glow", "Gunakan pantulan gold foil di tepi kotaknya supaya nampak lebih eksklusif semasa unboxing video.", "1h ago", SshAzure),
            QuickNote("3", "⚡ Urgent", "Video Export Ratio Checklist", "Pastikan TikTok & Reels export strictly 1080x1920 9:16 safe zone 250px bottom margin.", "3h ago", Color(0xFFEF4444)),
            QuickNote("4", "📝 Notes", "Meeting Takeaways with Marketing Lead", "Fokus bulan 9 adalah kempen Hari Malaysia. Semua asset mesti siap sebelum 5 Sept.", "Yesterday", Color(0xFF10B981))
        )
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Fast Note Input Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("QUICK SCRATCHPAD", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SshAzure)
                    Spacer(modifier = Modifier.height(8.dp))

                    TextField(
                        value = newNoteText,
                        onValueChange = { newNoteText = it },
                        placeholder = { Text("Tulis idea hook, formula, atau nota pantas...", fontSize = 13.sp, color = TextMuted) },
                        modifier = Modifier.fillMaxWidth(),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = DarkBackground,
                            unfocusedContainerColor = DarkBackground,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent
                        ),
                        shape = RoundedCornerShape(8.dp),
                        maxLines = 3
                    )

                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            listOf("💡 Hooks", "🎨 Visuals", "📝 Notes").forEach { cat ->
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(6.dp))
                                        .background(if (selectedCategory == cat) SshAzure else DarkBorder)
                                        .padding(horizontal = 8.dp, vertical = 4.dp),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Text(cat, fontSize = 11.sp, color = if (selectedCategory == cat) Color.White else TextSecondary)
                                }
                            }
                        }

                        Button(
                            onClick = {
                                if (newNoteText.isNotBlank()) {
                                    initialNotes.add(
                                        0,
                                        QuickNote(
                                            id = System.currentTimeMillis().toString(),
                                            category = selectedCategory,
                                            title = selectedCategory,
                                            body = newNoteText,
                                            timeAgo = "Just now",
                                            tagColor = if (selectedCategory.contains("Hook")) SshWarmGold else SshAzure
                                        )
                                    )
                                    newNoteText = ""
                                    Toast.makeText(context, "Nota disimpan!", Toast.LENGTH_SHORT).show()
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = SshAzure),
                            shape = RoundedCornerShape(6.dp),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp)
                        ) {
                            Text("Simpan", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Saved Notes Header
        item {
            Text("SAVED IDEAS & HOOKS (${initialNotes.size})", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
        }

        // Note Cards
        items(initialNotes) { note ->
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(note.tagColor.copy(alpha = 0.2f))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(note.category, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = note.tagColor)
                        }
                        Text(note.timeAgo, fontSize = 11.sp, color = TextMuted)
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Text(note.body, fontSize = 13.sp, color = TextPrimary, lineHeight = 18.sp)
                    Spacer(modifier = Modifier.height(10.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.End
                    ) {
                        OutlinedButton(
                            onClick = {
                                clipboardManager.setText(AnnotatedString(note.body))
                                Toast.makeText(context, "Disalin ke papan keratan!", Toast.LENGTH_SHORT).show()
                            },
                            shape = RoundedCornerShape(6.dp),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 4.dp)
                        ) {
                            Icon(Icons.Default.ContentCopy, contentDescription = null, modifier = Modifier.size(14.dp), tint = SshAzure)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Salin", fontSize = 11.sp, color = SshAzure)
                        }
                    }
                }
            }
        }
    }
}
