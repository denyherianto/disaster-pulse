import type { NextConfig } from "next";
import withPWA from "@ducanh2912/next-pwa";

const pwa = withPWA({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = {
  /* config options here */
};

export default process.env.NODE_ENV === "development" ? nextConfig : pwa(nextConfig);
