import type { NextConfig } from "next";

const requestedDistDir = process.env.NEXT_DIST_DIR;
const distDir = requestedDistDir && /^\.next-[\w-]+$/.test(requestedDistDir) ? requestedDistDir : ".next";

const nextConfig: NextConfig = {
  distDir,
  turbopack: {
    rules: {
      "*.so": { type: "asset" },
      "*.wasm": { type: "asset" },
    },
    resolveAlias: {
      worker_threads: { browser: "./lib/php-wasm-browser-worker-threads.ts" },
    },
  },
};

export default nextConfig;
