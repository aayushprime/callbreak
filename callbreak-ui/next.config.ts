import type { NextConfig } from "next";

const nextConfig = {
  transpilePackages: [
    "common",
    "callbreak-engine",
    "betting-contract",
    "betting-contract/idl",
  ],
  images: {
    domains: ["www.gravatar.com"],
  },
};

export default nextConfig;
