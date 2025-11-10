'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import api from '../../lib/apiClient';
import type { PriceOffer, Product } from '../../lib/types';
import Carousel from '../Carousel';
import ProductCard from '../ProductCard';

function formatCurrency(value: number | string | undefined) {
  if (value === undefined || value === null) return 'N/A';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return 'N/A';
  return `${numValue.toFixed(3)} MAD`;
}

type ProductDetailScreenProps = {
  slug: string;
};

type AlertForm = {
  threshold: string;
  submitted: boolean;
};

export default function ProductDetailScreen({ slug }: ProductDetailScreenProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertForm, setAlertForm] = useState<AlertForm>({ threshold: '', submitted: false });
  const [imageError, setImageError] = useState(false);
  const { addFavorite, isFavorite, removeFavorite } = useFavorites();
  const { tokens } = useAuth();

  useEffect(() => {
    async function load() {
      try {
        const response = await api.get<Product>(`/products/${slug}/`);
        setProduct(response.data);
      } catch (error) {
        console.warn('Failed to load product', error);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [slug]);

  const offers = useMemo(() => product?.offers ?? [], [product?.offers]);
  const lowestPrice = offers.length > 0 ? Math.min(...offers.map((offer) => offer.price)) : undefined;
  const favoriteActive = product ? isFavorite(product.id) : false;

  const toggleFavorite = () => {
    if (!product) return;
    if (favoriteActive) {
      removeFavorite(product.id);
    } else {
      addFavorite({
        id: product.id,
        name: product.name,
        slug: product.slug,
        image: product.image,
        lowestPrice
      });
    }
  };

  const submitAlert = async () => {
    if (!product || !alertForm.threshold || !tokens) return;
    try {
      const headers = tokens
        ? tokens.access
          ? { Authorization: `Bearer ${tokens.access}` }
          : tokens.key
            ? { Authorization: `Token ${tokens.key}` }
            : undefined
        : undefined;
      await api.post(
        '/alerts/',
        {
          product: product.id,
          threshold_price: Number(alertForm.threshold)
        },
        headers ? { headers } : undefined
      );
      setAlertForm({ threshold: '', submitted: true });
    } catch (error) {
      console.warn('Failed to create alert', error);
    }
  };

  if (loading) {
    return <div className="h-96 animate-pulse rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200" />;
  }

  if (!product) {
    return <p className="text-center text-sm text-slate-500">Produit introuvable.</p>;
  }

  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[1.1fr,0.9fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-primary">{product.brand}</p>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900">{product.name}</h1>
              </div>
              <button
                type="button"
                onClick={toggleFavorite}
                className={`rounded-full px-4 py-2 text-sm font-semibold ${
                  favoriteActive ? 'bg-secondary text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {favoriteActive ? 'Retirer' : 'Ajouter'}
              </button>
            </div>
            {product.image && !imageError ? (
              <div className="relative mt-6 aspect-[4/3] overflow-hidden rounded-2xl bg-slate-100">
                <Image 
                  src={product.image} 
                  alt={product.name} 
                  fill 
                  className="object-contain" 
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                  quality={95}
                  priority={true}
                  placeholder="blur"
                  blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
                  onError={() => setImageError(true)}
                />
              </div>
            ) : product.image ? (
              <div className="relative mt-6 aspect-[4/3] flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200">
                <span className="text-sm font-medium text-slate-400">Image non disponible</span>
              </div>
            ) : null}
            <p className="mt-6 text-sm leading-relaxed text-slate-600">{product.description}</p>
            {lowestPrice && (
              <p className="mt-8 text-2xl font-semibold text-primary">À partir de {formatCurrency(lowestPrice)}</p>
            )}
            {product.tags && product.tags.length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Offres disponibles</h2>
            {offers.length > 0 ? (
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2">Marchand</th>
                    <th>Prix</th>
                    <th>Stock</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {offers.map((offer: PriceOffer) => (
                    <tr key={offer.id} className="align-middle">
                      <td className="py-3 font-medium text-slate-800">{offer.merchant.name}</td>
                      <td className="py-3 font-semibold text-primary">{formatCurrency(offer.price)}</td>
                      <td className="py-3 text-slate-500">{offer.stock_status}</td>
                      <td className="py-3 text-right">
                        <a
                          href={offer.url}
                          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                        >
                          Voir l&apos;offre
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Aucune offre n&apos;est disponible pour le moment. Revenez plus tard ou activez une alerte prix.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Créer une alerte prix</h2>
            <p className="mt-2 text-sm text-slate-500">
              Recevez une notification dès que le prix descend en dessous du montant défini.
            </p>
            {!tokens && (
              <p className="mt-2 text-xs text-secondary">
                Connectez-vous pour enregistrer vos alertes personnalisées.
              </p>
            )}
            <div className="mt-4 space-y-3">
              <input
                type="number"
                inputMode="numeric"
                value={alertForm.threshold}
                onChange={(event) => setAlertForm({ threshold: event.target.value, submitted: false })}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm"
                placeholder="Prix souhaité"
              />
              <button
                onClick={submitAlert}
                type="button"
                className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={!tokens}
              >
                Créer mon alerte
              </button>
              {alertForm.submitted && (
                <p className="text-xs text-green-600">Alerte enregistrée !</p>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Caractéristiques</h2>
            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm">
              {Object.entries(product.specs || {}).map(([key, value]) => (
                <div key={key} className="flex justify-between rounded-2xl bg-slate-100 px-4 py-3">
                  <dt className="font-medium text-slate-600">{key}</dt>
                  <dd className="text-slate-900">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {product.similar_products && product.similar_products.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-slate-900">Produits similaires</h2>
          <Carousel>
            {product.similar_products.map((item) => (
              <div key={item.id} className="min-w-[250px] snap-start">
                <ProductCard
                  product={{
                    id: item.id,
                    name: item.name,
                    slug: item.slug,
                    image: item.image,
                    lowestPrice: item.lowest_price
                  }}
                />
              </div>
            ))}
          </Carousel>
        </section>
      )}
    </div>
  );
}
