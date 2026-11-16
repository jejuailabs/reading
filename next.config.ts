import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  devIndicators: false,
  // Bundle the Admin SDK's CJS -> ESM dependency chain. Serverless Node can
  // disable require(esm), which otherwise makes jwks-rsa's jose import crash.
  // Keep the current crypto versions and let Next compile their module boundary.
  transpilePackages: ["firebase-admin", "jwks-rsa", "jose"],
};

export default nextConfig;
