/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the pipeline to run as a long-lived async server action
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client", "prisma"],
  },
};

module.exports = nextConfig;
