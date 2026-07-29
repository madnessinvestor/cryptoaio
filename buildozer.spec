[app]
title           = CryptoAIO
package.name    = cryptoaio
package.domain  = com.madnessinvestor
source.dir      = .
source.include_exts = py,png,jpg,kv,atlas,json,html,css,js,ico,txt,webmanifest
version         = 1.0

# Entry point
entrypoint = android_main.py

# Requirements
# flask and its deps are pure-python — p4a handles them automatically
requirements = python3,kivy,flask,werkzeug,jinja2,itsdangerous,click,blinker,requests,urllib3,plyer

# Android config
android.permissions = INTERNET,POST_NOTIFICATIONS,VIBRATE,WAKE_LOCK
android.api         = 33
android.minapi      = 26
android.ndk         = 25b
android.archs       = arm64-v8a, armeabi-v7a

# App icon (put a 512x512 PNG at assets/icon.png if you have one)
# icon.filename = %(source.dir)s/static/icons/logo.png

android.orientation = portrait
android.wakelock    = False

# Fullscreen (hides status bar)
android.fullscreen  = 0

[buildozer]
log_level = 2
warn_on_root = 1
