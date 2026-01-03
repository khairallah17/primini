'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';

type HomeLoaderProps = {
  isLoading: boolean;
  onComplete: () => void;
};

export default function HomeLoader({ isLoading, onComplete }: HomeLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    // Minimum 5 seconds timer
    const minTimer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 5000);

    // Progress animation (0-100% over 5 seconds)
    // Update every 50ms, adding 1% each time = 100% in 5 seconds
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          return 100;
        }
        return prev + 1; // 1% every 50ms = 100% in 5 seconds
      });
    }, 50);

    return () => {
      clearTimeout(minTimer);
      clearInterval(progressInterval);
    };
  }, []);

  useEffect(() => {
    // Hide loader when both conditions are met: min time elapsed AND content loaded
    if (minTimeElapsed && !isLoading) {
      // Small delay for smooth transition
      setTimeout(() => {
        onComplete();
      }, 300);
    }
  }, [minTimeElapsed, isLoading, onComplete]);

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-primary">
      <div className="flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="flex flex-col items-center">
          <Image
            src="/images/avito-colors.jpeg"
            alt="Avita"
            width={320}
            height={320}
            className="h-32 w-auto object-contain md:h-40"
            priority
            unoptimized={true}
          />
        </div>

        {/* Progress Bar */}
        <div className="w-64 md:w-80">
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full bg-secondary transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

