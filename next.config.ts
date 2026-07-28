import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for iddb container deployment.
  output: "standalone",
  // Without this, runtime fs reads of /content work in dev but 500 in the
  // deployed standalone container (files aren't traced into the output).
  outputFileTracingIncludes: { "/**": ["./content/**/*"] },
};

export default nextConfig;
