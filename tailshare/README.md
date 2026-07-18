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
