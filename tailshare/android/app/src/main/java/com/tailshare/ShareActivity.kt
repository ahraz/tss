package com.tailshare

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import kotlinx.coroutines.*
import java.io.File

class ShareActivity : ComponentActivity() {
    private var fileName: String = ""
    private var fileUri: Uri? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val uri = intent?.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
        if (uri == null) {
            Toast.makeText(this, "No file received", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        fileUri = uri
        fileName = getFileName(uri) ?: "unknown_file"

        setContent {
            ShareDialog(
                fileName = fileName,
                onSend = { folder ->
                    sendFile(folder)
                    finish()
                },
                onCancel = { finish() }
            )
        }
    }

    @Composable
    private fun ShareDialog(
        fileName: String,
        onSend: (String) -> Unit,
        onCancel: () -> Unit
    ) {
        var folder by remember { mutableStateOf("") }

        MaterialTheme {
            AlertDialog(
                onDismissRequest = onCancel,
                title = { Text("Send to PC") },
                text = {
                    Column {
                        Text("File: $fileName")
                        Spacer(modifier = Modifier.height(12.dp))
                        OutlinedTextField(
                            value = folder,
                            onValueChange = { folder = it },
                            label = { Text("Subfolder (optional)") },
                            singleLine = true,
                            modifier = Modifier.fillMaxWidth()
                        )
                    }
                },
                confirmButton = {
                    Button(onClick = { onSend(folder) }) {
                        Text("Send")
                    }
                },
                dismissButton = {
                    TextButton(onClick = onCancel) {
                        Text("Cancel")
                    }
                }
            )
        }
    }

    private fun getFileName(uri: Uri): String? {
        val cursor = contentResolver.query(uri, null, null, null, null)
        return cursor?.use {
            val nameIndex = it.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
            it.moveToFirst()
            if (nameIndex >= 0) it.getString(nameIndex) else null
        }
    }

    private fun sendFile(folder: String) {
        val uri = fileUri ?: return
        val ip = TailSharePrefs.getPcIp(applicationContext)
        if (ip.isBlank()) {
            showNotification(applicationContext, "TailShare", "Configure PC IP in settings first")
            return
        }

        FileUploader.upload(
            pcIp = ip,
            context = applicationContext,
            uri = uri,
            fileName = fileName,
            folder = folder.ifBlank { null },
            onSuccess = { msg -> showNotification(applicationContext, "TailShare", msg) },
            onError = { msg ->
                val cacheFile = File(applicationContext.cacheDir, fileName)
                try {
                    applicationContext.contentResolver.openInputStream(uri)?.use { input ->
                        cacheFile.outputStream().use { output ->
                            input.copyTo(output)
                        }
                    }
                    showNotification(applicationContext, "TailShare - Retry available", "$msg\nCached at: ${cacheFile.absolutePath}")
                } catch (e: Exception) {
                    showNotification(applicationContext, "TailShare", msg)
                }
            }
        )
    }

    private fun showNotification(context: Context, title: String, message: String) {
        val channelId = "tailshare_uploads"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId, "File Uploads", NotificationManager.IMPORTANCE_DEFAULT
            )
            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(context, channelId)
            .setSmallIcon(android.R.drawable.ic_menu_send)
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(context).notify(System.currentTimeMillis().toInt(), notification)
    }
}
