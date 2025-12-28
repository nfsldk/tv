import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, (process as any).cwd(), '');
  return {
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY || ''),
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_KEY': JSON.stringify(env.VITE_SUPABASE_KEY || '')
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        output: {
          // Advanced manual chunking to optimize bundle size and caching
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react')) {
                return 'vendor-react';
              }
              if (id.includes('artplayer')) {
                return 'vendor-artplayer';
              }
              if (id.includes('hls.js') || id.includes('swarmcloud-hls')) {
                return 'vendor-hls';
              }
              if (id.includes('@google/genai')) {
                return 'vendor-gemini';
              }
              if (id.includes('@supabase')) {
                return 'vendor-supabase';
              }
              return 'vendor'; // generic node_modules
            }
          },
          // Ensure consistent asset naming for better caching
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
          assetFileNames: 'assets/[ext]/[name]-[hash].[ext]'
        }
      },
      // Increase chunk size warning limit slightly for large vendor chunks
      chunkSizeWarningLimit: 800,
      cssCodeSplit: true,
    }
  };
});