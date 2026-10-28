package com.sindarealest.admin;

import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.pm.PackageManager;
import android.Manifest;
import android.content.SharedPreferences;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import java.util.UUID;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.SslErrorHandler;
import android.net.http.SslError;
import android.webkit.URLUtil;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import android.view.Gravity;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.view.ViewGroup;
import android.graphics.Color;
import android.util.Base64;
import android.database.Cursor;
import androidx.core.content.FileProvider;
import androidx.webkit.JavaScriptReplyProxy;
import androidx.webkit.WebMessageCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.Collections;
import java.util.Locale;

public final class MainActivity extends Activity {
    private static final String ADMIN_URL = "https://sindarealest2.pages.dev/admin/";
    private static final String ALLOWED_HOST = "sindarealest2.pages.dev";
    private static final int FILE_REQUEST = 201;
    private static final int NOTIFY_PERMISSION_REQUEST = 231;
    private static final String NATIVE_PREFS = "sd_android_owner";
    private static final String FCM_CHANNEL = "sindarealest_owner_events";
    private boolean firebaseReady = false;
    private String fcmToken = "";
    private String deviceId = "";
    private boolean webReady = false;
    private long lastEnrollmentAttempt = 0;
    private boolean foreground = false;
    private final Runnable registrationHeartbeat = new Runnable() {
        @Override public void run() {
            if (!foreground || isFinishing() || isDestroyed()) return;
            registerAndroidSession();
            main.postDelayed(this, 30000);
        }
    };
    private static final int MAX_EXPORT_BASE64_CHARS = 25 * 1024 * 1024;
    private static final String BLOB_EXPORT_HOOK = "(function(){\n  if (window.__sdAdminExportHookInstalled || !window.SDAdminExport) return;\n  window.__sdAdminExportHookInstalled = true;\n  async function transmit(link){\n    try {\n      const response = await fetch(link.href);\n      if (!response.ok) throw new Error('Download failed');\n      const blob = await response.blob();\n      if (blob.size > 18 * 1024 * 1024) { alert('Tệp xuất quá lớn. Hãy mở Admin trong Chrome để tải.'); return; }\n      const reader = new FileReader();\n      reader.onload = function(){\n        const b64 = String(reader.result || '').split(',')[1] || '';\n        window.SDAdminExport.postMessage(JSON.stringify({\n          name: link.download || 'sindarealest-export',\n          mime: blob.type || 'application/octet-stream',\n          base64: b64\n        }));\n      };\n      reader.readAsDataURL(blob);\n    } catch(err) { alert('Không thể lưu tệp trong ứng dụng. Hãy mở Admin bằng Chrome để tải.'); }\n  }\n  // Keep non-download links and upload object URLs unchanged.\n  document.addEventListener('click', function(e){\n    const a = e.target && e.target.closest ? e.target.closest('a[download]') : null;\n    if (!a || !String(a.href).startsWith('blob:')) return;\n    e.preventDefault();\n    transmit(a);\n  }, true);\n})();";
    private WebView web;
    private FrameLayout root;
    private View offlineView;
    private ValueCallback<Uri[]> pendingFiles;
    private Uri capturedPhoto;
    private boolean loadFailed;
    private final Handler main = new Handler(Looper.getMainLooper());

    private static boolean trusted(Uri uri) {
        return uri != null && "https".equalsIgnoreCase(uri.getScheme())
                && ALLOWED_HOST.equalsIgnoreCase(uri.getHost())
                && (uri.getPort() == -1 || uri.getPort() == 443);
    }

