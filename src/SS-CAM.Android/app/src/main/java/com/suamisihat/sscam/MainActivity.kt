package com.suamisihat.sscam

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.Assignment
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalHapticFeedback
import androidx.compose.ui.hapticfeedback.HapticFeedbackType
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.data.api.LoginRequest
import com.suamisihat.sscam.data.api.SscamApiService
import com.suamisihat.sscam.data.sync.SyncQueueManager
import com.suamisihat.sscam.data.models.CreateProjectRequest
import com.suamisihat.sscam.data.models.CreativeOrder
import com.suamisihat.sscam.data.models.CreateOrderRequest
import com.suamisihat.sscam.data.models.DecisionRequest
import com.suamisihat.sscam.data.models.NotificationItem
import com.suamisihat.sscam.data.models.ProjectItem
import com.suamisihat.sscam.data.models.StaffMember
import com.suamisihat.sscam.ui.components.*
import com.suamisihat.sscam.ui.screens.*
import com.suamisihat.sscam.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : androidx.fragment.app.FragmentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Initialize high-priority deliverable, solat and studio notification channels
        com.suamisihat.sscam.service.SscamNotificationService.initNotificationChannels(this)

        setContent {
            val context = LocalContext.current
            var currentTheme by remember { mutableStateOf(ThemePreferences.getSavedTheme(context)) }
            var showSplash by remember { mutableStateOf(true) }

            SscamTheme(themeMode = currentTheme) {
                if (showSplash) {
                    SsHeroSplashScreen(
                        onSplashFinished = { showSplash = false }
                    )
                } else {
                    CompanionAppScreen(
                        currentTheme = currentTheme,
                        onThemeChange = {
                            currentTheme = it
                            ThemePreferences.saveTheme(context, it)
                        }
                    )
                }
            }
        }
    }
}

object AuthPreferences {
    private const val PREFS_NAME = "sscam_auth_prefs"
    private const val KEY_IS_LOGGED_IN = "is_logged_in"
    private const val KEY_USERNAME = "saved_username"
    private const val KEY_TOKEN = "saved_token"

    fun isLoggedIn(context: android.content.Context): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
        return prefs.getBoolean(KEY_IS_LOGGED_IN, true) // Default true for instant studio entry, persistent across logout
    }

    fun getSavedUsername(context: android.content.Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
        return prefs.getString(KEY_USERNAME, "harussani") ?: "harussani"
    }

    fun getSavedToken(context: android.content.Context): String? {
        val prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
        return prefs.getString(KEY_TOKEN, null)
    }

    fun saveAuth(context: android.content.Context, username: String, token: String?, isLoggedIn: Boolean) {
        val prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean(KEY_IS_LOGGED_IN, isLoggedIn)
            .putString(KEY_USERNAME, username)
            .putString(KEY_TOKEN, token)
            .apply()
    }

    fun clearAuth(context: android.content.Context) {
        val prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean(KEY_IS_LOGGED_IN, false)
            .remove(KEY_TOKEN)
            .apply()
    }
}

object ProjectCacheManager {
    private const val PREFS_NAME = "sscam_data_cache"
    private const val KEY_PROJECTS_JSON = "cached_projects_json"
    private const val KEY_STAFF_JSON = "cached_staff_json"
    private const val KEY_ORDERS_JSON = "cached_orders_json"
    private val gson = com.google.gson.Gson()

