import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  // Draait onder crowdstampxtra.netlify.app/demo/ (zie netlify.toml in de root)
  base: '/demo/',
  plugins: [react(), tailwindcss()],
  // Voorkom dat een postcss.config.js hoger in de mappenstructuur wordt opgepikt
  css: { postcss: {} },
  build: {
    chunkSizeWarningLimit: 1500,
  },
})
