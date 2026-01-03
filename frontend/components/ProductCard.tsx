import Image from 'next/image';
import Link from 'next/link';
import { useState, useMemo } from 'react';
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
};

export default function ProductCard({ product }: ProductCardProps) {
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const baseUrl = apiUrl.replace('/api', '');
      const imagePathClean = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
      return `${baseUrl}${imagePathClean}`;
    }
    
    // If it's a relative path without /media/, assume it's in media/products/
    if (!imagePath.startsWith('/')) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
      const baseUrl = apiUrl.replace('/api', '');
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

  // Get current image source to use
  const imageSrc = currentImageSrc || initialImageSrc;

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

  return (
    <Link href={`/product/${product.slug}`} className="block h-full">
      <article className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg cursor-pointer">
        <div className="flex flex-col gap-4">
          {imageSrc && !imageError ? (
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
            <div className="relative aspect-[4/3] flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
              {/* Tags Pills - Upper Left (even when no image) */}
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
              <span className="text-xs font-medium text-slate-400">Aucune image</span>
            </div>
          )}
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
