#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
: "${ANDROID_HOME:=${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}}"
export ANDROID_HOME
if command -v gradle >/dev/null; then
  gradle :app:assembleDebug --no-daemon
else
  mkdir -p .build-tools
  if [ ! -x .build-tools/gradle-8.13/bin/gradle ]; then
    curl -L --fail -o .build-tools/gradle.zip https://services.gradle.org/distributions/gradle-8.13-bin.zip
    unzip -q .build-tools/gradle.zip -d .build-tools
    rm .build-tools/gradle.zip
  fi
  .build-tools/gradle-8.13/bin/gradle :app:assembleDebug --no-daemon
fi
printf 'APK: app/build/outputs/apk/debug/app-debug.apk\n'
