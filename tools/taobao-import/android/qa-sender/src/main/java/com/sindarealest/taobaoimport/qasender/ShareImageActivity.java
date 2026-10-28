package com.sindarealest.taobaoimport.qasender;

import android.app.Activity;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.util.Base64;
import android.util.Log;
import java.io.OutputStream;

/** Emulator-only separate APK: supplies a legitimate cross-app content URI. Never shipped to users. */
public final class ShareImageActivity extends Activity {
  private static final String SAMPLE_PNG = "iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAIAAAD8GO2jAAAALUlEQVR4nGOclmLDQEvARFPTRy0YtWDUglELRi0YtWDUAioCAD2+AXadpnZ5AAAAAElFTkSuQmCC";
  @Override public void onCreate(Bundle state) {
    super.onCreate(state);
    Uri source = null;
    try {
      ContentValues values = new ContentValues();
      values.put(MediaStore.Images.Media.DISPLAY_NAME, "sd-qa-source.png");
      values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
      values.put(MediaStore.Images.Media.RELATIVE_PATH, "Pictures/SD-Emulator-QA");
      values.put(MediaStore.Images.Media.IS_PENDING, 1);
      source = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
      if (source == null) throw new IllegalStateException("MediaStore source insert failed");
      try (OutputStream out = getContentResolver().openOutputStream(source)) {
        if (out == null) throw new IllegalStateException("MediaStore source output failed");
        out.write(Base64.decode(SAMPLE_PNG, Base64.DEFAULT));
      }
      ContentValues ready = new ContentValues(); ready.put(MediaStore.Images.Media.IS_PENDING, 0);
      if (getContentResolver().update(source, ready, null, null) != 1)
        throw new IllegalStateException("MediaStore source publish failed");
      Intent share = new Intent(Intent.ACTION_SEND);
      share.setClassName("com.sindarealest.taobaoimport","com.sindarealest.taobaoimport.MainActivity");
      share.setType("image/png");
      share.putExtra(Intent.EXTRA_STREAM, source);
      share.setClipData(ClipData.newUri(getContentResolver(), "SinDarealest QA", source));
      share.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
      startActivity(share);
      Log.i("SD_QA_SHARE", "Cross-package image content URI delivered");
    } catch (Exception error) {
      Log.e("SD_QA_SHARE", "Cross-package image delivery failed", error);
    } finally {
      finish();
    }
  }
}
