# MoveProof Qatar — Android test build (five-screen prototype)

This is an **Android Studio project**, not yet a built APK. It embeds the five-screen HTML/CSS/JS interface and supports native Android camera and gallery permission handling. It does not need a server or a Play Console account for testing.

## How to build an APK on Windows (free)

1. Install **Android Studio** (free) from https://developer.android.com/studio, including Android SDK **API 36** and SDK Build Tools.
2. Install/choose **JDK 17** (Gradle 8.13 will not run on Java 25; set `JAVA_HOME` to JDK 17).
3. Extract this ZIP and run `BUILD_ON_WINDOWS.bat` in the project root. It downloads Gradle 8.13 the first time, resolves the Android Gradle plugin and AndroidX dependencies, and builds a debug APK. Requires internet for the initial build and Google Maven access.
4. The installable file appears at `app/build/outputs/apk/debug/app-debug.apk`.
5. Connect your Android phone via USB, enable **Developer options → USB debugging**, then install from Android Studio's Run button. Or copy the APK to your phone and allow installation from that source.
6. Alternatively, open this folder in Android Studio (choose the folder containing `settings.gradle`) and use **Build → Build APK(s)**. If Android Studio requests a Gradle installation, use the provided build script.

## Version 0.3 — changes based on phone testing

- Fixed saved-photo thumbnail cropping (`object-fit: contain` instead of `cover`). Tap a saved photo to see the complete image in a fullscreen viewer with **pinch-to-zoom, pan, +/- and Fit**. Photo preview in the condition editor also opens the viewer.
- Added a **written condition description** next to Good / Damaged / Unsure. The description persists in the inspection and is visible alongside Notes in saved records, including for items without photographs.
- Added an **Add apartment / villa** control on the main screen. It stores a user-supplied property name/type and **Building/Villa no., Street no., Zone no.**, and optional Unit no. Your saved properties appear in the property picker and history filter.
- Removed the fictional March/August 2025 test records from fresh installs, and migrated them out of previously saved local history without deleting actual user inspections. Where a real condition exists but no photo was taken, history explicitly says "No photo attached" and does not display a fake image.
- Comparison is shown only if the chosen property and item have genuine saved move-in and move-out records. Items without records say "No record available."
- Kept the old `localStorage` key and Android `applicationId` so existing test records can survive a normal in-place update. `versionCode=3`, `versionName=0.3.0`.

### Important: do not uninstall the old test app

To update the installed app, rebuild **on the same Windows account/PC** that signed your first `app-debug.apk`. Then install the new APK on top of the existing app. It must use the same signing key; do not uninstall the app if you need to preserve local inspection records. Prototype records are only in WebView localStorage, not cloud storage. Make a backup when export/backup support is added in a later release.

### Fast in-place updates using Android Studio Wi-Fi debugging (Android 11+)

1. Enable Developer options on the phone (Settings → About phone → tap Build number seven times; exact path can vary by maker).
2. In Developer options enable **Wireless debugging** while phone and PC use the same Wi-Fi network.
3. Open the project in Android Studio, use **Pair Devices Using Wi-Fi**, and pair using the QR code or the pairing code shown on the phone.
4. After downloading a new Quick Update ZIP from this chat, run **`APPLY_UPDATE_AND_BUILD.bat`**. If your phone has been paired and is listed by ADB, choose **Y** when prompted to install the new APK directly over Wi-Fi. Or run **`REBUILD_AND_UPDATE_PHONE.bat`** whenever you have edited the project locally; it rebuilds and uses `adb install -r` **without manual APK transfer**.
5. You can also select the paired phone in Android Studio and press **Run** to deploy the current source build.

The helper cannot wirelessly install until the device is correctly paired, authorized, and visible to ADB. Android 10 or older requires first establishing ADB debugging via USB. A build produced on another computer may have a different debug signing key; it cannot overwrite the installed app without a matching certificate.

`ChatGPT → phone` automatic updates are **not enabled** in this offline project. A future Firebase App Distribution or Google Play internal-testing setup can notify testers of builds, but still requires building/uploading them and may require the user's confirmation to install. No silent background installs are possible with this setup.

## Test plan on your own Android phone

- Launch with airplane mode on; verify dashboard, selection, and records render offline.
- From the dashboard, add a Villa/Apartment with Zone, Street and Building/Villa number; select it and verify that it persists after relaunch.
- Choose **New inspection → Move-in → Bedroom → Wardrobe**; select **Damaged**, type a condition description, then **Take photo**.
- Approve the Android Camera permission; verify live video, shutter capture, preview, and Save item.
- Try Gallery; select a photo and verify it appears in condition recording.
- Deny Camera permission, retry, and then choose Continue without photo; verify that the missing-photo warning appears on Review.
- Acknowledge missing photo. Confirm that Finish inspection becomes available only after all selected items have conditions and no unresolved warnings remain.
- Save a draft; close/relaunch app; verify the draft and typed condition description are still available.
- Finish an inspection, open Previous Records, tap its photo, confirm the whole image is shown, pinch-zoom/pan it, then close it.
- Before making any inspections, open Previous Records and verify it shows **No record available**, not a 2025 date or photo placeholder. On an upgraded install, confirm old fictional 2025 entries are gone but your actual inspections remain.
- Finish a move-in inspection, then a move-out inspection for the same property/item; verify Previous Records comparison; switch to an item with no history and check empty state.

## Design and privacy notes

- The native code grants only WebView **video** access for the app's bundled secure origin. It never requests microphone access.
- The WebView loads bundled content via `WebViewAssetLoader` using the recommended local HTTPS origin. Remote navigation and subresource requests are blocked. `INTERNET` permission is not declared.
- A standard Android system file picker is used for Gallery. No broad photo/media storage permission is requested.
- Saved data and compressed photos use WebView localStorage; this is suitable for a **coursework prototype**, not durable evidence storage. Uninstalling or clearing app data deletes the records. No login, cloud backup, server or export exists.
- There are no preloaded inspection records; sample property names (Al Sadd and West Bay) are still placeholders and UI design choices remain provisional.
- Package id `qa.moveproof.inspection` is a *temporary test identifier*. It is not a verified registered brand/domain or an approved final app ID.
- API 36 target for Google Play's 2026 requirement; minimum Android 8.0 (API 26).
- Debug builds are signed with Android debug keys and **cannot be uploaded to Google Play as release builds**. Real Play submission requires release signing plus Play Console testing/compliance.

## Verification performed here

Version 0.3 was updated and source-level tests were run in an environment without Android SDK/Gradle, so **version 0.3 native compilation and physical-camera testing have not been performed**. The user previously reported that the original version successfully built on Windows with Java 17 and Gradle 8.13. The web app's behavior can be exercised in a Chromium-based browser, and static source/configuration checks are included in `tests`.
