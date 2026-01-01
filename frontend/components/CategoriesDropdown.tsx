'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

// Category data from the provided JSON
const categoriesData = {
  categories: [
    {
      name: 'Informatique',
      subcategories: [
        'Composants',
        'Ordinateurs',
        'Réseaux et connectivité',
        'Périphériques',
        'Stockages',
        'Tablettes'
      ]
    },
    {
      name: 'Téléphonie',
      subcategories: [
        'Smartphones',
        'Accessoires Téléphones',
        'Téléphones Fixes',
        'Smart Watches'
      ]
    },
    {
      name: 'Santé - Beauté',
      subcategories: [
        'Visage',
        'Cheveux',
        'Corps',
        'Parfums',
        'Dents',
        'Maquillage',
        'Parfum d\'ambiance',
        'Santé',
        'Hommes'
      ]
    },
    {
      name: 'Electroménager',
      subcategories: [
        'Aspirateurs',
        'Machine à Laver',
        'Sèche Linges',
        'Lave vaisselles',
        'Fours',
        'Micro Ondes',
        'Plaques de cuisson',
        'Cuisinières',
        'Hottes aspirantes',
        'Climatiseurs',
        'Chauffages',
        'Chauffe Bain',
        'Réfrigérateurs et congélateurs'
      ]
    },
    {
      name: 'Petit Electroménager',
      subcategories: [
        'Machines à café',
        'Fer à Repasser',
        'Blenders',
        'Appareils de cuisson',
        'Robot Pétrin et Robot de Cuisine Multifonction',
        'Machine à Pain',
        'Mixeurs',
        'Batteurs',
        'Moulins à café',
        'Grille Pains',
        'Gaufriers',
        'Balances de cuisine',
        'Bouilloires',
        'Friteuses',
        'Yaourtière',
        'Défroisseurs à vapeur',
        'Sorbetières',
        'Centrifugeuses'
      ]
    },
    {
      name: 'Image & Son',
      subcategories: [
        'Écouteurs',
        'Haut-parleurs',
        'Systèmes home cinéma',
        'Microphones',
        'Téléviseurs',
        'Projecteurs',
        'Digital TV Boxes',
        'TV Accessories',
        'Casques'
      ]
    },
    {
      name: 'Photo & Caméra',
      subcategories: [
        'Appareils photos numériques',
        'Objectifs pour appareil photo'
      ]
    }
  ]
};

// Helper function to slugify category names
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

type CategoriesDropdownProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
};

export default function CategoriesDropdown({ isOpen, onOpenChange, children }: CategoriesDropdownProps) {
  const [topPosition, setTopPosition] = useState(0);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate position under header
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const header = document.querySelector('header');
      if (header) {
        const headerRect = header.getBoundingClientRect();
        setTopPosition(headerRect.bottom);
      }
    }
  }, [isOpen]);

  // Handle window resize and check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle window resize for position
  useEffect(() => {
    if (!isOpen) return;

    const handleResize = () => {
      const header = document.querySelector('header');
      if (header) {
        const headerRect = header.getBoundingClientRect();
        setTopPosition(headerRect.bottom);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen]);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Helper function to clear close timeout
  const clearCloseTimeout = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
  };

  // Helper function to schedule close with delay
  const scheduleClose = () => {
    clearCloseTimeout();
    closeTimeoutRef.current = setTimeout(() => {
      onOpenChange(false);
      setHoveredCategory(null);
      closeTimeoutRef.current = null;
    }, 300); // 300ms delay
  };

  if (!isOpen) {
    return (
      <div
        ref={triggerRef}
        onMouseEnter={() => onOpenChange(true)}
        className="relative"
      >
        {children}
      </div>
    );
  }

  return (
    <>
      {/* Trigger */}
      <div
        ref={triggerRef}
        onMouseEnter={() => {
          clearCloseTimeout();
          onOpenChange(true);
        }}
        onMouseLeave={(e) => {
          const relatedTarget = e.relatedTarget as HTMLElement | null;
          // If moving to dropdown, don't close
          if (dropdownRef.current && dropdownRef.current.contains(relatedTarget)) {
            clearCloseTimeout();
            return;
          }
          // Otherwise, schedule close with delay
          scheduleClose();
        }}
        className="relative"
      >
        {children}
      </div>

      {/* Dropdown */}
      <div
        ref={dropdownRef}
        className="fixed left-0 right-0 z-50 bg-white shadow-2xl"
        style={{ top: `${topPosition}px` }}
        onMouseEnter={() => {
          clearCloseTimeout();
          onOpenChange(true);
        }}
        onMouseLeave={() => {
          scheduleClose();
        }}
      >
        <div className="bg-white">
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4 border-b border-gray-200">
              <h2 className="text-xl sm:text-2xl font-bold text-primary">Toutes les catégories</h2>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                aria-label="Fermer"
              >
                <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            {/* Split Layout */}
            <div className="flex flex-col lg:flex-row">
              {/* Left Side - Parent Categories (33%) */}
              <div className="w-full lg:w-1/3 border-b lg:border-b-0 lg:border-r border-gray-200 bg-gray-50">
                <nav className="py-2 lg:py-4 max-h-[400px] lg:max-h-none overflow-y-auto lg:overflow-visible">
                  {categoriesData.categories.map((category) => (
                    <div
                      key={category.name}
                      onMouseEnter={() => setHoveredCategory(category.name)}
                      onClick={() => {
                        // On mobile, clicking a category shows its subcategories
                        if (isMobile) {
                          setHoveredCategory(hoveredCategory === category.name ? null : category.name);
                        }
                      }}
                      className={`px-4 sm:px-6 py-3 cursor-pointer transition-colors ${
                        hoveredCategory === category.name
                          ? 'bg-white lg:border-r-2 border-primary text-primary font-semibold'
                          : 'text-gray-700 hover:bg-white hover:text-primary'
                      }`}
                    >
                      <Link
                        href={`/categories/${slugify(category.name)}`}
                        onClick={(e) => {
                          // Only navigate if not on mobile or if subcategories are not shown
                          if (!isMobile || hoveredCategory !== category.name) {
                            onOpenChange(false);
                          } else {
                            e.preventDefault();
                          }
                        }}
                        className="block text-sm sm:text-base"
                      >
                        {category.name}
                      </Link>
                    </div>
                  ))}
                </nav>
              </div>

              {/* Right Side - Subcategories (66%) */}
              <div className="w-full lg:w-2/3 bg-white min-h-[300px] lg:min-h-0">
                {hoveredCategory ? (
                  <div className="p-4 sm:p-6 lg:p-8">
                    <h3 className="text-base sm:text-lg lg:text-xl font-bold text-primary mb-4 sm:mb-6">
                      {hoveredCategory}
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                      {categoriesData.categories
                        .find((cat) => cat.name === hoveredCategory)
                        ?.subcategories.map((subcategory, index) => (
                          <Link
                            key={`${hoveredCategory}-${subcategory}-${index}`}
                            href={`/categories/${slugify(subcategory)}`}
                            onClick={() => onOpenChange(false)}
                            className="block px-3 sm:px-4 py-2 text-xs sm:text-sm lg:text-base text-gray-700 hover:text-primary hover:bg-gray-50 rounded-lg transition-all duration-200"
                          >
                            {subcategory}
                          </Link>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full p-8">
                    <p className="text-gray-400 text-sm sm:text-base text-center">
                      {isMobile
                        ? 'Cliquez sur une catégorie pour voir les sous-catégories'
                        : 'Survolez une catégorie pour voir les sous-catégories'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
