package com.suamisihat.sscam.data.api

import com.google.gson.annotations.SerializedName
import com.suamisihat.sscam.data.models.*
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

data class LoginRequest(
    @SerializedName("username") val username: String,
    @SerializedName("password") val password: String? = null
)
data class LoginResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("token") val token: String? = null,
    @SerializedName("error") val error: String? = null
)

data class NoteItemDto(
    @SerializedName("id") val id: String,
    @SerializedName("filename") val filename: String? = null,
    @SerializedName("title") val title: String,
    @SerializedName("body") val body: String,
    @SerializedName("isPinned") val isPinned: Boolean = false,
    @SerializedName("priority") val priority: String = "normal",
    @SerializedName("modified") val modified: Long = 0L,
    @SerializedName("dateText") val dateText: String = ""
)

data class NotesResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("notes") val notes: List<NoteItemDto> = emptyList()
)

data class CreateNoteRequest(
    @SerializedName("id") val id: String? = null,
    @SerializedName("title") val title: String,
    @SerializedName("body") val body: String,
    @SerializedName("isPinned") val isPinned: Boolean = false,
    @SerializedName("priority") val priority: String = "normal"
)

interface SscamApiService {

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @GET("api/dashboard")
    suspend fun getDashboardSummary(): Response<DashboardSummary>

    @GET("api/projects")
    suspend fun getProjects(
        @Query("brand") brand: String? = null,
        @Query("status") status: String? = null
    ): Response<ProjectsResponse>

    @POST("api/projects")
    suspend fun createProject(
        @Body request: CreateProjectRequest
    ): Response<ProjectItem>

    @GET("api/deliverables")
    suspend fun getDeliverables(
        @Query("projectId") projectId: String? = null
    ): Response<List<DeliverableItem>>

    @GET("api/team")
    suspend fun getTeam(): Response<TeamResponse>

    @POST("api/projects/{id}/decision")
    suspend fun submitDecision(
        @Path("id") projectId: String,
        @Body request: DecisionRequest
    ): Response<Unit>

    @GET("api/projects/{id}/comments")
    suspend fun getProjectComments(
        @Path("id") projectId: String
    ): Response<CommentsResponse>

    @GET("api/notifications")
    suspend fun getNotifications(): Response<NotificationsResponse>

    @GET("api/notes")
    suspend fun getNotes(): Response<NotesResponse>

    @POST("api/notes")
    suspend fun createNote(
        @Body request: CreateNoteRequest
    ): Response<Unit>

    @DELETE("api/notes/{id}")
    suspend fun deleteNote(
        @Path("id") noteId: String
    ): Response<Unit>

    companion object {
        const val DEFAULT_BASE_URL = "https://creative.suamisihat.myds.me/"

        fun create(baseUrl: String = DEFAULT_BASE_URL, authToken: String? = null): SscamApiService {
            val logging = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            }

            val client = OkHttpClient.Builder()
                .connectTimeout(15, TimeUnit.SECONDS)
                .readTimeout(20, TimeUnit.SECONDS)
                .addInterceptor(logging)
                .addInterceptor { chain ->
                    val requestBuilder = chain.request().newBuilder()
                    if (!authToken.isNullOrBlank()) {
                        requestBuilder.addHeader("Authorization", "Bearer $authToken")
                    }
                    chain.proceed(requestBuilder.build())
                }
                .build()

            return Retrofit.Builder()
                .baseUrl(baseUrl)
                .client(client)
                .addConverterFactory(GsonConverterFactory.create())
                .build()
                .create(SscamApiService::class.java)
        }
    }
}
