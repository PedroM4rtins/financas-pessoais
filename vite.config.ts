import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// O GitHub Pages serve o site em /financas-pessoais/.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/financas-pessoais/' : '/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
  },
});
