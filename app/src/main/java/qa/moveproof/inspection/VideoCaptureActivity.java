package qa.moveproof.inspection;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;

import androidx.activity.ComponentActivity;
import androidx.camera.core.CameraSelector;
import androidx.camera.core.Preview;
import androidx.camera.lifecycle.ProcessCameraProvider;
import androidx.camera.video.MediaStoreOutputOptions;
import androidx.camera.video.Quality;
import androidx.camera.video.QualitySelector;
import androidx.camera.video.Recorder;
import androidx.camera.video.Recording;
import androidx.camera.video.VideoCapture;
import androidx.camera.video.VideoRecordEvent;
import androidx.camera.view.PreviewView;
import androidx.core.content.ContextCompat;

import com.google.common.util.concurrent.ListenableFuture;

/** First-party video recorder. Does not launch the Samsung camera or another external app.
 *  Records MP4 clips directly to Android's shared Gallery through MediaStore.
 */
public final class VideoCaptureActivity extends ComponentActivity {
    private static final int CAMERA_PERMISSION_REQUEST = 207;
    private static final int BACKGROUND = Color.rgb(18, 22, 29);
    private static final int WINE = Color.rgb(117, 37, 76);

    private PreviewView previewView;
    private TextView status;
    private Button recordButton;
    private Button cancelButton;
    private ProcessCameraProvider cameraProvider;
    private VideoCapture<Recorder> videoCapture;
    private Recording recording;
    private boolean recordingStarted = false;
    private boolean finalizeInProgress = false;
    private boolean discardOnFinalize = false;

    private static int dp(Activity activity, int value) {
        return Math.round(value * activity.getResources().getDisplayMetrics().density);
    }

