/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@subscriptions-manager/shared"],
  // The parity suite (e2e/parity) builds into its own directory so it never
  // overwrites the regular `.next` build. Unset everywhere else.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

module.exports = nextConfig;
