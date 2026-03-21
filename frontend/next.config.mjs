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
  images: {
    // Disable server-side image optimization to avoid WASM/sharp memory issues on low-RAM VPS
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.avita.ma',
        port: '',
        pathname: '/media/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  }
};

export default nextConfig;
