'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../lib/apiClient';
import { magicToolSchema, type MagicToolFormData } from '../../lib/validations';
import ProductCard, { ProductSummary } from '../../components/ProductCard';

type MagicResponse = {
  products?: ProductSummary[];
  message?: string;
  link?: string;
};

export default function MagicToolScreen() {
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<MagicToolFormData>({
    resolver: zodResolver(magicToolSchema),
  });

  const onSubmit = async (data: MagicToolFormData) => {
    setLoading(true);
    setMessage(undefined);
    try {
      const response = await api.post<MagicResponse>('/products/magic_lookup/', { link: data.url });
      setResults(
        (response.data.products ?? []).map((item) => ({
          ...item,
          lowestPrice: item.lowestPrice ?? item.lowest_price
        }))
      );
      setMessage(response.data.message);
      reset();
    } catch (error) {
      console.warn('Failed to analyse url', error);
      setMessage('Impossible de récupérer les informations pour ce lien.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">L&apos;outil magique</h1>
        <p className="text-sm text-slate-500">
          Collez un lien produit pour découvrir automatiquement les meilleures offres disponibles.
        </p>
      </header>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row"
      >
        <div className="flex-1">
          <input
            type="url"
            {...register('url')}
            placeholder="https://www.example.com/produit"
            className={`w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm ${
              errors.url ? 'border-red-500' : ''
            }`}
          />
          {errors.url && (
            <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
          )}
        </div>
        <button
          type="submit"
          className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          disabled={isSubmitting || loading}
        >
          {loading ? 'Analyse en cours...' : 'Comparer'}
        </button>
      </form>

      {message && <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-600">{message}</p>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
