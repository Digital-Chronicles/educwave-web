import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */

    images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'esucgvtswgadgvfztegj.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};




module.exports = nextConfig;

export default nextConfig;
