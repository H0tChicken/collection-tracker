import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Correctness is gated by `npm run typecheck` and `npm run test`. No ESLint
  // ruleset is configured for this project, so skip it during the build.
  eslint: { ignoreDuringBuilds: true },
  // Allow remote card images referenced by URL.
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // pdf-parse / xlsx are server-only; keep them out of the client bundle.
  serverExternalPackages: ["pdf-parse", "xlsx"],
};

export default nextConfig;
