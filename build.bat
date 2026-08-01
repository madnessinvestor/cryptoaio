@echo off
REM CryptoAIO — Windows Desktop Build Script
REM Requires Python 3.10+ and pip

REM Change to the script's own directory so relative paths work
cd /d "%~dp0"

echo ============================================
echo  CryptoAIO — Building Windows Desktop App
echo ============================================
echo.

REM Install / upgrade build deps
echo [1/3] Installing dependencies...
python -m pip install -r requirements.txt pyinstaller pywebview --quiet
if %errorlevel% neq 0 (
    echo ERROR: pip install failed.
    pause & exit /b 1
)

REM Clean previous build
echo [2/3] Cleaning previous build...
if exist build rmdir /s /q build
if exist dist  rmdir /s /q dist

REM Build
echo [3/3] Running PyInstaller...
python -m PyInstaller CryptoAIO.spec --clean --noconfirm
if %errorlevel% neq 0 (
    echo ERROR: PyInstaller failed.
    pause & exit /b 1
)

echo.
echo ============================================
echo  Build complete!
echo  Executable: dist\CryptoAIO\CryptoAIO.exe
echo ============================================
pause
