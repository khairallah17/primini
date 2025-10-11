'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type FavoriteProduct = {
  id: number;
  name: string;
  slug: string;
  image?: string;
  lowestPrice?: number;
  lowest_price?: number;
};

type FavoritesContextValue = {
  favorites: FavoriteProduct[];
  addFavorite: (product: FavoriteProduct) => void;
  removeFavorite: (productId: number) => void;
  isFavorite: (productId: number) => boolean;
};

const FavoritesContext = createContext<FavoritesContextValue | undefined>(undefined);
const STORAGE_KEY = 'primini_favorites';

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteProduct[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setFavorites(JSON.parse(stored));
      }
    } catch (error) {
      console.warn('Failed to restore favorites', error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }, [favorites]);

  const addFavorite = useCallback((product: FavoriteProduct) => {
    setFavorites((prev) => {
      if (prev.some((item) => item.id === product.id)) {
        return prev;
      }
      return [...prev, product];
    });
  }, []);

  const removeFavorite = useCallback((productId: number) => {
    setFavorites((prev) => prev.filter((item) => item.id !== productId));
  }, []);

  const isFavorite = useCallback(
    (productId: number) => favorites.some((item) => item.id === productId),
    [favorites]
  );

  const value = useMemo(
    () => ({ favorites, addFavorite, removeFavorite, isFavorite }),
    [addFavorite, favorites, isFavorite, removeFavorite]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within FavoritesProvider');
  }
  return context;
}
