import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const base = '/expense-tracker-simple/'

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'expense tracker simple',
        short_name: 'expenses',
        description: 'Simple offline expense tracker',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        scope: base,
        start_url: base,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.frankfurter\.dev\/.*/i,
            handler: 'NetworkOnly',
            options: { cacheName: 'fx-frankfurter' },
          },
          {
            urlPattern: /^https:\/\/open\.er-api\.com\/.*/i,
            handler: 'NetworkOnly',
            options: { cacheName: 'fx-er-api' },
          },
        ],
      },
    }),
  ],
})
