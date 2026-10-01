import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        'nls-public': fileURLToPath(new URL('nls-public.html', import.meta.url)),
      },
    },
  },
});
