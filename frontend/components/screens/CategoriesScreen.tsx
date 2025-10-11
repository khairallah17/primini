'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/apiClient';
import type { Category } from '../../lib/types';

export default function CategoriesScreen({ title }: { title?: string }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const response = await api.get<Category[]>('/categories/');
        setCategories(response.data);
      } catch (error) {
        console.warn('Failed to load categories', error);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const grouped = useMemo(
    () =>
      categories
        .filter((category) => !category.parent)
        .map((category) => ({
          ...category,
          children: category.children ?? []
        })),
    [categories]
  );

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900">{title ?? 'Toutes les catégories'}</h1>
        <p className="text-sm text-slate-500">
          Naviguez dans les univers Primini et trouvez des produits adaptés à vos besoins.
        </p>
      </header>
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200" />
          ))}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {grouped.map((category) => (
            <div key={category.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-primary">{category.name}</h2>
                  <p className="text-xs text-slate-500">Sélectionnez une sous-catégorie pour explorer les offres.</p>
                </div>
                <Link href={`/categories/${category.slug}`} className="text-sm font-semibold text-secondary">
                  Afficher tout
                </Link>
              </div>
              <ul className="mt-4 grid gap-2 text-sm">
                {category.children.map((child) => (
                  <li key={child.id}>
                    <Link href={`/categories/${child.slug}`} className="text-slate-600 hover:text-primary">
                      {child.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
