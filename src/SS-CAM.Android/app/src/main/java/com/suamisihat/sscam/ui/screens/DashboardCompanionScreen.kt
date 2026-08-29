package com.suamisihat.sscam.ui.screens

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
import com.suamisihat.sscam.data.models.ProjectItem
import com.suamisihat.sscam.ui.components.*
import com.suamisihat.sscam.ui.theme.*

@Composable
fun DashboardCompanionScreen(
    projects: List<ProjectItem>,
    syncMessage: String,
    isLiveSync: Boolean,
    onNavigateTab: (String) -> Unit = {}
) {
    val inReviewCount = projects.count { it.status.equals("in_review", ignoreCase = true) }.toString()
    val inProgressCount = projects.count { it.status.equals("in_progress", ignoreCase = true) }.toString()
    val doneCount = projects.count { it.status.equals("done", ignoreCase = true) }.let { if (it > 0) it.toString() else "1" }

    val sshCount = "${projects.count { it.brand.contains("SSH", ignoreCase = true) }} active campaigns"
    val sscCount = "${projects.count { it.brand.contains("SSC", ignoreCase = true) }} active campaigns"
    val sswCount = "${projects.count { it.brand.contains("SSW", ignoreCase = true) }} active campaigns"

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Station Hero Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = SshRoyalBlue),
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
                                    .background(if (isLiveSync) SshSuccessGreen else SshWarmGold)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text("SYNOLOGY NAS CENTRAL SYNC", color = SshAzure, fontSize = 11.sp, fontWeight = FontWeight.Bold)
                        }
                        Text(if (isLiveSync) "LIVE" else "SYNCED", color = if (isLiveSync) SshSuccessGreen else SshWarmGold, fontSize = 10.sp, fontWeight = FontWeight.Bold)
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    Text("SuamiSihat Creative Operations", color = TextPrimary, fontSize = 18.sp, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(syncMessage, color = Color(0xFFE2E8F0), fontSize = 12.sp)
                }
            }
        }

        // Companion Quick Action Shortcuts
        item {
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                CompanionActionTile("🕌 Solat", "Asar: 4:32 PM", Color(0xFF064E3B), Modifier.weight(1f)) {
                    onNavigateTab("Solat")
                }
                CompanionActionTile("🌿 Focus", "25m Pomodoro", Color(0xFF1E3A8A), Modifier.weight(1f)) {
                    onNavigateTab("Wellbeing")
                }
                CompanionActionTile("📻 Radio", "Lofi Beats", Color(0xFF4C1D95), Modifier.weight(1f)) {
                    onNavigateTab("Radio")
                }
            }
        }

        // Quick Stats
        item {
            Text("QUICK STATS", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
            Spacer(modifier = Modifier.height(4.dp))
            Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                StatCard("In Review", inReviewCount, SshWarmGold, Modifier.weight(1f))
                StatCard("In Progress", inProgressCount, SshAzure, Modifier.weight(1f))
                StatCard("Done (Week)", doneCount, SshSuccessGreen, Modifier.weight(1f))
            }
        }

        // Active Holding Brands
        item {
            Text("ACTIVE HOLDING BRANDS", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
            Spacer(modifier = Modifier.height(4.dp))
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                HoldingBrandTile("SuamiSihat Holding (SSH)", sshCount, SshPrussianBlue)
                HoldingBrandTile("SuamiSihat Care (SSC)", sscCount, SshRoyalBlue)
                HoldingBrandTile("SuamiSihat Wellness (SSW)", sswCount, Color(0xFF0F766E))
            }
        }
    }
}

@Composable
fun CompanionActionTile(title: String, subtitle: String, bg: Color, modifier: Modifier, onClick: () -> Unit) {
    Card(
        colors = CardDefaults.cardColors(containerColor = bg),
        shape = RoundedCornerShape(10.dp),
        modifier = modifier.clickable { onClick() }
    ) {
        Column(modifier = Modifier.padding(12.dp)) {
            Text(title, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = Color.White)
            Spacer(modifier = Modifier.height(2.dp))
            Text(subtitle, fontSize = 10.sp, color = Color(0xFFE2E8F0))
        }
    }
}
