import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'
// https://vite.dev/config/

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: resolve(__dirname, 'cert/key.pem'),
      cert: resolve(__dirname, 'cert/cert.pem'),
    },
    host: true
  }
})
