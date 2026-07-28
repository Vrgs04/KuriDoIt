import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    manifest: { name: 'KuriDoIt', short_name: 'KuriDoIt', description: 'Plataforma interna de picks de Kuriyama', theme_color: '#071525', background_color: '#F2F4F7', display: 'standalone', start_url: '/', icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }] },
    workbox: { navigateFallback: '/index.html', runtimeCaching: [{ urlPattern: /\/api\/(matches\/current|leaderboard)/, handler: 'NetworkFirst', options: { cacheName: 'public-api', expiration: { maxEntries: 10, maxAgeSeconds: 300 } } }] }
  })]
})
