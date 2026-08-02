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
requirements = python3,kivy,flask,requests,urllib3,plyer

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

# ── Background Service ────────────────────────────────────────────────────────
# Formato: NomeDoServico:caminho/do/arquivo.py[:foreground]
# O sufixo ':foreground' instrui o p4a a declarar o serviço com
# android:exported="false" e permite chamar startForeground() no código.
# Para Android 14 (API 34) com foregroundServiceType no manifesto, edite
# o template do p4a ou use um recipe local — ver build-android.sh para detalhes.
services = AlertChecker:service/main.py:foreground

# ── Permissions ───────────────────────────────────────────────────────────────
# POST_NOTIFICATIONS         → permissão em runtime no Android 13+ (API 33+)
# FOREGROUND_SERVICE         → necessária para startForeground() — API 28+
# FOREGROUND_SERVICE_DATA_SYNC → tipo de serviço foreground no Android 14 (API 34+)
# VIBRATE / WAKE_LOCK        → usados pelo alerta checker em background
android.permissions = INTERNET,POST_NOTIFICATIONS,FOREGROUND_SERVICE,FOREGROUND_SERVICE_DATA_SYNC,VIBRATE,WAKE_LOCK

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
