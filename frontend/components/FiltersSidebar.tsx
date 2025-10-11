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
};

type FiltersSidebarProps = {
  availableBrands: string[];
  filters: Filters;
  onChange: (filters: Filters) => void;
};

export default function FiltersSidebar({ availableBrands, filters, onChange }: FiltersSidebarProps) {
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

  const handleReset = () => {
    onChange({
      minPrice: undefined,
      maxPrice: undefined,
      brands: [],
      ordering: filters.ordering // Keep the ordering when resetting
    });
  };

  const hasActiveFilters = filters.minPrice !== undefined || filters.maxPrice !== undefined || filters.brands.length > 0;

  return (
    <aside className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-800">Filtres</h2>
        {hasActiveFilters && (
          <button
            onClick={handleReset}
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
            type="button"
          >
            Réinitialiser
          </button>
        )}
      </div>
      <div className="space-y-4">
        <div>
          <label htmlFor="minPrice" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Prix minimum
          </label>
          <input
            id="minPrice"
            name="minPrice"
            type="number"
            inputMode="numeric"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={filters.minPrice ?? ''}
            onChange={handlePriceChange}
            placeholder="0"
          />
        </div>
        <div>
          <label htmlFor="maxPrice" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Prix maximum
          </label>
          <input
            id="maxPrice"
            name="maxPrice"
            type="number"
            inputMode="numeric"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            value={filters.maxPrice ?? ''}
            onChange={handlePriceChange}
            placeholder="5000"
          />
        </div>
      </div>
      <Disclosure defaultOpen>
        {({ open }) => (
          <div className="rounded-2xl border border-slate-200">
            <Disclosure.Button className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold text-slate-700">
              Marques
              {open ? <MinusIcon className="h-4 w-4" /> : <PlusIcon className="h-4 w-4" />}
            </Disclosure.Button>
            <Disclosure.Panel className="space-y-2 px-4 pb-4">
              {availableBrands.map((brand) => {
                const active = filters.brands.includes(brand);
                return (
                  <button
                    key={brand}
                    onClick={() => handleBrandToggle(brand)}
                    className={classNames(
                      'flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition-all',
                      active
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 text-slate-600 hover:border-primary/50 hover:bg-primary/5'
                    )}
                    type="button"
                  >
                    {brand}
                  </button>
                );
              })}
            </Disclosure.Panel>
          </div>
        )}
      </Disclosure>
    </aside>
  );
}
