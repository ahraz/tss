package com.tailshare

import android.content.Context
import android.net.Uri
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okio.BufferedSink
import okio.source
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
        context: Context,
        uri: Uri,
        fileName: String,
        folder: String?,
        onSuccess: (String) -> Unit,
        onError: (String) -> Unit
    ) {
        val url = "http://$pcIp:7800/upload"

        val fileRequestBody = object : RequestBody() {
            override fun contentType() = "application/octet-stream".toMediaTypeOrNull()
            override fun contentLength() = -1L
            override fun writeTo(sink: BufferedSink) {
                context.contentResolver.openInputStream(uri)?.use { input ->
                    sink.writeAll(input.source())
                }
            }
        }

        val requestBody = MultipartBody.Builder()
            .setType(MultipartBody.FORM)
            .addFormDataPart("file", fileName, fileRequestBody)
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
