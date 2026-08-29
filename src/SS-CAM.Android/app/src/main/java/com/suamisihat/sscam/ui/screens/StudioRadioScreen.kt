package com.suamisihat.sscam.ui.screens

import android.content.Context
import android.media.AudioAttributes
import android.media.MediaPlayer
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
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
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.ui.components.FluentCard
import com.suamisihat.sscam.ui.theme.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

/**
 * Radio Preferences for Persisting Favorites and Last Station (Desktop Client Parity)
 */
object RadioPreferences {
    private const val PREFS_NAME = "sscam_radio_prefs"
    private const val KEY_FAVORITES = "favorite_station_ids"
    private const val KEY_LAST_STATION = "last_station_id"

    fun getFavorites(context: Context): Set<String> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getStringSet(KEY_FAVORITES, setOf("preset_suamisihat", "preset_animefm")) ?: setOf("preset_suamisihat", "preset_animefm")
    }

    fun toggleFavorite(context: Context, stationId: String): Set<String> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val current = getFavorites(context).toMutableSet()
        if (current.contains(stationId)) {
            current.remove(stationId)
        } else {
            current.add(stationId)
        }
        prefs.edit().putStringSet(KEY_FAVORITES, current).apply()
        return current
    }

    fun saveLastStation(context: Context, stationId: String) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_LAST_STATION, stationId).apply()
    }

    fun getLastStation(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return prefs.getString(KEY_LAST_STATION, "preset_suamisihat") ?: "preset_suamisihat"
    }
}

/**
 * Singleton Audio Streaming Engine for SS-CAM Lo-Fi & Broadcast Radio
 * Keeps audio playing reliably in the background across screens and tabs.
 */
object StudioRadioManager {
    private var mediaPlayer: MediaPlayer? = null
    var isPlaying by mutableStateOf(false)
    var isBuffering by mutableStateOf(false)
    var currentStationId by mutableStateOf("preset_suamisihat")
    var volume by mutableStateOf(0.85f)
    var statusText by mutableStateOf("STANDBY")

    fun play(station: CassetteRadioStation, context: Context? = null) {
        currentStationId = station.id
        isPlaying = true
        isBuffering = true
        statusText = "BUFFERING..."
        context?.let { RadioPreferences.saveLastStation(it, station.id) }

        CoroutineScope(Dispatchers.IO).launch {
            try {
                mediaPlayer?.let {
                    if (it.isPlaying) it.stop()
                    it.release()
                }
                val mp = MediaPlayer().apply {
                    setAudioAttributes(
                        AudioAttributes.Builder()
                            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                            .setUsage(AudioAttributes.USAGE_MEDIA)
                            .build()
                    )
                    setDataSource(station.streamUrl)
                    setVolume(volume, volume)
                    setOnPreparedListener { player ->
                        player.start()
                        CoroutineScope(Dispatchers.Main).launch {
                            StudioRadioManager.isBuffering = false
                            StudioRadioManager.isPlaying = true
                            StudioRadioManager.statusText = "LIVE ${station.bitRate}"
                        }
                    }
                    setOnErrorListener { _, what, extra ->
                        CoroutineScope(Dispatchers.Main).launch {
                            StudioRadioManager.isBuffering = false
                            StudioRadioManager.isPlaying = false
                            StudioRadioManager.statusText = "STREAM OFFLINE ($what)"
                        }
                        false
                    }
                    prepareAsync()
                }
                mediaPlayer = mp
            } catch (e: Exception) {
                CoroutineScope(Dispatchers.Main).launch {
                    StudioRadioManager.isBuffering = false
                    StudioRadioManager.isPlaying = false
                    StudioRadioManager.statusText = "STREAM ERROR"
                }
            }
        }
    }

    fun togglePlayPause(station: CassetteRadioStation, context: Context? = null) {
        if (isPlaying) {
            pause()
        } else {
            if (currentStationId == station.id && mediaPlayer != null) {
                try {
                    mediaPlayer?.start()
                    isPlaying = true
                    statusText = "LIVE ${station.bitRate}"
                } catch (e: Exception) {
                    play(station, context)
                }
            } else {
                play(station, context)
            }
        }
    }

