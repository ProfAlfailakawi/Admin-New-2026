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
        // Package subpaths such as react-dom/client and react/jsx-runtime were not
        // captured by the old object form. Rollup consequently placed React inside
        // the icons/charts/markdown chunks, forcing all three heavy features into
        // the critical boot path. Match package families by resolved module id so
        // the shell loads React once and feature libraries remain truly on demand.
        manualChunks(id) {
          if (!id.includes('/node_modules/')) return undefined;
          if (/\/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'chunk-react';
          if (/\/node_modules\/(@firebase|firebase)\//.test(id)) return 'chunk-firebase';
          if (/\/node_modules\/(motion|framer-motion|motion-dom|motion-utils)\//.test(id)) return 'chunk-motion';
          if (/\/node_modules\/(clsx|tailwind-merge)\//.test(id)) return 'chunk-ui';
          if (/\/node_modules\/(recharts|victory-vendor|d3-[^/]+|redux|react-redux|reselect|immer|@reduxjs)\//.test(id)) return 'chunk-charts';
          if (/\/node_modules\/xlsx\//.test(id)) return 'chunk-xlsx';
          if (/\/node_modules\/@google\/genai\//.test(id)) return 'chunk-ai';
          if (/\/node_modules\/(react-markdown|unified|remark-[^/]+|micromark[^/]*|mdast-[^/]+|hast-[^/]+|unist-[^/]+|vfile[^/]*)\//.test(id)) return 'chunk-markdown';
          if (/\/node_modules\/lucide-react\//.test(id)) return 'chunk-icons';
          if (/\/node_modules\/lz-string\//.test(id)) return 'chunk-lz';
          return undefined;
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
