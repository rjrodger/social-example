package org.apache.cordova.example;

import android.app.Activity;
import android.os.Bundle;
import org.apache.cordova.*;

import com.flurry.android.FlurryAgent;

public class cordovaExample extends DroidGap
{
    @Override
    public void onCreate(Bundle savedInstanceState)
    {
        super.onCreate(savedInstanceState);
        super.loadUrl("file:///android_asset/www/index.html");
    }
    
    
    // Flurry SDK
    
    public void onStart()
    {
       super.onStart();
       FlurryAgent.onStartSession(this, "QJJUDN3AB8EWZTH4R2YS");
    }
    
    public void onStop()
    {
       super.onStop();
       FlurryAgent.onEndSession(this);
    }
}

