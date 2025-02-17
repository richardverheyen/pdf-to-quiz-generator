/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
  assetPrefix: "/assets", // Must start with a slash
  distDir: "build",
  basePath: "/assets",
  trailingSlash: false,
};

export default nextConfig;