    private static boolean externalScheme(Uri uri) {
        if (uri == null) return false;
        String s = uri.getScheme();
        return "https".equalsIgnoreCase(s) || "mailto".equalsIgnoreCase(s)
                || "tel".equalsIgnoreCase(s) || "sms".equalsIgnoreCase(s);
    }

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
        initAndroidNotifications();
        root = new FrameLayout(this);
        web = new WebView(this);
        root.addView(web, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        WebView.setWebContentsDebuggingEnabled(false);
        WebSettings settings = web.getSettings();
        // Client-side marker only: server auth is validated separately.
        // Prevent the 10-minute browser inactivity timer within the APK.
        settings.setUserAgentString(settings.getUserAgentString() + " SinDarealestAdminAndroid/2");
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSafeBrowsingEnabled(true);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setBuiltInZoomControls(true);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(true);
        settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSaveFormData(false);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                if (trusted(u)) return false;
                openExternal(u);
                return true;
            }
            @Override public void onPageStarted(WebView view, String url, Bitmap favicon) {
                if (!trusted(Uri.parse(url))) {
                    view.stopLoading();
                    openExternal(Uri.parse(url));
                    return;
                }
                loadFailed = false;
                hideOffline();
            }
            @Override public void onPageFinished(WebView view, String url) {
                if (trusted(Uri.parse(url)) && !loadFailed) {
                    hideOffline();
                    webReady = true;
                    registerAndroidSession();
                    if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER))
                        view.evaluateJavascript(BLOB_EXPORT_HOOK, null);
                }
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    loadFailed = true;
                    showOffline("Không tải được trang quản trị. Kiểm tra Internet rồi thử lại.");
                }
            }
            @Override public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                handler.cancel(); // Never bypass invalid certificates or redirects.
                loadFailed = true;
                showOffline("Kết nối không an toàn. Ứng dụng đã chặn trang này.");
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> fileCallback,
                    FileChooserParams chooserParams) {
                cancelPendingFile();
                pendingFiles = fileCallback;
                try {
                    Intent select = chooserParams.createIntent();
                    select.addCategory(Intent.CATEGORY_OPENABLE);
                    Intent camera = null;
                    String[] accepts = chooserParams.getAcceptTypes();
                    boolean imageAccepted = accepts.length == 0;
                    for (String type : accepts) if (type == null || type.isEmpty() || type.startsWith("image/")
                            || "*/*".equals(type)) imageAccepted = true;
                    if (imageAccepted) {
                        File folder = new File(getCacheDir(), "camera");
                        if (!folder.exists() && !folder.mkdirs()) throw new IllegalStateException("Camera cache unavailable");
                        File file = File.createTempFile("admin-photo-", ".jpg", folder);
                        capturedPhoto = FileProvider.getUriForFile(MainActivity.this,
                                "com.sindarealest.admin.fileprovider", file);
                        camera = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                        camera.putExtra(MediaStore.EXTRA_OUTPUT, capturedPhoto);
                        camera.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
                        camera.setClipData(ClipData.newUri(getContentResolver(), "photo", capturedPhoto));
                        if (camera.resolveActivity(getPackageManager()) == null) camera = null;
                    }
                    Intent chooser = Intent.createChooser(select, "Chọn tệp hoặc ảnh sản phẩm");
                    if (camera != null) chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{camera});
                    startActivityForResult(chooser, FILE_REQUEST);
                    return true;
                } catch (Exception ex) {
                    cancelPendingFile();
                    Toast.makeText(MainActivity.this, "Không mở được bộ chọn tệp", Toast.LENGTH_SHORT).show();
                    return false;
                }
            }
        });
        web.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) -> {
            Uri uri = Uri.parse(url);
            if (!"https".equalsIgnoreCase(uri.getScheme())) {
                Toast.makeText(this, "Tệp này cần tải trong Chrome", Toast.LENGTH_LONG).show();
                return;
            }
            try {
                DownloadManager.Request request = new DownloadManager.Request(uri);
                String filename = URLUtil.guessFileName(url, contentDisposition, mimeType);
                filename = safeName(filename);
                request.setTitle(filename);
                request.setMimeType(mimeType == null ? "application/octet-stream" : mimeType);
                request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, filename);
                if (trusted(uri)) {
                    String cookie = CookieManager.getInstance().getCookie(url);
                    if (cookie != null) request.addRequestHeader("Cookie", cookie);
                }
                if (userAgent != null) request.addRequestHeader("User-Agent", userAgent);
                DownloadManager mgr = (DownloadManager)getSystemService(DOWNLOAD_SERVICE);
                mgr.enqueue(request);
                Toast.makeText(this, "Đang tải vào thư mục Downloads", Toast.LENGTH_SHORT).show();
            } catch (Exception ex) {
                Toast.makeText(this, "Không thể tải tệp. Hãy dùng Chrome.", Toast.LENGTH_LONG).show();
            }
        });
        installPrivateExportBridge();
        if (saved != null && web.restoreState(saved) != null) {
            // Preserves navigation and logged-in session across Android process recovery.
        } else {
            web.loadUrl(ADMIN_URL);
        }
    }

    /** Register a revocable 30-day device grant only after a successful Owner login.
     * The fetch runs in the same-origin WebView so HttpOnly cookies stay private. */
    private void registerAndroidSession() {
        if (!webReady || web == null || !foreground || !trusted(Uri.parse(web.getUrl()))) return;
        if (System.currentTimeMillis() - lastEnrollmentAttempt < 25000) return;
        lastEnrollmentAttempt = System.currentTimeMillis();
        String token = fcmToken;
        JSONObject payload = new JSONObject();
        try {
            payload.put("deviceId", deviceId);
            payload.put("fcmToken", token);
        } catch (Exception ignored) { return; }
        final String script = "(function(){fetch('/api/admin/android-device',{"
            + "method:'POST',credentials:'same-origin',cache:'no-store',"
            + "headers:{'Content-Type':'application/json','X-SD-Android-App':'2'},"
            + "body:" + JSONObject.quote(payload.toString())
            + "}).then(function(r){return r.json().then(function(d){return !!r.ok&&!!d.ok;});})"
            + ".catch(function(){return false;});})();";
        web.evaluateJavascript(script, result -> {
            // The server owns authentication. Do not persist a password/token in JS.
            // A 401 here simply means the Owner hasn't signed in yet.
        });
    }

    private void initAndroidNotifications() {
        SharedPreferences prefs=getSharedPreferences(NATIVE_PREFS,MODE_PRIVATE);
        deviceId=prefs.getString("deviceId","");
        if(!deviceId.matches("[a-f0-9-]{36}")) {
            deviceId=UUID.randomUUID().toString();
            prefs.edit().putString("deviceId",deviceId).apply();
        }
        fcmToken=prefs.getString("fcmToken","");
        NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
        if(manager!=null && Build.VERSION.SDK_INT>=Build.VERSION_CODES.O){
            NotificationChannel channel=new NotificationChannel(FCM_CHANNEL,"Đơn hàng và hoạt động Admin",NotificationManager.IMPORTANCE_HIGH);
            channel.setDescription("Đơn hàng mới, thanh toán, bảo hành và hoạt động quản trị");
            manager.createNotificationChannel(channel);
        }
        // Native client config is public Firebase configuration, NEVER a service account.
        final String appId=getString(R.string.sd_firebase_app_id);
        final String sender=getString(R.string.sd_firebase_sender_id);
        final String project=getString(R.string.sd_firebase_project_id);
        final String apiKey=getString(R.string.sd_firebase_api_key);
        if(!appId.isEmpty() && !sender.isEmpty() && !project.isEmpty() && !apiKey.isEmpty()){
            try {
                FirebaseOptions options=new FirebaseOptions.Builder().setApplicationId(appId)
                    .setGcmSenderId(sender).setProjectId(project).setApiKey(apiKey).build();
                if(FirebaseApp.getApps(this).isEmpty())FirebaseApp.initializeApp(this,options);
                firebaseReady=!FirebaseApp.getApps(this).isEmpty();
                if(firebaseReady) FirebaseMessaging.getInstance().getToken().addOnSuccessListener(token->{
                    if(token!=null && !token.isEmpty()){
                        fcmToken=token;
                        prefs.edit().putString("fcmToken",token).apply();
                        lastEnrollmentAttempt=0;
                        registerAndroidSession();
                    }
                });
            }catch(Exception ignored){firebaseReady=false;}
        }
        if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)
            requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},NOTIFY_PERMISSION_REQUEST);
    }

    private void installPrivateExportBridge() {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) return;
        WebViewCompat.addWebMessageListener(web, "SDAdminExport",
            Collections.singleton("https://" + ALLOWED_HOST),
            (view, message, origin, isMainFrame, replyProxy) -> {
                if (!isMainFrame || !trusted(origin)) return;
                String json = message.getData();
                if (json == null || json.length() > MAX_EXPORT_BASE64_CHARS) return;
                main.post(() -> saveBlobExport(json));
            });
    }

    private void saveBlobExport(String raw) {
        try {
            JSONObject object = new JSONObject(raw);
            String payload = object.optString("base64", "");
            if (payload.isEmpty() || payload.length() > MAX_EXPORT_BASE64_CHARS) return;
            byte[] bytes = Base64.decode(payload, Base64.DEFAULT);
            String name = safeName(object.optString("name", "sindarealest-export.bin"));
            String mime = object.optString("mime", "application/octet-stream");
            ContentValues values = new ContentValues();
            values.put(MediaStore.Downloads.DISPLAY_NAME, name);
            values.put(MediaStore.Downloads.MIME_TYPE, mime);
            values.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/");
            values.put(MediaStore.Downloads.IS_PENDING, 1);
            Uri destination = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
            if (destination == null) throw new IllegalStateException("Download storage unavailable");
            boolean ok = false;
            try (OutputStream stream = getContentResolver().openOutputStream(destination)) {
                if (stream == null) throw new IllegalStateException("Download stream unavailable");
                stream.write(bytes);
                ok = true;
            } finally {
                if (!ok) getContentResolver().delete(destination, null, null);
            }
            values.clear();
            values.put(MediaStore.Downloads.IS_PENDING, 0);
            getContentResolver().update(destination, values, null, null);
            Toast.makeText(this, "Đã lưu: " + name, Toast.LENGTH_LONG).show();
        } catch (Exception err) {
            Toast.makeText(this, "Không thể xuất tệp. Hãy mở Admin bằng Chrome.", Toast.LENGTH_LONG).show();
        }
    }

    private static String safeName(String input) {
        String out = input == null ? "" : input.replaceAll("[^\\p{L}\\p{N}._ -]", "_").trim();
        if (out.isEmpty() || ".".equals(out) || "..".equals(out)) out = "sindarealest-file";
        if (out.length() > 100) out = out.substring(out.length() - 100);
        return out;
    }

    private void openExternal(Uri uri) {
        if (!externalScheme(uri)) return; // Block javascript:, file:, content:, intent:, data:.
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE));
        } catch (ActivityNotFoundException ignored) {
            Toast.makeText(this, "Không có ứng dụng phù hợp để mở liên kết", Toast.LENGTH_SHORT).show();
        }
    }

    private void cancelPendingFile() {
        if (pendingFiles != null) {
            pendingFiles.onReceiveValue(null);
            pendingFiles = null;
        }
        capturedPhoto = null;
    }

    @Override protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != FILE_REQUEST || pendingFiles == null) return;
        Uri[] values = null;
        if (resultCode == RESULT_OK) {
            if (data != null && data.getClipData() != null) {
                ClipData clip = data.getClipData();
                values = new Uri[clip.getItemCount()];
                for (int i = 0; i < clip.getItemCount(); i++) values[i] = clip.getItemAt(i).getUri();
            } else if (data != null && data.getData() != null) {
                values = new Uri[]{data.getData()};
            } else if (capturedPhoto != null) {
                values = new Uri[]{capturedPhoto};
            }
        }
        pendingFiles.onReceiveValue(values);
        pendingFiles = null;
        capturedPhoto = null;
    }

    private void showOffline(String text) {
        main.post(() -> {
            hideOffline();
            LinearLayout panel = new LinearLayout(this);
            panel.setOrientation(LinearLayout.VERTICAL);
            panel.setGravity(Gravity.CENTER);
            panel.setPadding(30, 25, 30, 25);
            panel.setBackgroundColor(Color.rgb(234, 243, 251));
            TextView notice = new TextView(this);
            notice.setText(text);
            notice.setTextSize(16);
            notice.setTextColor(Color.rgb(30, 45, 56));
            notice.setGravity(Gravity.CENTER);
            Button retry = new Button(this);
            retry.setText("Thử lại");
            retry.setOnClickListener(v -> { hideOffline(); web.loadUrl(ADMIN_URL); });
            panel.addView(notice);
            panel.addView(retry);
            offlineView = panel;
            root.addView(panel, new FrameLayout.LayoutParams(-1, -1));
        });
    }

    private void hideOffline() {
        if (offlineView != null) {
            root.removeView(offlineView);
            offlineView = null;
        }
    }

    @Override public boolean onCreateOptionsMenu(Menu menu) {
        menu.add(0, 1, 0, "Tải lại");
        menu.add(0, 2, 1, "Mở Admin trong Chrome");
        return true;
    }
    @Override public boolean onOptionsItemSelected(MenuItem item) {
        if (item.getItemId() == 1) { web.reload(); return true; }
        if (item.getItemId() == 2) { openExternal(Uri.parse(ADMIN_URL)); return true; }
        return super.onOptionsItemSelected(item);
    }
    @Override public void onBackPressed() {
        if (offlineView != null) { hideOffline(); web.loadUrl(ADMIN_URL); return; }
        if (web.canGoBack()) { web.goBack(); return; }
        new AlertDialog.Builder(this)
            .setTitle("Đóng SinDarealest Admin?")
            .setNegativeButton("Ở lại", null)
            .setPositiveButton("Đóng", (dialog, which) -> finish())
            .show();
    }
    @Override protected void onSaveInstanceState(Bundle out) {
        web.saveState(out);
        super.onSaveInstanceState(out);
    }
    @Override protected void onPause() {
        foreground = false;
        main.removeCallbacks(registrationHeartbeat);
        CookieManager.getInstance().flush();
        web.onPause();
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        foreground = true;
        web.onResume();
        main.removeCallbacks(registrationHeartbeat);
        main.post(registrationHeartbeat);
    }
    @Override protected void onDestroy() {
        foreground = false;
        main.removeCallbacks(registrationHeartbeat);
        cancelPendingFile();
        if (web != null) {
            root.removeView(web);
            web.stopLoading();
            web.setWebChromeClient(null);
            web.setWebViewClient(null);
            web.destroy();
        }
        super.onDestroy();
    }
}
