import { defineConfig } from 'vite';

// The web app lives in web/ and is built into dist/, which Firebase Hosting serves.
// Files in web/public (icons, manifest, robots.txt, sitemap.xml, ASCII figures) are
// copied to the root of dist/ as they are; everything the page imports gets a hashed
// name under static/, so it can be cached for good.
export default defineConfig({
  root: 'web',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    assetsDir: 'static',
  },
});
