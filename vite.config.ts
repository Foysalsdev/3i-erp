import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  // Inject env vars at build time (fallback if Vercel env vars not set)
  define: {
    'import.meta.env.VITE_SUPABASE_URL':      JSON.stringify(
      process.env.VITE_SUPABASE_URL || 'https://ludfmwfifrnzgvffteyw.supabase.co'
    ),
    'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(
      process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1ZGZtd2ZpZnJuemd2ZmZ0ZXl3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5MDE5MDQsImV4cCI6MjA5NjQ3NzkwNH0.BLbQocfNcBMPytLuIwtvrJbA_pXW6SDCfp6WjuJ0grA'
    ),
    'import.meta.env.VITE_APP_NAME':    JSON.stringify(
      process.env.VITE_APP_NAME || '3i Logistics ERP'
    ),
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(
      process.env.VITE_APP_VERSION || '3.0.0'
    ),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '3i Logistics ERP',
        short_name: '3i ERP',
        theme_color: '#1B2A3B',
        background_color: '#F1F5F9',
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
