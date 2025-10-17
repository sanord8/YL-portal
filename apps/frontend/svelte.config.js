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
};

export default config;