    fun pause() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) {
                    it.pause()
                }
            }
            isPlaying = false
            statusText = "PAUSED"
        } catch (e: Exception) { }
    }

    fun stop() {
        try {
            mediaPlayer?.let {
                if (it.isPlaying) it.stop()
                it.release()
            }
            mediaPlayer = null
            isPlaying = false
            isBuffering = false
            statusText = "STANDBY"
        } catch (e: Exception) { }
    }

    fun setMasterVolume(newVolume: Float) {
        volume = newVolume
        try {
            mediaPlayer?.setVolume(newVolume, newVolume)
        } catch (e: Exception) { }
    }

    fun getCurrentStation(): CassetteRadioStation? {
        return ALL_CASSETTE_STATIONS.find { it.id == currentStationId } ?: ALL_CASSETTE_STATIONS.firstOrNull()
    }

    fun getCurrentStationName(): String {
        return getCurrentStation()?.name ?: "SuamiSihat Radio"
    }
}

data class CassetteRadioStation(
    val id: String,
    val name: String,
    val genre: String,
    val streamUrl: String,
    val shellColor: Color,
    val labelColor: Color,
    val icon: ImageVector,
    val description: String,
    val metaInfo: String,
    val bitRate: String = "320 kbps"
)

val ALL_CASSETTE_STATIONS: List<CassetteRadioStation> = listOf(
    CassetteRadioStation(
        id = "preset_suamisihat",
        name = "SuamiSihat Radio",
        genre = "Health / Lifestyle",
        streamUrl = "https://dj.suamisihat.myds.me/listen/suamisihat-radio/radio.mp3",
        shellColor = Color(0xFF1E3A8A), // Classic Cobalt Navy
        labelColor = Color(0xFFF8FAFC),
        icon = Icons.Default.Radio,
        description = "Official SuamiSihat Radio — health, wellness & lifestyle broadcasting 24/7.",
        metaInfo = "2026-08 • 320 kbps • Malaysia / Official HQ"
    ),
    CassetteRadioStation(
        id = "preset_animefm",
        name = "AnimeFM / BABYMETAL",
        genre = "Anime / J-Rock / Metal",
        streamUrl = "https://animefm.stream.laut.fm/animefm",
        shellColor = Color(0xFFBE185D), // Cherry Blossom / Deep Crimson
        labelColor = Color(0xFFFFF1F2),
        icon = Icons.Default.Tv,
        description = "24/7 Anime OSTs, BABYMETAL, J-Rock, and high-energy Japanese anime soundtrack.",
        metaInfo = "2026-08 • 192 kbps • Tokyo / AnimeFM"
    ),
    CassetteRadioStation(
        id = "preset_initiald",
        name = "Initial D Eurobeat Broadcast",
        genre = "Eurobeat / High Energy",
        streamUrl = "http://165.227.19.100:9001/listen.aac",
        shellColor = Color(0xFF991B1B), // Racing Red
        labelColor = Color(0xFFFEE2E2),
        icon = Icons.Default.Speed,
        description = "24/7 Initial D & Eurobeat high-energy workstation radio for rapid sprint design.",
        metaInfo = "2026-08 • 320 kbps • Eurobeat / High Tempo"
    ),
    CassetteRadioStation(
        id = "preset_lofifocus",
        name = "Lo-Fi Focus Beats",
        genre = "Focus / Lo-Fi",
        streamUrl = "https://stream.bigfm.de/lofifocus/mp3-128/radiobrowser",
        shellColor = Color(0xFF9A3412), // Retro Terracotta Amber
        labelColor = Color(0xFFFEF3C7),
        icon = Icons.Default.Headphones,
        description = "Chillhop lo-fi beats to relax and code/design to in uninterrupted flow.",
        metaInfo = "2026-08 • 128 kbps • Chillhop / Deep Work"
    ),
    CassetteRadioStation(
        id = "preset_chillhop",
        name = "Chillhop Lounge",
        genre = "Focus / Lo-Fi",
        streamUrl = "https://stream.laut.fm/lofi",
        shellColor = Color(0xFF581C87), // Dusk Royal Violet
        labelColor = Color(0xFFF3E8FF),
        icon = Icons.Default.Coffee,
        description = "Smooth lo-fi chillhop background tracks crafted for designers and editors.",
        metaInfo = "2026-08 • 192 kbps • Laut.fm / Study Beats"
    ),
    CassetteRadioStation(
        id = "preset_nightwave",
        name = "Nightwave Plaza",
        genre = "Synthwave / Vaporwave",
        streamUrl = "https://radio.plaza.one/mp3",
        shellColor = Color(0xFF1E293B), // Vintage Slate Black
        labelColor = Color(0xFFE2E8F0),
        icon = Icons.Default.GraphicEq,
        description = "24/7 Aesthetic Vaporwave & Synthwave soundtrack for late-night designing.",
        metaInfo = "2026-08 • 320 kbps • Tokyo / Aesthetic Synth"
    ),
    CassetteRadioStation(
        id = "preset_groovesalad",
        name = "SomaFM: Groove Salad",
        genre = "Downtempo / Ambient",
        streamUrl = "https://ice6.somafm.com/groovesalad-256-mp3",
        shellColor = Color(0xFF065F46), // Jade Emerald Green
        labelColor = Color(0xFFD1FAE5),
        icon = Icons.Default.Spa,
        description = "A nicely chilled plate of ambient/downtempo beats and grooves for creative flow.",
        metaInfo = "2026-08 • 256 kbps • San Francisco / SomaFM"
    ),
    CassetteRadioStation(
        id = "preset_smoothjazz",
        name = "Smooth Jazz Workstation",
        genre = "Jazz / Chill",
        streamUrl = "https://0nlineradio.radioho.st/0r-jazz?ref=radio-browser",
        shellColor = Color(0xFF78350F), // Espresso Amber
        labelColor = Color(0xFFFEF3C7),
        icon = Icons.Default.MusicNote,
        description = "Smooth instrumental acoustic and piano jazz for deep creative concentration.",
        metaInfo = "2026-08 • 256 kbps • Smooth Jazz / Focus"
    ),
    CassetteRadioStation(
        id = "preset_bfm899",
        name = "BFM 89.9 The Business",
        genre = "Talk / News",
        streamUrl = "https://stream.rcs.revma.com/s91qy9p0zs3vv",
        shellColor = Color(0xFF0F766E), // Business Teal
        labelColor = Color(0xFFCCFBF1),
        icon = Icons.Default.Mic,
        description = "Malaysia's premier business, economy and corporate current affairs radio station.",
        metaInfo = "2026-08 • 128 kbps • Kuala Lumpur / BFM"
    )
)

