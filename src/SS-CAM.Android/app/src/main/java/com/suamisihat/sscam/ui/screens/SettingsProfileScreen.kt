package com.suamisihat.sscam.ui.screens

import android.widget.Toast
import androidx.compose.foundation.background
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.ui.theme.*

@Composable
fun SettingsProfileScreen() {
    val context = LocalContext.current

    var keepAwake by remember { mutableStateOf(true) }
    var prayerAlerts by remember { mutableStateOf(true) }
    var deliverableAlerts by remember { mutableStateOf(true) }
    var nasServerUrl by remember { mutableStateOf("https://creative.suamisihat.myds.me") }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Designer Profile Header Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Box(
                        modifier = Modifier
                            .size(54.dp)
                            .clip(CircleShape)
                            .background(SshAzure),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("H", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Color.White)
                    }
                    Spacer(modifier = Modifier.width(14.dp))
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text("Harussani", fontSize = 16.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Spacer(modifier = Modifier.width(6.dp))
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(4.dp))
                                    .background(SshWarmGold.copy(alpha = 0.2f))
                                    .padding(horizontal = 6.dp, vertical = 2.dp)
                            ) {
                                Text("LEAD", fontSize = 9.sp, fontWeight = FontWeight.Bold, color = SshWarmGold)
                            }
                        }
                        Spacer(modifier = Modifier.height(2.dp))
                        Text("@harussani • SS0004", fontSize = 12.sp, color = SshAzure)
                        Text("Creative Production & Video Studio", fontSize = 11.sp, color = TextSecondary)
                    }
                }
            }
        }

        // Synology NAS Server Gateway
        item {
            Text("SYNOLOGY NAS GATEWAY", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
        }

        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp)) {
                    Text("Gateway URL", fontSize = 11.sp, color = TextSecondary)
                    Spacer(modifier = Modifier.height(6.dp))
                    TextField(
                        value = nasServerUrl,
                        onValueChange = { nasServerUrl = it },
                        modifier = Modifier.fillMaxWidth(),
                        colors = TextFieldDefaults.colors(
                            focusedContainerColor = DarkBackground,
                            unfocusedContainerColor = DarkBackground,
                            focusedTextColor = TextPrimary,
                            unfocusedTextColor = TextPrimary,
                            focusedIndicatorColor = Color.Transparent,
                            unfocusedIndicatorColor = Color.Transparent
                        ),
                        shape = RoundedCornerShape(8.dp),
                        singleLine = true
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = {
                            Toast.makeText(context, "NAS Gateway ping: OK (12ms)", Toast.LENGTH_SHORT).show()
                        },
                        colors = ButtonDefaults.buttonColors(containerColor = SshAzure),
                        shape = RoundedCornerShape(6.dp),
                        modifier = Modifier.align(Alignment.End)
                    ) {
                        Text("Test Connection", fontSize = 12.sp, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }

        // Companion Device Display Settings
        item {
            Text("COMPANION DEVICE PREFERENCES", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = TextMuted)
        }

        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
                shape = RoundedCornerShape(10.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Desk Mode (Keep Awake)", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = TextPrimary)
                            Text("Pastikan skrin kekal hidup atas meja kerja", fontSize = 11.sp, color = TextSecondary)
                        }
                        Switch(
                            checked = keepAwake,
                            onCheckedChange = { keepAwake = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = SshAzure, checkedTrackColor = SshAzure.copy(alpha = 0.5f))
                        )
                    }

                    HorizontalDivider(color = DarkBorder)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Waktu Solat & Azan Alerts", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = TextPrimary)
                            Text("Notifikasi audio bila masuk waktu solat", fontSize = 11.sp, color = TextSecondary)
                        }
                        Switch(
                            checked = prayerAlerts,
                            onCheckedChange = { prayerAlerts = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = SshSuccessGreen, checkedTrackColor = SshSuccessGreen.copy(alpha = 0.5f))
                        )
                    }

                    HorizontalDivider(color = DarkBorder)

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Deliverable Sign-Off Pings", fontWeight = FontWeight.SemiBold, fontSize = 13.sp, color = TextPrimary)
                            Text("Dapat alert serta-merta bila video siap render", fontSize = 11.sp, color = TextSecondary)
                        }
                        Switch(
                            checked = deliverableAlerts,
                            onCheckedChange = { deliverableAlerts = it },
                            colors = SwitchDefaults.colors(checkedThumbColor = SshWarmGold, checkedTrackColor = SshWarmGold.copy(alpha = 0.5f))
                        )
                    }
                }
            }
        }

        // App Information Footer
        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(vertical = 8.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text("SS-CAM Android Companion Edition", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextSecondary)
                Text("Version 4.5.0 • SuamiSihat Creative Operations", fontSize = 10.sp, color = TextMuted)
            }
        }
    }
}
