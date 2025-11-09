import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { fileURLToPath, URL } from "node:url";
import { copyFileSync } from "node:fs";

export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    {
      name: 'copy-staticwebapp-config',
      closeBundle() {
        copyFileSync('staticwebapp.config.json', 'dist/staticwebapp.config.json');
      }
    }
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url))
    }
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:7071',
        changeOrigin: true
      }
    }
  }
})
