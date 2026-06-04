import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '3i Logistics ERP',
        short_name: '3i ERP',
        theme_color: '#354A5E',
        background_color: '#F5F6F7',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /\/rest\/v1\/(items|customers|suppliers|clients|warehouses)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'masters-cache',
              expiration: { maxAgeSeconds: 86400 }
            }
          },
          {
            urlPattern: /\/rest\/v1\/(grn|sales_orders|delivery_challans)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'transactions-cache',
              expiration: { maxAgeSeconds: 604800 }
            }
          },
          {
            urlPattern: /\/rest\/v1\/stock_ledger/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'stock-cache',
              expiration: { maxAgeSeconds: 3600 }
            }
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
