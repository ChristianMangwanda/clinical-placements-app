"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X, Target, Star } from "lucide-react";
import type { Layer, LayerVisibility, MapBounds, MapPoint } from "@/lib/types";
import ChoroplethLayer from "./ChoroplethLayer";
import StateChoroplethLayer from "./StateChoroplethLayer";
import MapLegend from "./MapLegend";
import RadiusOverlay from "./RadiusOverlay";
import RadiusResults from "./RadiusResults";
import { bucketSitesByDistance, type RadiusBuckets } from "@/lib/geo-utils";

// Site properties from the API
interface SiteProperties {
  id: number;
  name: string;
  layer_key: string;
  state: string;
  professions?: string[]; // Only for schools layer - array of programs (PT, OT, PA)
  // Extended HRSA fields
  city?: string;
  site_category?: string;
  site_type?: string;
  physician_ftes?: number;
  physician_assistant_ftes?: number;
  num_beds?: number;
  is_federally_funded_hc?: boolean;
  is_hospital_based?: boolean;
  is_rural_health_clinic?: boolean;
  rural_status?: string;
  // Extended Active Sites fields
  address?: string;
  programs?: string;
  has_ot?: boolean;
  has_pt?: boolean;
  has_pa?: boolean;
  source?: string;
}

interface SiteFeature {
  type: "Feature";
  geometry: {
    type: "Point";
    coordinates: [number, number];
  };
  properties: SiteProperties;
}

interface SiteFeatureCollection {
  type: "FeatureCollection";
  features: SiteFeature[];
}

// Create custom colored markers
function createColoredIcon(color: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background-color: ${color};
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 2px 5px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
  });
}

