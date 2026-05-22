import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream'],
  turbopack: {
    root: path.resolve(__dirname),
  },
};

export default nextConfig;
