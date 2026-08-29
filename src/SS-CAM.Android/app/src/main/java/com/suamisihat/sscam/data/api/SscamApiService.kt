package com.suamisihat.sscam.data.api

import com.suamisihat.sscam.data.models.DashboardSummary
import com.suamisihat.sscam.data.models.DecisionRequest
import com.suamisihat.sscam.data.models.DeliverableItem
import com.suamisihat.sscam.data.models.ProjectItem
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Response
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

interface SscamApiService {

    @GET("api/dashboard")
    suspend fun getDashboardSummary(): Response<DashboardSummary>

    @GET("api/projects")
    suspend fun getProjects(
        @Query("brand") brand: String? = null,
        @Query("status") status: String? = null
    ): Response<List<ProjectItem>>

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
        private const val DEFAULT_BASE_URL = "https://creative.suamisihat.myds.me/"

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
