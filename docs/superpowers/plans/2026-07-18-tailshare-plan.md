# TailShare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** File sharing Android app that sends files to `~/Desktop/Pixel10/` over Tailscale.

**Architecture:** Two components — a Python Flask HTTP server on the PC that saves uploaded files, and a native Kotlin Android app that registers as a share target, reads shared file URIs, prompts for an optional subfolder, and POSTs the bytes to the PC.

**Tech Stack:** Python 3 + Flask (PC), Kotlin + Jetpack Compose + OkHttp (Android)

## Global Constraints

- PC server binds to `0.0.0.0:7800`, saves to `~/Desktop/Pixel10/`
- Android min SDK 26, target SDK 34
- Share target accepts `*/*` mime types via `ACTION_SEND`
- No auth, no database, no third-party relay — Tailscale is the security boundary
- Duplicate filenames on PC get a timestamp suffix to avoid overwrite
- No cloud dependencies

---
### Task 1: PC Receiver (`server.py`)

**Files:**
- Create: `tailshare/server.py`
- Test: `tailshare/test_server.py`

**Interfaces:**
- Produces: `POST /upload` endpoint accepting multipart/form-data

- [ ] **Step 1: Write the failing test**

```python
import pytest
import os
import json
import tempfile
from pathlib import Path
from server import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

def test_upload_file_no_folder(client, tmp_path, monkeypatch):
    monkeypatch.setattr('server.DESKTOP_DIR', str(tmp_path))
    data = {'file': (b'hello world', 'test.txt')}
    resp = client.post('/upload', data=data, content_type='multipart/form-data')
    assert resp.status_code == 200
    body = json.loads(resp.data)
    assert body['status'] == 'ok'
    assert (tmp_path / 'Pixel10' / 'test.txt').read_text() == 'hello world'

def test_upload_file_with_folder(client, tmp_path, monkeypatch):
    monkeypatch.setattr('server.DESKTOP_DIR', str(tmp_path))
    data = {'file': (b'pdf content', 'doc.pdf'), 'folder': 'Receipts'}
    resp = client.post('/upload', data=data, content_type='multipart/form-data')
    assert resp.status_code == 200
    assert (tmp_path / 'Pixel10' / 'Receipts' / 'doc.pdf').read_text() == 'pdf content'

def test_upload_duplicate_filename(client, tmp_path, monkeypatch):
    monkeypatch.setattr('server.DESKTOP_DIR', str(tmp_path))
    (tmp_path / 'Pixel10').mkdir(parents=True, exist_ok=True)
    (tmp_path / 'Pixel10' / 'test.txt').write_text('original')
    data = {'file': (b'new version', 'test.txt')}
    resp = client.post('/upload', data=data, content_type='multipart/form-data')
    assert resp.status_code == 200
    # Original should be preserved, new file should have timestamp
    assert (tmp_path / 'Pixel10' / 'test.txt').read_text() == 'original'
    pixel10_dir = tmp_path / 'Pixel10'
    saved_files = list(pixel10_dir.iterdir())
    assert len(saved_files) == 2
    assert any('test_' in f.name for f in saved_files)

def test_upload_no_file(client):
    resp = client.post('/upload', data={}, content_type='multipart/form-data')
    assert resp.status_code == 400

def test_health_check(client):
    resp = client.get('/')
    assert resp.status_code == 200
    assert b'ok' in resp.data
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd tailshare && python -m pytest test_server.py -v`
Expected: All tests FAIL with "ModuleNotFoundError: No module named 'server'" or similar

- [ ] **Step 3: Write the server implementation**

```python
import os
import time
from pathlib import Path
from flask import Flask, request, jsonify

app = Flask(__name__)

DESKTOP_DIR = Path.home() / 'Desktop'

@app.route('/', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'status': 'error', 'message': 'Empty filename'}), 400

    folder = request.form.get('folder', '').strip()

    save_dir = DESKTOP_DIR / 'Pixel10'
    if folder:
        save_dir = save_dir / folder

    save_dir.mkdir(parents=True, exist_ok=True)

    dest = save_dir / file.filename
    if dest.exists():
        stem = dest.stem
        suffix = dest.suffix
        timestamp = int(time.time())
        dest = save_dir / f'{stem}_{timestamp}{suffix}'

    file.save(str(dest))
    return jsonify({'status': 'ok', 'path': str(dest)})

if __name__ == '__main__':
    import socket
    hostname = socket.gethostname()
    print(f'TailShare server starting...')
    print(f'Listening on port 7800')
    print(f'Saving files to: {DESKTOP_DIR / "Pixel10"}')
    app.run(host='0.0.0.0', port=7800, debug=False)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd tailshare && python -m pytest test_server.py -v`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add tailshare/
