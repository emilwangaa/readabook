/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command, isPreview }) => ({
  // GitHub Pages serves the site from /readabook/; keep the dev server at /
  base: command === 'build' || isPreview ? '/readabook/' : '/',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true, // lets Testing Library auto-clean up between tests
  },
}))
