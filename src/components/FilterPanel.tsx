"use client";

import { useState } from "react";
import { Filter, X, ChevronDown, ChevronUp } from "lucide-react";
import { US_STATES, type Profession } from "@/lib/types";

interface FilterPanelProps {
  stateFilter: string[];
  professionFilter: Profession | null;
  onStateChange: (states: string[]) => void;
  onProfessionChange: (profession: Profession | null) => void;
  onClearFilters: () => void;
}

export default function FilterPanel({
  stateFilter,
  professionFilter,
  onStateChange,
  onProfessionChange,
  onClearFilters,
}: FilterPanelProps) {
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [stateSearch, setStateSearch] = useState("");

  const hasFilters = stateFilter.length > 0 || professionFilter;

  const handleStateToggle = (stateCode: string) => {
    if (stateFilter.includes(stateCode)) {
      onStateChange(stateFilter.filter((s) => s !== stateCode));
    } else {
      onStateChange([...stateFilter, stateCode]);
    }
  };

  const filteredStates = Object.entries(US_STATES).filter(([code, name]) =>
    name.toLowerCase().includes(stateSearch.toLowerCase()) ||
    code.toLowerCase().includes(stateSearch.toLowerCase())
  );

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gold" />
          <h3 className="font-heading font-semibold text-white">Filters</h3>
        </div>

        {hasFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-gold hover:text-white transition-colors flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* State Filter - Multi-select */}
        <div>
          <label className="block text-sm text-text-light mb-1.5">
            States {stateFilter.length > 0 && <span className="text-gold">({stateFilter.length} selected)</span>}
          </label>
          <button
            onClick={() => setShowStateDropdown(!showStateDropdown)}
            className="w-full bg-green-deep border border-white/10 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-gold/50 transition-colors flex items-center justify-between"
          >
            <span className="truncate">
              {stateFilter.length === 0
                ? "Select states..."
                : stateFilter.length === 1
                ? US_STATES[stateFilter[0]] || stateFilter[0]
                : `${stateFilter.length} states selected`}
            </span>
            {showStateDropdown ? (
              <ChevronUp className="w-4 h-4 text-text-muted flex-shrink-0" />
            ) : (
              <ChevronDown className="w-4 h-4 text-text-muted flex-shrink-0" />
            )}
          </button>

          {showStateDropdown && (
            <div className="mt-1 bg-green-deep border border-gold/20 rounded max-h-48 overflow-y-auto">
              {/* Search within states */}
              <div className="sticky top-0 bg-green-deep p-2 border-b border-white/10">
                <input
                  type="text"
                  placeholder="Search states..."
                  value={stateSearch}
                  onChange={(e) => setStateSearch(e.target.value)}
                  className="w-full bg-green/50 border border-white/10 rounded px-2 py-1 text-xs text-white placeholder-text-muted focus:outline-none focus:border-gold/50"
                />
              </div>

              {filteredStates.map(([code, name]) => (
                <label
                  key={code}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-green-light/20 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={stateFilter.includes(code)}
                    onChange={() => handleStateToggle(code)}
                    className="w-3.5 h-3.5 rounded border-white/30 bg-green-deep text-gold focus:ring-gold/50"
                  />
                  <span className="text-sm text-white">{name}</span>
                  <span className="text-xs text-text-muted">({code})</span>
                </label>
              ))}
            </div>
          )}
        </div>

        {/* Profession Filter (for Schools layer) */}
        <div>
          <label className="block text-sm text-text-light mb-1.5">
            Program Type
            <span className="text-text-muted ml-1">(Schools only)</span>
          </label>
          <div className="flex gap-2">
            {(["PT", "OT", "PA"] as Profession[]).map((profession) => (
              <button
                key={profession}
                onClick={() =>
                  onProfessionChange(
                    professionFilter === profession ? null : profession
                  )
                }
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-all ${
                  professionFilter === profession
                    ? "bg-gold text-green-deep"
                    : "bg-green-deep border border-white/10 text-white hover:border-gold/30"
                }`}
              >
                {profession}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active filters display */}
      {hasFilters && (
        <div className="mt-4 pt-3 border-t border-white/5">
          <p className="text-xs text-text-muted mb-2">Active filters:</p>
          <div className="flex flex-wrap gap-1.5">
            {stateFilter.map((state) => (
              <span
                key={state}
                className="inline-flex items-center gap-1 text-xs bg-gold-dim text-gold px-2 py-1 rounded"
              >
                {US_STATES[state] || state}
                <button
                  onClick={() => onStateChange(stateFilter.filter((s) => s !== state))}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {professionFilter && (
              <span className="inline-flex items-center gap-1 text-xs bg-gold-dim text-gold px-2 py-1 rounded">
                {professionFilter}
                <button
                  onClick={() => onProfessionChange(null)}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
