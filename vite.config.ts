import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset paths: the built app runs from any folder (it is deployed at /<repo>/app/).
  base: './',
});
