"use client";

import { useState } from "react";
import { Filter, X, ChevronDown, Search } from "lucide-react";
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
            className="text-xs text-gold hover:text-white transition-colors duration-150 flex items-center gap-1 px-2 py-1 rounded hover:bg-white/5"
          >
            <X className="w-3 h-3" />
            Clear
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* State Filter - Multi-select */}
        <div>
          <label className="block text-sm text-text-light mb-2">
            States {stateFilter.length > 0 && (
              <span className="text-gold font-medium">({stateFilter.length} selected)</span>
            )}
          </label>

          <button
            onClick={() => setShowStateDropdown(!showStateDropdown)}
            className={`
              w-full bg-green-deep/80 rounded-xl px-4 py-3
              text-white text-sm
              flex items-center justify-between
              transition-all duration-200
              border
              ${showStateDropdown
                ? "border-gold/40 shadow-[0_0_0_3px_rgba(250,201,34,0.1)]"
                : "border-white/10 hover:border-white/20"}
            `}
            style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
          >
            <span className="truncate text-left">
              {stateFilter.length === 0
                ? "Select states..."
                : stateFilter.length === 1
                ? US_STATES[stateFilter[0]] || stateFilter[0]
                : `${stateFilter.length} states selected`}
            </span>
            <ChevronDown
              className={`
                w-4 h-4 flex-shrink-0 ml-2
                transition-all duration-200
                ${showStateDropdown ? "rotate-180 text-gold" : "text-text-muted"}
              `}
            />
          </button>

          {showStateDropdown && (
            <div
              className="
                mt-2 bg-green-deep/95 backdrop-blur-md
                border border-gold/20 rounded-xl
                max-h-56 overflow-hidden
                shadow-lg dropdown-enter
              "
            >
              {/* Search input */}
              <div className="sticky top-0 bg-green-deep/95 backdrop-blur-sm p-3 border-b border-white/10">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    placeholder="Search states..."
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)}
                    className="
                      w-full bg-green/40 border border-white/10 rounded-lg
                      pl-10 pr-4 py-2 text-sm text-white placeholder-text-muted
                      focus:outline-none focus:border-gold/40
                      transition-colors duration-150
                    "
                  />
                </div>
              </div>

              {/* Scrollable list */}
              <div className="max-h-40 overflow-y-auto p-2 list-animate">
                {filteredStates.map(([code, name]) => (
                  <label
                    key={code}
                    className="
                      flex items-center gap-3 px-3 py-2.5 rounded-lg
                      hover:bg-green-light/20 cursor-pointer
                      transition-colors duration-150
                    "
                  >
                    {/* Custom checkbox */}
                    <div
                      className={`
                        relative w-5 h-5 rounded-md border-2 flex-shrink-0
                        flex items-center justify-center
                        transition-all duration-200
                        ${stateFilter.includes(code)
                          ? "bg-gold border-gold"
                          : "border-white/30 hover:border-white/50"}
                      `}
                    >
                      {stateFilter.includes(code) && (
                        <svg className="w-3 h-3 text-green-deep" viewBox="0 0 12 12" fill="none">
                          <path
                            d="M2 6L5 9L10 3"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                      <input
                        type="checkbox"
                        checked={stateFilter.includes(code)}
                        onChange={() => handleStateToggle(code)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </div>
                    <span className="text-sm text-white flex-1">{name}</span>
                    <span className="text-xs text-text-muted">{code}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Profession Filter (for Schools layer) */}
        <div>
          <label className="block text-sm text-text-light mb-2">
            Program Type
            <span className="text-text-muted ml-1 text-xs">(Schools only)</span>
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
                className={`
                  flex-1 py-2.5 px-4 rounded-xl
                  text-sm font-semibold
                  transition-all duration-200
                  ${professionFilter === profession
                    ? "bg-gold text-green-deep shadow-md scale-[1.02]"
                    : "bg-green-deep/60 border border-white/10 text-white hover:border-gold/30 hover:bg-green-deep/80 active:scale-95"}
                `}
                style={{
                  transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: professionFilter === profession
                    ? '0 4px 12px rgba(250, 201, 34, 0.25)'
                    : 'none',
                }}
              >
                {profession}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Active filters display */}
      {hasFilters && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <p className="text-xs text-text-muted mb-2.5">Active filters:</p>
          <div className="flex flex-wrap gap-2">
            {stateFilter.map((state) => (
              <span
                key={state}
                className="
                  inline-flex items-center gap-1.5
                  text-xs font-medium
                  bg-gold/15 text-gold
                  pl-2.5 pr-1.5 py-1.5 rounded-lg
                  border border-gold/20
                "
              >
                {US_STATES[state] || state}
                <button
                  onClick={() => onStateChange(stateFilter.filter((s) => s !== state))}
                  className="p-0.5 rounded hover:bg-gold/20 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {professionFilter && (
              <span
                className="
                  inline-flex items-center gap-1.5
                  text-xs font-medium
                  bg-gold/15 text-gold
                  pl-2.5 pr-1.5 py-1.5 rounded-lg
                  border border-gold/20
                "
              >
                {professionFilter}
                <button
                  onClick={() => onProfessionChange(null)}
                  className="p-0.5 rounded hover:bg-gold/20 transition-colors"
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
