package qa.moveproof.inspection;

import android.Manifest;
import android.app.Activity;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.ContentResolver;
import android.content.ActivityNotFoundException;
import android.database.Cursor;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.provider.MediaStore;
import android.provider.OpenableColumns;
import android.webkit.JavascriptInterface;
import org.json.JSONObject;
import java.io.InputStream;
import java.io.OutputStream;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;

import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

/** Local, offline-only Android shell for the MoveProof five-screen coursework prototype. */
public class MainActivity extends Activity {
    private static final String START_URL = "https://appassets.androidplatform.net/assets/index.html";
    private static final String ORIGIN = "https://appassets.androidplatform.net";
    private static final int REQUEST_CAMERA = 101;
    private static final int REQUEST_GALLERY = 102;
    private static final int REQUEST_VIDEO = 103;
    private static final int REQUEST_VIDEO_CAMERA_PERMISSION = 104;
    private Uri pendingVideoUri;
    private String videoDraftId;
    private String videoItemKey;
    private boolean videoCaptureActive = false;
    private WebView webView;
    private PermissionRequest pendingCameraRequest;
    private ValueCallback<Uri[]> pendingFileResult;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(250, 247, 246));
        getWindow().setNavigationBarColor(Color.rgb(250, 247, 246));
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(Color.rgb(250, 247, 246));
        webView = new WebView(this);
        root.addView(webView, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        if (Build.VERSION.SDK_INT >= 35) {
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                v.setPadding(safe.left, safe.top, safe.right, safe.bottom);
                return insets;
            });
        }
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        webView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        // The video bridge is only exposed to the bundled, offline app assets.
        // Never load remote HTML or add third-party iframes to this privileged WebView.
        webView.addJavascriptInterface(new VideoBridge(), "MoveProofVideo");

        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
            .build();
        webView.setWebViewClient(new WebViewClientCompat() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                // Bundled assets only; never fetch remote documents into this privileged WebView.
                if (!ORIGIN.equals(request.getUrl().getScheme() + "://" + request.getUrl().getAuthority())) {
                    return new WebResourceResponse("text/plain", "UTF-8", new java.io.ByteArrayInputStream(new byte[0]));
                }
                WebResourceResponse r = loader.shouldInterceptRequest(request.getUrl());
                return r != null ? r : new WebResourceResponse("text/plain", "UTF-8", new java.io.ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                return !req.getUrl().toString().startsWith(ORIGIN + "/assets/");
            }
        });
        webView.setWebChromeClient(new WebChromeClient() {
            @Override public void onPermissionRequest(PermissionRequest req) {
                runOnUiThread(() -> handleWebCameraPermission(req));
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest req) {
                runOnUiThread(() -> {
                    if (pendingCameraRequest == req) pendingCameraRequest = null;
                });
            }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> filePathCallback, FileChooserParams params) {
                if (pendingFileResult != null) pendingFileResult.onReceiveValue(null);
                pendingFileResult = filePathCallback;
                try {
                    Intent intent = params.createIntent();
                    intent.addCategory(Intent.CATEGORY_OPENABLE);
                    startActivityForResult(intent, REQUEST_GALLERY);
                } catch (Exception ex) {
                    if (pendingFileResult != null) pendingFileResult.onReceiveValue(null);
                    pendingFileResult = null;
                }
                return true;
            }
        });
        webView.loadUrl(START_URL);
    }

    private final class VideoBridge {
        @JavascriptInterface public void recordVideo(String draftId, String itemKey) {
            runOnUiThread(() -> beginVideoCapture(draftId, itemKey));
        }
        @JavascriptInterface public void openVideo(String uriString) {
            runOnUiThread(() -> openSavedVideo(uriString));
        }
    }

    private void videoNotice(String message) {
        String js = "if(window.moveProofVideoError)window.moveProofVideoError(" + JSONObject.quote(message) + ")";
        if (webView != null) webView.evaluateJavascript(js, null);
    }

    private void beginVideoCapture(String draftId, String itemKey) {
        if (videoCaptureActive || videoDraftId != null) { videoNotice("A recording is already being opened."); return; }
        if (draftId == null || draftId.length() > 200 || itemKey == null || itemKey.length() > 200 || !itemKey.contains("::")) {
            videoNotice("Invalid inspection item."); return;
        }
        videoDraftId = draftId;
        videoItemKey = itemKey;
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.CAMERA}, REQUEST_VIDEO_CAMERA_PERMISSION);
            return;
        }
        launchVideoCamera();
    }

    private void launchVideoCamera() {
        // On Android 10+ the output is created in shared Movies/MoveProof Qatar.
        // The phone's camera writes there, and the Gallery can later delete the video.
        Uri output = null;
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentValues values = new ContentValues();
                values.put(MediaStore.Video.Media.DISPLAY_NAME, "MoveProof_" + System.currentTimeMillis() + ".mp4");
                values.put(MediaStore.Video.Media.MIME_TYPE, "video/mp4");
                values.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/MoveProof Qatar");
                values.put(MediaStore.Video.Media.IS_PENDING, 1);
                output = getContentResolver().insert(MediaStore.Video.Media.EXTERNAL_CONTENT_URI, values);
                if (output == null) throw new IllegalStateException("Could not reserve Gallery video file");
            }
            Intent intent = new Intent(MediaStore.ACTION_VIDEO_CAPTURE);
            intent.putExtra(MediaStore.EXTRA_DURATION_LIMIT, 30);
            intent.putExtra(MediaStore.EXTRA_VIDEO_QUALITY, 1);
            if (output != null) {
                intent.putExtra(MediaStore.EXTRA_OUTPUT, output);
                intent.setClipData(ClipData.newUri(getContentResolver(), "MoveProof video", output));
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            }
            pendingVideoUri = output;
            videoCaptureActive = true;
            startActivityForResult(intent, REQUEST_VIDEO);
        } catch (Exception e) {
            if (output != null) removeVideoOutput(output);
            clearVideoCapture();
            videoNotice("The video camera could not open. Check camera permission and try again.");
        }
    }

    private void removeVideoOutput(Uri uri) {
        if (uri == null) return;
        try { getContentResolver().delete(uri, null, null); } catch (Exception ignored) {}
    }

    private boolean videoHasBytes(Uri uri) {
        if (uri == null) return false;
        try (ParcelFileDescriptor file = getContentResolver().openFileDescriptor(uri, "r")) {
            if (file != null && file.getStatSize() > 0) return true;
        } catch (Exception ignored) {}
        try (Cursor c = getContentResolver().query(uri, new String[]{OpenableColumns.SIZE}, null, null, null)) {
            if (c != null && c.moveToFirst()) return c.getLong(0) > 0;
        } catch (Exception ignored) {}
        return false;
    }

    private void copyVideo(Uri source, Uri destination) throws java.io.IOException {
        try (InputStream input = getContentResolver().openInputStream(source);
             OutputStream output = getContentResolver().openOutputStream(destination, "w")) {
            if (input == null || output == null) throw new java.io.IOException("Unable to copy recorded video");
            byte[] buffer = new byte[32768];
            int read;
            while ((read = input.read(buffer)) != -1) output.write(buffer, 0, read);
            output.flush();
        }
    }

    private void finishVideoCapture(int resultCode, Intent result) {
        Uri destination = pendingVideoUri;
        String draftId = videoDraftId, itemKey = videoItemKey;
        Uri returned = result == null ? null : result.getData();
        Uri saved = null;
        try {
            if (resultCode == RESULT_OK) {
                if (destination != null) {
                    if (!videoHasBytes(destination) && returned != null && !returned.equals(destination)) {
                        // Some camera apps disregard EXTRA_OUTPUT; recover into our Gallery file.
                        copyVideo(returned, destination);
                    }
                    if (!videoHasBytes(destination)) throw new java.io.IOException("Camera returned an empty video");
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        ContentValues done = new ContentValues();
                        done.put(MediaStore.Video.Media.IS_PENDING, 0);
                        getContentResolver().update(destination, done, null, null);
                    }
                    saved = destination;
                } else if (returned != null && videoHasBytes(returned)) {
                    // Android 8-9: the system camera stores to its own Gallery location.
                    saved = returned;
                }
            }
        } catch (Exception ignored) {
            saved = null;
        }
        if (saved == null) {
            removeVideoOutput(destination);
            if (resultCode == RESULT_OK) videoNotice("Video was not saved. Please try again.");
            else videoNotice("Video recording canceled. Nothing was added to the inspection.");
        } else if (draftId != null && itemKey != null && webView != null) {
            String js = "if(window.moveProofVideoSaved)window.moveProofVideoSaved(" + JSONObject.quote(draftId) + "," + JSONObject.quote(itemKey) + "," + JSONObject.quote(saved.toString()) + ")";
            webView.evaluateJavascript(js, null);
        }
        clearVideoCapture();
    }

    private void clearVideoCapture() {
        pendingVideoUri = null;
        videoDraftId = null;
        videoItemKey = null;
        videoCaptureActive = false;
    }

    private void openSavedVideo(String uriString) {
        try {
            Uri uri = Uri.parse(uriString);
            if (!"content".equals(uri.getScheme()) || !"media".equals(uri.getAuthority())) throw new SecurityException("Only shared Gallery videos are supported");
            try (ParcelFileDescriptor file = getContentResolver().openFileDescriptor(uri, "r")) {
                if (file == null) throw new java.io.FileNotFoundException("Video is missing");
            }
            Intent view = new Intent(Intent.ACTION_VIEW);
            view.setDataAndType(uri, "video/*");
            view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            startActivity(view);
        } catch (Exception e) {
            videoNotice("Video unavailable. It may have been deleted from Gallery.");
        }
    }

    private void handleWebCameraPermission(PermissionRequest req) {
        if (!ORIGIN.equals(req.getOrigin().toString().replaceAll("/$", ""))) {
            req.deny(); return;
        }
        // Only allow video; a microphone request is not needed for still-photo capture.
        String[] resources = req.getResources();
        if (resources.length != 1 || !PermissionRequest.RESOURCE_VIDEO_CAPTURE.equals(resources[0])) {
            req.deny(); return;
        }
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) {
            req.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
        } else {
            if (pendingCameraRequest != null) pendingCameraRequest.deny();
            pendingCameraRequest = req;
            requestPermissions(new String[]{Manifest.permission.CAMERA}, REQUEST_CAMERA);
        }
    }

    @Override public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQUEST_VIDEO_CAMERA_PERMISSION) {
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) launchVideoCamera();
            else { clearVideoCapture(); videoNotice("Camera permission is required to record video."); }
            return;
        }
        if (requestCode == REQUEST_CAMERA && pendingCameraRequest != null) {
            PermissionRequest request = pendingCameraRequest;
            pendingCameraRequest = null;
            if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                request.grant(new String[]{PermissionRequest.RESOURCE_VIDEO_CAPTURE});
            } else request.deny();
        }
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent result) {
        super.onActivityResult(requestCode, resultCode, result);
        if (requestCode == REQUEST_VIDEO) {
            finishVideoCapture(resultCode, result);
            return;
        }
        if (requestCode == REQUEST_GALLERY && pendingFileResult != null) {
            Uri[] uris = resultCode == RESULT_OK ? WebChromeClient.FileChooserParams.parseResult(resultCode, result) : null;
            pendingFileResult.onReceiveValue(uris);
            pendingFileResult = null;
        }
    }

    @Override public void onBackPressed() {
        // The five screens are SPA states, so WebView history alone does not navigate them.
        webView.evaluateJavascript("(function(){if(typeof data==='undefined'||typeof nav!=='function')return 'close';if(typeof photoDialog!=='undefined'&&photoDialog.open){closePhoto();return 'handled'};if(typeof dlg!=='undefined'&&dlg.open){stopCamera();return 'handled'};if(data.page==='dashboard')return 'close';if(data.page==='condition'){nav(data.returnReview?'review':'rooms')}else if(data.page==='review'){nav('rooms')}else{nav('dashboard')}return 'handled'})()", answer -> {
            if ("\"close\"".equals(answer)) MainActivity.super.onBackPressed();
        });
    }

    @Override protected void onDestroy() {
        if (pendingCameraRequest != null) { pendingCameraRequest.deny(); pendingCameraRequest = null; }
        if (pendingFileResult != null) { pendingFileResult.onReceiveValue(null); pendingFileResult = null; }
        if (webView != null) {
            webView.evaluateJavascript("if(typeof stopCamera==='function')stopCamera()", null);
            webView.destroy();
        }
        super.onDestroy();
    }
}
