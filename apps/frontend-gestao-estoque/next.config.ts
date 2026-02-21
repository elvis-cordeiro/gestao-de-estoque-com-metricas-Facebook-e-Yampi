/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.yampi.me',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'king-assets.yampi.me',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;