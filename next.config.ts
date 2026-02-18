// In next.config.js (or next.config.mjs)
const { IgnorePlugin } = require('webpack'); // or `import { IgnorePlugin } from 'webpack';` for .mjs

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {

        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
    ],
  },
  // ... any other config you have
  webpack: (config: { plugins: any[]; }) => {
    // Original fixes
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /^@remotion\/compositor-/,
      })
    );
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /^@remotion\/bundler$/,
      })
    );

    // --- NEW FIXES for this error ---
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /^prettier$/,
      })
    );
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /^@remotion\/cli$/,
      })
    );
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /^@remotion\/studio-server$/,
      })
    );
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /^@remotion\/media-utils$/,
      })
    );
    config.plugins.push(
      new IgnorePlugin({
        resourceRegExp: /^@remotion\/studio$/,
      })
    );
    // --- End of new fixes ---

    return config;
  },
};

module.exports = nextConfig; // or `export default nextConfig;` for .mjs