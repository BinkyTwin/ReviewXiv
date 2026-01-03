/** @type {import('next').NextConfig} */
const nextConfig = {
  // Externalize pdfjs-dist for server-side usage
  serverExternalPackages: ["pdfjs-dist"],
  turbopack: {
    resolveAlias: {
      "pdfjs-dist": "pdfjs-dist/legacy/build/pdf",
    },
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "35mb",
    },
  },
};

export default nextConfig;
