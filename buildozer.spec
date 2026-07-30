[app]
title           = CryptoAIO
package.name    = cryptoaio
package.domain  = com.madnessinvestor
source.dir      = .
source.include_exts = py,png,jpg,kv,atlas,json,html,css,js,ico,txt,webmanifest

# version: string shown to users (e.g. "1.2.0")
version         = 1.0.0
# android.numeric_version: integer that MUST increase with every Play Store upload
android.numeric_version = 1

# Entry point
entrypoint = android_main.py

# Requirements
# flask and its deps are pure-python — p4a handles them automatically
requirements = python3,kivy,flask,werkzeug,jinja2,itsdangerous,click,blinker,requests,urllib3,plyer

# ── Icons ─────────────────────────────────────────────────────────────────────
# 512×512 PNG — used by Buildozer for launcher + Play Store hi-res icon
icon.filename = %(source.dir)s/static/icons/icon-512.png

# ── Android config ────────────────────────────────────────────────────────────
# Google Play requires targetSdkVersion >= 34 for apps updated after Aug 2024
android.api         = 34
android.minapi      = 26
android.ndk         = 25b
android.archs       = arm64-v8a, armeabi-v7a

# Permissions
# POST_NOTIFICATIONS  → required at runtime on Android 13+ (API 33+)
# VIBRATE / WAKE_LOCK → used by the background alert checker
android.permissions = INTERNET,POST_NOTIFICATIONS,VIBRATE,WAKE_LOCK

android.orientation = portrait
android.wakelock    = False

# Show status bar (required for a proper WebView experience)
android.fullscreen  = 0

# ── Release / Play Store ──────────────────────────────────────────────────────
# Build an AAB (Android App Bundle) for Play Store; use 'apk' for sideloading
# Override on the command line:  buildozer android release  (produces AAB by default)
# android.release_artifact = aab     # uncomment to force AAB in every release build

[buildozer]
log_level = 2
warn_on_root = 1
