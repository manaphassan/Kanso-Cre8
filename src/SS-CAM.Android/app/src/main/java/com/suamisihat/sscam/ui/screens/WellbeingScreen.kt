package com.suamisihat.sscam.ui.screens

import androidx.compose.animation.core.*
import androidx.compose.foundation.Canvas
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
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.suamisihat.sscam.ui.theme.*
import kotlinx.coroutines.delay

@Composable
fun WellbeingScreen() {
    var waterGlasses by remember { mutableStateOf(4) }
    var isPomodoroRunning by remember { mutableStateOf(false) }
    var pomodoroSecondsLeft by remember { mutableStateOf(25 * 60) }
    var completedSessions by remember { mutableStateOf(3) }

    // Pomodoro timer ticker
    LaunchedEffect(isPomodoroRunning) {
        while (isPomodoroRunning && pomodoroSecondsLeft > 0) {
            delay(1000)
            pomodoroSecondsLeft--
            if (pomodoroSecondsLeft == 0) {
                isPomodoroRunning = false
                completedSessions++
                pomodoroSecondsLeft = 25 * 60
            }
        }
    }

    val minutes = pomodoroSecondsLeft / 60
    val seconds = pomodoroSecondsLeft % 60
    val formattedTime = String.format("%02d:%02d", minutes, seconds)
    val progress = (25 * 60 - pomodoroSecondsLeft).toFloat() / (25 * 60).toFloat()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
        // Deep Focus Pomodoro Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
                shape = RoundedCornerShape(14.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text("DEEP FOCUS POMODORO", fontSize = 11.sp, fontWeight = FontWeight.Bold, color = SshAzure)
                        Text("$completedSessions sessions completed", fontSize = 11.sp, color = TextSecondary)
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    // Circular Countdown Timer
                    Box(contentAlignment = Alignment.Center, modifier = Modifier.size(160.dp)) {
                        Canvas(modifier = Modifier.size(150.dp)) {
                            drawCircle(
                                color = DarkBorder,
                                style = Stroke(width = 10.dp.toPx())
                            )
                            drawArc(
                                color = SshAzure,
                                startAngle = -90f,
                                sweepAngle = progress * 360f,
                                useCenter = false,
                                style = Stroke(width = 10.dp.toPx(), cap = StrokeCap.Round)
                            )
                        }
                        Column(horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(formattedTime, fontSize = 32.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                            Text(if (isPomodoroRunning) "Focus Mode Active" else "Ready to Focus", fontSize = 11.sp, color = TextSecondary)
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(
                            onClick = { isPomodoroRunning = !isPomodoroRunning },
                            colors = ButtonDefaults.buttonColors(
                                containerColor = if (isPomodoroRunning) SshWarmGold else SshAzure
                            ),
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(
                                if (isPomodoroRunning) Icons.Default.Pause else Icons.Default.PlayArrow,
                                contentDescription = null,
                                modifier = Modifier.size(18.dp)
                            )
                            Spacer(modifier = Modifier.width(6.dp))
                            Text(if (isPomodoroRunning) "Pause" else "Start 25m Focus", fontWeight = FontWeight.Bold, fontSize = 13.sp)
                        }

                        OutlinedButton(
                            onClick = {
                                isPomodoroRunning = false
                                pomodoroSecondsLeft = 25 * 60
                            },
                            shape = RoundedCornerShape(8.dp)
                        ) {
                            Icon(Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(18.dp), tint = TextSecondary)
                            Spacer(modifier = Modifier.width(4.dp))
                            Text("Reset", color = TextSecondary, fontSize = 13.sp)
                        }
                    }
                }
            }
        }

        // Hydration Tracker Card
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(Icons.Default.WaterDrop, contentDescription = null, tint = SshAzure, modifier = Modifier.size(20.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text("HYDRATION TRACKER", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                        }
                        Text("$waterGlasses / 8 Glasses (${waterGlasses * 250}ml)", fontSize = 12.sp, color = SshAzure, fontWeight = FontWeight.Bold)
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        for (i in 1..8) {
                            Box(
                                modifier = Modifier
                                    .size(32.dp)
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(if (i <= waterGlasses) SshAzure else DarkBorder)
                                    .clickable { waterGlasses = i },
                                contentAlignment = Alignment.Center
                            ) {
                                Icon(
                                    Icons.Default.WaterDrop,
                                    contentDescription = null,
                                    tint = if (i <= waterGlasses) Color.White else TextMuted,
                                    modifier = Modifier.size(16.dp)
                                )
                            }
                        }
                    }
                }
            }
        }

        // 20-20-20 Eye Strain & Posture Health
        item {
            Card(
                colors = CardDefaults.cardColors(containerColor = DarkSurfaceCard),
                shape = RoundedCornerShape(12.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(Icons.Default.Visibility, contentDescription = null, tint = SshSuccessGreen, modifier = Modifier.size(20.dp))
                        Spacer(modifier = Modifier.width(8.dp))
                        Text("20-20-20 EYE STRAIN RULE", fontSize = 12.sp, fontWeight = FontWeight.Bold, color = TextPrimary)
                    }
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        "Setiap 20 minit merenung skrin, pandang objek 20 kaki jauh selama 20 saat untuk merehatkan otot mata dan mengekalkan fokus kreatif.",
                        fontSize = 12.sp,
                        color = TextSecondary,
                        lineHeight = 17.sp
                    )
                }
            }
        }
    }
}
