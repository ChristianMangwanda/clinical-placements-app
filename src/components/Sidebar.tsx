"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import LayerToggle from "./LayerToggle";
import FilterPanel from "./FilterPanel";
import type { Layer, LayerVisibility, Profession, SearchResult } from "@/lib/types";

interface SidebarProps {
  layers: Layer[];
  layerVisibility: LayerVisibility;
  onLayerToggle: (layerKey: string) => void;
  stateFilter: string[];
  professionFilter: Profession | null;
  onStateChange: (states: string[]) => void;
  onProfessionChange: (profession: Profession | null) => void;
  onClearFilters: () => void;
  onSearchSelect: (result: SearchResult) => void;
}

export default function Sidebar({
  layers,
  layerVisibility,
  onLayerToggle,
  stateFilter,
  professionFilter,
  onStateChange,
  onProfessionChange,
  onClearFilters,
  onSearchSelect,
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;

    setSearching(true);
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const result = await response.json();

      if (result.success) {
        setSearchResults(result.data);
        setShowResults(true);
      }
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setShowResults(false);
  };

  const handleResultClick = (result: SearchResult) => {
    onSearchSelect(result);
    setShowResults(false);
  };

  const layerColors: Record<string, string> = {};
  layers.forEach((layer) => {
    layerColors[layer.layer_key] = layer.color || "#E74C3C";
  });

  return (
    <aside className="w-72 bg-green-deep border-r border-gold/10 flex flex-col h-full overflow-hidden">
      {/* Search */}
      <div className="p-4 border-b border-gold/10">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Search sites..."
            className="w-full bg-green/50 border border-white/10 rounded-lg pl-9 pr-9 py-2.5 text-sm text-white placeholder-text-muted focus:outline-none focus:border-gold/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Search Results Dropdown */}
        {showResults && searchResults.length > 0 && (
          <div className="absolute z-50 mt-2 w-[calc(100%-2rem)] max-h-64 overflow-y-auto bg-green-deep border border-gold/20 rounded-lg shadow-xl">
            {searchResults.map((result) => (
              <button
                key={`${result.layer_key}-${result.id}`}
                onClick={() => handleResultClick(result)}
                className="w-full text-left px-3 py-2 hover:bg-green-light/20 border-b border-white/5 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: layerColors[result.layer_key] || "#E74C3C" }}
                  />
                  <span className="text-sm text-white truncate">{result.name}</span>
                </div>
                <div className="text-xs text-text-muted ml-4">
                  {result.state}
                </div>
              </button>
            ))}
          </div>
        )}

        {showResults && searchResults.length === 0 && !searching && searchQuery.length >= 2 && (
          <div className="absolute z-50 mt-2 w-[calc(100%-2rem)] bg-green-deep border border-gold/20 rounded-lg shadow-xl p-4 text-center text-text-muted text-sm">
            No results found
          </div>
        )}

        {searching && (
          <div className="absolute z-50 mt-2 w-[calc(100%-2rem)] bg-green-deep border border-gold/20 rounded-lg shadow-xl p-4 text-center text-text-muted text-sm">
            Searching...
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <LayerToggle
          layers={layers}
          layerVisibility={layerVisibility}
          onToggle={onLayerToggle}
        />

        <FilterPanel
          stateFilter={stateFilter}
          professionFilter={professionFilter}
          onStateChange={onStateChange}
          onProfessionChange={onProfessionChange}
          onClearFilters={onClearFilters}
        />
      </div>

      {/* Footer stats */}
      <div className="p-4 border-t border-gold/10 text-xs text-text-muted">
        <p>Database: 90,664 locations</p>
        <p className="mt-1">50 states + territories</p>
      </div>
    </aside>
  );
}
