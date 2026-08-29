package com.suamisihat.sscam.ui.screens

import android.content.Context
import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.VolumeOff
import androidx.compose.material.icons.automirrored.filled.VolumeUp
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.ui.components.*
import com.suamisihat.sscam.ui.theme.*
import kotlinx.coroutines.delay
import java.util.Calendar
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.sin

data class LoungeMenuOption(
    val title: String,
    val icon: ImageVector
)

data class JakimZone(
    val code: String,
    val state: String,
    val name: String,
    val offsetMinutes: Int = 0 // Offset relative to SGR01
)

object SolatZonePreferences {
    private const val PREFS_NAME = "sscam_solat_prefs"
    private const val KEY_ZONE = "key_solat_zone"

    val ALL_ZONES = listOf(
        JakimZone("SGR01", "Selangor & KL", "Shah Alam, Petaling, KL, Putrajaya, Klang", 0),
        JakimZone("SGR02", "Selangor", "Kuala Selangor, Sabak Bernam", 1),
        JakimZone("SGR03", "Selangor", "Hulu Selangor, Hulu Langat, Rawang", -1),
        JakimZone("WLY01", "WP Kuala Lumpur", "Kuala Lumpur, Putrajaya", 0),
        JakimZone("WLY02", "WP Labuan", "Labuan", -30),
        JakimZone("JHR01", "Johor", "Pulau Aur, Pulau Pemanggil", -8),
        JakimZone("JHR02", "Johor", "Johor Bahru, Kota Tinggi, Mersing, Kulai", -6),
        JakimZone("JHR03", "Johor", "Kluang, Pontian", -4),
        JakimZone("JHR04", "Johor", "Batu Pahat, Muar, Segamat, Tangkak", -3),
        JakimZone("PNG01", "Pulau Pinang", "Seluruh Negeri Pulau Pinang", 5),
        JakimZone("PRK01", "Perak", "Tapah, Slim River, Tanjung Malim", 1),
        JakimZone("PRK02", "Perak", "Ipoh, Batu Gajah, Kampar, Sg Siput", 3),
        JakimZone("PRK03", "Perak", "Lenggong, Pengkalan Hulu, Grik", 2),
        JakimZone("PRK04", "Perak", "Temengor, Belum", 1),
        JakimZone("PRK05", "Perak", "Teluk Intan, Lumut, Manjung, Pangkor", 4),
        JakimZone("PRK06", "Perak", "Taiping, Bagan Serai, Parit Buntar", 5),
        JakimZone("PRK07", "Perak", "Bukit Larut", 4),
        JakimZone("KDH01", "Kedah", "Kota Setar, Kubang Pasu, Pokok Sena", 6),
        JakimZone("KDH02", "Kedah", "Kuala Muda, Yan, Pendang", 5),
        JakimZone("KDH03", "Kedah", "Padang Terap, Sik", 4),
        JakimZone("KDH04", "Kedah", "Baling", 3),
        JakimZone("KDH05", "Kedah", "Kulim, Bandar Baharu", 4),
        JakimZone("KDH06", "Kedah", "Langkawi", 8),
        JakimZone("KDH07", "Kedah", "Puncak Gunung Jerai", 5),
        JakimZone("KTN01", "Kelantan", "Kota Bharu, Bachok, Pasir Puteh, Tumpat", -3),
        JakimZone("KTN02", "Kelantan", "Gua Musang, Jeli, Kuala Krai", -1),
        JakimZone("TRG01", "Terengganu", "Kuala Terengganu, Marang, Kuala Nerus", -7),
        JakimZone("TRG02", "Terengganu", "Besut, Setiu", -6),
        JakimZone("TRG03", "Terengganu", "Hulu Terengganu", -6),
        JakimZone("TRG04", "Terengganu", "Dungun, Kemaman", -8),
        JakimZone("PHG01", "Pahang", "Pulau Tioman", -7),
        JakimZone("PHG02", "Pahang", "Kuantan, Pekan, Rompin, Muadzam", -5),
        JakimZone("PHG03", "Pahang", "Jerantut, Temerloh, Maran, Bera, Jengka", -3),
        JakimZone("PHG04", "Pahang", "Bentong, Raub, Lipis", -1),
        JakimZone("PHG05", "Pahang", "Genting Sempah, Janda Baik, Bukit Tinggi", 0),
        JakimZone("PHG06", "Pahang", "Cameron Highlands, Fraser, Genting Highlands", 1),
        JakimZone("MLK01", "Melaka", "Seluruh Negeri Melaka", -2),
        JakimZone("NGS01", "Negeri Sembilan", "Tampin, Jempol", -2),
        JakimZone("NGS02", "Negeri Sembilan", "Seremban, Port Dickson, Rembau, Jelebu", -1),
        JakimZone("PLS01", "Perlis", "Kangar, Padang Besar, Arau", 7),
        JakimZone("SBH01", "Sabah", "Sandakan (Timur), Sukau, Tambisan", -38),
        JakimZone("SBH02", "Sabah", "Beluran, Telupid, Pinangah, Sandakan (Barat)", -36),
        JakimZone("SBH03", "Sabah", "Lahad Datu, Silabukan, Kunak, Semporna", -40),
        JakimZone("SBH04", "Sabah", "Tawau, Balong, Merotai, Kalabakan", -39),
        JakimZone("SBH05", "Sabah", "Kudat, Kota Marudu, Pitas, Pulau Banggi", -34),
        JakimZone("SBH06", "Sabah", "Gunung Kinabalu", -32),
        JakimZone("SBH07", "Sabah", "Kota Kinabalu, Penampang, Papar, Putatan, Tuaran", -31),
        JakimZone("SBH08", "Sabah", "Keningau, Tambunan, Nabawan, Pensiangan", -33),
        JakimZone("SBH09", "Sabah", "Beaufort, Kuala Penyu, Sipitang, Tenom", -30),
        JakimZone("SWK01", "Sarawak", "Limbang, Lawas, Sundar, Trusan", -30),
        JakimZone("SWK02", "Sarawak", "Miri, Niah, Bekenu, Sibuti, Marudi", -28),
        JakimZone("SWK03", "Sarawak", "Bintulu, Tatau, Sebauh, Belaga", -25),
        JakimZone("SWK04", "Sarawak", "Sibu, Mukah, Dalat, Song, Kapit", -22),
        JakimZone("SWK05", "Sarawak", "Sarikei, Matu, Julau, Rajang, Bintangor", -21),
        JakimZone("SWK06", "Sarawak", "Sri Aman, Betong, Lubok Antu, Saratok", -19),
        JakimZone("SWK07", "Sarawak", "Serian, Simunjan, Samarahan, Sebuyau", -17),
        JakimZone("SWK08", "Sarawak", "Kuching, Bau, Lundu, Sematan", -16),
        JakimZone("SWK09", "Sarawak", "Zon Khas (Kampung Matang)", -16)
    )

