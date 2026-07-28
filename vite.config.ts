import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    manifest: { name: 'Kuriyama Picks', short_name: 'Kuri Picks', description: 'Quiniela interna de Kuriyama', theme_color: '#0b2e25', background_color: '#071c17', display: 'standalone', start_url: '/', icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }] },
    workbox: { navigateFallback: '/index.html', runtimeCaching: [{ urlPattern: /\/api\/(matches\/current|leaderboard)/, handler: 'NetworkFirst', options: { cacheName: 'public-api', expiration: { maxEntries: 10, maxAgeSeconds: 300 } } }] }
  })]
})
