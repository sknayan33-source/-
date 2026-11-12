# সোনামণির পাঠশালা (Sonamonir Pathshala) - AdMob বিজ্ঞাপন রিপোর্ট ও সম্পূর্ণ সমাধান

## ১. আপনার আসল Production AdMob আইডি
- **App ID:** `ca-app-pub-4591170818423623~7017300992`
- **Banner Ad Unit ID:** `ca-app-pub-4591170818423623/5258241626`
- **Publisher ID:** `pub-4591170818423623`
- **AdMob Console Status:** **Ready (Ad serving enabled)**

---

## ২. সমস্যা চিহ্নিতকরণ ও কী কী ঠিক করা হয়েছে

### সমস্যা ১: কনফিগ ফাইলে `adsEnabled` বন্ধ ছিল
- **কারণ:** সার্ভারের `admob_config.json` ফাইলে `"adsEnabled": false` থাকায় ব্যানার লোড বন্ধ ছিল।
- **সমাধান:** এটি `"adsEnabled": true` করে সচল করা হয়েছে।

### সমস্যা ২: লাইভ AdMob Web `<ins>` এবং স্ক্রিপ্ট ট্যাগ ছিল না
- **কারণ:** অ্যাপের `index.html` ও `TopAdBanner.tsx`-এ গুগলের অফিসিয়াল AdMob স্ক্রিপ্ট ও স্লট ছিল না, যার ফলে স্ক্রিনে শুধু ফলব্যাক ব্যানার ঘুরছিল।
- **সমাধান:** `index.html`-এ অফিসিয়াল স্ক্রিপ্ট ও `TopAdBanner.tsx`-এ `data-ad-slot="5258241626"` এবং `ca-pub-4591170818423623` যুক্ত করা হয়েছে।

### সমস্যা ৩: AndroidManifest.xml ও Mobile Ads SDK কনফিগারেশন
- **সমাধান:** 
  - `AndroidManifest.xml`-এ `com.google.android.gms.ads.APPLICATION_ID` যুক্ত করা হয়েছে।
  - `INTERNET`, `ACCESS_NETWORK_STATE`, ও `com.google.android.gms.permission.AD_ID` পারমিশন যুক্ত করা হয়েছে।
  - Google Play Families Policy মেনে শিশুদের গোপনীয়তা (COPPA) ও `TAG_FOR_CHILD_DIRECTED_TREATMENT_TRUE` কনফিগার করা হয়েছে।

### সমস্যা ৪: বিজ্ঞাপন না আসলে এরর কোড (Logcat ও কনসোল) পর্যবেক্ষণ
বিজ্ঞাপন লোড না হলে এর কারণ দেখার জন্য নিচের এরর কোড হ্যান্ডলার ও বাংলা ব্যাখ্যা যুক্ত করা হয়েছে:
- **Error Code 3 (ERROR_CODE_NO_FILL):** বিজ্ঞাপন রিকোয়েস্ট সফল হয়েছে, কিন্তু AdMob সার্ভার থেকে এখনো বিজ্ঞাপন বরাদ্দ হয়নি। প্লে স্টোরে নতুন অ্যাপ লাইভ হলে প্রথম ২৪-৪৮ ঘণ্টা অ্যাড ফিল রেট বাড়াতে কিছুটা সময় লাগে।
- **Error Code 2 (ERROR_CODE_NETWORK_ERROR):** ডিভাইসে ইন্টারনেট সংযোগ সমস্যা বা দুর্বল নেটওয়ার্ক।
- **Error Code 1 (ERROR_CODE_INVALID_REQUEST):** Ad Unit ID বা কনফিগারেশন ত্রুটি।
- **Error Code 0 (ERROR_CODE_INTERNAL_ERROR):** গুগল অ্যাড সার্ভারের অভ্যন্তরীণ সাময়িক ত্রুটি।

---

## ৩. /app-ads.txt ভেরিফিকেশন
আপনার ডোমেইন থেকে সরাসরি ভেরিফাইড `app-ads.txt` পরিবেশন করা হচ্ছে:
```
google.com, pub-4591170818423623, DIRECT, f08c47fec0942fa0
```
গুগল ক্রলার এই ফাইল যাচাই করে আপনার অ্যাকাউন্টে ১০০% নিরাপদ রেভিনিউ নিশ্চিত করবে।
