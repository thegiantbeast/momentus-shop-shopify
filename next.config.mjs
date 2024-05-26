/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: () => [
    { source: '/img/:slug*', destination: '/api/img/:slug*' }
  ]
};

export default nextConfig;
