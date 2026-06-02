import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Disable React StrictMode to prevent double-invocation of effects
  // (which was causing callObject event listeners to be registered
  // twice in dev, leaving each event with Array(2) listeners and
  // double-firing handlers). Set to true once the codebase is fully
  // StrictMode-safe.
  reactStrictMode: false,
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
