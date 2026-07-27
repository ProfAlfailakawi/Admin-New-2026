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
    cssCodeSplit: true,
    target: 'es2020',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        // Split heavy vendor libs into separate cached chunks
        // Browser downloads them in parallel and caches each independently
        manualChunks: {
          'chunk-react':    ['react', 'react-dom'],
          'chunk-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage', 'firebase/messaging'],
          'chunk-motion':   ['motion'],
          'chunk-charts':   ['recharts'],
          'chunk-xlsx':     ['xlsx'],
          'chunk-ai':       ['@google/genai'],
          'chunk-markdown': ['react-markdown'],
          'chunk-icons':    ['lucide-react'],
          'chunk-lz':       ['lz-string'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    hmr: false,
  },
});
