import Image from 'next/image';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { FavoriteProduct, useFavorites } from '../context/FavoritesContext';

export type ProductSummary = FavoriteProduct & {
  description?: string;
  lowest_price?: number;
  image_display?: string;
  image_file?: string;
  tags?: string[];
};

type ProductCardProps = {
  product: ProductSummary;
  onImageLoadStatus?: (isLoaded: boolean) => void;
};

export default function ProductCard({ product, onImageLoadStatus }: ProductCardProps) {
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const active = isFavorite(product.id);
  const [imageError, setImageError] = useState(false);
  const [currentImageSrc, setCurrentImageSrc] = useState<string | null>(null);

  

  // Helper function to construct image URL
  const getImageUrl = (imagePath: string | undefined): string | null => {
    if (!imagePath) return null;
    
    // If it's already a full URL (http/https), use it directly
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Base URL for media: strip only trailing /api or /api/ so we don't break hostnames like https://api.avita.ma
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
    const baseUrl = apiUrl.replace(/\/api\/?$/, '');
    
    // If it's a local path (starts with /media/ or media/), prepend backend URL
    if (imagePath.startsWith('/media/') || imagePath.startsWith('media/')) {
      const imagePathClean = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      return `${baseUrl}${imagePathClean}`;
    }
    
    // If it's a relative path without /media/, assume it's in media/products/
    if (!imagePath.startsWith('/')) {
      return `${baseUrl}/media/products/${imagePath}`;
    }
    
    return imagePath;
  };

  // Determine initial image source: prefer image_display (local) over image (remote)
  const initialImageSrc = useMemo(() => {
    // Try image_display first (already a full URL from backend)
    if (product.image_display) {
      return product.image_display;
    }
    
    // Try image_file if available
    if (product.image_file) {
      return getImageUrl(product.image_file);
    }
    
    // Fallback to image field
    if (product.image) {
      return getImageUrl(product.image);
    }
    
    return null;
  }, [product.image_display, product.image_file, product.image]);

  const toggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (active) {
      removeFavorite(product.id);
    } else {
      addFavorite(product);
    }
  };

  // Get tags (max 3)
  const displayTags = product.tags?.slice(0, 3) || [];

  const price = product.lowestPrice ?? product.lowest_price;

  // Parse price: backend may send "1.000" (European thousands) which parseFloat turns into 1 — normalize first
  const parsePrice = (value: string | number | undefined | null): number | null => {
    if (value === undefined || value === null) return null;
    if (typeof value === 'number') return isNaN(value) ? null : value;
    const s = String(value).trim();
    if (!s) return null;
    if (/,/.test(s)) {
      const withoutThousands = s.replace(/\./g, '').replace(',', '.');
      const n = parseFloat(withoutThousands);
      return isNaN(n) ? null : n;
    }
    if (/^\d+(\.\d{3})+$/.test(s)) {
      const n = parseFloat(s.replace(/\./g, ''));
      return isNaN(n) ? null : n;
    }
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };
  const numPrice = parsePrice(price);

  // Format price: space as thousand separator, comma for decimals (e.g. 1000 -> 1 000, 1234.5 -> 1 234,5)
  const formatPrice = (n: number): string => {
    const rounded = Math.round(n * 1000) / 1000;
    const integerPart = Math.floor(rounded);
    const decimalPart = rounded - integerPart;
    const intStr = String(integerPart);
    const intFormatted = intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    if (decimalPart > 1e-9) {
      const decRaw = rounded.toFixed(3).split('.')[1] ?? '';
      const decTrimmed = decRaw.replace(/0+$/, '') || '0';
      if (decTrimmed && decTrimmed !== '000') {
        return `${intFormatted},${decTrimmed}`;
      }
    }
    return intFormatted;
  };

  // Strip markdown formatting from description for preview
  const stripMarkdown = (text: string): string => {
    return text
      .replace(/\*\*/g, '') // Remove bold markers
      .replace(/\*/g, '') // Remove italic markers
      .replace(/__/g, '') // Remove bold underscore markers
      .replace(/_/g, '') // Remove italic underscore markers
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1') // Remove markdown links, keep text
      .replace(/`/g, '') // Remove code markers
      .trim();
  };

  const handleImageError = () => {
    // Determine what we were trying
    const wasTryingDisplay = currentImageSrc === product.image_display || (!currentImageSrc && initialImageSrc === product.image_display);
    const wasTryingFile = currentImageSrc === getImageUrl(product.image_file) || (!currentImageSrc && initialImageSrc === getImageUrl(product.image_file));
    
    // Try fallbacks in order: image_display -> image_file -> image
    if (wasTryingDisplay && product.image_file) {
      // Try image_file as fallback
      const fileUrl = getImageUrl(product.image_file);
      if (fileUrl && fileUrl !== currentImageSrc) {
        setCurrentImageSrc(fileUrl);
        setImageError(false);
        return;
      }
    }
    
    if ((wasTryingDisplay || wasTryingFile) && product.image) {
      // Try image as fallback
      const imageUrl = getImageUrl(product.image);
      if (imageUrl && imageUrl !== currentImageSrc && imageUrl !== initialImageSrc) {
        setCurrentImageSrc(imageUrl);
        setImageError(false);
        return;
      }
    }
    
    // All fallbacks exhausted
    setImageError(true);
  };

  // Get current image source to use
  const imageSrc = currentImageSrc || initialImageSrc;

  // Don't render the component if there's no initial image source or if image failed to load
  const shouldHide = !initialImageSrc || imageError || !imageSrc;

  // Notify parent about image load status
  useEffect(() => {
    if (onImageLoadStatus) {
      onImageLoadStatus(!shouldHide);
    }
  }, [shouldHide, onImageLoadStatus]);

  return (
    <Link href={`/product/${product.slug}`} className="block h-full">
      <article className="flex h-full flex-col justify-between rounded-2xl sm:rounded-3xl border border-slate-200 bg-white p-3 sm:p-4 lg:p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg cursor-pointer">
        <div className="flex flex-col gap-2 sm:gap-4">
          {imageSrc && !imageError ? (
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100">
              {/* Tags Pills - Upper Left */}
              {displayTags.length > 0 && (
                <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1.5">
                  {displayTags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-1.5 py-0.5 text-[9px] sm:text-[10px] lg:text-xs font-medium bg-white/90 backdrop-blur-sm text-slate-700 rounded-full border border-slate-200 shadow-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {/* Heart / Favori - Top Right */}
              <button
                onClick={toggleFavorite}
                className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10 flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition hover:bg-white"
                type="button"
                aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                {active ? (
                  <HeartSolid className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                ) : (
                  <HeartOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                )}
              </button>
              <div className="absolute inset-2 sm:inset-3">
                <Image 
                  src={imageSrc} 
                  alt={product.name} 
                fill 
                className="object-contain transition-transform duration-300 hover:scale-105" 
                sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                quality={90}
                priority={false}
                loading="lazy"
                placeholder="blur"
                blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                onError={handleImageError}
                unoptimized={true}
                />
              </div>
            </div>
          ) : (
            <div className="relative aspect-[4/3] flex items-center justify-center rounded-2xl bg-gray-100">
              {/* Tags Pills - Upper Left (even when no image) */}
              {displayTags.length > 0 && (
                <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1.5">
                  {displayTags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-1.5 py-0.5 text-[9px] sm:text-[10px] lg:text-xs font-medium bg-white/90 backdrop-blur-sm text-slate-700 rounded-full border border-slate-200 shadow-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {/* Heart / Favori - Top Right (when no image) */}
              <button
                onClick={toggleFavorite}
                className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 z-10 flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm transition hover:bg-white"
                type="button"
                aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                {active ? (
                  <HeartSolid className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
                ) : (
                  <HeartOutline className="h-4 w-4 sm:h-5 sm:w-5 text-slate-500" />
                )}
              </button>
              <span className="text-[10px] sm:text-xs font-medium text-slate-400">Aucune image</span>
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm lg:text-base font-semibold text-slate-800 line-clamp-2">
              {product.name}
            </h3>
            {product.description && (
              <p className="mt-1 sm:mt-2 line-clamp-2 sm:line-clamp-3 text-[10px] sm:text-xs text-slate-500">
                {stripMarkdown(product.description)}
              </p>
            )}
          </div>
        </div>
        <div className="mt-2 sm:mt-4 flex items-center justify-between">
          {numPrice !== null && !isNaN(numPrice) ? (
            <p className="text-xs sm:text-sm font-semibold text-primary">{formatPrice(numPrice)} MAD</p>
          ) : (
            <p className="text-xs sm:text-sm text-slate-500">Prix en attente</p>
          )}
        </div>
      </article>
    </Link>
  );
}
