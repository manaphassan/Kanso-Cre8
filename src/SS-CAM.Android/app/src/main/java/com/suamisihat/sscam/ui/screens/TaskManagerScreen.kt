package com.suamisihat.sscam.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.data.models.ProjectItem
import com.suamisihat.sscam.ui.components.*
import com.suamisihat.sscam.ui.theme.*

@Composable
fun TaskManagerScreen(
    projects: List<ProjectItem>,
    onSignOff: (ProjectItem) -> Unit = {},
    onRevise: (ProjectItem) -> Unit = {}
) {
    val context = LocalContext.current
    var selectedFilter by remember { mutableStateOf("ALL") }
    var selectedBrand by remember { mutableStateOf("ALL BRANDS") }

    val filterTabs = listOf("ALL", "IN REVIEW", "IN PROGRESS", "DONE", "BACKLOG")
    val brandTabs = listOf("ALL BRANDS", "SSH", "SSC", "SSW")

    val filteredProjects = projects.filter { p ->
        val statusMatch = when (selectedFilter) {
            "ALL" -> true
            "IN REVIEW" -> p.status.equals("in_review", ignoreCase = true)
            "IN PROGRESS" -> p.status.equals("in_progress", ignoreCase = true)
            "DONE" -> p.status.equals("done", ignoreCase = true)
            "BACKLOG" -> p.status.equals("backlog", ignoreCase = true)
            else -> true
        }
        val brandMatch = when (selectedBrand) {
            "ALL BRANDS" -> true
            else -> p.brand.contains(selectedBrand, ignoreCase = true)
        }
        statusMatch && brandMatch
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Status Filter Row
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                items(filterTabs) { tab ->
                    val isSelected = selectedFilter == tab
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(6.dp))
                            .background(if (isSelected) SshAzure else DarkSurfaceCard)
                            .clickable { selectedFilter = tab }
                            .padding(horizontal = 12.dp, vertical = 6.dp)
                    ) {
                        Text(
                            tab,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            color = if (isSelected) Color.White else TextSecondary
                        )
                    }
                }
            }
        }

        // Brand Filter Row
        item {
            LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                items(brandTabs) { brand ->
                    val isSelected = selectedBrand == brand
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(4.dp))
                            .background(if (isSelected) DarkBorder else Color.Transparent)
                            .clickable { selectedBrand = brand }
                            .padding(horizontal = 8.dp, vertical = 3.dp)
                    ) {
                        Text(
                            brand,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            color = if (isSelected) SshAzure else TextMuted
                        )
                    }
                }
            }
        }

        // Tasks Header
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text("WORKSPACE TASKS (${filteredProjects.size})", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
                Text(selectedFilter, fontSize = 10.sp, color = SshAzure, fontWeight = FontWeight.Bold)
            }
        }

        // Project Cards
        items(filteredProjects) { p ->
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
                        Text(p.title, fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 14.sp)
                        Text(p.brand, fontWeight = FontWeight.Bold, color = SshAzure, fontSize = 11.sp)
                    }
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Designer: @${if (p.designer.isNotBlank()) p.designer else "harussani"} • Due: ${if (p.deadline.isNotBlank()) p.deadline else "TBD"}",
                        fontSize = 12.sp,
                        color = TextSecondary
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            StatusChip(p.status)
                            PriorityChip(p.priority)
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Button(
                                onClick = {
                                    onSignOff(p)
                                    Toast.makeText(context, "Signed off: ${p.title}", Toast.LENGTH_SHORT).show()
                                },
                                colors = ButtonDefaults.buttonColors(containerColor = SshSuccessGreen),
                                shape = RoundedCornerShape(4.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                modifier = Modifier.height(28.dp)
                            ) {
                                Text("✓ Sign-Off", fontSize = 10.sp, fontWeight = FontWeight.Bold)
                            }

                            OutlinedButton(
                                onClick = {
                                    onRevise(p)
                                    Toast.makeText(context, "Revision requested: ${p.title}", Toast.LENGTH_SHORT).show()
                                },
                                shape = RoundedCornerShape(4.dp),
                                contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
                                modifier = Modifier.height(28.dp)
                            ) {
                                Text("⚠️ Revise", fontSize = 10.sp, color = SshWarmGold, fontWeight = FontWeight.Bold)
                            }
                        }
                    }
                }
            }
        }
    }
}
