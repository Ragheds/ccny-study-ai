import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  additionalPrecacheEntries: [
    {
      url: "/offline",
      revision: process.env.BUILD_REVISION ?? String(Date.now()),
    },
  ],
});

const nextConfig: NextConfig = { serverExternalPackages: ["pdf-parse"] };

export default withSerwist(nextConfig);
