'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Carousel from '../../components/Carousel';
import ProductCard, { ProductSummary } from '../../components/ProductCard';
import api from '../../lib/apiClient';
import type { Category, Promotion } from '../../lib/types';

export default function HomeScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [popular, setPopular] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [categoriesResponse, promotionsResponse, popularResponse] = await Promise.all([
          api.get<Category[]>('/categories/'),
          api.get<Promotion[]>('/promotions/'),
          api.get<Array<{ id: number; product: ProductSummary }>>('/popular-products/')
        ]);
        setCategories(categoriesResponse.data.filter((category) => !category.parent));
        setPromotions(promotionsResponse.data);
        setPopular(
          popularResponse.data.map((item) => ({
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
        <header className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-800">Catégories populaires</h2>
        </header>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {loading && categories.length === 0 && <CategorySkeleton />}
          {categories.map((category) => (
            <Link
              key={category.slug}
              href={`/categories/${category.slug}`}
              className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
            >
              <p className="text-sm font-semibold text-primary">{category.name}</p>
              <p className="mt-2 text-xs text-slate-500">Découvrez les meilleurs prix de la catégorie.</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-800">Promotions du moment</h2>
        </div>
        <div className="mt-6 space-y-10">
          {promotions.map((promotion) => (
            <div key={promotion.id} className="space-y-4">
              <h3 className="text-lg font-semibold text-primary">{promotion.title}</h3>
              <Carousel>
                {promotion.products.map((product) => (
                  <div key={product.id} className="min-w-[250px] snap-start">
                    <ProductCard
                      product={{
                        id: product.id,
                        name: product.name,
                        slug: product.slug,
                        image: product.image,
                        lowestPrice: product.lowestPrice ?? product.lowest_price,
                        description: product.description
                      }}
                    />
                  </div>
                ))}
              </Carousel>
            </div>
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
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-32 animate-pulse rounded-3xl bg-gradient-to-br from-slate-100 to-slate-200" />
      ))}
    </>
  );
}