    fun getSavedZone(context: Context): JakimZone {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val code = prefs.getString(KEY_ZONE, "SGR01") ?: "SGR01"
        return ALL_ZONES.find { it.code.equals(code, ignoreCase = true) } ?: ALL_ZONES[0]
    }

    fun saveZone(context: Context, zone: JakimZone) {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(KEY_ZONE, zone.code).apply()
    }
}

@Composable
fun WellbeingHubScreen(
    initialSubTab: Int = 0
) {
    val colors = LocalSscamColors.current
    var selectedTab by remember { mutableStateOf(initialSubTab.coerceIn(0, 2)) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        // Top Folder Tab Navigation (Trapezoid index tabs)
        FolderTabNavigation(
            options = listOf("FOCUS", "SOLAT", "RADIO"),
            selectedIndex = selectedTab,
            onOptionSelected = { selectedTab = it },
            modifier = Modifier.padding(bottom = 16.dp)
        )

        when (selectedTab) {
            0 -> WellbeingFocusContentView()
            1 -> SolatContentView()
            2 -> StudioRadioContentView()
            else -> WellbeingFocusContentView()
        }
    }
}

/**
 * Focus Workstation: Analog Mechanical Pomodoro Deck, Tactile Hydration Reservoir, and Mindset Wheel
 */