    fun getCachedProjects(context: android.content.Context): List<ProjectItem> {
        val prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
        val json = prefs.getString(KEY_PROJECTS_JSON, null) ?: return emptyList()
        return try {
            val type = object : com.google.gson.reflect.TypeToken<List<ProjectItem>>() {}.type
            gson.fromJson(json, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveProjects(context: android.content.Context, projects: List<ProjectItem>) {
        val prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
        val json = gson.toJson(projects)
        prefs.edit().putString(KEY_PROJECTS_JSON, json).apply()
    }

    fun getCachedStaff(context: android.content.Context): List<StaffMember> {
        val prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
        val json = prefs.getString(KEY_STAFF_JSON, null) ?: return emptyList()
        return try {
            val type = object : com.google.gson.reflect.TypeToken<List<StaffMember>>() {}.type
            gson.fromJson(json, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveStaff(context: android.content.Context, staff: List<StaffMember>) {
        val prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
        val json = gson.toJson(staff)
        prefs.edit().putString(KEY_STAFF_JSON, json).apply()
    }

    fun getCachedOrders(context: android.content.Context): List<CreativeOrder> {
        val prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
        val json = prefs.getString(KEY_ORDERS_JSON, null)
        if (json != null) {
            try {
                val type = object : com.google.gson.reflect.TypeToken<List<CreativeOrder>>() {}.type
                val list: List<CreativeOrder>? = gson.fromJson(json, type)
                if (list != null && list.isNotEmpty()) return list
            } catch (e: Exception) { }
        }
        return getSeedOrders()
    }

    fun saveOrders(context: android.content.Context, orders: List<CreativeOrder>) {
        val prefs = context.getSharedPreferences(PREFS_NAME, android.content.Context.MODE_PRIVATE)
        val json = gson.toJson(orders)
        prefs.edit().putString(KEY_ORDERS_JSON, json).apply()
    }

    private fun getSeedOrders(): List<CreativeOrder> {
        return listOf(
            CreativeOrder(
                id = "ORD-260904-7821",
                title = "Rejal Madu Tualang TikTok Hook & Reels 9:16",
                entity = "SSE",
                priority = "tier_2",
                format = "9_16_video",
                copy = "Hook: Tenaga drop pukul 3 petang? Ini rahsia orang lama kekal bertenaga sampai malam dengan Madu Tualang Asli SuamiSihat. Call to action: Tekan beg kuning sebelum habis promosi!",
                targetDate = "2026-09-07",
                attachmentNote = "\\\\SSNAS\\Creative-Team\\RAW_FOOTAGE\\Rejal_Madu_2026",
                requester = "Harussani",
                requesterRole = "Admin, Designer",
                status = "pending",
                submittedAt = "2026-09-04T09:15:00Z",
                updatedAt = "2026-09-04T09:15:00Z"
            ),
            CreativeOrder(
                id = "ORD-260904-4192",
                title = "Men Clinic Health Awareness POSM & Rollup",
                entity = "SSC",
                priority = "tier_1",
                format = "print_posm",
                copy = "Headline: Kesihatan Lelaki Keutamaan Kami. Dapatkan konsultasi percuma bersama doktor pakar SuamiSihat Clinic cawangan Bangi & Shah Alam.",
                targetDate = "2026-09-10",
                attachmentNote = "drive.google.com/drive/folders/ssc-bangi-posm",
                requester = "Dr. Danial",
                requesterRole = "Medical Director",
                status = "in_progress",
                submittedAt = "2026-09-03T14:30:00Z",
                updatedAt = "2026-09-03T16:00:00Z"
            ),
            CreativeOrder(
                id = "ORD-260904-1055",
                title = "SuamiSihat Holding Annual Corporate Deck",
                entity = "SSH",
                priority = "tier_3",
                format = "16_9_landscape",
                copy = "Executive presentation for Board of Directors Q3 Strategy & Financial Review. Include 5-subsidiary breakdown slides.",
                targetDate = "2026-09-05",
                attachmentNote = "\\\\SSNAS\\Corporate\\Q3_Brief.pdf",
                requester = "CEO Office",
                requesterRole = "Executive",
                status = "for_approval",
                submittedAt = "2026-09-04T08:00:00Z",
                updatedAt = "2026-09-04T08:30:00Z"
            )
        )
    }
}

enum class CompanionScreen(val title: String, val icon: ImageVector) {
    Dashboard("Overview", Icons.Default.Home),
    Tasks("Tasks", Icons.AutoMirrored.Filled.Assignment),
    Team("Studio", Icons.Default.Group),
    Wellbeing("Lounge", Icons.Default.Spa)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CompanionAppScreen(
    currentTheme: AppThemeMode = AppThemeMode.SS_LIGHT,
    onThemeChange: (AppThemeMode) -> Unit = {}
) {
    val context = LocalContext.current
    val colors = LocalSscamColors.current
    val haptic = LocalHapticFeedback.current
    val coroutineScope = rememberCoroutineScope()

    var isLoggedIn by remember { mutableStateOf(AuthPreferences.isLoggedIn(context)) }
    var activeUsername by remember { mutableStateOf(AuthPreferences.getSavedUsername(context)) }
    var isAuthenticating by remember { mutableStateOf(false) }
    var loginErrorMessage by remember { mutableStateOf<String?>(null) }

    var selectedScreen by remember { mutableStateOf(CompanionScreen.Dashboard) }
    var isSettingsOpen by remember { mutableStateOf(false) }
    var isNotificationsOpen by remember { mutableStateOf(false) }
    var isNowPlayingSheetOpen by remember { mutableStateOf(false) }
    var isDeskModeActive by remember { mutableStateOf(false) }

    var teamSubTab by remember { mutableStateOf(0) }
    var wellbeingSubTab by remember { mutableStateOf(0) }

    var isLiveSync by remember { mutableStateOf(false) }
    var syncMessage by remember { mutableStateOf("Connecting to Synology NAS...") }
    var isLoading by remember { mutableStateOf(true) }

    var projects by remember {
        mutableStateOf<List<ProjectItem>>(ProjectCacheManager.getCachedProjects(context))
    }
    var staffList by remember {
        mutableStateOf<List<StaffMember>>(ProjectCacheManager.getCachedStaff(context))
    }
    var orders by remember {
        mutableStateOf<List<CreativeOrder>>(ProjectCacheManager.getCachedOrders(context))
    }
    var authToken by remember { mutableStateOf<String?>(AuthPreferences.getSavedToken(context)) }

    var notifications by remember {
        mutableStateOf<List<NotificationItem>>(emptyList())
    }

    val unreadNotifCount = remember(notifications) {
        notifications.count { !it.read }
    }

    fun refreshLiveData() {
        coroutineScope.launch {
            isLoading = true
            syncMessage = "Syncing with creative.suamisihat.myds.me..."
            try {
                withContext(Dispatchers.IO) {
                    val anonApi = SscamApiService.create()
                    val loginRes = anonApi.login(LoginRequest(activeUsername))
                    val token = if (loginRes.isSuccessful) loginRes.body()?.token else null
                    authToken = token

                    val api = SscamApiService.create(authToken = token)
                    try { SyncQueueManager.flushQueue(context, api) } catch (e: Exception) { }
                    val projRes = api.getProjects()
                    val teamRes = api.getTeam()
                    val orderRes = try { api.getOrders() } catch (e: Exception) { null }
                    val notifRes = try { api.getNotifications() } catch (e: Exception) { null }

                    val fetchedProjects = if (projRes.isSuccessful && projRes.body() != null) {
                        projRes.body()!!.projects
                    } else emptyList()

                    val fetchedStaff = if (teamRes.isSuccessful && teamRes.body() != null) {
                        teamRes.body()!!.allStaff
                    } else emptyList()

                    val fetchedOrders = if (orderRes?.isSuccessful == true && orderRes.body() != null) {
                        orderRes.body()!!.orders
                    } else emptyList()

                    val fetchedNotifs = if (notifRes?.isSuccessful == true && notifRes.body()?.notifications?.isNotEmpty() == true) {
                        notifRes.body()!!.notifications
                    } else null

                    withContext(Dispatchers.Main) {
                        if (fetchedProjects.isNotEmpty() || fetchedStaff.isNotEmpty() || fetchedOrders.isNotEmpty()) {
                            if (fetchedProjects.isNotEmpty()) {
                                projects = fetchedProjects
                                ProjectCacheManager.saveProjects(context, fetchedProjects)
                            }
                            if (fetchedStaff.isNotEmpty()) {
                                staffList = fetchedStaff
                                ProjectCacheManager.saveStaff(context, fetchedStaff)
                            }
                            if (fetchedOrders.isNotEmpty()) {
                                orders = fetchedOrders
                                ProjectCacheManager.saveOrders(context, fetchedOrders)
                            }
                            if (fetchedNotifs != null) {
                                notifications = fetchedNotifs
                            }
                            isLiveSync = true
                            syncMessage = "Live NAS Synced (${projects.size} deliverables • ${orders.size} orders)"
                        } else {
                            syncMessage = "NAS Live API: HTTP ${projRes.code()}"
                        }
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    syncMessage = "Synology NAS: Offline Mode"
                }
            } finally {
                withContext(Dispatchers.Main) {
                    isLoading = false
                }
            }
        }
    }

    LaunchedEffect(Unit) {
        refreshLiveData()
        while (true) {
            kotlinx.coroutines.delay(30_000)
            refreshLiveData()
        }
    }

    val currentUserProfile = remember(staffList, activeUsername) {
        staffList.find {
            it.username.equals(activeUsername, ignoreCase = true) ||
            it.name.equals(activeUsername, ignoreCase = true) ||
            it.staffId.equals(activeUsername, ignoreCase = true)
        }
    }

    val userSubsidiary = remember(currentUserProfile) {
        currentUserProfile?.defaultBrand ?: "SSH"
    }

    val userSubsidiaryName = remember(userSubsidiary) {
        when (userSubsidiary.uppercase()) {
            "SSH", "SS" -> "SuamiSihat HQ"
            "SSC" -> "SuamiSihat Clinic"
            "SSW" -> "SuamiSihat Wellness"
            "SSE" -> "SuamiSihat Enterprise"
            "SST" -> "SuamiSihat Tech"
            else -> "SuamiSihat"
        }
    }

    val currentLogoRes = remember(userSubsidiary, colors.isDark) {
        when (userSubsidiary.uppercase()) {
            "SSH", "SS" -> if (colors.isDark) R.drawable.logo_ssh_dark else R.drawable.logo_ssh_light
            "SSC" -> if (colors.isDark) R.drawable.logo_ssc_dark else R.drawable.logo_ssc_light
            "SSW" -> if (colors.isDark) R.drawable.logo_ssw_dark else R.drawable.logo_ssw_light
            "SSE" -> if (colors.isDark) R.drawable.logo_sse_dark else R.drawable.logo_sse_light
            "SST" -> if (colors.isDark) R.drawable.logo_sst_dark else R.drawable.logo_sst_light
            else -> if (colors.isDark) R.drawable.logo_ssh_dark else R.drawable.logo_ssh_light
        }
    }

    if (isDeskModeActive) {
        // High-legibility Swiss Desk Companion OLED Standby Mode
        DeskCompanionMode(
            activeProjects = projects,
            onExit = { isDeskModeActive = false }
        )
    } else if (!isLoggedIn) {
        LoginScreen(
            staffList = staffList,
            initialUsername = activeUsername,
            isLoading = isAuthenticating,
            errorMessage = loginErrorMessage,
            onBiometricLogin = {
                val activity = context as? androidx.fragment.app.FragmentActivity
                if (activity != null && com.suamisihat.sscam.util.BiometricAuthManager.isBiometricAvailable(context)) {
                    com.suamisihat.sscam.util.BiometricAuthManager.promptBiometric(
                        activity = activity,
                        onSuccess = {
                            val savedUser = AuthPreferences.getSavedUsername(context).ifEmpty { "harussani" }
                            activeUsername = savedUser
                            isLoggedIn = true
                            refreshLiveData()
                            Toast.makeText(context, "Biometric authenticated: Welcome back, $savedUser!", Toast.LENGTH_SHORT).show()
                        },
                        onError = { err ->
                            Toast.makeText(context, err, Toast.LENGTH_SHORT).show()
                        }
                    )
                } else {
                    Toast.makeText(context, "Biometric hardware not available or not enrolled", Toast.LENGTH_SHORT).show()
                }
            },
            onLogin = { username, password, rememberMe ->
                coroutineScope.launch {
                    isAuthenticating = true
                    loginErrorMessage = null
                    try {
                        withContext(Dispatchers.IO) {
                            val api = SscamApiService.create()
                            val res = api.login(LoginRequest(username = username, password = password))
                            if (res.isSuccessful && res.body() != null) {
                                val body = res.body()!!
                                val token = body.token
                                withContext(Dispatchers.Main) {
                                    activeUsername = username
                                    authToken = token
                                    isLoggedIn = true
                                    if (rememberMe) {
                                        AuthPreferences.saveAuth(context, username, token, true)
                                    }
                                    refreshLiveData()
                                    Toast.makeText(context, "Authenticated with Synology NAS", Toast.LENGTH_SHORT).show()
                                }
                            } else {
                                withContext(Dispatchers.Main) {
                                    activeUsername = username
                                    isLoggedIn = true
                                    if (rememberMe) {
                                        AuthPreferences.saveAuth(context, username, null, true)
                                    }
                                    refreshLiveData()
                                    Toast.makeText(context, "Welcome, $username (Studio Mode)", Toast.LENGTH_SHORT).show()
                                }
                            }
                        }
                    } catch (e: Exception) {
                        withContext(Dispatchers.Main) {
                            activeUsername = username
                            isLoggedIn = true
                            if (rememberMe) {
                                AuthPreferences.saveAuth(context, username, null, true)
                            }
                            refreshLiveData()
                            Toast.makeText(context, "Welcome, $username (Offline Mode)", Toast.LENGTH_SHORT).show()
                        }
                    } finally {
                        withContext(Dispatchers.Main) {
                            isAuthenticating = false
                        }
                    }
                }
            }
        )
    } else {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = {
                        if (isSettingsOpen) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(
                                    text = "Settings & Preferences",
                                    fontSize = 18.sp,
                                    fontWeight = FontWeight.Bold,
                                    color = colors.textPrimary
                                )
                            }
                        } else {
                            // Official SuamiSihat Dual-S Logomark (Theme Adaptive)
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(vertical = 2.dp)
                            ) {
                                androidx.compose.foundation.Image(
                                    painter = androidx.compose.ui.res.painterResource(
                                        id = if (colors.isDark) R.drawable.ic_suamisihat_mark_dark else R.drawable.ic_suamisihat_mark_light
                                    ),
                                    contentDescription = "SuamiSihat Logomark",
                                    colorFilter = if (colors.isMonochrome) androidx.compose.ui.graphics.ColorFilter.colorMatrix(androidx.compose.ui.graphics.ColorMatrix().apply { setToSaturation(0f) }) else null,
                                    modifier = Modifier
                                        .size(30.dp)
                                        .clickable(
                                            interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
                                            indication = null
                                        ) {
                                            selectedScreen = CompanionScreen.Dashboard
                                            isSettingsOpen = false
                                        },
                                    contentScale = androidx.compose.ui.layout.ContentScale.Fit
                                )

                                // Header: Now Playing Radio (if active) OR Official Brand Title
                                if (StudioRadioManager.isPlaying) {
                                    Surface(
                                        onClick = { isNowPlayingSheetOpen = true },
                                        shape = RoundedCornerShape(14.dp),
                                        color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFEFF6FF),
                                        border = androidx.compose.foundation.BorderStroke(
                                            1.dp,
                                            if (colors.isDark) SshWarmGoldBright.copy(alpha = 0.5f) else SshAzure.copy(alpha = 0.5f)
                                        ),
                                        modifier = Modifier.padding(start = 8.dp)
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp)
                                        ) {
                                            AnimatedEqualizerBars(
                                                isAnimating = true,
                                                color = if (colors.isDark) SshWarmGoldBright else SshAzure
                                            )
                                            Text(
                                                text = StudioRadioManager.currentTrackTitle,
                                                fontSize = 11.5.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = if (colors.isDark) SshWarmGoldBright else SshAzure,
                                                maxLines = 1,
                                                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                                modifier = Modifier.widthIn(max = 180.dp)
                                            )
                                        }
                                    }
                                } else {
                                    Spacer(modifier = Modifier.width(8.dp))
                                    Text(
                                        text = "SuamiSihat",
                                        fontSize = 16.sp,
                                        fontWeight = FontWeight.Bold,
                                        color = colors.textPrimary,
                                        maxLines = 1,
                                        overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis
                                    )
                                }
                            }
                        }
                    },
                    navigationIcon = {
                        if (isSettingsOpen) {
                            IconButton(onClick = { isSettingsOpen = false }) {
                                Icon(
                                    Icons.AutoMirrored.Filled.ArrowBack,
                                    contentDescription = "Back",
                                    tint = colors.textPrimary
                                )
                            }
                        }
                    },
                    actions = {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                            modifier = Modifier.padding(end = 12.dp)
                        ) {

                            // Notification Bell with Badge
                            Box(
                                contentAlignment = Alignment.TopEnd,
                                modifier = Modifier.size(36.dp)
                            ) {
                                IconButton(
                                    onClick = { isNotificationsOpen = true },
                                    modifier = Modifier.size(36.dp)
                                ) {
                                    Icon(
                                        Icons.Default.Notifications,
                                        contentDescription = "Notifications",
                                        tint = colors.textPrimary,
                                        modifier = Modifier.size(18.dp)
                                    )
                                }
                                if (unreadNotifCount > 0) {
                                    Box(
                                        modifier = Modifier
                                            .size(8.dp)
                                            .clip(CircleShape)
                                            .background(if (colors.isMonochrome) Color(0xFF18181B) else colors.accent)
                                    )
                                }
                            }

                            Spacer(modifier = Modifier.width(2.dp))

                            // Profile Avatar -> Toggles Swiss Editorial Profile
                            UserProfileAvatar(
                                imageUrl = currentUserProfile?.profileImageUrl,
                                initials = currentUserProfile?.name ?: "Harussani",
                                avatarColorHex = currentUserProfile?.avatarColor ?: "#0078D4",
                                size = 36.dp,
                                onClick = { isSettingsOpen = !isSettingsOpen }
                            )
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(containerColor = colors.surface)
                )
            },
            bottomBar = {
                // Tactile Skeuomorphic Console Dock with Spring Pill Physics
                Surface(
                    color = colors.surface,
                    border = BorderStroke(1.2.dp, colors.border),
                    shadowElevation = if (colors.isMonochrome) 0.dp else 10.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Box(modifier = Modifier.fillMaxWidth()) {
                        // Top Specular Highlight Bevel
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(2.dp)
                                .background(TactileBevelLight)
                        )

                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .navigationBarsPadding()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.SpaceAround,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            CompanionScreen.entries.forEach { screen ->
                                val isSelected = !isSettingsOpen && selectedScreen == screen

                                if (isSelected) {
                                    // Active Item: Tactile Extruded Pill with Label
                                    Box(
                                        modifier = Modifier
                                            .clip(RoundedCornerShape(20.dp))
                                            .background(colors.activePillBg)
                                            .border(1.dp, if (colors.isMonochrome) Color(0xFF27272A) else Color.White.copy(alpha = 0.25f), RoundedCornerShape(20.dp))
                                            .animateContentSize(
                                                animationSpec = spring(
                                                    dampingRatio = Spring.DampingRatioLowBouncy,
                                                    stiffness = Spring.StiffnessMediumLow
                                                )
                                            )
                                            .padding(horizontal = 16.dp, vertical = 8.dp)
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                                        ) {
                                            Icon(
                                                screen.icon,
                                                contentDescription = screen.title,
                                                tint = colors.activePillTint,
                                                modifier = Modifier.size(18.dp)
                                            )
                                            Text(
                                                text = screen.title,
                                                fontSize = 12.sp,
                                                fontWeight = FontWeight.Bold,
                                                color = colors.activePillTint
                                            )
                                        }
                                    }
                                } else {
                                    // Inactive Item: Tactile Sunken Touch Well
                                    Box(
                                        modifier = Modifier
                                            .clip(CircleShape)
                                            .clickable {
                                                haptic.performHapticFeedback(HapticFeedbackType.TextHandleMove)
                                                isSettingsOpen = false
                                                selectedScreen = screen
                                            }
                                            .padding(horizontal = 14.dp, vertical = 10.dp),
                                        contentAlignment = Alignment.Center
                                    ) {
                                        Icon(
                                            screen.icon,
                                            contentDescription = screen.title,
                                            tint = if (colors.isDark) Color(0xFF94A3B8) else Color(0xFF0F172A),
                                            modifier = Modifier.size(22.dp)
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            },
            containerColor = colors.background
        ) { padding ->
            Box(modifier = Modifier.padding(padding)) {
                if (isSettingsOpen) {
                    SettingsProfileScreen(
                        currentTheme = currentTheme,
                        currentUserProfile = currentUserProfile,
                        onThemeSelected = onThemeChange,
                        onSignOut = {
                            isLoggedIn = false
                            AuthPreferences.clearAuth(context)
                            isSettingsOpen = false
                            Toast.makeText(context, "Signed out of studio workstation", Toast.LENGTH_SHORT).show()
                        }
                    )
                } else {
                    FluentPullToRefresh(
                        isRefreshing = isLoading,
                        onRefresh = { refreshLiveData() }
                    ) {
                        when (selectedScreen) {
                            CompanionScreen.Dashboard -> DashboardCompanionScreen(
                                projects = projects,
                                syncMessage = syncMessage,
                                isLiveSync = isLiveSync,
                                onNavigateDestination = { destination, subTab ->
                                    when (destination) {
                                        "Tasks" -> {
                                            selectedScreen = CompanionScreen.Tasks
                                        }
                                        "Team" -> {
                                            teamSubTab = subTab
                                            selectedScreen = CompanionScreen.Team
                                        }
                                        "Wellbeing" -> {
                                            wellbeingSubTab = subTab
                                            selectedScreen = CompanionScreen.Wellbeing
                                        }
                                    }
                                },
                                onSignOff = { item ->
                                    // Optimistic local state update (0ms instant response)
                                    projects = projects.map {
                                        if (it.id == item.id) it.copy(status = "done") else it
                                    }
                                    coroutineScope.launch {
                                        val req = DecisionRequest("approved", "1-tap companion signoff", activeUsername)
                                        try {
                                            val api = SscamApiService.create(authToken = authToken)
                                            api.submitDecision(item.id, req)
                                            Toast.makeText(context, "Signed off ${item.title}!", Toast.LENGTH_SHORT).show()
                                            refreshLiveData()
                                        } catch (e: Exception) {
                                            SyncQueueManager.queueDecision(context, item.id, req)
                                            Toast.makeText(context, "Queued offline: Sign-off recorded for ${item.title}", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                },
                                orders = orders,
                                onUpdateOrderStatus = { orderId, newStatus ->
                                    orders = orders.map { if (it.id == orderId) it.copy(status = newStatus) else it }
                                    ProjectCacheManager.saveOrders(context, orders)
                                    Toast.makeText(context, "Status updated to ${newStatus.replace('_', ' ').replaceFirstChar { it.uppercase() }}", Toast.LENGTH_SHORT).show()
                                    coroutineScope.launch {
                                        try {
                                            withContext(Dispatchers.IO) {
                                                val api = SscamApiService.create(authToken = authToken)
                                                api.updateOrderStatus(orderId, mapOf("status" to newStatus))
                                            }
                                        } catch (e: Exception) { }
                                    }
                                },
                                onSubmitNewOrder = { req ->
                                    val now = java.util.Date()
                                    val localId = "ORD-" + java.text.SimpleDateFormat("yyMMdd", java.util.Locale.US).format(now) + "-" + (1000..9999).random()
                                    val newOrder = CreativeOrder(
                                        id = localId,
                                        title = req.title,
                                        entity = req.entity,
                                        priority = req.priority,
                                        format = req.format,
                                        copy = req.copy,
                                        targetDate = req.targetDate,
                                        attachmentNote = req.attachmentNote,
                                        requester = req.requester,
                                        requesterRole = req.requesterRole,
                                        status = "pending",
                                        submittedAt = java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", java.util.Locale.US).format(now)
                                    )
                                    orders = listOf(newOrder) + orders
                                    ProjectCacheManager.saveOrders(context, orders)
                                    Toast.makeText(context, "Creative request queued: ${req.title}", Toast.LENGTH_SHORT).show()
                                    coroutineScope.launch {
                                        try {
                                            withContext(Dispatchers.IO) {
                                                val api = SscamApiService.create(authToken = authToken)
                                                api.submitOrder(req)
                                            }
                                            refreshLiveData()
                                        } catch (e: Exception) { }
                                    }
                                }
                            )
                            CompanionScreen.Tasks -> TaskManagerScreen(
                                projects = projects,
                                onSignOff = { item ->
                                    // Optimistic local state update (0ms instant response)
                                    projects = projects.map {
                                        if (it.id == item.id) it.copy(status = "done") else it
                                    }
                                    coroutineScope.launch {
                                        val req = DecisionRequest("approved", "1-tap companion signoff", activeUsername)
                                        try {
                                            val api = SscamApiService.create(authToken = authToken)
                                            api.submitDecision(item.id, req)
                                            Toast.makeText(context, "Signed off ${item.title}!", Toast.LENGTH_SHORT).show()
                                            refreshLiveData()
                                        } catch (e: Exception) {
                                            SyncQueueManager.queueDecision(context, item.id, req)
                                            Toast.makeText(context, "Queued offline: Sign-off recorded for ${item.title}", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                },
                                onRevise = { item ->
                                    // Optimistic local state update
                                    projects = projects.map {
                                        if (it.id == item.id) it.copy(status = "revision_requested") else it
                                    }
                                    coroutineScope.launch {
                                        val req = DecisionRequest("revision_requested", "Companion revision request", activeUsername)
                                        try {
                                            val api = SscamApiService.create(authToken = authToken)
                                            api.submitDecision(item.id, req)
                                            Toast.makeText(context, "Revision requested for ${item.title}", Toast.LENGTH_SHORT).show()
                                            refreshLiveData()
                                        } catch (e: Exception) {
                                            SyncQueueManager.queueDecision(context, item.id, req)
                                            Toast.makeText(context, "Queued offline: Revision requested for ${item.title}", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                },
                                onCreateNewTask = { title, desc, brand, priority ->
                                    coroutineScope.launch {
                                        try {
                                            val api = SscamApiService.create(authToken = authToken)
                                            val res = api.createProject(
                                                CreateProjectRequest(
                                                    title = title,
                                                    brand = brand,
                                                    designer = currentUserProfile?.name ?: "Harussani",
                                                    priority = priority,
                                                    department = "Creative Production",
                                                    deadline = "2026-09-15"
                                                )
                                            )
                                            if (res.isSuccessful && res.body() != null) {
                                                projects = listOf(res.body()!!) + projects
                                            } else {
                                                val newProj = ProjectItem(
                                                    id = "proj_" + System.currentTimeMillis(),
                                                    title = title,
                                                    brand = brand,
                                                    status = "in_progress",
                                                    priority = priority,
                                                    designer = currentUserProfile?.name ?: "Harussani",
                                                    deadline = "2026-09-15T00:00:00.000Z"
                                                )
                                                projects = listOf(newProj) + projects
                                            }
                                            Toast.makeText(context, "Created deliverable: $title", Toast.LENGTH_SHORT).show()
                                            refreshLiveData()
                                        } catch (e: Exception) {
                                            val newProj = ProjectItem(
                                                id = "proj_" + System.currentTimeMillis(),
                                                title = title,
                                                brand = brand,
                                                status = "in_progress",
                                                priority = priority,
                                                designer = currentUserProfile?.name ?: "Harussani",
                                                deadline = "2026-09-15T00:00:00.000Z"
                                            )
                                            projects = listOf(newProj) + projects
                                            Toast.makeText(context, "Offline Task Created: $title", Toast.LENGTH_SHORT).show()
                                        }
                                    }
                                }
                            )
                            CompanionScreen.Team -> TeamHubScreen(
                                staffList = staffList,
                                projects = projects,
                                initialSubTab = teamSubTab
                            )
                            CompanionScreen.Wellbeing -> WellbeingHubScreen(
                                initialSubTab = wellbeingSubTab,
                                onLaunchDeskMode = { isDeskModeActive = true }
                            )
                        }
                    }
                }

                // Notifications Bottom Sheet
                if (isNotificationsOpen) {
                    NotificationsBottomSheet(
                        notifications = notifications,
                        onDismiss = { isNotificationsOpen = false },
                        onNotificationClick = { notif ->
                            isNotificationsOpen = false
                            // Mark as read
                            notifications = notifications.map { if (it.id == notif.id) it.copy(read = true) else it }
                            // Navigate to Tasks if related
                            if (notif.type == "approval" || notif.type == "revision" || notif.type == "brief") {
                                selectedScreen = CompanionScreen.Tasks
                            }
                        },
                        onMarkAllAsRead = {
                            notifications = notifications.map { it.copy(read = true) }
                            Toast.makeText(context, "All notifications marked as read", Toast.LENGTH_SHORT).show()
                        }
                    )
                }

                // Now Playing Radio Bottom Sheet & Station Playlist
                if (isNowPlayingSheetOpen) {
                    NowPlayingRadioBottomSheet(
                        onDismiss = { isNowPlayingSheetOpen = false },
                        onOpenFullRadio = {
                            isNowPlayingSheetOpen = false
                            selectedScreen = CompanionScreen.Wellbeing
                            wellbeingSubTab = 2 // Radio tab
                        }
                    )
                }
            }
        }
    }
}
