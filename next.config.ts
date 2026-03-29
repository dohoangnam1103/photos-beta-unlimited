import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "utfs.io",
      },
      {
        protocol: "https",
        hostname: "*.ufs.sh",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  eslint: {
    // Vercel build sẽ bỏ qua check ESLint để tăng tốc (nên check ở code editor)
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Vercel build sẽ bỏ qua check TypeScript (nên check ở local)
    ignoreBuildErrors: true,
  },
  sassOptions: {
    silenceDeprecations: ["legacy-js-api"],
  },
};

export default nextConfig;
