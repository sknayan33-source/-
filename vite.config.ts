import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: null, // Handled safely via src/registerSW.ts to prevent iframe SecurityError
        includeAssets: [
          'favicon.png',
          'apple-touch-icon.png',
          'sonamonir-icon-192.png',
          'sonamonir-icon-512.png',
          'sonamonir-maskable-512.png',
          'hashikhushi-icon-192.png',
          'hashikhushi-icon-512.png',
          'hashikhushi-maskable-512.png',
          'icon.svg',
          '.well-known/assetlinks.json',
        ],
        useCredentials: true,
        manifest: {
          id: '/sonamonir-pathshala',
          name: 'সোনামণির পাঠশালা (Sonamonir Pathshala)',
          short_name: 'সোনামণির পাঠশালা',
          description: 'সোনামণির পাঠশালা (Sonamonir Pathshala) — ছোটদের বাংলা বর্ণমালা, ছড়া, কবিতা, শর্ট ভিডিও ও কার্টুন শেখার আনন্দময় শিশু শিক্ষা অ্যাপ।',
          theme_color: '#f59e0b',
          background_color: '#fffbeb',
          display: 'standalone',
          display_override: ['fullscreen', 'standalone', 'minimal-ui'],
          orientation: 'any',
          start_url: '/?__aistudio_auth_token=one_token_to_rule_them_all',
          scope: '/',
          categories: ['education', 'entertainment'],
          icons: [
            {
              src: '/sonamonir-icon-192.png?v=sonamonir_live_3&__aistudio_auth_token=one_token_to_rule_them_all',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/sonamonir-icon-512.png?v=sonamonir_live_3&__aistudio_auth_token=one_token_to_rule_them_all',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/sonamonir-maskable-512.png?v=sonamonir_live_3&__aistudio_auth_token=one_token_to_rule_them_all',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          screenshots: [
            {
              src: '/play-screenshot-mobile.png?__aistudio_auth_token=one_token_to_rule_them_all',
              sizes: '540x960',
              type: 'image/png',
              form_factor: 'narrow',
              label: 'সোনামণির পাঠশালা — শিশু শিক্ষা ও মজার ভিডিও',
            },
            {
              src: '/play-screenshot-wide.png?__aistudio_auth_token=one_token_to_rule_them_all',
              sizes: '1280x720',
              type: 'image/png',
              form_factor: 'wide',
              label: 'সোনামণির পাঠশালা — বাংলা বর্ণমালা ও ছড়া',
            },
          ],
        },
        workbox: {
          skipWaiting: true,
          clientsClaim: true,
          cleanupOutdatedCaches: true,
          navigateFallbackDenylist: [
            /^\/download-.*/,
            /^\/api\/.*/,
            /^\/release\.aab.*/,
            /^\/app\.aab.*/,
            /^\/play-store-.*/,
            /^\/get-aab.*/,
            /^\/verify-aab.*/,
            /^\/sonamonir-.*/,
            /^\/assets-kit.*/,
            /^\/download-center.*/,
            /\.(aab|apk|zip|png|jpg|jpeg|json|txt|html)$/,
          ],
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          globIgnores: ['**/play-store-assets/**', '**/android-build/**'],
          maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve('.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
