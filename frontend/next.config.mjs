/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: [
        'localhost:3000',
        '*.app.github.dev',
        'improved-sniffle-wrgjrjxg9gwj299r-3000.app.github.dev'
      ]
    }
  }
};

export default nextConfig;