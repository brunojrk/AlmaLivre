import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base relativa: funciona em qualquer hospedagem estática (raiz ou subpasta)
export default defineConfig({
  base: './',
  plugins: [react()],
})
