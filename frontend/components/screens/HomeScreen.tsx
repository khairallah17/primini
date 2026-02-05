'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { FormEvent } from 'react';
import { 
  FaMobileAlt, 
  FaLaptop, 
  FaTv, 
  FaBlender, 
  FaFilm, 
  FaCamera, 
  FaLeaf,
  FaBox
} from 'react-icons/fa';
import ProductCard, { ProductSummary } from '../../components/ProductCard';
import api from '../../lib/apiClient';
import { getProductsWithDescription } from '../../lib/productApi';
import { getAdSenseConfig, type AdSenseConfig } from '../../lib/settingsApi';
import { getParentCategories } from '../../lib/categoryApi';
import type { Category, Product } from '../../lib/types';
import AdSense from '../../components/AdSense';
import { getCategoryImage } from '../../lib/categoryImages';
import HomeLoader from '../HomeLoader';

export default function HomeScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [popular, setPopular] = useState<ProductSummary[]>([]);
  const [productsWithDesc, setProductsWithDesc] = useState<ProductSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingDesc, setLoadingDesc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [adsenseConfig, setAdsenseConfig] = useState<AdSenseConfig | null>(null);
  const [showLoader, setShowLoader] = useState(false);
  const router = useRouter();

  // Check if this is the first visit
  useEffect(() => {
    const hasVisited = sessionStorage.getItem('hasVisitedHome');
    if (!hasVisited) {
      setShowLoader(true);
      sessionStorage.setItem('hasVisitedHome', 'true');
    }
  }, []);

  const handleSearchSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  useEffect(() => {
    async function load() {
      try {
        const [categoriesData, productsResponse] = await Promise.all([
          getParentCategories(),
          api.get<{ results: ProductSummary[] }>('/products/?page_size=100')
        ]);
        // Handle both paginated and array responses
        const parentCategories = Array.isArray(categoriesData) 
          ? categoriesData 
          : categoriesData.results || [];
        setCategories(parentCategories);
        const products = (productsResponse.data.results || []).map((product) => ({
          ...product,
          lowestPrice: product.lowestPrice ?? product.lowest_price
        }));
        setPopular(getRandomSample(products, 20));
      } catch (error) {
        console.warn('Failed to load home data', error);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    async function loadProductsWithDescription() {
      setLoadingDesc(true);
      try {
        const response = await getProductsWithDescription(50, 1, 100);
        const products = (response.results || []).map((product: ProductSummary) => ({
          ...product,
          lowestPrice: (product as any).lowestPrice ?? (product as any).lowest_price
        }));
        setProductsWithDesc(products);
      } catch (error) {
        console.warn('Failed to load products with descriptions', error);
      } finally {
        setLoadingDesc(false);
      }
    }
    void loadProductsWithDescription();
  }, []);

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

  const handleLoaderComplete = () => {
    setShowLoader(false);
  };

  const isContentLoading = loading || loadingDesc;

  return (
    <>
      {showLoader && (
        <HomeLoader isLoading={isContentLoading} onComplete={handleLoaderComplete} />
      )}
      <section
        className="relative overflow-hidden bg-gradient-to-br from-primary via-primary/95 to-primary-dark px-4 md:px-10 py-3 md:py-10 text-white shadow-xl -mt-10"
        style={{ width: '100vw', marginLeft: 'calc(-50vw + 50%)', marginRight: 'calc(-50vw + 50%)' }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 z-0 bg-gradient-to-br from-primary/60 via-primary/50 to-primary-dark/60" />

        {/* Content */}
        <div className="relative z-10 container mx-auto max-w-6xl text-center space-y-2 md:space-y-5">

          <h1 className="text-lg md:text-4xl font-bold leading-tight">
            Trouvez le meilleur prix pour vos produits high-tech préférés.
          </h1>

          <p className="text-xs md:text-base text-white/80 max-w-3xl mx-auto">
            Comparez instantanément les offres des marchands marocains et soyez alerté dès que les prix baissent.
          </p>

          <form
            onSubmit={handleSearchSubmit}
            className="mt-3 md:mt-6 flex flex-row gap-2 justify-center"
          >
            <input
              type="search"
              className="w-full max-w-xs md:max-w-2xl text-sm md:text-base rounded-2xl border-0 bg-white/90 md:px-6 px-3 md:py-4 py-2 text-slate-900 placeholder-slate-500 shadow-lg backdrop-blur focus:bg-white focus:outline-none focus:ring-2 focus:ring-white/50"
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />

            <button
              type="submit"
              className="rounded-2xl bg-white px-4 md:px-6 py-2 md:py-4 text-primary shadow-lg transition-all hover:bg-white/90 hover:shadow-xl flex items-center justify-center"
              aria-label="Rechercher"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6 text-primary" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="7" />
                <line x1="16.65" y1="16.65" x2="21" y2="21" strokeLinecap="round"/>
              </svg>
            </button>
          </form>

        </div>
      </section>


      <div className="md:space-y-16 space-y-8">
      <div className="flex justify-center">
        <AdSense slot="homepage_top" className="my-8" />
      </div>

      <section>
        <header className="mb-8">
          <h2 className="md:text-3xl text-xl font-semibold text-slate-800">Parcourir par catégorie</h2>
          <p className="mt-2 text-sm text-slate-500">Explorez nos catégories pour trouver les meilleurs produits</p>
        </header>
        <div className="overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          <div className="flex items-center gap-3 md:gap-4 min-w-max flex-nowrap">
            {loading && categories.length === 0 && <CategorySkeleton />}
            {categories
              .filter((category) => category.name.toLowerCase() !== 'autre')
              .map((category) => (
                <CategoryCard key={category.slug} category={category} />
              ))}
          </div>
        </div>
      </section>

      <div className="flex justify-center">
        <AdSense slot="homepage_middle" className="my-8" />
      </div>

      <section>
        <div className="flex items-center justify-between">
          <h2 className="md:text-2xl text-xl font-semibold text-slate-800">Produits populaires</h2>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {loadingDesc ? (
            <p className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Chargement des produits...
            </p>
          ) : productsWithDesc.length > 0 ? (
            productsWithDesc.slice(0, 12).map((product) => <ProductCard key={product.id} product={product} />)
          ) : popular.length > 0 ? (
            popular.map((product) => <ProductCard key={product.id} product={product} />)
          ) : (
            <p className="col-span-full rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
              Les produits populaires seront affichés dès qu&apos;ils seront disponibles.
            </p>
          )}
        </div>
      </section>

      <div className="flex justify-center">
        <AdSense slot="homepage_bottom" className="my-8" />
      </div>
      </div>
    </>
  );
}

// Function to get category icon from react-icons based on category name
function getCategoryIcon(categoryName: string) {
  const normalizedName = categoryName.toLowerCase().trim();
  
  // Smartphones
  if (normalizedName.includes('smartphone') || normalizedName.includes('téléphonie') || normalizedName.includes('telephonie')) {
    return <FaMobileAlt className="md:w-12 md:h-12 w-10 h-10" />;
  }
  
  // Informatique
  if (normalizedName.includes('informatique') || normalizedName.includes('ordinateur') || normalizedName.includes('laptop')) {
    return <FaLaptop className="md:w-12 md:h-12 w-10 h-10" />;
  }
  
  // Électroménager
  if ((normalizedName.includes('électroménager') || normalizedName.includes('electromenager')) && !normalizedName.includes('petit')) {
    return <FaTv className="md:w-12 md:h-12 w-10 h-10" />;
  }
  
  // Petit Électroménager
  if (normalizedName.includes('petit') && (normalizedName.includes('électroménager') || normalizedName.includes('electromenager'))) {
    return <FaBlender className="md:w-12 md:h-12 w-10 h-10" />;
  }
  
  // Image & Son
  if (normalizedName.includes('image') && normalizedName.includes('son')) {
    return <FaFilm className="md:w-12 md:h-12 w-10 h-10" />;
  }
  
  // Photo & Caméra
  if (normalizedName.includes('photo') || normalizedName.includes('caméra') || normalizedName.includes('camera')) {
    return <FaCamera className="md:w-12 md:h-12 w-10 h-10" />;
  }
  
  // Santé - Beauté
  if (normalizedName.includes('santé') || normalizedName.includes('sante') || normalizedName.includes('beauté') || normalizedName.includes('beaute')) {
    return <FaLeaf className="md:w-12 md:h-12 w-10 h-10" />;
  }
  
  // Default icon
  return <FaBox className="md:w-12 md:h-12 w-10 h-10" />;
}

function CategoryCard({ category }: { category: Category }) {
  return (
    <Link
      href={`/categories/${category.slug}`}
      className="group flex flex-col items-center justify-center md:p-4 p-3 transition-all hover:scale-105 flex-shrink-0"
    >
      <div className="mb-3 text-primary group-hover:text-primary/80 transition-colors">
        {getCategoryIcon(category.name)}
      </div>
      <h3 className="md:text-sm text-xs font-semibold text-slate-800 group-hover:text-primary transition-colors text-center whitespace-nowrap">
        {category.name}
      </h3>
    </Link>
  );
}

function CategorySkeleton() {
  return (
    <>
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className="flex animate-pulse flex-col items-center justify-center p-4 sm:p-6 flex-shrink-0">
          <div className="mb-3 h-12 w-12 rounded bg-slate-300" />
          <div className="h-4 w-20 rounded bg-slate-300" />
        </div>
      ))}
    </>
  );
}

function getRandomSample<T>(items: T[], size: number): T[] {
  if (items.length <= size) {
    return items;
  }
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, size);
}
