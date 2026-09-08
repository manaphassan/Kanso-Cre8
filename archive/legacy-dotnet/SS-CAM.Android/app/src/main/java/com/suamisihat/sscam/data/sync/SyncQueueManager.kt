package com.suamisihat.sscam.data.sync

import android.content.Context
import android.content.SharedPreferences
import com.google.gson.Gson
import com.google.gson.reflect.TypeToken
import com.suamisihat.sscam.data.api.CreateNoteRequest
import com.suamisihat.sscam.data.api.SscamApiService
import com.suamisihat.sscam.data.models.DecisionRequest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

data class QueuedAction(
    val id: String = System.currentTimeMillis().toString(),
    val type: String, // "DECISION", "CREATE_NOTE", "DELETE_NOTE"
    val targetId: String,
    val payloadJson: String,
    val timestamp: Long = System.currentTimeMillis()
)

object SyncQueueManager {
    private const val PREFS_NAME = "sscam_offline_sync_queue"
    private const val KEY_QUEUE = "pending_actions"
    private val gson = Gson()

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    }

    @Synchronized
    fun getPendingActions(context: Context): List<QueuedAction> {
        val json = getPrefs(context).getString(KEY_QUEUE, null) ?: return emptyList()
        val type = object : TypeToken<List<QueuedAction>>() {}.type
        return try {
            gson.fromJson(json, type) ?: emptyList()
        } catch (e: Exception) {
            emptyList()
        }
    }

    @Synchronized
    fun queueDecision(context: Context, projectId: String, decision: DecisionRequest) {
        val action = QueuedAction(
            type = "DECISION",
            targetId = projectId,
            payloadJson = gson.toJson(decision)
        )
        addAction(context, action)
    }

    @Synchronized
    fun queueCreateNote(context: Context, request: CreateNoteRequest) {
        val action = QueuedAction(
            type = "CREATE_NOTE",
            targetId = request.id ?: System.currentTimeMillis().toString(),
            payloadJson = gson.toJson(request)
        )
        addAction(context, action)
    }

    @Synchronized
    fun queueDeleteNote(context: Context, noteId: String) {
        val action = QueuedAction(
            type = "DELETE_NOTE",
            targetId = noteId,
            payloadJson = ""
        )
        addAction(context, action)
    }

    @Synchronized
    private fun addAction(context: Context, action: QueuedAction) {
        val current = getPendingActions(context).toMutableList()
        current.add(action)
        saveQueue(context, current)
    }

    @Synchronized
    fun clearQueue(context: Context) {
        getPrefs(context).edit().remove(KEY_QUEUE).apply()
    }

    @Synchronized
    private fun saveQueue(context: Context, actions: List<QueuedAction>) {
        getPrefs(context).edit().putString(KEY_QUEUE, gson.toJson(actions)).apply()
    }

    /**
     * Attempts to flush and execute all pending offline actions against the Synology NAS API.
     * Returns the count of successfully processed actions.
     */
    suspend fun flushQueue(context: Context, api: SscamApiService): Int = withContext(Dispatchers.IO) {
        val actions = getPendingActions(context)
        if (actions.isEmpty()) return@withContext 0

        val remaining = mutableListOf<QueuedAction>()
        var successCount = 0

        for (action in actions) {
            try {
                when (action.type) {
                    "DECISION" -> {
                        val decision = gson.fromJson(action.payloadJson, DecisionRequest::class.java)
                        val res = api.submitDecision(action.targetId, decision)
                        if (res.isSuccessful) {
                            successCount++
                        } else {
                            remaining.add(action)
                        }
                    }
                    "CREATE_NOTE" -> {
                        val noteReq = gson.fromJson(action.payloadJson, CreateNoteRequest::class.java)
                        val res = api.createNote(noteReq)
                        if (res.isSuccessful) {
                            successCount++
                        } else {
                            remaining.add(action)
                        }
                    }
                    "DELETE_NOTE" -> {
                        val res = api.deleteNote(action.targetId)
                        if (res.isSuccessful) {
                            successCount++
                        } else {
                            remaining.add(action)
                        }
                    }
                    else -> successCount++ // drop unrecognized
                }
            } catch (e: Exception) {
                remaining.add(action)
            }
        }

        saveQueue(context, remaining)
        return@withContext successCount
    }
}
