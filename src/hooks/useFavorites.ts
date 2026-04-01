"use client";

import { useState, useEffect, useCallback } from "react";

export interface FavoriteItem {
  id: number;
  layer_key: string;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  addedAt: string;
}

const STORAGE_KEY = "clinical-placements-favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setFavorites(JSON.parse(stored));
      } catch {
        // Invalid JSON, reset
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when favorites change
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    }
  }, [favorites, isLoaded]);

  const addFavorite = useCallback((item: Omit<FavoriteItem, "addedAt">) => {
    setFavorites((prev) => {
      // Check if already exists
      const exists = prev.some(
        (f) => f.id === item.id && f.layer_key === item.layer_key
      );
      if (exists) return prev;

      return [
        ...prev,
        {
          ...item,
          addedAt: new Date().toISOString(),
        },
      ];
    });
  }, []);

  const removeFavorite = useCallback((id: number, layer_key: string) => {
    setFavorites((prev) =>
      prev.filter((f) => !(f.id === id && f.layer_key === layer_key))
    );
  }, []);

  const toggleFavorite = useCallback(
    (item: Omit<FavoriteItem, "addedAt">) => {
      const exists = favorites.some(
        (f) => f.id === item.id && f.layer_key === item.layer_key
      );
      if (exists) {
        removeFavorite(item.id, item.layer_key);
      } else {
        addFavorite(item);
      }
    },
    [favorites, addFavorite, removeFavorite]
  );

  const isFavorite = useCallback(
    (id: number, layer_key: string) => {
      return favorites.some((f) => f.id === id && f.layer_key === layer_key);
    },
    [favorites]
  );

  const clearFavorites = useCallback(() => {
    setFavorites([]);
  }, []);

  return {
    favorites,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    clearFavorites,
    isLoaded,
    count: favorites.length,
  };
}
