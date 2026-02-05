import Image from 'next/image';
import Link from 'next/link';
import { useState, useMemo, useEffect } from 'react';
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
    
    // If it's a local path (starts with /media/ or media/), prepend backend URL
    if (imagePath.startsWith('/media/') || imagePath.startsWith('media/')) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.avita.ma/api';
      // Remove /api from the end of the URL if present
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
      const imagePathClean = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      return `${baseUrl}${imagePathClean}`;
    }
    
    // If it's a relative path without /media/, assume it's in media/products/
    if (!imagePath.startsWith('/')) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.avita.ma/api';
      // Remove /api from the end of the URL if present
      const baseUrl = apiUrl.endsWith('/api') ? apiUrl.slice(0, -4) : apiUrl;
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
  const numPrice = price !== undefined && price !== null ? (typeof price === 'string' ? parseFloat(price) : price) : null;

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
    <Link 
      href={`/product/${product.slug}`} 
      className={`block h-full ${shouldHide ? 'hidden h-0 w-0' : ''}`}
    >
      <article className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg cursor-pointer">
        <div className="flex flex-col gap-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white">
            {/* Tags Pills - Upper Left */}
            {displayTags.length > 0 && (
              <div className="absolute top-2 left-2 z-10 flex flex-wrap gap-1.5">
                {displayTags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-white/90 backdrop-blur-sm text-slate-700 rounded-full border border-slate-200 shadow-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <div className="absolute inset-2 sm:inset-3">
              {imageSrc && (
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
              )}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800">
              {product.name}
            </h3>
            {product.description && (
              <p className="mt-2 line-clamp-3 text-xs text-slate-500">
                {stripMarkdown(product.description)}
              </p>
            )}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          {numPrice !== null && !isNaN(numPrice) ? (
            <p className="text-sm font-semibold text-primary">{numPrice.toFixed(3)} MAD</p>
          ) : (
            <p className="text-sm text-slate-500">Prix en attente</p>
          )}
          <button
            onClick={toggleFavorite}
            className={`rounded-full px-3 py-2 text-xs font-semibold ${
              active ? 'bg-secondary text-white' : 'bg-slate-200 text-slate-700'
            }`}
            type="button"
          >
            {active ? 'Retirer' : 'Favori'}
          </button>
        </div>
      </article>
    </Link>
  );
}
