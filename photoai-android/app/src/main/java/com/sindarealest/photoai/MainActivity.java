package com.sindarealest.photoai;

import android.app.Activity;
import android.content.Intent;
import android.content.ContentResolver;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.StatFs;
import android.media.ExifInterface;
import android.util.LruCache;
import android.provider.DocumentsContract;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;
import com.google.mediapipe.framework.image.BitmapImageBuilder;
import com.google.mediapipe.tasks.core.BaseOptions;
import com.google.mediapipe.tasks.core.Delegate;
import com.google.mediapipe.tasks.vision.imageembedder.ImageEmbedder;
import com.google.mediapipe.tasks.components.containers.Embedding;
import android.graphics.Color;
import org.json.JSONArray;
import org.json.JSONObject;
import org.json.JSONException;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.io.IOException;
import java.net.URL;
import java.net.HttpURLConnection;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Android product catalog with on-device MediaPipe embeddings and optional HTTPS endpoint.
 *  Model grouping/color suggestions require user verification.
 */
public class MainActivity extends Activity {
    private static final int PICK_SOURCE=30, PICK_EXPORT=31;
    private static final String MODEL_ASSET="mobilenet_v3_small.tflite";
    private WebView web;
    private final Handler ui=new Handler(Looper.getMainLooper());
    private final ExecutorService worker=Executors.newSingleThreadExecutor();
    private final Map<String,Uri> photoUris=new HashMap<>();
    private String pendingExport;
    private Uri sourceTree;
    // Small thumbnails avoid decoding hundreds of original 10–30 MP photos inside WebView.
    private final LruCache<String,byte[]> thumbCache=new LruCache<String,byte[]>(16*1024*1024){
        @Override protected int sizeOf(String key,byte[] value){return value.length;}
    };
    private byte[] thumbnail(Uri uri, int size)throws Exception{
        BitmapFactory.Options bounds=new BitmapFactory.Options();bounds.inJustDecodeBounds=true;
        try(InputStream input=getContentResolver().openInputStream(uri)){BitmapFactory.decodeStream(input,null,bounds);}
        if(bounds.outWidth<=0||bounds.outHeight<=0)throw new IOException("Ảnh không hợp lệ");
        BitmapFactory.Options options=new BitmapFactory.Options();options.inSampleSize=1;
        while((Math.max(bounds.outWidth,bounds.outHeight)/options.inSampleSize)>size*2)options.inSampleSize*=2;
        Bitmap original;
        try(InputStream input=getContentResolver().openInputStream(uri)){original=BitmapFactory.decodeStream(input,null,options);}
        if(original==null)throw new IOException("Không đọc được ảnh");
        int orientation=ExifInterface.ORIENTATION_NORMAL;
        try(InputStream input=getContentResolver().openInputStream(uri)){
            orientation=new ExifInterface(input).getAttributeInt(ExifInterface.TAG_ORIENTATION,ExifInterface.ORIENTATION_NORMAL);
        }catch(Exception ignored){}
        android.graphics.Matrix matrix=new android.graphics.Matrix();
        if(orientation==ExifInterface.ORIENTATION_ROTATE_90)matrix.postRotate(90);
        else if(orientation==ExifInterface.ORIENTATION_ROTATE_180)matrix.postRotate(180);
        else if(orientation==ExifInterface.ORIENTATION_ROTATE_270)matrix.postRotate(270);
        else if(orientation==ExifInterface.ORIENTATION_FLIP_HORIZONTAL)matrix.preScale(-1,1);
        else if(orientation==ExifInterface.ORIENTATION_FLIP_VERTICAL)matrix.preScale(1,-1);
        Bitmap rotated=Bitmap.createBitmap(original,0,0,original.getWidth(),original.getHeight(),matrix,true);
        if(rotated!=original)original.recycle();
        int width=rotated.getWidth(),height=rotated.getHeight();
        float scale=Math.min(1f,(float)size/Math.max(width,height));
        int w=Math.max(1,Math.round(width*scale)),h=Math.max(1,Math.round(height*scale));
        Bitmap output=(scale<1f)?Bitmap.createScaledBitmap(rotated,w,h,true):rotated;
        ByteArrayOutputStream out=new ByteArrayOutputStream();
        output.compress(Bitmap.CompressFormat.JPEG,80,out);
        if(output!=rotated)output.recycle();rotated.recycle();
        return out.toByteArray();
    }

