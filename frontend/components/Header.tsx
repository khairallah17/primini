'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useState, FormEvent, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useFavorites } from '../context/FavoritesContext';
import { XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { getParentCategories, getCategorySubcategories } from '../lib/categoryApi';
import type { Category } from '../lib/types';
import CategoriesDropdown from './CategoriesDropdown';

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout, loading, isAdmin, isClient, isUser, isVisitor } = useAuth();
  const { favorites, removeFavorite } = useFavorites();
  const [searchQuery, setSearchQuery] = useState('');
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [categorySubcategories, setCategorySubcategories] = useState<Record<string, Category[]>>({});
  const favoritesRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Check if header should be hidden (after all hooks are called)
  const shouldHideHeader = pathname?.startsWith('/admin') || pathname === '/register' || pathname === '/login';

  const topNavLinks = [
    { href: '/deals', label: 'Bons plans' },
    { href: '/magic-tool', label: "L'outil magique" },
    { href: '/categories', label: 'Catégories' },
    { href: '/blog', label: 'Blog' }
  ];

  // Fetch categories on mount
  useEffect(() => {
    async function loadCategories() {
      try {
        const categoriesData = await getParentCategories();
        // Handle both paginated and array responses
        const parentCategories = Array.isArray(categoriesData) 
          ? categoriesData 
          : categoriesData.results || [];
        setCategories(parentCategories);
      } catch (error) {
        console.warn('Failed to load categories', error);
      }
    }
    void loadCategories();
  }, []);

  // Load subcategories when a category is expanded
  useEffect(() => {
    if (expandedCategory && !categorySubcategories[expandedCategory]) {
      const loadSubcategories = async () => {
        try {
          const category = categories.find(cat => cat.name === expandedCategory);
          if (category) {
            const subcategories = await getCategorySubcategories(category.slug);
            setCategorySubcategories(prev => ({
              ...prev,
              [expandedCategory]: subcategories
            }));
          }
        } catch (error) {
          console.warn('Failed to load subcategories', error);
        }
      };
      void loadSubcategories();
    }
  }, [expandedCategory, categories, categorySubcategories]);

  // Close sidebar when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // Check if click is not on the hamburger button
        const target = event.target as HTMLElement;
        if (!target.closest('[data-mobile-menu-button]')) {
          setMobileSidebarOpen(false);
        }
      }
    }

    if (mobileSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Prevent body scroll when sidebar is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.body.style.overflow = '';
    };
  }, [mobileSidebarOpen]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearchSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
  };

  // Close favorites panel when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (favoritesRef.current && !favoritesRef.current.contains(event.target as Node)) {
        setFavoritesOpen(false);
      }
    }

    if (favoritesOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [favoritesOpen]);



  // Hide header on admin pages and auth pages (after all hooks)
  if (shouldHideHeader) {
    return null;
  }

  return (
    <header className="bg-white sticky top-0 z-50 shadow-lg">

      {/* Main Header */}
      <div className="border-b border-gray-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <Image
              src="/images/avita-logo-white-bg.png"
              alt="Avita"
              width={112}
              height={50}
              className="md:h-9 h-9 w-auto object-contain"
              priority
              unoptimized={true}
            />
          </Link>

          {/* Search Bar - Hidden on mobile (shown in sidebar) */}
          <form onSubmit={handleSearchSubmit} className="hidden lg:flex flex-1 max-w-2xl mx-8">
            <div className="relative w-full">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un produit..."
                className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <svg
                className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </form>

          {/* Right Side Actions - Hidden on mobile (shown in sidebar) */}
          <div className="hidden lg:flex items-center gap-3">
            {/* Ma sélection (Favorites) - for all users */}
            <div className="relative" ref={favoritesRef}>
              <button
                onClick={() => setFavoritesOpen(!favoritesOpen)}
                className="flex items-center gap-2 rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm font-medium text-primary hover:bg-gray-100 transition-colors"
                type="button"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="hidden sm:inline">Ma sélection</span>
                {favorites.length > 0 && (
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-white">
                    {favorites.length}
                  </span>
                )}
              </button>
              
              {/* Favorites Dropdown Panel */}
              {favoritesOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-white/20 bg-white p-5 shadow-2xl">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-primary">Produits favoris</h3>
                    <button 
                      onClick={() => setFavoritesOpen(false)} 
                      className="rounded-full bg-gray-100 p-1 hover:bg-gray-200" 
                      type="button"
                    >
                      <XMarkIcon className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>
                  {favorites.length === 0 ? (
                    <p className="text-sm text-gray-500">Ajoutez des produits pour les suivre facilement.</p>
                  ) : (
                    <ul className="space-y-3 max-h-96 overflow-y-auto">
                      {favorites.map((product) => (
                        <li key={product.id} className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <Link 
                              href={`/product/${product.slug}`} 
                              className="font-medium text-gray-800 hover:text-primary block truncate"
                              onClick={() => setFavoritesOpen(false)}
                            >
                              {product.name}
                            </Link>
                            {(product.lowestPrice ?? product.lowest_price) !== undefined && (
                              <p className="text-xs text-gray-500">
                                à partir de {(product.lowestPrice ?? product.lowest_price)!.toFixed(2)} MAD
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeFavorite(product.id)}
                            className="flex-shrink-0 text-xs text-secondary hover:underline font-medium"
                            type="button"
                          >
                            Retirer
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* User Account */}
            {loading ? (
              <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
            ) : user ? (
              <div className="flex items-center gap-3">
                {isAdmin ? (
                  <Link
                    href="/admin"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold transition-colors hover:bg-primary/90"
                    title="Aller au tableau de bord admin"
                  >
                    {(user.first_name?.[0] || user.username?.[0] || user.email[0] || 'U').toUpperCase()}
                  </Link>
                ) : isClient ? (
                  <Link
                    href="/dashboard"
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold transition-colors hover:bg-primary/90"
                  >
                    {(user.first_name?.[0] || user.username?.[0] || user.email[0] || 'U').toUpperCase()}
                  </Link>
                ) : (
                  // 'user' role - no dashboard access, just show avatar without link
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white text-sm font-semibold"
                    title="Compte utilisateur"
                  >
                    {(user.first_name?.[0] || user.username?.[0] || user.email[0] || 'U').toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block">
                  <p className="text-sm font-medium text-primary">
                    {user.first_name && user.last_name
                      ? `${user.first_name} ${user.last_name}`
                      : user.username || 'Mon compte'}
                  </p>
                  <button
                    onClick={handleLogout}
                    className="text-xs text-primary/70 hover:text-primary transition-colors"
                  >
                    Déconnexion
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-medium text-primary hover:bg-gray-100 transition-colors sm:inline-block"
                >
                  Connexion
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-secondary px-4 py-2 text-sm font-medium text-white hover:bg-secondary/90 transition-colors shadow-lg"
                >
                  Inscription
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button - Right Side */}
          <button
            data-mobile-menu-button
            onClick={() => setMobileSidebarOpen(true)}
            className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg text-primary hover:bg-gray-100 transition-colors"
            aria-label="Ouvrir le menu"
            type="button"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="border-b border-gray-200 bg-gray-50 relative">
        <div className="mx-auto max-w-7xl px-6">
          <nav className="flex items-center gap-6 overflow-x-auto py-3 scrollbar-hide">
            {/* Bons plans link */}
            <Link
              href="/deals"
              className={`whitespace-nowrap text-sm font-medium transition-colors ${
                pathname?.startsWith('/deals')
                  ? 'text-primary border-b-2 border-secondary pb-1'
                  : 'text-primary/80 hover:text-primary'
              }`}
            >
              Bons plans
            </Link>
            
            {/* Categories Dropdown Button */}
            <CategoriesDropdown 
              isOpen={categoriesOpen} 
              onOpenChange={setCategoriesOpen}
            >
              <button
                className={`whitespace-nowrap text-sm font-medium transition-colors flex items-center gap-1 ${
                  categoriesOpen || pathname?.startsWith('/categories')
                    ? 'text-primary border-b-2 border-secondary pb-1'
                    : 'text-primary/80 hover:text-primary'
                }`}
                type="button"
              >
                Catégories
                <svg
                  className={`h-4 w-4 transition-transform ${categoriesOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </CategoriesDropdown>
          </nav>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {mobileSidebarOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/50 z-50 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          
          {/* Sidebar */}
          <div
            ref={sidebarRef}
            className="fixed left-0 top-0 h-full w-full max-w-sm bg-white z-50 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden overflow-y-auto"
          >
            {/* Sidebar Header */}
            <div className="sticky top-0 bg-white p-4 flex items-center justify-between border-b border-gray-200 z-10">
              <Link 
                href="/" 
                onClick={() => setMobileSidebarOpen(false)}
                className="flex-shrink-0"
              >
                <Image
                  src="/images/avita-logo-white-bg.png"
                  alt="Avita"
                  width={320}
                  height={320}
                  className="h-6 w-auto object-contain"
                  priority
                  unoptimized={true}
                />
              </Link>
              <button
                onClick={() => setMobileSidebarOpen(false)}
                className="flex items-center justify-center w-10 h-10 rounded-lg text-primary hover:bg-gray-100 transition-colors"
                aria-label="Fermer le menu"
                type="button"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Sidebar Content */}
            <div className="p-4 space-y-4">
              {/* Search Bar */}
              <form onSubmit={(e) => { handleSearchSubmit(e); setMobileSidebarOpen(false); }}>
                <div className="relative">
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher un produit..."
                    className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <svg
                    className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </form>

              {/* Navigation Links */}
              <div className="space-y-2">
                <Link
                  href="/deals"
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    pathname?.startsWith('/deals')
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Bons plans
                </Link>
                <Link
                  href="/magic-tool"
                  onClick={() => setMobileSidebarOpen(false)}
                  className={`block px-4 py-3 rounded-lg text-base font-medium transition-colors ${
                    pathname?.startsWith('/magic-tool')
                      ? 'bg-primary/10 text-primary'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  L&apos;outil magique
                </Link>
              </div>

              {/* Categories Section */}
              <div className="border-t border-gray-200 pt-4">
                <h3 className="px-4 py-2 text-sm font-semibold text-gray-500 uppercase tracking-wide">
                  Catégories
                </h3>
                <div className="space-y-1">
                  {categories.map((category) => {
                    const isExpanded = expandedCategory === category.name;
                    const subcategories = categorySubcategories[category.name] || [];

                    return (
                      <div key={category.id}>
                        <button
                          onClick={() => setExpandedCategory(isExpanded ? null : category.name)}
                          className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                          type="button"
                        >
                          <span>{category.name}</span>
                          <svg
                            className={`h-5 w-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="pl-4 mt-1 space-y-1">
                            {subcategories.length > 0 ? (
                              subcategories.map((subcategory) => (
                                <Link
                                  key={subcategory.id}
                                  href={`/categories/${subcategory.slug}`}
                                  onClick={() => setMobileSidebarOpen(false)}
                                  className="block px-4 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                                >
                                  {subcategory.name}
                                </Link>
                              ))
                            ) : (
                              <div className="px-4 py-2 text-sm text-gray-500">Chargement...</div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* User Section */}
              <div className="border-t border-gray-200 pt-4">
                {loading ? (
                  <div className="px-4 py-3">
                    <div className="h-10 w-full animate-pulse rounded bg-gray-200" />
                  </div>
                ) : user ? (
                  <div className="space-y-3">
                    {/* User Profile */}
                    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white text-lg font-semibold">
                        {(user.first_name?.[0] || user.username?.[0] || user.email[0] || 'U').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {user.first_name && user.last_name
                            ? `${user.first_name} ${user.last_name}`
                            : user.username || user.email}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                    </div>

                    {/* Dashboard Button */}
                    {(isAdmin || isClient) && (
                      <Link
                        href={isAdmin ? '/admin' : '/dashboard'}
                        onClick={() => setMobileSidebarOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Mon Tableau de bord
                      </Link>
                    )}

                    {/* Favorites Button */}
                    <button
                      onClick={() => {
                        setFavoritesOpen(true);
                        setMobileSidebarOpen(false);
                      }}
                      className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:bg-gray-100 transition-colors"
                      type="button"
                    >
                      <div className="flex items-center gap-3">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        <span>Ma sélection</span>
                      </div>
                      {favorites.length > 0 && (
                        <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-white">
                          {favorites.length}
                        </span>
                      )}
                    </button>

                    {/* Logout Button */}
                    <button
                      onClick={() => {
                        handleLogout();
                        setMobileSidebarOpen(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
                      type="button"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Déconnexion
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Link
                      href="/login"
                      onClick={() => setMobileSidebarOpen(false)}
                      className="block w-full text-center px-4 py-3 rounded-lg border border-primary text-primary font-medium hover:bg-primary/10 transition-colors"
                    >
                      Connexion
                    </Link>
                    <Link
                      href="/register"
                      onClick={() => setMobileSidebarOpen(false)}
                      className="block w-full text-center px-4 py-3 rounded-lg bg-secondary text-white font-medium hover:bg-secondary/90 transition-colors"
                    >
                      Inscription
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </header>
  );
}
