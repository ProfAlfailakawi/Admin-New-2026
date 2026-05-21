import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  plugins: [
    react(), 
    tailwindcss(),
  ],
  define: {
    // Gemini API keys must stay server-side. Do not inject GEMINI_API_KEY into the frontend bundle.
    'process.env.GEMINI_API_KEY': JSON.stringify(''),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 2000,
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false,
  },
});
