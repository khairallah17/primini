'use client';

import { useEffect, useState } from 'react';
import ProductCard, { ProductSummary } from '../../components/ProductCard';
import api from '../../lib/apiClient';

export default function DealsScreen() {
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await api.get<{ results: ProductSummary[] }>('/products/', {
          params: {
            ordering: '-lowest_price',
            page_size: 12
          }
        });
        setProducts(
          response.data.results.map((item) => ({
            ...item,
            lowestPrice: item.lowestPrice ?? item.lowest_price
          }))
        );
      } catch (error) {
        console.warn('Failed to load deals', error);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">Bons plans du moment</h1>
        <p className="text-sm text-slate-500">
          Sélection quotidienne des meilleures promotions dénichées chez nos marchands partenaires.
        </p>
      </header>
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-60 animate-pulse rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200" />
          ))}
        </div>
      ) : products.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <p className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Les bons plans reviendront bientôt. Revenez plus tard !
        </p>
      )}
    </div>
  );
}
