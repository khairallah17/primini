'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import { getAdSenseConfig } from '../lib/settingsApi';

type AdSenseProps = {
  slot: string;
  format?: 'auto' | 'rectangle' | 'vertical' | 'horizontal';
  style?: React.CSSProperties;
  className?: string;
};

export default function AdSense({ 
  slot, 
  format = 'auto',
  style = { display: 'block' },
  className = ''
}: AdSenseProps) {
  const [config, setConfig] = useState<{ enabled: boolean; publisher_id: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadConfig() {
      try {
        const adsenseConfig = await getAdSenseConfig();
        setConfig(adsenseConfig);
      } catch (error) {
        console.warn('Failed to load AdSense config', error);
        setConfig({ enabled: false, publisher_id: '' });
      }
    }
    loadConfig();
  }, []);

  useEffect(() => {
    if (!config?.enabled || !config.publisher_id || !slot) return;
    
    // Reset loaded state when slot changes
    setLoaded(false);
  }, [slot]);

  useEffect(() => {
    if (!config?.enabled || !config.publisher_id || !slot || loaded) return;
    
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
      setLoaded(true);
    } catch (err) {
      console.error('AdSense error:', err);
    }
  }, [config, slot, loaded]);

  if (!config?.enabled || !config.publisher_id || !slot) {
    return null; // Don't render if not configured
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
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </>
  );
}

