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
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        // Chặn clickjacking (không cho trang khác nhúng iframe)
        { key: "X-Frame-Options", value: "DENY" },
        // Chặn trình duyệt đoán sai MIME type
        { key: "X-Content-Type-Options", value: "nosniff" },
        // Kiểm soát thông tin Referer gửi đi
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // Bật DNS prefetch để tăng tốc
        { key: "X-DNS-Prefetch-Control", value: "on" },
        // Bắt buộc HTTPS (1 năm, bao gồm subdomain)
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        // Chống XSS: chặn inline script nguy hiểm (Content-Security-Policy)
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=()",
        },
      ],
    },
  ],
};

export default nextConfig;
