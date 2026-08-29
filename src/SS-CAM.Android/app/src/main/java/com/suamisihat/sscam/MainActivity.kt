package com.suamisihat.sscam

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
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
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.data.models.DeliverableItem
import com.suamisihat.sscam.data.models.ProjectItem
import com.suamisihat.sscam.ui.theme.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SscamTheme {
                MainAppScreen()
            }
        }
    }
}

enum class Screen(val title: String, val icon: ImageVector) {
    Dashboard("Dashboard", Icons.Default.Dashboard),
    Deliverables("Reviews", Icons.Default.RateReview),
    Projects("Tasks", Icons.Default.Assignment),
    Brand("Brand", Icons.Default.Palette)
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MainAppScreen() {
    var selectedScreen by remember { mutableStateOf(Screen.Dashboard) }

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
                            Text("SS-CAM Mobile", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text("Creative Assets & Approvals", fontSize = 11.sp, color = TextSecondary)
                        }
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(containerColor = DarkSurface),
                actions = {
                    IconButton(onClick = { /* Refresh */ }) {
                        Icon(Icons.Default.Refresh, contentDescription = "Refresh", tint = TextSecondary)
                    }
                }
            )
        },
        bottomBar = {
            NavigationBar(containerColor = DarkSurface) {
                Screen.values().forEach { screen ->
                    NavigationBarItem(
                        selected = selectedScreen == screen,
                        onClick = { selectedScreen = screen },
                        icon = { Icon(screen.icon, contentDescription = screen.title) },
                        label = { Text(screen.title, fontSize = 11.sp) },
                        colors = NavigationBarItemDefaults.colors(
                            selectedIconColor = SshAzure,
                            selectedTextColor = SshAzure,
                            unselectedIconColor = TextMuted,
                            unselectedTextColor = TextMuted,
                            indicatorColor = DarkSurfaceCard
                        )
                    )
                }
            }
        },
        containerColor = DarkBackground
    ) { padding ->
        Box(modifier = Modifier.padding(padding)) {
            when (selectedScreen) {
                Screen.Dashboard -> DashboardScreenContent()
                Screen.Deliverables -> DeliverablesReviewScreenContent()
                Screen.Projects -> ProjectsScreenContent()
                Screen.Brand -> BrandAssetsScreenContent()
            }
        }
    }
}

@Composable
fun DashboardScreenContent() {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = SshRoyalBlue),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("Synology NAS Central Sync", color = SshAzure, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("SuamiSihat Creative Operations", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Connected to creative.suamisihat.myds.me", color = Color(0xFFE2E8F0), fontSize = 12.sp)
                }
            }
        }

        item {
            Text("QUICK STATS", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
            Spacer(modifier = Modifier.height(6.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatCard("In Review", "4", SshWarmGold, Modifier.weight(1f))
                StatCard("In Progress", "12", SshAzure, Modifier.weight(1f))
                StatCard("Done (Week)", "18", SshSuccessGreen, Modifier.weight(1f))
            }
        }

        item {
            Text("ACTIVE HOLDING BRANDS", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
            Spacer(modifier = Modifier.height(6.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                HoldingBrandTile("SuamiSihat Holding (SSH)", "8 active campaigns", SshPrussianBlue)
                HoldingBrandTile("SuamiSihat Care (SSC)", "5 active campaigns", SshRoyalBlue)
                HoldingBrandTile("SuamiSihat Wellness (SSW)", "3 active campaigns", Color(0xFF0F766E))
            }
        }
    }
}

@Composable
fun DeliverablesReviewScreenContent() {
    val sampleDeliverables = listOf(
        DeliverableItem("BANNER_PROMO_V2.PNG", "202608_0041X_SSH_Merdeka", "05_DELIVERABLES", "png", 2400000L, "image", "16:9"),
        DeliverableItem("REEL_HOOK_TEST_01.MP4", "202608_0042X_SSC_Energy", "05_DELIVERABLES", "mp4", 14500000L, "video", "9:16"),
        DeliverableItem("PACKAGING_DIELINE_V1.PDF", "202608_0043X_SSW_Wellness", "05_DELIVERABLES", "pdf", 8500000L, "pdf", "1:1")
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Text("PENDING SIGN-OFFS & DELIVERABLES", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted)
        }
        items(sampleDeliverables) { item ->
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
                        Text(item.fileName, fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(4.dp))
                                .background(DarkBorder)
                                .padding(horizontal = 6.dp, vertical = 2.dp)
                        ) {
                            Text(item.mediaClass.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                        }
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(item.projectId, fontSize = 12.sp, color = SshAzure)
                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Button(
                            onClick = { /* Approve */ },
                            colors = ButtonDefaults.buttonColors(containerColor = SshSuccessGreen),
                            shape = RoundedCornerShape(6.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("✓ Sign-Off", fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                        OutlinedButton(
                            onClick = { /* Request Revision */ },
                            shape = RoundedCornerShape(6.dp),
                            modifier = Modifier.weight(1f)
                        ) {
                            Text("⚠️ Revise", color = SshWarmGold, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                        }
                    }
                }
            }
        }
    }
}

@Composable
fun ProjectsScreenContent() {
    val sampleProjects = listOf(
        ProjectItem("202608_0041X", "Merdeka Video Campaign", "SSH", "in_review", "harussani", "SSH Marketing", "2026-08-31", priority = "urgent", revision = 2),
        ProjectItem("202608_0042X", "TikTok Ads Hook Variations", "SSC", "in_progress", "haikal", "SSC Performance", "2026-09-04", priority = "high", revision = 1),
        ProjectItem("202608_0043X", "Packaging Redesign 2026", "SSW", "backlog", "hasan", "SSW Product", "2026-09-10", priority = "medium", revision = 0)
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Text("ACTIVE WORKSPACE PROJECTS", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted)
        }
        items(sampleProjects) { p ->
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text(p.title, fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                        Text(p.brand, fontWeight = FontWeight.Bold, color = SshAzure, fontSize = 12.sp)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("Designer: @${p.designer} • Due: ${p.deadline}", fontSize = 12.sp, color = TextSecondary)
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        StatusChip(p.status)
                        PriorityChip(p.priority)
                    }
                }
            }
        }
    }
}

