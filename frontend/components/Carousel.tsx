'use client';

import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/solid';
import { ReactNode, useRef } from 'react';

export default function Carousel({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    const container = containerRef.current;
    if (!container) return;
    const amount = container.clientWidth * 0.8;
    container.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth'
    });
  };

  return (
    <div className="relative">
      <div ref={containerRef} className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4">
        {children}
      </div>
      <button
        onClick={() => scroll('left')}
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg"
        type="button"
        aria-label="Précédent"
      >
        <ChevronLeftIcon className="h-5 w-5 text-primary" />
      </button>
      <button
        onClick={() => scroll('right')}
        className="absolute right-0 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg"
        type="button"
        aria-label="Suivant"
      >
        <ChevronRightIcon className="h-5 w-5 text-primary" />
      </button>
    </div>
  );
}