@Composable
fun StudioRadioScreen() {
    StudioRadioContentView()
}

@Composable
fun StudioRadioContentView() {
    val colors = LocalSscamColors.current
    val context = LocalContext.current

    var favoriteStationIds by remember { mutableStateOf(RadioPreferences.getFavorites(context)) }
    var selectedFilter by remember { mutableStateOf(0) } // 0 = All, 1 = Favorites
    val allStations = ALL_CASSETTE_STATIONS

    val displayStations = remember(selectedFilter, favoriteStationIds, allStations) {
        if (selectedFilter == 1) {
            allStations.filter { favoriteStationIds.contains(it.id) }.ifEmpty { allStations }
        } else {
            allStations
        }
    }

    val isPlaying = StudioRadioManager.isPlaying
    val isBuffering = StudioRadioManager.isBuffering
    val volume = StudioRadioManager.volume
    val statusText = StudioRadioManager.statusText
    val currentStationId = StudioRadioManager.currentStationId

    val selectedIndex = remember(currentStationId, displayStations) {
        val idx = displayStations.indexOfFirst { it.id == currentStationId }
        if (idx >= 0) idx else 0
    }
    val activeStation = if (displayStations.isNotEmpty()) displayStations[selectedIndex] else allStations[0]
    val isCurrentStationFavorite = favoriteStationIds.contains(activeStation.id)

    // High performance Spool Rotation Animation
    val infiniteTransition = rememberInfiniteTransition(label = "SpoolSpin")
    val spoolAngle by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = if (isPlaying) 360f else 0f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 2000, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "SpoolRotation"
    )

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. Retro Header
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp, vertical = 2.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            Icons.Default.Podcasts,
                            contentDescription = null,
                            tint = if (colors.isMonochrome) Color(0xFF18181B) else colors.primary,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            text = "TRACKS & CASSETTES",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.textPrimary,
                            letterSpacing = 1.sp
                        )
                    }

                    val liveBadgeBg = if (colors.isMonochrome) Color(0xFFF4F4F5) else if (isPlaying) SshSuccessGreen.copy(alpha = 0.15f) else colors.surface
                    val liveBadgeBorder = if (colors.isMonochrome) Color(0xFFD4D4D8) else if (isPlaying) SshSuccessGreen else colors.border
                    val liveDotColor = if (colors.isMonochrome) (if (isPlaying) Color(0xFF18181B) else Color(0xFF71717A)) else if (isPlaying) SshSuccessGreen else colors.textMuted
                    val liveTextColor = if (colors.isMonochrome) Color(0xFF18181B) else if (isPlaying) SshSuccessGreen else colors.textSecondary

                    Surface(
                        color = liveBadgeBg,
                        shape = RoundedCornerShape(12.dp),
                        border = androidx.compose.foundation.BorderStroke(
                            1.dp,
                            liveBadgeBorder
                        )
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Box(
                                modifier = Modifier
                                    .size(7.dp)
                                    .clip(CircleShape)
                                    .background(liveDotColor)
                            )
                            Spacer(modifier = Modifier.width(5.dp))
                            Text(
                                text = if (isBuffering) "CONNECTING" else if (isPlaying) "LIVE ${activeStation.bitRate}" else "STANDBY",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = liveTextColor
                            )
                        }
                    }
                }
                Text(
                    text = "Tactile Skeuomorphic Lo-Fi Radio Deck • Syncing presets & favorites from SS-CAM Desktop",
                    fontSize = 11.sp,
                    color = colors.textSecondary
                )

                Spacer(modifier = Modifier.height(10.dp))

                // Station Filter Chips: All vs Favorites
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    // All Stations Chip
                    Surface(
                        color = if (selectedFilter == 0) (if (colors.isMonochrome) Color(0xFF18181B) else colors.primary) else colors.surface,
                        shape = RoundedCornerShape(20.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, if (selectedFilter == 0) Color.Transparent else colors.border),
                        modifier = Modifier.clickable { selectedFilter = 0 }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Radio,
                                contentDescription = null,
                                tint = if (selectedFilter == 0) Color.White else colors.textSecondary,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "All Stations (${allStations.size})",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (selectedFilter == 0) Color.White else colors.textPrimary
                            )
                        }
                    }

                    // Favorites Chip
                    val favCount = allStations.count { favoriteStationIds.contains(it.id) }
                    Surface(
                        color = if (selectedFilter == 1) (if (colors.isMonochrome) Color(0xFF18181B) else Color(0xFFE11D48)) else colors.surface,
                        shape = RoundedCornerShape(20.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, if (selectedFilter == 1) Color.Transparent else colors.border),
                        modifier = Modifier.clickable { selectedFilter = 1 }
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Favorite,
                                contentDescription = null,
                                tint = if (selectedFilter == 1) Color.White else Color(0xFFE11D48),
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Favorites ($favCount)",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (selectedFilter == 1) Color.White else colors.textPrimary
                            )
                        }
                    }
                }
            }
        }

        // 2. Horizontal Cassette Tape Swiper / Deck
        item {
            LazyRow(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                contentPadding = PaddingValues(horizontal = 2.dp)
            ) {
                itemsIndexed(displayStations, key = { _, st -> st.id }) { index, station ->
                    val isSelected = station.id == activeStation.id
                    val isFav = favoriteStationIds.contains(station.id)
                    CassetteTapeCard(
                        station = station,
                        isSelected = isSelected,
                        isPlaying = isPlaying && isSelected,
                        isFavorite = isFav,
                        spoolRotation = if (isPlaying && isSelected) spoolAngle else 0f,
                        onFavoriteClick = {
                            favoriteStationIds = RadioPreferences.toggleFavorite(context, station.id)
                        },
                        onClick = {
                            if (isSelected && isPlaying) {
                                StudioRadioManager.pause()
                            } else {
                                StudioRadioManager.play(station, context)
                            }
                        }
                    )
                }
            }
        }

        // 3. Bottom Mechanical Cassette Player Deck (Streamlined Control Bay)
        item {
            TactileCassettePlayerDeck(
                activeStation = activeStation,
                isPlaying = isPlaying,
                isFavorite = isCurrentStationFavorite,
                statusText = statusText,
                spoolRotation = spoolAngle,
                volume = volume,
                onPlayPauseToggle = { StudioRadioManager.togglePlayPause(activeStation, context) },
                onFavoriteToggle = {
                    favoriteStationIds = RadioPreferences.toggleFavorite(context, activeStation.id)
                },
                onVolumeChange = { StudioRadioManager.setMasterVolume(it) }
            )
        }
    }
}

