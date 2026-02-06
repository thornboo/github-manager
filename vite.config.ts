import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8081,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      // 使用 injectManifest 以便我们能扩展 SW 行为（缓存策略/消息处理等）。
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",

      // 由应用侧自行调用 virtual:pwa-register 注册，避免注入脚本造成重复注册。
      injectRegister: false,
      registerType: "prompt",

      includeAssets: [
        "favicon.ico",
        "apple-touch-icon.png",
        "mask-icon.svg",
        "pwa-192x192.png",
        "pwa-512x512.png",
        "badge-72x72.png",
        "shortcut-stars.png",
        "shortcut-dashboard.png",
      ],

      manifest: {
        name: "GitHub Manager",
        short_name: "GH Manager",
        description: "一站式 GitHub Stars、PR、Issues 和 Releases 管理工具",
        theme_color: "#1a1a2e",
        background_color: "#1a1a2e",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        shortcuts: [
          {
            name: "Stars",
            short_name: "Stars",
            description: "查看 Star 仓库",
            url: "/repos",
            icons: [{ src: "shortcut-stars.png", sizes: "96x96" }],
          },
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "查看仪表板",
            url: "/dashboard",
            icons: [{ src: "shortcut-dashboard.png", sizes: "96x96" }],
          },
        ],
        categories: ["developer", "productivity", "utilities"],
      },

      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },

      devOptions: {
        enabled: mode === "development",
        type: "module",
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
