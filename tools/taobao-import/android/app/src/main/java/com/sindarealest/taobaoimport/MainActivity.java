package com.sindarealest.taobaoimport;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.ContentValues;
import android.content.Intent;
import android.content.res.Configuration;
import android.content.res.ColorStateList;
import android.graphics.Color;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.provider.MediaStore;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import androidx.browser.customtabs.CustomTabsIntent;
import java.io.BufferedInputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * User-authorized Taobao browser + Android share-target image inbox.
 * Never requests passwords, cookies, page DOM, Accessibility or broad storage access.
 * Image shares use Android ContentResolver grants and the scoped MediaStore.
 */
public final class MainActivity extends Activity {
    private static final String TAOBAO = "https://www.taobao.com/";
    // Verify before signing: this page must be deployed with /api/admin/import-draft.
    private static final String ADMIN_IMPORT = BuildConfig.ADMIN_IMPORT_URL;
    private static final int MAX_IMAGES = 30;
    private static final long MAX_IMAGE_BYTES = 20L * 1024 * 1024;
    private final ExecutorService imageWorker = Executors.newSingleThreadExecutor();
    private String sharedSource = "";
    private TextView sourceView;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        buildUi();
        if(state!=null){
            sharedSource=state.getString("shared_source","");
            if(!sharedSource.isEmpty())sourceView.setText("Đã khôi phục link Taobao: "+sharedSource);
        }else receiveShare(getIntent());
    }
    @Override public void onSaveInstanceState(Bundle state) {
        state.putString("shared_source",sharedSource);
        super.onSaveInstanceState(state);
    }
    @Override protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        receiveShare(intent);
    }
    @Override public void onDestroy() {
        imageWorker.shutdown();
        super.onDestroy();
    }
    private boolean dark() {return (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;}
    private int dp(float size) {return (int)(size*getResources().getDisplayMetrics().density+.5f);}
    private TextView text(String value,int sp,boolean bold) {
        TextView t=new TextView(this);
        t.setText(value);t.setTextSize(sp);
        t.setTextColor(dark()?Color.rgb(228,242,248):Color.rgb(31,69,88));
        if(bold)t.setTypeface(null, Typeface.BOLD);
        return t;
    }
    private Button button(String title, LinearLayout parent) {
        Button b=new Button(this);b.setText(title);b.setAllCaps(false);
        b.setTextColor(dark()?Color.WHITE:Color.rgb(20,69,90));
        b.setBackgroundTintList(ColorStateList.valueOf(dark()?Color.rgb(39,87,110):Color.rgb(207,232,243)));
        parent.addView(b,new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,dp(57)));
        return b;
    }
    private void buildUi() {
        ScrollView scroll=new ScrollView(this);
        scroll.setFillViewport(true);
        scroll.setBackgroundColor(dark()?Color.rgb(18,29,37):Color.rgb(239,247,252));
        LinearLayout root=new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(22),dp(38),dp(22),dp(35));
        scroll.addView(root);
        root.addView(text("SinDarealest · Taobao Import",22,true));
        TextView sub=text("Duyệt Taobao → chọn ảnh hợp lệ → tạo bản nháp Admin",14,false);
        sub.setPadding(0,dp(8),0,dp(24));root.addView(sub);
        Button openTaobao=button("1 · Duyệt Taobao / lấy ảnh trên trang",root);
        openTaobao.setOnClickListener(v->{
            Intent browser=new Intent(this,TaobaoBrowserActivity.class);
            if(!sharedSource.isEmpty())browser.putExtra("product_link",sharedSource);
            startActivity(browser);
        });
        TextView hint=text("Mở sản phẩm Taobao trong trình duyệt ứng dụng, đăng nhập tài khoản cá nhân nếu Taobao hỗ trợ. Bấm “Tìm ảnh trang này”, tự chọn ảnh và xác nhận lưu. Nếu Taobao chặn trình duyệt nhúng, dùng Chrome hoặc Chia sẻ ảnh → SinDarealest Import.",13,false);
        hint.setPadding(0,dp(8),0,dp(20));root.addView(hint);
        Button importer=button("2 · Chọn ảnh / nhập lên Admin",root);
        importer.setOnClickListener(v->openImport());
        sourceView=text("Chưa có sản phẩm hoặc ảnh được chia sẻ. Có thể chọn ảnh đã lưu trong thư viện.",13,false);
        sourceView.setPadding(0,dp(24),0,dp(18));root.addView(sourceView);
        Button info=button("Hướng dẫn và bảo mật",root);
        info.setOnClickListener(v->new AlertDialog.Builder(this)
            .setTitle("Cách nhập sản phẩm")
            .setMessage("1. Nhấn Duyệt Taobao / lấy ảnh, đăng nhập tài khoản cá nhân nếu trang cho phép.\n2. Mở sản phẩm rồi bấm Tìm ảnh trang này. Chỉ các ảnh hiển thị trong trang có URL CDN được hỗ trợ mới được liệt kê.\n3. Xác nhận ảnh được phép sử dụng và lưu vào Pictures/SinDarealest Import.\n4. Mở Admin, chọn ảnh, nhập danh mục/giá, tạo bản nháp ẨN.\n\nNếu Taobao hạn chế WebView, hãy mở trong Chrome hoặc ứng dụng Taobao và sử dụng tùy chọn Lưu/Chia sẻ ảnh. Công cụ không xin API doanh nghiệp, không đọc mật khẩu/cookie, không vượt chặn và không bảo đảm tải mọi ảnh.")
            .setPositiveButton("Đã hiểu",null).show());
        setContentView(scroll);
    }
    private static boolean allowedHost(String host) {
        if(host==null)return false;
        host=host.toLowerCase(Locale.ROOT);
        for(String domain:new String[]{"taobao.com","tmall.com","tb.cn"})
            if(host.equals(domain)||host.endsWith("."+domain))return true;
        return false;
    }
    private void receiveShare(Intent intent) {
        if(intent==null)return;
        final String action=intent.getAction(),type=intent.getType();
        if(Intent.ACTION_SEND.equals(action)&&"text/plain".equals(type)){
            receiveText(intent.getStringExtra(Intent.EXTRA_TEXT));return;
        }
        if(type==null||!type.startsWith("image/")||
                !(Intent.ACTION_SEND.equals(action)||Intent.ACTION_SEND_MULTIPLE.equals(action)))return;
        ArrayList<Uri> images=new ArrayList<>();
        try {
            if(Intent.ACTION_SEND.equals(action)){
                Uri uri=intent.getParcelableExtra(Intent.EXTRA_STREAM);
                if(uri!=null)images.add(uri);
            }else{
                ArrayList<Uri> shared=intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM);
                if(shared!=null)images.addAll(shared);
            }
            if(images.isEmpty()&&intent.getClipData()!=null){
                ClipData clips=intent.getClipData();
                for(int i=0;i<clips.getItemCount();i++)if(clips.getItemAt(i).getUri()!=null)images.add(clips.getItemAt(i).getUri());
            }
        }catch(Exception ignored){}
        if(images.isEmpty()){sourceView.setText("Không nhận được tệp ảnh hợp lệ từ ứng dụng chia sẻ.");return;}
        if(images.size()>MAX_IMAGES){sourceView.setText("Chỉ nhập tối đa 30 ảnh mỗi lần chia sẻ.");return;}
        sourceView.setText("Đang lưu "+images.size()+" ảnh được chia sẻ…");
        imageWorker.execute(()->{
            int saved=0,failed=0;
            for(Uri uri:images){try{if(saveSharedImage(uri))saved++;else failed++;}catch(Exception ignored){failed++;}}
            final int ok=saved,bad=failed;
            runOnUiThread(()->sourceView.setText("Đã lưu "+ok+" ảnh vào Pictures/SinDarealest Import"+
                (bad>0?" · "+bad+" ảnh không hợp lệ/quá 20 MB":"")+". Nhấn Chọn ảnh / nhập lên Admin để tiếp tục."));
        });
    }
    private void receiveText(String input) {
        if(input==null)return;
        Matcher matcher=Pattern.compile("https://[^\\s<>\"']+").matcher(input);
        while(matcher.find()){
            String token=matcher.group().replaceAll("[),.;]+$","");
            if(token.length()>2100)continue;
            try{
                Uri uri=Uri.parse(token);
                if("https".equalsIgnoreCase(uri.getScheme())&&allowedHost(uri.getHost())){
                    sharedSource=token;sourceView.setText("Đã nhận link Taobao: "+token);return;
                }
            }catch(Exception ignored){}
        }
        sourceView.setText("Liên kết được chia sẻ không thuộc tên miền Taobao/Tmall hợp lệ.");
    }
    private boolean saveSharedImage(Uri source) throws Exception {
        if(source==null||!"content".equals(source.getScheme()))return false;
        String mime=getContentResolver().getType(source);
        String ext;
        if("image/jpeg".equals(mime))ext="jpg";
        else if("image/png".equals(mime))ext="png";
        else if("image/webp".equals(mime))ext="webp";
        else return false;
        Uri target=null;
        try(InputStream raw=getContentResolver().openInputStream(source)){
            if(raw==null)return false;
            BufferedInputStream in=new BufferedInputStream(raw);
            in.mark(32);
            byte[] header=new byte[12];int n=0;
            while(n<header.length){int k=in.read(header,n,header.length-n);if(k<0)break;n+=k;}
            if(!signatureMatches(header,n,mime))return false;
            in.reset();
            ContentValues values=new ContentValues();
            values.put(MediaStore.Images.Media.DISPLAY_NAME,"SD-"+System.currentTimeMillis()+"-"+java.util.UUID.randomUUID()+"."+ext);
            values.put(MediaStore.Images.Media.MIME_TYPE,mime);
            values.put(MediaStore.Images.Media.RELATIVE_PATH,"Pictures/SinDarealest Import");
            values.put(MediaStore.Images.Media.IS_PENDING,1);
            target=getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI,values);
            if(target==null)return false;
            long count=0;
            try(OutputStream out=getContentResolver().openOutputStream(target)){
                if(out==null)throw new IllegalStateException("Cannot open image destination");
                byte[] buf=new byte[64*1024];int read;
                while((read=in.read(buf))!=-1){count+=read;if(count>MAX_IMAGE_BYTES)throw new IllegalStateException("Image exceeds 20 MB");out.write(buf,0,read);}
            }
            if(count==0)throw new IllegalStateException("Empty image");
            ContentValues ready=new ContentValues();ready.put(MediaStore.Images.Media.IS_PENDING,0);
            if(getContentResolver().update(target,ready,null,null)<=0)throw new IllegalStateException("Cannot publish scoped image");
            return true;
        }catch(Exception error){if(target!=null)try{getContentResolver().delete(target,null,null);}catch(Exception ignored){}throw error;}
    }
    private static boolean signatureMatches(byte[] b,int n,String mime){
        if("image/jpeg".equals(mime))return n>=3&&(b[0]&255)==0xff&&(b[1]&255)==0xd8&&(b[2]&255)==0xff;
        if("image/png".equals(mime))return n>=8&&(b[0]&255)==0x89&&b[1]=='P'&&b[2]=='N'&&b[3]=='G';
        return "image/webp".equals(mime)&&n>=12&&b[0]=='R'&&b[1]=='I'&&b[2]=='F'&&b[3]=='F'&&b[8]=='W'&&b[9]=='E'&&b[10]=='B'&&b[11]=='P';
    }
    private void openImport() {
        Uri url=Uri.parse(ADMIN_IMPORT);
        if(!sharedSource.isEmpty())url=url.buildUpon().encodedFragment("source="+Uri.encode(sharedSource)).build();
        openTab(url.toString());
    }
    private void openTab(String url) {
        try{
            CustomTabsIntent tab=new CustomTabsIntent.Builder().setShowTitle(true)
                .setColorScheme(CustomTabsIntent.COLOR_SCHEME_SYSTEM).build();
            tab.launchUrl(this,Uri.parse(url));
        }catch(Exception error){
            try{startActivity(new Intent(Intent.ACTION_VIEW,Uri.parse(url)));}
            catch(Exception secondary){new AlertDialog.Builder(this).setMessage("Cần cài đặt hoặc cập nhật trình duyệt Chrome.").setPositiveButton("OK",null).show();}
        }
    }
}
