import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

// `npm run build`      -> aplicația reală (Supabase), pentru Vercel
// `npm run build:demo` -> un singur fișier HTML, fără server (date salvate local)
export default defineConfig(({ mode }) => ({
  plugins: mode === 'demo' ? [react(), viteSingleFile()] : [react()],
  define: mode === 'demo' ? { 'import.meta.env.VITE_FORCE_DEMO': '"1"' } : {},
  build: { outDir: mode === 'demo' ? 'dist-demo' : 'dist' },
}));
