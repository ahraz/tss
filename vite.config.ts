import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/tss/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'TSS Cleaners',
        short_name: 'TSS',
        description: 'TSS Cleaners — Commercial Cleaning Business OS',
        theme_color: '#1d4ed8',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: '/tss/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/tss/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    }),
  ],
})
