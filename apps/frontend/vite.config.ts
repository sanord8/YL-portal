import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    exclude: ['@yl-portal/types', '@yl-portal/validation', '@yl-portal/config'],
  },
  build: {
    // Enable minification
    minify: 'esbuild',
    // Target modern browsers for better optimization
    target: 'es2020',
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk for third-party libraries
          vendor: [
            'svelte',
            '@trpc/client',
            '@trpc/server',
          ],
          // Separate chunk for UI components
          components: [
            '$lib/components/Button.svelte',
            '$lib/components/ConfirmDialog.svelte',
            '$lib/components/ResetPasswordModal.svelte',
          ],
        },
      },
    },
    // Increase chunk size warning limit (500kb)
    chunkSizeWarningLimit: 500,
  },
});
