import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin Turbopack's workspace root to this project directory.
  // Without this, Next.js 16 walks up to /Users/pranav/ (which has a
  // stale package-lock.json), causing it to scan the entire home directory
  // during module resolution and making dev compilation very slow.
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