    private TextView makeLabel(String value, int size, int color) {
        TextView label = new TextView(this);
        label.setText(value);
        label.setTextSize(size);
        label.setTextColor(color);
        label.setGravity(Gravity.CENTER);
        return label;
    }

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(BACKGROUND);
        getWindow().setNavigationBarColor(BACKGROUND);
        getWindow().getDecorView().setSystemUiVisibility(0);

        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(BACKGROUND);
        if (Build.VERSION.SDK_INT >= 35) {
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                android.graphics.Insets safe = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(safe.left, safe.top, safe.right, safe.bottom);
                return insets;
            });
        }
        previewView = new PreviewView(this);
        previewView.setScaleType(PreviewView.ScaleType.FILL_CENTER);
        root.addView(previewView, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        LinearLayout controls = new LinearLayout(this);
        controls.setOrientation(LinearLayout.VERTICAL);
        controls.setPadding(dp(this, 18), dp(this, 22), dp(this, 18), dp(this, 25));
        controls.setBackgroundColor(Color.argb(105, 14, 15, 23));
        FrameLayout.LayoutParams controlsParams = new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.BOTTOM);
        root.addView(controls, controlsParams);

        TextView title = makeLabel("MOVEPROOF · VIDEO", 12, Color.WHITE);
        title.setLetterSpacing(0f);
        controls.addView(title, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(this, 22)));

        status = makeLabel("Preparing camera…", 13, Color.WHITE);
        LinearLayout.LayoutParams statusParams = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(this, 52));
        controls.addView(status, statusParams);

        LinearLayout actions = new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        controls.addView(actions, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, dp(this, 54)));

        cancelButton = new Button(this);
        cancelButton.setText("Cancel");
        cancelButton.setAllCaps(false);
        cancelButton.setOnClickListener(view -> requestCancel());
        actions.addView(cancelButton, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1f));

        recordButton = new Button(this);
        recordButton.setText("Start recording");
        recordButton.setAllCaps(false);
        recordButton.setBackgroundTintList(android.content.res.ColorStateList.valueOf(WINE));
        recordButton.setTextColor(Color.WHITE);
        recordButton.setEnabled(false);
        recordButton.setOnClickListener(view -> {
            if (recording != null) stopAndSave();
            else startRecording();
        });
        LinearLayout.LayoutParams recordParams = new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.MATCH_PARENT, 1.65f);
        recordParams.leftMargin = dp(this, 10);
        actions.addView(recordButton, recordParams);

        setContentView(root);
        if (checkSelfPermission(Manifest.permission.CAMERA) == PackageManager.PERMISSION_GRANTED) openCamera();
        else requestPermissions(new String[]{Manifest.permission.CAMERA}, CAMERA_PERMISSION_REQUEST);
    }

    private void openCamera() {
        ListenableFuture<ProcessCameraProvider> providerFuture = ProcessCameraProvider.getInstance(this);
        providerFuture.addListener(() -> {
            try {
                if (isFinishing() || isDestroyed()) return;
                cameraProvider = providerFuture.get();
                Preview preview = new Preview.Builder().build();
                preview.setSurfaceProvider(previewView.getSurfaceProvider());
                Recorder recorder = new Recorder.Builder()
                    .setQualitySelector(QualitySelector.from(Quality.HD))
                    .build();
                videoCapture = VideoCapture.withOutput(recorder);
                cameraProvider.unbindAll();
                cameraProvider.bindToLifecycle(this, CameraSelector.DEFAULT_BACK_CAMERA, preview, videoCapture);
                status.setText("Record up to 30 seconds · saved to Gallery");
                recordButton.setEnabled(true);
                // Long-pressing the photo shutter starts recording immediately.
                if (getIntent().getBooleanExtra("autoStartRecording", false)) startRecording();
            } catch (Exception ex) {
                showError("Could not start this phone's camera. Please check Camera permission.");
            }
        }, ContextCompat.getMainExecutor(this));
    }

    private void startRecording() {
        if (videoCapture == null || recording != null || finalizeInProgress) return;
        try {
            ContentValues values = new ContentValues();
            values.put(MediaStore.Video.Media.DISPLAY_NAME, "MoveProof_" + System.currentTimeMillis() + ".mp4");
            values.put(MediaStore.Video.Media.MIME_TYPE, "video/mp4");
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                values.put(MediaStore.Video.Media.RELATIVE_PATH, Environment.DIRECTORY_MOVIES + "/MoveProof Qatar");
            }
            MediaStoreOutputOptions output = new MediaStoreOutputOptions.Builder(
                getContentResolver(), MediaStore.Video.Media.EXTERNAL_CONTENT_URI)
                .setContentValues(values)
                .setDurationLimitMillis(30_000)
                .build();
            discardOnFinalize = false;
            finalizeInProgress = true;
            recordButton.setEnabled(false);
            status.setText("Starting recording…");
            recording = videoCapture.getOutput().prepareRecording(this, output)
                .start(ContextCompat.getMainExecutor(this), event -> {
                    if (event instanceof VideoRecordEvent.Start) {
                        recordingStarted = true;
                        finalizeInProgress = false;
                        status.setText("● Recording · tap Stop & save when finished");
                        recordButton.setText("Stop & save");
                        recordButton.setEnabled(true);
                    } else if (event instanceof VideoRecordEvent.Finalize) {
                        VideoRecordEvent.Finalize end = (VideoRecordEvent.Finalize) event;
                        recording = null;
                        recordingStarted = false;
                        finalizeInProgress = false;
                        Uri uri = end.getOutputResults().getOutputUri();
                        if (discardOnFinalize) {
                            if (uri != null && !Uri.EMPTY.equals(uri)) {
                                try { getContentResolver().delete(uri, null, null); } catch (Exception ignored) {}
                            }
                            finishCanceled();
                        } else if (!end.hasError() && uri != null && !Uri.EMPTY.equals(uri)) {
                            Intent result = new Intent();
                            result.setData(uri);
                            result.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            setResult(RESULT_OK, result);
                            finish();
                        } else {
                            recordButton.setEnabled(true);
                            recordButton.setText("Try again");
                            showError("Video was not saved. Try again or return to the inspection.");
                        }
                    }
                });
        } catch (Exception ex) {
            recording = null;
            finalizeInProgress = false;
            recordButton.setEnabled(true);
            status.setText("Could not start recording. Please retry.");
        }
    }

    private void stopAndSave() {
        if (recording == null || finalizeInProgress) return;
        finalizeInProgress = true;
        status.setText("Saving video to Gallery…");
        recordButton.setEnabled(false);
        cancelButton.setEnabled(false);
        recording.stop();
    }

    private void requestCancel() {
        if (finalizeInProgress && recording != null) return;
        if (recording == null) { finishCanceled(); return; }
        new AlertDialog.Builder(this)
            .setTitle("Discard this recording?")
            .setMessage("This video will not be saved to Gallery or linked to the inspection.")
            .setNegativeButton("Continue recording", null)
            .setPositiveButton("Discard", (dialog, which) -> {
                discardOnFinalize = true;
                finalizeInProgress = true;
                recordButton.setEnabled(false);
                cancelButton.setEnabled(false);
                recording.stop();
            }).show();
    }

    private void finishCanceled() {
        setResult(RESULT_CANCELED);
        finish();
    }

    private void showError(String message) {
        status.setText(message);
        android.widget.Toast.makeText(this, message, android.widget.Toast.LENGTH_LONG).show();
    }

    @Override public void onBackPressed() { requestCancel(); }

    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code == CAMERA_PERMISSION_REQUEST) {
            if (results.length > 0 && results[0] == PackageManager.PERMISSION_GRANTED) openCamera();
            else { showError("Camera permission is required to record video."); finishCanceled(); }
        }
    }

    @Override protected void onDestroy() {
        if (recording != null && !finalizeInProgress) {
            discardOnFinalize = true;
            recording.stop();
        }
        super.onDestroy();
    }
}
