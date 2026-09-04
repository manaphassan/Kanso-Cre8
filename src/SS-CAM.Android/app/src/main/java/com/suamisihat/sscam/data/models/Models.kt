package com.suamisihat.sscam.data.models

import com.google.gson.annotations.SerializedName

data class ProjectsResponse(
    @SerializedName("total") val total: Int = 0,
    @SerializedName("projects") val projects: List<ProjectItem> = emptyList()
)

data class ProjectItem(
    @SerializedName("id") val id: String = "",
    @SerializedName("title") val title: String? = "Untitled Project",
    @SerializedName("brand") val brand: String? = "SuamiSihat",
    @SerializedName("status") val status: String? = "backlog",
    @SerializedName("designer") val designer: String? = "",
    @SerializedName("client") val client: String? = "",
    @SerializedName("deadline") val deadline: String? = "",
    @SerializedName("created") val created: String? = "",
    @SerializedName("priority") val priority: String? = "medium",
    @SerializedName("revision") val revision: Int? = 0,
    @SerializedName("tags") val tags: List<String>? = emptyList(),
    @SerializedName("deliverableCount") val deliverableCount: Int? = 0,
    @SerializedName("presetType") val presetType: String? = "",
    @SerializedName("mediaClass") val mediaClass: String? = "image"
) {
    val safeTitle: String
        get() = title.orEmpty().ifBlank { "Untitled Project" }

    val safeBrand: String
        get() = brand.orEmpty().ifBlank { "SSH" }

    val safeDesigner: String
        get() = designer.orEmpty().ifBlank { "Unassigned" }

    val safeClient: String
        get() = client.orEmpty().ifBlank { "Internal" }

    val safePriority: String
        get() = priority.orEmpty().ifBlank { "standard" }

    val safeDeliverableCount: Int
        get() = deliverableCount ?: 0

    val normalizedStatus: String
        get() = when (status?.lowercase()?.trim()) {
            "review", "in_review", "in-review" -> "in_review"
            "in_progress", "in-progress", "inprogress" -> "in_progress"
            "revision", "revision_requested" -> "revision"
            "done", "completed", "approved" -> "done"
            "on-hold", "on_hold", "hold", "paused" -> "on_hold"
            else -> "backlog"
        }

    val formattedDeadline: String
        get() {
            val d = deadline.orEmpty().trim().trim('"', '\'')
            if (d.isBlank()) return "TBD"
            return try {
                if (d.contains("T")) {
                    val datePart = d.substringBefore("T")
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
                } else d
            } catch (e: Exception) {
                d
            }
        }

    val parsedCreatedDate: java.time.LocalDate?
        get() {
            val c = created.orEmpty().trim().trim('"', '\'')
            if (c.isBlank()) return null
            return try {
                val dateStr = if (c.contains("T")) c.substringBefore("T") else c
                java.time.LocalDate.parse(dateStr.trim())
            } catch (e: Exception) {
                null
            }
        }

    val parsedDeadlineDate: java.time.LocalDate?
        get() {
            val d = deadline.orEmpty().trim().trim('"', '\'')
            if (d.isBlank()) return null
            return try {
                val dateStr = if (d.contains("T")) d.substringBefore("T") else d
                java.time.LocalDate.parse(dateStr.trim())
            } catch (e: Exception) {
                null
            }
        }

    val effectiveStartDate: java.time.LocalDate
        get() = parsedCreatedDate ?: parsedDeadlineDate ?: java.time.LocalDate.MIN

    val effectiveEndDate: java.time.LocalDate
        get() = parsedDeadlineDate ?: parsedCreatedDate ?: java.time.LocalDate.MAX

    fun isActiveOn(date: java.time.LocalDate): Boolean {
        val start = parsedCreatedDate ?: parsedDeadlineDate ?: return false
        val due = parsedDeadlineDate ?: parsedCreatedDate ?: return false
        val s = if (due.isBefore(start)) due else start
        val e = if (due.isBefore(start)) start else due
        return !date.isBefore(s) && !date.isAfter(e)
    }

    val formattedCreated: String
        get() {
            val c = created.orEmpty().trim().trim('"', '\'')
            if (c.isBlank()) return "N/A"
            return try {
                val datePart = if (c.contains("T")) c.substringBefore("T") else c
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
            } catch (e: Exception) {
                c
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

data class OrdersResponse(
    @SerializedName("success") val success: Boolean = false,
    @SerializedName("orders") val orders: List<CreativeOrder> = emptyList()
)

data class CreativeOrder(
    @SerializedName("id") val id: String = "",
    @SerializedName("title") val title: String = "",
    @SerializedName("entity") val entity: String = "SSH",
    @SerializedName("priority") val priority: String = "tier_1",
    @SerializedName("format") val format: String = "1_1_feed",
    @SerializedName("copy") val copy: String = "",
    @SerializedName("targetDate") val targetDate: String = "",
    @SerializedName("attachmentNote") val attachmentNote: String = "",
    @SerializedName("requester") val requester: String = "Unknown",
    @SerializedName("requesterRole") val requesterRole: String = "",
    @SerializedName("status") val status: String = "pending",
    @SerializedName("submittedAt") val submittedAt: String = "",
    @SerializedName("updatedAt") val updatedAt: String = "",
    @SerializedName("assignedTo") val assignedTo: String? = null,
    @SerializedName("projectId") val projectId: String? = null
) {
    val safeTitle: String
        get() = title.ifBlank { "Untitled Request" }

    val safeEntity: String
        get() = entity.ifBlank { "SSH" }

    val priorityBadge: String
        get() = when (priority.lowercase()) {
            "tier_3", "urgent" -> "P3"
            "tier_2", "fast-track", "high" -> "P2"
            else -> "P1"
        }

    val priorityLabel: String
        get() = when (priority.lowercase()) {
            "tier_3", "urgent" -> "P3 (Urgent)"
            "tier_2", "fast-track", "high" -> "P2 (Fast-Track)"
            else -> "P1 (Standard)"
        }

    val formatLabel: String
        get() = when (format) {
            "9_16_video" -> "9:16 Video"
            "1_1_feed" -> "1:1 Feed"
            "16_9_landscape" -> "16:9 Landscape"
            "print_posm" -> "Print / POSM"
            "print_digital" -> "Digital Banner"
            else -> format.replace("_", " ").replaceFirstChar { it.uppercase() }
        }

    val statusLabel: String
        get() = when (status) {
            "pending" -> "Pending"
            "in_progress" -> "In Progress"
            "for_approval" -> "For Approval"
            "done", "completed" -> "Completed"
            "cancelled" -> "Cancelled"
            else -> status.replace("_", " ").replaceFirstChar { it.uppercase() }
        }
}

data class CreateOrderRequest(
    @SerializedName("title") val title: String,
    @SerializedName("entity") val entity: String,
    @SerializedName("priority") val priority: String,
    @SerializedName("format") val format: String,
    @SerializedName("copy") val copy: String,
    @SerializedName("targetDate") val targetDate: String,
    @SerializedName("attachmentNote") val attachmentNote: String = "",
    @SerializedName("requester") val requester: String = "Harussani",
    @SerializedName("requesterRole") val requesterRole: String = "Admin, Designer"
)

