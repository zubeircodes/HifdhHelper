import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hide the floating "N" dev-tools badge in `next dev`.
  devIndicators: false,

  // Next blocks cross-origin requests to dev-only assets (/_next/*) by default.
  // Without this, opening the dev server through a tunnel serves the HTML but
  // never the JS chunks: the page renders, React never hydrates, every button
  // is inert, and anything reading client state stays on its server snapshot.
  //
  // Hostnames only, no scheme and no port. `*` matches exactly one label.
  // Dev-only; it has no effect on `next build` or production.
  // The acoustic models are immutable and hundreds of megabytes. Without this
  // they are refetched on every page load, which dominates start-up time on a
  // phone. The filename carries the version, so caching forever is safe.
  async headers() {
    return [
      {
        source: "/models/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },

  allowedDevOrigins: [
    "*.ngrok-free.dev",
    "*.ngrok-free.app",
    "*.ngrok.app",
    "*.ngrok.dev",
    "*.ngrok.io",
    "*.trycloudflare.com",
    // LAN testing. Note http:// over a LAN IP is not a secure context, so the
    // page will load but speech recognition still will not start there.
    "192.168.*.*",
    "10.*.*.*",
  ],
};

export default nextConfig;