/**
 * High-fidelity Retro Cassette Tape Card with Favorite Heart Toggle
 */
@Composable
fun CassetteTapeCard(
    station: CassetteRadioStation,
    isSelected: Boolean,
    isPlaying: Boolean,
    isFavorite: Boolean,
    spoolRotation: Float,
    onFavoriteClick: () -> Unit,
    onClick: () -> Unit
) {
    val colors = LocalSscamColors.current
    val effectiveShellColor = if (colors.isMonochrome) Color(0xFF18181B) else station.shellColor
    val effectiveLabelColor = if (colors.isMonochrome) Color(0xFFF4F4F5) else station.labelColor

    Surface(
        color = if (isSelected) (if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9)) else colors.card,
        shape = RoundedCornerShape(16.dp),
        border = androidx.compose.foundation.BorderStroke(
            width = if (isSelected) 2.dp else 1.dp,
            color = if (colors.isMonochrome) (if (isSelected) Color(0xFF18181B) else Color(0xFFD4D4D8)) else (if (isSelected) station.shellColor else colors.border)
        ),
        shadowElevation = if (isSelected && !colors.isMonochrome) 6.dp else 2.dp,
        modifier = Modifier
            .width(260.dp)
            .clickable { onClick() }
    ) {
        Column(
            modifier = Modifier.padding(12.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Physical Cassette Tape Chassis
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(135.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .background(effectiveShellColor)
                    .border(1.5.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(10.dp))
                    .padding(8.dp)
            ) {
                Column(
                    modifier = Modifier.fillMaxSize(),
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    // Top Sticker Label
                    Surface(
                        color = effectiveLabelColor,
                        shape = RoundedCornerShape(5.dp),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(30.dp)
                    ) {
                        Row(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(horizontal = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.weight(1f)
                            ) {
                                // Side A badge
                                Surface(
                                    color = effectiveShellColor,
                                    shape = RoundedCornerShape(3.dp)
                                ) {
                                    Text(
                                        text = " A ",
                                        fontSize = 9.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = Color.White
                                    )
                                }
                                Spacer(modifier = Modifier.width(6.dp))
                                Text(
                                    text = station.name,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color(0xFF0F172A),
                                    maxLines = 1
                                )
                            }

                            // Favorite Heart Icon Button on Tape Card
                            Box(
                                modifier = Modifier
                                    .size(24.dp)
                                    .clip(CircleShape)
                                    .clickable { onFavoriteClick() },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    imageVector = if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                    contentDescription = "Favorite",
                                    tint = if (isFavorite) Color(0xFFE11D48) else Color(0xFF0F172A).copy(alpha = 0.6f),
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }
                    }

                    // Center Tape Window & Spinning Spools
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(Color(0xFF0F172A).copy(alpha = 0.85f))
                            .border(1.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(6.dp)),
                        contentAlignment = Alignment.Center
                    ) {
                        // Magnetic Tape Ribbon Center
                        Box(
                            modifier = Modifier
                                .width(60.dp)
                                .height(26.dp)
                                .background(Color(0xFF334155))
                                .border(1.dp, Color(0xFF475569), RoundedCornerShape(2.dp))
                        )

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 24.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            // Left Spool Gear
                            CassetteSpoolWheel(rotationAngle = spoolRotation)

                            // Center Window Indicator
                            Box(
                                modifier = Modifier
                                    .width(28.dp)
                                    .height(18.dp)
                                    .background(Color(0xFF020617))
                            )

                            // Right Spool Gear
                            CassetteSpoolWheel(rotationAngle = spoolRotation)
                        }
                    }

                    // Bottom Chassis Trapezoid with 4 Screws
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(horizontal = 16.dp, vertical = 2.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Box(modifier = Modifier.size(5.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.8f)))
                        Box(modifier = Modifier.size(4.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.6f)))
                        Box(modifier = Modifier.size(4.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.6f)))
                        Box(modifier = Modifier.size(5.dp).clip(CircleShape).background(Color.White.copy(alpha = 0.8f)))
                    }
                }
            }

            Spacer(modifier = Modifier.height(10.dp))

            // Note Card Description
            Surface(
                color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF8FAFC),
                shape = RoundedCornerShape(8.dp),
                border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(10.dp)) {
                    Text(
                        text = station.description,
                        fontSize = 11.sp,
                        color = colors.textPrimary,
                        lineHeight = 16.sp,
                        maxLines = 2
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        text = station.metaInfo,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = if (colors.isMonochrome) Color(0xFF52525B) else station.shellColor
                    )
                }
            }

            Spacer(modifier = Modifier.height(8.dp))

            // Loaded & Play Badge
            val playDotColor = if (colors.isMonochrome) (if (isPlaying) Color(0xFF18181B) else Color(0xFF71717A)) else if (isPlaying) SshSuccessGreen else colors.textMuted
            val playTextColor = if (colors.isMonochrome) Color(0xFF18181B) else if (isPlaying) SshSuccessGreen else colors.textSecondary

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Box(
                        modifier = Modifier
                            .size(6.dp)
                            .clip(CircleShape)
                            .background(playDotColor)
                    )
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = if (isPlaying) "PLAYING" else if (isSelected) "LOADED" else "TAP TO LOAD",
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                        color = playTextColor
                    )
                }

                Text(
                    text = station.genre,
                    fontSize = 9.sp,
                    color = colors.textMuted
                )
            }
        }
    }
}

