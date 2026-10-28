package com.sindarealest.taobaoimport;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentValues;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.browser.customtabs.CustomTabsIntent;

import org.json.JSONArray;
import org.json.JSONTokener;

import java.io.BufferedInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/**
 * Optional in-app Taobao browser for accounts without a Taobao Open Platform key.
 * User opens the product page and taps "Tìm ảnh trang này" explicitly.
 *
 * No JavaScript bridge, no reading passwords or cookies, no external tracking,
 * no bypass of Taobao login/anti-bot restrictions. evaluateJavascript is invoked
 * only from a user gesture and only for the visible official product-page host.
 * This is a best-effort visible-DOM picker, not an official item API.
 */
public final class TaobaoBrowserActivity extends Activity {
    private static final String HOME = "https://www.taobao.com/";
    private static final int MAX_IMAGES = 30;
    private static final long MAX_BYTES = 20L * 1024 * 1024;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private WebView web;
    private EditText address;
    private TextView status;
    private boolean downloading;
    private ArrayList<String> detectedImages = new ArrayList<>();

    private boolean dark() {
        return (getResources().getConfiguration().uiMode &
            Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
    }
    private int dp(float value) {
        return (int)(value * getResources().getDisplayMetrics().density + .5f);
    }
    private TextView text(String content, int size) {
        TextView t = new TextView(this);
        t.setText(content);t.setTextSize(size);
        t.setTextColor(dark() ? Color.rgb(232,243,246) : Color.rgb(31,69,88));
        return t;
    }
    private Button button(String label) {
        Button b = new Button(this);b.setAllCaps(false);b.setText(label);
        b.setTextColor(dark() ? Color.WHITE : Color.rgb(30,62,79));
        return b;
    }
    private static boolean officialHost(String raw) {
        if(raw == null) return false;
        String host=raw.toLowerCase(Locale.ROOT);
        for(String domain:new String[]{"taobao.com","tmall.com","tb.cn"}) {
            if(host.equals(domain) || host.endsWith("."+domain)) return true;
        }
        return false;
    }
    private static boolean photoHost(String raw) {
        if(raw == null) return false;
        String host=raw.toLowerCase(Locale.ROOT);
        for(String domain:new String[]{"alicdn.com","taobaocdn.com"}) {
            if(host.equals(domain) || host.endsWith("."+domain)) return true;
        }
        return false;
    }
    private static boolean safePage(String raw) {
        try {
            Uri uri=Uri.parse(raw);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getUserInfo()==null &&
                uri.getPort()==-1 && officialHost(uri.getHost());
        }catch(Exception ignored){return false;}
    }
    private static boolean safePhoto(String raw) {
        try {
            Uri uri=Uri.parse(raw);
            return "https".equalsIgnoreCase(uri.getScheme()) && uri.getUserInfo()==null &&
                uri.getPort()==-1 && photoHost(uri.getHost());
        }catch(Exception ignored){return false;}
    }
    private void report(String content) { status.setText(content); }
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(dark()?Color.rgb(18,29,37):Color.rgb(239,247,252));

        TextView brand=text("SinDarealest · Trình duyệt Taobao",18);
        brand.setTypeface(null,Typeface.BOLD);
        brand.setPadding(dp(12),dp(14),dp(12),dp(8));
        root.addView(brand);

        LinearLayout nav=new LinearLayout(this);
        nav.setOrientation(LinearLayout.HORIZONTAL);
        address=new EditText(this);
        address.setSingleLine(true);address.setTextSize(12);
        address.setHint("Link Taobao/Tmall");
        nav.addView(address,new LinearLayout.LayoutParams(0,dp(49),1));
        Button go=button("Mở");
        nav.addView(go,new LinearLayout.LayoutParams(dp(65),dp(49)));
        Button external=button("Chrome");
        nav.addView(external,new LinearLayout.LayoutParams(dp(90),dp(49)));
        root.addView(nav);
        status=text("Đăng nhập Taobao tại website chính thức, mở sản phẩm rồi bấm Tìm ảnh trang này.",12);
        status.setPadding(dp(12),dp(8),dp(12),dp(8));
        root.addView(status);

        web=new WebView(this);
        WebSettings settings=web.getSettings();
        settings.setJavaScriptEnabled(true); // Taobao's website requires JS.
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.setWebChromeClient(new WebChromeClient());
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request){
                if(!request.isForMainFrame())return false;
                String next=request.getUrl().toString();
                if(safePage(next))return false;
                report("Trang chuyển sang tên miền ngoài Taobao. Đã mở ở trình duyệt ngoài nếu bạn đồng ý.");
                openExternal(next);
                return true;
            }
            @Override public void onPageFinished(WebView view, String url){
                if(safePage(url))address.setText(url);
            }
        });
        root.addView(web,new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,0,1));

        LinearLayout actions=new LinearLayout(this);
        actions.setOrientation(LinearLayout.HORIZONTAL);
        Button collect=button("Tìm ảnh trang này");
        actions.addView(collect,new LinearLayout.LayoutParams(0,dp(54),1));
        Button importButton=button("Nhập Admin");
        actions.addView(importButton,new LinearLayout.LayoutParams(0,dp(54),1));
        root.addView(actions);
        setContentView(root);

        go.setOnClickListener(v -> navigate(address.getText().toString().trim()));
        external.setOnClickListener(v -> openExternal(
            safePage(web.getUrl())?web.getUrl():HOME));
        collect.setOnClickListener(v -> scanVisibleImages());
        importButton.setOnClickListener(v -> {
            Uri target=Uri.parse(BuildConfig.ADMIN_IMPORT_URL);
            String page=web.getUrl();
            if(safePage(page))target=target.buildUpon().encodedFragment(
                "source="+Uri.encode(page)).build();
            CustomTabsIntent tab=new CustomTabsIntent.Builder()
                .setColorScheme(CustomTabsIntent.COLOR_SCHEME_SYSTEM).build();
            try {tab.launchUrl(this,target);}
            catch(Exception err){startActivity(new Intent(Intent.ACTION_VIEW,target));}
        });
        String original=getIntent().getStringExtra("product_link");
        navigate(safePage(original)?original:HOME);
    }
    private void navigate(String url) {
        if(!safePage(url)){
            report("Chỉ mở HTTPS Taobao/Tmall/tb.cn trong trình duyệt nội bộ.");
            return;
        }
        address.setText(url);
        web.loadUrl(url);
    }
    private void openExternal(String url) {
        if(url == null || !url.startsWith("https://"))return;
        try {
            startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url))
                .addCategory(Intent.CATEGORY_BROWSABLE));
        }catch(Exception err){report("Không mở được trình duyệt ngoài.");}
    }
    private static final String DOM_PHOTO_SCRIPT =
        "(function(){"
        + "var out=[], seen={};"
        + "function add(source){if(typeof source!=='string'||source.length>1500)return;"
        + "try{var u=new URL(source,location.href);var host=u.hostname.toLowerCase();"
        + "if(u.protocol!=='https:'||!(host==='alicdn.com'||host.endsWith('.alicdn.com')"
        + "||host==='taobaocdn.com'||host.endsWith('.taobaocdn.com')))return;"
        + "u.hash='';var v=u.href;if(!seen[v]){seen[v]=1;out.push(v);}}catch(e){}}"
        + "Array.prototype.forEach.call(document.querySelectorAll('img'),function(n){"
        + "if(n.naturalWidth&&n.naturalHeight&&n.naturalWidth<120&&n.naturalHeight<120)return;"
        + "add(n.currentSrc);add(n.src);"
        + "['data-src','data-original','data-lazy-src','data-ks-lazyload','data-img','data-actualsrc']"
        + ".forEach(function(k){add(n.getAttribute(k));});});"
        + "return JSON.stringify(out.slice(0,90));"
        + "})()";
    private void scanVisibleImages() {
        if(downloading){report("Đang tải ảnh, không thể quét thêm.");return;}
        if(web == null || !safePage(web.getUrl())){
            report("Hãy mở trang sản phẩm Taobao chính thức trước khi tìm ảnh.");return;
        }
        report("Đang tìm URL ảnh đã hiển thị trong trang đang mở…");
        web.evaluateJavascript(DOM_PHOTO_SCRIPT,value -> {
            try {
                Object unwrapped=new JSONTokener(value).nextValue();
                JSONArray array=new JSONArray(String.valueOf(unwrapped));
                detectedImages.clear();
                Set<String> seen=new HashSet<>();
                for(int i=0;i<array.length();i++){
                    String candidate=array.optString(i);
                    if(safePhoto(candidate)&&seen.add(candidate))
                        detectedImages.add(candidate);
                }
                if(detectedImages.isEmpty()){
                    report("Trang này chưa hiển thị ảnh phù hợp; Taobao có thể chặn WebView hoặc ảnh chưa tải. Bạn vẫn có thể lưu/chia sẻ ảnh từ ứng dụng Taobao.");
                    return;
                }
                showImagePicker();
            }catch(Exception error){
                report("Không thể đọc ảnh hiển thị trong trang. Trang có thể giới hạn trình duyệt nhúng.");
            }
        });
    }
    private void showImagePicker() {
        final ArrayList<String> list=new ArrayList<>(detectedImages);
        final String[] labels=new String[list.size()];
        final boolean[] selected=new boolean[list.size()];
        for(int i=0;i<list.size();i++){
            String path=Uri.parse(list.get(i)).getLastPathSegment();
            if(path==null||path.isEmpty())path="Ảnh "+(i+1);
            labels[i]=(i+1)+". "+(path.length()>65?path.substring(0,65)+"…":path);
            selected[i]=(i<MAX_IMAGES);
        }
        report("Đã tìm được "+list.size()+" liên kết ảnh. Chọn tối đa 30 ảnh muốn lưu.");
        new AlertDialog.Builder(this).setTitle("Chọn ảnh từ trang đang xem")
            .setMultiChoiceItems(labels,selected,(dialog,which,on)->selected[which]=on)
            .setNegativeButton("Bỏ qua",null)
            .setPositiveButton("Lưu ảnh đã chọn",(dialog,which)->{
                ArrayList<String> chosen=new ArrayList<>();
                for(int i=0;i<list.size();i++)if(selected[i])chosen.add(list.get(i));
                if(chosen.isEmpty()){report("Chưa chọn ảnh nào.");return;}
                if(chosen.size()>MAX_IMAGES){report("Chỉ chọn tối đa 30 ảnh một lần.");return;}
                new AlertDialog.Builder(this).setTitle("Xác nhận quyền sử dụng")
                    .setMessage("Chỉ tải và sử dụng những ảnh bạn được nhà cung cấp cho phép. Ảnh được lưu vào điện thoại, không gửi cookie hay mật khẩu Taobao về máy chủ SinDarealest.")
                    .setNegativeButton("Hủy",null)
                    .setPositiveButton("Đồng ý, lưu ảnh",(d,w)->downloadPhotos(chosen)).show();
            }).show();
    }
    private void downloadPhotos(ArrayList<String> links) {
        if(downloading)return;
        downloading=true;report("Đang tải 0/"+links.size()+" ảnh…");
        worker.execute(()->{
            int saved=0,failed=0;
            for(String source:links){
                try {if(downloadOne(source))saved++;else failed++;}
                catch(Exception error){failed++;}
                final int ok=saved,bad=failed,done=ok+bad;
                runOnUiThread(()->report("Đã xử lý "+done+"/"+links.size()+" ảnh · lưu "+ok+" · lỗi "+bad));
            }
            final int ok=saved,bad=failed;
            runOnUiThread(()->{
                downloading=false;
                report("Đã lưu "+ok+" ảnh vào Pictures/SinDarealest Import"+
                    (bad>0?" · "+bad+" ảnh lỗi hoặc nguồn chặn tải":"")+
                    ". Bấm Nhập Admin để chọn ảnh và tạo bản nháp.");
            });
        });
    }
    private boolean downloadOne(String url) throws Exception {
        if(!safePhoto(url))return false;
        HttpURLConnection connection=(HttpURLConnection)new URL(url).openConnection();
        connection.setInstanceFollowRedirects(false);
        connection.setConnectTimeout(10000);connection.setReadTimeout(15000);
        connection.setRequestProperty("Accept","image/jpeg,image/png,image/webp");
        Uri target=null;
        try {
            if(connection.getResponseCode()!=200)return false;
            String type=connection.getContentType();
            if(type==null)return false;
            type=type.split(";")[0].trim().toLowerCase(Locale.ROOT);
            String ext;
            if("image/jpeg".equals(type))ext="jpg";
            else if("image/png".equals(type))ext="png";
            else if("image/webp".equals(type))ext="webp";
            else return false;
            if(connection.getContentLengthLong()>MAX_BYTES)return false;
            try(BufferedInputStream in=new BufferedInputStream(connection.getInputStream())){
                in.mark(32);
                byte[] header=new byte[12];int n=0;
                while(n<header.length){int k=in.read(header,n,header.length-n);if(k<0)break;n+=k;}
                if(!signatureMatches(header,n,type))return false;
                in.reset();
                ContentValues values=new ContentValues();
                values.put(MediaStore.Images.Media.DISPLAY_NAME,
                    "SD-Taobao-"+System.currentTimeMillis()+"-"+UUID.randomUUID()+"."+ext);
                values.put(MediaStore.Images.Media.MIME_TYPE,type);
                values.put(MediaStore.Images.Media.RELATIVE_PATH,"Pictures/SinDarealest Import");
                values.put(MediaStore.Images.Media.IS_PENDING,1);
                target=getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,values);
                if(target==null)return false;
                long count=0;
                try(OutputStream out=getContentResolver().openOutputStream(target)){
                    if(out==null)throw new IllegalStateException("No image output stream");
                    byte[] chunk=new byte[64*1024];int len;
                    while((len=in.read(chunk))!=-1){
                        count+=len;
                        if(count>MAX_BYTES)throw new IllegalStateException("Image exceeds 20MB");
                        out.write(chunk,0,len);
                    }
                }
                if(count==0)throw new IllegalStateException("Empty image");
                ContentValues ready=new ContentValues();ready.put(MediaStore.Images.Media.IS_PENDING,0);
                if(getContentResolver().update(target,ready,null,null)!=1)
                    throw new IllegalStateException("Image not published");
                return true;
            }
        }catch(Exception error){
            if(target!=null)try{getContentResolver().delete(target,null,null);}catch(Exception ignored){}
            throw error;
        }finally{connection.disconnect();}
    }
    private static boolean signatureMatches(byte[] b,int n,String type){
        if("image/jpeg".equals(type))return n>=3&&(b[0]&255)==255&&(b[1]&255)==216&&(b[2]&255)==255;
        if("image/png".equals(type))return n>=8&&(b[0]&255)==137&&b[1]=='P'&&b[2]=='N'&&b[3]=='G';
        return "image/webp".equals(type)&&n>=12&&b[0]=='R'&&b[1]=='I'&&b[2]=='F'&&b[3]=='F'&&b[8]=='W'&&b[9]=='E'&&b[10]=='B'&&b[11]=='P';
    }
    @Override public void onBackPressed(){
        if(web!=null&&web.canGoBack()){web.goBack();return;}
        super.onBackPressed();
    }
    @Override protected void onDestroy(){
        worker.shutdownNow();
        if(web!=null){
            ViewGroup parent=(ViewGroup)web.getParent();
            if(parent!=null)parent.removeView(web);
            web.stopLoading();web.destroy();web=null;
        }
        super.onDestroy();
    }
}
