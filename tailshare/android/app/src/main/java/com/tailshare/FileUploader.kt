package com.tailshare

import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

object FileUploader {
    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(120, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    fun upload(
        pcIp: String,
        fileBytes: ByteArray,
        fileName: String,
        folder: String?,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        val url = "http://$pcIp:7800/upload"

        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("file", fileName, fileBytes.toRequestBody("application/octet-stream".toMediaTypeOrNull()))
            .apply {
                if (!folder.isNullOrBlank()) {
                    addFormDataPart("folder", folder)
                }
            }
            .build()

        val request = Request.Builder()
            .url(url)
            .post(requestBody)
            .build()

        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                onError("Connection failed: ${e.localizedMessage ?: "Unknown error"}")
            }

            override fun onResponse(call: Call, response: Response) {
                if (response.isSuccessful) {
                    onSuccess("File sent successfully")
                } else {
                    onError("Server error: ${response.code}")
                }
            }
        })
    }
}
