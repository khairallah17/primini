'use client';

import { useEffect, useMemo, useState } from 'react';
import FiltersSidebar, { Filters } from '../../components/FiltersSidebar';
import ProductCard, { ProductSummary } from '../../components/ProductCard';
import api from '../../lib/apiClient';
import { FunnelIcon, XMarkIcon } from '@heroicons/react/24/outline';

const DEFAULT_FILTERS: Filters = {
  minPrice: undefined,
  maxPrice: undefined,
  brands: [],
  specs: {},
  ordering: 'lowest_price'
};

type ProductListScreenProps = {
  title: string;
  endpoint: string;
  query?: Record<string, string>;
};

type ApiResponse<T> = {
  count: number;
  total_pages: number;
  current_page: number;
  next_page: number | null;
  previous_page: number | null;
  page_size: number;
  results: T[];
};

export default function ProductListScreen({ title, endpoint, query }: ProductListScreenProps) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [products, setProducts] = useState<ProductSummary[]>([]);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [availableSpecs, setAvailableSpecs] = useState<Record<string, string[]>>({});
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const queryKey = useMemo(() => JSON.stringify(query ?? {}), [query]);

  const params = useMemo(() => {
    const base: Record<string, unknown> = {
      page,
      ordering: filters.ordering ?? 'lowest_price'
    };
    if (filters.minPrice) base.price_min = filters.minPrice;
    if (filters.maxPrice) base.price_max = filters.maxPrice;
    if (filters.brands.length > 0) base.brand = filters.brands.join(',');
    
    // Add spec filters
    Object.entries(filters.specs || {}).forEach(([specKey, specValues]) => {
      if (specValues.length > 0) {
        base[`spec_${specKey}`] = specValues.join(',');
      }
    });
    
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
        setTotalPages(response.data.total_pages || 1);
        
        // Extract available brands
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
        
        // Extract available specs from all products
        const specsMap: Record<string, Set<string>> = {};
        response.data.results.forEach((product) => {
          const productSpecs = (product as unknown as { specs?: Record<string, string | number | boolean> }).specs;
          if (productSpecs) {
            Object.entries(productSpecs).forEach(([key, value]) => {
              if (!specsMap[key]) {
                specsMap[key] = new Set();
              }
              // Convert value to string for filtering
              const stringValue = String(value);
              if (stringValue && stringValue !== 'null' && stringValue !== 'undefined') {
                specsMap[key].add(stringValue);
              }
            });
          }
        });
        
        // Convert Sets to Arrays and sort
        const specsArray: Record<string, string[]> = {};
        Object.entries(specsMap).forEach(([key, values]) => {
          specsArray[key] = Array.from(values).sort();
        });
        setAvailableSpecs(specsArray);
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

  // Prevent body scroll when mobile filters are open
  useEffect(() => {
    if (mobileFiltersOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileFiltersOpen]);

  const hasActiveFilters = 
    filters.minPrice !== undefined || 
    filters.maxPrice !== undefined || 
    filters.brands.length > 0 ||
    Object.values(filters.specs || {}).some((values) => values.length > 0);

  return (
    <div className="flex flex-col gap-8 lg:flex-row">
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden lg:block lg:w-72">
        <FiltersSidebar 
          availableBrands={availableBrands} 
          availableSpecs={availableSpecs}
          filters={filters} 
          onChange={setFilters} 
        />
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileFiltersOpen(false)}
          />
          
          {/* Drawer */}
          <div className="fixed left-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-slate-800">Filtres</h2>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
                aria-label="Fermer les filtres"
                type="button"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4">
              <FiltersSidebar 
                availableBrands={availableBrands} 
                availableSpecs={availableSpecs}
                filters={filters} 
                onChange={setFilters} 
              />
            </div>
          </div>
        </>
      )}

      <div className="flex-1 space-y-6">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile Filters Button */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              type="button"
            >
              <FunnelIcon className="h-5 w-5" />
              <span>Filtres</span>
              {hasActiveFilters && (
                <span className="rounded-full bg-primary text-white text-xs px-2 py-0.5">
                  {[
                    filters.minPrice !== undefined ? 1 : 0,
                    filters.maxPrice !== undefined ? 1 : 0,
                    filters.brands.length,
                    ...Object.values(filters.specs || {}).map(v => v.length)
                  ].reduce((a, b) => a + b, 0)}
                </span>
              )}
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-slate-900">{title}</h1>
              <p className="text-sm text-slate-500">{count} produits trouvés</p>
            </div>
          </div>
          <select
            value={params.ordering as string}
            onChange={(event) => setFilters((prev) => ({ ...prev, ordering: event.target.value } as Filters))}
            className="rounded-full border border-slate-200 px-4 py-2 text-sm bg-white"
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
