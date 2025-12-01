'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../context/AuthContext';
import { useFavorites } from '../../context/FavoritesContext';
import api from '../../lib/apiClient';
import { alertSchema, type AlertFormData } from '../../lib/validations';
import { getAdSenseConfig, type AdSenseConfig } from '../../lib/settingsApi';
import type { PriceOffer, Product } from '../../lib/types';
import Carousel from '../Carousel';
import ProductCard from '../ProductCard';
import AdSense from '../AdSense';

function formatCurrency(value: number | string | undefined) {
  if (value === undefined || value === null) return 'N/A';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return 'N/A';
  return `${numValue.toFixed(3)} MAD`;
}

type ProductDetailScreenProps = {
  slug: string;
};


export default function ProductDetailScreen({ slug }: ProductDetailScreenProps) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [adsenseConfig, setAdsenseConfig] = useState<AdSenseConfig | null>(null);
  const [offersExpanded, setOffersExpanded] = useState(false);
  const { addFavorite, isFavorite, removeFavorite } = useFavorites();
  const { tokens, user, isAdmin } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: {
      threshold: '',
    },
  });

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

  useEffect(() => {
    async function loadAdSenseConfig() {
      try {
        const config = await getAdSenseConfig();
        setAdsenseConfig(config);
      } catch (error) {
        console.warn('Failed to load AdSense config', error);
      }
    }
    void loadAdSenseConfig();
  }, []);

  const offers = useMemo(() => product?.offers ?? [], [product?.offers]);
  const lowestPrice = offers.length > 0 ? Math.min(...offers.map((offer) => offer.price)) : undefined;
  const favoriteActive = product ? isFavorite(product.id) : false;
  const MAX_VISIBLE_OFFERS = 5;
  const shouldCollapse = offers.length > MAX_VISIBLE_OFFERS;
  const visibleOffers = shouldCollapse && !offersExpanded 
    ? offers.slice(0, MAX_VISIBLE_OFFERS) 
    : offers;
  
  // Check if user can edit this product
  const canEdit = product && user && (
    isAdmin || 
    (product.created_by_email === user.email && product.approval_status !== 'approved')
  );

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

  const submitAlert = async (data: AlertFormData) => {
    if (!product || !tokens) return;
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
          threshold_price: Number(data.threshold)
        },
        headers ? { headers } : undefined
      );
      reset();
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
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
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm uppercase tracking-wide text-primary">{product.brand}</p>
                  {product.approval_status === 'pending' && (
                    <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-800">
                      En attente
                    </span>
                  )}
                  {product.approval_status === 'rejected' && (
                    <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-semibold text-red-800">
                      Rejeté
                    </span>
                  )}
                </div>
                <h1 className="mt-2 text-3xl font-semibold text-slate-900">{product.name}</h1>
                {product.approval_status === 'rejected' && product.rejection_reason && (
                  <p className="mt-2 text-sm text-red-600">
                    Raison: {product.rejection_reason}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <Link
                    href={`/products/${product.slug}/edit`}
                    className="rounded-full bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    Modifier
                  </Link>
                )}
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
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Caractéristiques</h2>
            {product.description && (
              <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Description</h3>
                <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">
                  {product.description}
                </p>
              </div>
            )}
            {Object.keys(product.specs || {}).length > 0 && (
              <div className={product.description ? 'mt-6' : 'mt-4'}>
                <h3 className="mb-2 text-sm font-semibold text-slate-700">Spécifications techniques</h3>
                <dl className="grid grid-cols-1 gap-3 text-sm">
                  {Object.entries(product.specs || {}).map(([key, value]) => (
                    <div key={key} className="flex justify-between rounded-2xl bg-slate-100 px-4 py-3">
                      <dt className="font-medium text-slate-600">{key}</dt>
                      <dd className="text-slate-900">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
            {!product.description && Object.keys(product.specs || {}).length === 0 && (
              <p className="mt-4 text-sm text-slate-500">Aucune caractéristique disponible pour ce produit.</p>
            )}
          </div>

          {adsenseConfig?.product_detail_sidebar && (
            <div className="flex justify-center">
              <AdSense slot={adsenseConfig.product_detail_sidebar} className="my-6" />
            </div>
          )}

          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Offres disponibles</h2>
            {offers.length > 0 ? (
              <>
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
                    {visibleOffers.map((offer: PriceOffer) => (
                      <tr key={offer.id} className="align-middle">
                        <td className="py-3 font-medium text-slate-800">{offer.merchant.name}</td>
                        <td className="py-3 font-semibold text-primary">{formatCurrency(offer.price)}</td>
                        <td className="py-3 text-slate-500">{offer.stock_status}</td>
                        <td className="py-3 text-right">
                          <a
                            href={offer.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white hover:bg-primary-dark transition-colors"
                          >
                            Voir l&apos;offre
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {shouldCollapse && (
                  <button
                    onClick={() => setOffersExpanded(!offersExpanded)}
                    className="mt-4 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                    type="button"
                  >
                    {offersExpanded 
                      ? `Afficher moins (${offers.length - MAX_VISIBLE_OFFERS} offres cachées)`
                      : `Afficher toutes les offres (${offers.length - MAX_VISIBLE_OFFERS} de plus)`
                    }
                  </button>
                )}
              </>
            ) : (
              <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Aucune offre n&apos;est disponible pour le moment. Revenez plus tard ou activez une alerte prix.
              </p>
            )}
          </div>

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
            <form onSubmit={handleSubmit(submitAlert)} className="mt-4 space-y-3">
              <div>
                <input
                  type="number"
                  inputMode="numeric"
                  step="0.01"
                  {...register('threshold')}
                  className={`w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm ${
                    errors.threshold ? 'border-red-500' : ''
                  }`}
                  placeholder="Prix souhaité"
                />
                {errors.threshold && (
                  <p className="mt-1 text-xs text-red-600">{errors.threshold.message}</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                disabled={!tokens}
              >
                Créer mon alerte
              </button>
              {submitted && (
                <p className="text-xs text-green-600">Alerte enregistrée !</p>
              )}
            </form>
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

      {adsenseConfig?.product_detail_bottom && (
        <div className="flex justify-center">
          <AdSense slot={adsenseConfig.product_detail_bottom} className="my-8" />
        </div>
      )}
    </div>
  );
}
