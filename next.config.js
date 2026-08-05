/** @type {import('next').NextConfig} */
const nextConfig = {
  // tesseract.js resolves its worker-thread script via a `__dirname`-relative path,
  // and pdfjs-dist loads its worker/canvas backend via dynamic import()/require() —
  // webpack bundling rewrites both and breaks that resolution, so keep them external.
  experimental: {
    serverComponentsExternalPackages: ["tesseract.js", "pdfjs-dist", "@napi-rs/canvas"],
    // tesseract.js-core's .wasm binaries are only reachable via a computed require() deep inside
    // getCore.js (branched on runtime SIMD feature detection), which Vercel's build-time file
    // tracer doesn't reliably follow — this is a widely reported issue where tesseract.js works
    // locally but the .wasm file "goes missing" in the deployed function. Worse, tesseract.js's
    // own WASM-loading promise chain (worker-script/index.js's `load()`) has no .catch(), so a
    // missing file doesn't surface as an error at all — it just never resolves, hanging
    // createWorker() forever. Forcing the .wasm files into the trace is the documented fix.
    outputFileTracingIncludes: {
      "/api/ocr": ["./node_modules/tesseract.js-core/**/*.wasm"],
    },
  },
};

module.exports = nextConfig;
