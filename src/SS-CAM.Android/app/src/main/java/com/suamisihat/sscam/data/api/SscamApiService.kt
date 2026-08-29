package com.suamisihat.sscam.data.api

import com.google.gson.annotations.SerializedName
import com.suamisihat.sscam.data.models.DashboardSummary
import com.suamisihat.sscam.data.models.DecisionRequest
import com.suamisihat.sscam.data.models.DeliverableItem
import com.suamisihat.sscam.data.models.ProjectItem
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.*
import java.util.concurrent.TimeUnit

data class LoginRequest(@SerializedName("username") val username: String)
data class LoginResponse(
    @SerializedName("success") val success: Boolean,
    @SerializedName("token") val token: String? = null,
    @SerializedName("error") val error: String? = null
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
    ): Response<com.suamisihat.sscam.data.models.ProjectsResponse>

    @GET("api/deliverables")
    suspend fun getDeliverables(
        @Query("projectId") projectId: String? = null
    ): Response<List<DeliverableItem>>

    @POST("api/projects/{id}/decision")
    suspend fun submitDecision(
        @Path("id") projectId: String,
        @Body request: DecisionRequest
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
