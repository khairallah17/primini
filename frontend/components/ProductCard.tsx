import Image from 'next/image';
import Link from 'next/link';
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

  const toggleFavorite = () => {
    if (active) {
      removeFavorite(product.id);
    } else {
      addFavorite(product);
    }
  };

  const price = product.lowestPrice ?? product.lowest_price;

  return (
    <article className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
      <div className="flex flex-col gap-4">
        {product.image ? (
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
            <Image src={product.image} alt={product.name} fill className="object-cover" sizes="(min-width: 768px) 300px, 100vw" />
          </div>
        ) : (
          <div className="aspect-[4/3] rounded-2xl bg-slate-100" />
        )}
        <Link href={`/product/${product.slug}`} className="text-lg font-semibold text-slate-800">
          {product.name}
        </Link>
        {product.description && <p className="line-clamp-2 text-sm text-slate-500">{product.description}</p>}
      </div>
      <div className="mt-4 flex items-center justify-between">
        {price !== undefined && price !== null ? (
          <p className="text-sm font-semibold text-primary">{price.toFixed(2)} MAD</p>
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
