package com.sindarealest.admin;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.Map;

/** Native high-priority FCM data delivery; works without an open WebView. */
public final class OwnerMessagingService extends FirebaseMessagingService {
    private static final String CHANNEL = "sindarealest_owner_events";

    @Override public void onNewToken(String token) {
        getSharedPreferences("sd_android_owner",MODE_PRIVATE).edit().putString("fcmToken",token).apply();
        // MainActivity re-registers with the authenticated Admin session on resume.
    }

    @Override public void onMessageReceived(RemoteMessage message) {
        Map<String,String> payload=message.getData();
        String title=payload.get("title");
        String text=payload.get("body");
        if(title==null||title.isEmpty())title="SinDarealest Admin";
        if(text==null||text.isEmpty())text="Có hoạt động mới trong quản trị.";
        title=title.length()>100?title.substring(0,100):title;
        text=text.length()>200?text.substring(0,200):text;
        NotificationManager nm=(NotificationManager)getSystemService(Context.NOTIFICATION_SERVICE);
        if(nm==null)return;
        if(Build.VERSION.SDK_INT>=26 && nm.getNotificationChannel(CHANNEL)==null){
            NotificationChannel ch=new NotificationChannel(CHANNEL,"Đơn hàng và hoạt động Admin",NotificationManager.IMPORTANCE_HIGH);
            nm.createNotificationChannel(ch);
        }
        Intent open=new Intent(this,MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent tap=PendingIntent.getActivity(this,(int)(System.currentTimeMillis() & 0x7fffffff),open,
                PendingIntent.FLAG_IMMUTABLE|PendingIntent.FLAG_UPDATE_CURRENT);
        NotificationCompat.Builder notification=new NotificationCompat.Builder(this,CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title).setContentText(text)
            .setStyle(new NotificationCompat.BigTextStyle().bigText(text))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true).setContentIntent(tap).setVisibility(NotificationCompat.VISIBILITY_PRIVATE);
        try{nm.notify((int)(System.nanoTime() & 0x7fffffff),notification.build());}
        catch(SecurityException ignored){ /* Android 13 permission denied; never crash. */ }
    }
}
