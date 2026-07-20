# TailShare — Android-to-PC File Sharing over Tailscale

## Problem

Send any file (images, videos, PDFs, documents) from an Android phone to a PC desktop folder with zero friction — leveraging Tailscale's private network for security.

## Architecture

```
Phone (Share Intent → TailShare App)          PC (Tailscale node)
┌─────────────────────────────────┐           ┌─────────────────────────┐
│  Android share target (*/*)     │  HTTP     │  Flask server (:7800)   │
│  → Read content URI → bytes     │  POST     │  → Save to              │
│  → Ask optional subfolder       │  multipart│    ~/Desktop/Pixel10/   │
│  → Send to PC Tailscale IP      │──────────→│    [subfolder]/<file>   │
│  → Toast on success/failure     │           │  → Return JSON response │
└─────────────────────────────────┘           └─────────────────────────┘
         │                                            │
         └──────── Tailscale private network ─────────┘
```

No cloud relay, no auth, no database. The Tailscale network is the security boundary.

## Components

### 1. PC Receiver (`server.py`)

- **Language/runtime:** Python 3 + Flask
- **Port:** 7800
- **Endpoint:** `POST /upload`
  - Accepts `multipart/form-data` with a `file` field
  - Optional `folder` field for subfolder name
  - Saves to `~/Desktop/Pixel10/<folder>/<filename>` or `~/Desktop/Pixel10/<filename>`
  - Returns `{"status": "ok", "path": "..."}` on success
- **Edge cases:**
  - Duplicate filename: append timestamp to avoid overwrite
  - Missing `file` field: return 400
  - Disk full / permission error: return 500 with message
- **Setup:** `pip install flask` then `python server.py`
- Binds to `0.0.0.0:7800` (Tailscale makes it accessible only on your network)

### 2. Android App (`TailShare`)

- **Language:** Kotlin
- **UI:** Jetpack Compose
- **Minimum SDK:** 26 (Android 8.0)
- **Target SDK:** 34 (Android 14)

#### App Configuration

- **Share target:** Declared in `AndroidManifest.xml` as a direct share target
  - Mime types: `*/*` — accepts all file types
  - Category: `CATEGORY_DEFAULT`, action: `ACTION_SEND`
- **Network permission:** `INTERNET` (HTTP over Tailscale)

#### UI Screens

**1. Settings Screen (first launch / config)**

One field: **PC Tailscale IP address** (saved to SharedPreferences).

**2. Share Intercept Flow (when user shares a file)**

1. App receives `ACTION_SEND` intent with content URI
2. Shows a dialog with:
   - **Filename** (extracted from content URI)
   - **Optional subfolder** text field (pre-filled blank)
   - **Send** button / **Cancel** button
3. On Send:
   - Reads file bytes from content resolver `InputStream`
   - Creates `MultipartBody.Part` with filename
   - POSTs to `http://<pc-ip>:7800/upload`
   - Shows Android notification: "File sent to PC" or "Failed: <reason>"
   - Finishes activity

**3. History Screen (optional — stretch goal)**

Lists recent transfers: filename, date, status. Stored in a local SQLite/ Room database. Not required for MVP.

#### Edge Cases

- **No internet / PC unreachable:** Show error notification, keep the file for retry
- **Large files (>100MB):** Stream via `RequestBody` instead of loading entirely into memory; chunked transfer
- **File URI can't be read:** Show "Cannot access file" notification
- **No Tailscale IP configured:** Show Settings screen prompting for IP
- **Duplicate filenames:** Handled server-side (appends timestamp)

### 3. Communication Protocol

```
POST http://<pc-tailscale-ip>:7800/upload
Content-Type: multipart/form-data; boundary=----boundary

------boundary
Content-Disposition: form-data; name="file"; filename="photo.jpg"
Content-Type: image/jpeg

<binary data>
------boundary
Content-Disposition: form-data; name="folder"

Receipts
------boundary--
```

**Response (200):**
```json
{ "status": "ok", "path": "/home/user/Desktop/Pixel10/Receipts/photo.jpg" }
```

**Response (400/500):**
```json
{ "status": "error", "message": "description" }
```

## Setup & Usage

### PC side (one-time)
```bash
pip install flask
python server.py
```
Server prints its Tailscale IP and port. Keep running in background.

### Phone side (one-time)
1. Install TailShare APK
2. Open app, enter PC's Tailscale IP, tap Save
3. Done.

### Daily use
1. PC has `server.py` running (add to startup if desired)
2. On phone: any file → Share → "TailShare"
3. Optionally type a subfolder name → Send
4. File appears on desktop in seconds

## Non-Goals

- No encryption layer (Tailscale already encrypts the tunnel)
- No authentication (Tailscale network is private by default)
- No bidirectional sync or file management
- No cloud/offline fallback
- No iOS/Windows server support (MVP is Linux PC)
