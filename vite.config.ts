import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  resolve: {
    dedupe: ['@react-three/fiber', 'three'],
  },
  server: {
        host: '0.0.0.0', 
        port: 8080
    }
})