@Composable
fun WellbeingFocusContentView() {
    val colors = LocalSscamColors.current
    var waterGlasses by remember { mutableStateOf(5) }
    var isPomodoroRunning by remember { mutableStateOf(false) }
    var pomodoroSecondsLeft by remember { mutableStateOf(25 * 60) }
    var targetSprintDuration by remember { mutableStateOf(25 * 60) }
    var completedSessions by remember { mutableStateOf(3) }

    LaunchedEffect(isPomodoroRunning) {
        while (isPomodoroRunning && pomodoroSecondsLeft > 0) {
            delay(1000)
            pomodoroSecondsLeft--
            if (pomodoroSecondsLeft == 0) {
                isPomodoroRunning = false
                completedSessions++
                pomodoroSecondsLeft = targetSprintDuration
            }
        }
    }

    val minutes = pomodoroSecondsLeft / 60
    val seconds = pomodoroSecondsLeft % 60
    val formattedTime = remember(pomodoroSecondsLeft) {
        String.format("%02d:%02d", minutes, seconds)
    }
    val progress = remember(pomodoroSecondsLeft, targetSprintDuration) {
        (targetSprintDuration - pomodoroSecondsLeft).toFloat() / targetSprintDuration.toFloat()
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // 1. SECTION A: Analog Mechanical Pomodoro Deck (Hero Tactile Instrument)
        item {
            TactileCard(
                showCornerScrews = true,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Header Bar with Session Counter Beads
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Timer,
                                contentDescription = null,
                                tint = if (colors.isMonochrome) Color(0xFF18181B) else colors.primary,
                                modifier = Modifier.size(16.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "ANALOG FOCUS INSTRUMENT",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textPrimary,
                                letterSpacing = 1.sp
                            )
                        }

                        // Session Bead Indicators
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                            (1..4).forEach { i ->
                                val isDone = i <= completedSessions
                                Box(
                                    modifier = Modifier
                                        .size(8.dp)
                                        .clip(CircleShape)
                                        .background(
                                            if (isDone) (if (colors.isMonochrome) Color(0xFF18181B) else SshSuccessGreen)
                                            else (if (colors.isMonochrome) Color(0xFFE4E4E7) else colors.border)
                                        )
                                        .border(0.5.dp, Color.Black.copy(alpha = 0.2f), CircleShape)
                                )
                            }
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                text = "$completedSessions Sprints",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textSecondary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Analog Dial with 60 Mechanical Tick Marks & Center Spindle
                    Box(
                        contentAlignment = Alignment.Center,
                        modifier = Modifier.size(165.dp)
                    ) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            val cx = size.width / 2
                            val cy = size.height / 2
                            val outerRadius = size.width / 2 - 4.dp.toPx()
                            val innerRadius = outerRadius - 10.dp.toPx()

                            // Outer Dial Bezel Ring
                            drawCircle(
                                color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFE2E8F0),
                                radius = outerRadius + 2.dp.toPx(),
                                style = Stroke(width = 3.dp.toPx())
                            )

                            // 60 Tick Marks
                            for (i in 0 until 60) {
                                val angleRad = (i * 6 - 90) * (PI / 180f).toFloat()
                                val isMajor = i % 5 == 0
                                val tickLength = if (isMajor) 8.dp.toPx() else 4.dp.toPx()
                                val tickWidth = if (isMajor) 2.dp.toPx() else 1.dp.toPx()
                                val startR = outerRadius - tickLength
                                val endR = outerRadius

                                val x1 = cx + cos(angleRad) * startR
                                val y1 = cy + sin(angleRad) * startR
                                val x2 = cx + cos(angleRad) * endR
                                val y2 = cy + sin(angleRad) * endR

                                val tickColor = if (isMajor) {
                                    if (colors.isMonochrome) Color(0xFF18181B) else colors.primary
                                } else {
                                    if (colors.isMonochrome) Color(0xFFA1A1AA) else colors.border
                                }

                                drawLine(
                                    color = tickColor,
                                    start = Offset(x1, y1),
                                    end = Offset(x2, y2),
                                    strokeWidth = tickWidth
                                )
                            }

                            // Active Progress Arc
                            drawArc(
                                color = if (colors.isMonochrome) Color(0xFF18181B) else if (isPomodoroRunning) SshWarmGoldBright else colors.primary,
                                startAngle = -90f,
                                sweepAngle = progress * 360f,
                                useCenter = false,
                                topLeft = Offset(cx - innerRadius, cy - innerRadius),
                                size = Size(innerRadius * 2, innerRadius * 2),
                                style = Stroke(width = 6.dp.toPx(), cap = StrokeCap.Round)
                            )
                        }

                        // Sunken Digital LCD Display Center
                        Surface(
                            color = if (colors.isDark) Color(0xFF0F172A) else Color(0xFFF1F5F9),
                            shape = CircleShape,
                            border = androidx.compose.foundation.BorderStroke(1.5.dp, colors.border),
                            shadowElevation = 2.dp,
                            modifier = Modifier.size(105.dp)
                        ) {
                            Column(
                                modifier = Modifier.fillMaxSize(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.Center
                            ) {
                                Text(
                                    text = formattedTime,
                                    fontSize = 24.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.textPrimary,
                                    letterSpacing = 1.sp
                                )
                                Text(
                                    text = if (isPomodoroRunning) "RUNNING" else "STANDBY",
                                    fontSize = 8.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = if (isPomodoroRunning) (if (colors.isMonochrome) Color(0xFF18181B) else SshSuccessGreen) else colors.textMuted
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    // Quick Duration Preset Buttons (+5m, +10m, 25m, 45m)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        listOf(15 to "15m", 25 to "25m", 45 to "45m", 60 to "60m").forEach { (dur, label) ->
                            val isSel = targetSprintDuration == dur * 60
                            Surface(
                                color = if (isSel) (if (colors.isMonochrome) Color(0xFF18181B) else colors.primary) else (if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9)),
                                shape = RoundedCornerShape(8.dp),
                                border = androidx.compose.foundation.BorderStroke(1.dp, if (isSel) Color.Transparent else colors.border),
                                modifier = Modifier
                                    .weight(1f)
                                    .height(30.dp)
                                    .clickable {
                                        targetSprintDuration = dur * 60
                                        if (!isPomodoroRunning) pomodoroSecondsLeft = dur * 60
                                    }
                            ) {
                                Box(contentAlignment = Alignment.Center) {
                                    Text(
                                        text = label,
                                        fontSize = 11.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = if (isSel) Color.White else colors.textPrimary
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Mechanical Tactile Buttons: Start / Pause + Reset
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        val primaryBtnBg = if (colors.isMonochrome) Color(0xFF18181B) else if (isPomodoroRunning) Color(0xFFD97706) else SshSuccessGreen
                        TactileButton(
                            onClick = { isPomodoroRunning = !isPomodoroRunning },
                            buttonColor = primaryBtnBg,
                            icon = if (isPomodoroRunning) Icons.Default.Pause else Icons.Default.PlayArrow,
                            text = if (isPomodoroRunning) "PAUSE SPRINT" else "START FOCUS SPRINT",
                            modifier = Modifier.weight(1f)
                        )

                        Surface(
                            color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFE2E8F0),
                            shape = RoundedCornerShape(10.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                            shadowElevation = 2.dp,
                            modifier = Modifier
                                .height(44.dp)
                                .clickable {
                                    isPomodoroRunning = false
                                    pomodoroSecondsLeft = targetSprintDuration
                                }
                                .padding(horizontal = 14.dp)
                        ) {
                            Box(contentAlignment = Alignment.Center) {
                                Text(
                                    text = "RESET",
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.textPrimary
                                )
                            }
                        }
                    }
                }
            }
        }

        // 2. SECTION B: Tactile Hydration Reservoir & Posture Wellness Rig
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                // Tactile Hydration Reservoir
                val hydrationTint = if (colors.isMonochrome) Color(0xFF18181B) else Color(0xFF0284C7)
                TactileCard(modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Icon(
                                    Icons.Default.LocalDrink,
                                    contentDescription = null,
                                    tint = hydrationTint,
                                    modifier = Modifier.size(15.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    "HYDRATION",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = hydrationTint,
                                    letterSpacing = 0.5.sp
                                )
                            }
                            Text(
                                text = "$waterGlasses/8",
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textPrimary
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        // Tactile Fluid Level Gauge (8 Inset Glass Beads)
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.spacedBy(3.dp)
                        ) {
                            (1..8).forEach { i ->
                                val isFilled = i <= waterGlasses
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .height(14.dp)
                                        .clip(RoundedCornerShape(3.dp))
                                        .background(
                                            if (isFilled) (if (colors.isMonochrome) Color(0xFF18181B) else Color(0xFF38BDF8))
                                            else (if (colors.isDark) Color(0xFF1E293B) else Color(0xFFE2E8F0))
                                        )
                                        .border(0.5.dp, Color.Black.copy(alpha = 0.15f), RoundedCornerShape(3.dp))
                                )
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Surface(
                                color = if (colors.isMonochrome) Color(0xFF18181B) else hydrationTint,
                                shape = RoundedCornerShape(6.dp),
                                modifier = Modifier
                                    .clickable { if (waterGlasses < 8) waterGlasses++ }
                                    .padding(horizontal = 10.dp, vertical = 4.dp)
                            ) {
                                Text(
                                    text = "+ 1 Glass",
                                    fontSize = 10.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = Color.White
                                )
                            }

                            if (waterGlasses > 0) {
                                Text(
                                    text = "Reset",
                                    fontSize = 10.sp,
                                    color = colors.textMuted,
                                    modifier = Modifier.clickable { waterGlasses = 0 }
                                )
                            }
                        }
                    }
                }

                // Tactile Ergonomics & 20-20-20 Eye Rest Card
                val ergoTint = if (colors.isMonochrome) Color(0xFF18181B) else SshSuccessGreen
                TactileCard(modifier = Modifier.weight(1f)) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Visibility,
                                contentDescription = null,
                                tint = ergoTint,
                                modifier = Modifier.size(15.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                "20-20-20 REST",
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                color = ergoTint,
                                letterSpacing = 0.5.sp
                            )
                        }

                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Every 20 mins, look 20 feet away for 20 seconds.",
                            fontSize = 10.sp,
                            color = colors.textPrimary,
                            lineHeight = 14.sp
                        )

                        Spacer(modifier = Modifier.height(8.dp))
                        Surface(
                            color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                            shape = RoundedCornerShape(6.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, colors.border),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Box(modifier = Modifier.size(6.dp).clip(CircleShape).background(ergoTint))
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    "Posture Active",
                                    fontSize = 9.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = ergoTint
                                )
                            }
                        }
                    }
                }
            }
        }

        // 3. SECTION C: Creative Emotion & Mindset Petal Rose Radar Chart
        item {
            StudioMoodWheelCard()
        }
    }
}

