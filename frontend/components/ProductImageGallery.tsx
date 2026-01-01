'use client';

import { useState, forwardRef } from 'react';
import Image from 'next/image';

type ProductImageGalleryProps = {
  images: string[];
  productName: string;
};

const ProductImageGallery = forwardRef<HTMLDivElement, ProductImageGalleryProps>(
  ({ images, productName }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

    const handleImageError = (index: number) => {
      setImageErrors((prev) => ({ ...prev, [index]: true }));
    };

    if (images.length === 0) {
      return (
        <div ref={ref} className="w-full flex flex-col items-center">
          <div className="relative aspect-[4/3] w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
            <span className="text-sm font-medium text-slate-400">Image non disponible</span>
          </div>
        </div>
      );
    }

    const mainImage = images[selectedIndex] || images[0];
    const hasError = imageErrors[selectedIndex];

    const handleNext = () => {
      setSelectedIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrev = () => {
      setSelectedIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
      <div ref={ref} className="w-full flex flex-col items-center">
        {/* Main Image Container */}
        <div className="relative aspect-[4/3] w-full max-w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl overflow-hidden rounded-xl sm:rounded-2xl bg-slate-100 mb-3 sm:mb-4 group">
          {mainImage && !hasError ? (
            <>
              <div className="absolute inset-2 sm:inset-3 md:inset-4 lg:inset-6">
                <Image
                  src={mainImage}
                  alt={productName}
                  fill
                  className="object-contain transition-opacity duration-300"
                  sizes="(max-width: 640px) 100vw, (max-width: 768px) 28rem, (max-width: 1024px) 32rem, 36rem"
                  quality={95}
                  priority={selectedIndex === 0}
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                  onError={() => handleImageError(selectedIndex)}
                />
              </div>
              
              {/* Navigation Arrows */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="absolute left-2 sm:left-3 md:left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white active:bg-white rounded-full p-1.5 sm:p-2 shadow-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 z-10"
                    aria-label="Image précédente"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="absolute right-2 sm:right-3 md:right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white active:bg-white rounded-full p-1.5 sm:p-2 shadow-lg transition-all opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 z-10"
                    aria-label="Image suivante"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                  
                  {/* Image Counter */}
                  <div className="absolute bottom-2 sm:bottom-3 md:bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm">
                    {selectedIndex + 1} / {images.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-xs sm:text-sm font-medium text-slate-400">Image non disponible</span>
            </div>
          )}
        </div>

        {/* Thumbnail Gallery */}
        {images.length > 1 && (
          <div className="w-full max-w-full sm:max-w-lg md:max-w-xl lg:max-w-2xl">
            <div className="w-full overflow-x-auto scrollbar-hide snap-x snap-mandatory scroll-smooth touch-pan-x">
              <div className="inline-flex gap-2 sm:gap-2.5 md:gap-3 pb-2 px-1 sm:px-2">
                {images.map((image, index) => {
                  const isSelected = index === selectedIndex;
                  const hasThumbError = imageErrors[index];

                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => setSelectedIndex(index)}
                      className={`relative flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-lg overflow-hidden border-2 transition-all snap-start ${
                        isSelected
                          ? 'border-primary ring-2 ring-primary/20 scale-105 shadow-md'
                          : 'border-slate-200 hover:border-slate-300 hover:scale-105 active:scale-95'
                      }`}
                      aria-label={`Voir l'image ${index + 1}`}
                    >
                      {image && !hasThumbError ? (
                        <Image
                          src={image}
                          alt={`${productName} - Vue ${index + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 56px, (max-width: 768px) 64px, (max-width: 1024px) 80px, 96px"
                          quality={75}
                          loading="lazy"
                          onError={() => handleImageError(index)}
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                          <span className="text-[10px] sm:text-xs text-slate-400">N/A</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

ProductImageGallery.displayName = 'ProductImageGallery';

export default ProductImageGallery;