// Create highlight marker with pulsing animation
function createHighlightIcon() {
  return L.divIcon({
    className: "highlight-marker",
    html: `<div class="highlight-marker-inner"></div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

interface MapProps {
  layers: Layer[];
  layerVisibility: LayerVisibility;
  stateFilter?: string[];
  clinicTypeFilter?: string[];
  flyToLocation?: { lat: number; lng: number } | null;
  highlightPoints?: MapPoint[];
  onClearHighlights?: () => void;
  activeChoropleth?: "pop_change" | "coverage_ratio" | "gdp_growth" | "healthcare_employment" | null;
  onChoroplethLoadingChange?: (loading: boolean) => void;
  // Radius analysis mode
  radiusMode?: boolean;
  onRadiusModeChange?: (active: boolean) => void;
  // Favorites
  isFavorite?: (id: number, layer_key: string) => boolean;
  onToggleFavorite?: (item: { id: number; layer_key: string; name: string; state: string; latitude: number; longitude: number }) => void;
}

// Component to handle map events
function MapEventHandler({
  onBoundsChange,
}: {
  onBoundsChange: (bounds: MapBounds) => void;
}) {
  const map = useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        minLat: bounds.getSouth(),
        minLng: bounds.getWest(),
        maxLat: bounds.getNorth(),
        maxLng: bounds.getEast(),
      });
    },
    zoomend: () => {
      const bounds = map.getBounds();
      onBoundsChange({
        minLat: bounds.getSouth(),
        minLng: bounds.getWest(),
        maxLat: bounds.getNorth(),
        maxLng: bounds.getEast(),
      });
    },
  });

  // Trigger initial bounds
  useEffect(() => {
    const bounds = map.getBounds();
    onBoundsChange({
      minLat: bounds.getSouth(),
      minLng: bounds.getWest(),
      maxLat: bounds.getNorth(),
      maxLng: bounds.getEast(),
    });
  }, [map, onBoundsChange]);

  return null;
}

// Component to fly to a location
function FlyToLocation({ location }: { location: { lat: number; lng: number } | null }) {
  const map = useMap();

  useEffect(() => {
    if (location && location.lat && location.lng) {
      map.flyTo([location.lat, location.lng], 10, { duration: 1 });
    }
  }, [map, location]);

  return null;
}

// Component to fly to bounds of highlight points
function FlyToHighlightBounds({ points }: { points: MapPoint[] }) {
  const map = useMap();
  const prevPointsRef = useRef<MapPoint[]>([]);

  useEffect(() => {
    // Only fly if points actually changed
    if (points.length === 0) {
      prevPointsRef.current = [];
      return;
    }

    // Check if points are the same as before
    const pointsChanged = points.length !== prevPointsRef.current.length ||
      points.some((p, i) => {
        const prev = prevPointsRef.current[i];
        return !prev || p.lat !== prev.lat || p.lng !== prev.lng;
      });

    if (!pointsChanged) return;

    prevPointsRef.current = points;

    if (points.length === 1) {
      // Single point - fly to it
      map.flyTo([points[0].lat, points[0].lng], 10, { duration: 1 });
    } else {
      // Multiple points - calculate bounds and fly to them
      const lats = points.map(p => p.lat);
      const lngs = points.map(p => p.lng);

      const bounds = L.latLngBounds(
        [Math.min(...lats), Math.min(...lngs)],
        [Math.max(...lats), Math.max(...lngs)]
      );

      map.flyToBounds(bounds, {
        padding: [50, 50],
        maxZoom: 10,
        duration: 1,
      });
    }
  }, [map, points]);

  return null;
}

// Component to handle radius mode clicks
function RadiusClickHandler({
  active,
  onMapClick,
}: {
  active: boolean;
  onMapClick: (latlng: [number, number]) => void;
}) {
  useMapEvents({
    click: (e) => {
      if (active) {
        onMapClick([e.latlng.lat, e.latlng.lng]);
      }
    },
  });
  return null;
}

export default function MapClient({
  layers,
  layerVisibility,
  stateFilter,
  clinicTypeFilter,
  flyToLocation,
  highlightPoints = [],
  onClearHighlights,
  activeChoropleth = null,
  onChoroplethLoadingChange,
  radiusMode = false,
  onRadiusModeChange,
  isFavorite,
  onToggleFavorite,
}: MapProps) {
  const [sitesData, setSitesData] = useState<Record<string, SiteFeatureCollection>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const iconCache = useRef<Record<string, L.DivIcon>>({});
  const highlightIcon = useRef<L.DivIcon | null>(null);

  // Radius analysis state
  const [radiusOrigin, setRadiusOrigin] = useState<[number, number] | null>(null);

  // Create highlight icon once
  if (!highlightIcon.current) {
    highlightIcon.current = createHighlightIcon();
  }

  // Layer colors map for RadiusResults
  const layerColors = useMemo(() => {
    const colors: Record<string, string> = {};
    layers.forEach((layer) => {
      colors[layer.layer_key] = layer.color || "#E74C3C";
    });
    return colors;
  }, [layers]);

  // Compute radius buckets when origin is set
  const radiusBuckets = useMemo<RadiusBuckets | null>(() => {
    if (!radiusOrigin) return null;

    // Collect all visible sites from sitesData
    const allSites: Array<{ id: number; name: string; layer_key: string; lat: number; lng: number }> = [];

    Object.entries(sitesData).forEach(([layerKey, collection]) => {
      if (layerVisibility[layerKey] && collection?.features) {
        collection.features.forEach((feature) => {
          const [lng, lat] = feature.geometry.coordinates;
          allSites.push({
            id: feature.properties.id,
            name: feature.properties.name,
            layer_key: layerKey,
            lat,
            lng,
          });
        });
      }
    });

    return bucketSitesByDistance(allSites, radiusOrigin[0], radiusOrigin[1]);
  }, [radiusOrigin, sitesData, layerVisibility]);

  // Handle radius click
  const handleRadiusClick = useCallback((latlng: [number, number]) => {
    setRadiusOrigin(latlng);
    // Exit radius mode after placing (optional - keeps active for re-placement)
    // onRadiusModeChange?.(false);
  }, []);

  // Clear radius
  const handleClearRadius = useCallback(() => {
    setRadiusOrigin(null);
  }, []);

  // Handle radius origin drag
  const handleRadiusOriginDrag = useCallback((newOrigin: [number, number]) => {
    setRadiusOrigin(newOrigin);
  }, []);

  // Handle site click in results panel (fly to)
  const handleRadiusSiteClick = useCallback((lat: number, lng: number) => {
    // This will be handled by FlyToLocation
    // We'd need to add a ref or use external flyTo
  }, []);

  // Fetch sites for visible layers when bounds change
  const fetchSites = useCallback(
    async (layerKey: string, currentBounds: MapBounds) => {
      setLoading((prev) => ({ ...prev, [layerKey]: true }));

      try {
        const boundsParam = `${currentBounds.minLat},${currentBounds.minLng},${currentBounds.maxLat},${currentBounds.maxLng}`;
        let url = `/api/sites?layer=${layerKey}&bounds=${boundsParam}`;

        if (stateFilter && stateFilter.length > 0) {
          url += `&states=${stateFilter.join(",")}`;
        }

        // Add clinic type filter (only applies to hrsa_sites layer)
        if (clinicTypeFilter && clinicTypeFilter.length > 0 && layerKey === "hrsa_sites") {
          url += `&clinicTypes=${clinicTypeFilter.join(",")}`;
        }

        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
          setSitesData((prev) => ({ ...prev, [layerKey]: result.data }));
        }
      } catch (error) {
        console.error(`Error fetching ${layerKey}:`, error);
      } finally {
        setLoading((prev) => ({ ...prev, [layerKey]: false }));
      }
    },
    [stateFilter, clinicTypeFilter]
  );

  // Debounced bounds change handler
  const handleBoundsChange = useCallback((newBounds: MapBounds) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      setBounds(newBounds);
    }, 300);
  }, []);

  // Fetch data for visible layers when bounds change
  useEffect(() => {
    if (!bounds) return;

    layers.forEach((layer) => {
      if (layerVisibility[layer.layer_key]) {
        fetchSites(layer.layer_key, bounds);
      }
    });
  }, [bounds, layers, layerVisibility, fetchSites]);

  // Get layer color and cached icon
  const getMarkerIcon = (layerKey: string): L.DivIcon => {
    if (!iconCache.current[layerKey]) {
      const layer = layers.find((l) => l.layer_key === layerKey);
      const color = layer?.color || "#E74C3C";
      iconCache.current[layerKey] = createColoredIcon(color);
    }
    return iconCache.current[layerKey];
  };

  const isLoading = Object.values(loading).some(Boolean);
  const hasHighlights = highlightPoints.length > 0;

  return (
    <div className={`h-full w-full relative ${radiusMode ? "radius-mode" : ""}`}>
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-4 right-4 z-[1000] bg-[#092E28]/90 text-[#FAC922] px-3 py-1.5 rounded text-sm font-medium">
          Loading sites...
        </div>
      )}

      {/* Clear highlights button */}
      {hasHighlights && onClearHighlights && (
        <button
          onClick={onClearHighlights}
          className="absolute top-4 left-4 z-[1000] bg-[#FAC922] text-[#092E28] px-3 py-1.5 rounded text-sm font-medium flex items-center gap-2 hover:bg-[#FAC922]/90 transition-colors shadow-lg"
        >
          <X className="w-4 h-4" />
          Clear {highlightPoints.length} highlights
        </button>
      )}

      {/* Radius Tool Toggle Button */}
      <button
        onClick={() => onRadiusModeChange?.(!radiusMode)}
        className={`
          absolute bottom-6 right-6 z-[1000]
          w-12 h-12 rounded-full
          flex items-center justify-center
          shadow-lg transition-all duration-200
          ${radiusMode
            ? "bg-gold text-green-deep ring-4 ring-gold/30"
            : "bg-green-deep/90 text-white/70 hover:text-gold hover:bg-green-deep border border-gold/20"
          }
        `}
        title={radiusMode ? "Cancel radius mode" : "Radius analysis tool"}
      >
        <Target className="w-5 h-5" />
      </button>

      {/* Radius mode instruction */}
      {radiusMode && !radiusOrigin && (
        <div className="absolute bottom-20 right-4 z-[1000] bg-green-deep/95 border border-gold/30 rounded-lg px-4 py-2 shadow-lg dropdown-enter">
          <p className="text-sm text-white/90 flex items-center gap-2">
            <Target className="w-4 h-4 text-gold" />
            Click anywhere on the map
          </p>
        </div>
      )}

      <MapContainer
        center={[39.8283, -98.5795]}
        zoom={4}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapEventHandler onBoundsChange={handleBoundsChange} />
        <FlyToLocation location={flyToLocation || null} />
        <FlyToHighlightBounds points={highlightPoints} />
        <RadiusClickHandler active={radiusMode} onMapClick={handleRadiusClick} />

        {/* Radius overlay when origin is set */}
        {radiusOrigin && (
          <RadiusOverlay origin={radiusOrigin} onOriginDrag={handleRadiusOriginDrag} />
        )}

        {/* Render markers for each visible layer */}
        {layers.map((layer) => {
          if (!layerVisibility[layer.layer_key]) return null;

          const data = sitesData[layer.layer_key];
          if (!data || !data.features) return null;

          const markerIcon = getMarkerIcon(layer.layer_key);

          // Limit markers to prevent browser slowdown
          const features = data.features.slice(0, 2000);

          return features.map((feature) => {
            const [lng, lat] = feature.geometry.coordinates;

            return (
              <Marker
                key={`${layer.layer_key}-${feature.properties.id}`}
                position={[lat, lng]}
                icon={markerIcon}
              >
                {/* Hover tooltip */}
                <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
                  {feature.properties.name}
                </Tooltip>

                {/* Click popup - Dark themed */}
                <Popup>
                  <div className="min-w-[260px] max-w-[340px] p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className="font-semibold text-white text-base leading-tight">
                        {feature.properties.name}
                      </h3>
                      <span
                        className="flex-shrink-0 text-xs font-medium px-2 py-1 rounded-md"
                        style={{
                          backgroundColor: `${layer.color || "#E74C3C"}25`,
                          color: layer.color || "#E74C3C",
                        }}
                      >
                        {layer.display_name}
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-[#FAC922]/30 to-transparent mb-3" />

                    {/* Schools - show programs */}
                    {feature.properties.professions && feature.properties.professions.length > 0 && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm text-white/60">Programs:</span>
                        <div className="flex gap-1.5">
                          {feature.properties.professions.map((p: string) => (
                            <span
                              key={p}
                              className="px-2 py-0.5 bg-[#FAC922]/20 text-[#FAC922] text-xs font-semibold rounded"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* HRSA sites - show extended details */}
                    {layer.layer_key === "hrsa_sites" && (
                      <div className="text-sm space-y-2">
                        {feature.properties.city && (
                          <p className="text-white/80">
                            <span className="text-white/50">Location:</span> {feature.properties.city}, {feature.properties.state}
                          </p>
                        )}
                        {feature.properties.site_category && (
                          <p className="text-white/80">
                            <span className="text-white/50">Category:</span> {feature.properties.site_category}
                          </p>
                        )}
                        {feature.properties.site_type && (
                          <p className="text-white/80">
                            <span className="text-white/50">Type:</span> {feature.properties.site_type}
                          </p>
                        )}

                        {/* Stats row */}
                        {((feature.properties.physician_ftes !== undefined && feature.properties.physician_ftes > 0) ||
                          (feature.properties.physician_assistant_ftes !== undefined && feature.properties.physician_assistant_ftes > 0) ||
                          (feature.properties.num_beds !== undefined && feature.properties.num_beds > 0)) && (
                          <div className="flex gap-4 pt-1">
                            {(feature.properties.physician_ftes !== undefined && feature.properties.physician_ftes > 0) && (
                              <div className="text-center">
                                <div className="text-[#FAC922] font-semibold">{feature.properties.physician_ftes}</div>
                                <div className="text-white/40 text-xs">Physician FTEs</div>
                              </div>
                            )}
                            {(feature.properties.physician_assistant_ftes !== undefined && feature.properties.physician_assistant_ftes > 0) && (
                              <div className="text-center">
                                <div className="text-[#FAC922] font-semibold">{feature.properties.physician_assistant_ftes}</div>
                                <div className="text-white/40 text-xs">PA FTEs</div>
                              </div>
                            )}
                            {(feature.properties.num_beds !== undefined && feature.properties.num_beds > 0) && (
                              <div className="text-center">
                                <div className="text-[#FAC922] font-semibold">{feature.properties.num_beds}</div>
                                <div className="text-white/40 text-xs">Beds</div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Badges for special designations */}
                        {(feature.properties.is_federally_funded_hc || feature.properties.is_hospital_based || feature.properties.is_rural_health_clinic) && (
                          <div className="flex flex-wrap gap-1.5 pt-2 mt-2 border-t border-white/10">
                            {feature.properties.is_federally_funded_hc && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-300 text-xs font-medium rounded-md">
                                FQHC
                              </span>
                            )}
                            {feature.properties.is_hospital_based && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 text-xs font-medium rounded-md">
                                Hospital
                              </span>
                            )}
                            {feature.properties.is_rural_health_clinic && (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-medium rounded-md">
                                Rural Clinic
                              </span>
                            )}
                          </div>
                        )}

                        {feature.properties.rural_status && (
                          <p className="text-white/60 text-xs pt-1">
                            Rural Status: {feature.properties.rural_status}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Active Sites - show clinical placement details */}
                    {layer.layer_key === "active_sites" && (
                      <div className="text-sm space-y-2">
                        {feature.properties.city && (
                          <p className="text-white/80">
                            <span className="text-white/50">Location:</span> {feature.properties.city}, {feature.properties.state}
                          </p>
                        )}
                        {feature.properties.address && (
                          <p className="text-white/80">
                            <span className="text-white/50">Address:</span> {feature.properties.address}
                          </p>
                        )}

                        {/* Program badges */}
                        {(feature.properties.has_ot || feature.properties.has_pt || feature.properties.has_pa) && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {feature.properties.has_ot && (
                              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 text-xs font-semibold rounded-md">
                                OT
                              </span>
                            )}
                            {feature.properties.has_pt && (
                              <span className="px-2.5 py-1 bg-blue-500/20 text-blue-300 text-xs font-semibold rounded-md">
                                PT
                              </span>
                            )}
                            {feature.properties.has_pa && (
                              <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-md">
                                PA
                              </span>
                            )}
                          </div>
                        )}

                        {feature.properties.source && (
                          <p className="text-white/40 text-xs pt-1">
                            Source: {feature.properties.source}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Default for other layers */}
                    {layer.layer_key !== "hrsa_sites" && layer.layer_key !== "active_sites" && !feature.properties.professions && (
                      <p className="text-sm text-white/70">{feature.properties.state}</p>
                    )}

                    {/* Add to Watchlist button */}
                    {onToggleFavorite && (
                      <div className="flex items-center pt-3 mt-3 border-t border-white/10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite({
                              id: feature.properties.id,
                              layer_key: layer.layer_key,
                              name: feature.properties.name,
                              state: feature.properties.state,
                              latitude: lat,
                              longitude: lng,
                            });
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg flex-1 transition-colors ${
                            isFavorite?.(feature.properties.id, layer.layer_key)
                              ? "bg-[#FAC922]/20 text-[#FAC922]"
                              : "bg-white/5 text-white/70 hover:bg-[#FAC922]/10 hover:text-[#FAC922]"
                          }`}
                        >
                          <Star
                            className="w-4 h-4"
                            fill={isFavorite?.(feature.properties.id, layer.layer_key) ? "currentColor" : "none"}
                          />
                          <span className="text-sm font-medium">
                            {isFavorite?.(feature.properties.id, layer.layer_key) ? "In Watchlist" : "Add to Watchlist"}
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          });
        })}

        {/* Render highlight markers on top */}
        {highlightPoints.map((point, index) => (
          <Marker
            key={`highlight-${index}-${point.lat}-${point.lng}`}
            position={[point.lat, point.lng]}
            icon={highlightIcon.current!}
            zIndexOffset={1000}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              <span className="font-medium">{point.name}</span>
              {point.label && <span className="text-gray-500 ml-1">({point.label})</span>}
            </Tooltip>

            <Popup>
              <div className="min-w-[200px] p-4">
                <div className="flex items-start gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-[#FAC922] mt-1.5 flex-shrink-0" />
                  <h3 className="font-semibold text-white text-base leading-tight">
                    {point.name}
                  </h3>
                </div>
                {point.label && (
                  <p className="text-sm text-white/70 ml-4">{point.label}</p>
                )}
                <p className="text-xs text-[#FAC922]/60 mt-2 ml-4">
                  AI Query Result
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* County-level choropleth layers - pop_change and coverage_ratio */}
        {activeChoropleth && (activeChoropleth === "pop_change" || activeChoropleth === "coverage_ratio") && (
          <ChoroplethLayer
            layer={activeChoropleth}
            visible={true}
            onLoadingChange={onChoroplethLoadingChange}
          />
        )}

        {/* State-level choropleth layers - gdp_growth and healthcare_employment */}
        {activeChoropleth && (activeChoropleth === "gdp_growth" || activeChoropleth === "healthcare_employment") && (
          <StateChoroplethLayer
            layer={activeChoropleth}
            visible={true}
            onLoadingChange={onChoroplethLoadingChange}
          />
        )}
      </MapContainer>

      {/* Map Legend - outside MapContainer but positioned over map */}
      <MapLegend layer={activeChoropleth} />

      {/* Radius Results Panel */}
      {radiusOrigin && radiusBuckets && (
        <RadiusResults
          origin={radiusOrigin}
          buckets={radiusBuckets}
          layerColors={layerColors}
          onClear={handleClearRadius}
          onSiteClick={handleRadiusSiteClick}
        />
      )}
    </div>
  );
}
