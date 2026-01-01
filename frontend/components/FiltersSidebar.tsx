'use client';

import { Disclosure } from '@headlessui/react';
import classNames from 'classnames';
import { MinusIcon, PlusIcon } from '@heroicons/react/24/outline';
import { ChangeEvent } from 'react';

export type Filters = {
  minPrice?: number;
  maxPrice?: number;
  brands: string[];
  ordering?: string;
  specs: Record<string, string[]>; // spec key -> array of selected values
};

type FiltersSidebarProps = {
  availableBrands: string[];
  availableSpecs: Record<string, string[]>; // spec key -> array of available values
  filters: Filters;
  onChange: (filters: Filters) => void;
};

// Predefined spec filter definitions
const SPEC_FILTERS = [
  { key: 'couleur', label: 'Couleur' },
  { key: 'taille_ecran', label: 'Taille de l\'écran' },
  { key: 'capacite_stockage', label: 'Capacité de stockage' },
  { key: 'memoire_vive', label: 'Mémoire vive (RAM)' },
  { key: 'capacite_batterie', label: 'Capacité de la batterie' },
  { key: 'resolution_ecran', label: 'Résolution d\'écran' },
  { key: 'systeme_exploitation', label: 'Système d\'exploitation' },
  { key: 'nombre_coeurs', label: 'Nombre de coeurs de processeurs' },
  { key: 'frequence_processeur', label: 'Fréquence du processeur' },
  { key: 'resolution_camera_avant', label: 'Résolution de la caméra avant' },
  { key: 'resolution_camera_arriere', label: 'Résolution de la caméra arrière' },
  { key: 'carte_sim', label: 'Carte SIM' },
];

