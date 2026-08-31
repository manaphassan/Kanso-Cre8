package com.suamisihat.sscam.service

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.suamisihat.sscam.MainActivity
import com.suamisihat.sscam.R

object SscamNotificationService {

    const val CHANNEL_DELIVERABLES = "sscam_deliverables_channel"
    const val CHANNEL_STUDIO = "sscam_studio_channel"
    const val CHANNEL_PRAYER = "sscam_prayer_channel"

    fun initNotificationChannels(context: Context) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

            val deliverablesChannel = NotificationChannel(
                CHANNEL_DELIVERABLES,
                "Deliverables & Sign-Offs",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Urgent sign-off requests, asset approvals and deliverable pings"
                enableVibration(true)
            }

            val studioChannel = NotificationChannel(
                CHANNEL_STUDIO,
                "Studio Team & Notes",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Designer mentions, team announcements and synced quick notes"
            }

            val prayerChannel = NotificationChannel(
                CHANNEL_PRAYER,
                "Solat & Wellbeing Reminders",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Prayer times and designer focus hydration reminders"
            }

            notificationManager.createNotificationChannels(
                listOf(deliverablesChannel, studioChannel, prayerChannel)
            )
        }
    }

    fun showDeliverableSignOffNotification(
        context: Context,
        projectName: String,
        designer: String,
        notificationId: Int = (System.currentTimeMillis() % 10000).toInt()
    ) {
        val intent = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK
        }
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_DELIVERABLES)
            .setSmallIcon(R.drawable.ic_launcher_monochrome)
            .setContentTitle("✓ Sign-Off Requested")
            .setContentText("$designer submitted deliverable: $projectName")
            .setStyle(
                NotificationCompat.BigTextStyle()
                    .bigText("$designer has finalized creative assets for $projectName. Tap to review and approve on your companion.")
            )
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(notificationId, notification)
        } catch (e: SecurityException) {
            // Permission not granted yet on Android 13+
        }
    }

    fun showPrayerReminderNotification(
        context: Context,
        prayerName: String,
        prayerTime: String,
        notificationId: Int = 1001
    ) {
        val intent = Intent(context, MainActivity::class.java)
        val pendingIntent = PendingIntent.getActivity(
            context,
            0,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        val notification = NotificationCompat.Builder(context, CHANNEL_PRAYER)
            .setSmallIcon(R.drawable.ic_launcher_monochrome)
            .setContentTitle("🕌 Solat Reminder: $prayerName")
            .setContentText("Waktu $prayerName ($prayerTime) • Pause for focus & reflection")
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setContentIntent(pendingIntent)
            .setAutoCancel(true)
            .build()

        try {
            NotificationManagerCompat.from(context).notify(notificationId, notification)
        } catch (e: SecurityException) {
            // Android 13+ permission guard
        }
    }
}
