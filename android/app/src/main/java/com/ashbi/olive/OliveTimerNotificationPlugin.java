package com.ashbi.olive;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import androidx.core.app.NotificationCompat;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

@CapacitorPlugin(
    name = "OliveTimerNotification",
    permissions = @Permission(alias = "notifications", strings = { Manifest.permission.POST_NOTIFICATIONS })
)
public class OliveTimerNotificationPlugin extends Plugin {
    private static final String CHANNEL_ID = "olive_active_timer";
    private static final int NOTIFICATION_ID = 411;
    private static final String GENERATION_KEY = "_oliveNotificationGeneration";
    private final NotificationGeneration notificationGeneration = new NotificationGeneration();

    @PluginMethod
    public void start(PluginCall call) {
        int generation = notificationGeneration.begin();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
            && getPermissionState("notifications") != PermissionState.GRANTED) {
            call.getData().put(GENERATION_KEY, generation);
            requestPermissionForAlias("notifications", call, "notificationPermissionResult");
            return;
        }
        showTimer(call, generation);
    }

    @PermissionCallback
    private void notificationPermissionResult(PluginCall call) {
        Integer generation = call.getData().getInteger(GENERATION_KEY);
        if (generation == null || !notificationGeneration.isCurrent(generation)) {
            JSObject result = new JSObject();
            result.put("enabled", false);
            result.put("reason", "superseded");
            call.resolve(result);
            return;
        }
        if (getPermissionState("notifications") == PermissionState.GRANTED) {
            showTimer(call, generation);
        } else {
            call.reject("Notification permission was not granted");
        }
    }

    private void showTimer(PluginCall call, int generation) {
        Long startEpochMs = call.getLong("startEpochMs");
        if (startEpochMs == null || startEpochMs <= 0) {
            call.reject("A valid startEpochMs is required");
            return;
        }

        Context context = getContext();
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                context.getString(R.string.timer_notification_channel),
                NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription(context.getString(R.string.timer_notification_channel_description));
            channel.setSound(null, null);
            channel.enableVibration(false);
            manager.createNotificationChannel(channel);
        }

        Intent openApp = new Intent(context, MainActivity.class)
            .setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent contentIntent = PendingIntent.getActivity(
            context,
            0,
            openApp,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder notification = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_olive_timer)
            .setContentTitle(context.getString(R.string.timer_notification_title))
            .setContentText(context.getString(R.string.timer_notification_body))
            .setContentIntent(contentIntent)
            .setWhen(startEpochMs)
            .setUsesChronometer(true)
            .setChronometerCountDown(false)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setSilent(true)
            .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
            .setPriority(NotificationCompat.PRIORITY_LOW);

        if (!notificationGeneration.isCurrent(generation)) {
            JSObject result = new JSObject();
            result.put("enabled", false);
            result.put("reason", "superseded");
            call.resolve(result);
            return;
        }
        manager.notify(NOTIFICATION_ID, notification.build());
        call.resolve(new JSObject());
    }

    @PluginMethod
    public void stop(PluginCall call) {
        notificationGeneration.invalidate();
        NotificationManager manager = (NotificationManager) getContext().getSystemService(Context.NOTIFICATION_SERVICE);
        manager.cancel(NOTIFICATION_ID);
        call.resolve(new JSObject());
    }
}
