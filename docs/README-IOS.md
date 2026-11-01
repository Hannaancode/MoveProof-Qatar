# MoveProof Qatar — iPhone Safari test version

This folder is the static **iPhone web-app** version of MoveProof Qatar. The Android Java/CameraX source in the repository is unchanged.

## Installation

1. Publish this directory via HTTPS (for this repository, GitHub Pages using `main` -> `/docs`).
2. On an iPhone, open the published URL in **Safari**.
3. Tap **Share** -> **Add to Home Screen**; keep **Open as Web App** selected -> **Add**.
4. Launch MoveProof from its Home Screen icon. Use the Home Screen app for all subsequent testing so inspection data stays in one app storage area.

## Included

- Property management and address fields, move-in/out conditions, notes, custom items, multiple drafts, previous records, comparison and pending move-out checks.
- iOS camera photo capture via `input[type=file]` with `accept=image/*; capture=environment`, plus gallery photo selection. Photos are downsampled into local browser storage and can be enlarged/zoomed.
- Video recording through the iPhone camera using a native iOS file-picker/capture input; no Android camera bridge. Also supports selecting an existing video.
- Video blobs saved to IndexedDB under stable `pwa-video:` IDs, linked from inspections and drafts. Videos play inside the app and can be **shared or saved as a separate copy** through the iOS share sheet.
- Service-worker caching for offline reopening after a first successful online visit.

## Prototype limitations

- **No cloud backup**. Photos and records are in browser storage; videos are stored in the browser's IndexedDB. iOS can purge website data, and uninstalling the Home Screen app or clearing site data may erase evidence. Use fictional test details, not sensitive or irreplaceable property evidence.
- The website is publicly reachable when GitHub Pages is enabled, although individual records/videos are not uploaded to the repository. No user accounts or server-side synchronization.
- Videos do **not** automatically save to Photos: open video playback, then choose **Share / Save copy**; select **Save Video** in iOS if offered, or save to Files.
- Video files must be <=150 MB per clip for this early test; storage availability varies by device.
- This is not an App Store/TestFlight IPA and does not provide native iOS background recording.
- The Android native APK and the iPhone PWA have separate storage, even when used on the same device.
- Real iPhone camera, video recording, Share Sheet and installed-PWA behavior must be verified by testers. Automated source checks and non-iOS browser tests do not prove those device-specific behaviors.

## Offline development

Serve the contents from a local web server such as `python -m http.server 8000 --directory docs` then open `http://localhost:8000` on the development machine. A real iPhone test site must use HTTPS.

## Deploy on GitHub Pages (one-time repository owner action)

1. GitHub -> `Hannaancode/MoveProof-Qatar` -> Settings -> Pages.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Choose branch **main** and folder **/docs**, click **Save**.
4. Once GitHub reports deployment success, open the confirmed Pages URL (expected `https://hannaanCode.github.io/MoveProof-Qatar/`) in Safari and install it.

The owner must perform Pages activation because the connected GitHub integration does not have repository administration access.
