"use client";

import { useState, useMemo } from "react";
import { MapPin, X, ChevronDown, ChevronRight, Target } from "lucide-react";
import { RADIUS_CONFIG, type RadiusBuckets, type SiteWithDistance } from "@/lib/geo-utils";

interface RadiusResultsProps {
  origin: [number, number];
  buckets: RadiusBuckets;
  layerColors: Record<string, string>;
  onClear: () => void;
  onSiteClick?: (lat: number, lng: number) => void;
}

// Layer display names
const LAYER_NAMES: Record<string, string> = {
  hrsa_sites: "HRSA Sites",
  schools: "Schools",
  post_secondary_schools: "Post-Secondary",
  military_sites: "Military",
  native_american_reserves: "Native American",
  active_sites: "Active Sites",
};

// Group sites by layer
function groupByLayer(sites: SiteWithDistance[]): Record<string, SiteWithDistance[]> {
  const grouped: Record<string, SiteWithDistance[]> = {};
  for (const site of sites) {
    if (!grouped[site.layer_key]) {
      grouped[site.layer_key] = [];
    }
    grouped[site.layer_key].push(site);
  }
  return grouped;
}

// Ring summary row
function RingSummary({
  ring,
  sites,
  layerColors,
  isExpanded,
  onToggle,
  onSiteClick,
}: {
  ring: typeof RADIUS_CONFIG[number];
  sites: SiteWithDistance[];
  layerColors: Record<string, string>;
  isExpanded: boolean;
  onToggle: () => void;
  onSiteClick?: (lat: number, lng: number) => void;
}) {
  const grouped = useMemo(() => groupByLayer(sites), [sites]);
  const layerKeys = Object.keys(grouped);

  if (sites.length === 0) {
    return (
      <div className="py-2 px-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: ring.color }}
          />
          <span className="text-white/80 text-sm font-medium">{ring.label}</span>
          <span className="text-white/40 text-xs ml-1">~{ring.miles} mi</span>
          <span className="text-white/40 text-xs ml-auto">No sites</span>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-white/5">
      {/* Ring header */}
      <button
        onClick={onToggle}
        className="w-full py-2.5 px-3 flex items-center gap-2 hover:bg-green-light/10 transition-colors"
      >
        <div
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: ring.color }}
        />
        <span className="text-white font-medium text-sm">{ring.label}</span>
        <span className="text-white/40 text-xs">~{ring.miles} mi</span>

        {/* Layer counts */}
        <div className="flex-1 flex flex-wrap gap-1.5 ml-2 justify-end">
          {layerKeys.map((layerKey) => (
            <span
              key={layerKey}
              className="text-xs px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `${layerColors[layerKey] || "#888"}20`,
                color: layerColors[layerKey] || "#888",
              }}
            >
              {grouped[layerKey].length}
            </span>
          ))}
        </div>

        <span className="text-white/60 font-semibold text-sm ml-2">
          {sites.length}
        </span>

        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-white/40" />
        ) : (
          <ChevronRight className="w-4 h-4 text-white/40" />
        )}
      </button>

      {/* Expanded site list */}
      {isExpanded && (
        <div className="bg-green-deep/50 max-h-48 overflow-y-auto">
          {layerKeys.map((layerKey) => (
            <div key={layerKey} className="px-3 py-2 border-t border-white/5 first:border-t-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: layerColors[layerKey] || "#888" }}
                />
                <span className="text-xs font-medium text-white/70">
                  {LAYER_NAMES[layerKey] || layerKey} ({grouped[layerKey].length})
                </span>
              </div>
              <div className="space-y-1 pl-4">
                {grouped[layerKey].slice(0, 10).map((site) => (
                  <button
                    key={`${site.layer_key}-${site.id}`}
                    onClick={() => onSiteClick?.(site.lat, site.lng)}
                    className="w-full text-left flex items-center gap-2 py-1 px-2 rounded hover:bg-green-light/20 transition-colors group"
                  >
                    <span className="text-xs text-white/80 truncate flex-1">
                      {site.name}
                    </span>
                    <span className="text-xs text-white/40">
                      {site.distanceMiles.toFixed(1)} mi
                    </span>
                    <MapPin className="w-3 h-3 text-white/30 group-hover:text-gold opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
                {grouped[layerKey].length > 10 && (
                  <p className="text-xs text-white/40 pl-2 italic">
                    +{grouped[layerKey].length - 10} more
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RadiusResults({
  origin,
  buckets,
  layerColors,
  onClear,
  onSiteClick,
}: RadiusResultsProps) {
  const [expandedRing, setExpandedRing] = useState<number | null>(null);

  // Cumulative counts
  const within30Total = buckets.within30.length;
  const within60Total = within30Total + buckets.within60.length;
  const within90Total = within60Total + buckets.within90.length;

  // Cumulative site arrays for each ring
  const sitesUpTo30 = buckets.within30;
  const sitesUpTo60 = [...buckets.within30, ...buckets.within60];
  const sitesUpTo90 = [...sitesUpTo60, ...buckets.within90];

  const formatCoord = (val: number) => {
    const abs = Math.abs(val);
    return abs.toFixed(4);
  };

  return (
    <div
      className="
        absolute top-4 left-4 z-[1000]
        w-80 bg-green-deep/95 backdrop-blur-md
        border border-gold/20 rounded-xl
        shadow-lg overflow-hidden
        dropdown-enter
      "
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gold/20 bg-green-deep">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-gold" />
          <h3 className="font-semibold text-white">Radius Analysis</h3>
        </div>
        <button
          onClick={onClear}
          className="p-1 rounded hover:bg-white/10 text-white/60 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Origin info */}
      <div className="px-4 py-2 border-b border-white/5 bg-green-deep/50">
        <p className="text-xs text-white/50">
          Origin: {formatCoord(origin[0])}°{origin[0] >= 0 ? "N" : "S"},{" "}
          {formatCoord(Math.abs(origin[1]))}°{origin[1] >= 0 ? "E" : "W"}
        </p>
      </div>

      {/* Ring summaries */}
      <div className="max-h-[400px] overflow-y-auto">
        <RingSummary
          ring={RADIUS_CONFIG[0]}
          sites={sitesUpTo30}
          layerColors={layerColors}
          isExpanded={expandedRing === 30}
          onToggle={() => setExpandedRing(expandedRing === 30 ? null : 30)}
          onSiteClick={onSiteClick}
        />
        <RingSummary
          ring={RADIUS_CONFIG[1]}
          sites={sitesUpTo60}
          layerColors={layerColors}
          isExpanded={expandedRing === 60}
          onToggle={() => setExpandedRing(expandedRing === 60 ? null : 60)}
          onSiteClick={onSiteClick}
        />
        <RingSummary
          ring={RADIUS_CONFIG[2]}
          sites={sitesUpTo90}
          layerColors={layerColors}
          isExpanded={expandedRing === 90}
          onToggle={() => setExpandedRing(expandedRing === 90 ? null : 90)}
          onSiteClick={onSiteClick}
        />
      </div>

      {/* Footer with disclaimer */}
      <div className="px-4 py-3 border-t border-white/5 bg-green-deep">
        <button
          onClick={onClear}
          className="w-full py-2 px-4 bg-gold/10 hover:bg-gold/20 border border-gold/30 rounded-lg text-gold text-sm font-medium transition-colors"
        >
          Clear Radius
        </button>
        <p className="text-xs text-white/40 mt-2 text-center italic">
          Distances are straight-line estimates
        </p>
      </div>
    </div>
  );
}
