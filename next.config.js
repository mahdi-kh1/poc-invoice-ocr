/** @type {import('next').NextConfig} */
const nextConfig = {
  // tesseract.js resolves its worker-thread script via a `__dirname`-relative path,
  // and pdfjs-dist loads its worker/canvas backend via dynamic import()/require() —
  // webpack bundling rewrites both and breaks that resolution, so keep them external.
  experimental: {
    serverComponentsExternalPackages: ["tesseract.js", "pdfjs-dist", "@napi-rs/canvas"],
  },
};

module.exports = nextConfig;
