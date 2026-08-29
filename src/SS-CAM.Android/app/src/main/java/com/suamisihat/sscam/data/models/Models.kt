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
    @SerializedName("deliverableCount") val deliverableCount: Int = 0
)

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

data class DashboardSummary(
    @SerializedName("totalProjects") val totalProjects: Int,
    @SerializedName("inProgress") val inProgress: Int,
    @SerializedName("inReview") val inReview: Int,
    @SerializedName("completed") val completed: Int,
    @SerializedName("overdue") val overdue: Int,
    @SerializedName("holdingBreakdown") val holdingBreakdown: Map<String, Int> = emptyMap()
)
