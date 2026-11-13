import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const at = (p) => fileURLToPath(new URL(p, import.meta.url))

// Satu halaman HTML per simulasi (hosting statis, tanpa router). Tambah simulasi baru = tambah entri di `input`.
export default defineConfig({
  base: './',
  appType: 'mpa',
  plugins: [react()],
  // jsxgraph membatasi path impor lewat "exports", jadi CSS-nya dialiaskan langsung ke file
  resolve: { alias: { 'jsxgraph-css': at('./node_modules/jsxgraph/distrib/jsxgraph.css') } },
  build: {
    rollupOptions: {
      input: {
        main: at('./index.html'),
        kuadrat: at('./kuadrat/index.html'),
        transformasi: at('./transformasi/index.html'),
        grafik: at('./grafik/index.html'),
      },
    },
  },
})
