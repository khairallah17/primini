'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useState } from 'react';
import { useFavorites } from '../context/FavoritesContext';

export default function FavoriteBar() {
  const { favorites, removeFavorite } = useFavorites();
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white shadow-lg"
        type="button"
      >
        Ma Sélection ({favorites.length})
      </button>
      {open && (
        <div className="w-80 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-primary">Produits favoris</h3>
            <button onClick={() => setOpen(false)} className="rounded-full bg-slate-100 p-1" type="button">
              <XMarkIcon className="h-5 w-5 text-slate-500" />
            </button>
          </div>
          {favorites.length === 0 ? (
            <p className="text-sm text-slate-500">Ajoutez des produits pour les suivre facilement.</p>
          ) : (
            <ul className="space-y-3">
              {favorites.map((product) => (
                <li key={product.id} className="flex items-start justify-between gap-3">
                  <div>
                    <Link href={`/product/${product.slug}`} className="font-medium text-slate-800">
                      {product.name}
                    </Link>
                    {(product.lowestPrice ?? product.lowest_price) !== undefined && (
                      <p className="text-xs text-slate-500">
                        à partir de {(product.lowestPrice ?? product.lowest_price)!.toFixed(2)} MAD
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => removeFavorite(product.id)}
                    className="text-xs text-secondary hover:underline"
                    type="button"
                  >
                    Retirer
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
