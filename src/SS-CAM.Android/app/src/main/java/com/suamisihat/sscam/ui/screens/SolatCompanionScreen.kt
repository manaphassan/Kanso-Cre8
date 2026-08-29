package com.suamisihat.sscam.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Mosque
import androidx.compose.material.icons.filled.NotificationsActive
import androidx.compose.material.icons.filled.NotificationsOff
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
import kotlinx.coroutines.delay
import java.text.SimpleDateFormat
import java.util.*

data class PrayerTime(val name: String, val time: String, val isNext: Boolean = false)

@Composable
fun SolatCompanionScreen() {
    var selectedZone by remember { mutableStateOf("SGR01 - Shah Alam / KL") }
    var azanNotification by remember { mutableStateOf(true) }
    var currentTimeString by remember { mutableStateOf("") }

    // Live clock ticker
    LaunchedEffect(Unit) {
        val sdf = SimpleDateFormat("hh:mm:ss a", Locale.getDefault())
        while (true) {
            currentTimeString = sdf.format(Date())
            delay(1000)
        }
    }

    val prayerTimes = listOf(
        PrayerTime("Imsak", "05:48 AM"),
        PrayerTime("Subuh", "05:58 AM"),
        PrayerTime("Syuruk", "07:11 AM"),
        PrayerTime("Zohor", "01:21 PM"),
        PrayerTime("Asar", "04:32 PM", isNext = true),
        PrayerTime("Maghrib", "07:23 PM"),
        PrayerTime("Isyak", "08:33 PM")
    )

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        // Active Solat Hero Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = Color(0xFF064E3B)),
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
                            Icon(Icons.Default.Mosque, contentDescription = null, tint = SshWarmGold, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("WAKTU SOLAT JAKIM", color = SshWarmGold, fontSize = 12.sp, fontWeight = FontWeight.Bold)
                        }
                        Text(selectedZone.substringBefore(" -"), color = Color(0xFF6EE7B7), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                    Text("Seterusnya: Asar", fontSize = 22.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    Text("04:32 PM • Dalam 42 minit lagi", fontSize = 13.sp, color = Color(0xFFA7F3D0))
                    
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(currentTimeString, fontSize = 11.sp, color = Color(0xFFD1FAE5))
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            modifier = Modifier
                                .clip(RoundedCornerShape(6.dp))
                                .background(Color(0xFF047857))
                                .clickable { azanNotification = !azanNotification }
                                .padding(horizontal = 8.dp, vertical = 4.dp)
                        ) {
                            Icon(
                                if (azanNotification) Icons.Default.NotificationsActive else Icons.Default.NotificationsOff,
                                contentDescription = null,
                                tint = Color.White,
                                modifier = Modifier.size(14.dp)
                            )
                            Spacer(modifier = Modifier.width(4.dp))
                            Text(if (azanNotification) "Azan On" else "Azan Muted", fontSize = 10.sp, color = Color.White, fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }

        // Daily Prayer Times List
        item {
            Text("JADUAL WAKTU HARI INI", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
        }

        items(prayerTimes.size) { index ->
            val p = prayerTimes[index]
            Card(
                colors = CardDefaults.cardColors(
                    containerColor = if (p.isNext) Color(0xFF1E293B) else DarkSurfaceCard
                ),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Box(
                            modifier = Modifier
                                .size(8.dp)
                                .clip(CircleShape)
                                .background(if (p.isNext) SshWarmGold else DarkBorder)
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Text(
                            p.name,
                            fontWeight = if (p.isNext) FontWeight.Bold else FontWeight.Medium,
                            color = if (p.isNext) SshWarmGold else TextPrimary,
                            fontSize = 14.sp
                        )
                    }

                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text(
                            p.time,
                            fontWeight = FontWeight.Bold,
                            color = if (p.isNext) TextPrimary else TextSecondary,
                            fontSize = 13.sp
                        )
                        if (p.isNext) {
                            Spacer(modifier = Modifier.width(8.dp))
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(SshWarmGold.copy(alpha = 0.2f))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text("NEXT", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = SshWarmGold)
                            }
                        }
                    }
                }
            }
        }

        // Tazkirah / Daily Islamic Work Ethic Reminder
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("💡 TAZKIRAH KREATIF & ETIKA KERJA", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SshWarmGold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        "\"Sesungguhnya Allah menyukai apabila seseorang daripada kamu melakukan sesuatu pekerjaan, dia melakukannya dengan tekun (itqan).\"",
                        fontSize = 12.sp,
                        color = TextSecondary,
                        lineHeight = 18.sp
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text("— Riwayat al-Bayhaqi", fontSize = 10.sp, color = TextMuted)
                }
            }
        }
    }
}
