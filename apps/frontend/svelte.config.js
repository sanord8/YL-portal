import adapter from '@sveltejs/adapter-auto';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),

  kit: {
    adapter: adapter(),
    alias: {
      $lib: './src/lib',
      '@yl-portal/types': '../../packages/types/src',
      '@yl-portal/validation': '../../packages/validation/src',
      '@yl-portal/config': '../../packages/config/src',
      '@yl-portal/i18n': '../../packages/i18n/src',
    },
  },

  // Suppress harmless warnings
  onwarn: (warning, handler) => {
    // Suppress "unknown prop" warnings for SvelteKit internal props like 'params'
    if (warning.code === 'a11y-unknown-prop' ||
        (warning.code === 'unknown-prop' && warning.message.includes('params'))) {
      return;
    }
    // Let Svelte handle all other warnings normally
    handler(warning);
  },
};

export default config;
