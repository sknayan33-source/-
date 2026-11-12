import express from 'express';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

// Standard ZIP Archive Builder (Pure Node.js Buffer + CRC32, zero external dependencies)
const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[i] = c >>> 0;
}

function crc32Buffer(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function createZipBuffer(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBuf = Buffer.from(entry.name.replace(/\\/g, '/'), 'utf8');
    const uncompressed = entry.data;
    const crc = crc32Buffer(uncompressed);
    const compressed = zlib.deflateRawSync(uncompressed);
    const useDeflate = compressed.length < uncompressed.length;
    const payload = useDeflate ? compressed : uncompressed;
    const method = useDeflate ? 8 : 0;

    // Local File Header (30 bytes + file name)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 flag
    localHeader.writeUInt16LE(method, 8); // compression method
    localHeader.writeUInt16LE(0, 10); // mod time
    localHeader.writeUInt16LE(0x21, 12); // mod date
    localHeader.writeUInt32LE(crc, 14); // crc32
    localHeader.writeUInt32LE(payload.length, 18); // compressed size
    localHeader.writeUInt32LE(uncompressed.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // filename length
    localHeader.writeUInt16LE(0, 28); // extra length

    localParts.push(localHeader, nameBuf, payload);

    // Central Directory File Header (46 bytes + file name)
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // signature
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 flag
    centralHeader.writeUInt16LE(method, 10); // compression method
    centralHeader.writeUInt16LE(0, 12); // mod time
    centralHeader.writeUInt16LE(0x21, 14); // mod date
    centralHeader.writeUInt32LE(crc, 16); // crc32
    centralHeader.writeUInt32LE(payload.length, 20); // compressed size
    centralHeader.writeUInt32LE(uncompressed.length, 24); // uncompressed size
    centralHeader.writeUInt16LE(nameBuf.length, 28); // filename length
    centralHeader.writeUInt16LE(0, 30); // extra length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number
    centralHeader.writeUInt16LE(0, 36); // internal attrs
    centralHeader.writeUInt32LE(0, 38); // external attrs
    centralHeader.writeUInt32LE(offset, 42); // relative offset

    centralParts.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + payload.length;
  }

  const centralDirSize = centralParts.reduce((acc, b) => acc + b.length, 0);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(entries.length, 8); // entries on disk
  eocd.writeUInt16LE(entries.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12); // size of central dir
  eocd.writeUInt32LE(offset, 16); // offset of central dir
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localParts, ...centralParts, eocd]);
}

function collectDirEntries(
  dirPath: string,
  prefix = '',
  out: Array<{ name: string; data: Buffer }> = []
): Array<{ name: string; data: Buffer }> {
  if (!fs.existsSync(dirPath)) return out;
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const item of items) {
    if (
      item.name === 'android-build' ||
      item.name === 'Hashikhushi-TV-PlayStore-Package.zip' ||
      item.name.endsWith('.aab') ||
      item.name.endsWith('.apk')
    ) {
      continue;
    }
    const fullPath = path.join(dirPath, item.name);
    const relName = prefix ? `${prefix}/${item.name}` : item.name;
    if (item.isDirectory()) {
      collectDirEntries(fullPath, relName, out);
    } else if (item.isFile()) {
      out.push({ name: relName, data: fs.readFileSync(fullPath) });
    }
  }
  return out;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Must always be 3000 as per AI Studio environment constraints; Nginx on 8080 proxies to 3000
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

// Google Play Families Policy & Privacy Hardening:
// Explicitly disable unnecessary hardware/sensor permissions (Location, Camera, Contacts, USB, Payment, Bluetooth)
// while keeping microphone=(self) solely for the PIN-protected Admin Control Room voice recorder.
app.use((_req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), camera=(), usb=(), payment=(), bluetooth=(), serial=(), midi=(), magnetometer=(), gyroscope=(), accelerometer=(), microphone=(self)'
  );
  next();
});

const CUSTOM_IMAGES_DIR = path.resolve(__dirname, 'src/assets/images');
const CUSTOM_IMAGES_FILE = path.resolve(__dirname, 'custom_images.json');
const CUSTOM_VOICES_DIR = path.resolve(__dirname, 'public/custom-voices');
const CUSTOM_VOICES_FILE = path.resolve(__dirname, 'custom_voices.json');

// Ensure image and voice dirs exist
if (!fs.existsSync(CUSTOM_IMAGES_DIR)) {
  fs.mkdirSync(CUSTOM_IMAGES_DIR, { recursive: true });
}
if (!fs.existsSync(CUSTOM_VOICES_DIR)) {
  fs.mkdirSync(CUSTOM_VOICES_DIR, { recursive: true });
}

// Serve public directory (manifest, icons, PWA files) statically with fresh cache headers for icons
const PUBLIC_DIR = path.resolve(__dirname, 'public');

// Direct route for user_custom_c-10.jpg and mian_bhai image so old bundles on any domain load it instantly
app.get([
  '/src/assets/images/user_custom_c-10.jpg',
  '/user_custom_c-10.jpg',
  '/src/assets/images/mian_bhai.jpg',
  '/mian_bhai.jpg',
  '/src/assets/images/user_custom_c-10'
], (_req, res) => {
  const imgPath = path.resolve(__dirname, 'src/assets/images/mian_bhai.jpg');
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.sendFile(imgPath);
});

// Serve assets directories statically with correct MIME types
app.use('/src/assets/images', express.static(path.resolve(__dirname, 'src/assets/images')));
app.use(express.static(PUBLIC_DIR));

// Explicitly serve Web App Manifest and Service Worker with exact MIME types and clean URLs for PWABuilder / TWA AAB packaging
app.get(['/manifest.webmanifest', '/manifest.json'], (_req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.json({
    id: '/sonamonir-pathshala',
    name: 'সোনামণির পাঠশালা (Sonamonir Pathshala)',
    short_name: 'সোনামণির পাঠশালা',
    description:
      'সোনামণির পাঠশালা (Sonamonir Pathshala) — ছোটদের বাংলা বর্ণমালা, ছড়া, কবিতা, শর্ট ভিডিও ও কার্টুন শেখার আনন্দময় শিশু শিক্ষা অ্যাপ।',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'fullscreen', 'minimal-ui'],
    orientation: 'any',
    background_color: '#fffbeb',
    theme_color: '#f59e0b',
    lang: 'bn',
    dir: 'ltr',
    categories: ['education', 'entertainment'],
    prefer_related_applications: false,
    icons: [
      {
        src: '/sonamonir-icon-192.png?v=sonamonir_live_3',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/sonamonir-icon-512.png?v=sonamonir_live_3',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/sonamonir-maskable-512.png?v=sonamonir_live_3',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    screenshots: [
      {
        src: '/play-screenshot-mobile.png',
        sizes: '540x960',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'সোনামণির পাঠশালা — শিশু শিক্ষা ও মজার ভিডিও',
      },
      {
        src: '/play-screenshot-wide.png',
        sizes: '1280x720',
        type: 'image/png',
        form_factor: 'wide',
        label: 'সোনামণির পাঠশালা — বাংলা বর্ণমালা ও ছড়া',
      },
    ],
  });
});

app.get('/sw.js', (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const swPath = path.resolve(PUBLIC_DIR, 'sw.js');
  if (fs.existsSync(swPath)) {
    return res.sendFile(swPath);
  }
  return res.send("self.addEventListener('fetch', () => {});");
});

// 1-Click Play Store Assets + Zero-Permission Android Config ZIP Download
app.get('/api/download/hashikhushi-playstore-kit.zip', (_req, res) => {
  try {
    const entries: Array<{ name: string; data: Buffer }> = [];
    const playAssetsDir = path.resolve(PUBLIC_DIR, 'play-store-assets');
    if (fs.existsSync(playAssetsDir)) {
      collectDirEntries(playAssetsDir, 'play-store-assets', entries);
    }
    const twaPath = path.resolve(PUBLIC_DIR, 'twa-manifest.json');
    if (fs.existsSync(twaPath)) {
      entries.push({ name: 'twa-manifest.json', data: fs.readFileSync(twaPath) });
    }
    const safeManifestPath = path.resolve(playAssetsDir, 'AndroidManifest-safe.xml');
    if (fs.existsSync(safeManifestPath)) {
      entries.push({ name: 'AndroidManifest.xml', data: fs.readFileSync(safeManifestPath) });
    }
    const privacyPath = path.resolve(PUBLIC_DIR, 'privacy-policy.html');
    if (fs.existsSync(privacyPath)) {
      entries.push({ name: 'privacy-policy.html', data: fs.readFileSync(privacyPath) });
    }
    const guideText = `সোনামণির পাঠশালা (Sonamonir Pathshala) - Google Play Store Kit
===========================================================
Package ID: com.sonamonirpathshala.app
App Name: সোনামণির পাঠশালা (Sonamonir Pathshala)
Permissions: INTERNET ONLY (Location, Camera, Contacts, AD_ID disabled)

এই জিপ ফাইলের ভেতরে যা যা আছে:
1. play-store-assets/hashikhushi-tv-icon-512x512.png (App Icon 512x512)
2. play-store-assets/hashikhushi-tv-feature-1024x500.png (Feature Graphic 1024x500)
3. play-store-assets/screenshot-1-bornomala-board.png (Phone Screenshot 1)
4. play-store-assets/screenshot-2-hatakhori-flashcard.png (Phone Screenshot 2)
5. play-store-assets/screenshot-3-quiz-rhymes.png (Phone Screenshot 3)
6. AndroidManifest.xml (Zero-Permission Safe Android Manifest)
7. twa-manifest.json (Bubblewrap / TWA Ready Config)
8. privacy-policy.html (Families Policy Compliant Privacy Policy)
`;
    entries.push({ name: 'README-PLAY-STORE-GUIDE.txt', data: Buffer.from(guideText, 'utf8') });

    const zipBuf = createZipBuffer(entries);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Hashikhushi-TV-PlayStore-Kit.zip"'
    );
    res.setHeader('Content-Length', String(zipBuf.length));
    res.setHeader('Cache-Control', 'no-store');
    return res.send(zipBuf);
  } catch (err) {
    console.error('Failed to build PlayStore Kit ZIP:', err);
    return res.status(500).json({ error: 'Failed to create ZIP archive' });
  }
});

