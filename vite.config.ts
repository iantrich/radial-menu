import { defineConfig } from 'vitest/config';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/radial-menu.ts',
      formats: ['es'],
      fileName: () => 'radial-menu.js',
    },
    minify: true,
    rollupOptions: { external: [] },
  },
  test: {
    environment: 'happy-dom',
    include: ['test/**/*.test.ts'],
  },
});