    @Override public void onCreate(Bundle saved){super.onCreate(saved);

        web=new WebView(this);setContentView(web);
        web.setBackgroundColor(0xff08090c);
        WebSettings w=web.getSettings();w.setJavaScriptEnabled(true);w.setDomStorageEnabled(true);
        w.setAllowFileAccess(false);w.setAllowContentAccess(true);
        w.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        web.addJavascriptInterface(new Bridge(),"Native");
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
                // Never navigate the bridge-enabled WebView to untrusted remote pages.
                return !request.getUrl().toString().startsWith("file:///android_asset/");
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri req=request.getUrl();
                if("photoai.local".equals(req.getHost()) && req.getPath()!=null && req.getPath().startsWith("/media/")){
                    String pid=Uri.decode(req.getLastPathSegment());
                    Uri img; synchronized(photoUris){img=photoUris.get(pid);}
                    if(img!=null)try{
                        boolean full="1".equals(req.getQueryParameter("full"));
                        if(full){
                            // The preview never decodes the original 20–50 MP photograph in WebView.
                            // The untouched original is still copied byte-for-byte during export.
                            byte[] preview=thumbnail(img,1600);
                            return new WebResourceResponse("image/jpeg",null,new java.io.ByteArrayInputStream(preview));
                        }
                        String key=pid;
                        byte[] data;
                        synchronized(thumbCache){data=thumbCache.get(key);}
                        if(data==null){data=thumbnail(img,400);synchronized(thumbCache){thumbCache.put(key,data);}}
                        return new WebResourceResponse("image/jpeg",null,new java.io.ByteArrayInputStream(data));
                    }catch(Exception ignored){}
                    return new WebResourceResponse("text/plain","UTF-8",new java.io.ByteArrayInputStream(new byte[0]));
                }
                return super.shouldInterceptRequest(view,request);
            }
        });
        web.loadUrl("file:///android_asset/index.html");
    }
    private String imageMime(Uri uri){
        String mime=getContentResolver().getType(uri);
        if(mime!=null&&mime.startsWith("image/"))return mime;
        try(InputStream is=getContentResolver().openInputStream(uri)){
            BitmapFactory.Options opt=new BitmapFactory.Options();opt.inJustDecodeBounds=true;BitmapFactory.decodeStream(is,null,opt);
            if(opt.outMimeType!=null)return opt.outMimeType;
        }catch(Exception ignored){}
        return "image/jpeg";
    }
    private void js(String method,String json){ui.post(()->web.evaluateJavascript("window.PhotoApp."+method+"("+JSONObject.quote(json)+")",null));}
    private void jsCall(String method,String jsArgs){ui.post(()->web.evaluateJavascript("window.PhotoApp."+method+"("+jsArgs+")",null));}
    private void message(String msg){ui.post(()->Toast.makeText(this,msg,Toast.LENGTH_LONG).show());}

    public class Bridge{
        @JavascriptInterface public void pickSource(){ui.post(()->{
            Intent it=new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);it.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
            startActivityForResult(it,PICK_SOURCE);
        });}
        @JavascriptInterface public void pickExport(String state){pendingExport=state;ui.post(()->{
            Intent it=new Intent(Intent.ACTION_OPEN_DOCUMENT_TREE);it.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION);
            startActivityForResult(it,PICK_EXPORT);
        });}
        @JavascriptInterface public void saveState(String state){getPreferences(0).edit().putString("state",state).apply();}
        @JavascriptInterface public String loadState(){String saved=getPreferences(0).getString("state","");
            try{JSONObject s=new JSONObject(saved);
                String root=s.optString("rootUri","");if(!root.isEmpty())sourceTree=Uri.parse(root);
                JSONArray photos=s.optJSONArray("photos");if(photos!=null)for(int i=0;i<photos.length();i++){
                JSONObject p=photos.getJSONObject(i);if(p.has("uri")){synchronized(photoUris){photoUris.put(p.getString("id"),Uri.parse(p.getString("uri")));}}}
            }catch(Exception ignored){}
            return saved;
        }
        @JavascriptInterface public String deviceInfo(){try{
            long mem=0;android.app.ActivityManager mgr=(android.app.ActivityManager)getSystemService(ACTIVITY_SERVICE);
            android.app.ActivityManager.MemoryInfo mi=new android.app.ActivityManager.MemoryInfo();mgr.getMemoryInfo(mi);mem=mi.totalMem/(1024L*1024L);
            JSONObject o=new JSONObject();o.put("brand",Build.MANUFACTURER);o.put("model",Build.MODEL);o.put("ramMb",mem);o.put("processors",Runtime.getRuntime().availableProcessors());
            o.put("suggested","local");return o.toString();
        }catch(Exception e){return "{}";}}
        @JavascriptInterface public void analyze(String input){worker.execute(()->doAnalyze(input));}
    }
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);
        if(result!=RESULT_OK||data==null||data.getData()==null)return;
        Uri tree=data.getData();
        int flags=data.getFlags()&(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
        try{getContentResolver().takePersistableUriPermission(tree,flags);}catch(Exception ignored){}
        if(request==PICK_SOURCE){worker.execute(()->scan(tree));}
        if(request==PICK_EXPORT){String state=pendingExport;pendingExport=null;
            if(exportInsideSource(sourceTree,tree)){
                message("Để bảo vệ ảnh gốc, hãy chọn thư mục xuất nằm NGOÀI thư mục nguồn.");return;
            }
            if(state!=null)worker.execute(()->export(tree,state));}
    }
    /** Reject source and descendants on SAF providers using hierarchical document IDs.
     *  SAF providers with opaque IDs cannot prove ancestry; owners should select a separate output tree.
     */
    private static boolean exportInsideSource(Uri source,Uri destination){
        if(source==null||destination==null)return false;
        if(source.equals(destination))return true;
        if(!String.valueOf(source.getAuthority()).equals(String.valueOf(destination.getAuthority())))return false;
        try{
            String parent=DocumentsContract.getTreeDocumentId(source);
            String selected=DocumentsContract.getTreeDocumentId(destination);
            return selected.equals(parent)||selected.startsWith(parent+"/");
        }catch(Exception ex){return false;}
    }
    private static class Doc { final Uri uri;final String name;final String mime;final boolean dir;
        Doc(Uri u,String n,String m,boolean d){uri=u;name=n;mime=m;dir=d;}}
    private List<Doc> children(Uri tree,Uri dir)throws Exception{
        List<Doc> docs=new ArrayList<>();
        Uri query=DocumentsContract.buildChildDocumentsUriUsingTree(tree,DocumentsContract.getDocumentId(dir));
        try(Cursor c=getContentResolver().query(query,new String[]{DocumentsContract.Document.COLUMN_DOCUMENT_ID,DocumentsContract.Document.COLUMN_DISPLAY_NAME,DocumentsContract.Document.COLUMN_MIME_TYPE},null,null,null)){
            if(c!=null)while(c.moveToNext()){
                String did=c.getString(0),name=c.getString(1),mime=c.getString(2);
                docs.add(new Doc(DocumentsContract.buildDocumentUriUsingTree(tree,did),name,mime,DocumentsContract.Document.MIME_TYPE_DIR.equals(mime)));
            }
        }return docs;
    }
    private boolean isImage(Doc doc){if(doc.mime!=null&&doc.mime.startsWith("image/"))return true;
        String s=doc.name.toLowerCase();return s.matches(".*\\.(png|jpe?g|webp|bmp|gif|trash)");}
    private boolean decodes(Uri uri){try(InputStream is=getContentResolver().openInputStream(uri)){
        BitmapFactory.Options o=new BitmapFactory.Options();o.inJustDecodeBounds=true;BitmapFactory.decodeStream(is,null,o);return o.outWidth>0&&o.outHeight>0;
    }catch(Exception e){return false;}}
    private void scan(Uri tree){try{
        JSONObject state=new JSONObject();JSONArray photos=new JSONArray();
        String rootName="Ảnh sản phẩm";
        Uri rootDoc=DocumentsContract.buildDocumentUriUsingTree(tree,DocumentsContract.getTreeDocumentId(tree));
        try(Cursor c=getContentResolver().query(rootDoc,new String[]{DocumentsContract.Document.COLUMN_DISPLAY_NAME},null,null,null)){
            if(c!=null&&c.moveToFirst())rootName=c.getString(0);
        }catch(Exception ignored){}
        String rootId=DocumentsContract.getTreeDocumentId(tree);
        Uri root=DocumentsContract.buildDocumentUriUsingTree(tree,rootId);
        // Transactional import: never replace the current photo ID/URI table until scanning succeeds.
        Map<String,Uri> importedUris=new HashMap<>();
        walk(tree,root,new ArrayList<String>(),rootName,photos,importedUris,new int[]{0},0);
        synchronized(photoUris){photoUris.clear();photoUris.putAll(importedUris);}
        sourceTree=tree;
        synchronized(thumbCache){thumbCache.evictAll();}
        state.put("rootName",rootName);state.put("rootUri",tree.toString());state.put("photos",photos);
        js("onImported",state.toString());
    }catch(Exception ex){message("Không đọc được thư mục: "+ex.getMessage());}}
    private static boolean isCategoryName(String value){
        String n=value.toLowerCase(java.util.Locale.ROOT);
        return n.contains("giày")||n.contains("dép")||n.contains("thắt lưng")||n.contains("ví")||n.contains("túi")||n.contains("clutch")||n.contains("golf")||n.contains("mũ")||n.contains("ốp")||n.contains("đồng hồ")||n.contains("quần")||n.contains("áo");
    }
    private void walk(Uri tree,Uri dir,List<String> parents,String rootName,JSONArray photos,Map<String,Uri> importedUris,int[] count,int depth)throws Exception{
        if(depth>16)return;
        for(Doc d:children(tree,dir)){
            if(d.dir){List<String> next=new ArrayList<>(parents);next.add(d.name);walk(tree,d.uri,next,rootName,photos,importedUris,count,depth+1);continue;}
            if(!isImage(d)||!decodes(d.uri))continue;
            String id="p"+ (++count[0]);
            importedUris.put(id,d.uri);
            boolean singleCategory=isCategoryName(rootName)&& !rootName.toLowerCase(java.util.Locale.ROOT).contains("sp order");
            String category=singleCategory?rootName:(parents.isEmpty()?"Chưa phân loại":parents.get(0));
            int index=singleCategory?0:1;
            String oldModel=parents.size()>index?parents.get(index):"";
            String oldColor=parents.size()>index+1?parents.get(index+1):"Chưa rõ";
            JSONObject p=new JSONObject();p.put("id",id);p.put("name",d.name);p.put("category",category);
            p.put("sourceModel",oldModel);p.put("sourceColor",oldColor);
            p.put("relativePath",String.join("/",parents));p.put("uri",d.uri.toString());photos.put(p);
        }
    }
    private Uri makeDir(Uri parent,String name)throws Exception{
        Uri created=DocumentsContract.createDocument(getContentResolver(),parent,DocumentsContract.Document.MIME_TYPE_DIR,clean(name));
        if(created==null)throw new IOException("Không tạo được thư mục: "+name);return created;
    }
    private static String clean(String x){String s=x==null?"Chua_ro":x.replaceAll("[\\\\/:*?\"<>|]","_").trim();return s.length()==0?"Chua_ro":s.length()>100?s.substring(0,100):s;}
    private void export(Uri tree,String raw){try{
        JSONObject state=new JSONObject(raw);JSONArray photos=state.getJSONArray("photos");JSONArray models=state.getJSONArray("models");
        Map<String,JSONObject> indexed=new HashMap<>();for(int i=0;i<models.length();i++){JSONObject m=models.getJSONObject(i);indexed.put(m.getString("id"),m);}
        Uri root=makeDir(tree,"SinDarealest_Export_"+System.currentTimeMillis());
        HashMap<String,Uri> dirs=new HashMap<>();Set<String> seen=new HashSet<>();
        JSONObject metadata=new JSONObject();metadata.put("schema",2);metadata.put("exportedAt",System.currentTimeMillis());
        JSONArray modelData=new JSONArray();for(int i=0;i<models.length();i++){
            JSONObject m=models.getJSONObject(i);
            JSONObject item=new JSONObject().put("id",m.optString("id")).put("name",m.optString("name"))
                .put("category",m.optString("category")).put("priceVnd",m.isNull("priceVnd")?JSONObject.NULL:m.opt("priceVnd"))
                .put("verified",m.optBoolean("verified",false)).put("editedByUser",m.optBoolean("editedByUser",false));
            modelData.put(item);
        }
        metadata.put("models",modelData);
        JSONArray photoData=new JSONArray();
        for(int i=0;i<photos.length();i++){
            JSONObject p=photos.getJSONObject(i);JSONObject m=indexed.get(p.optString("modelId"));
            String category=clean(p.optString("category","Chua_phan_loai")),model=clean(m==null?"Chua_nhom":m.optString("name","Chua_nhom")),color=clean(p.optString("color","Chua_ro"));
            String key=category+"/"+(m==null?"chua_nhom":m.optString("id"))+"/"+color;
            Uri dest=dirs.get(key);if(dest==null){
                Uri c=dirs.get(category);if(c==null){c=makeDir(root,category);dirs.put(category,c);}
                String mk=category+"/"+(m==null?"chua_nhom":m.optString("id"));
                Uri md=dirs.get(mk);if(md==null){md=makeDir(c,model+"__"+clean(m==null?"chua_nhom":m.optString("id")));dirs.put(mk,md);}
                dest=makeDir(md,color);dirs.put(key,dest);
            }
            Uri src=Uri.parse(p.getString("uri"));String nm=p.optString("name","anh_"+i+".jpg");
            String mime=imageMime(src);
            if(!nm.toLowerCase(java.util.Locale.ROOT).matches(".*\\.(jpg|jpeg|png|webp|bmp|gif|heic|heif|avif)$")){
                String ext=mime.equals("image/png")?".png":mime.equals("image/webp")?".webp":
                    (mime.equals("image/heic")||mime.equals("image/heif"))?".heic":
                    mime.equals("image/avif")?".avif":mime.equals("image/gif")?".gif":
                    mime.equals("image/bmp")?".bmp":".jpg";
                nm=nm+ext;
            }
            String originalName=nm;String unique=key+"/"+nm;int seq=2;
            while(seen.contains(unique)){
                int dot=originalName.lastIndexOf('.');
                nm=(dot>=0?originalName.substring(0,dot):originalName)+"__"+(seq++)+(dot>=0?originalName.substring(dot):"");
                unique=key+"/"+nm;
            }
            seen.add(unique);
            Uri target=DocumentsContract.createDocument(getContentResolver(),dest,mime,nm);
            if(target==null)throw new IOException("Không tạo được tệp "+nm);
            try(InputStream is=getContentResolver().openInputStream(src);OutputStream os=getContentResolver().openOutputStream(target)){
                if(is==null||os==null)throw new IOException("Không mở được ảnh");byte[] buf=new byte[32768];int n;while((n=is.read(buf))!=-1)os.write(buf,0,n);
            }
            photoData.put(new JSONObject().put("id",p.optString("id"))
                .put("modelId",p.optString("modelId"))
                .put("category",p.optString("category"))
                .put("color",p.optString("color"))
                .put("name",p.optString("name"))
                .put("path",category+"/"+model+"__"+clean(m==null?"chua_nhom":m.optString("id"))+"/"+color+"/"+nm));
            if((i+1)%20==0||i+1==photos.length())jsCall("onExportUpdate",(i+1)+","+photos.length()+",null");
        }
        // Final manifest is a completion marker; do not leak source content:// URIs.
        metadata.put("photos",photoData);
        Uri meta=DocumentsContract.createDocument(getContentResolver(),root,"application/json","products.json");
        if(meta==null)throw new IOException("Không tạo được products.json");
        try(OutputStream os=getContentResolver().openOutputStream(meta)){
            if(os==null)throw new IOException("Không thể lưu metadata");
            os.write(metadata.toString(2).getBytes(StandardCharsets.UTF_8));
        }
        jsCall("onExportUpdate",photos.length()+","+photos.length()+",null");
    }catch(Exception ex){jsCall("onExportUpdate","0,0,"+JSONObject.quote(ex.getMessage()));}}

    private static final class Feature {final String id,name,category,color;final double[] vector;Feature(String i,String n,String c,String co,double[] v){id=i;name=n;category=c;color=co;vector=v;}}
    private Feature feature(JSONObject entry){String pid=entry.optString("id"),name=entry.optString("name"),cat=entry.optString("category","Chưa phân loại");
        Uri uri; synchronized(photoUris){uri=photoUris.get(pid);}if(uri==null)return new Feature(pid,name,cat,"Chưa rõ",new double[]{0,0,0});
        try(InputStream is=getContentResolver().openInputStream(uri)){
            BitmapFactory.Options o=new BitmapFactory.Options();o.inSampleSize=8;Bitmap b=BitmapFactory.decodeStream(is,null,o);
            if(b==null)return new Feature(pid,name,cat,"Chưa rõ",new double[]{0,0,0});
            int w=b.getWidth(),h=b.getHeight();double sr=0,sg=0,sb=0;int count=0;
            // Heuristic center region only. NOT reliable segmentation or foreground-aware color detection.
            for(int y=h/4;y<3*h/4;y+=Math.max(1,h/70))for(int x=w/4;x<3*w/4;x+=Math.max(1,w/70)){
                int px=b.getPixel(x,y);sr+=(px>>16)&255;sg+=(px>>8)&255;sb+=px&255;count++;
            }
            b.recycle();if(count==0)return new Feature(pid,name,cat,"Chưa rõ",new double[]{0,0,0});
            double r=sr/count,g=sg/count,bl=sb/count;
            // Deliberately conservative: unclear background/product separation => do not assign confident color.
            String color="Chưa rõ";
            return new Feature(pid,name,cat,color,new double[]{r/255d,g/255d,bl/255d});
        }catch(Exception e){return new Feature(pid,name,cat,"Chưa rõ",new double[]{0,0,0});}
    }
    private static class CandidateGroup {
        String id,category,name;
        List<float[]> vectors=new ArrayList<>();
        int count;
        CandidateGroup(String id,String category,String name){this.id=id;this.category=category;this.name=name;}
    }
    private static double cosine(float[] a,float[] b){
        double dot=0,aa=0,bb=0;
        for(int i=0;i<Math.min(a.length,b.length);i++){
            dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i];
        }
        return aa>0&&bb>0?dot/Math.sqrt(aa*bb):0;
    }
    private static String colorFromHSV(int px){
        float[] hsv=new float[3];Color.colorToHSV(px,hsv);
        float h=hsv[0],sat=hsv[1],val=hsv[2];
        if(val<.25f)return "Đen";
        if(sat<.14f)return val>.84f?"Trắng":"Xám";
        if(h<13||h>=345)return "Đỏ";
        if(h<52)return val<.77f?"Nâu":"Vàng";
        if(h<72)return "Vàng";
        if(h<170)return "Xanh lá";
        if(h<260)return "Xanh dương";
        if(h<345)return "Tím";
        return "Chưa rõ";
    }
    /** Conservative foreground color heuristic: no color guess when background removal is uncertain. */
    private static String estimateForegroundColor(Bitmap b){
        if(b==null||b.getWidth()<40||b.getHeight()<40)return "Chưa rõ";
        int w=b.getWidth(),h=b.getHeight();
        int[] corners={b.getPixel(w/20,h/20),b.getPixel(19*w/20,h/20),
            b.getPixel(w/20,19*h/20),b.getPixel(19*w/20,19*h/20)};
        double br=0,bg=0,bb=0;
        for(int c:corners){br+=Color.red(c);bg+=Color.green(c);bb+=Color.blue(c);}
        br/=4;bg/=4;bb/=4;
        double variance=0;
        for(int c:corners){double dr=Color.red(c)-br,dg=Color.green(c)-bg,db=Color.blue(c)-bb;
            variance+=(dr*dr+dg*dg+db*db)/4;
        }
        if(variance>4500)return "Chưa rõ"; // complex or multi-colored background
        Map<String,Integer> count=new HashMap<>();int total=0;
        int step=Math.max(2,Math.min(w,h)/80);
        for(int y=h/10;y<9*h/10;y+=step)for(int x=w/10;x<9*w/10;x+=step){
            int c=b.getPixel(x,y);
            double dr=Color.red(c)-br,dg=Color.green(c)-bg,db=Color.blue(c)-bb;
            if(dr*dr+dg*dg+db*db<2700)continue; // likely background
            String color=colorFromHSV(c);
            if(color.equals("Chưa rõ"))continue;
            count.put(color,count.getOrDefault(color,0)+1);total++;
        }
        if(total<120)return "Chưa rõ";
        String best="Chưa rõ";int votes=0;
        for(Map.Entry<String,Integer> e:count.entrySet())if(e.getValue()>votes){best=e.getKey();votes=e.getValue();}
        return votes>total*.57?best:"Chưa rõ";
    }
    private JSONObject localSuggest(JSONArray photos)throws Exception{
        JSONObject result=new JSONObject();JSONArray assignments=new JSONArray(),models=new JSONArray();
        Map<String,List<CandidateGroup>> groups=new HashMap<>();
        final double STRICT=.935,LOWER=.88;
        BaseOptions base=BaseOptions.builder()
            .setDelegate(Delegate.CPU)
            .setModelAssetPath(MODEL_ASSET).build();
        ImageEmbedder.ImageEmbedderOptions options=ImageEmbedder.ImageEmbedderOptions.builder()
            .setBaseOptions(base).build();
        ImageEmbedder embedder;
        try{embedder=ImageEmbedder.createFromOptions(this,options);}
        catch(Exception ex){throw new IOException("Không khởi tạo được mô hình AI offline. Kiểm tra bản APK đầy đủ: "+ex.getMessage(),ex);}
        try{
            for(int i=0;i<photos.length();i++){
                JSONObject p=photos.getJSONObject(i);
                String pid=p.optString("id"),name=p.optString("name"),cat=p.optString("category","Chưa phân loại");
                Uri uri; synchronized(photoUris){uri=photoUris.get(pid);}
                Bitmap bitmap=null;float[] vec=null;String color="Chưa rõ";
                try{
                    if(uri!=null){
                        byte[] preview=thumbnail(uri,448);
                        bitmap=BitmapFactory.decodeByteArray(preview,0,preview.length);
                        if(bitmap!=null){
                            color=estimateForegroundColor(bitmap);
                            Embedding e=embedder.embed(new BitmapImageBuilder(bitmap).build())
                                .embeddingResult().embeddings().get(0);
                            vec=e.floatEmbedding().clone();
                        }
                    }
                }catch(Exception ex){ android.util.Log.w("PhotoAI","Không phân tích được ảnh: "+name,ex); }
                finally{if(bitmap!=null)bitmap.recycle();}
                List<CandidateGroup> byCat=groups.computeIfAbsent(cat,k->new ArrayList<>());
                CandidateGroup target=null;double bestScore=-1;
                if(vec!=null)for(CandidateGroup candidate:byCat){
                    double max=-1,min=1;
                    for(float[] known:candidate.vectors){double sim=cosine(vec,known);max=Math.max(max,sim);min=Math.min(min,sim);}
                    // Complete-linkage guard avoids merging near-looking leather samples by chaining.
                    if(max>=STRICT&&min>=LOWER&&max>bestScore){bestScore=max;target=candidate;}
                }
                if(target==null){
                    target=new CandidateGroup("suggest_"+cat.hashCode()+"_"+(byCat.size()+1),cat,"Mẫu đề xuất "+String.format(java.util.Locale.ROOT,"%03d",byCat.size()+1));
                    byCat.add(target);
                }
                target.count++;if(vec!=null && target.vectors.size()<12)target.vectors.add(vec);
                assignments.put(new JSONObject().put("id",pid).put("modelId",target.id)
                    .put("color",color).put("confidence",bestScore>=STRICT?.72:.28));
                if((i+1)%5==0||i+1==photos.length())jsCall("onProgress",(i+1)+","+photos.length());
            }
            for(List<CandidateGroup> byCat:groups.values())for(CandidateGroup g:byCat){
                models.put(new JSONObject().put("id",g.id).put("category",g.category)
                    .put("name",g.name).put("verified",false).put("priceVnd",JSONObject.NULL));
            }
            result.put("models",models).put("photos",assignments).put("engine","mediapipe_mobilenet_v3_small");
            return result;
        }finally{embedder.close();}
    }
    private JSONObject remoteSuggest(String endpoint,String token,JSONArray photos)throws Exception{
        URL serviceUrl=new URL(endpoint);
        if(!"https".equalsIgnoreCase(serviceUrl.getProtocol()) || serviceUrl.getUserInfo()!=null || serviceUrl.getHost().isEmpty())
            throw new IOException("Cloud chỉ chấp nhận địa chỉ HTTPS.");
        // Explicit HTTPS service contract; no provider/endpoint is bundled or silently used.
        // This baseline API has no multi-batch regrouping contract yet: refuse huge cloud payloads.
        if(photos.length()>150)throw new IOException("Cloud hiện giới hạn 150 ảnh/lượt để tránh hết RAM; dùng AI trên máy cho thư mục lớn.");
        JSONArray upload=new JSONArray();for(int i=0;i<photos.length();i++){
            JSONObject p=photos.getJSONObject(i);JSONObject item=new JSONObject();item.put("id",p.getString("id"));item.put("name",p.optString("name"));item.put("category",p.optString("category"));
            Uri uri; synchronized(photoUris){uri=photoUris.get(p.getString("id"));}
            if(uri==null)continue;
            try(InputStream is=getContentResolver().openInputStream(uri)){
                BitmapFactory.Options opt=new BitmapFactory.Options();opt.inSampleSize=8;Bitmap b=BitmapFactory.decodeStream(is,null,opt);if(b==null)continue;
                double ratio=Math.min(1.0,320.0/Math.max(b.getWidth(),b.getHeight()));
                Bitmap scaled=Bitmap.createScaledBitmap(b,Math.max(1,(int)(b.getWidth()*ratio)),Math.max(1,(int)(b.getHeight()*ratio)),true);
                ByteArrayOutputStream bs=new ByteArrayOutputStream();scaled.compress(Bitmap.CompressFormat.JPEG,60,bs);item.put("thumbnail_base64",Base64.getEncoder().encodeToString(bs.toByteArray()));b.recycle();scaled.recycle();
            }upload.put(item);
        }
        JSONObject body=new JSONObject().put("schema",1).put("photos",upload);
        HttpURLConnection conn=(HttpURLConnection)serviceUrl.openConnection();
        conn.setInstanceFollowRedirects(false);
        conn.setRequestMethod("POST");conn.setConnectTimeout(30000);conn.setReadTimeout(120000);conn.setDoOutput(true);conn.setRequestProperty("Content-Type","application/json; charset=utf-8");
        if(token!=null&&!token.trim().isEmpty())conn.setRequestProperty("Authorization","Bearer "+token.trim());
        try(OutputStream out=conn.getOutputStream()){out.write(body.toString().getBytes(StandardCharsets.UTF_8));}
        if(conn.getResponseCode()!=200)throw new IOException("Dịch vụ Cloud trả mã "+conn.getResponseCode());
        try(InputStream ins=conn.getInputStream()){ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[4096];int n;while((n=ins.read(buf))!=-1){out.write(buf,0,n);if(out.size()>5_000_000)throw new IOException("Phản hồi quá lớn");}return new JSONObject(out.toString("UTF-8"));}
        finally{conn.disconnect();}
    }
    private void doAnalyze(String raw){try{
        JSONObject req=new JSONObject(raw);String mode=req.optString("mode","manual");JSONArray photos=req.getJSONArray("photos");
        if(mode.equals("manual")){js("onAnalysis",new JSONObject().put("error","AI đang tắt. Bạn có thể sắp xếp thủ công.").toString());return;}
        JSONObject result;
        if(mode.equals("cloud")){
            if(!req.optBoolean("cloudConsent"))throw new IOException("Bạn chưa đồng ý gửi ảnh lên Cloud.");
            result=remoteSuggest(req.optString("cloudEndpoint"),req.optString("cloudToken"),photos);
        }
        else if(mode.equals("hybrid")){
            result=localSuggest(photos);
            if(req.optBoolean("cloudConsent")&&!req.optString("cloudEndpoint").isEmpty()){
                // Cloud service is optional; if unavailable keep low-confidence local suggestions.
                try{result=remoteSuggest(req.optString("cloudEndpoint"),req.optString("cloudToken"),photos);}catch(Exception ex){result.put("cloudWarning",ex.getMessage());}
            }
        }else result=localSuggest(photos);
        if(!result.has("photos")||!result.has("models"))throw new IOException("Cloud phản hồi thiếu photos/models");
        js("onAnalysis",result.toString());
    }catch(Exception ex){try{js("onAnalysis",new JSONObject().put("error",ex.getMessage()).toString());}catch(Exception ignored){}}}
}
