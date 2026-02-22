import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import node from '@astrojs/node';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  integrations: [react(), tailwind()],
  vite: {
    resolve: {
      alias: {
        // Point at the local barrel export, not the stale npm copy.
        // npm can't symlink a package to itself in workspaces, so
        // node_modules/jules-ink is an old published version.
        'jules-ink': path.resolve(__dirname, '..', 'dist'),
      },
    },
    ssr: {
      // Externalize so Node.js loads the native addons at runtime
      external: ['jules-ink'],
    },
  },
});
