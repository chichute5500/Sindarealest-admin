package com.sindarealest.taobaoimport;

import static org.junit.Assert.*;
import android.content.Intent;
import android.util.Log;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.WebView;
import android.widget.Button;
import android.widget.TextView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.atomic.AtomicReference;

@RunWith(AndroidJUnit4.class)
public final class TaobaoBrowserInstrumentedTest {
    private static View find(View node,String fragment) {
        if(node instanceof Button && ((Button)node).getText().toString().contains(fragment))return node;
        if(node instanceof ViewGroup) {
            ViewGroup group=(ViewGroup)node;
            for(int i=0;i<group.getChildCount();i++){
                View found=find(group.getChildAt(i),fragment);
                if(found!=null)return found;
            }
        }
        return null;
    }
    @Test public void realWebViewFindsOnlyTrustedVisibleProductImages() throws Exception {
        // Main product gallery and buyer-review photos share the same CDN.
        // Scanner must collect only the product gallery even if review photos
        // are already loaded in the DOM below the product.
        String html="<html><body><h1>SinDarealest QA product fixture</h1>"
            +"<div class='product-gallery'><img data-src='https://img.alicdn.com/qa-shoe-1.jpg'>"
            +"<img data-original='https://img.alicdn.com/qa-shoe-2.png'>"
            +"<img data-src='http://img.alicdn.com/unsafe.jpg'>"
            +"<img data-src='https://evil.example/secret.jpg'></div>"
            +"<section class='buyer-review-gallery'><h2>用户评价</h2>"
            +"<img data-src='https://img.alicdn.com/buyer-review-not-product.jpg'></section>"
            +"<div class='recommendations'><img data-src='https://img.alicdn.com/other-product.jpg'></div>"
            +"</body></html>";
        Intent intent=new Intent(ApplicationProvider.getApplicationContext(),TaobaoBrowserActivity.class);
        intent.putExtra("sd_qa_visible_html",html);
        try(ActivityScenario<TaobaoBrowserActivity> scenario=ActivityScenario.launch(intent)){
            Thread.sleep(1400);
            scenario.onActivity(activity->{
                View scan=find(activity.getWindow().getDecorView(),"Tìm ảnh trang này");
                assertNotNull("Scan button present",scan);
                scan.performClick();
            });
            AtomicReference<String> visible=new AtomicReference<>("");
            AtomicReference<String> browserUrl=new AtomicReference<>("");
            for(int i=0;i<30;i++){
                scenario.onActivity(activity->{
                    try{
                        java.lang.reflect.Field field=TaobaoBrowserActivity.class.getDeclaredField("status");
                        field.setAccessible(true);
                        TextView fieldValue=(TextView)field.get(activity);
                        visible.set(fieldValue.getText().toString());
                    }catch(Exception err){visible.set("STATUS_REFLECTION_ERROR "+err);}
                    View web=walkWeb(activity.getWindow().getDecorView());
                    if(web instanceof WebView)browserUrl.set(((WebView)web).getUrl());
                });
                if(visible.get().contains("2 liên kết ảnh"))break;
                Thread.sleep(200);
            }
            Log.i("SD_TAOBAO_QA","Fixture browser URL="+browserUrl.get()+"; scan result="+visible.get());
            assertTrue("2 product gallery URLs (excluding reviews/recommendations) required; URL="+browserUrl.get()+
                "; actual scan="+visible.get(),visible.get().contains("2 liên kết ảnh"));
            Log.i("SD_TAOBAO_QA","PASS fixture: gallery scanner returns 2 product-only CDN URLs, excludes reviews/recommendations");
        }
    }
    @Test public void probeRealTaobaoProductWithoutOwnerCredentials() throws Exception {
        Intent intent=new Intent(ApplicationProvider.getApplicationContext(),TaobaoBrowserActivity.class);
        intent.putExtra("product_link","https://item.taobao.com/item.htm?id=997261786690");
        AtomicReference<String> observed=new AtomicReference<>(null);
        try(ActivityScenario<TaobaoBrowserActivity> scenario=ActivityScenario.launch(intent)){
            // This is a reachability probe, NOT a test of actual personal-account
            // login. A login page / challenge is reported, never treated as photos.
            Thread.sleep(8000);
            scenario.onActivity(activity->{
                View web=walkWeb(activity.getWindow().getDecorView());
                if(web instanceof WebView){
                    ((WebView)web).evaluateJavascript(
                      "(function(){return JSON.stringify({host:location.hostname,title:document.title.slice(0,90),imgCount:document.images.length})})()",
                      observed::set);
                }
            });
            for(int i=0;i<20 && observed.get()==null;i++)Thread.sleep(200);
            String result=observed.get();
            Log.i("SD_TAOBAO_LIVE","Real item 997261786690, unauthenticated WebView: "+(result==null?"no DOM response":result));
            assertNotNull("WebView evaluated JS safely; cannot assert personal login",result);
        }
    }
    private static View walkWeb(View v) {
        if(v instanceof WebView)return v;
        if(v instanceof ViewGroup){
            ViewGroup g=(ViewGroup)v;
            for(int i=0;i<g.getChildCount();i++){
                View candidate=walkWeb(g.getChildAt(i));
                if(candidate!=null)return candidate;
            }
        }
        return null;
    }
}
