'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCategory, getCategorySubcategories } from '../../lib/categoryApi';
import type { Category } from '../../lib/types';
import ProductListScreen from './ProductListScreen';

type CategoryProductsScreenProps = {
  slug: string;
};

export default function CategoryProductsScreen({ slug }: CategoryProductsScreenProps) {
  const [category, setCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();
  const selectedSubcategory = searchParams.get('subcategory');

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [categoryData, subcategoriesData] = await Promise.all([
          getCategory(slug),
          getCategorySubcategories(slug).catch(() => []) // If it's a subcategory, this will fail, which is fine
        ]);
        setCategory(categoryData);
        setSubcategories(subcategoriesData);
      } catch (error) {
        console.warn('Failed to load category', error);
        // Try to load as subcategory
        try {
          const categoryData = await getCategory(slug);
          setCategory(categoryData);
        } catch (e) {
          console.warn('Failed to load category as subcategory', e);
        }
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [slug]);

  // Use the new category API endpoint
  const categoryEndpoint = useMemo(() => {
    return `/categories/${slug}/products/`;
  }, [slug]);

  // Build query params from URL search params
  const query = useMemo(() => {
    const params: Record<string, string> = {};
    if (selectedSubcategory) {
      params.subcategory = selectedSubcategory;
    }
    // Add other query params if needed
    const brand = searchParams.get('brand');
    if (brand) params.brand = brand;
    const priceMin = searchParams.get('price_min');
    if (priceMin) params.price_min = priceMin;
    const priceMax = searchParams.get('price_max');
    if (priceMax) params.price_max = priceMax;
    return params;
  }, [selectedSubcategory, searchParams]);

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="h-10 w-64 animate-pulse rounded bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-60 animate-pulse rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {subcategories.length > 0 && (
        <div className="rounded-3xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">Sous-catégories</h2>
          <div className="flex flex-wrap gap-2">
            <a
              href={`/categories/${slug}`}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                !selectedSubcategory
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Tous
            </a>
            {subcategories.map((subcat) => (
              <a
                key={subcat.id}
                href={`/categories/${slug}?subcategory=${subcat.slug}`}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                  selectedSubcategory === subcat.slug
                    ? 'bg-primary text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {subcat.name}
              </a>
            ))}
          </div>
        </div>
      )}
      <ProductListScreen
        title={category ? category.name : 'Catégorie'}
        endpoint={categoryEndpoint}
        query={query}
      />
    </div>
  );
}
