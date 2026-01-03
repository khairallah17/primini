'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import Image from 'next/image';
import Link from 'next/link';
import { getAdSenseConfig, type AdSlotConfig } from '../lib/settingsApi';

type AdSenseProps = {
  slot: string;
  format?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  style?: React.CSSProperties;
  className?: string;
};

function isAdSlotConfig(value: string | AdSlotConfig | undefined): value is AdSlotConfig {
  return typeof value === 'object' && value !== null && 'ad_type' in value;
}

export default function AdSense({ 
  slot, 
  format = 'auto',
  style = { display: 'block' },
  className = ''
}: AdSenseProps) {
  const [config, setConfig] = useState<any>(null);
  const [slotConfig, setSlotConfig] = useState<string | AdSlotConfig | undefined>(undefined);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        const adsenseConfig = await getAdSenseConfig();
        setConfig(adsenseConfig);
        
        // Get slot-specific configuration
        const slotValue = (adsenseConfig as any)[slot];
        setSlotConfig(slotValue);
      } catch (error) {
        console.warn('Failed to load AdSense config', error);
        setConfig({ enabled: false, publisher_id: '' });
      }
    }
    loadConfig();
  }, [slot]);

  useEffect(() => {
    if (!config?.enabled || !slotConfig) return;
    
    // Reset loaded state when slot changes
    setLoaded(false);
  }, [slot, slotConfig]);

  useEffect(() => {
    if (!config?.enabled || !slotConfig || loaded) return;
    
    // Only load AdSense script if it's an AdSense ad
    if (isAdSlotConfig(slotConfig) && slotConfig.ad_type === 'adsense') {
      if (!config.publisher_id || !slotConfig.adsense_id) return;
      
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        setLoaded(true);
      } catch (err) {
        console.error('AdSense error:', err);
      }
    } else if (typeof slotConfig === 'string' && slotConfig && config.publisher_id) {
      // Legacy: simple string AdSense ID
      try {
        ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        setLoaded(true);
      } catch (err) {
        console.error('AdSense error:', err);
      }
    }
  }, [config, slotConfig, loaded]);

  if (!config?.enabled || !slotConfig) {
    return null; // Don't render if not configured
  }

  // Render image banner if configured
  if (isAdSlotConfig(slotConfig) && slotConfig.ad_type === 'banner') {
    if (!slotConfig.banner_image) {
      return null;
    }

    const bannerContent = (
      <div className={className} style={style}>
        <Image
          src={slotConfig.banner_image}
          alt="Advertisement"
          width={728}
          height={90}
          className="w-full h-auto object-contain"
          unoptimized={true}
        />
      </div>
    );

    // Wrap in link if provided
    if (slotConfig.banner_link) {
      return (
        <Link 
          href={slotConfig.banner_link} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block"
        >
          {bannerContent}
        </Link>
      );
    }

    return bannerContent;
  }

  // Render AdSense ad
  const adsenseId = isAdSlotConfig(slotConfig) 
    ? slotConfig.adsense_id 
    : (typeof slotConfig === 'string' ? slotConfig : '');

  if (!adsenseId || !config.publisher_id) {
    return null;
  }

  return (
    <>
      <Script
        async
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${config.publisher_id}`}
        strategy="afterInteractive"
        crossOrigin="anonymous"
      />
      <ins
        className={`adsbygoogle ${className}`}
        style={style}
        data-ad-client={config.publisher_id}
        data-ad-slot={adsenseId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </>
  );
}

