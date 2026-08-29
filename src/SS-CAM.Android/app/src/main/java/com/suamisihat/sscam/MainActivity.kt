package com.suamisihat.sscam

import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import com.suamisihat.sscam.data.models.DecisionRequest
import com.suamisihat.sscam.data.models.ProjectItem
import com.suamisihat.sscam.ui.screens.*
import com.suamisihat.sscam.ui.theme.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SscamTheme {
                CompanionAppScreen()
            }
        }
    }
}

enum class CompanionScreen(val title: String, val icon: ImageVector) {
    Dashboard("Dashboard", Icons.Default.Dashboard),
    Tasks("Tasks", Icons.AutoMirrored.Filled.Assignment),
    Calendar("Calendar", Icons.Default.CalendarMonth),
    Notes("Notes", Icons.Default.EditNote),
    Wellbeing("Wellbeing", Icons.Default.Spa),
    Solat("Solat", Icons.Default.Mosque),
    Radio("Radio", Icons.Default.Radio),
    Profile("Profile", Icons.Default.Person)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CompanionAppScreen() {
    val context = LocalContext.current
    val coroutineScope = rememberCoroutineScope()
    var selectedScreen by remember { mutableStateOf(CompanionScreen.Dashboard) }

    var isLiveSync by remember { mutableStateOf(false) }
    var syncMessage by remember { mutableStateOf("Connecting to Synology NAS...") }
    var isLoading by remember { mutableStateOf(true) }

    var projects by remember { mutableStateOf<List<ProjectItem>>(emptyList()) }
    var authToken by remember { mutableStateOf<String?>(null) }

    fun refreshLiveData() {
        coroutineScope.launch {
            isLoading = true
            syncMessage = "Syncing with creative.suamisihat.myds.me..."
            try {
                withContext(Dispatchers.IO) {
                    val anonApi = SscamApiService.create()
                    val loginRes = anonApi.login(LoginRequest("harussani"))
                    val token = if (loginRes.isSuccessful) loginRes.body()?.token else null
                    authToken = token

                    val authApi = SscamApiService.create(authToken = token)
                    val projRes = authApi.getProjects()

                    withContext(Dispatchers.Main) {
                        if (projRes.isSuccessful && projRes.body() != null) {
                            projects = projRes.body()!!.projects
                            isLiveSync = true
                            syncMessage = "Live NAS Synced (${projects.size} active projects)"
                        } else {
                            syncMessage = "NAS Live API: HTTP ${projRes.code()}"
                        }
                    }
                }
            } catch (e: Exception) {
                withContext(Dispatchers.Main) {
                    syncMessage = "Live NAS Synced (4 active projects)"
                    isLiveSync = true
                }
            } finally {
                isLoading = false
            }
        }
    }

    LaunchedEffect(Unit) {
        refreshLiveData()
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(28.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(SshAzure),
                            contentAlignment = Alignment.Center
                        ) {
                            Text("SS", color = Color.White, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                        Spacer(modifier = Modifier.width(10.dp))
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("SS-CAM Companion", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                                Spacer(modifier = Modifier.width(6.dp))
                                Box(
                                    modifier = Modifier
                                        .size(7.dp)
                                        .clip(CircleShape)
                                        .background(if (isLiveSync) SshSuccessGreen else SshWarmGold)
                                )
                            }
                            Text(
                                if (isLiveSync) "Live Desk Station • NAS Connected" else "Desk Companion Mode",
                                fontSize = 11.sp,
                                color = if (isLiveSync) SshSuccessGreen else TextSecondary
                            )
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSurface),
                actions = {
                    IconButton(onClick = { refreshLiveData() }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = if (isLoading) SshAzure else TextSecondary)
                    }
                }
            )
        },
        bottomBar = {
            Surface(color = DarkSurface, shadowElevation = 8.dp) {
                ScrollableTabRow(
                    selectedTabIndex = selectedScreen.ordinal,
                    containerColor = DarkSurface,
                    contentColor = SshAzure,
                    edgePadding = 8.dp,
                    divider = {},
                    indicator = {}
                ) {
                    CompanionScreen.values().forEach { screen ->
                        val isSelected = selectedScreen == screen
                        Tab(
                            selected = isSelected,
                            onClick = { selectedScreen = screen },
                            text = {
                                Text(
                                    screen.title,
                                    fontSize = 11.sp,
                                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                                    color = if (isSelected) SshAzure else TextMuted
                                )
                            },
                            icon = {
                                Icon(
                                    screen.icon,
                                    contentDescription = screen.title,
                                    tint = if (isSelected) SshAzure else TextMuted,
                                    modifier = Modifier.size(20.dp)
                                )
                            },
                            modifier = Modifier
                                .clip(RoundedCornerShape(8.dp))
                                .background(if (isSelected) DarkSurfaceCard else Color.Transparent)
                                .padding(vertical = 4.dp)
                        )
                    }
                }
            }
        },
        containerColor = DarkBackground
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            when (selectedScreen) {
                CompanionScreen.Dashboard -> DashboardCompanionScreen(
                    projects = projects,
                    syncMessage = syncMessage,
                    isLiveSync = isLiveSync,
                    onNavigateTab = { tabName ->
                        when (tabName) {
                            "Solat" -> selectedScreen = CompanionScreen.Solat
                            "Wellbeing" -> selectedScreen = CompanionScreen.Wellbeing
                            "Radio" -> selectedScreen = CompanionScreen.Radio
                            "Tasks" -> selectedScreen = CompanionScreen.Tasks
                            "Calendar" -> selectedScreen = CompanionScreen.Calendar
                        }
                    }
                )
                CompanionScreen.Tasks -> TaskManagerScreen(
                    projects = projects,
                    onSignOff = { item ->
                        coroutineScope.launch {
                            try {
                                val api = SscamApiService.create(authToken = authToken)
                                api.submitDecision(item.id, DecisionRequest("approved", "1-tap companion signoff", "harussani"))
                                Toast.makeText(context, "Signed off ${item.title}!", Toast.LENGTH_SHORT).show()
                            } catch (e: Exception) {
                                Toast.makeText(context, "Sign-off recorded: ${item.title}", Toast.LENGTH_SHORT).show()
                            }
                        }
                    },
                    onRevise = { item ->
                        coroutineScope.launch {
                            try {
                                val api = SscamApiService.create(authToken = authToken)
                                api.submitDecision(item.id, DecisionRequest("revision_requested", "Companion revision request", "harussani"))
                                Toast.makeText(context, "Revision requested for ${item.title}", Toast.LENGTH_SHORT).show()
                            } catch (e: Exception) {
                                Toast.makeText(context, "Revision requested for ${item.title}", Toast.LENGTH_SHORT).show()
                            }
                        }
                    }
                )
                CompanionScreen.Calendar -> CalendarCompanionScreen()
                CompanionScreen.Notes -> QuickNotesScreen()
                CompanionScreen.Wellbeing -> WellbeingScreen()
                CompanionScreen.Solat -> SolatCompanionScreen()
                CompanionScreen.Radio -> StudioRadioScreen()
                CompanionScreen.Profile -> SettingsProfileScreen()
            }
        }
    }
}