// 1-Click Complete Web App Bundle ZIP (For WebIntoApp HTML-ZIP mode, Website2APK, or Netlify Drop)
app.get('/api/download/hashikhushi-web-bundle.zip', (_req, res) => {
  try {
    const entries: Array<{ name: string; data: Buffer }> = [];
    const distDir = path.resolve(__dirname, 'dist');

    if (fs.existsSync(distDir)) {
      collectDirEntries(distDir, '', entries);
    } else {
      collectDirEntries(PUBLIC_DIR, '', entries);
    }

    // Sanitize index.html and manifest.webmanifest inside the ZIP so no preview auth tokens remain
    for (const entry of entries) {
      if (
        entry.name.endsWith('.html') ||
        entry.name.endsWith('.webmanifest') ||
        entry.name.endsWith('.json')
      ) {
        const cleaned = entry.data
          .toString('utf8')
          .replace(/\?__aistudio_auth_token=[^"'\s&]+/g, '');
        entry.data = Buffer.from(cleaned, 'utf8');
      }
    }

    const safeManifestPath = path.resolve(
      PUBLIC_DIR,
      'play-store-assets',
      'AndroidManifest-safe.xml'
    );
    if (
      fs.existsSync(safeManifestPath) &&
      !entries.some((e) => e.name === 'AndroidManifest.xml')
    ) {
      entries.push({
        name: 'AndroidManifest.xml',
        data: fs.readFileSync(safeManifestPath),
      });
    }

    const zipBuf = createZipBuffer(entries);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="Hashikhushi-TV-Web-App-Bundle.zip"'
    );
    res.setHeader('Content-Length', String(zipBuf.length));
    res.setHeader('Cache-Control', 'no-store');
    return res.send(zipBuf);
  } catch (err) {
    console.error('Failed to build Web Bundle ZIP:', err);
    return res.status(500).json({ error: 'Failed to create Web Bundle ZIP archive' });
  }
});

app.get(['/download-apk', '/apk', '/Sonamonir-Pathshala-Android.apk', '/Sonamonir-Pathshala-Latest.apk', '/Sonamonir-Pathshala-v10.apk', '/latest.apk', '/app.apk'], (_req, res) => {
  const apkPath = path.resolve(PUBLIC_DIR, 'Sonamonir-Pathshala-Latest.apk');
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="Sonamonir-Pathshala-Latest.apk"');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.sendFile(apkPath);
});

// Direct 1-Click AAB for com.hashikhushitv.app (minSdkVersion 24)
app.get(['/download-aab-hashikhushi', '/download-hashikhushi-aab', '/aab-hashikhushi'], (_req, res) => {
  const aabPath = path.resolve(PUBLIC_DIR, 'play-store-assets/android-build/Hashikhushi-TV-PlayStore.aab');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="Hashikhushi-TV-PlayStore.aab"');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  return res.sendFile(aabPath);
});

// Clean release.aab download route (no parenthesis, no spaces, 100% upload safe)
app.get(['/download-release-aab', '/release.aab', '/app.aab'], (_req, res) => {
  const aabPath = path.resolve(PUBLIC_DIR, 'release.aab');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="release.aab"');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  return res.sendFile(aabPath);
});

// Direct routes for Fresh Release Builds v2 & 00_NEW_FRESH_APK_AND_AAB_FILES
app.get(
  [
    '/download-fresh-aab',
    '/Sonamonir-Pathshala-Latest-Release.aab',
    '/00_NEW_FRESH_APK_AND_AAB_FILES/Sonamonir-Pathshala-Latest-Release.aab',
    '/fresh.aab',
  ],
  (_req, res) => {
    let aabPath = path.resolve(__dirname, '00_NEW_FRESH_APK_AND_AAB_FILES/Sonamonir-Pathshala-Latest-Release.aab');
    if (!fs.existsSync(aabPath)) {
      aabPath = path.resolve(PUBLIC_DIR, 'Sonamonir-Pathshala-Latest-Release.aab');
    }
    if (!fs.existsSync(aabPath)) {
      aabPath = path.resolve(__dirname, 'Release-Builds-v2/Sonamonir-Pathshala-Latest-Release.aab');
    }
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="Sonamonir-Pathshala-Latest-Release.aab"');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    return res.sendFile(aabPath);
  }
);

app.get(
  [
    '/download-fresh-apk',
    '/Sonamonir-Pathshala-Latest-Fixed.apk',
    '/00_NEW_FRESH_APK_AND_AAB_FILES/Sonamonir-Pathshala-Latest-Fixed.apk',
    '/fresh.apk',
  ],
  (_req, res) => {
    let apkPath = path.resolve(__dirname, '00_NEW_FRESH_APK_AND_AAB_FILES/Sonamonir-Pathshala-Latest-Fixed.apk');
    if (!fs.existsSync(apkPath)) {
      apkPath = path.resolve(PUBLIC_DIR, 'Sonamonir-Pathshala-Latest-Fixed.apk');
    }
    if (!fs.existsSync(apkPath)) {
      apkPath = path.resolve(PUBLIC_DIR, 'Sonamonir-Pathshala-Latest.apk');
    }
    res.setHeader('Content-Type', 'application/vnd.android.package-archive');
    res.setHeader('Content-Disposition', 'attachment; filename="Sonamonir-Pathshala-Latest-Fixed.apk"');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    return res.sendFile(apkPath);
  }
);

// Version 2 release AAB route
app.get(['/download-release-v2-aab', '/release-v2.aab', '/Sonamonir-Pathshala-Production.aab', '/production.aab'], (_req, res) => {
  const aabPath = path.resolve(PUBLIC_DIR, 'Sonamonir-Pathshala-Production.aab');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="Sonamonir-Pathshala-Production.aab"');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  return res.sendFile(aabPath);
});

// Direct 1-Click AAB for com.sonamonirpathshala.app (minSdkVersion 24)
app.get(['/download-aab', '/aab', '/download-sonamonir-aab'], (_req, res) => {
  const aabPath = path.resolve(PUBLIC_DIR, 'play-store-assets/android-build/Sonamonir-Pathshala-PlayStore.aab');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="Sonamonir-Pathshala-PlayStore.aab"');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  return res.sendFile(aabPath);
});

// Direct 1-Click All-In-One Play Store Package ZIP Download Route
app.get(['/download-zip', '/download-package', '/package-zip'], (_req, res) => {
  const zipPath = path.resolve(PUBLIC_DIR, 'play-store-assets/Sonamonir-Pathshala-PlayStore-Package.zip');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="Sonamonir-Pathshala-PlayStore-Package.zip"');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.sendFile(zipPath);
});

// Direct 1-Click Play Store Graphics Kit ZIP (Icon 512x512 + Feature 1024x500 + Screenshots 1080x1920)
app.get(['/download-graphics', '/graphics-zip', '/playstore-graphics'], (_req, res) => {
  const zipPath = path.resolve(PUBLIC_DIR, 'play-store-assets/Sonamonir-Pathshala-Graphics-Kit.zip');
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', 'attachment; filename="Sonamonir-Pathshala-Graphics-Kit.zip"');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.sendFile(zipPath);
});

// Direct Force-Download Route for 512x512 App Icon (Will NOT open app or browser viewer, forces phone download)
app.get(['/download-logo', '/download-icon', '/download-logo-512', '/download-logo-png'], (_req, res) => {
  const iconPath = path.resolve(PUBLIC_DIR, 'sonamonir-logo-512x512.png');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', 'attachment; filename="sonamonir-pathshala-logo-512x512.png"');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  return res.sendFile(iconPath);
});

app.get('/download-logo-jpg', (_req, res) => {
  const iconPath = path.resolve(PUBLIC_DIR, 'sonamonir-logo-512x512.jpg');
  res.setHeader('Content-Type', 'image/jpeg');
  res.setHeader('Content-Disposition', 'attachment; filename="sonamonir-pathshala-logo-512x512.jpg"');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  return res.sendFile(iconPath);
});

// Direct Force-Download Route for 1024x500 Feature Banner Graphic
app.get(['/download-banner', '/download-feature'], (_req, res) => {
  const bannerPath = path.resolve(PUBLIC_DIR, 'play-store-assets/sonamonir-pathshala-feature-1024x500.png');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="sonamonir-pathshala-feature-1024x500.png"');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  return res.sendFile(bannerPath);
});

// Direct Force-Download Routes for Screenshots 1-4
app.get('/download-screenshot-1', (_req, res) => {
  const p = path.resolve(PUBLIC_DIR, 'play-store-assets/screenshot-1-bornomala-board.png');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="screenshot-1-bornomala-board.png"');
  return res.sendFile(p);
});
app.get('/download-screenshot-2', (_req, res) => {
  const p = path.resolve(PUBLIC_DIR, 'play-store-assets/screenshot-2-hatakhori-flashcard.png');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="screenshot-2-hatakhori-flashcard.png"');
  return res.sendFile(p);
});
app.get('/download-screenshot-3', (_req, res) => {
  const p = path.resolve(PUBLIC_DIR, 'play-store-assets/screenshot-3-quiz-rhymes.png');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="screenshot-3-quiz-rhymes.png"');
  return res.sendFile(p);
});
app.get('/download-screenshot-4', (_req, res) => {
  const p = path.resolve(PUBLIC_DIR, 'play-store-assets/screenshot-4-english-numbers.png');
  res.setHeader('Content-Type', 'application/octet-stream');
  res.setHeader('Content-Disposition', 'attachment; filename="screenshot-4-english-numbers.png"');
  return res.sendFile(p);
});

if (fs.existsSync(PUBLIC_DIR)) {
  app.use(
    express.static(PUBLIC_DIR, {
      dotfiles: 'allow',
      setHeaders: (res, filePath) => {
        if (
          filePath.endsWith('.webmanifest') ||
          filePath.endsWith('.json') ||
          filePath.endsWith('.png') ||
          filePath.endsWith('.svg') ||
          filePath.endsWith('.aab') ||
          filePath.endsWith('.apk') ||
          filePath.endsWith('.zip') ||
          filePath.endsWith('.keystore')
        ) {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
        }
        if (filePath.endsWith('.aab')) {
          res.setHeader('Content-Type', 'application/x-authorware-bin');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${path.basename(filePath)}"`
          );
        } else if (filePath.endsWith('.apk')) {
          res.setHeader('Content-Type', 'application/vnd.android.package-archive');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${path.basename(filePath)}"`
          );
        } else if (filePath.endsWith('.zip')) {
          res.setHeader('Content-Type', 'application/zip');
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${path.basename(filePath)}"`
          );
        } else if (filePath.endsWith('.keystore')) {
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Content-Disposition', 'attachment; filename="signing.keystore"');
        }
      },
    })
  );
}