@Composable
fun BrandAssetsScreenContent() {
    val colors = listOf(
        Triple("SSH Prussian Navy", "#022057", SshPrussianBlue),
        Triple("SS Azure Highlight", "#21A1F7", SshAzure),
        Triple("Warm Gold Accent", "#BD9A73", SshWarmGold),
        Triple("Success Green", "#107C10", SshSuccessGreen),
        Triple("Dark Background", "#121214", DarkBackground)
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
        item {
            Text("SUAMISIHAT BRAND PALETTE (60:30:10)", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextMuted)
        }
        items(colors) { (name, hex, color) ->
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
                shape = RoundedCornerShape(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(RoundedCornerShape(6.dp))
                                .background(color)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column {
                            Text(name, fontWeight = FontWeight.SemiBold, color = TextPrimary, fontSize = 13.sp)
                            Text(hex, fontSize = 12.sp, color = TextSecondary)
                        }
                    }
                    Text("Tap to Copy", fontSize = 11.sp, color = SshAzure)
                }
            }
        }
    }
}

@Composable
fun StatCard(label: String, count: String, color: Color, modifier: Modifier) {
    Card(
        colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
        shape = RoundedCornerShape(8.dp),
        modifier = modifier
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(label, fontSize = 10.sp, fontWeight = FontWeight.Bold, color = TextMuted)
            Spacer(modifier = Modifier.height(2.dp))
            Text(count, fontSize = 20.sp, fontWeight = FontWeight.Bold, color = color)
        }
    }
}

@Composable
fun HoldingBrandTile(name: String, count: String, brandColor: Color) {
    Card(
        colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
        shape = RoundedCornerShape(8.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(12.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            Box(
                modifier = Modifier
                    .size(10.dp)
                    .clip(CircleShape)
                    .background(brandColor)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column {
                Text(name, fontWeight = FontWeight.SemiBold, color = TextPrimary, fontSize = 13.sp)
                Text(count, fontSize = 11.sp, color = TextSecondary)
            }
        }
    }
}

@Composable
fun StatusChip(status: String) {
    val (bg, fg) = when (status.lowercase()) {
        "done" -> SshSuccessGreen.copy(alpha = 0.2f) to SshSuccessGreen
        "in_review" -> SshWarmGold.copy(alpha = 0.2f) to SshWarmGold
        "in_progress" -> SshAzure.copy(alpha = 0.2f) to SshAzure
        else -> DarkBorder to TextSecondary
    }
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(bg)
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(status.replace('_', ' ').uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = fg)
    }
}

@Composable
fun PriorityChip(priority: String) {
    val color = when (priority.lowercase()) {
        "urgent" -> StatusUrgent
        "high" -> Color(0xFFF97316)
        else -> SshAzure
    }
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(4.dp))
            .background(color.copy(alpha = 0.2f))
            .padding(horizontal = 6.dp, vertical = 2.dp)
    ) {
        Text(priority.uppercase(), fontSize = 10.sp, fontWeight = FontWeight.Bold, color = color)
    }
}