data class SolatScheduleItem(
    val name: String,
    val description: String,
    val startMinutes: Int,
    val endMinutes: Int,
    val timeFormatted: String,
    val durationFormatted: String,
    val icon: ImageVector,
    val isSunrise: Boolean = false
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SolatContentView() {
    val colors = LocalSscamColors.current
    val context = LocalContext.current

    var selectedZone by remember { mutableStateOf(SolatZonePreferences.getSavedZone(context)) }
    var isZoneSelectorOpen by remember { mutableStateOf(false) }
    var zoneSearchQuery by remember { mutableStateOf("") }

    var currentSecondsOfDay by remember { mutableStateOf(0) }
    var currentTimeString by remember { mutableStateOf("12:00:00 AM") }

    LaunchedEffect(Unit) {
        while (true) {
            val now = Calendar.getInstance()
            val hour = now.get(Calendar.HOUR_OF_DAY)
            val min = now.get(Calendar.MINUTE)
            val sec = now.get(Calendar.SECOND)
            currentSecondsOfDay = (hour * 60 + min) * 60 + sec

            val h12 = if (hour % 12 == 0) 12 else hour % 12
            val ampm = if (hour < 12) "AM" else "PM"
            currentTimeString = String.format("%02d:%02d:%02d %s", h12, min, sec, ampm)
            delay(1000)
        }
    }

    // Dynamic prayer timetable adjusted for selected Jakim Zone offset
    val offset = selectedZone.offsetMinutes
    val imsakMin = 5 * 60 + 48 + offset
    val fajrMin = 5 * 60 + 58 + offset
    val sunriseMin = 7 * 60 + 11 + offset
    val dhuhrMin = 13 * 60 + 21 + offset
    val asrMin = 16 * 60 + 32 + offset
    val maghribMin = 19 * 60 + 23 + offset
    val ishaMin = 20 * 60 + 33 + offset

    fun formatMin(minOfDay: Int): String {
        val normalized = (minOfDay % (24 * 60) + 24 * 60) % (24 * 60)
        val h = normalized / 60
        val m = normalized % 60
        val h12 = if (h % 12 == 0) 12 else h % 12
        val ampm = if (h < 12) "AM" else "PM"
        return String.format("%02d:%02d %s", h12, m, ampm)
    }

    val solatItems = remember(selectedZone) {
        listOf(
            SolatScheduleItem("Imsak", "Pre-Dawn Pause", imsakMin, fajrMin, formatMin(imsakMin), "${formatMin(imsakMin)} - ${formatMin(fajrMin)}", Icons.Default.HourglassTop),
            SolatScheduleItem("Fajr", "Dawn Prayer", fajrMin, sunriseMin, formatMin(fajrMin), "${formatMin(fajrMin)} - ${formatMin(sunriseMin)}", Icons.Default.WbTwilight),
            SolatScheduleItem("Sunrise", "Sunrise & Midday Transition", sunriseMin, dhuhrMin, formatMin(sunriseMin), "${formatMin(sunriseMin)} - ${formatMin(dhuhrMin)}", Icons.Default.Brightness5, isSunrise = true),
            SolatScheduleItem("Dhuhr", "Midday Prayer", dhuhrMin, asrMin, formatMin(dhuhrMin), "${formatMin(dhuhrMin)} - ${formatMin(asrMin)}", Icons.Default.WbSunny),
            SolatScheduleItem("Asr", "Afternoon Prayer", asrMin, maghribMin, formatMin(asrMin), "${formatMin(asrMin)} - ${formatMin(maghribMin)}", Icons.Default.Brightness6),
            SolatScheduleItem("Maghrib", "Sunset Prayer", maghribMin, ishaMin, formatMin(maghribMin), "${formatMin(maghribMin)} - ${formatMin(ishaMin)}", Icons.Default.NightsStay),
            SolatScheduleItem("Isha", "Night Prayer", ishaMin, 24 * 60 + imsakMin, formatMin(ishaMin), "${formatMin(ishaMin)} - ${formatMin(imsakMin)}", Icons.Default.Nightlight)
        )
    }

    val curMin = currentSecondsOfDay / 60

    val activeIndex = remember(curMin, solatItems) {
        val found = solatItems.indexOfFirst { curMin >= it.startMinutes && curMin < it.endMinutes }
        if (found == -1) {
            if (curMin >= ishaMin || curMin < imsakMin) 6 else 3
        } else found
    }

    val nextIndex = (activeIndex + 1) % solatItems.size
    val activePrayer = solatItems[activeIndex]
    val nextPrayer = solatItems[nextIndex]

    val startSeconds = activePrayer.startMinutes * 60
    var endSeconds = activePrayer.endMinutes * 60
    var adjustedCurSec = currentSecondsOfDay
    if (endSeconds <= startSeconds) {
        endSeconds += 24 * 3600
        if (adjustedCurSec < startSeconds) adjustedCurSec += 24 * 3600
    }
    val totalSec = (endSeconds - startSeconds).coerceAtLeast(1)
    val elapsedSec = (adjustedCurSec - startSeconds).coerceIn(0, totalSec)
    val remainingSec = (endSeconds - adjustedCurSec).coerceAtLeast(0)
    val progress = elapsedSec.toFloat() / totalSec.toFloat()

    val remHours = remainingSec / 3600
    val remMins = (remainingSec % 3600) / 60
    val remSecs = remainingSec % 60
    val remainingCountdownFormatted = remember(remainingSec) {
        String.format("%d:%02d:%02d", remHours, remMins, remSecs)
    }

    val sunProgress = ((curMin - sunriseMin).toFloat() / (maghribMin - sunriseMin)).coerceIn(0f, 1f)

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        // 1. Hero Solar Arc Card with Tactile Zone Change Button
        item {
            val heroBg = if (colors.isMonochrome) Color(0xFFF4F4F5) else Color(0xFF042F24)
            val heroBorder = if (colors.isMonochrome) Color(0xFFD4D4D8) else Color(0xFF0F766E)
            val locTint = if (colors.isMonochrome) Color(0xFF18181B) else Color(0xFF6EE7B7)
            val dateColor = if (colors.isMonochrome) Color(0xFF52525B) else SshWarmGoldBright
            val arcTrackColor = if (colors.isMonochrome) Color(0xFFD4D4D8) else Color(0xFF0F766E).copy(alpha = 0.5f)
            val sunHaloColor = if (colors.isMonochrome) Color(0xFFA1A1AA).copy(alpha = 0.35f) else Color(0xFFFBBF24).copy(alpha = 0.35f)
            val sunCenterColor = if (colors.isMonochrome) Color(0xFF18181B) else Color(0xFFF59E0B)
            val clockTextColor = if (colors.isMonochrome) Color(0xFF09090B) else Color.White
            val clockSubColor = if (colors.isMonochrome) Color(0xFF71717A) else Color(0xFFA7F3D0)
            val anchorTextColor = if (colors.isMonochrome) Color(0xFF52525B) else Color(0xFFD1FAE5)

            TactileCard(
                containerColor = heroBg,
                borderColor = heroBorder,
                showCornerScrews = true,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    // Header Zone & Date with Change Zone Button
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Clickable Zone Capsule
                        Surface(
                            color = if (colors.isMonochrome) Color(0xFFE4E4E7) else Color(0xFF064E3B),
                            shape = RoundedCornerShape(20.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, if (colors.isMonochrome) Color(0xFFD4D4D8) else Color(0xFF10B981).copy(alpha = 0.4f)),
                            modifier = Modifier.clickable { isZoneSelectorOpen = true }
                        ) {
                            Row(
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    Icons.Default.LocationOn,
                                    contentDescription = null,
                                    tint = locTint,
                                    modifier = Modifier.size(13.dp)
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Text(
                                    text = "${selectedZone.name} (${selectedZone.code})",
                                    color = locTint,
                                    fontSize = 10.5.sp,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1
                                )
                                Spacer(modifier = Modifier.width(4.dp))
                                Icon(
                                    Icons.Default.ArrowDropDown,
                                    contentDescription = "Change Zone",
                                    tint = locTint,
                                    modifier = Modifier.size(14.dp)
                                )
                            }
                        }

                        Text(
                            "15 Safar 1448H",
                            color = dateColor,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Solar Arc Visualization
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(95.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        Canvas(modifier = Modifier.fillMaxSize()) {
                            val w = size.width
                            val h = size.height
                            val arcRadius = (w * 0.42f).coerceAtMost(h * 1.4f)
                            val cx = w / 2f
                            val cy = h * 0.92f

                            // Draw Arc Track
                            drawArc(
                                color = arcTrackColor,
                                startAngle = 180f,
                                sweepAngle = 180f,
                                useCenter = false,
                                topLeft = Offset(cx - arcRadius, cy - arcRadius),
                                size = Size(arcRadius * 2, arcRadius * 2),
                                style = Stroke(width = 4.dp.toPx(), cap = StrokeCap.Round)
                            )

                            // Sun Position
                            val angleRad = (180f + (sunProgress * 180f)) * (PI.toFloat() / 180f)
                            val sunX = cx + arcRadius * cos(angleRad)
                            val sunY = cy + arcRadius * sin(angleRad)

                            // Draw Glowing Sun Halo
                            drawCircle(
                                color = sunHaloColor,
                                radius = 14.dp.toPx(),
                                center = Offset(sunX, sunY)
                            )
                            // Draw Sun Center
                            drawCircle(
                                color = sunCenterColor,
                                radius = 7.dp.toPx(),
                                center = Offset(sunX, sunY)
                            )
                        }

                        // Digital Clock Center
                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier.padding(top = 10.dp)
                        ) {
                            Text(
                                currentTimeString,
                                color = clockTextColor,
                                fontSize = 22.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp
                            )
                            Text(
                                "Current Studio Time (MST)",
                                color = clockSubColor,
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }
                    }

                    // Sunrise and Sunset Anchors
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                Icons.Default.Brightness5,
                                contentDescription = null,
                                tint = anchorTextColor,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(
                                "Sunrise ${formatMin(sunriseMin)}",
                                color = anchorTextColor,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                        }

                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                "Sunset ${formatMin(maghribMin)}",
                                color = anchorTextColor,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Medium
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Icon(
                                Icons.Default.NightsStay,
                                contentDescription = null,
                                tint = anchorTextColor,
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Next Solat Alert Badge Capsule
                    val badgeBg = if (colors.isMonochrome) Color(0xFFE4E4E7) else Color(0xFF064E3B)
                    val badgeBorder = if (colors.isMonochrome) Color(0xFFD4D4D8) else Color(0xFF059669)
                    val badgeTint = if (colors.isMonochrome) Color(0xFF09090B) else Color(0xFFA7F3D0)

                    Surface(
                        color = badgeBg,
                        shape = RoundedCornerShape(20.dp),
                        border = androidx.compose.foundation.BorderStroke(1.dp, badgeBorder)
                    ) {
                        Row(
                            modifier = Modifier.padding(horizontal = 14.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Icon(
                                Icons.Default.Schedule,
                                contentDescription = null,
                                tint = badgeTint,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(
                                text = "Next: ${nextPrayer.name} • ${nextPrayer.timeFormatted}",
                                color = badgeTint,
                                fontSize = 12.sp,
                                fontWeight = FontWeight.Bold
                            )
                        }
                    }
                }
            }
        }

        // 2. Prayer Schedule Section Header
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 4.dp, vertical = 2.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(
                    text = "Daily Prayer Schedule & Timeline",
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Bold,
                    color = colors.textPrimary
                )
                Text(
                    text = "Zon ${selectedZone.code}",
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold,
                    color = colors.textSecondary
                )
            }
        }

        // 3. Solat Timeline Items
        items(solatItems.size) { index ->
            val item = solatItems[index]
            val isCurrent = index == activeIndex
            val isPassed = curMin >= item.endMinutes && index != 6

            SolatTimelineCard(
                item = item,
                isActive = isCurrent,
                isPassed = isPassed,
                remainingTime = if (isCurrent) remainingCountdownFormatted else null,
                progress = if (isCurrent) progress else 0f
            )
        }
    }

    // Interactive Malaysian Solat Zone Selector Modal Sheet
    if (isZoneSelectorOpen) {
        ModalBottomSheet(
            onDismissRequest = { isZoneSelectorOpen = false },
            containerColor = colors.card,
            dragHandle = { BottomSheetDefaults.DragHandle() }
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 10.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "Select Solat Zone (Zon JAKIM)",
                            fontSize = 17.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.textPrimary
                        )
                        Text(
                            text = "Choose your Malaysian state / district",
                            fontSize = 11.sp,
                            color = colors.textSecondary
                        )
                    }

                    IconButton(onClick = { isZoneSelectorOpen = false }) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = colors.textMuted)
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Search Filter Input
                OutlinedTextField(
                    value = zoneSearchQuery,
                    onValueChange = { zoneSearchQuery = it },
                    placeholder = { Text("Search state, district, or code...", fontSize = 12.sp) },
                    leadingIcon = { Icon(Icons.Default.Search, contentDescription = null, modifier = Modifier.size(18.dp)) },
                    singleLine = true,
                    shape = RoundedCornerShape(12.dp),
                    colors = OutlinedTextFieldDefaults.colors(
                        focusedBorderColor = colors.primary,
                        unfocusedBorderColor = colors.border
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(12.dp))

                val filteredZones = remember(zoneSearchQuery) {
                    if (zoneSearchQuery.isBlank()) SolatZonePreferences.ALL_ZONES
                    else SolatZonePreferences.ALL_ZONES.filter {
                        it.name.contains(zoneSearchQuery, ignoreCase = true) ||
                        it.state.contains(zoneSearchQuery, ignoreCase = true) ||
                        it.code.contains(zoneSearchQuery, ignoreCase = true)
                    }
                }

                LazyColumn(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(350.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    items(filteredZones) { zone ->
                        val isSelected = zone.code == selectedZone.code
                        Surface(
                            color = if (isSelected) (if (colors.isDark) Color(0xFF042F24) else Color(0xFFDCFCE7)) else (if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF8FAFC)),
                            shape = RoundedCornerShape(10.dp),
                            border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) SshSuccessGreen else colors.border),
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable {
                                    selectedZone = zone
                                    SolatZonePreferences.saveZone(context, zone)
                                    isZoneSelectorOpen = false
                                }
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 14.dp, vertical = 10.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Surface(
                                            color = if (isSelected) SshSuccessGreen else colors.primary,
                                            shape = RoundedCornerShape(4.dp)
                                        ) {
                                            Text(
                                                text = " ${zone.code} ",
                                                fontSize = 9.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = Color.White
                                            )
                                        }
                                        Spacer(modifier = Modifier.width(6.dp))
                                        Text(
                                            text = zone.state,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = colors.textPrimary
                                        )
                                    }
                                    Spacer(modifier = Modifier.height(2.dp))
                                    Text(
                                        text = zone.name,
                                        fontSize = 10.5.sp,
                                        color = colors.textSecondary,
                                        maxLines = 1
                                    )
                                }

                                if (isSelected) {
                                    Icon(
                                        Icons.Default.CheckCircle,
                                        contentDescription = "Selected",
                                        tint = SshSuccessGreen,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Solat Timeline Schedule Card Component with Tactile Bevels
 */
@Composable
fun SolatTimelineCard(
    item: SolatScheduleItem,
    isActive: Boolean,
    isPassed: Boolean,
    remainingTime: String?,
    progress: Float
) {
    val colors = LocalSscamColors.current
    var isNotificationMuted by remember { mutableStateOf(false) }

    val activeCardBg = if (colors.isMonochrome) Color(0xFFF4F4F5) else if (colors.isDark) Color(0xFF042F24) else Color(0xFFF0FDF4)
    val activeBorder = if (colors.isMonochrome) Color(0xFF18181B) else SshSuccessGreen
    val activeTint = if (colors.isMonochrome) Color(0xFF18181B) else SshSuccessGreen

    val passedDotColor = if (colors.isMonochrome) Color(0xFF71717A) else colors.textMuted
    val normalDotColor = if (colors.isMonochrome) Color(0xFF18181B) else colors.primary
    val dotColor = if (isActive) activeTint else if (isPassed) passedDotColor else normalDotColor

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        // Vertical Timeline Axis Bar & Dot Indicator
        Box(
            modifier = Modifier.width(24.dp),
            contentAlignment = Alignment.Center
        ) {
            Box(
                modifier = Modifier
                    .width(2.dp)
                    .height(68.dp)
                    .background(if (colors.isMonochrome) Color(0xFFE4E4E7) else colors.border)
            )
            Box(
                modifier = Modifier
                    .size(if (isActive) 12.dp else 8.dp)
                    .clip(CircleShape)
                    .background(dotColor)
                    .border(
                        width = if (isActive) 2.dp else 1.dp,
                        color = Color.White,
                        shape = CircleShape
                    )
            )
        }

        Spacer(modifier = Modifier.width(6.dp))

        // Main Schedule Card
        TactileCard(
            containerColor = if (isActive) activeCardBg else colors.card,
            borderColor = if (isActive) activeBorder else colors.border,
            cornerRadius = 14.dp,
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    // Left: Time Capsule & Prayer Name
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.weight(1f)
                    ) {
                        Surface(
                            color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                            shape = RoundedCornerShape(6.dp),
                            modifier = Modifier.padding(end = 10.dp)
                        ) {
                            Text(
                                text = item.timeFormatted.replace(" AM", "").replace(" PM", ""),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.textPrimary,
                                modifier = Modifier.padding(horizontal = 6.dp, vertical = 3.dp)
                            )
                        }

                        Icon(
                            imageVector = item.icon,
                            contentDescription = null,
                            tint = if (isActive) activeTint else colors.textPrimary,
                            modifier = Modifier.size(16.dp)
                        )
                        Spacer(modifier = Modifier.width(6.dp))

                        Column {
                            Text(
                                text = item.name,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Bold,
                                color = if (isActive) activeTint else colors.textPrimary
                            )
                            Text(
                                text = item.description,
                                fontSize = 9.sp,
                                color = colors.textSecondary
                            )
                        }
                    }

                    // Right: Formatted Full Time & Mute Notification Toggle
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text(
                            text = item.timeFormatted,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isActive) activeTint else colors.textPrimary
                        )

                        IconButton(
                            onClick = { isNotificationMuted = !isNotificationMuted },
                            modifier = Modifier.size(24.dp)
                        ) {
                            Icon(
                                imageVector = if (isNotificationMuted) Icons.AutoMirrored.Filled.VolumeOff else Icons.AutoMirrored.Filled.VolumeUp,
                                contentDescription = "Toggle Mute",
                                tint = if (isNotificationMuted) colors.textMuted else (if (isActive) activeTint else colors.textSecondary),
                                modifier = Modifier.size(14.dp)
                            )
                        }
                    }
                }

                // Active Prayer Progress Bar and Countdown Timer
                if (isActive && remainingTime != null) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                text = "Active Period",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = activeTint
                            )
                            Text(
                                text = "$remainingTime remaining",
                                fontSize = 9.sp,
                                fontWeight = FontWeight.Bold,
                                color = activeTint
                            )
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        LinearProgressIndicator(
                            progress = { progress },
                            color = activeTint,
                            trackColor = if (colors.isMonochrome) Color(0xFFD4D4D8) else Color(0xFFBBF7D0),
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(4.dp)
                                .clip(RoundedCornerShape(2.dp))
                        )
                    }
                }
            }
        }
    }
}
