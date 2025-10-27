import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    allowedHosts: [
      '.ngrok-free.dev',     // Allow ngrok free tier domains
      '.ngrok-free.app',     // Allow alternative ngrok domains
      '.ngrok.io',           // Allow legacy ngrok domains
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['@yl-portal/types', '@yl-portal/validation', '@yl-portal/config'],
    include: ['svelte', '@trpc/client'], // Pre-bundle these for faster dev startup
  },
  build: {
    // Enable minification
    minify: 'esbuild',
    // Target modern browsers for better optimization
    target: 'es2020',
    // CSS code splitting
    cssCodeSplit: true,
    // Source maps for production debugging (disable for smaller bundles)
    sourcemap: false,
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Vendor chunk for third-party libraries
          if (id.includes('node_modules')) {
            if (id.includes('svelte')) {
              return 'vendor-svelte';
            }
            if (id.includes('@trpc')) {
              return 'vendor-trpc';
            }
            return 'vendor';
          }

          // Separate chunks for different route groups
          if (id.includes('/routes/admin')) {
            return 'admin';
          }
          if (id.includes('/routes/reports')) {
            return 'reports';
          }

          // Chart components in separate chunk
          if (id.includes('Chart.svelte')) {
            return 'charts';
          }

          // UI components
          if (id.includes('/components/')) {
            return 'components';
          }
        },
        // Optimize asset file names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          } else if (/woff2?|ttf|otf|eot/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Increase chunk size warning limit (500kb)
    chunkSizeWarningLimit: 500,
    // Report compressed size
    reportCompressedSize: true,
  },
  // Performance optimizations
  esbuild: {
    legalComments: 'none',
    treeShaking: true,
  },
});
