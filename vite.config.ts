import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [react(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    manifest: { name: 'KuriDoIt', short_name: 'KuriDoIt', description: 'Plataforma interna de picks de Kuriyama', theme_color: '#0067c5', background_color: '#0067c5', display: 'standalone', start_url: '/', icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }, { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }] },
    workbox: { navigateFallback: '/index.html', runtimeCaching: [{ urlPattern: /\/api\/(matches\/current|leaderboard)/, handler: 'NetworkFirst', options: { cacheName: 'public-api', expiration: { maxEntries: 10, maxAgeSeconds: 300 } } }] }
  })]
})