export default function FiltersSidebar({ availableBrands, availableSpecs, filters, onChange }: FiltersSidebarProps) {
  const handlePriceChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    const numberValue = value ? Number(value) : undefined;
    onChange({
      ...filters,
      [name]: Number.isFinite(numberValue) ? numberValue : undefined
    });
  };

  const handleBrandToggle = (brand: string) => {
    const active = filters.brands.includes(brand);
    onChange({
      ...filters,
      brands: active ? filters.brands.filter((item) => item !== brand) : [...filters.brands, brand]
    });
  };

  const handleSpecToggle = (specKey: string, specValue: string) => {
    const currentValues = filters.specs[specKey] || [];
    const active = currentValues.includes(specValue);
    onChange({
      ...filters,
      specs: {
        ...filters.specs,
        [specKey]: active
          ? currentValues.filter((v) => v !== specValue)
          : [...currentValues, specValue]
      }
    });
  };

  const handleReset = () => {
    onChange({
      minPrice: undefined,
      maxPrice: undefined,
      brands: [],
      specs: {},
      ordering: filters.ordering // Keep the ordering when resetting
    });
  };

  const hasActiveFilters = 
    filters.minPrice !== undefined || 
    filters.maxPrice !== undefined || 
    filters.brands.length > 0 ||
    Object.values(filters.specs || {}).some((values) => values.length > 0);

  return (
    <aside className="space-y-4 sm:space-y-6 rounded-xl sm:rounded-3xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-semibold text-slate-800">Filtres</h2>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="text-xs sm:text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            type="button"
          >
            Réinitialiser
          </button>
        )}
      </div>
      
      {/* Price Range Filter */}
      <Disclosure defaultOpen>
        {({ open }) => (
          <div className="rounded-xl sm:rounded-2xl border border-slate-200">
            <Disclosure.Button className="flex w-full items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700">
              Prix
              {open ? <MinusIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
            </Disclosure.Button>
            <Disclosure.Panel className="px-3 sm:px-4 pb-3 sm:pb-4">
              <div className="space-y-2 pt-2">
                <div>
                  <label htmlFor="minPrice" className="text-xs font-medium text-slate-600">
                    Minimum
                  </label>
                  <input
                    id="minPrice"
                    name="minPrice"
                    type="number"
                    inputMode="numeric"
                    className="mt-1 w-full rounded-lg sm:rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={filters.minPrice ?? ''}
                    onChange={handlePriceChange}
                    placeholder="0"
                  />
                </div>
                <div>
                  <label htmlFor="maxPrice" className="text-xs font-medium text-slate-600">
                    Maximum
                  </label>
                  <input
                    id="maxPrice"
                    name="maxPrice"
                    type="number"
                    inputMode="numeric"
                    className="mt-1 w-full rounded-lg sm:rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    value={filters.maxPrice ?? ''}
                    onChange={handlePriceChange}
                    placeholder="50000"
                  />
                </div>
              </div>
            </Disclosure.Panel>
          </div>
        )}
      </Disclosure>

      {/* Brand Filter - Always show */}
      <Disclosure defaultOpen>
        {({ open }) => (
          <div className="rounded-xl sm:rounded-2xl border border-slate-200">
            <Disclosure.Button className="flex w-full items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
              <span>Marque</span>
              <div className="flex items-center gap-2">
                {filters.brands.length > 0 && (
                  <span className="rounded-full bg-primary text-white text-xs px-2 py-0.5">
                    {filters.brands.length}
                  </span>
                )}
                {open ? <MinusIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
              </div>
            </Disclosure.Button>
            <Disclosure.Panel className="px-3 sm:px-4 pb-3 sm:pb-4">
              {availableBrands.length > 0 ? (
                <div className="space-y-2 pt-2 max-h-64 overflow-y-auto">
                  {availableBrands.map((brand) => {
                    const active = filters.brands.includes(brand);
                    return (
                      <button
                        key={brand}
                        onClick={() => handleBrandToggle(brand)}
                        className={classNames(
                          'flex w-full items-center justify-between rounded-lg sm:rounded-xl border px-3 py-2 text-left text-sm transition-all',
                          active
                            ? 'border-primary bg-primary/10 text-primary font-medium'
                            : 'border-slate-200 text-slate-600 hover:border-primary/50 hover:bg-primary/5'
                        )}
                        type="button"
                      >
                        <span>{brand}</span>
                        {active && (
                          <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="pt-2 text-xs sm:text-sm text-slate-500">Aucune marque disponible</p>
              )}
            </Disclosure.Panel>
          </div>
        )}
      </Disclosure>

      {/* Spec Filters - Always show predefined filters */}
      {SPEC_FILTERS.map((specFilter) => {
        const availableValues = availableSpecs[specFilter.key] || [];

        return (
          <Disclosure key={specFilter.key}>
            {({ open }) => (
              <div className="rounded-xl sm:rounded-2xl border border-slate-200">
                <Disclosure.Button className="flex w-full items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
                  <span>{specFilter.label}</span>
                  <div className="flex items-center gap-2">
                    {(filters.specs[specFilter.key] || []).length > 0 && (
                      <span className="rounded-full bg-primary text-white text-xs px-2 py-0.5">
                        {(filters.specs[specFilter.key] || []).length}
                      </span>
                    )}
                    {open ? <MinusIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
                  </div>
                </Disclosure.Button>
                <Disclosure.Panel className="px-3 sm:px-4 pb-3 sm:pb-4">
                  {availableValues.length > 0 ? (
                    <div className="space-y-2 pt-2 max-h-64 overflow-y-auto">
                      {availableValues.map((value) => {
                        const active = (filters.specs[specFilter.key] || []).includes(value);
                        return (
                          <button
                            key={value}
                            onClick={() => handleSpecToggle(specFilter.key, value)}
                            className={classNames(
                              'flex w-full items-center justify-between rounded-lg sm:rounded-xl border px-3 py-2 text-left text-sm transition-all',
                              active
                                ? 'border-primary bg-primary/10 text-primary font-medium'
                                : 'border-slate-200 text-slate-600 hover:border-primary/50 hover:bg-primary/5'
                            )}
                            type="button"
                          >
                            <span>{value}</span>
                            {active && (
                              <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="pt-2 text-xs sm:text-sm text-slate-500">Aucune valeur disponible</p>
                  )}
                </Disclosure.Panel>
              </div>
            )}
          </Disclosure>
        );
      })}
    </aside>
  );
}
