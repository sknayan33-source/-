import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function generateAllBrandAssets() {
  const width = 512;
  const height = 512;

  // 1. App Icon 512x512 - 100% Brand New 'সোনামণির পাঠশালা' with ZERO 'হাসিখুশি' text
  const iconSvg = `
  <svg width="${width}" height="${height}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#FF9800" />
        <stop offset="50%" stop-color="#F59E0B" />
        <stop offset="100%" stop-color="#D97706" />
      </linearGradient>
      
      <linearGradient id="circleGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#FFFBEB" />
        <stop offset="100%" stop-color="#FEF3C7" />
      </linearGradient>

      <linearGradient id="slateGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0F172A" />
        <stop offset="100%" stop-color="#1E293B" />
      </linearGradient>
      
      <linearGradient id="badgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#10B981" />
        <stop offset="100%" stop-color="#059669" />
      </linearGradient>
    </defs>

    <!-- Base rounded rectangle for app icon (Play Store style) -->
    <rect width="512" height="512" rx="105" fill="url(#bgGrad)" />

    <!-- Cute Outer Decorative Ring -->
    <circle cx="256" cy="245" r="230" fill="none" stroke="#FDE68A" stroke-width="6" opacity="0.75" stroke-dasharray="14 10" />

    <!-- Main Badge Circle -->
    <circle cx="256" cy="215" r="180" fill="url(#circleGrad)" stroke="#FBBF24" stroke-width="8" />

    <!-- Cheerful Kids Education Blackboard/Slate & Letters -->
    <rect x="136" y="90" width="240" height="175" rx="24" fill="url(#slateGrad)" stroke="#B45309" stroke-width="8" />
    
    <!-- Stand legs of slate -->
    <line x1="166" y1="265" x2="140" y2="305" stroke="#B45309" stroke-width="8" stroke-linecap="round" />
    <line x1="346" y1="265" x2="372" y2="305" stroke="#B45309" stroke-width="8" stroke-linecap="round" />

    <!-- Vibrant Bengali Alphabets floating inside Blackboard -->
    <text x="180" y="160" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="54" font-weight="900" fill="#FBBF24" text-anchor="middle">অ</text>
    <text x="256" y="160" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="54" font-weight="900" fill="#34D399" text-anchor="middle">আ</text>
    <text x="332" y="160" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="54" font-weight="900" fill="#60A5FA" text-anchor="middle">ক</text>
    
    <text x="200" y="230" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="50" font-weight="900" fill="#F472B6" text-anchor="middle">খ</text>
    <text x="300" y="230" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="44" font-weight="900" fill="#FCD34D" text-anchor="middle">A B</text>

    <!-- Sparkles -->
    <path d="M 115 110 L 120 125 L 135 130 L 120 135 L 115 150 L 110 135 L 95 130 L 110 125 Z" fill="#FDE047" />
    <path d="M 395 120 L 399 132 L 411 136 L 399 140 L 395 152 L 391 140 L 379 136 L 391 132 Z" fill="#FDE047" />

    <!-- Bottom Vibrant Banner for App Title -->
    <rect x="46" y="325" width="420" height="96" rx="32" fill="url(#badgeGrad)" stroke="#FFFFFF" stroke-width="4" />

    <!-- Clean Main Title: সোনামণির পাঠশালা -->
    <text x="256" y="388" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="42" font-weight="900" fill="#FFFFFF" text-anchor="middle">
      সোনামণির পাঠশালা
    </text>

    <!-- Subtitle: শিশু শিক্ষা ও বর্ণমালা -->
    <text x="256" y="455" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="25" font-weight="800" fill="#FFFFFF" text-anchor="middle">
      ★ শিশু শিক্ষা ও বর্ণমালা ★
    </text>

    <text x="256" y="490" font-family="Arial, sans-serif" font-size="16" font-weight="700" fill="#FEF3C7" text-anchor="middle" opacity="0.95">
      Sonamonir Pathshala
    </text>
  </svg>
  `;

  // 2. Feature Graphic 1024x500 - 100% Brand New 'সোনামণির পাঠশালা' with ZERO 'হাসিখুশি' text
  const featSvg = `
  <svg width="1024" height="500" viewBox="0 0 1024 500" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="featBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0F172A" />
        <stop offset="50%" stop-color="#1E293B" />
        <stop offset="100%" stop-color="#0F172A" />
      </linearGradient>

      <linearGradient id="badgeGold" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#F59E0B" />
        <stop offset="100%" stop-color="#D97706" />
      </linearGradient>
    </defs>

    <!-- Background -->
    <rect width="1024" height="500" fill="url(#featBg)" />

    <!-- Top Accent Bar -->
    <rect width="1024" height="12" fill="#F59E0B" />

    <!-- Left Badge Circle with Slate -->
    <circle cx="210" cy="250" r="170" fill="#FFFBEB" stroke="#F59E0B" stroke-width="8" />

    <!-- Slate on left -->
    <rect x="105" y="145" width="210" height="155" rx="20" fill="#0F172A" stroke="#B45309" stroke-width="7" />
    <text x="150" y="210" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="48" font-weight="900" fill="#FBBF24" text-anchor="middle">অ</text>
    <text x="210" y="210" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="48" font-weight="900" fill="#34D399" text-anchor="middle">আ</text>
    <text x="270" y="210" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="48" font-weight="900" fill="#60A5FA" text-anchor="middle">ক</text>
    <text x="175" y="268" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="42" font-weight="900" fill="#F472B6" text-anchor="middle">খ</text>
    <text x="250" y="268" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="38" font-weight="900" fill="#FCD34D" text-anchor="middle">A B</text>

    <!-- Little banner below slate -->
    <rect x="80" y="325" width="260" height="55" rx="20" fill="#10B981" />
    <text x="210" y="360" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="24" font-weight="900" fill="#FFFFFF" text-anchor="middle">
      সোনামণির পাঠশালা
    </text>

    <!-- Right Content Area -->
    <text x="430" y="115" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="58" font-weight="900" fill="#FBBF24">
      সোনামণির পাঠশালা
    </text>
    <text x="435" y="175" font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#E2E8F0">
      Sonamonir Pathshala • শিশু শিক্ষা ও বিনোদন
    </text>

    <!-- 3 Highlighting Feature Badges -->
    <rect x="435" y="215" width="115" height="38" rx="10" fill="#10B981" />
    <text x="492" y="240" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="20" font-weight="900" fill="#FFFFFF" text-anchor="middle">অ আ ক খ</text>
    <text x="565" y="240" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="22" font-weight="700" fill="#F1F5F9">স্বরবর্ণ ও ব্যঞ্জনবর্ণের সঠিক অডিও উচ্চারণ</text>

    <rect x="435" y="270" width="115" height="38" rx="10" fill="#3B82F6" />
    <text x="492" y="295" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="20" font-weight="900" fill="#FFFFFF" text-anchor="middle">হাতেখড়ি</text>
    <text x="565" y="295" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="22" font-weight="700" fill="#F1F5F9">আঙুল দিয়ে স্ক্রিনে বর্ণ লেখা ও ড্রয়িং অনুশীলন</text>

    <rect x="435" y="325" width="115" height="38" rx="10" fill="#F43F5E" />
    <text x="492" y="350" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="20" font-weight="900" fill="#FFFFFF" text-anchor="middle">ছড়া ও কুইজ</text>
    <text x="565" y="350" font-family="'Noto Sans Bengali', Arial, sans-serif" font-size="22" font-weight="700" fill="#F1F5F9">মজার ছবি, কার্টুন ভিডিও ও মেধা যাচাই কুইজ</text>

    <!-- Google Play Safety badge -->
    <rect x="435" y="395" width="550" height="45" rx="12" fill="#1E293B" stroke="#64748B" stroke-width="2" />
    <text x="710" y="424" font-family="Arial, sans-serif" font-size="18" font-weight="700" fill="#34D399" text-anchor="middle">
      ✔ Google Play Families Policy Compliant • 100% Family Safe
    </text>
  </svg>
  `;

  // Output paths
  const outDir = path.resolve('public/play-store-assets');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const iconBuf = Buffer.from(iconSvg);
  const featBuf = Buffer.from(featSvg);

  // Write Icon 512x512
  await sharp(iconBuf)
    .resize(512, 512)
    .png()
    .toFile(path.join(outDir, 'sonamonir-pathshala-icon-512x512.png'));

  // Also replace any legacy names
  await sharp(iconBuf).resize(512, 512).png().toFile('public/hashikhushi-icon-512.png');
  await sharp(iconBuf).resize(512, 512).png().toFile('public/hashikhushi-logo.png');
  await sharp(iconBuf).resize(512, 512).png().toFile('public/sonamonir-icon-512.png');
  await sharp(iconBuf).resize(512, 512).png().toFile('public/pwa-512x512.png');
  await sharp(iconBuf).resize(192, 192).png().toFile('public/sonamonir-icon-192.png');
  await sharp(iconBuf).resize(192, 192).png().toFile('public/hashikhushi-icon-192.png');
  await sharp(iconBuf).resize(192, 192).png().toFile('public/apple-touch-icon.png');
  await sharp(iconBuf).resize(64, 64).png().toFile('public/favicon.png');

  // Write Feature Graphic 1024x500
  await sharp(featBuf)
    .resize(1024, 500)
    .png()
    .toFile(path.join(outDir, 'sonamonir-pathshala-feature-1024x500.png'));

  console.log('✅ Generated 100% BRAND NEW Sonamonir Pathshala Icon 512x512 and Feature 1024x500 with ZERO old branding!');
}

generateAllBrandAssets().catch(console.error);
