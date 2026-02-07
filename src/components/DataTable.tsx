"use client";

import { useState, useMemo } from "react";
import { Table, Search, ChevronUp, ChevronDown, MapPin, X } from "lucide-react";
import type { SearchResult } from "@/lib/types";

interface DataTableProps {
  data: SearchResult[];
  loading: boolean;
  onRowClick?: (item: SearchResult) => void;
  layerColors: Record<string, string>;
}

type SortField = "name" | "state" | "layer_key";
type SortDirection = "asc" | "desc";

// Layer display name mapping - defined outside component
const LAYER_DISPLAY_NAMES: Record<string, string> = {
  hrsa_sites: "HRSA",
  schools: "Schools",
  post_secondary_schools: "Post-Secondary",
  military_sites: "Military",
  native_american_reserves: "Native American",
};

// Sort icon component - defined outside to avoid recreation on each render
function SortIcon({
  field,
  sortField,
  sortDirection,
}: {
  field: SortField;
  sortField: SortField;
  sortDirection: SortDirection;
}) {
  if (sortField !== field) return null;
  return sortDirection === "asc" ? (
    <ChevronUp className="w-3 h-3" />
  ) : (
    <ChevronDown className="w-3 h-3" />
  );
}

export default function DataTable({
  data,
  loading,
  onRowClick,
  layerColors,
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
      className={`bg-green-deep border-t border-gold/10 transition-all ${
        isCollapsed ? "h-12" : "h-64"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gold/10">
        <div className="flex items-center gap-2">
          <Table className="w-4 h-4 text-gold" />
          <h3 className="font-semibold text-white text-sm">
            Data Table
            {!loading && (
              <span className="text-text-muted ml-2">
                ({filteredData.length} results)
              </span>
            )}
          </h3>
        </div>

        <div className="flex items-center gap-2">
          {/* Search input */}
          {!isCollapsed && (
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="bg-green/50 border border-white/10 rounded pl-7 pr-7 py-1 text-xs text-white placeholder-text-muted focus:outline-none focus:border-gold/50 w-48"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Collapse toggle */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 text-text-muted hover:text-white transition-colors"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${isCollapsed ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      {/* Table content */}
      {!isCollapsed && (
        <div className="overflow-auto h-[calc(100%-44px)]">
          {loading ? (
            <div className="flex items-center justify-center h-full text-text-muted">
              Loading data...
            </div>
          ) : filteredData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-text-muted">
              {data.length === 0
                ? "Select layers and adjust map to load data"
                : "No results match your search"}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-green-deep">
                <tr className="border-b border-gold/10">
                  <th
                    className="text-left px-4 py-2 text-text-light font-medium cursor-pointer hover:text-gold"
                    onClick={() => toggleSort("name")}
                  >
                    <span className="flex items-center gap-1">
                      Name <SortIcon field="name" sortField={sortField} sortDirection={sortDirection} />
                    </span>
                  </th>
                  <th
                    className="text-left px-4 py-2 text-text-light font-medium cursor-pointer hover:text-gold w-20"
                    onClick={() => toggleSort("state")}
                  >
                    <span className="flex items-center gap-1">
                      State <SortIcon field="state" sortField={sortField} sortDirection={sortDirection} />
                    </span>
                  </th>
                  <th
                    className="text-left px-4 py-2 text-text-light font-medium cursor-pointer hover:text-gold w-32"
                    onClick={() => toggleSort("layer_key")}
                  >
                    <span className="flex items-center gap-1">
                      Type <SortIcon field="layer_key" sortField={sortField} sortDirection={sortDirection} />
                    </span>
                  </th>
                  <th className="w-16 px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filteredData.slice(0, 100).map((item) => (
                  <tr
                    key={`${item.layer_key}-${item.id}`}
                    className="border-b border-white/5 hover:bg-green-light/20 cursor-pointer transition-colors"
                    onClick={() => onRowClick?.(item)}
                  >
                    <td className="px-4 py-2 text-white">{item.name}</td>
                    <td className="px-4 py-2 text-text-light">{item.state}</td>
                    <td className="px-4 py-2">
                      <span
                        className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded"
                        style={{
                          backgroundColor: `${layerColors[item.layer_key] || "#E74C3C"}20`,
                          color: layerColors[item.layer_key] || "#E74C3C",
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: layerColors[item.layer_key] || "#E74C3C",
                          }}
                        />
                        {LAYER_DISPLAY_NAMES[item.layer_key] || item.layer_key}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRowClick?.(item);
                        }}
                        className="p-1 text-text-muted hover:text-gold transition-colors"
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
            <div className="px-4 py-2 text-xs text-text-muted text-center border-t border-white/5">
              Showing first 100 of {filteredData.length} results. Use search to
              filter.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
