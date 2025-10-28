'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent } from 'react';
import ProductCard, { ProductSummary } from '../../components/ProductCard';
import api from '../../lib/apiClient';
import type { Category } from '../../lib/types';

export default function HomeScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [popular, setPopular] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  useEffect(() => {
    async function load() {
      try {
        const [categoriesResponse, popularResponse] = await Promise.all([
          api.get<{ results: Category[] }>('/categories/'),
          api.get<{ results: Array<{ id: number; product: ProductSummary }> }>('/popular-products/')
        ]);
        setCategories((categoriesResponse.data.results || []).filter((category) => !category.parent));
        setPopular(
          (popularResponse.data.results || []).map((item) => ({
            ...item.product,
            lowestPrice: item.product.lowestPrice ?? item.product.lowest_price
          }))
        );
      } catch (error) {
        console.warn('Failed to load home data', error);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  return (
    <div className="space-y-16">
      <section className="grid gap-10 rounded-3xl bg-gradient-to-br from-primary via-purple-500 to-secondary px-10 py-16 text-white shadow-xl md:grid-cols-[1.1fr,1fr]">
        <div className="space-y-6">
          <p className="text-sm uppercase tracking-wider text-white/60">Comparateur intelligent</p>
          <h1 className="text-4xl font-semibold leading-snug">
            Trouvez le meilleur prix pour vos produits high-tech préférés.
          </h1>
          <p className="text-base text-white/80">
            Comparez instantanément les offres des marchands marocains et soyez alerté dès que les prix baissent.
          </p>
          <form
            onSubmit={handleSearchSubmit}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <input
              type="search"
              className="flex-1 rounded-2xl border-0 bg-white/90 px-6 py-4 text-slate-900 placeholder-slate-500 shadow-lg backdrop-blur focus:bg-white focus:outline-none focus:ring-2 focus:ring-white/50"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
            <button
              type="submit"
              className="rounded-2xl bg-white px-8 py-4 text-sm font-semibold text-primary shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
            >
              Rechercher
            </button>
          </form>
        </div>
        <div className="flex flex-col justify-end gap-4 text-sm text-white/80">
          <div className="rounded-3xl bg-white/10 p-6 backdrop-blur">
            <h2 className="text-lg font-semibold text-white">Les chiffres clés</h2>
            <ul className="mt-4 space-y-3">
              <li>+3000 produits suivis en temps réel</li>
              <li>+40 marchands référencés</li>
              <li>Alertes personnalisées gratuites</li>
            </ul>
          </div>
        </div>
      </section>

      <section>
        <header className="mb-8">
          <h2 className="text-3xl font-semibold text-slate-800">Parcourir par catégorie</h2>
          <p className="mt-2 text-sm text-slate-500">Explorez nos catégories pour trouver les meilleurs produits</p>
        </header>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {loading && categories.length === 0 && <CategorySkeleton />}
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="group relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-8 shadow-sm transition-all hover:-translate-y-2 hover:border-primary/40 hover:shadow-xl"
            >
              {category.icon ? (
                <div className="relative mb-4 h-16 w-16">
                  <Image 
                    src={category.icon} 
                    alt={category.name}
                    width={64}
                    height={64}
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-secondary/20">
                  <span className="text-2xl font-bold text-primary">
                    {category.name.charAt(0)}
                  </span>
                </div>
              )}
              <h3 className="text-center text-base font-semibold text-slate-800 transition-colors group-hover:text-primary">
                {category.name}
              </h3>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-800">Produits populaires</h2>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {popular.length > 0 ? (
            popular.map((product) => <ProductCard key={product.id} product={product} />)
          ) : (
            <p className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Les produits populaires seront affichés dès qu&apos;ils seront disponibles.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <div key={index} className="flex h-40 animate-pulse flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200 p-8">
          <div className="mb-4 h-16 w-16 rounded-full bg-slate-300" />
          <div className="h-4 w-24 rounded bg-slate-300" />
        </div>
      ))}
    </>
  );
}
