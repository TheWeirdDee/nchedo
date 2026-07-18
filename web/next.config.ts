import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // This machine is memory-constrained. Webpack's persistent filesystem cache
  // tries to allocate large buffers it cannot get, which fails mid-write and
  // ships broken/partial JS chunks — the page then never hydrates and every
  // button is dead. Disabling the cache trades slower rebuilds for correct,
  // fully-emitted chunks.
  webpack: (config) => {
    config.cache = false;
    return config;
  },
};

export default nextConfig;
