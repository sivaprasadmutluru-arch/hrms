import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  build: {
    outDir: '../hrms-backend/src/main/resources/static',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-') || id.includes('node_modules/victory-')) return 'vendor-charts'
          if (id.includes('node_modules/react-router-dom') || id.includes('node_modules/react-router/') || id.includes('node_modules/@remix-run')) return 'vendor-router'
          if (id.includes('node_modules/@reduxjs/toolkit') || id.includes('node_modules/react-redux') || id.includes('node_modules/redux')) return 'vendor-redux'
          if (id.includes('node_modules/@headlessui') || id.includes('node_modules/@heroicons')) return 'vendor-ui'
          if (id.includes('node_modules/react-hook-form')) return 'vendor-form'
          if (id.includes('node_modules/@tanstack')) return 'vendor-table'
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) return 'vendor-react'
        },
      },
    },
  },
})
