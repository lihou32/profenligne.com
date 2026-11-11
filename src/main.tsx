// Sentry must be initialized before any other imports
import "./lib/sentry";

import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "@fontsource-variable/figtree";
import "@fontsource-variable/bricolage-grotesque";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <ThemeProvider attribute="class" forcedTheme="light" defaultTheme="light" enableSystem={false}>
      <App />
    </ThemeProvider>
  </HelmetProvider>
);
