[app]
title           = CryptoAIO
package.name    = cryptoaio
package.domain  = com.madnessinvestor
source.dir      = .
source.include_exts = py,png,jpg,kv,atlas,json,html,css,js,ico,txt,webmanifest

# ── Version ───────────────────────────────────────────────────────────────────
# version:              string shown to users on the Play Store (e.g. "1.2.0")
# android.numeric_version: integer versionCode — MUST increase with every upload
version                  = 1.0.0
android.numeric_version  = 1

# ── Entry point ───────────────────────────────────────────────────────────────
entrypoint = android_main.py

# ── Python / p4a requirements ─────────────────────────────────────────────────
# flask and its deps are pure-python — p4a bundles them automatically.
# 'android' and 'jnius' are built-in p4a recipes (no explicit entry needed).
requirements = python3,kivy,flask,werkzeug,jinja2,itsdangerous,click,blinker,requests,urllib3,plyer

# ── Icons & Splash ────────────────────────────────────────────────────────────
# 512×512 PNG used for launcher icon and Play Store hi-res icon
icon.filename       = %(source.dir)s/static/icons/icon-512.png
# Reuse the same image as the splash screen (shown while Flask starts)
presplash.filename  = %(source.dir)s/static/icons/icon-512.png
# Dark background behind the presplash (matches the app's dark theme)
presplash.leavetime = 1.0

# ── Source exclusions (reduce APK size) ───────────────────────────────────────
source.exclude_dirs = .git,.local,.agents,.cache,.pythonlibs,__pycache__,build,dist,bin,tests,.replit,node_modules

# ── Android SDK/NDK ───────────────────────────────────────────────────────────
# Google Play requires targetSdkVersion >= 34 for apps updated after Aug 2024
android.api     = 34
android.minapi  = 26
android.ndk     = 25b
android.archs   = arm64-v8a, armeabi-v7a

# Auto-accept SDK license — required for non-interactive / CI builds
android.accept_sdk_license = True

# ── Permissions ───────────────────────────────────────────────────────────────
# POST_NOTIFICATIONS → runtime permission required on Android 13+ (API 33+)
# VIBRATE / WAKE_LOCK → background alert checker
android.permissions = INTERNET,POST_NOTIFICATIONS,VIBRATE,WAKE_LOCK

# ── UI ────────────────────────────────────────────────────────────────────────
android.orientation = portrait
android.wakelock    = False
android.fullscreen  = 0

# ── Release artifact ─────────────────────────────────────────────────────────
# 'aab' = Android App Bundle (required by Google Play for new apps)
# 'apk' = standard APK (use for sideloading / direct install)
# Override on the command line:
#   APK  →  buildozer android debug           (debug always produces APK)
#   AAB  →  buildozer android release         (uses this setting)
android.release_artifact = aab

# ── Logcat (debug builds) ─────────────────────────────────────────────────────
android.logcat_filters = *:S python:D

[buildozer]
log_level    = 2
warn_on_root = 1
