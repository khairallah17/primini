/** @type {import('next').NextConfig} */

// Extract hostname and protocol from NEXT_PUBLIC_API_URL
function getApiUrlPattern() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return null;
  
  try {
    const url = new URL(apiUrl);
    return {
      protocol: url.protocol.replace(':', '') || 'http',
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
      // Add API URL hostname if configured
      ...(apiUrlPattern ? [{
        protocol: apiUrlPattern.protocol,
        hostname: apiUrlPattern.hostname
      }] : []),
      {
        protocol: 'https',
        hostname: 'cdn.primini.ma'
      },
      {
        protocol: 'https',
        hostname: 'primini.ma'
      },
      {
        protocol: 'https',
        hostname: 'www.iris.ma'
      },
      {
        protocol: 'https',
        hostname: 'iris.ma'
      },
      {
        protocol: 'https',
        hostname: 'www.biougnach.ma'
      },
      {
        protocol: 'https',
        hostname: 'biougnach.ma'
      },
      {
        protocol: 'https',
        hostname: 'www.electroplanet.ma'
      },
      {
        protocol: 'https',
        hostname: 'electroplanet.ma'
      },
      {
        protocol: 'https',
        hostname: 'websitephotosa.blob.core.windows.net'
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com'
      },
      {
        protocol: 'https',
        hostname: '**.placeholder.com'
      },
      {
        protocol: 'https',
        hostname: 'api.dicebear.com'
      },
      {
        protocol: 'http',
        hostname: 'localhost'
      },
      {
        protocol: 'https',
        hostname: 'image.useinsider.com'
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com'
      },
      {
        protocol: 'https',
        hostname: 'cdn.mos.cms.futurecdn.net'
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
