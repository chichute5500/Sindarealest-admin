#!/usr/bin/env python3
"""Compile Android Java against narrow API stubs when Android SDK unavailable.
This is a syntax / type smoke check, NOT a real Android SDK build.
"""
from pathlib import Path
import tempfile, subprocess

sources={
'android/app/Activity.java': '''package android.app;
import android.os.Bundle;import android.content.*;import android.content.res.*;import android.widget.*;
public class Activity extends android.content.Context { protected void onCreate(Bundle b){} protected void onDestroy(){} protected void onNewIntent(Intent i){} protected void onSaveInstanceState(Bundle b){} public void setIntent(Intent i){} public Intent getIntent(){return null;} public void setContentView(ScrollView v){} public void startActivity(Intent i){} public void runOnUiThread(Runnable r){} }
''',
'android/app/AlertDialog.java':'''package android.app;public class AlertDialog {public static class Builder {public Builder(Activity a){} public Builder setTitle(String s){return this;} public Builder setMessage(String s){return this;} public Builder setPositiveButton(String s,Object o){return this;} public AlertDialog show(){return new AlertDialog();}}}''',
'android/content/Context.java':'''package android.content;import android.content.res.*;import java.io.*;import android.net.Uri;public class Context {public Resources getResources(){return new Resources();}public ContentResolver getContentResolver(){return new ContentResolver();}}''',
'android/content/ContentResolver.java':'''package android.content;import android.net.Uri;import java.io.*;public class ContentResolver {public String getType(Uri u){return null;}public InputStream openInputStream(Uri u){return null;}public OutputStream openOutputStream(Uri u){return null;}public Uri insert(Uri u,ContentValues v){return null;}public int update(Uri u,ContentValues v,String s,String[] a){return 0;}public int delete(Uri u,String s,String[] a){return 0;}}''',
'android/content/ContentValues.java':'''package android.content;public class ContentValues {public void put(String k,String v){}public void put(String k,Integer v){}}''',
'android/content/Intent.java':'''package android.content;import android.net.Uri;import java.util.ArrayList;public class Intent {public static final String ACTION_SEND="",ACTION_SEND_MULTIPLE="",ACTION_VIEW="",EXTRA_TEXT="",EXTRA_STREAM="";public Intent(String a,Uri u){}public String getAction(){return null;}public String getType(){return null;}public String getStringExtra(String s){return null;}public <T> T getParcelableExtra(String s){return null;}public <T> ArrayList<T> getParcelableArrayListExtra(String s){return null;}public ClipData getClipData(){return null;}}''',
'android/content/ClipData.java':'''package android.content;import android.net.Uri;public class ClipData {public int getItemCount(){return 0;}public Item getItemAt(int i){return new Item();}public static class Item {public Uri getUri(){return null;}}}''',
'android/content/res/Configuration.java':'''package android.content.res;public class Configuration {public static final int UI_MODE_NIGHT_MASK=0, UI_MODE_NIGHT_YES=1;public int uiMode;}''',
'android/content/res/Resources.java':'''package android.content.res;public class Resources {public Configuration getConfiguration(){return new Configuration();} public DisplayMetrics getDisplayMetrics(){return new DisplayMetrics();}public static class DisplayMetrics {public float density=1f;}}''',
'android/content/res/ColorStateList.java':'''package android.content.res;public class ColorStateList {public static ColorStateList valueOf(int i){return new ColorStateList();}}''',
'android/graphics/Color.java':'''package android.graphics;public class Color {public static final int WHITE=0;public static int rgb(int r,int g,int b){return 0;}}''',
'android/graphics/Typeface.java':'''package android.graphics;public class Typeface {public static final int BOLD=1;}''',
'android/net/Uri.java':'''package android.net;public class Uri {public static Uri parse(String s){return new Uri();}public static String encode(String s){return s;}public String getScheme(){return "";}public String getHost(){return "";}public Builder buildUpon(){return new Builder();}public static class Builder {public Builder fragment(String s){return this;}public Builder encodedFragment(String s){return this;}public Uri build(){return new Uri();}}}''',
'android/os/Bundle.java':'''package android.os;public class Bundle {public String getString(String k,String def){return def;}public void putString(String k,String v){}}''',
'android/provider/MediaStore.java':'''package android.provider;import android.net.Uri;public class MediaStore {public static class Images {public static class Media {public static final Uri EXTERNAL_CONTENT_URI=null;public static final String DISPLAY_NAME="",MIME_TYPE="",RELATIVE_PATH="",IS_PENDING="";}}}''',
'android/view/View.java':'''package android.view;public class View {public interface OnClickListener{void onClick(View v);}}''',
'android/view/ViewGroup.java':'''package android.view;public class ViewGroup extends View {public static class LayoutParams {public static final int MATCH_PARENT=-1;public LayoutParams(int w,int h){}}}''',
'android/widget/TextView.java':'''package android.widget;import android.content.Context;import android.graphics.*;import android.view.*;public class TextView extends View {public TextView(Context c){}public void setText(String s){}public void setTextSize(int i){}public void setTextColor(int i){}public void setTypeface(Object t,int style){}public void setPadding(int l,int t,int r,int b){}}''',
'android/widget/Button.java':'''package android.widget;import android.content.Context;import android.content.res.ColorStateList;import android.view.View;public class Button extends TextView {public Button(Context c){super(c);}public void setAllCaps(boolean b){}public void setBackgroundTintList(ColorStateList v){}public void setOnClickListener(View.OnClickListener v){}}''',
'android/widget/LinearLayout.java':'''package android.widget;import android.content.Context;import android.view.ViewGroup;import android.view.View;public class LinearLayout extends ViewGroup {public static final int VERTICAL=1;public LinearLayout(Context c){}public void setOrientation(int i){}public void setPadding(int a,int b,int c,int d){}public void addView(View w){}public void addView(View w,LayoutParams p){}public static class LayoutParams extends ViewGroup.LayoutParams {public LayoutParams(int w,int h){super(w,h);}}}''',
'android/widget/ScrollView.java':'''package android.widget;import android.content.Context;import android.view.ViewGroup;public class ScrollView extends ViewGroup {public ScrollView(Context c){}public void setFillViewport(boolean b){}public void setBackgroundColor(int c){}public void addView(LinearLayout l){}}''',
'androidx/browser/customtabs/CustomTabsIntent.java':'''package androidx.browser.customtabs;import android.app.Activity;import android.net.Uri;public class CustomTabsIntent {public static final int COLOR_SCHEME_SYSTEM=0;public void launchUrl(Activity a,Uri u){}public static class Builder {public Builder setShowTitle(boolean b){return this;}public Builder setColorScheme(int s){return this;}public CustomTabsIntent build(){return new CustomTabsIntent();}}}''',
}
root=Path(__file__).parents[1]
target=root/'android/app/src/main/java/com/sindarealest/taobaoimport/MainActivity.java'
with tempfile.TemporaryDirectory() as td:
 d=Path(td)
 for name,source in sources.items():
  p=d/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(source)
 proc=subprocess.run(['javac','-encoding','UTF-8','-source','17','-target','17','-d',str(d/'classes'),str(target),*(str(d/name) for name in sources)],capture_output=True,text=True)
 if proc.returncode:
  print(proc.stdout,proc.stderr);raise SystemExit(proc.returncode)
print('PASS Android Java syntax and API stub smoke compile (not Android SDK build)')
