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
  // CSP(script-src, style-src 'self')가 인라인을 막으므로 작은 스크립트와 스타일도 파일로 내보낸다.
  build: { inlineStylesheets: "never" },
  vite: { plugins: [tailwindcss()], build: { assetsInlineLimit: 0 } },
});