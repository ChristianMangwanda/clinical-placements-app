"use client";

import { useState, useMemo } from "react";
import { Table, Search, ChevronUp, ChevronDown, MapPin, X } from "lucide-react";
import type { SearchResult } from "@/lib/types";

interface DataTableProps {
  data: SearchResult[];
  loading: boolean;
  onRowClick?: (item: SearchResult) => void;
  layerColors: Record<string, string>;
  isAiResults?: boolean;
}

type SortField = "name" | "state" | "layer_key";
type SortDirection = "asc" | "desc";

// Layer display name mapping
const LAYER_DISPLAY_NAMES: Record<string, string> = {
  hrsa_sites: "HRSA",
  schools: "Schools",
  post_secondary_schools: "Post-Secondary",
  military_sites: "Military",
  native_american_reserves: "Native American",
  active_sites: "Active Sites",
  ai_results: "AI Result",
};

// Sort icon component
function SortIcon({
  field,
  sortField,
  sortDirection,
}: {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}) {
  if (sortField !== field) {
    return <ChevronDown className="w-3 h-3 opacity-0 group-hover:opacity-30" />;
  }
  return sortDirection === "asc" ? (
    <ChevronUp className="w-3 h-3 text-gold" />
  ) : (
    <ChevronDown className="w-3 h-3 text-gold" />
  );
}

// Skeleton row component
function SkeletonRow() {
  return (
    <tr className="border-b border-white/5">
      <td className="px-4 py-3">
        <div className="skeleton h-4 w-48 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="skeleton h-4 w-8 rounded" />
      </td>
      <td className="px-4 py-3">
        <div className="skeleton h-6 w-20 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <div className="skeleton h-6 w-6 rounded" />
      </td>
    </tr>
  );
}

export default function DataTable({
  data,
  loading,
  onRowClick,
  layerColors,
  isAiResults = false,
}: DataTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Filter and sort data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(query) ||
          item.state.toLowerCase().includes(query)
      );
    }

    // Sort
    result.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      const comparison =
        typeof aVal === "string" && typeof bVal === "string"
          ? aVal.localeCompare(bVal)
          : 0;
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return result;
  }, [data, searchQuery, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  return (
    <div
      className={`
        bg-green-deep border-t border-gold/10
        transition-all duration-300
        ${isCollapsed ? "h-12" : "h-64"}
      `}
      style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
    >
      {/* Header */}
      <div
        className={`
          flex items-center justify-between px-4 h-11
          border-b transition-colors duration-200
          ${isAiResults
            ? "border-gold/30 bg-gold/10"
            : "border-gold/10 bg-green-deep/95 backdrop-blur-sm"}
        `}
      >
        <div className="flex items-center gap-2.5">
          <Table className="w-4 h-4 text-gold" />
          <h3 className="font-semibold text-white text-sm">
            {isAiResults ? (
              <span className="text-gold">AI Results</span>
            ) : (
              "Data Table"
            )}
            {!loading && (
              <span className={`ml-2 font-normal ${isAiResults ? "text-gold/70" : "text-text-muted"}`}>
                ({filteredData.length} results)
              </span>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {/* Search input */}
          {!isCollapsed && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="
                  bg-green/50 border border-white/10 rounded-lg
                  pl-8 pr-8 py-1.5 text-xs text-white placeholder-text-muted
                  focus:outline-none focus:border-gold/40 focus:bg-green/60
                  transition-all duration-150 w-52
                "
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="
                    absolute right-2 top-1/2 -translate-y-1/2
                    p-0.5 rounded text-text-muted
                    hover:text-white hover:bg-white/10
                    transition-colors
                  "
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="
              p-1.5 rounded-lg text-text-muted
              hover:text-white hover:bg-white/10
              transition-all duration-150
            "
          >
            <ChevronDown
              className={`
                w-4 h-4 transition-transform duration-200
                ${isCollapsed ? "rotate-180" : ""}
              `}
            />
          </button>
        </div>
      </div>

      {/* Table content */}
      {!isCollapsed && (
        <div className="overflow-auto h-[calc(100%-44px)]">
          {loading ? (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-green-deep/95 backdrop-blur-sm z-10">
                <tr className="border-b border-gold/15">
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-light/70">Name</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-light/70 w-20">State</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-light/70 w-32">Type</th>
                  <th className="w-16 px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <SkeletonRow key={i} />
                ))}
              </tbody>
            </table>
          ) : filteredData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-text-muted gap-2">
              <Table className="w-8 h-8 opacity-30" />
              <span className="text-sm">
                {data.length === 0
                  ? isAiResults
                    ? "No location data found for this query"
                    : "Select layers and adjust map to load data"
                  : "No results match your search"}
              </span>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-green-deep/95 backdrop-blur-sm z-10">
                <tr className="border-b border-gold/15">
                  <th
                    className="group text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-light/70 cursor-pointer hover:text-gold transition-colors"
                    onClick={() => toggleSort("name")}
                  >
                    <span className="flex items-center gap-1.5">
                      Name
                      <SortIcon field="name" sortField={sortField} sortDirection={sortDirection} />
                    </span>
                  </th>
                  <th
                    className="group text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-light/70 cursor-pointer hover:text-gold transition-colors w-20"
                    onClick={() => toggleSort("state")}
                  >
                    <span className="flex items-center gap-1.5">
                      State
                      <SortIcon field="state" sortField={sortField} sortDirection={sortDirection} />
                    </span>
                  </th>
                  <th
                    className="group text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-text-light/70 cursor-pointer hover:text-gold transition-colors w-36"
                    onClick={() => toggleSort("layer_key")}
                  >
                    <span className="flex items-center gap-1.5">
                      Type
                      <SortIcon field="layer_key" sortField={sortField} sortDirection={sortDirection} />
                    </span>
                  </th>
                  <th className="w-14 px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 100).map((item) => (
                  <tr
                    key={`${item.layer_key}-${item.id}`}
                    className="
                      group border-b border-white/5
                      hover:bg-green-light/15
                      cursor-pointer
                      transition-all duration-150
                    "
                    onClick={() => onRowClick?.(item)}
                  >
                    <td className="px-4 py-2.5">
                      <span className="text-white font-medium group-hover:text-gold transition-colors duration-150">
                        {item.name}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-text-light text-sm">{item.state}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className="
                          inline-flex items-center gap-2
                          text-xs font-medium
                          px-2.5 py-1.5
                          rounded-full
                          border
                        "
                        style={{
                          backgroundColor: `${layerColors[item.layer_key] || "#E74C3C"}15`,
                          borderColor: `${layerColors[item.layer_key] || "#E74C3C"}30`,
                          color: layerColors[item.layer_key] || "#E74C3C",
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            backgroundColor: layerColors[item.layer_key] || "#E74C3C",
                          }}
                        />
                        {LAYER_DISPLAY_NAMES[item.layer_key] || item.layer_key}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick?.(item);
                        }}
                        className="
                          p-1.5 rounded-lg
                          text-text-muted
                          hover:text-gold hover:bg-gold/10
                          opacity-0 group-hover:opacity-100
                          transition-all duration-150
                        "
                        title="Fly to location"
                      >
                        <MapPin className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {filteredData.length > 100 && (
            <div className="px-4 py-2.5 text-xs text-text-muted text-center border-t border-white/5 bg-green-deep/50">
              Showing first 100 of {filteredData.length} results. Use search to filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
