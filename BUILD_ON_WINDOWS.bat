@echo off
setlocal
cd /d "%~dp0"
if not defined JAVA_HOME if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"
if not defined ANDROID_HOME if exist "%LOCALAPPDATA%\Android\Sdk" set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"
if not defined ANDROID_SDK_ROOT if defined ANDROID_HOME set "ANDROID_SDK_ROOT=%ANDROID_HOME%"
if not defined ANDROID_HOME (
 echo Android SDK not found. Install Android Studio with Android 16 SDK API 36.
 pause
 exit /b 1
)
if not exist ".build-tools\gradle-8.13\bin\gradle.bat" (
 echo Downloading Gradle 8.13 from services.gradle.org ...
 powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; New-Item -ItemType Directory -Force '.build-tools' | Out-Null; Invoke-WebRequest 'https://services.gradle.org/distributions/gradle-8.13-bin.zip' -OutFile '.build-tools\gradle.zip'; Expand-Archive '.build-tools\gradle.zip' '.build-tools' -Force; Remove-Item '.build-tools\gradle.zip'"
 if errorlevel 1 (
  echo Gradle download failed. Check network access.
  pause
  exit /b 1
 )
)
call ".build-tools\gradle-8.13\bin\gradle.bat" :app:assembleDebug --no-daemon
if errorlevel 1 (
 echo Build failed. Open project in Android Studio to see build errors.
 pause
 exit /b 1
)
echo.
echo Debug APK: app\build\outputs\apk\debug\app-debug.apk
pause
