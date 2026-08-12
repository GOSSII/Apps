import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Product images come from Supabase Storage; the hostname is
  // project-specific, so it is configured via env rather than hardcoded.
  images: {
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? [{ protocol: "https", hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname }]
      : [],
  },
};

export default nextConfig;
