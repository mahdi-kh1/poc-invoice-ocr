/** @type {import('next').NextConfig} */
const nextConfig = {
  // tesseract.js resolves its worker-thread script via a `__dirname`-relative path;
  // webpack bundling rewrites `__dirname` and breaks that resolution, so keep it external.
  experimental: {
    serverComponentsExternalPackages: ["tesseract.js"],
  },
};

module.exports = nextConfig;
