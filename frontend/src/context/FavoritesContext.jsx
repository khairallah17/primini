import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const FavoritesContext = createContext();

const STORAGE_KEY = 'primini:favorites';

export function FavoritesProvider({ children }) {
  const [items, setItems] = useState(() => {
    if (typeof window === 'undefined') {
      return [];
    }
    const cached = window.localStorage.getItem(STORAGE_KEY);
    return cached ? JSON.parse(cached) : [];
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items]);

  const value = useMemo(() => ({
    items,
    addFavorite: (product) => {
      setItems((prev) => {
        if (prev.find((item) => item.id === product.id)) {
          return prev;
        }
        return [...prev, product];
      });
    },
    removeFavorite: (productId) => {
      setItems((prev) => prev.filter((item) => item.id !== productId));
    },
    isFavorite: (productId) => items.some((item) => item.id === productId),
    clearFavorites: () => setItems([]),
  }), [items]);

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites() {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites doit être utilisé dans un FavoritesProvider');
  }
  return context;
}
