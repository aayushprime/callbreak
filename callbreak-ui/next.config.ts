import type { NextConfig } from "next";

const nextConfig = {
  transpilePackages: ["common", "game-logic"],
  images: {
    domains: ["www.gravatar.com"],
  },
};

export default nextConfig;
