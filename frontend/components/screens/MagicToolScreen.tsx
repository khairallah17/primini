'use client';

import { FormEvent, useState } from 'react';
import api from '../../lib/apiClient';
import ProductCard, { ProductSummary } from '../../components/ProductCard';

type MagicResponse = {
  products?: ProductSummary[];
  message?: string;
  link?: string;
};

export default function MagicToolScreen() {
  const [url, setUrl] = useState('');
  const [results, setResults] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | undefined>();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!url) return;
    setLoading(true);
    setMessage(undefined);
    try {
      const response = await api.post<MagicResponse>('/products/magic_lookup/', { link: url });
      setResults(
        (response.data.products ?? []).map((item) => ({
          ...item,
          lowestPrice: item.lowestPrice ?? item.lowest_price
        }))
      );
     setMessage(response.data.message);
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
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row"
      >
        <input
          type="url"
          required
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://www.example.com/produit"
          className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm"
        />
        <button
          type="submit"
          className="rounded-full bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
          disabled={loading}
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
