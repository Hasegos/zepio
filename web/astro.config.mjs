import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import { loadEnv } from "vite";
import { missingProductionEnv } from "./src/lib/site.js";

const env = { ...loadEnv(process.env.NODE_ENV ?? "production", process.cwd(), ""), ...process.env };
const missing = missingProductionEnv(env);
if (missing.length) {
  throw new Error(`PUBLIC_SITE_ENV=production 빌드에는 ${missing.join(", ")} 값이 필요합니다 (docs/SETUP.md 3번)`);
}

export default defineConfig({
  output: "static",
  site: env.PUBLIC_SITE_URL || "http://localhost:4321",
  integrations: [react(), sitemap()],
  build: { inlineStylesheets: "never" },
  vite: { plugins: [tailwindcss()], build: { assetsInlineLimit: 0 } },
});