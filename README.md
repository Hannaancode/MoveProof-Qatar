# MoveProof Qatar — Android inspection prototype

This is an **Android Studio project**, not yet a built APK. It embeds the five-screen HTML/CSS/JS interface and supports native Android camera and gallery permission handling. It does not need a server or a Play Console account for testing.

## How to build an APK on Windows (free)

1. Install **Android Studio** (free) from https://developer.android.com/studio, including Android SDK **API 36** and SDK Build Tools.
2. Install/choose **JDK 17** (Gradle 8.13 will not run on Java 25; set `JAVA_HOME` to JDK 17).
3. Extract this ZIP and run `BUILD_ON_WINDOWS.bat` in the project root. It downloads Gradle 8.13 the first time, resolves the Android Gradle plugin and AndroidX dependencies, and builds a debug APK. Requires internet for the initial build and Google Maven access.
4. The installable file appears at `app/build/outputs/apk/debug/app-debug.apk`.
5. Connect your Android phone via USB, enable **Developer options → USB debugging**, then install from Android Studio's Run button. Or copy the APK to your phone and allow installation from that source.
6. Alternatively, open this folder in Android Studio (choose the folder containing `settings.gradle`) and use **Build → Build APK(s)**. If Android Studio requests a Gradle installation, use the provided build script.

## Version 0.5 — show only recorded history (November 2026)

- **Previous records → Properties:** Only apartments or villas with at least one completed inspection containing a recorded condition appear. A newly added property or a property with only drafts stays off this page. When no saved inspections exist, show **No saved inspections yet** rather than empty property cards or zero-count placeholders.
- **Previous records → Rooms & items:** Keep the existing expandable/dropdown room cards but list **only rooms with recorded items**, and **only the items actually captured in completed inspections**. Hide unused rooms, predefined items with no history, and empty/invalid legacy selections. Custom recorded rooms and items remain accessible. Item record counts still reflect all saved inspections containing that item.
- **Record details:** Move-in / move-out history, comparisons, written condition, and full-size photo/zoom still work. Direct navigation to an item without saved conditions shows **No record available**.
- Stored inspections, properties, drafts, and photos are not deleted by this filter. The application's ID and local storage key are unchanged so the app can be installed over v0.4 on the same device/signing key.
- Bumped Android `versionCode` to 5 and `versionName` to `0.5.0`. Added focused regression tests for hidden empty properties, rooms, unrecorded items, custom records, and empty-state navigation.

**Install on paired Samsung:** Run `git pull origin main` in Android Studio, then `cmd /c REBUILD_AND_UPDATE_PHONE.bat` in the Terminal. Select **Y** to install over the existing app. Do not uninstall if you need to preserve locally saved evidence. Native compilation and on-device verification remain necessary.

## Version 0.4 — dashboard, drafts and history navigation (November 2026)

- Simplified dashboard: removed the 'PROPERTY CONDITION LOG' header subtitle and the redundant 'Protect the details that matter' headline. Made **Your inspection workspace** the primary heading, expanded its explanation, and added **Learn more** with a short offline usage guide.
- Replaced single-draft persistence with a **collection of drafts**. Starting a new inspection preserves prior drafts. **Saved drafts** lists every unfinished inspection with separate **Continue** and **Delete** actions. Older versions' single `draft` field is migrated into the `drafts` collection without discarding the notes/photos inside it.
- **Previous records** is now a clear three-step path: **Property → Room/Item → Saved history**. Property names appear first, rooms expand to reveal items, and each item opens its records. Blank items say **No record available**. All genuine historical move-in and move-out records are listed (not just the most recent of each type).
- Preserved fullscreen saved-photo viewing, zoom controls, written condition descriptions, photo acknowledgement, custom items, property address details and the exclusion of fictional 2025 records.
- Kept the Android application ID `qa.moveproof.inspection` and WebView storage key `moveproof-qatar-prototype-v1` for in-place updates; bumped `versionCode` to 4 / `versionName` to `0.4.0`.

**Caution:** Prototype evidence is still stored only in WebView localStorage. More drafts and photos can hit its per-origin storage limit. Do not uninstall or clear app data if you need to keep records; a backed-up/exportable evidence store is a future improvement.

To deploy source changes from GitHub in Android Studio: `git pull origin main`, then run `REBUILD_AND_UPDATE_PHONE.bat` in the project root with your Android phone paired via Wi-Fi debugging. The helper builds and offers to install over the existing app. The APK must be signed with the same debug key as the installed version, otherwise Android will reject the in-place update; do not uninstall just to make it work if preserving data matters.

Source-level tests: run `node run_source_tests.js` from the project root (Node.js required). Native compilation and phone-camera behavior still need verification on Windows/Android hardware.

## Version 0.3 — earlier phone-testing fixes

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
- Before making any inspections, open Previous Records and verify it shows **No saved inspections yet**, not zero-count properties or fictional 2025 records. On an upgraded install, confirm old fictional 2025 entries are gone but your actual inspections remain.
- Finish a move-in inspection for one item and verify that only its property, room and item appear in Previous Records. Make an empty property and verify it is hidden. Then complete a move-out inspection for the same property/item and verify comparison; verify unrecorded items remain hidden from the room list.

## Design and privacy notes

- The native code grants only WebView **video** access for the app's bundled secure origin. It never requests microphone access.
- The WebView loads bundled content via `WebViewAssetLoader` using the recommended local HTTPS origin. Remote navigation and subresource requests are blocked. `INTERNET` permission is not declared.
- A standard Android system file picker is used for Gallery. No broad photo/media storage permission is requested.
- Saved data and compressed photos use WebView localStorage; this is suitable for a **coursework prototype**, not durable evidence storage. Uninstalling or clearing app data deletes the records. No login, cloud backup, server or export exists.
- There are no preloaded inspection records; sample property names (Al Sadd and West Bay) are still placeholders and UI design choices remain provisional.
- Package id `qa.moveproof.inspection` is a *temporary test identifier*. It is not a verified registered brand/domain or an approved final app ID.
- API 36 target for Google Play's 2026 requirement; minimum Android 8.0 (API 26).
- Debug builds are signed with Android debug keys and **cannot be uploaded to Google Play as release builds**. Real Play submission requires release signing plus Play Console testing/compliance.

## Verification performed

Version 0.4 passed 32 source-level tests and 8 browser interaction checks (dashboard, guide, property creation, inspection completion, three-step history, empty state, multiple drafts, persistence, JavaScript errors). The Android SDK and Gradle are not available in this build environment, so **the version 0.4 native APK has not been compiled or tested on physical Android hardware**. Build and verify on the Windows PC with Android Studio and the paired phone.