git commit -m "feat(tailshare): add PC receiver server.py"
```

---

### Task 2: Android Project Scaffolding

**Files:**
- Create: `tailshare/android/build.gradle.kts` (project-level)
- Create: `tailshare/android/app/build.gradle.kts`
- Create: `tailshare/android/settings.gradle.kts`
- Create: `tailshare/android/gradle.properties`
- Create: `tailshare/android/gradle/wrapper/gradle-wrapper.properties`
- Create: `tailshare/android/app/src/main/AndroidManifest.xml`
- Create: `tailshare/android/app/src/main/java/com/tailshare/MainActivity.kt`
- Create: `tailshare/android/app/src/main/res/values/strings.xml`
- Create: `tailshare/android/app/src/main/res/values/themes.xml`
- Create: `tailshare/android/local.properties` (gitignored)
- Create: `tailshare/android/.gitignore`

**Interfaces:**
- Produces: Compilable Android project skeleton

- [ ] **Step 1: Create project directory structure**

```bash
mkdir -p tailshare/android/app/src/main/java/com/tailshare
mkdir -p tailshare/android/app/src/main/res/values
mkdir -p tailshare/android/gradle/wrapper
```

- [ ] **Step 2: Create project-level `build.gradle.kts`**

```kotlin
plugins {
    id("com.android.application") version "8.2.2" apply false
    id("org.jetbrains.kotlin.android") version "1.9.22" apply false
}
```

- [ ] **Step 3: Create `settings.gradle.kts`**

```kotlin
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "TailShare"
include(":app")
```

- [ ] **Step 4: Create `gradle.properties`**

```properties
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
kotlin.code.style=official
android.nonTransitiveRClass=true
```

- [ ] **Step 5: Create `gradle/wrapper/gradle-wrapper.properties`**

```properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-bin.zip
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
```

- [ ] **Step 6: Create `app/build.gradle.kts`**

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.tailshare"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.tailshare"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.01.00"))
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.activity:activity-compose:1.8.2")
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
```

- [ ] **Step 7: Create `AndroidManifest.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
        android:maxSdkVersion="32" />

    <application
        android:allowBackup="true"
        android:label="@string/app_name"
        android:theme="@style/Theme.TailShare">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTop">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>

        <activity
            android:name=".ShareActivity"
            android:exported="true"
            android:theme="@style/Theme.TailShare"
            android:launchMode="singleTop">
            <intent-filter>
                <action android:name="android.intent.action.SEND" />
                <category android:name="android.intent.category.DEFAULT" />
                <data android:mimeType="*/*" />
            </intent-filter>
        </activity>

    </application>
</manifest>
```

- [ ] **Step 8: Create `res/values/strings.xml`**

```xml
<resources>
    <string name="app_name">TailShare</string>
</resources>
```

- [ ] **Step 9: Create `res/values/themes.xml`**

```xml
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="Theme.TailShare" parent="android:Theme.Material.Light.NoActionBar" />
</resources>
```

- [ ] **Step 10: Create `MainActivity.kt` (launcher placeholder)**

```kotlin
package com.tailshare

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.text.input.TextFieldValue

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SettingsScreen()
        }
    }
}

@Composable
fun SettingsScreen() {
    val prefs = androidx.compose.runtime.remember { mutableStateOf(TextFieldValue("")) }

    MaterialTheme {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("TailShare", style = MaterialTheme.typography.headlineMedium)
            Spacer(modifier = Modifier.height(16.dp))
            OutlinedTextField(
                value = prefs.value,
                onValueChange = { prefs.value = it },
                label = { Text("PC Tailscale IP") },
                singleLine = true
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(onClick = { /* save IP */ }) {
                Text("Save")
            }
        }
    }
}
```

- [ ] **Step 11: Initialize Gradle wrapper**

```bash
cd tailshare/android
# Create a minimal settings.gradle.kts first (done in step 3)
gradle wrapper --gradle-version=8.5
# If gradle is not installed, download the wrapper manually:
# curl -L -o gradle/wrapper/gradle-wrapper.jar https://raw.githubusercontent.com/gradle/gradle/v8.5.0/gradle/wrapper/gradle-wrapper.jar
```

- [ ] **Step 12: Create `.gitignore` for Android**

```gitignore
*.iml
.gradle
/local.properties
/.idea
.DS_Store
/build
/captures
.externalNativeBuild
.cxx
local.properties
```

- [ ] **Step 13: Build to verify compilation**

Run: `cd tailshare/android && ./gradlew assembleDebug`
Expected: BUILD SUCCESSFUL (APK at `app/build/outputs/apk/debug/app-debug.apk`)

- [ ] **Step 14: Commit**

```bash
git add tailshare/android/
git commit -m "feat(tailshare): add Android project scaffolding"
```

---

### Task 3: Share Target & File Upload

**Files:**
- Create: `tailshare/android/app/src/main/java/com/tailshare/ShareActivity.kt`
- Create: `tailshare/android/app/src/main/java/com/tailshare/FileUploader.kt`
- Modify: `tailshare/android/app/src/main/java/com/tailshare/MainActivity.kt` (replace placeholder SettingsScreen with proper implementation)

**Interfaces:**
- Consumes: PC Tailscale IP from SharedPreferences (via `TailSharePrefs`)
- Produces: `FileUploader.upload(ip, fileBytes, filename, folder)` — sends POST with multipart

