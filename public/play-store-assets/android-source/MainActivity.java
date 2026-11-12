package com.sonamonirpathshala.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Log;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.RequestConfiguration;
import com.google.android.gms.ads.initialization.InitializationStatus;
import com.google.android.gms.ads.initialization.OnInitializationCompleteListener;

import java.util.Collections;

/**
 * সোনামণির পাঠশালা - Main Activity
 * Google Mobile Ads SDK (AdMob) Banner ও Child-Safe Families Policy Implementation
 */
public class MainActivity extends AppCompatActivity {

    private static final String TAG = "SonamonirAdMob";

    // আপনার আসল Production AdMob আইডি
    public static final String ADMOB_APP_ID = "ca-app-pub-4591170818423623~7017300992";
    public static final String ADMOB_BANNER_UNIT_ID = "ca-app-pub-4591170818423623/5258241626";

    // টেস্ট করার জন্য গুগল অফিসিয়াল টেস্ট আইডি (প্রয়োজনে ব্যবহার করতে পারেন)
    public static final String ADMOB_TEST_BANNER_ID = "ca-app-pub-3940256099942544/6300978111";

    private AdView adView;
    private FrameLayout adContainerView;
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        adContainerView = findViewById(R.id.ad_banner_container);
        webView = findViewById(R.id.main_webview);

        // ১. Google Play Families Policy: শিশুদের গোপনীয়তা নীতি (COPPA) অনুযায়ী কনফিগারেশন
        RequestConfiguration requestConfiguration = new RequestConfiguration.Builder()
                .setTagForChildDirectedTreatment(RequestConfiguration.TAG_FOR_CHILD_DIRECTED_TREATMENT_TRUE)
                .setMaxAdContentRating(RequestConfiguration.MAX_AD_CONTENT_RATING_G)
                .build();
        MobileAds.setRequestConfiguration(requestConfiguration);

