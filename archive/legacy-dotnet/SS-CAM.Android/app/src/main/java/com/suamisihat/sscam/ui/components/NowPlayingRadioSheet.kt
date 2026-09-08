package com.suamisihat.sscam.ui.components

import android.content.Context
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeDown
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.ui.screens.ALL_CASSETTE_STATIONS
import com.suamisihat.sscam.ui.screens.StudioRadioManager
import com.suamisihat.sscam.ui.theme.*

/**
 * Animated Equalizer Bars for Live Radio Indication
 */
@Composable
fun AnimatedEqualizerBars(
    isAnimating: Boolean,
    color: Color = SshAzure,
    modifier: Modifier = Modifier
) {
    val infiniteTransition = rememberInfiniteTransition(label = "eq_bars")
    val bar1 by infiniteTransition.animateFloat(
        initialValue = 0.2f,
        targetValue = 0.95f,
        animationSpec = infiniteRepeatable(
            animation = tween(420, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "bar1"
    )
    val bar2 by infiniteTransition.animateFloat(
        initialValue = 0.8f,
        targetValue = 0.3f,
        animationSpec = infiniteRepeatable(
            animation = tween(350, easing = LinearEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "bar2"
    )
    val bar3 by infiniteTransition.animateFloat(
        initialValue = 0.35f,
        targetValue = 1.0f,
        animationSpec = infiniteRepeatable(
            animation = tween(480, easing = FastOutLinearInEasing),
            repeatMode = RepeatMode.Reverse
        ),
        label = "bar3"
    )

    Canvas(modifier = modifier.size(width = 14.dp, height = 14.dp)) {
        val totalWidth = size.width
        val maxHeight = size.height
        val barWidth = totalWidth / 5.5f
        val gap = (totalWidth - (barWidth * 3)) / 2f

        val heights = if (isAnimating) listOf(bar1, bar2, bar3) else listOf(0.3f, 0.5f, 0.3f)

        heights.forEachIndexed { index, fraction ->
            val h = (maxHeight * fraction).coerceAtLeast(3f)
            val left = index * (barWidth + gap)
            val top = maxHeight - h
            drawRoundRect(
                color = color,
                topLeft = Offset(left, top),
                size = Size(barWidth, h),
                cornerRadius = CornerRadius(2f, 2f)
            )
        }
    }
}

/**
 * Now Playing Radio Bottom Sheet with Station Playlist & Quick Controls
 */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun NowPlayingRadioBottomSheet(
    onDismiss: () -> Unit,
    onOpenFullRadio: () -> Unit
) {
    val context = LocalContext.current
    val colors = LocalSscamColors.current
    val currentStation = StudioRadioManager.getCurrentStation()
    val isPlaying = StudioRadioManager.isPlaying
    var volume by remember { mutableStateOf(StudioRadioManager.volume) }

    // Sync real-time live metadata when sheet opens
    LaunchedEffect(Unit) {
        StudioRadioManager.fetchAllStationsMetadata()
    }

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = colors.surface,
        scrimColor = Color.Black.copy(alpha = 0.55f),
        dragHandle = {
            BottomSheetDefaults.DragHandle(
                color = colors.textSecondary.copy(alpha = 0.4f)
            )
        },
        shape = RoundedCornerShape(topStart = 24.dp, topEnd = 24.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp)
        ) {
            // Header Row: Status & Dismiss
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    AnimatedEqualizerBars(
                        isAnimating = isPlaying,
                        color = if (colors.isDark) SshWarmGoldBright else SshAzure
                    )
                    Text(
                        text = if (isPlaying) "NOW PLAYING • LIVE" else "RADIO PAUSED",
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 1.2.sp,
                        color = if (isPlaying) (if (colors.isDark) SshWarmGoldBright else SshAzure) else colors.textSecondary
                    )
                }

                TextButton(
                    onClick = onOpenFullRadio,
                    contentPadding = PaddingValues(horizontal = 8.dp, vertical = 4.dp)
                ) {
                    Text(
                        text = "Full Lounge ↗",
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Bold,
                        color = if (colors.isDark) SshWarmGoldBright else SshAzure
                    )
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Active Playing Hero Card
            if (currentStation != null) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                    border = androidx.compose.foundation.BorderStroke(
                        1.2.dp,
                        if (isPlaying) (if (colors.isDark) SshWarmGoldBright.copy(alpha = 0.6f) else SshAzure.copy(alpha = 0.6f)) else colors.border
                    ),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.weight(1f)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .size(46.dp)
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(currentStation.shellColor),
                                    contentAlignment = Alignment.Center
                                ) {
                                    Icon(
                                        imageVector = currentStation.icon,
                                        contentDescription = null,
                                        tint = currentStation.labelColor,
                                        modifier = Modifier.size(24.dp)
                                    )
                                }

                                Spacer(modifier = Modifier.width(12.dp))

                                Column(modifier = Modifier.weight(1f)) {
                                    Text(
                                        text = StudioRadioManager.currentTrackTitle,
                                        fontSize = 14.5.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.textPrimary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = currentStation.name + " • " + currentStation.genre + " • " + currentStation.bitRate,
                                        fontSize = 11.sp,
                                        color = colors.textSecondary,
                                        maxLines = 1,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                }
                            }

                            // Play / Pause Toggle Button
                            IconButton(
                                onClick = {
                                    StudioRadioManager.togglePlayPause(currentStation, context)
                                },
                                modifier = Modifier
                                    .size(42.dp)
                                    .clip(CircleShape)
                                    .background(if (colors.isDark) SshWarmGoldBright else SshAzure)
                            ) {
                                Icon(
                                    imageVector = if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                    contentDescription = if (isPlaying) "Pause" else "Play",
                                    tint = if (colors.isDark) Color(0xFF0F172A) else Color.White,
                                    modifier = Modifier.size(22.dp)
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(12.dp))

                        // Volume Control Slider Row
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.VolumeDown,
                                contentDescription = "Volume Down",
                                tint = colors.textSecondary,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Slider(
                                value = volume,
                                onValueChange = {
                                    volume = it
                                    StudioRadioManager.setMasterVolume(it)
                                },
                                colors = SliderDefaults.colors(
                                    thumbColor = if (colors.isDark) SshWarmGoldBright else SshAzure,
                                    activeTrackColor = if (colors.isDark) SshWarmGoldBright else SshAzure,
                                    inactiveTrackColor = colors.border
                                ),
                                modifier = Modifier.weight(1f).height(24.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Icon(
                                imageVector = Icons.AutoMirrored.Filled.VolumeUp,
                                contentDescription = "Volume Up",
                                tint = colors.textSecondary,
                                modifier = Modifier.size(16.dp)
                            )
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))

            // Station Playlist Section Title
            Text(
                text = "RADIO PLAYLIST (${ALL_CASSETTE_STATIONS.size} STATIONS)",
                fontSize = 10.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.2.sp,
                color = colors.textSecondary,
                modifier = Modifier.padding(horizontal = 4.dp, vertical = 4.dp)
            )

            Spacer(modifier = Modifier.height(6.dp))

            // Scrollable Station List
            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 280.dp)
            ) {
                items(ALL_CASSETTE_STATIONS) { station ->
                    val isStationActive = (station.id == StudioRadioManager.currentStationId)
                    val isStationPlaying = isStationActive && isPlaying
                    val liveTrack = if (isStationPlaying) StudioRadioManager.currentTrackTitle else (StudioRadioManager.liveStationTracks[station.id] ?: station.defaultTrackTitle)

                    Surface(
                        shape = RoundedCornerShape(12.dp),
                        color = if (isStationActive) (if (colors.isDark) Color(0xFF1E293B) else Color(0xFFEFF6FF)) else Color.Transparent,
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            if (isStationActive) (if (colors.isDark) SshWarmGoldBright.copy(alpha = 0.5f) else SshAzure.copy(alpha = 0.5f)) else colors.border.copy(alpha = 0.5f)
                        ),
                        onClick = {
                            if (isStationActive) {
                                StudioRadioManager.togglePlayPause(station, context)
                            } else {
                                StudioRadioManager.play(station, context)
                            }
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 12.dp, vertical = 10.dp)
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(34.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(station.shellColor),
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = station.icon,
                                    contentDescription = null,
                                    tint = station.labelColor,
                                    modifier = Modifier.size(18.dp)
                                )
                            }

                            Spacer(modifier = Modifier.width(10.dp))

                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = liveTrack,
                                    fontSize = 12.5.sp,
                                    fontWeight = if (isStationActive) FontWeight.Bold else FontWeight.SemiBold,
                                    color = if (isStationActive) (if (colors.isDark) SshWarmGoldBright else SshAzure) else colors.textPrimary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                                Text(
                                    text = station.name + " • " + station.genre,
                                    fontSize = 10.5.sp,
                                    color = colors.textSecondary,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }

                            if (isStationPlaying) {
                                AnimatedEqualizerBars(
                                    isAnimating = true,
                                    color = if (colors.isDark) SshWarmGoldBright else SshAzure,
                                    modifier = Modifier.padding(end = 6.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
