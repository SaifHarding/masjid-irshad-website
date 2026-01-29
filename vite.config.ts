import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'radix-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-select',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-accordion',
          ],
          'supabase': ['@supabase/supabase-js'],
          'tanstack-query': ['@tanstack/react-query'],
          'forms': ['react-hook-form', 'zod'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // Disable source maps in production
  },
}));
