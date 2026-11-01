@echo off
setlocal
cd /d "%~dp0"
echo.
echo ==== MoveProof Qatar: build and update your paired Android phone ====
echo.
call "BUILD_ON_WINDOWS.bat"
if errorlevel 1 (
  echo.
  echo Build failed. Your installed phone app was not changed.
  pause
  exit /b 1
)
set "ADB=%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"
if defined ANDROID_HOME if exist "%ANDROID_HOME%\platform-tools\adb.exe" set "ADB=%ANDROID_HOME%\platform-tools\adb.exe"
if not exist "%ADB%" (
  echo Android platform-tools not found. Install Android SDK Platform-Tools from SDK Manager.
  pause
  exit /b 1
)
if not exist "app\build\outputs\apk\debug\app-debug.apk" (
  echo APK not found. Build may not have produced an app-debug.apk file.
  pause
  exit /b 1
)
echo.
echo Connected or paired devices:
"%ADB%" devices
 echo.
echo Your phone must be listed as a device (not unauthorized/offline).
echo On Android 11+ use Android Studio ^> Pair devices using Wi-Fi,
echo then ensure phone and PC are on the same Wi-Fi network.
echo.
choice /m "Install the updated APK onto the connected device"
if errorlevel 2 exit /b 0
"%ADB%" install -r "app\build\outputs\apk\debug\app-debug.apk"
if errorlevel 1 (
  echo.
  echo INSTALL FAILED. If the error is UPDATE_INCOMPATIBLE, the signing key differs.
  echo DO NOT UNINSTALL THE OLD APP: that may erase your saved inspection records.
  echo Use the same Windows user and original debug signing keystore.
  pause
  exit /b 1
)
echo.
echo Updated MoveProof Qatar. Existing on-device app data should remain intact.
pause