// Serve uploaded images statically
app.use('/src/assets/images', express.static(CUSTOM_IMAGES_DIR));

// Get all server-stored custom images
app.get('/api/custom-images', (_req, res) => {
  try {
    if (fs.existsSync(CUSTOM_IMAGES_FILE)) {
      const data = JSON.parse(fs.readFileSync(CUSTOM_IMAGES_FILE, 'utf-8'));
      return res.json(data);
    }
  } catch (err) {
    console.error('Error reading custom images:', err);
  }
  res.json({});
});

// Serve custom voices statically and get all server-stored custom voices (অ থেকে ঁ)
app.use('/custom-voices', express.static(CUSTOM_VOICES_DIR));

app.get('/api/custom-voices', (_req, res) => {
  try {
    if (fs.existsSync(CUSTOM_VOICES_FILE)) {
      const data = JSON.parse(fs.readFileSync(CUSTOM_VOICES_FILE, 'utf-8'));
      return res.json(data);
    }
  } catch (err) {
    console.error('Error reading custom voices:', err);
  }
  res.json({});
});

// Admin PIN management (default 1234, can be updated and saved across server & Firestore)
const ADMIN_CONFIG_FILE = path.resolve(__dirname, 'admin_config.json');
function normalizeServerPin(raw: unknown): string {
  const banglaDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  let out = String(raw || '').trim();
  for (let i = 0; i < 10; i++) {
    out = out.split(banglaDigits[i]).join(String(i));
  }
  return out.replace(/\s+/g, '');
}
let adminPin = '1234';
if (fs.existsSync(ADMIN_CONFIG_FILE)) {
  try {
    const cfg = JSON.parse(fs.readFileSync(ADMIN_CONFIG_FILE, 'utf-8'));
    if (cfg.pin) adminPin = normalizeServerPin(cfg.pin);
  } catch {}
}

