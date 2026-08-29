package com.suamisihat.sscam.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.ui.theme.*

data class RadioChannel(
    val id: String,
    val title: String,
    val genre: String,
    val bitRate: String,
    val accentColor: Color,
    val iconEmoji: String
)

@Composable
fun StudioRadioScreen() {
    val channels = remember {
        listOf(
            RadioChannel("1", "SuamiSihat Focus Lofi", "Lofi Chillhop / Study Beats", "320 kbps", SshAzure, "🎧"),
            RadioChannel("2", "Creative Coffeehouse Jazz", "Smooth Acoustic & Piano Jazz", "256 kbps", SshWarmGold, "☕"),
            RadioChannel("3", "Al-Quran 24/7 Live Stream", "Makkah Live & Tilawah Al-Quran", "192 kbps", Color(0xFF10B981), "📖"),
            RadioChannel("4", "Deep Rain & Alpha Waves", "Binaural Focus & Concentration", "320 kbps", Color(0xFF6366F1), "🌧️"),
            RadioChannel("5", "Cyberpunk Synthwave Studio", "Retro Wave & High-Tempo Coding", "320 kbps", Color(0xFFEC4899), "🎹")
        )
    }

    var selectedChannel by remember { mutableStateOf(channels[0]) }
    var isPlaying by remember { mutableStateOf(true) }
    var volume by remember { mutableStateOf(0.75f) }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Active Now Playing Hero Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(18.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Box(
                                modifier = Modifier
                                    .size(8.dp)
                                    .clip(CircleShape)
                                    .background(if (isPlaying) SshSuccessGreen else SshWarmGold)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(if (isPlaying) "LIVE STREAMING" else "PAUSED", color = if (isPlaying) SshSuccessGreen else SshWarmGold, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                        }
                        Text(selectedChannel.bitRate, color = TextMuted, fontSize = 11.sp)
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(56.dp)
                                .clip(RoundedCornerShape(12.dp))
                                .background(selectedChannel.accentColor.copy(alpha = 0.2f)),
                            contentAlignment = Alignment.Center
                        ) {
                            Text(selectedChannel.iconEmoji, fontSize = 28.sp)
                        }
                        Spacer(modifier = Modifier.width(14.dp))
                        Column {
                            Text(selectedChannel.title, fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text(selectedChannel.genre, fontSize = 12.sp, color = TextSecondary)
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Simulated Live Waveform Equalizer
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(28.dp),
                        horizontalArrangement = Arrangement.SpaceEvenly,
                        verticalAlignment = Alignment.Bottom
                    ) {
                        val heights = listOf(14, 24, 18, 28, 12, 22, 16, 26, 20, 10, 24, 18, 28, 15, 22)
                        heights.forEach { h ->
                            Box(
                                modifier = Modifier
                                    .width(4.dp)
                                    .height((if (isPlaying) h else 6).dp)
                                    .clip(RoundedCornerShape(2.dp))
                                    .background(selectedChannel.accentColor)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Player Controls
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        IconButton(onClick = { /* Previous */ }) {
                            Icon(Icons.Default.SkipPrevious, contentDescription = "Prev", tint = TextSecondary)
                        }

                        IconButton(
                            onClick = { isPlaying = !isPlaying },
                            modifier = Modifier
                                .size(48.dp)
                                .clip(CircleShape)
                                .background(selectedChannel.accentColor)
                        ) {
                            Icon(
                                if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = "Play/Pause",
                                tint = Color.White,
                                modifier = Modifier.size(24.dp)
                            )
                        }

                        IconButton(onClick = { /* Next */ }) {
                            Icon(Icons.Default.SkipNext, contentDescription = "Next", tint = TextSecondary)
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))

                    // Volume Slider
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.VolumeDown, contentDescription = null, tint = TextMuted, modifier = Modifier.size(16.dp))
                        Slider(
                            value = volume,
                            onValueChange = { volume = it },
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 8.dp),
                            colors = SliderDefaults.colors(
                                thumbColor = selectedChannel.accentColor,
                                activeTrackColor = selectedChannel.accentColor,
                                inactiveTrackColor = DarkBorder
                            )
                        )
                        Icon(Icons.Default.VolumeUp, contentDescription = null, tint = TextMuted, modifier = Modifier.size(16.dp))
                    }
                }
            }
        }

        // Available Studio Channels List
        item {
            Text("STUDIO AMBIENCE & CHANNELS", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
        }

        items(channels.size) { index ->
            val ch = channels[index]
            val isSelected = ch.id == selectedChannel.id
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = if (isSelected) Color(0xFF1E293B) else DarkSurfaceCard
                ),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { selectedChannel = ch }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(ch.iconEmoji, fontSize = 20.sp)
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(ch.title, fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium, color = if (isSelected) ch.accentColor else TextPrimary, fontSize = 13.sp)
                            Text(ch.genre, fontSize = 11.sp, color = TextSecondary)
                        }
                    }
                    if (isSelected && isPlaying) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(ch.accentColor.copy(alpha = 0.2f))
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text("PLAYING", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = ch.accentColor)
                        }
                    }
                }
            }
        }
    }
}
