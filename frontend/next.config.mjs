/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle for small production images.
  output: "standalone",
  async rewrites() {
    // Proxy browser calls to the Go backend so the frontend never needs a
    // public API URL baked in at build time. Auth is a Zitadel bearer token
    // (see app/auth.ts), attached per-request by app/lib/api.ts — not a cookie.
    //
    // Listed explicitly (not a /api/:path* catch-all) so this can never shadow
    // NextAuth's own dynamic route at app/api/auth/[...nextauth] — Next.js
    // resolves plain-array rewrites before dynamic routes, so a catch-all here
    // would swallow every /api/auth/* request before NextAuth ever saw it.
    const api = process.env.YALY_API_BASE_URL || "http://localhost:8080";
    return [
      { source: "/api/me", destination: `${api}/api/me` },
      { source: "/api/orgs", destination: `${api}/api/orgs` },
      { source: "/api/orgs/:path*", destination: `${api}/api/orgs/:path*` },
      { source: "/api/templates", destination: `${api}/api/templates` },
      { source: "/api/templates/:path*", destination: `${api}/api/templates/:path*` },
      { source: "/api/services", destination: `${api}/api/services` },
      { source: "/api/services/:path*", destination: `${api}/api/services/:path*` },
      { source: "/api/requests", destination: `${api}/api/requests` },
      { source: "/api/requests/:path*", destination: `${api}/api/requests/:path*` },
      { source: "/api/admin/:path*", destination: `${api}/api/admin/:path*` },
      { source: "/api/quill/:path*", destination: `${api}/api/quill/:path*` },
    ];
  },
};

export default nextConfig;