- [ ] **Step 1: Create `TailSharePrefs.kt`**

```kotlin
package com.tailshare

import android.content.Context
import android.content.SharedPreferences

object TailSharePrefs {
    private const val PREFS_NAME = "tailshare_prefs"
    private const val KEY_PC_IP = "pc_ip"

    fun getPcIp(context: Context): String {
        return context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getString(KEY_PC_IP, "") ?: ""
    }

    fun savePcIp(context: Context, ip: String) {
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_PC_IP, ip)
            .apply()
    }
}
```

- [ ] **Step 2: Create `FileUploader.kt`**

```kotlin
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
```

- [ ] **Step 3: Create `ShareActivity.kt`**

```kotlin
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

class ShareActivity : ComponentActivity() {
    private var fileName: String = ""
    private var fileBytes: ByteArray? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val uri = intent?.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)
        if (uri == null) {
            Toast.makeText(this, "No file received", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

        fileName = getFileName(uri) ?: "unknown_file"
        fileBytes = try {
            contentResolver.openInputStream(uri)?.use { it.readBytes() }
        } catch (e: Exception) {
            null
        }

        if (fileBytes == null) {
            Toast.makeText(this, "Cannot read file", Toast.LENGTH_SHORT).show()
            finish()
            return
        }

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
        val ip = TailSharePrefs.getPcIp(this)
        if (ip.isBlank()) {
            showNotification("TailShare", "Configure PC IP in settings first")
            return
        }

        val bytes = fileBytes ?: return

        FileUploader.upload(
            pcIp = ip,
            fileBytes = bytes,
            fileName = fileName,
            folder = folder.ifBlank { null },
            onSuccess = { msg -> showNotification("TailShare", msg) },
            onError = { msg -> showNotification("TailShare", msg) }
        )
    }

    private fun showNotification(title: String, message: String) {
        val channelId = "tailshare_uploads"
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                channelId, "File Uploads", NotificationManager.IMPORTANCE_DEFAULT
            )
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(channel)
        }

        val notification = NotificationCompat.Builder(this, channelId)
            .setSmallIcon(android.R.drawable.ic_menu_send)
            .setContentTitle(title)
            .setContentText(message)
            .setAutoCancel(true)
            .build()

        NotificationManagerCompat.from(this).notify(System.currentTimeMillis().toInt(), notification)
    }
}
```

- [ ] **Step 4: Update `MainActivity.kt` — full SettingsScreen with SharedPreferences**

Replace the placeholder `MainActivity.kt`:

```kotlin
package com.tailshare

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.TextFieldValue
import androidx.compose.ui.unit.dp
import android.widget.Toast

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val savedIp = TailSharePrefs.getPcIp(this)

        setContent {
            SettingsScreen(
                initialIp = savedIp,
                onSave = { ip ->
                    TailSharePrefs.savePcIp(this, ip)
                    Toast.makeText(this, "IP saved", Toast.LENGTH_SHORT).show()
                }
            )
        }
    }
}

@Composable
fun SettingsScreen(initialIp: String, onSave: (String) -> Unit) {
    var ipText by remember { mutableStateOf(TextFieldValue(initialIp)) }

    MaterialTheme {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text("TailShare", style = MaterialTheme.typography.headlineMedium)
            Spacer(modifier = Modifier.height(8.dp))
            Text("Send files from phone to PC over Tailscale", style = MaterialTheme.typography.bodyMedium)
            Spacer(modifier = Modifier.height(24.dp))
            OutlinedTextField(
                value = ipText,
                onValueChange = { ipText = it },
                label = { Text("PC Tailscale IP") },
                singleLine = true,
                modifier = Modifier.fillMaxWidth()
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = { onSave(ipText.text) },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Save")
            }
        }
    }
}
```

- [ ] **Step 5: Build to verify compilation**

Run: `cd tailshare/android && ./gradlew assembleDebug`
Expected: BUILD SUCCESSFUL

- [ ] **Step 6: Commit**

```bash
git add tailshare/android/
git commit -m "feat(tailshare): add share target, file upload, and settings"
```

---

### Task 4: Documentation & Instructions

**Files:**
- Create: `tailshare/README.md`

- [ ] **Step 1: Create `tailshare/README.md`**

```markdown
# TailShare

Android app + PC server for sending files over Tailscale.

## Setup

### PC Server (one-time)

```bash
pip install flask
cd tailshare
python server.py
```

Server prints its Tailscale IP — note it for the app config.

### Android App

1. Open `tailshare/android/` in Android Studio
2. Build and install on your Pixel 10
3. Open TailShare app
4. Enter the PC's Tailscale IP address → Save
5. Done

## Usage

1. Keep `python server.py` running on your PC (add to startup if desired)
2. On your phone: open any file → Share → select TailShare
3. Optionally type a subfolder name → Send
4. File appears on desktop at `~/Desktop/Pixel10/`
```

- [ ] **Step 2: Commit**

```bash
git add tailshare/README.md
git commit -m "docs(tailshare): add setup instructions"
```
