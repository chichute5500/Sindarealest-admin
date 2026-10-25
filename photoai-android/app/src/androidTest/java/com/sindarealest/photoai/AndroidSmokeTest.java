package com.sindarealest.photoai;

import android.graphics.Bitmap;
import android.graphics.Color;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import com.google.mediapipe.framework.image.BitmapImageBuilder;
import com.google.mediapipe.tasks.core.BaseOptions;
import com.google.mediapipe.tasks.core.Delegate;
import com.google.mediapipe.tasks.vision.imageembedder.ImageEmbedder;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.lang.reflect.Field;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Hardware-independent Android emulator smoke tests. Never mutates customer photos. */
@RunWith(AndroidJUnit4.class)
public class AndroidSmokeTest {
    @Test public void realOfflineModelEmbedsBitmap() throws Exception {
        BaseOptions base = BaseOptions.builder()
            .setModelAssetPath("mobilenet_v3_small.tflite")
            .setDelegate(Delegate.CPU).build();
        ImageEmbedder.ImageEmbedderOptions options=ImageEmbedder.ImageEmbedderOptions.builder()
            .setBaseOptions(base).build();
        Bitmap b=Bitmap.createBitmap(224,224,Bitmap.Config.ARGB_8888);
        try {
            for(int y=0;y<224;y++)for(int x=0;x<224;x++)
                b.setPixel(x,y,Color.rgb(x,y,(x+y)/2));
            try(ImageEmbedder embedder=ImageEmbedder.createFromOptions(
                InstrumentationRegistry.getInstrumentation().getTargetContext(),options)) {
                float[] features=embedder.embed(new BitmapImageBuilder(b).build())
                    .embeddingResult().embeddings().get(0).floatEmbedding();
                assertNotNull("No embeddings from MobileNet",features);
                assertTrue("Too few embedding dimensions",features.length>=64);
                double sum=0;
                for(float value:features) {assertTrue("Nonfinite inference",Float.isFinite(value));sum+=Math.abs(value);}
                assertTrue("All-zero embedding",sum>0.00001);
            }
        }finally{b.recycle();}
    }

    @Test public void mainActivityStartsAndLoadsLocalApp() throws Exception {
        try(ActivityScenario<MainActivity> scenario=ActivityScenario.launch(MainActivity.class)){
            String result="";
            for(int attempt=0;attempt<12;attempt++){
                CountDownLatch latch=new CountDownLatch(1);
                AtomicReference<String> actual=new AtomicReference<>("false");
                scenario.onActivity(activity->{
                    try {
                        Field field=MainActivity.class.getDeclaredField("web");
                        field.setAccessible(true);
                        WebView view=(WebView)field.get(activity);
                        view.evaluateJavascript("(function(){return !!window.PhotoApp && !!document.getElementById('searchInput') && !!document.getElementById('analyzeBtn') && !!document.getElementById('exportBtn')})()",
                            value->{actual.set(value);latch.countDown();});
                    }catch(Exception ex){actual.set(ex.toString());latch.countDown();}
                });
                assertTrue("WebView callback timed out",latch.await(10,TimeUnit.SECONDS));
                result=actual.get();
                if("true".equals(result))return;
                Thread.sleep(500);
            }
            fail("Android UI did not initialize: "+result);
        }
    }
}
