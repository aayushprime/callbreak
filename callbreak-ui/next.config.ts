import type { NextConfig } from "next";

const nextConfig = {
  transpilePackages: ["common", "callbreak-engine"],
  images: {
    domains: ["www.gravatar.com"],
  },
};

export default nextConfig;