        // ২. Google Mobile Ads SDK ইনিশিয়ালাইজেশন
        Log.i(TAG, "Initializing Google Mobile Ads SDK with App ID: " + ADMOB_APP_ID);
        MobileAds.initialize(this, new OnInitializationCompleteListener() {
            @Override
            public void onInitializationComplete(@NonNull InitializationStatus initializationStatus) {
                Log.i(TAG, "Google Mobile Ads SDK Initialization Complete! Status: " + initializationStatus.toString());
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        loadAdMobBanner();
                    }
                });
            }
        });

        // ৩. ওয়েব অ্যাপ লোড
        setupWebView();
    }

    /**
     * আসল Production AdMob ব্যানার লোড করা এবং Error Code পর্যবেক্ষণ
     */
    private void loadAdMobBanner() {
        if (adContainerView == null) return;

        // নতুন AdView তৈরি
        adView = new AdView(this);
        adView.setAdUnitId(ADMOB_BANNER_UNIT_ID); // আসল ব্যানার আইডি
        adView.setAdSize(AdSize.BANNER); // স্ট্যান্ডার্ড 320x50 ব্যানার

        adContainerView.removeAllViews();
        adContainerView.addView(adView);

        // বিজ্ঞাপন লোড হওয়ার লিসেনার ও বিস্তারিত এরর কোড ট্র্যাকিং
        adView.setAdListener(new AdListener() {
            @Override
            public void onAdLoaded() {
                super.onAdLoaded();
                adContainerView.setVisibility(View.VISIBLE);
                Log.i(TAG, "✅ [SUCCESS] AdMob Banner Loaded Successfully! Unit ID: " + ADMOB_BANNER_UNIT_ID);
            }

            @Override
            public void onAdFailedToLoad(@NonNull LoadAdError loadAdError) {
                super.onAdFailedToLoad(loadAdError);
                int code = loadAdError.getCode();
                String message = loadAdError.getMessage();
                String domain = loadAdError.getDomain();

                Log.e(TAG, "❌ [ERROR] AdMob Banner Failed To Load!");
                Log.e(TAG, "   Error Code: " + code);
                Log.e(TAG, "   Message: " + message);
                Log.e(TAG, "   Domain: " + domain);

                // Error Code ভিত্তিক বাংলা ব্যাখ্যা
                switch (code) {
                    case AdRequest.ERROR_CODE_NO_FILL: // Code 3
                        Log.w(TAG, "👉 ব্যাখ্যা: Error Code 3 (NO_FILL) - বিজ্ঞাপন রিকোয়েস্ট সফল হয়েছে, কিন্তু AdMob সার্ভার থেকে এখনো বিজ্ঞাপন ইনভেন্টরি বরাদ্দ হয়নি। নতুন অ্যাপের ক্ষেত্রে প্রথম ২৪-৪৮ ঘণ্টা অ্যাড ফিল রেট বাড়াতে কিছুটা সময় লাগে।");
                        break;
                    case AdRequest.ERROR_CODE_NETWORK_ERROR: // Code 2
                        Log.w(TAG, "👉 ব্যাখ্যা: Error Code 2 (NETWORK_ERROR) - ফোনে ইন্টারনেট সংযোগ বিচ্ছিন্ন বা দুর্বল নেটওয়ার্ক।");
                        break;
                    case AdRequest.ERROR_CODE_INVALID_REQUEST: // Code 1
                        Log.w(TAG, "👉 ব্যাখ্যা: Error Code 1 (INVALID_REQUEST) - Ad Unit ID অথবা RequestConfiguration ঠিক নেই।");
                        break;
                    case AdRequest.ERROR_CODE_INTERNAL_ERROR: // Code 0
                        Log.w(TAG, "👉 ব্যাখ্যা: Error Code 0 (INTERNAL_ERROR) - গুগল অ্যাড সার্ভারে সাময়িক ত্রুটি।");
                        break;
                    default:
                        Log.w(TAG, "👉 ব্যাখ্যা: অজানা ত্রুটি কোড: " + code);
                        break;
                }
            }

            @Override
            public void onAdOpened() {
                super.onAdOpened();
                Log.d(TAG, "AdMob Banner Opened");
            }

            @Override
            public void onAdClicked() {
                super.onAdClicked();
                Log.d(TAG, "AdMob Banner Clicked");
            }

            @Override
            public void onAdClosed() {
                super.onAdClosed();
                Log.d(TAG, "AdMob Banner Closed");
            }
        });

        // অ্যাড রিকোয়েস্ট তৈরি এবং লোড
        AdRequest adRequest = new AdRequest.Builder().build();
        Log.i(TAG, "Requesting AdMob Banner for Ad Unit: " + ADMOB_BANNER_UNIT_ID);
        adView.loadAd(adRequest);
    }

    private void setupWebView() {
        webView.setBackgroundColor(0xFFFFFBEB); // Warm amber background eliminates white/black flash
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setSupportMultipleWindows(true);

        // Native Android Bridge to open Google Play Store directly from web app
        webView.addJavascriptInterface(new Object() {
            @JavascriptInterface
            public void openPlayStore() {
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=com.hashikhushitv.app"));
                            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(intent);
                        } catch (Exception e) {
                            try {
                                Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.hashikhushitv.app"));
                                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                startActivity(webIntent);
                            } catch (Exception ignored) {}
                        }
                    }
                });
            }
        }, "AndroidApp");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                if (url == null) return false;
                // If it's a Google Play Store or external scheme, launch native Android intent
                if (url.startsWith("market://") || url.contains("play.google.com") || url.startsWith("intent://") || url.startsWith("whatsapp://")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        view.getContext().startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        if (url.startsWith("market://")) {
                            try {
                                Intent webIntent = new Intent(Intent.ACTION_VIEW, Uri.parse("https://play.google.com/store/apps/details?id=com.hashikhushitv.app"));
                                webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                                view.getContext().startActivity(webIntent);
                                return true;
                            } catch (Exception ignored) {}
                        }
                    }
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient());

        // অনলাইন লাইভ হোস্টেড অ্যাপ অথবা লোকাল অ্যাসেট লোড
        webView.loadUrl("https://ais-dev-yvmuw5tiqosykxup7pcy33-499412979403.asia-southeast1.run.app");
    }

    @Override
    protected void onPause() {
        if (adView != null) adView.pause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (adView != null) adView.resume();
    }

    @Override
    protected void onDestroy() {
        if (adView != null) adView.destroy();
        super.onDestroy();
    }
}
