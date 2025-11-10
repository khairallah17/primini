import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { FavoriteProduct, useFavorites } from '../context/FavoritesContext';

export type ProductSummary = FavoriteProduct & {
  description?: string;
  lowest_price?: number;
};

type ProductCardProps = {
  product: ProductSummary;
};

export default function ProductCard({ product }: ProductCardProps) {
  const { addFavorite, removeFavorite, isFavorite } = useFavorites();
  const active = isFavorite(product.id);
  const [imageError, setImageError] = useState(false);

  const toggleFavorite = () => {
    if (active) {
      removeFavorite(product.id);
    } else {
      addFavorite(product);
    }
  };

  const price = product.lowestPrice ?? product.lowest_price;
  const numPrice = price !== undefined && price !== null ? (typeof price === 'string' ? parseFloat(price) : price) : null;

  return (
    <article className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex flex-col gap-4">
        {product.image && !imageError ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-white">
            <Image 
              src={product.image} 
              alt={product.name} 
              fill 
              className="object-contain transition-transform duration-300 hover:scale-105" 
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
              quality={90}
              priority={false}
              loading="lazy"
              placeholder="blur"
              blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="aspect-[4/3] flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
            <span className="text-xs font-medium text-slate-400">Aucune image</span>
          </div>
        )}
        <Link href={`/product/${product.slug}`} className="text-lg font-semibold text-slate-800">
          {product.name}
        </Link>
        {product.description && <p className="line-clamp-2 text-sm text-slate-500">{product.description}</p>}
      </div>
      <div className="mt-4 flex items-center justify-between">
        {numPrice !== null && !isNaN(numPrice) ? (
          <p className="text-sm font-semibold text-primary">{numPrice.toFixed(2)} MAD</p>
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
  );
}
