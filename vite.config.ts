import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
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
          // Core React runtime — cached long-term, rarely changes
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // Data fetching — separate from UI so cache busts independently
          "vendor-query": ["@tanstack/react-query"],
          // Supabase SDK
          "vendor-supabase": ["@supabase/supabase-js"],
          // Radix UI primitives (bulk of Shadcn) — large but stable
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-switch",
            "@radix-ui/react-slider",
            "@radix-ui/react-alert-dialog",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-avatar",
            "@radix-ui/react-label",
            "@radix-ui/react-separator",
          ],
        },
      },
    },
  },
}));
