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
    chunkSizeWarningLimit: 1200,
    modulePreload: { polyfill: false },
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase/')) return 'vendor-firebase';
          if (id.includes('@google/genai')) return 'vendor-ai';
          if (id.includes('recharts')) return 'vendor-charts';
          if (id.includes('xlsx')) return 'vendor-export';
          if (id.includes('motion')) return 'vendor-motion';
          if (id.includes('lucide-react')) return 'vendor-icons';
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) return 'vendor-react';
          return 'vendor-misc';
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
