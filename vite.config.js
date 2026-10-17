import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8080',
      '/media': 'http://127.0.0.1:8080',
    },
  },
  build: {
    // Keep the deployed bundle with the actual backend project. The previous
    // relative path targeted a separate sibling folder, leaving production on
    // an old web build even when the frontend build completed successfully.
    outDir: '../../hrmsbackend/hrms/src/main/resources/static',
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