/**
 * Animated High-Fidelity Audio Spectrum Visualizer
 * Real-time dynamic equalizer bars bouncing with physics during playback
 */
@Composable
fun AnimatedSpectrumVisualizer(
    isPlaying: Boolean,
    accentColor: Color,
    modifier: Modifier = Modifier,
    barCount: Int = 26
) {
    val colors = LocalSscamColors.current
    val infiniteTransition = rememberInfiniteTransition(label = "SpectrumInfinite")

    val phase1 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (2 * PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase1"
    )
    val phase2 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (2 * PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(750, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase2"
    )
    val phase3 by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = (2 * PI).toFloat(),
        animationSpec = infiniteRepeatable(
            animation = tween(1500, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "phase3"
    )

    Row(
        modifier = modifier
            .fillMaxWidth()
            .height(22.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
        verticalAlignment = Alignment.Bottom
    ) {
        for (i in 0 until barCount) {
            val normalizedIdx = i.toFloat() / barCount
            val barHeight = if (isPlaying) {
                val wave1 = (sin(phase1 + i * 0.45f) + 1f) * 0.5f
                val wave2 = (cos(phase2 + i * 0.85f) + 1f) * 0.5f
                val wave3 = (sin(phase3 + i * 1.25f) + 1f) * 0.5f
                val envelope = sin(normalizedIdx * PI.toFloat())
                val combined = (wave1 * 0.45f + wave2 * 0.35f + wave3 * 0.20f) * (0.35f + envelope * 0.65f)
                (combined * 18f + 4f).coerceIn(4f, 22f)
            } else {
                3f
            }

            val animatedHeight by animateFloatAsState(
                targetValue = barHeight,
                animationSpec = spring(dampingRatio = Spring.DampingRatioMediumBouncy, stiffness = Spring.StiffnessHigh),
                label = "bar_$i"
            )

            val barColor = if (isPlaying) {
                if (colors.isMonochrome) Color(0xFF18181B)
                else accentColor.copy(alpha = 0.55f + 0.45f * (animatedHeight / 22f))
            } else {
                if (colors.isMonochrome) Color(0xFFE4E4E7) else colors.border
            }

            Box(
                modifier = Modifier
                    .width(3.2.dp)
                    .height(animatedHeight.dp)
                    .clip(RoundedCornerShape(topStart = 2.dp, topEnd = 2.dp, bottomStart = 1.dp, bottomEnd = 1.dp))
                    .background(barColor)
            )
        }
    }
}

/**
 * Mechanical Cassette Spool Wheel with 6-Spoke Gear Cutout
 */
@Composable
fun CassetteSpoolWheel(
    rotationAngle: Float,
    modifier: Modifier = Modifier.size(24.dp)
) {
    Box(
        modifier = modifier
            .clip(CircleShape)
            .background(Color.White)
            .rotate(rotationAngle),
        contentAlignment = Alignment.Center
    ) {
        Canvas(modifier = Modifier.fillMaxSize()) {
            val center = Offset(size.width / 2, size.height / 2)
            val outerRadius = size.width / 2
            val innerRadius = outerRadius * 0.42f

            // 6 Gear Spokes
            for (i in 0 until 6) {
                val angleRad = (i * 60) * (PI / 180f).toFloat()
                val toothX = center.x + cos(angleRad) * (outerRadius * 0.72f)
                val toothY = center.y + sin(angleRad) * (outerRadius * 0.72f)
                drawCircle(
                    color = Color(0xFF0F172A),
                    radius = outerRadius * 0.16f,
                    center = Offset(toothX, toothY)
                )
            }

            // Center Spindle Hole
            drawCircle(
                color = Color(0xFF0F172A),
                radius = innerRadius,
                center = center
            )
        }
    }
}

/**
 * Tactile Mechanical Hi-Fi Cassette Player Control Deck
 * Modern Tactile Skeuomorphism with Transport Controls & Animated Visualizer
 */
@Composable
fun TactileCassettePlayerDeck(
    activeStation: CassetteRadioStation,
    isPlaying: Boolean,
    isFavorite: Boolean,
    statusText: String,
    spoolRotation: Float,
    volume: Float,
    onPlayPauseToggle: () -> Unit,
    onFavoriteToggle: () -> Unit,
    onVolumeChange: (Float) -> Unit
) {
    val colors = LocalSscamColors.current
    val effectiveDeckShellColor = if (colors.isMonochrome) Color(0xFF18181B) else activeStation.shellColor
    val playBtnColor = if (colors.isMonochrome) Color(0xFF18181B) else if (isPlaying) Color(0xFFEA580C) else colors.primary
    val playBtnBorder = if (colors.isMonochrome) Color(0xFF27272A) else if (isPlaying) Color(0xFFC2410C) else colors.primary.copy(alpha = 0.8f)

    FluentCard(
        containerColor = colors.card,
        borderColor = colors.border,
        cornerRadius = 16.dp,
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(modifier = Modifier.padding(14.dp)) {
            // Top Row: Mini Loaded Cassette Bay + Mechanical Transport Controls (Streamlined)
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Left: Mini Cassette Inset Bay
                Surface(
                    color = effectiveDeckShellColor,
                    shape = RoundedCornerShape(8.dp),
                    border = androidx.compose.foundation.BorderStroke(1.dp, if (colors.isMonochrome) Color(0xFFD4D4D8) else Color.White.copy(alpha = 0.3f)),
                    modifier = Modifier
                        .weight(1f)
                        .height(46.dp)
                        .padding(end = 12.dp)
                ) {
                    Row(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(horizontal = 10.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        CassetteSpoolWheel(
                            rotationAngle = if (isPlaying) spoolRotation else 0f,
                            modifier = Modifier.size(20.dp)
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = activeStation.name,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                maxLines = 1
                            )
                            Text(
                                text = if (isPlaying) "● $statusText" else "PAUSED",
                                fontSize = 8.5.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isPlaying) (if (colors.isMonochrome) Color.White else SshSuccessGreen) else (if (colors.isMonochrome) Color(0xFFD4D4D8) else Color(0xFFFDE68A)),
                                maxLines = 1
                            )
                        }
                    }
                }

                // Right: Tactile Streamlined Transport Buttons (Favorite Toggle + Prominent Play/Pause)
                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Favorite Toggle Button
                    Surface(
                        color = if (isFavorite) (if (colors.isMonochrome) Color(0xFF18181B) else Color(0xFFFFF1F2)) else (if (colors.isDark) Color(0xFF0F172A) else Color(0xFFE2E8F0)),
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, if (isFavorite) Color(0xFFE11D48) else colors.border),
                        shadowElevation = 2.dp,
                        modifier = Modifier
                            .size(44.dp)
                            .clickable { onFavoriteToggle() }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Icon(
                                imageVector = if (isFavorite) Icons.Default.Favorite else Icons.Default.FavoriteBorder,
                                contentDescription = "Favorite Station",
                                tint = if (isFavorite) Color(0xFFE11D48) else colors.textPrimary,
                                modifier = Modifier.size(20.dp)
                            )
                        }
                    }

                    // Main Tactile Play / Pause Button (Hero Extruded)
                    Surface(
                        color = playBtnColor,
                        shape = RoundedCornerShape(10.dp),
                        border = androidx.compose.foundation.BorderStroke(1.2.dp, playBtnBorder),
                        shadowElevation = 4.dp,
                        modifier = Modifier
                            .height(44.dp)
                            .width(68.dp)
                            .clickable { onPlayPauseToggle() }
                    ) {
                        Box(contentAlignment = Alignment.Center) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.Center
                            ) {
                                Icon(
                                    if (isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow,
                                    contentDescription = "Play/Pause",
                                    tint = Color.White,
                                    modifier = Modifier.size(22.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = if (isPlaying) "PAUSE" else "PLAY",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }
                        }
                    }
                }
            }

            Spacer(modifier = Modifier.height(14.dp))

            // Animated Equalizer Visualizer Spectrum
            AnimatedSpectrumVisualizer(
                isPlaying = isPlaying,
                accentColor = effectiveDeckShellColor,
                barCount = 28
            )

            Spacer(modifier = Modifier.height(10.dp))

            // Master Volume Fader
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.VolumeDown,
                    contentDescription = null,
                    tint = colors.textMuted,
                    modifier = Modifier.size(15.dp)
                )
                Slider(
                    value = volume,
                    onValueChange = onVolumeChange,
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 8.dp),
                    colors = SliderDefaults.colors(
                        thumbColor = effectiveDeckShellColor,
                        activeTrackColor = effectiveDeckShellColor,
                        inactiveTrackColor = if (colors.isMonochrome) Color(0xFFE4E4E7) else colors.border
                    )
                )
                Icon(
                    Icons.AutoMirrored.Filled.VolumeUp,
                    contentDescription = null,
                    tint = colors.textMuted,
                    modifier = Modifier.size(15.dp)
                )
            }
        }
    }
}
