package com.suamisihat.sscam.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.ChevronLeft
import androidx.compose.material.icons.filled.ChevronRight
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.ui.theme.*

data class CalendarEvent(
    val id: String,
    val time: String,
    val title: String,
    val brand: String,
    val type: String, // "DELIVERABLE", "SHOOT", "LAUNCH", "REVIEW"
    val accentColor: Color
)

@Composable
fun CalendarCompanionScreen() {
    var selectedDay by remember { mutableStateOf(29) }

    val daysInMonth = (25..31).toList()

    val events = listOf(
        CalendarEvent("1", "10:30 AM", "Merdeka Video Promo Final Sign-Off", "SSH", "REVIEW", SshWarmGold),
        CalendarEvent("2", "02:30 PM", "TikTok Hook UGC Studio Shoot", "SSC", "SHOOT", Color(0xFFEC4899)),
        CalendarEvent("3", "05:00 PM", "Packaging Dieline Handover to Print", "SSW", "DELIVERABLE", SshAzure),
        CalendarEvent("4", "08:00 PM", "Live Campaign Launch on TikTok Shop", "SSH", "LAUNCH", SshSuccessGreen)
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Month Selector Header
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.CalendarMonth, contentDescription = null, tint = SshAzure, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("AUGUST 2026", fontSize = 14.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                        Row {
                            IconButton(onClick = { /* Prev month */ }, modifier = Modifier.size(28.dp)) {
                                Icon(Icons.Default.ChevronLeft, contentDescription = null, tint = TextSecondary)
                            }
                            IconButton(onClick = { /* Next month */ }, modifier = Modifier.size(28.dp)) {
                                Icon(Icons.Default.ChevronRight, contentDescription = null, tint = TextSecondary)
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    // Horizontal Rolling Date Strip
                    LazyRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        items(daysInMonth) { day ->
                            val isSelected = day == selectedDay
                            val dayName = when (day % 7) {
                                0 -> "SAT"
                                1 -> "SUN"
                                2 -> "MON"
                                3 -> "TUE"
                                4 -> "WED"
                                5 -> "THU"
                                else -> "FRI"
                            }
                            Column(
                                modifier = Modifier
                                    .width(46.dp)
                                    .clip(RoundedCornerShape(8.dp))
                                    .background(if (isSelected) SshAzure else DarkBackground)
                                    .clickable { selectedDay = day }
                                    .padding(vertical = 8.dp),
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(dayName, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = if (isSelected) Color.White else TextMuted)
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(day.toString(), fontSize = 15.sp, fontWeight = FontWeight.Bold, color = if (isSelected) Color.White else TextPrimary)
                                if (day in listOf(29, 31)) {
                                    Spacer(modifier = Modifier.height(4.dp))
                                    Box(
                                        modifier = Modifier
                                            .size(4.dp)
                                            .clip(CircleShape)
                                            .background(if (isSelected) Color.White else SshWarmGold)
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }

        // Schedule for Selected Day
        item {
            Text("SCHEDULE FOR AUG $selectedDay, 2026", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
        }

        items(events) { ev ->
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .width(4.dp)
                            .height(42.dp)
                            .clip(RoundedCornerShape(2.dp))
                            .background(ev.accentColor)
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text(ev.title, fontWeight = FontWeight.Bold, color = TextPrimary, fontSize = 13.sp)
                        }
                        Spacer(modifier = Modifier.height(4.dp))
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(ev.time, fontSize = 11.sp, color = SshAzure, fontWeight = FontWeight.SemiBold)
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("•  ${ev.brand}  •  ${ev.type}", fontSize = 11.sp, color = TextSecondary)
                        }
                    }
                }
            }
        }
    }
}
