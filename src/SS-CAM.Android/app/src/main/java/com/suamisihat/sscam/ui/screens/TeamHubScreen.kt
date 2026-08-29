package com.suamisihat.sscam.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Group
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.data.models.StaffMember
import com.suamisihat.sscam.ui.components.*
import com.suamisihat.sscam.ui.theme.*

fun parseHexColor(hex: String, fallback: Color = SshAzureLight): Color {
    return try {
        val cleanHex = hex.removePrefix("#")
        if (cleanHex.length == 6) {
            Color(android.graphics.Color.parseColor("#$cleanHex"))
        } else fallback
    } catch (e: Exception) {
        fallback
    }
}

@Composable
fun TeamHubScreen(
    staffList: List<StaffMember> = emptyList(),
    initialSubTab: Int = 0
) {
    var selectedTab by remember { mutableStateOf(initialSubTab.coerceIn(0, 1)) }
    val tabOptions = listOf("Workload", "Notes")

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 16.dp, vertical = 12.dp)
    ) {
        // Trapezoid Folder Tabs
        FolderTabNavigation(
            options = listOf("ROSTER", "QUICK NOTES"),
            selectedIndex = selectedTab,
            onOptionSelected = { selectedTab = it },
            modifier = Modifier.padding(bottom = 12.dp)
        )

        when (selectedTab) {
            0 -> TeamWorkloadContentView(staffList = staffList)
            1 -> QuickNotesContentView()
        }
    }
}

@Composable
fun TeamWorkloadContentView(staffList: List<StaffMember> = emptyList()) {
    val colors = LocalSscamColors.current

    val displayStaff = remember(staffList) { staffList }

    val totalAssignedDeliverables = displayStaff.sumOf { it.totalAssignedCount.coerceAtLeast(it.workload?.total ?: 0) }
    val activeStaffCount = displayStaff.size

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        if (displayStaff.isEmpty()) {
            item {
                FluentCard(
                    cornerRadius = 16.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(28.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Icon(
                            Icons.Default.Group,
                            contentDescription = null,
                            tint = colors.textMuted,
                            modifier = Modifier.size(32.dp)
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            text = "No Team Members Loaded",
                            fontSize = 14.sp,
                            fontWeight = FontWeight.Bold,
                            color = colors.textPrimary
                        )
                        Text(
                            text = "Connect to Synology NAS (creative.suamisihat.myds.me) to sync creative team roster.",
                            fontSize = 11.sp,
                            color = colors.textSecondary,
                            textAlign = androidx.compose.ui.text.style.TextAlign.Center
                        )
                    }
                }
            }
        } else {
            // 1. Team Capacity Summary Card
            item {
                FluentCard(
                    cornerRadius = 16.dp,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Text(
                                "STUDIO CAPACITY OVERVIEW",
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold,
                                color = colors.primary,
                                letterSpacing = 0.5.sp
                            )
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(if (colors.isMonochrome) Color(0xFFF4F4F5) else SshSuccessGreen.copy(alpha = 0.15f))
                                    .border(0.5.dp, if (colors.isMonochrome) Color(0xFFD4D4D8) else Color.Transparent, RoundedCornerShape(4.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text("OPTIMAL LOAD", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = if (colors.isMonochrome) Color(0xFF18181B) else SshSuccessGreen)
                            }
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Column {
                                Text("$activeStaffCount Designers", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                Text("Creative Roster", fontSize = 11.sp, color = colors.textSecondary)
                            }
                            Column(horizontalAlignment = Alignment.End) {
                                Text("$totalAssignedDeliverables Deliverables", fontSize = 18.sp, fontWeight = FontWeight.Bold, color = colors.textPrimary)
                                Text("In Active Sprint", fontSize = 11.sp, color = colors.textSecondary)
                            }
                        }
                    }
                }
            }

            // 2. Staff Roster Header
            item {
                FluentSectionHeader(
                    title = "Designers & Production Crew",
                    trailingText = "$activeStaffCount Members"
                )
            }
        }

        // 3. Staff Member Cards
        items(displayStaff, key = { it.staffId }) { member ->
            val assignedCount = member.totalAssignedCount.coerceAtLeast(member.workload?.total ?: 0)
            val initial = member.name.firstOrNull()?.toString()?.uppercase() ?: "S"
            val avatarColor = parseHexColor(member.avatarColor)

            val capacityPercent = when {
                assignedCount == 0 -> 0.15f
                assignedCount in 1..2 -> 0.45f
                assignedCount in 3..4 -> 0.80f
                else -> 1.0f
            }

            val statusColor = if (colors.isMonochrome) {
                if (assignedCount >= 4) Color(0xFF18181B) else Color(0xFF71717A)
            } else {
                when {
                    assignedCount >= 4 -> Color(0xFFE53E3E) // High load
                    assignedCount in 2..3 -> SshWarmGoldBright // Moderate
                    else -> SshSuccessGreen // Available
                }
            }

            FluentCard(
                cornerRadius = 14.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        // Dynamic Staff Profile Avatar
                        UserProfileAvatar(
                            imageUrl = member.profileImageUrl,
                            initials = member.initialLetter,
                            avatarColorHex = member.avatarColor,
                            size = 40.dp
                        )

                        Spacer(modifier = Modifier.width(12.dp))

                        Column(modifier = Modifier.weight(1f)) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    member.name,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 14.sp,
                                    color = colors.textPrimary
                                )
                                Text(
                                    member.staffId,
                                    fontSize = 11.sp,
                                    color = colors.textMuted,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            Text(
                                member.role,
                                fontSize = 12.sp,
                                color = colors.textSecondary
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(10.dp))

                    // Capacity Progress
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("$assignedCount Active Deliverables", fontSize = 12.sp, color = colors.textPrimary, fontWeight = FontWeight.SemiBold)
                        Text("${(capacityPercent * 100).toInt()}% Capacity", fontSize = 11.sp, color = colors.textMuted)
                    }

                    Spacer(modifier = Modifier.height(6.dp))
                    LinearProgressIndicator(
                        progress = { capacityPercent },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(6.dp)
                            .clip(RoundedCornerShape(3.dp)),
                        color = statusColor,
                        trackColor = if (colors.isMonochrome) Color(0xFFE4E4E7) else if (colors.isDark) colors.surface else Color(0xFFE2E8F0)
                    )

                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(4.dp)
                    ) {
                        SubBrandBadge(member.defaultBrand.ifBlank { "SS" })
                        if (member.department.contains("Creative", ignoreCase = true)) {
                            SubBrandBadge("SSH")
                        }
                    }
                }
            }
        }
    }
}
