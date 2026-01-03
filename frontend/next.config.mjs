/** @type {import('next').NextConfig} */

// Extract hostname and protocol from NEXT_PUBLIC_API_URL
function getApiUrlPattern() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  
  try {
    const url = new URL(apiUrl);
    return {
      protocol: url.protocol.replace(':', '') || 'https',
      hostname: url.hostname
    };
  } catch (e) {
    console.warn('Invalid NEXT_PUBLIC_API_URL:', apiUrl);
    return null;
  }
}

const apiUrlPattern = getApiUrlPattern();

const nextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.azyo6271.odns.fr',
        port: '',
        pathname: '/media/**',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    unoptimized: false
  }
};

export default nextConfig;
