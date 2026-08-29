package com.suamisihat.sscam.data.models

import com.google.gson.annotations.SerializedName

data class ProjectsResponse(
    @SerializedName("total") val total: Int = 0,
    @SerializedName("projects") val projects: List<ProjectItem> = emptyList()
)

data class ProjectItem(
    @SerializedName("id") val id: String,
    @SerializedName("title") val title: String,
    @SerializedName("brand") val brand: String = "SuamiSihat",
    @SerializedName("status") val status: String = "backlog",
    @SerializedName("designer") val designer: String = "",
    @SerializedName("client") val client: String = "",
    @SerializedName("deadline") val deadline: String = "",
    @SerializedName("created") val created: String = "",
    @SerializedName("priority") val priority: String = "medium",
    @SerializedName("revision") val revision: Int = 0,
    @SerializedName("tags") val tags: List<String> = emptyList(),
    @SerializedName("deliverableCount") val deliverableCount: Int = 0,
    @SerializedName("presetType") val presetType: String = "",
    @SerializedName("mediaClass") val mediaClass: String = "image"
) {
    val normalizedStatus: String
        get() = when (status.lowercase().trim()) {
            "review", "in_review", "in-review" -> "in_review"
            "in_progress", "in-progress", "inprogress" -> "in_progress"
            "revision", "revision_requested" -> "revision"
            "done", "completed" -> "done"
            else -> "backlog"
        }

    val formattedDeadline: String
        get() {
            if (deadline.isBlank()) return "TBD"
            return try {
                if (deadline.contains("T")) {
                    val datePart = deadline.substringBefore("T")
                    val parts = datePart.split("-")
                    if (parts.size == 3) {
                        val year = parts[0]
                        val month = when (parts[1]) {
                            "01" -> "Jan"; "02" -> "Feb"; "03" -> "Mar"; "04" -> "Apr"
                            "05" -> "May"; "06" -> "Jun"; "07" -> "Jul"; "08" -> "Aug"
                            "09" -> "Sep"; "10" -> "Oct"; "11" -> "Nov"; "12" -> "Dec"
                            else -> parts[1]
                        }
                        val day = parts[2]
                        "$day $month $year"
                    } else datePart
                } else deadline
            } catch (e: Exception) {
                deadline
            }
        }
}

data class DeliverableItem(
    @SerializedName("fileName") val fileName: String,
    @SerializedName("projectId") val projectId: String,
    @SerializedName("relativePath") val relativePath: String,
    @SerializedName("extension") val extension: String,
    @SerializedName("sizeBytes") val sizeBytes: Long = 0L,
    @SerializedName("mediaClass") val mediaClass: String = "image",
    @SerializedName("aspectRatioEstimate") val aspectRatioEstimate: String = "1:1",
    @SerializedName("previewUrl") val previewUrl: String = ""
)

data class DecisionRequest(
    @SerializedName("decision") val decision: String, // "approved" or "revision_requested"
    @SerializedName("reason") val reason: String = "",
    @SerializedName("reviewer") val reviewer: String
)

data class CreateProjectRequest(
    @SerializedName("title") val title: String,
    @SerializedName("brand") val brand: String = "SS",
    @SerializedName("designer") val designer: String = "",
    @SerializedName("priority") val priority: String = "medium",
    @SerializedName("department") val department: String = "Creative Production",
    @SerializedName("deadline") val deadline: String = ""
)

data class CommentItem(
    @SerializedName("id") val id: String = "",
    @SerializedName("author") val author: String = "",
    @SerializedName("role") val role: String = "",
    @SerializedName("content") val content: String = "",
    @SerializedName("timestamp") val timestamp: String = "",
    @SerializedName("resolved") val resolved: Boolean = false
)

data class CommentsResponse(
    @SerializedName("comments") val comments: List<CommentItem> = emptyList()
)

data class NotificationItem(
    @SerializedName("id") val id: String = "",
    @SerializedName("type") val type: String = "comment", // "approval", "revision", "comment", "mention", "system"
    @SerializedName("title") val title: String = "",
    @SerializedName("message") val message: String = "",
    @SerializedName("timestamp") val timestamp: String = "",
    @SerializedName("author") val author: String = "Studio",
    @SerializedName("projectId") val projectId: String = "",
    @SerializedName("projectTitle") val projectTitle: String = "",
    @SerializedName("read") val read: Boolean = false
)

data class NotificationsResponse(
    @SerializedName("notifications") val notifications: List<NotificationItem> = emptyList(),
    @SerializedName("unreadCount") val unreadCount: Int = 0
)

data class PrayerTime(
    val name: String,
    val time: String,
    val isNext: Boolean = false
)

data class DashboardSummary(
    @SerializedName("totalProjects") val totalProjects: Int = 0,
    @SerializedName("inProgress") val inProgress: Int = 0,
    @SerializedName("inReview") val inReview: Int = 0,
    @SerializedName("completed") val completed: Int = 0,
    @SerializedName("overdue") val overdue: Int = 0,
    @SerializedName("holdingBreakdown") val holdingBreakdown: Map<String, Int> = emptyMap()
)

data class TeamResponse(
    @SerializedName("team") val team: List<StaffMember> = emptyList(),
    @SerializedName("staff") val staff: List<StaffMember> = emptyList()
) {
    val allStaff: List<StaffMember>
        get() = if (team.isNotEmpty()) team else staff
}

data class StaffMember(
    @SerializedName("staffId") val staffId: String = "",
    @SerializedName("username") val username: String = "",
    @SerializedName("name") val name: String = "",
    @SerializedName("role") val role: String = "Designer",
    @SerializedName("department") val department: String = "Creative Production",
    @SerializedName("avatar") val avatar: String = "",
    @SerializedName("avatarUrl") val avatarUrl: String = "",
    @SerializedName("avatarColor") val avatarColor: String = "#0078D4",
    @SerializedName("defaultBrand") val defaultBrand: String = "SS",
    @SerializedName("workload") val workload: StaffWorkload? = null,
    @SerializedName("totalAssignedCount") val totalAssignedCount: Int = 0
) {
    val initialLetter: String
        get() = (name.ifBlank { username.ifBlank { "U" } }).take(1).uppercase()

    val profileImageUrl: String
        get() {
            if (avatarUrl.isNotBlank()) return avatarUrl
            if (avatar.isNotBlank()) {
                return if (avatar.startsWith("http") || avatar.startsWith("data:image/")) avatar else "https://creative.suamisihat.myds.me$avatar"
            }
            return ""
        }
}

data class StaffWorkload(
    @SerializedName("total") val total: Int = 0,
    @SerializedName("active") val active: Int = 0,
    @SerializedName("inProgress") val inProgress: Int = 0,
    @SerializedName("inReview") val inReview: Int = 0,
    @SerializedName("revision") val revision: Int = 0,
    @SerializedName("completed") val completed: Int = 0,
    @SerializedName("capacityPercent") val capacityPercent: Float = 0f,
    @SerializedName("capacityStatus") val capacityStatus: String = "Optimal Bandwidth",
    @SerializedName("capacityColor") val capacityColor: String = "#10B981"
)