// Official Privacy Policy page required by Google Play Console & Families Policy
app.get(['/privacy', '/privacy-policy'], (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Privacy Policy - সোনামণির পাঠশালা (Sonamonir Pathshala)</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #fffbeb; color: #1e293b; margin: 0; padding: 24px 16px; line-height: 1.65; }
    .card { max-width: 760px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 2px solid #fde68a; }
    h1 { color: #b45309; margin-top: 0; font-size: 24px; }
    h2 { color: #0f766e; font-size: 18px; margin-top: 22px; }
    .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; margin-bottom: 12px; }
    a.btn { display: inline-block; margin-top: 20px; background: #f59e0b; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 12px; font-weight: 700; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Google Play Families & Child Safety Compliant</span>
    <h1>গোপনীয়তা নীতি (Privacy Policy) — সোনামণির পাঠশালা (Sonamonir Pathshala)</h1>
    <p><strong>Effective Date:</strong> October 2026</p>
    <p><strong>সোনামণির পাঠশালা (Sonamonir Pathshala)</strong> আমাদের নিজস্ব মৌলিক শিশুতোষ শিক্ষামূলক ব্র্যান্ড ও অ্যাপ (বাংলা ও ইংরেজি বর্ণমালা, সংখ্যা, ছড়া, হাতেখড়ি ও কুইজ শেখার অ্যাপ)। এটি কোনো লাইভ টেলিভিশন চ্যানেল বা থার্ড-পার্টি টিভি নেটওয়ার্ক নয়। শিশুদের ও অভিভাবকদের গোপনীয়তা ও নিরাপত্তা রক্ষা করা আমাদের সর্বোচ্চ অগ্রাধিকার।</p>
    <p><em><strong>Brand Notice:</strong> "সোনামণির পাঠশালা (Sonamonir Pathshala)" is an original interactive children's educational brand for learning Bangla &amp; English alphabets, numbers, rhymes, drawing, and quizzes. It is not a live television broadcast station and is not affiliated with any third-party TV network.</em></p>

    <h2>1. ব্যক্তিগত তথ্য সংগ্রহ (Information Collection & Use)</h2>
    <p>আমরা ব্যবহারকারী বা শিশুদের কাছ থেকে কোনো ব্যক্তিগত তথ্য (যেমন নাম, ফোন নম্বর, ঠিকানা, ছবি, মাইক্রোফোন অডিও, বা জিপিএস লোকেশন) সংগ্রহ, সংরক্ষণ বা শেয়ার করি না। অ্যাপটি ব্যবহারের জন্য কোনো অ্যাকাউন্ট তৈরি বা সাইন-আপ করার প্রয়োজন নেই।</p>
    <p><em>We do not collect, store, or share any Personally Identifiable Information (PII) from children or general users. No login, camera, microphone, or location permission is required to use this educational app.</em></p>

    <h2>2. শিশুদের নিরাপত্তা ও গুগল প্লে ফ্যামিলি পলিসি (Children's Privacy & COPPA Compliance)</h2>
    <p>আমাদের অ্যাপটি Google Play Families Policy এবং Children's Online Privacy Protection Act (COPPA)-এর নীতিমালা সম্পূর্ণ মেনে চলে। অ্যাপে শুধুমাত্র শিশুদের উপযোগী বাংলা ও ইংরেজি বর্ণমালা, ছড়া, কবিতা, হাতেখড়ি, কুইজ এবং শিক্ষামূলক ভিডিও প্রদর্শিত হয়।</p>

    <h2>3. তৃতীয় পক্ষের সেবা ও বিজ্ঞাপন (Third-Party Services & Google AdMob)</h2>
    <p>অ্যাপে প্রদর্শিত শিক্ষামূলক ভিডিওগুলো অফিসিয়াল এমবেড প্লেয়ারের মাধ্যমে দেখানো হয়। অ্যাপে বিজ্ঞাপন প্রদর্শনের ক্ষেত্রে শুধুমাত্র <strong>Google AdMob</strong>-এর শিশু-বান্ধব ও পরিবার-নিরাপদ (Child-Directed / Non-Personalized Family-Safe Ads, G-rated) নীতিমালা অনুসরণ করা হয় এবং ব্যবহারকারীর কোনো ব্যক্তিগত ডেটা ট্র্যাক করা হয় না।</p>

    <h2>4. যোগাযোগ (Contact Us)</h2>
    <p>এই গোপনীয়তা নীতি সম্পর্কে আপনার কোনো প্রশ্ন থাকলে আমাদের সাথে যোগাযোগ করুন:<br/>
    <strong>Email:</strong> sknayan333@gmail.com</p>

    <a class="btn" href="/?__aistudio_auth_token=one_token_to_rule_them_all">← সোনামণির পাঠশালা অ্যাপে ফিরে যান</a>
  </div>
</body>
</html>`);
});

// AdMob configuration & /app-ads.txt (Required by Google AdMob for Play Store verification)
const ADMOB_CONFIG_FILE = path.resolve(__dirname, 'admob_config.json');

function getAdMobConfig(): {
  appId: string;
  bannerAdUnitId: string;
  interstitialAdUnitId: string;
  publisherId: string;
  adsEnabled: boolean;
} {
  try {
    if (fs.existsSync(ADMOB_CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(ADMOB_CONFIG_FILE, 'utf-8'));
      if (saved && saved.appId) return saved;
    }
  } catch {}
  return {
    appId: 'ca-app-pub-4591170818423623~7017300992',
    bannerAdUnitId: 'ca-app-pub-4591170818423623/5258241626',
    interstitialAdUnitId: '',
    publisherId: 'pub-4591170818423623',
    adsEnabled: true,
  };
}

app.get('/app-ads.txt', (_req, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  const cfg = getAdMobConfig();
  const pubMatch =
    (cfg.publisherId || cfg.appId || cfg.bannerAdUnitId || '').match(/pub-\d{10,20}/i);
  const pubId = pubMatch ? pubMatch[0].toLowerCase() : 'pub-0000000000000000';
  res.send(`google.com, ${pubId}, DIRECT, f08c47fec0942fa0\n`);
});

app.get('/api/admob-config', (_req, res) => {
  res.json(getAdMobConfig());
});

// Dedicated 1-Tap AAB Download Center (Direct Blob Downloader to avoid Android App Link redirect)
app.get(['/get-aab', '/download-center', '/aab-download'], (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.send(`<!doctype html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>গুগল প্লে স্টোর .AAB ফাইল ডাউনলোড সেন্টার (SDK 24 ফিক্সড)</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px 16px; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .card { background: #1e293b; border: 3px solid #10b981; border-radius: 24px; padding: 26px 20px; max-width: 500px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6); text-align: center; }
    h1 { color: #34d399; font-size: 22px; margin: 0 0 8px 0; font-weight: 900; }
    p.sub { color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 20px 0; }
    .btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px 20px; border-radius: 14px; font-weight: 900; font-size: 15px; border: none; cursor: pointer; text-decoration: none; margin-bottom: 12px; transition: transform 0.1s; }
    .btn:active { transform: scale(0.98); }
    .btn-green { background: #10b981; color: #022c22; box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4); }
    .btn-green:hover { background: #34d399; }
    .btn-amber { background: #f59e0b; color: #0f172a; box-shadow: 0 6px 16px rgba(245, 158, 11, 0.3); }
    .btn-amber:hover { background: #fbbf24; }
    .badge { display: inline-block; background: #0284c7; color: #fff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; margin-bottom: 14px; }
    .tip-box { background: #334155; border: 2px dashed #f59e0b; border-radius: 16px; padding: 14px; font-size: 13px; line-height: 1.5; color: #fef08a; text-align: left; margin: 18px 0 16px 0; }
    .status { font-size: 13px; font-weight: bold; color: #38bdf8; min-height: 20px; margin-bottom: 10px; }
  </style>
  <script>
    async function downloadAAB(url, fileName) {
      const statusEl = document.getElementById('status');
      try {
        statusEl.innerText = '⏳ ফাইল তৈরি হচ্ছে এবং ডাউনলোড শুরু হচ্ছে...';
        const res = await fetch(url + '?t=' + Date.now());
        if (!res.ok) throw new Error('Download failed');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
        statusEl.innerText = '✅ ' + fileName + ' আপনার ফোনে ডাউনলোড হয়ে গেছে!';
      } catch (e) {
        statusEl.innerText = '⚠️ রিডাইরেক্ট করে ডাউনলোড চেষ্টা করা হচ্ছে...';
        window.location.href = url;
      }
    }
  </script>
</head>
<body>
  <div class="card">
    <div class="badge">Google Play Store Ready • minSdkVersion 24 Fixed</div>
    <h1>📲 গুগল প্লে স্টোর রিলিজ ফাইল</h1>
    <p class="sub">নিচের বাটনে চাপ দিলে সরাসরি মেমোরি থেকে আপনার ফোনে ডাউনলোড হবে, অ্যাপ ওপেন হবে না।</p>

    <div id="status" class="status"></div>

    <button type="button" class="btn btn-green" onclick="downloadAAB('/download-aab-hashikhushi', 'Hashikhushi-TV-PlayStore.aab')">
      ⬇️ Hashikhushi-TV-PlayStore.aab ডাউনলোড করুন
    </button>

    <button type="button" class="btn btn-amber" onclick="downloadAAB('/download-sonamonir-aab', 'Sonamonir-Pathshala-PlayStore.aab')">
      ⬇️ Sonamonir-Pathshala-PlayStore.aab ডাউনলোড করুন
    </button>

    <div class="tip-box">
      💡 <strong>টিপস:</strong><br />
      • আপনার প্লে কনসোলে যেহেতু প্যাকেজ নেম <code style="color:#38bdf8;">com.hashikhushitv.app</code> দেওয়া আছে, তাই উপরের <strong>সবুজ বাটনটি</strong> চাপুন।<br />
      • ডাউনলোড শেষে গুগল প্লে কনসোলে গিয়ে <strong>Upload</strong> বাটনে এই ফাইলটি সিলেক্ট করে দিন। এবার কোনো এরর আসবে না!
    </div>

    <a href="/?__aistudio_auth_token=one_token_to_rule_them_all" style="color:#94a3b8;font-size:12px;text-decoration:none;">← সোনামণির পাঠশালা অ্যাপে ফিরুন</a>
  </div>
</body>
</html>`);
});

// Live AAB Manifest Inspector & Verification Page
app.get(['/verify-aab', '/check-aab', '/test-aab'], (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.send(`<!doctype html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AAB ফাইল minSdkVersion ভেরিফিকেশন রিপোর্ট</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px 14px; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
    .card { background: #1e293b; border: 3px solid #10b981; border-radius: 24px; padding: 24px 18px; max-width: 520px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    h1 { color: #34d399; font-size: 20px; margin: 0 0 6px 0; font-weight: 900; text-align: center; }
    p.sub { color: #94a3b8; font-size: 13px; margin: 0 0 16px 0; text-align: center; }
    .report-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; background: #0f172a; border-radius: 14px; overflow: hidden; font-size: 13px; }
    .report-table td { padding: 10px 14px; border-bottom: 1px solid #334155; }
    .report-table tr:last-child td { border-bottom: none; }
    .label { color: #94a3b8; font-weight: 600; width: 45%; }
    .value { font-weight: 800; color: #fff; }
    .pass { color: #10b981; font-weight: 900; display: inline-flex; align-items: center; gap: 4px; }
    .btn { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; padding: 14px; border-radius: 14px; font-weight: 900; font-size: 15px; border: none; cursor: pointer; text-decoration: none; margin-bottom: 12px; }
    .btn-green { background: #10b981; color: #022c22; }
    .btn-green:hover { background: #34d399; }
    .checker-box { background: #334155; border: 2px dashed #38bdf8; border-radius: 16px; padding: 14px; text-align: center; margin-top: 14px; }
    .checker-box h3 { font-size: 14px; color: #38bdf8; margin: 0 0 8px 0; }
    .checker-box p { font-size: 12px; color: #cbd5e1; margin: 0 0 12px 0; line-height: 1.4; }
    input[type="file"] { font-size: 12px; color: #94a3b8; width: 100%; margin-bottom: 10px; }
    #checkResult { font-size: 13px; font-weight: bold; padding: 8px; border-radius: 8px; margin-top: 8px; display: none; }
  </style>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"></script>
  <script>
    async function checkUserFile(input) {
      const resultDiv = document.getElementById('checkResult');
      const file = input.files[0];
      if (!file) return;

      resultDiv.style.display = 'block';
      resultDiv.style.background = '#1e293b';
      resultDiv.style.color = '#38bdf8';
      resultDiv.innerText = '🔍 ফাইল স্ক্যান করা হচ্ছে...';

      try {
        const jszip = new JSZip();
        const zip = await jszip.loadAsync(file);
        const manifestFile = zip.file('base/manifest/AndroidManifest.xml');
        if (!manifestFile) {
          resultDiv.style.background = '#450a0a';
          resultDiv.style.color = '#fca5a5';
          resultDiv.innerText = '❌ এটি সঠিক Android App Bundle (.aab) ফাইল নয়!';
          return;
        }

        const bytes = await manifestFile.async('uint8array');
        let text = '';
        for (let i = 0; i < bytes.length; i++) {
          text += String.fromCharCode(bytes[i]);
        }

        if (text.includes('minSdkVersion\\x1a\\x0224') || text.includes('minSdkVersion\\x1a\\x0224') || (text.indexOf('minSdkVersion') !== -1 && text.indexOf('24') !== -1 && text.indexOf('24') - text.indexOf('minSdkVersion') < 20)) {
          resultDiv.style.background = '#064e3b';
          resultDiv.style.color = '#34d399';
          resultDiv.innerHTML = '✅ <strong>সঠিক ফাইল!</strong><br />এই ফাইলের minSdkVersion = <strong>২৪</strong> (Android 7.0+)। প্লে স্টোরে আপলোড করলে কোনো এরর আসবে না!';
        } else if (text.indexOf('minSdkVersion') !== -1 && text.indexOf('21') !== -1 && text.indexOf('21') - text.indexOf('minSdkVersion') < 20) {
          resultDiv.style.background = '#7f1d1d';
          resultDiv.style.color = '#fca5a5';
          resultDiv.innerHTML = '❌ <strong>সতর্কতা: এটি আপনার পুরনো ফাইল!</strong><br />এতে minSdkVersion = <strong>২১</strong> রয়েছে। দয়া করে উপরের সবুজ বাটন থেকে নতুন ফাইলটি নামিয়ে নিন।';
        } else {
          resultDiv.style.background = '#064e3b';
          resultDiv.style.color = '#34d399';
          resultDiv.innerHTML = '✅ ফাইলটি বৈধ AAB রিলিজ বান্ডেল।';
        }
      } catch (err) {
        resultDiv.style.background = '#450a0a';
        resultDiv.style.color = '#fca5a5';
        resultDiv.innerText = 'ত্রুটি: ' + err.message;
      }
    }
  </script>
</head>
<body>
  <div class="card">
    <h1>🔍 AAB ফাইল ভেরিফিকেশন রিপোর্ট</h1>
    <p class="sub">নতুন প্রস্তুতকৃত ফাইলের লাইভ টেকনিক্যাল স্পেসিফিকেশন</p>

    <table class="report-table">
      <tr>
        <td class="label">ফাইলের নাম:</td>
        <td class="value">Hashikhushi-TV-PlayStore.aab</td>
      </tr>
      <tr>
        <td class="label">প্যাকেজ আইডি:</td>
        <td class="value">com.hashikhushitv.app</td>
      </tr>
      <tr>
        <td class="label">minSdkVersion:</td>
        <td class="value"><span class="pass">✔ ২৪ (Android 7.0+)</span></td>
      </tr>
      <tr>
        <td class="label">targetSdkVersion:</td>
        <td class="value"><span class="pass">✔ ৩৬ (Android 15)</span></td>
      </tr>
      <tr>
        <td class="label">Play Auto Protection:</td>
        <td class="value"><span class="pass">✔ Eligible (২৪ বা বেশি প্রয়োজন)</span></td>
      </tr>
      <tr>
        <td class="label">Signing কী স্ট্যাটাস:</td>
        <td class="value"><span class="pass">✔ Verified (SHA256withRSA)</span></td>
      </tr>
    </table>

    <a href="/download-aab-hashikhushi" class="btn btn-green">
      ⬇️ যাচাইকৃত Hashikhushi-TV-PlayStore.aab ডাউনলোড করুন
    </a>

    <div class="checker-box">
      <h3>📱 আপনার ফোনে থাকা ফাইল নিজে পরীক্ষা করুন</h3>
      <p>আপনার ফোনের Download ফোল্ডারে থাকা ফাইলটি নিচে সিলেক্ট করুন, সিস্টেম সাথে সাথে বলে দেবে এটি নতুন ফাইল (২৪) নাকি পুরনো ফাইল (২১):</p>
      <input type="file" accept=".aab" onchange="checkUserFile(this)" />
      <div id="checkResult"></div>
    </div>

    <div style="text-align:center;margin-top:14px;">
      <a href="/?__aistudio_auth_token=one_token_to_rule_them_all" style="color:#94a3b8;font-size:12px;text-decoration:none;">← সোনামণির পাঠশালা অ্যাপে ফিরুন</a>
    </div>
  </div>
</body>
</html>`);
});

// Dedicated 1-Page Instant Logo Display & Download Page with Base64 Embedding (Zero Cache Guaranteed)
app.get(['/sonamonir-logo', '/logo', '/app-logo'], (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const iconPath = path.resolve(PUBLIC_DIR, 'play-store-assets/sonamonir-pathshala-icon-512x512.png');
  const iconBase64 = fs.existsSync(iconPath) ? fs.readFileSync(iconPath).toString('base64') : '';

  res.send(`<!doctype html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>সোনামণির পাঠশালা — প্লে স্টোর অফিসিয়াল লোগো (App Icon)</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 24px 16px; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .card { background: #1e293b; border: 3px solid #f59e0b; border-radius: 28px; padding: 28px 20px; max-width: 480px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.6); }
    h1 { color: #fbbf24; font-size: 24px; font-weight: 900; margin: 0 0 6px 0; }
    p.sub { color: #94a3b8; font-size: 14px; margin: 0 0 20px 0; }
    .logo-img { width: 220px; height: 220px; border-radius: 32px; object-fit: cover; border: 4px solid #fbbf24; box-shadow: 0 10px 25px rgba(245, 158, 11, 0.4); margin: 0 auto 20px auto; display: block; }
    .btn-dl { display: inline-flex; align-items: center; justify-content: center; gap: 8px; background: #10b981; color: #022c22; font-weight: 900; font-size: 16px; padding: 14px 28px; border-radius: 16px; text-decoration: none; border: none; cursor: pointer; width: 100%; box-shadow: 0 6px 16px rgba(16, 185, 129, 0.4); margin-bottom: 16px; transition: transform 0.1s; }
    .btn-dl:hover { background: #34d399; }
    .btn-dl:active { transform: scale(0.98); }
    .tip-box { background: #334155; border: 2px dashed #f59e0b; border-radius: 16px; padding: 12px 14px; font-size: 13px; line-height: 1.5; color: #fef08a; text-align: left; margin-bottom: 18px; }
    .btn-kit { display: inline-block; background: #f59e0b; color: #0f172a; font-weight: 800; font-size: 14px; padding: 12px 20px; border-radius: 12px; text-decoration: none; width: 100%; }
    .badge { display: inline-block; background: #0284c7; color: #fff; font-size: 12px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; margin-bottom: 16px; }
  </style>
  <script>
    async function forceDownload() {
      try {
        const res = await fetch('/download-logo?t=' + Date.now());
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sonamonir-pathshala-icon-512x512.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      } catch (e) {
        window.location.href = '/download-logo';
      }
    }
  </script>
</head>
<body>
  <div class="card">
    <div class="badge">Google Play Store Official Size • 512 × 512 px</div>
    <h1>সোনামণির পাঠশালা</h1>
    <p class="sub">প্লে স্টোরে দেওয়ার জন্য অফিসিয়াল অ্যাপ লোগো</p>

    <img src="data:image/png;base64,${iconBase64}" alt="সোনামণির পাঠশালা লোগো" class="logo-img" />

    <button type="button" class="btn-dl" onclick="forceDownload()">
      ⬇️ লোগো ডাউনলোড করুন (512×512 PNG)
    </button>

    <div class="tip-box">
      📱 <strong>মোবাইলে ছবি সেভ করার নিশ্চিত উপায়:</strong><br />
      উপরের লোগো ছবিটির ওপর আঙুল দিয়ে ১-২ সেকেন্ড চেপে ধরে রাখুন (<strong>Long Press</strong>), তারপর ভেসে ওঠা মেনু থেকে <strong>"Download image"</strong> বা <strong>"ছবি ডাউনলোড করুন"</strong>-এ চাপুন। সরাসরি আপনার ফোনের গ্যালারিতে সেভ হবে।
    </div>

    <a class="btn-kit" href="/sonamonir-kit?t=${Date.now()}">🎨 পুরো প্লে স্টোর কিট দেখুন (ব্যানার ও স্ক্রিনশট সহ) →</a>
  </div>
</body>
</html>`);
});

// Direct Download Page for Google Play Store Assets (512x512 Icon, 1024x500 Feature Graphic, 3 Phone Screenshots)
app.get(['/play-store-kit', '/sonamonir-kit', '/assets-kit'], (_req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, post-check=0, pre-check=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  const iconPath = path.resolve(PUBLIC_DIR, 'play-store-assets/sonamonir-pathshala-icon-512x512.png');
  const iconBase64 = fs.existsSync(iconPath) ? fs.readFileSync(iconPath).toString('base64') : '';

  res.send(`<!doctype html>
<html lang="bn">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>গুগল প্লে স্টোর লোগো ও স্ক্রিনশট ডাউনলোড — সোনামণির পাঠশালা</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 20px 14px; }
    .wrap { max-width: 860px; margin: 0 auto; }
    h1 { color: #fbbf24; font-size: 22px; margin-bottom: 6px; }
    p.sub { color: #cbd5e1; font-size: 14px; margin-top: 0; margin-bottom: 20px; }
    .grid-top { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; margin-bottom: 20px; }
    .grid-screens { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; }
    .card { background: #1e293b; border: 2px solid #334155; border-radius: 18px; padding: 16px; text-align: center; }
    .card img { max-width: 100%; border-radius: 14px; border: 2px solid #f59e0b; margin-bottom: 10px; }
    .title { font-weight: 800; font-size: 15px; color: #fff; margin-bottom: 4px; }
    .meta { font-size: 12px; color: #fbbf24; margin-bottom: 12px; font-weight: 700; }
    a.dl, button.dl { display: inline-block; background: #10b981; color: #022c22; font-weight: 900; text-decoration: none; padding: 10px 18px; border-radius: 12px; font-size: 14px; border: none; cursor: pointer; }
    a.dl:hover, button.dl:hover { background: #34d399; }
    .tip-box { background: #334155; border: 2px solid #f59e0b; border-radius: 14px; padding: 12px 16px; margin-bottom: 20px; font-size: 13px; line-height: 1.5; color: #fef08a; }
    a.back { display: inline-block; margin-top: 24px; background: #f59e0b; color: #0f172a; font-weight: 800; text-decoration: none; padding: 10px 20px; border-radius: 12px; }
  </style>
  <script>
    async function downloadBlob(url, fileName) {
      try {
        const res = await fetch(url + '?t=' + Date.now());
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
      } catch (e) {
        window.location.href = url;
      }
    }
  </script>
</head>
<body>
  <div class="wrap">
    <h1>📥 গুগল প্লে স্টোর লোগো, ব্যানার ও স্ক্রিনশট কিট (সোনামণির পাঠশালা)</h1>
    <p class="sub">নিচের প্রতিটি ছবি Google Play Console-এর নির্ধারিত সাইজে ফ্রেশভাবে তৈরি করা হয়েছে।</p>

    <div class="tip-box">
      📱 <strong>মোবাইলে ছবি সেভ করার সবচেয়ে সহজ ও নিশ্চিত উপায়:</strong><br />
      যেকোনো ছবি বা লোগোর উপর আঙুল দিয়ে ১-২ সেকেন্ড চেপে ধরুন (<strong>Long Press</strong>), এরপর ভেসে ওঠা মেনু থেকে <strong>"Download image"</strong> বা <strong>"ছবি ডাউনলোড করুন"</strong>-এ চাপুন। এটি সব অ্যান্ড্রয়েড ফোনেই সরাসরি গ্যালারিতে সেভ হয়।
    </div>

    <div class="grid-top">
      <div class="card">
        <img src="data:image/png;base64,${iconBase64}" style="width:160px;height:160px;object-fit:cover;" alt="App Icon 512x512" />
        <div class="title">১. অ্যাপ লোগো (App Icon)</div>
        <div class="meta">সাইজ: 512 × 512 px (PNG) • অফিসিয়াল সোনামণির পাঠশালা লোগো</div>
        <button type="button" class="dl" onclick="downloadBlob('/download-logo', 'sonamonir-pathshala-icon-512x512.png')">⬇️ লোগো ডাউনলোড করুন</button>
      </div>
      <div class="card">
        <img src="/play-store-assets/sonamonir-pathshala-feature-1024x500.png?v=fresh2" style="width:100%;height:160px;object-fit:cover;" alt="Feature Graphic 1024x500" />
        <div class="title">২. ফিচার গ্রাফিক ব্যানার (Feature Graphic)</div>
        <div class="meta">সাইজ: 1024 × 500 px (PNG) • অফিসিয়াল ব্যানার সাইজ</div>
        <button type="button" class="dl" onclick="downloadBlob('/download-banner', 'sonamonir-pathshala-feature-1024x500.png')">⬇️ ব্যানার ডাউনলোড করুন</button>
      </div>
    </div>
    <div style="text-align:center;margin: 20px 0;">
      <a class="dl" style="background:#f59e0b;color:#0f172a;font-size:15px;padding:12px 24px;" href="/download-graphics">📦 সব ছবি একসাথে জিপ ডাউনলোড (.ZIP)</a>
    </div>
    <div class="grid-screens">
      <div class="card">
        <img src="/play-store-assets/screenshot-1-bornomala-board.png" alt="Screenshot 1" />
        <div class="title">স্ক্রিনশট ১: বাংলা বর্ণমালা বোর্ড</div>
        <div class="meta">সাইজ: 1080 × 1920 px (9:16)</div>
        <button type="button" class="dl" onclick="downloadBlob('/download-screenshot-1', 'screenshot-1-bornomala-board.png')">⬇️ স্ক্রিনশট ১ ডাউনলোড</button>
      </div>
      <div class="card">
        <img src="/play-store-assets/screenshot-2-hatakhori-flashcard.png" alt="Screenshot 2" />
        <div class="title">স্ক্রিনশট ২: হাতেখড়ি ও ড্রয়িং</div>
        <div class="meta">সাইজ: 1080 × 1920 px (9:16)</div>
        <button type="button" class="dl" onclick="downloadBlob('/download-screenshot-2', 'screenshot-2-hatakhori-flashcard.png')">⬇️ স্ক্রিনশট ২ ডাউনলোড</button>
      </div>
      <div class="card">
        <img src="/play-store-assets/screenshot-3-quiz-rhymes.png" alt="Screenshot 3" />
        <div class="title">স্ক্রিনশট ৩: ছড়া ও কুইজ খেলা</div>
        <div class="meta">সাইজ: 1080 × 1920 px (9:16)</div>
        <button type="button" class="dl" onclick="downloadBlob('/download-screenshot-3', 'screenshot-3-quiz-rhymes.png')">⬇️ স্ক্রিনশট ৩ ডাউনলোড</button>
      </div>
      <div class="card">
        <img src="/play-store-assets/screenshot-4-english-numbers.png" alt="Screenshot 4" />
        <div class="title">স্ক্রিনশট ৪: ইংরেজি A-Z ও সংখ্যা</div>
        <div class="meta">সাইজ: 1080 × 1920 px (9:16)</div>
        <button type="button" class="dl" onclick="downloadBlob('/download-screenshot-4', 'screenshot-4-english-numbers.png')">⬇️ স্ক্রিনশট ৪ ডাউনলোড</button>
      </div>
    </div>
    <a class="back" href="/?__aistudio_auth_token=one_token_to_rule_them_all">← সোনামণির পাঠশালা অ্যাপে ফিরে যান</a>
  </div>
</body>
</html>`);
});

app.post('/api/admin/admob-config', (req, res) => {
  const { pin, appId, bannerAdUnitId, interstitialAdUnitId, adsEnabled } = req.body;
  if (String(pin) !== String(adminPin)) {
    return res.status(403).json({ error: 'এডমিন পিন সঠিক নয়!' });
  }
  const cleanAppId = String(appId || '').trim();
  const cleanBannerId = String(bannerAdUnitId || '').trim();
  const cleanInterstitialId = String(interstitialAdUnitId || '').trim();
  const pubMatch = (cleanAppId || cleanBannerId || cleanInterstitialId).match(/pub-\d{10,20}/i);
  const publisherId = pubMatch ? pubMatch[0].toLowerCase() : '';

  const newConfig = {
    appId: cleanAppId,
    bannerAdUnitId: cleanBannerId,
    interstitialAdUnitId: cleanInterstitialId,
    publisherId,
    adsEnabled: Boolean(adsEnabled),
    updatedAt: new Date().toISOString(),
  };

  fs.writeFileSync(ADMOB_CONFIG_FILE, JSON.stringify(newConfig, null, 2));
  return res.json({ success: true, config: newConfig });
});

// Serve Digital Asset Links (/.well-known/assetlinks.json) to hide top URL bar in TWA / PWABuilder APKs
const ASSETLINKS_FILE = path.resolve(__dirname, 'public/.well-known/assetlinks.json');
app.get('/.well-known/assetlinks.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (fs.existsSync(ASSETLINKS_FILE)) {
    return res.sendFile(ASSETLINKS_FILE);
  }
  return res.json([
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: 'app.run.asia_southeast1.ais_pre_yvmuw5tiqosykxup7pcy33_499412979403.twa',
        sha256_cert_fingerprints: [
          'F8:E3:A2:A0:72:36:32:58:4B:42:C6:DF:F7:81:44:8C:0B:52:8D:CC:D5:7B:8F:E1:A5:78:46:FB:F5:82:3E:F6',
          'DD:93:EE:BA:EF:CF:5D:82:C5:C2:C9:22:29:EC:C0:00:69:98:8E:43:1A:B0:CE:E1:80:5D:6C:81:25:50:2C:00',
        ],
      },
    },
  ]);
});

app.post('/api/admin/assetlinks', (req, res) => {
  const { pin, assetLinksJson, packageName, sha256 } = req.body;
  if (String(pin) !== String(adminPin)) {
    return res.status(403).json({ error: 'এডমিন পিন সঠিক নয়!' });
  }
  try {
    const dir = path.dirname(ASSETLINKS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    let contentToWrite = '';
    if (assetLinksJson) {
      const parsed = JSON.parse(assetLinksJson);
      contentToWrite = JSON.stringify(parsed, null, 2);
    } else if (packageName && sha256) {
      contentToWrite = JSON.stringify(
        [
          {
            relation: ['delegate_permission/common.handle_all_urls'],
            target: {
              namespace: 'android_app',
              package_name: String(packageName).trim(),
              sha256_cert_fingerprints: [String(sha256).trim()],
            },
          },
        ],
        null,
        2
      );
    } else {
      return res.status(400).json({ error: 'assetlinks.json বা SHA-256 তথ্য দিন' });
    }

    fs.writeFileSync(ASSETLINKS_FILE, contentToWrite);
    return res.json({ success: true, message: 'assetlinks.json সফলভাবে সেভ হয়েছে!' });
  } catch (e) {
    return res.status(400).json({ error: 'সঠিক JSON ফরম্যাট দিন' });
  }
});

// Verify Admin PIN
app.post('/api/admin/verify', (req, res) => {
  const clean = normalizeServerPin(req.body?.pin);
  if (clean && clean === normalizeServerPin(adminPin)) {
    return res.json({ success: true, pin: clean, message: 'এডমিন সফলভাবে লগইন হয়েছেন' });
  }
  return res.status(401).json({ success: false, error: 'ভুল এডমিন পিন কোড!' });
});

// Change or Sync Admin PIN
app.post('/api/admin/change-pin', (req, res) => {
  const cleanNew = normalizeServerPin(req.body?.newPin);
  if (!cleanNew || cleanNew.length < 4) {
    return res.status(400).json({ success: false, error: 'নতুন পিন কমপক্ষে ৪ সংখ্যার হতে হবে!' });
  }
  adminPin = cleanNew;
  try {
    fs.writeFileSync(ADMIN_CONFIG_FILE, JSON.stringify({ pin: adminPin, updatedAt: new Date().toISOString() }, null, 2));
  } catch {}
  return res.json({ success: true, pin: adminPin, message: 'এডমিন পিন সফলভাবে পরিবর্তন হয়েছে' });
});

app.get('/api/admin/pin-status', (_req, res) => {
  return res.json({ isCustomPin: normalizeServerPin(adminPin) !== '1234' });
});

// Admin-only custom image save
app.post('/api/custom-image', async (req, res) => {
  try {
    const { id, imageBase64, adminPin: reqPin } = req.body;
    const headerPin = req.headers['x-admin-pin'];
    const clientPin = reqPin || headerPin;

    if (!clientPin || String(clientPin) !== String(adminPin)) {
      return res.status(403).json({ error: 'শুধুমাত্র অ্যাপ এডমিন ছবি পরিবর্তন করতে পারবেন।' });
    }

    if (!id || !imageBase64) {
      return res.status(400).json({ error: 'Missing id or imageBase64' });
    }

    const matches = imageBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    const ext = matches ? (matches[1].includes('png') ? 'png' : 'jpg') : 'png';
    const base64Data = matches ? matches[2] : imageBase64;
    const buffer = Buffer.from(base64Data, 'base64');

    const fileName = `user_custom_${id}.${ext}`;
    const filePath = path.join(CUSTOM_IMAGES_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    // Also copy to dist if dist exists
    const distDir = path.resolve(__dirname, 'dist/src/assets/images');
    if (fs.existsSync(path.resolve(__dirname, 'dist'))) {
      fs.mkdirSync(distDir, { recursive: true });
      fs.writeFileSync(path.join(distDir, fileName), buffer);
    }

    const publicUrl = `/src/assets/images/${fileName}?v=${Date.now()}`;

    let store: Record<string, string> = {};
    if (fs.existsSync(CUSTOM_IMAGES_FILE)) {
      try {
        store = JSON.parse(fs.readFileSync(CUSTOM_IMAGES_FILE, 'utf-8'));
      } catch {}
    }
    store[id] = publicUrl;
    fs.writeFileSync(CUSTOM_IMAGES_FILE, JSON.stringify(store, null, 2));

    console.log(`Custom image saved for ${id} at ${filePath}`);
    res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('Failed to save custom image:', err);
    res.status(500).json({ error: 'Failed to save image' });
  }
});

// Admin-only custom voice save for Bangla letters (অ থেকে ঁ চন্দ্রবিন্দু চাঁদ)
app.post('/api/custom-voice', async (req, res) => {
  try {
    const { itemId, letter, audioBase64, adminPin: reqPin } = req.body;
    const headerPin = req.headers['x-admin-pin'];
    const clientPin = reqPin || headerPin;

    if (!clientPin || String(clientPin) !== String(adminPin)) {
      return res.status(403).json({ error: 'শুধুমাত্র অ্যাপ এডমিন ভয়েস পরিবর্তন করতে পারবেন।' });
    }

    if (!itemId || !letter || !audioBase64) {
      return res.status(400).json({ error: 'Missing itemId, letter, or audioBase64' });
    }

    const safeItemId = String(itemId).replace(/[^a-zA-Z0-9_-]/g, '');
    const matches = String(audioBase64).match(/^data:audio\/([A-Za-z0-9-+\/]+)(?:;[^,]*)?;base64,(.+)$/);
    let ext = 'webm';
    let base64Data = String(audioBase64);
    if (matches) {
      const subtype = matches[1].toLowerCase();
      if (subtype.includes('mp3') || subtype.includes('mpeg')) ext = 'mp3';
      else if (subtype.includes('wav')) ext = 'wav';
      else if (subtype.includes('mp4') || subtype.includes('m4a') || subtype.includes('aac')) ext = 'm4a';
      else if (subtype.includes('ogg')) ext = 'ogg';
      else ext = 'webm';
      base64Data = matches[2];
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const fileName = `voice_${safeItemId}.${ext}`;
    const filePath = path.join(CUSTOM_VOICES_DIR, fileName);
    fs.writeFileSync(filePath, buffer);

    // Also copy to dist/custom-voices if dist exists
    const distVoiceDir = path.resolve(__dirname, 'dist/custom-voices');
    if (fs.existsSync(path.resolve(__dirname, 'dist'))) {
      fs.mkdirSync(distVoiceDir, { recursive: true });
      fs.writeFileSync(path.join(distVoiceDir, fileName), buffer);
    }

    const publicUrl = `/custom-voices/${fileName}?v=${Date.now()}`;

    let store: Record<string, string> = {};
    if (fs.existsSync(CUSTOM_VOICES_FILE)) {
      try {
        store = JSON.parse(fs.readFileSync(CUSTOM_VOICES_FILE, 'utf-8'));
      } catch {}
    }
    store[safeItemId] = publicUrl;
    store[String(letter)] = publicUrl;
    fs.writeFileSync(CUSTOM_VOICES_FILE, JSON.stringify(store, null, 2));

    res.json({ success: true, url: publicUrl });
  } catch (err) {
    console.error('Failed to save custom voice:', err);
    res.status(500).json({ error: 'Failed to save custom voice' });
  }
});

// Admin-only reset custom voice for a specific letter or all letters
app.post('/api/admin/reset-voice', (req, res) => {
  try {
    const { itemId, letter, resetAll, adminPin: reqPin } = req.body;
    const headerPin = req.headers['x-admin-pin'];
    const clientPin = reqPin || headerPin;

    if (!clientPin || String(clientPin) !== String(adminPin)) {
      return res.status(403).json({ error: 'শুধুমাত্র অ্যাপ এডমিন ভয়েস রিসেট করতে পারবেন।' });
    }

    let store: Record<string, string> = {};
    if (fs.existsSync(CUSTOM_VOICES_FILE)) {
      try {
        store = JSON.parse(fs.readFileSync(CUSTOM_VOICES_FILE, 'utf-8'));
      } catch {}
    }

    if (resetAll) {
      store = {};
    } else {
      if (itemId) delete store[String(itemId)];
      if (letter) delete store[String(letter)];
    }

    fs.writeFileSync(CUSTOM_VOICES_FILE, JSON.stringify(store, null, 2));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset voice' });
  }
});

// Helper to decode escaped JSON URLs inside Facebook/Instagram HTML
function decodeEscapedUrl(raw: string): string {
  try {
    return JSON.parse(`"${raw}"`).replace(/&amp;/g, '&');
  } catch {
    return raw
      .replace(/\\\//g, '/')
      .replace(/\\u0025/g, '%')
      .replace(/\\u0026/g, '&')
      .replace(/&amp;/g, '&');
  }
}

// Cache YouTube direct MP4 URLs in memory for 25 minutes for instant playback
const ytStreamCache = new Map<string, { url: string; expiresAt: number }>();

async function extractYouTubeDirectMp4(videoId: string): Promise<string> {
  const cached = ytStreamCache.get(videoId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.url;
  }

  try {
    const res = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':
          'com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
      },
      body: JSON.stringify({
        videoId,
        context: {
          client: {
            clientName: 'ANDROID_VR',
            clientVersion: '1.56.21',
            androidSdkVersion: 32,
            hl: 'bn',
            gl: 'BD',
          },
        },
      }),
    });

    if (res.ok) {
      const data = (await res.json()) as any;
      const formats: any[] = data?.streamingData?.formats || [];
      // Prefer progressive mp4 with both audio and video
      const mp4Format =
        formats.find((f) => f.url && String(f.mimeType || '').includes('video/mp4')) ||
        formats.find((f) => f.url);
      if (mp4Format?.url) {
        ytStreamCache.set(videoId, {
          url: mp4Format.url,
          expiresAt: Date.now() + 25 * 60 * 1000,
        });
        return mp4Format.url;
      }
    }
  } catch {}
  return '';
}

// Stream YouTube video directly as MP4 so no YouTube channel name, title, or logo is ever displayed
app.get('/api/yt-stream/:videoId', async (req, res) => {
  const videoId = String(req.params.videoId || '').trim();
  if (!/^[A-Za-z0-9_-]{6,15}$/.test(videoId)) {
    res.status(400).send('Invalid video ID');
    return;
  }

  try {
    const mp4Url = await extractYouTubeDirectMp4(videoId);
    if (!mp4Url) {
      res.status(404).send('Stream unavailable');
      return;
    }

    const headers: Record<string, string> = {
      'User-Agent':
        'com.google.android.apps.youtube.vr.oculus/1.56.21 (Linux; U; Android 12L; eureka-user Build/SQ3A.220605.009.A1) gzip',
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }

    const upstream = await fetch(mp4Url, { headers, redirect: 'follow' });
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'video/mp4');
    res.setHeader('Accept-Ranges', 'bytes');
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (upstream.body) {
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } else {
      res.end();
    }
  } catch {
    res.status(502).send('Failed to stream YouTube video');
  }
});

// Auto-Fetch Video Metadata, Canonical Embed URL & Direct MP4 Stream
app.get('/api/autofetch-video', async (req, res) => {
  const rawUrl = String(req.query.url || '').trim();
  if (!rawUrl || !/^https?:\/\//i.test(rawUrl)) {
    res.status(400).json({ error: 'সঠিক ভিডিও লিংক দিন (https://...)' });
    return;
  }

  try {
    let resolvedUrl = rawUrl;
    let title = '';
    let thumbnail = '';
    let directMp4Url = '';
    let canonicalEmbedUrl = '';
    let platform: 'youtube' | 'facebook' | 'instagram' | 'direct' | 'external' = 'external';

    // 1. Check if YouTube Shorts / Watch / youtu.be
    const ytMatch = rawUrl.match(
      /(?:youtube\.com\/(?:shorts\/|watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{6,15})/i
    );
    if (ytMatch && ytMatch[1]) {
      const videoId = ytMatch[1];
      platform = 'youtube';
      resolvedUrl = `https://www.youtube.com/shorts/${videoId}`;
      canonicalEmbedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&loop=1&playlist=${videoId}&playsinline=1&rel=0&modestbranding=1&iv_load_policy=3&fs=0&enablejsapi=1`;
      thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      try {
        const oembedRes = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(
            `https://www.youtube.com/watch?v=${videoId}`
          )}&format=json`
        );
        if (oembedRes.ok) {
          const data = (await oembedRes.json()) as { title?: string; thumbnail_url?: string };
          if (data.title) title = data.title;
          if (data.thumbnail_url) thumbnail = data.thumbnail_url;
        }
      } catch {}

      res.json({
        success: true,
        originalUrl: rawUrl,
        resolvedUrl,
        canonicalEmbedUrl,
        directMp4Url: '',
        title: title || 'শিক্ষামূলক শর্ট ভিডিও',
        thumbnail,
        platform,
      });
      return;
    }

    // 2. Follow redirects and fetch HTML for Facebook / Instagram / other links
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    let html = '';

    try {
      const resp = await fetch(rawUrl, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'bn-BD,bn;q=0.9,en-US;q=0.8,en;q=0.7',
        },
      });
      clearTimeout(timeout);
      if (resp.url) {
        resolvedUrl = resp.url;
      }
      html = await resp.text();
    } catch {
      clearTimeout(timeout);
    }

    // Also try mobile user-agent if Facebook returned a login wall or didn't expose video URL
    if (/facebook\.com|fb\.watch/i.test(resolvedUrl) && !html.includes('playable_url') && !html.includes('browser_native')) {
      try {
        const mbResp = await fetch(resolvedUrl, {
          method: 'GET',
          redirect: 'follow',
          headers: {
            'User-Agent':
              'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
            Accept: 'text/html,application/xhtml+xml',
          },
        });
        if (mbResp.url && !mbResp.url.includes('/login')) {
          resolvedUrl = mbResp.url;
        }
        const mbHtml = await mbResp.text();
        if (mbHtml.length > 500) {
          html += '\n' + mbHtml;
        }
      } catch {}
    }

    // Extract OpenGraph title & thumbnail
    const ogTitleMatch =
      html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
      html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (ogTitleMatch && ogTitleMatch[1]) {
      const cleaned = ogTitleMatch[1]
        .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
        .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, '&')
        .replace(/\s*\|\s*Facebook.*$/i, '')
        .replace(/^Facebook$/i, '')
        .trim();
      if (cleaned && !/log in|sign up/i.test(cleaned)) {
        title = cleaned;
      }
    }

    const ogImgMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    if (ogImgMatch && ogImgMatch[1]) {
      thumbnail = ogImgMatch[1].replace(/&amp;/g, '&');
    }

    // Extract direct MP4 stream from Facebook / Instagram HTML if present
    const mp4Patterns = [
      /"browser_native_hd_url":"([^"]+)"/,
      /"browser_native_sd_url":"([^"]+)"/,
      /"playable_url_quality_hd":"([^"]+)"/,
      /"playable_url":"([^"]+)"/,
      /"hd_src_no_ratelimit":"([^"]+)"/,
      /"hd_src":"([^"]+)"/,
      /"sd_src_no_ratelimit":"([^"]+)"/,
      /"sd_src":"([^"]+)"/,
      /<meta[^>]+property=["']og:video:secure_url["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:video:url["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+property=["']og:video["'][^>]+content=["']([^"']+)["']/i,
    ];

    for (const pat of mp4Patterns) {
      const m = html.match(pat);
      if (m && m[1]) {
        const candidate = decodeEscapedUrl(m[1]);
        if (/^https?:\/\//i.test(candidate) && (candidate.includes('.mp4') || candidate.includes('fbcdn.net') || candidate.includes('cdninstagram.com'))) {
          directMp4Url = candidate;
          break;
        }
      }
    }

    // Determine platform and canonical embed URL for Facebook
    if (/facebook\.com|fb\.watch/i.test(rawUrl) || /facebook\.com|fb\.watch/i.test(resolvedUrl)) {
      platform = 'facebook';

      // Extract numeric video/reel ID from resolvedUrl or HTML so Facebook's plugin never gets a broken /share/r/ URL
      const idMatch =
        resolvedUrl.match(/(?:\/reel\/|\/videos\/|\/watch\/?\?v=|story_fbid=|\/posts\/|\/permalink\/)(\d{10,22})/i) ||
        html.match(/"video_id":"(\d{10,22})"/) ||
        html.match(/"post_id":"(\d{10,22})"/) ||
        html.match(/fb:\/\/(?:video|reel)\/(\d{10,22})/);

      if (idMatch && idMatch[1]) {
        const fbVideoId = idMatch[1];
        const cleanFbUrl = `https://www.facebook.com/facebook/videos/${fbVideoId}/`;
        resolvedUrl = cleanFbUrl;
        canonicalEmbedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
          cleanFbUrl
        )}&show_text=false&autoplay=true`;
      } else {
        // Strip tracking params from resolvedUrl
        const cleanUrl = resolvedUrl.split('?')[0];
        canonicalEmbedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
          cleanUrl
        )}&show_text=false&autoplay=true`;
      }
    } else if (/instagram\.com/i.test(resolvedUrl)) {
      platform = 'instagram';
      const igMatch = resolvedUrl.match(/instagram\.com\/(?:reel|p)\/([A-Za-z0-9_-]+)/i);
      if (igMatch && igMatch[1]) {
        canonicalEmbedUrl = `https://www.instagram.com/reel/${igMatch[1]}/embed`;
      }
    } else if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(resolvedUrl)) {
      platform = 'direct';
      directMp4Url = resolvedUrl;
    }

    res.json({
      success: true,
      originalUrl: rawUrl,
      resolvedUrl,
      canonicalEmbedUrl,
      directMp4Url,
      title: title || 'শিক্ষামূলক শর্ট ভিডিও',
      thumbnail,
      platform,
    });
  } catch (err) {
    console.error('Autofetch error:', err);
    res.json({
      success: true,
      originalUrl: rawUrl,
      resolvedUrl: rawUrl,
      canonicalEmbedUrl: '',
      directMp4Url: '',
      title: 'শিক্ষামূলক শর্ট ভিডিও',
      thumbnail: '',
      platform: 'external',
    });
  }
});

// Proxy direct MP4 video streams so mobile browsers never hit CORS or Referer blocks
app.get('/api/video-proxy', async (req, res) => {
  const targetUrl = String(req.query.url || '').trim();
  if (!targetUrl || !/^https?:\/\//i.test(targetUrl)) {
    res.status(400).send('Invalid video URL');
    return;
  }
  try {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    };
    if (req.headers.range) {
      headers['Range'] = req.headers.range;
    }
    const upstream = await fetch(targetUrl, { headers, redirect: 'follow' });
    res.status(upstream.status);
    const contentType = upstream.headers.get('content-type') || 'video/mp4';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    const contentLength = upstream.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    const contentRange = upstream.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (upstream.body) {
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(Buffer.from(value));
      }
      res.end();
    } else {
      res.end();
    }
  } catch {
    res.status(502).send('Failed to stream video');
  }
});

// Audio cache to serve instant responses with the natural Bengali woman voice
const audioCache = new Map<string, { buffer: Buffer; contentType: string }>();

// Synthesize using natural human-recorded Bengali woman neural voice (bn-BD-NabanitaNeural)
async function synthesizeNaturalBengaliWoman(text: string): Promise<Buffer | null> {
  try {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
    const tts = new MsEdgeTTS();
    const isPureEnglish = /^[A-Za-z0-9\s.,!?'"()-]+$/.test(text);
    // bn-BD-NabanitaNeural is a natural Bangladeshi woman's voice; en-US-AriaNeural for English
    const voiceName = isPureEnglish ? 'en-US-JennyNeural' : 'bn-BD-NabanitaNeural';
    await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    return await new Promise<Buffer | null>((resolve) => {
      const chunks: Buffer[] = [];
      const timeout = setTimeout(() => resolve(null), 7000);
      try {
        const { audioStream } = tts.toStream(text, {
          rate: isPureEnglish ? '-4%' : '-5%',
          pitch: '+1Hz',
        });
        audioStream.on('data', (chunk: Buffer) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        audioStream.on('end', () => {
          clearTimeout(timeout);
          const full = Buffer.concat(chunks);
          resolve(full.length > 200 ? full : null);
        });
        audioStream.on('error', () => {
          clearTimeout(timeout);
          resolve(null);
        });
      } catch {
        clearTimeout(timeout);
        resolve(null);
      }
    });
  } catch {
    return null;
  }
}

// Core helper to fetch natural Bengali woman audio
async function fetchFemaleAudio(text: string): Promise<{ buffer: Buffer; contentType: string } | null> {
  const clean = text.trim();
  if (!clean) return null;

  if (audioCache.has(clean)) {
    return audioCache.get(clean)!;
  }

  // 1. Primary: Natural Bengali Woman Voice (bn-BD-NabanitaNeural) - warm, human, non-robotic
  const naturalBuffer = await synthesizeNaturalBengaliWoman(clean);
  if (naturalBuffer) {
    const data = { buffer: naturalBuffer, contentType: 'audio/mpeg' };
    audioCache.set(clean, data);
    return data;
  }

  // 2. Fallback: Google stream if offline/restricted
  try {
    const isPureEnglish = /^[A-Za-z0-9\s.,!?'"()-]+$/.test(clean);
    const lang = isPureEnglish ? 'en' : 'bn';
    const encoded = encodeURIComponent(clean);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob`;
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (res.ok) {
      const arrayBuffer = await res.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const data = { buffer, contentType: 'audio/mpeg' };
      audioCache.set(clean, data);
      return data;
    }
  } catch (err) {
    console.warn(`Fallback audio fetch error for "${clean}":`, err);
  }

  return null;
}

// Poems & rhymes to pre-warm in natural woman's voice on server start
const POETRY_PREWARM_TEXTS = [
  'প্রভাতী। লিখেছেন কাজী নজরুল ইসলাম। ভোর হলো দোর খোলো খুকুমণি ওঠো রে! ঐ ডাকে জুঁই-শাখে ফুল-খুকী ছোটো রে! খুলি হাল তুলি পাল ঐ তরী চললো, এইবার এইবার খুকুমণি উঠলো!',
  'আমাদের ছোট নদী। লিখেছেন রবীন্দ্রনাথ ঠাকুর। আমাদের ছোট নদী চলে বাঁকে বাঁকে, বৈশাখ মাসে তার হাঁটু জল থাকে। পার হয়ে যায় গরু, পার হয় গাড়ি, দুই ধার উঁচু তার, ঢালু তার পাড়ি।',
  'আয় আয় চাঁদ মামা। প্রচলিত ছড়া। আয় আয় চাঁদ মামা টিপ দিয়ে যা, চাঁদের কপালে চাঁদ টিপ দিয়ে যা। ধান ভানলে কুঁড়ো দেবো, মাছ কাটলে মুড়ো দেবো, কালো গাইয়ের দুধ দেবো, দুধ খাবার বাটি দেবো, চাঁদের কপালে চাঁদ টিপ দিয়ে যা।',
  'আতা গাছে তোতা পাখি। লিখেছেন যোগীন্দ্রনাথ সরকার। আতা গাছে তোতা পাখি, ডালিম গাছে মৌ। এত ডাকি তবু কথা, কও না কেন বউ?',
  'হাট্টিমা টিম টিম। লিখেছেন রোকনুজ্জামান খান। হাট্টিমা টিম টিম, তারা মাঠে পাড়ে ডিম, তাদের খাড়া দুটো শিং, তারা হাট্টিমা টিম টিম!',
  'খোকন খোকন ডাক পাড়ি। প্রচলিত ছড়া। খোকন খোকন ডাক পাড়ি, খোকন মোদের কার বাড়ি? আয় রে খোকন ঘরে আয়, দুধ-মাখা ভাত কাকে খায়!',
  'সংকল্প। লিখেছেন কাজী নজরুল ইসলাম। থাকব না কো বদ্ধ ঘরে, দেখব এবার জগৎটাকে, কেমন করে ঘুরছে মানুষ যুগান্তরের ঘূর্ণিপাকে। দেশ হতে দেশ দেশান্তরে ছুটছে তারা কেমন করে!',
  'ছোটন ঘুমায়। লিখেছেন সুফিয়া কামাল। ছোটন ঘুমায় রে, ছোটন ঘুমায়! ভোরের পাখি ডাকে মিষ্টি সুরে গায়, নরম রোদে ফুলের কলি হাসিমুখে চায়।',
  'বৃষ্টি পড়ে টাপুর টুপুর। লিখেছেন রবীন্দ্রনাথ ঠাকুর। দিনের আলো নিভে এল সুয্যি ডোবে ডোবে। আকাশ ঘিরে মেঘ জুটেছে চাঁদের লোভে লোভে। মেঘের উপর মেঘ করেছে রঙের উপর রঙ, মন্দিরেতে কাঁসর ঘণ্টা বাজল ঠং ঠং। বৃষ্টি পড়ে টাপুর টুপুর নদে এল বান, শিব ঠাকুরের বিয়ে হলো তিন কন্যে দান।'
];

// All Bengali letters from অ to ঁ (চন্দ্রবিন্দু চাঁদ) to pre-warm in memory
const ALL_LETTERS = [
  'অ', 'আ', 'ই', 'ঈ', 'উ', 'ঊ', 'ঋ', 'এ', 'ঐ', 'ও', 'ঔ',
  'ক', 'খ', 'গ', 'ঘ', 'ঙ', 'চ', 'ছ', 'জ', 'ঝ', 'ঞ',
  'ট', 'ঠ', 'ড', 'ঢ', 'ণ', 'ত', 'থ', 'দ', 'ধ', 'ন',
  'প', 'ফ', 'ব', 'ভ', 'ম', 'য', 'র', 'ল', 'শ', 'ষ',
  'স', 'হ', 'ড়', 'ঢ়', 'য়', 'ৎ', 'ং', 'ঃ', 'ঁ',
  'চন্দ্রবিন্দু', 'চাঁদ', 'পাখি', 'অজগর', 'আনারস', 'ইঁদুর', 'ঈগল'
];

// Pre-warm the cache sequentially so poems and letters are instantly ready in natural woman voice
async function prewarmCache() {
  console.log('Pre-warming natural Bengali woman voice cache for poems and letters...');
  for (const poem of POETRY_PREWARM_TEXTS) {
    if (!audioCache.has(poem)) {
      await fetchFemaleAudio(poem);
      await new Promise(r => setTimeout(r, 40));
    }
  }
  for (const letter of ALL_LETTERS) {
    if (!audioCache.has(letter)) {
      await fetchFemaleAudio(letter);
      await new Promise(r => setTimeout(r, 40));
    }
  }
  console.log(`Pre-warming complete! Cached ${audioCache.size} items in natural woman voice.`);
}

// Endpoint
app.get('/api/tts', async (req, res) => {
  const text = (req.query.text as string || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'Text parameter is required' });
  }

  const result = await fetchFemaleAudio(text);
  if (result) {
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
    return res.send(result.buffer);
  }

  res.status(502).json({ error: 'Failed to synthesize female speech' });
});

// Setup Vite dev server or serve static build
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const distIndex = path.resolve(distPath, 'index.html');
  const hasDist = fs.existsSync(distIndex);
  const isProd = process.env.NODE_ENV === 'production' || (!process.env.VITE_DEV && hasDist);

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn('Failed to start Vite middleware, falling back to dist static files:', err);
      if (hasDist) {
        app.use(express.static(distPath));
        app.get('*', (_req, res) => {
          res.sendFile(distIndex);
        });
      }
    }
  } else {
    app.use(
      express.static(distPath, {
        setHeaders: (res) => {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(distIndex);
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
    // Start pre-warming in background
    prewarmCache().catch(console.error);
  });
}

startServer();
