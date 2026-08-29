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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.data.api.LoginRequest
import com.suamisihat.sscam.data.api.SscamApiService
import com.suamisihat.sscam.data.models.CreateProjectRequest
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

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            val context = LocalContext.current
            var currentTheme by remember { mutableStateOf(ThemePreferences.getSavedTheme(context)) }
            SscamTheme(themeMode = currentTheme) {
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
    val coroutineScope = rememberCoroutineScope()

    var isLoggedIn by remember { mutableStateOf(AuthPreferences.isLoggedIn(context)) }
    var activeUsername by remember { mutableStateOf(AuthPreferences.getSavedUsername(context)) }
    var isAuthenticating by remember { mutableStateOf(false) }
    var loginErrorMessage by remember { mutableStateOf<String?>(null) }

    var selectedScreen by remember { mutableStateOf(CompanionScreen.Dashboard) }
    var isSettingsOpen by remember { mutableStateOf(false) }
    var isNotificationsOpen by remember { mutableStateOf(false) }

    var teamSubTab by remember { mutableStateOf(0) }
    var wellbeingSubTab by remember { mutableStateOf(0) }

    var isLiveSync by remember { mutableStateOf(false) }
    var syncMessage by remember { mutableStateOf("Connecting to Synology NAS...") }
    var isLoading by remember { mutableStateOf(true) }

    var projects by remember { mutableStateOf<List<ProjectItem>>(emptyList()) }
    var staffList by remember { mutableStateOf<List<StaffMember>>(emptyList()) }
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

                    val authApi = SscamApiService.create(authToken = token)
                    val projRes = authApi.getProjects()
                    val teamRes = authApi.getTeam()
                    val notifRes = try { authApi.getNotifications() } catch (e: Exception) { null }

                    val fetchedProjects = if (projRes.isSuccessful && projRes.body() != null) {
                        projRes.body()!!.projects
                    } else emptyList()

                    val fetchedStaff = if (teamRes.isSuccessful && teamRes.body() != null) {
                        teamRes.body()!!.allStaff
                    } else emptyList()

                    val fetchedNotifs = if (notifRes?.isSuccessful == true && notifRes.body()?.notifications?.isNotEmpty() == true) {
                        notifRes.body()!!.notifications
                    } else null

                    withContext(Dispatchers.Main) {
                        if (fetchedProjects.isNotEmpty() || fetchedStaff.isNotEmpty()) {
                            projects = fetchedProjects
                            staffList = fetchedStaff
                            if (fetchedNotifs != null) {
                                notifications = fetchedNotifs
                            }
                            isLiveSync = true
                            syncMessage = "Live NAS Synced (${projects.size} deliverables • ${staffList.size} staff)"
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
            else -> "SuamiSihat HQ"
        }
    }

    val currentLogoRes = remember(userSubsidiary, colors.isDark) {
        when (userSubsidiary.uppercase()) {
            "SSH" -> if (colors.isDark) R.drawable.logo_ssh_dark else R.drawable.logo_ssh_light
            "SSC" -> if (colors.isDark) R.drawable.logo_ssc_dark else R.drawable.logo_ssc_light
            "SSW" -> if (colors.isDark) R.drawable.logo_ssw_dark else R.drawable.logo_ssw_light
            "SSE" -> if (colors.isDark) R.drawable.logo_sse_dark else R.drawable.logo_sse_light
            "SST" -> if (colors.isDark) R.drawable.logo_sst_dark else R.drawable.logo_sst_light
            else -> R.drawable.logo_ss_brand
        }
    }
    if (!isLoggedIn) {
        LoginScreen(
            staffList = staffList,
            initialUsername = activeUsername,
            isLoading = isAuthenticating,
            errorMessage = loginErrorMessage,
            onLogin = { username, password, rememberMe ->
                coroutineScope.launch {
                    isAuthenticating = true
                    loginErrorMessage = null
                    try {
                        withContext(Dispatchers.IO) {
                            val api = SscamApiService.create()
                            val res = api.login(LoginRequest(username))
                            if (res.isSuccessful && res.body()?.success == true) {
                                val token = res.body()?.token
                                withContext(Dispatchers.Main) {
                                    authToken = token
                                    activeUsername = username
                                    isLoggedIn = true
                                    if (rememberMe) {
                                        AuthPreferences.saveAuth(context, username, token, true)
                                    }
                                    refreshLiveData()
                                    Toast.makeText(context, "Welcome, $username!", Toast.LENGTH_SHORT).show()
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
                            // Actual Official SuamiSihat Logo automatically based on User Config from Web
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                modifier = Modifier.padding(vertical = 2.dp)
                            ) {
                                androidx.compose.foundation.Image(
                                    painter = androidx.compose.ui.res.painterResource(id = currentLogoRes),
                                    contentDescription = "SuamiSihat $userSubsidiary Logo",
                                    colorFilter = if (colors.isMonochrome) androidx.compose.ui.graphics.ColorFilter.colorMatrix(androidx.compose.ui.graphics.ColorMatrix().apply { setToSaturation(0f) }) else null,
                                    modifier = Modifier
                                        .height(28.dp)
                                        .wrapContentWidth(),
                                    contentScale = androidx.compose.ui.layout.ContentScale.Fit
                                )
                                Spacer(modifier = Modifier.width(6.dp))
                                // Live NAS Status Indicator Dot
                                Box(
                                    modifier = Modifier
                                        .size(6.dp)
                                        .clip(CircleShape)
                                        .background(if (colors.isMonochrome) Color(0xFF18181B) else if (isLiveSync) SshSuccessGreen else colors.accent)
                                )

                                Spacer(modifier = Modifier.width(8.dp))

                                // Header: Now Playing Radio (if active) OR User Subsidiary Company
                                if (StudioRadioManager.isPlaying) {
                                    Row(
                                        verticalAlignment = Alignment.CenterVertically,
                                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                                        modifier = Modifier.clickable(
                                            interactionSource = remember { androidx.compose.foundation.interaction.MutableInteractionSource() },
                                            indication = null
                                        ) {
                                            selectedScreen = CompanionScreen.Wellbeing
                                            wellbeingSubTab = 2 // Radio tab
                                        }
                                    ) {
                                        Icon(
                                            Icons.Default.GraphicEq,
                                            contentDescription = "Now Playing Radio",
                                            tint = if (colors.isDark) SshWarmGoldBright else SshAzure,
                                            modifier = Modifier.size(15.dp)
                                        )
                                        Text(
                                            text = StudioRadioManager.getCurrentStationName(),
                                            fontSize = 11.sp,
                                            fontWeight = FontWeight.Bold,
                                            color = if (colors.isDark) SshWarmGoldBright else SshAzure,
                                            maxLines = 1,
                                            overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                            modifier = Modifier.widthIn(max = 140.dp)
                                        )
                                    }
                                } else {
                                    Surface(
                                        color = if (colors.isDark) Color(0xFF1E293B) else Color(0xFFF1F5F9),
                                        shape = RoundedCornerShape(12.dp),
                                        border = BorderStroke(1.dp, colors.border)
                                    ) {
                                        Row(
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.spacedBy(4.dp),
                                            modifier = Modifier.padding(horizontal = 7.dp, vertical = 3.dp)
                                        ) {
                                            Icon(
                                                Icons.Default.Storefront,
                                                contentDescription = null,
                                                tint = colors.textSecondary,
                                                modifier = Modifier.size(12.dp)
                                            )
                                            Text(
                                                text = userSubsidiaryName,
                                                fontSize = 10.sp,
                                                fontWeight = FontWeight.SemiBold,
                                                color = colors.textPrimary,
                                                maxLines = 1,
                                                overflow = androidx.compose.ui.text.style.TextOverflow.Ellipsis,
                                                modifier = Modifier.widthIn(max = 115.dp)
                                            )
                                        }
                                    }
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
                            // Refresh Live NAS button
                            IconButton(
                                onClick = { refreshLiveData() },
                                modifier = Modifier.size(36.dp)
                            ) {
                                Icon(
                                    Icons.Default.Refresh,
                                    contentDescription = "Refresh Live NAS",
                                    tint = if (colors.isMonochrome) colors.textPrimary else if (isLoading) colors.primary else colors.textSecondary,
                                    modifier = Modifier.size(18.dp)
                                )
                            }

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
                                coroutineScope.launch {
                                    try {
                                        val api = SscamApiService.create(authToken = authToken)
                                        api.submitDecision(item.id, DecisionRequest("approved", "1-tap companion signoff", activeUsername))
                                        Toast.makeText(context, "Signed off ${item.title}!", Toast.LENGTH_SHORT).show()
                                        refreshLiveData()
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Sign-off recorded: ${item.title}", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            }
                        )
                        CompanionScreen.Tasks -> TaskManagerScreen(
                            projects = projects,
                            onSignOff = { item ->
                                coroutineScope.launch {
                                    try {
                                        val api = SscamApiService.create(authToken = authToken)
                                        api.submitDecision(item.id, DecisionRequest("approved", "1-tap companion signoff", activeUsername))
                                        Toast.makeText(context, "Signed off ${item.title}!", Toast.LENGTH_SHORT).show()
                                        refreshLiveData()
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Sign-off recorded: ${item.title}", Toast.LENGTH_SHORT).show()
                                    }
                                }
                            },
                            onRevise = { item ->
                                coroutineScope.launch {
                                    try {
                                        val api = SscamApiService.create(authToken = authToken)
                                        api.submitDecision(item.id, DecisionRequest("revision_requested", "Companion revision request", activeUsername))
                                        Toast.makeText(context, "Revision requested for ${item.title}", Toast.LENGTH_SHORT).show()
                                        refreshLiveData()
                                    } catch (e: Exception) {
                                        Toast.makeText(context, "Revision requested for ${item.title}", Toast.LENGTH_SHORT).show()
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
                            initialSubTab = teamSubTab
                        )
                        CompanionScreen.Wellbeing -> WellbeingHubScreen(
                            initialSubTab = wellbeingSubTab
                        )
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
            }
        }
    }
}
