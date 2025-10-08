'use client';

import { useEffect, useMemo, useState } from 'react';
import FiltersSidebar, { Filters } from '../../components/FiltersSidebar';
import ProductCard, { ProductSummary } from '../../components/ProductCard';
import api from '../../lib/apiClient';

const DEFAULT_FILTERS: Filters = {
  minPrice: undefined,
  maxPrice: undefined,
  brands: [],
  ordering: 'lowest_price'
};

type ProductListScreenProps = {
  title: string;
  endpoint: string;
  query?: Record<string, string>;
};

type ApiResponse<T> = {
  count: number;
  results: T[];
};

export default function ProductListScreen({ title, endpoint, query }: ProductListScreenProps) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const queryKey = useMemo(() => JSON.stringify(query ?? {}), [query]);

  const params = useMemo(() => {
    const base: Record<string, unknown> = {
      page,
      ordering: filters.ordering ?? 'lowest_price'
    };
    if (filters.minPrice) base.price_min = filters.minPrice;
    if (filters.maxPrice) base.price_max = filters.maxPrice;
    if (filters.brands.length > 0) base.brand = filters.brands.join(',');
    const parsedQuery = queryKey ? (JSON.parse(queryKey) as Record<string, string>) : {};
    Object.assign(base, parsedQuery);
    return base;
  }, [filters, page, queryKey]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const response = await api.get<ApiResponse<ProductSummary>>(endpoint, { params });
        setProducts(
          response.data.results.map((item) => ({
            ...item,
            lowestPrice: item.lowestPrice ?? item.lowest_price
          }))
        );
        setCount(response.data.count);
        if (response.headers['x-available-brands']) {
          setAvailableBrands(response.headers['x-available-brands'].split(','));
        } else {
          const brands = Array.from(
            new Set(
              response.data.results
                .map((item) => (item as { brand?: string }).brand)
                .filter((brand): brand is string => Boolean(brand))
            )
          );
          setAvailableBrands(brands);
        }
      } catch (error) {
        console.warn('Failed to load products list', error);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [endpoint, params]);

  useEffect(() => {
    setPage(1);
  }, [filters, queryKey]);

  const totalPages = Math.max(1, Math.ceil(count / 12));

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      <div className="lg:w-72">
        <FiltersSidebar availableBrands={availableBrands} filters={filters} onChange={setFilters} />
      </div>
      <div className="flex-1 space-y-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500">{count} produits trouvés</p>
          </div>
          <select
            value={params.ordering as string}
            onChange={(event) => setFilters((prev) => ({ ...prev, ordering: event.target.value } as Filters))}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm"
          >
            <option value="lowest_price">Prix croissant</option>
            <option value="-lowest_price">Prix décroissant</option>
            <option value="-id">Nouveautés</option>
          </select>
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
            Aucun produit ne correspond à votre recherche. Ajustez les filtres pour découvrir d&apos;autres résultats.
          </p>
        )}
        <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-3">
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-semibold text-primary disabled:text-slate-400"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page === 1}
          >
            Précédent
          </button>
          <span className="text-sm text-slate-500">
            Page {page} sur {totalPages}
          </span>
          <button
            type="button"
            className="rounded-full px-4 py-2 text-sm font-semibold text-primary disabled:text-slate-400"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages}
          >
            Suivant
          </button>
        </div>
      </div>
    </div>
  );
}
