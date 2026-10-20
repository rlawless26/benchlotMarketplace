import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The OG card route reads its TTFs from disk at request time; make sure the
  // serverless bundle carries them.
  outputFileTracingIncludes: {
    '/guide/og/[...slug]': ['./assets/fonts/*.ttf'],
  },
};

export default nextConfig;
