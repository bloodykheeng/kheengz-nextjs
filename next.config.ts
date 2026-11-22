import type { NextConfig } from "next";

// The API that stores the photos (Next loads .env before this file runs).
const api = new URL(process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000/api");

const nextConfig: NextConfig = {
  // From create-next-app (Next 16.4). Pages are prerendered into a static shell and only what
  // reads the request streams in behind <Suspense>: the storefront opens from the shell, and the
  // session is read in components/auth/SessionProviders.tsx (dashboard and sign-in only).
  cacheComponents: true,
  partialPrefetching: true,

  compiler: {
    // No console output in production builds, except errors: a crash leaves a trace support can read.
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  // next/image sizes the photos the API stores for each spot they are shown in
  // (lib/storedPhoto.ts decides which). From GiftNest.
  images: {
    remotePatterns: [
      {
        protocol: api.protocol === "https:" ? "https" : "http",
        hostname: api.hostname,
        port: api.port,
        pathname: "/storage/**",
        search: "",
      },
    ],
    formats: ["image/webp"],
    qualities: [75],
    // Fewer widths than the defaults: each one is another copy per photo in .next/cache/images.
    deviceSizes: [640, 828, 1080, 1200, 1920],
    imageSizes: [96, 160, 256, 384],
    // A stored photo never changes under its name (a new upload gets a new file), so cache long.
    minimumCacheTTL: 2678400, // 31 days
    // The API takes photos up to 20 MB (upload rules, ImageFromLink::MAX_BYTES).
    maximumResponseBody: 21_000_000,
    maximumRedirects: 0,
    // In development the API is on a private IP (127.0.0.1), which the optimizer refuses.
    unoptimized: process.env.NODE_ENV === "development",
  },

  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
