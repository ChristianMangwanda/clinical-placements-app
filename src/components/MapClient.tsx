"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X } from "lucide-react";
import type { Layer, LayerVisibility, MapBounds, MapPoint } from "@/lib/types";
import ChoroplethLayer from "./ChoroplethLayer";
import MapLegend from "./MapLegend";

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
  flyToLocation?: { lat: number; lng: number } | null;
  highlightPoints?: MapPoint[];
  onClearHighlights?: () => void;
  activeChoropleth?: "pop_change" | "coverage_ratio" | null;
  onChoroplethLoadingChange?: (loading: boolean) => void;
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

export default function MapClient({
  layers,
  layerVisibility,
  stateFilter,
  flyToLocation,
  highlightPoints = [],
  onClearHighlights,
  activeChoropleth = null,
  onChoroplethLoadingChange,
}: MapProps) {
  const [sitesData, setSitesData] = useState<Record<string, SiteFeatureCollection>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const iconCache = useRef<Record<string, L.DivIcon>>({});
  const highlightIcon = useRef<L.DivIcon | null>(null);

  // Create highlight icon once
  if (!highlightIcon.current) {
    highlightIcon.current = createHighlightIcon();
  }

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
    [stateFilter]
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
    <div className="h-full w-full relative">
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

                {/* Click popup */}
                <Popup>
                  <div className="min-w-[240px] max-w-[320px] p-1">
                    <h3 className="font-semibold text-[#0D433B] text-base mb-2">
                      {feature.properties.name}
                    </h3>

                    {/* Schools - show programs */}
                    {feature.properties.professions && feature.properties.professions.length > 0 && (
                      <p className="text-sm text-gray-600 mb-1">
                        <span className="font-medium">Programs:</span> {feature.properties.professions.join(", ")}
                      </p>
                    )}

                    {/* HRSA sites - show extended details */}
                    {layer.layer_key === "hrsa_sites" && (
                      <div className="text-sm space-y-1">
                        {feature.properties.city && (
                          <p className="text-gray-600">
                            <span className="font-medium">Location:</span> {feature.properties.city}, {feature.properties.state}
                          </p>
                        )}
                        {feature.properties.site_category && (
                          <p className="text-gray-600">
                            <span className="font-medium">Category:</span> {feature.properties.site_category}
                          </p>
                        )}
                        {feature.properties.site_type && (
                          <p className="text-gray-600">
                            <span className="font-medium">Type:</span> {feature.properties.site_type}
                          </p>
                        )}
                        {(feature.properties.physician_ftes !== undefined && feature.properties.physician_ftes > 0) && (
                          <p className="text-gray-600">
                            <span className="font-medium">Physician FTEs:</span> {feature.properties.physician_ftes}
                          </p>
                        )}
                        {(feature.properties.physician_assistant_ftes !== undefined && feature.properties.physician_assistant_ftes > 0) && (
                          <p className="text-gray-600">
                            <span className="font-medium">PA FTEs:</span> {feature.properties.physician_assistant_ftes}
                          </p>
                        )}
                        {(feature.properties.num_beds !== undefined && feature.properties.num_beds > 0) && (
                          <p className="text-gray-600">
                            <span className="font-medium">Beds:</span> {feature.properties.num_beds}
                          </p>
                        )}
                        {feature.properties.rural_status && (
                          <p className="text-gray-600">
                            <span className="font-medium">Rural Status:</span> {feature.properties.rural_status}
                          </p>
                        )}
                        {/* Badges for special designations */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {feature.properties.is_federally_funded_hc && (
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded">
                              FQHC
                            </span>
                          )}
                          {feature.properties.is_hospital_based && (
                            <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded">
                              Hospital-Based
                            </span>
                          )}
                          {feature.properties.is_rural_health_clinic && (
                            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded">
                              Rural Health Clinic
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Active Sites - show clinical placement details */}
                    {layer.layer_key === "active_sites" && (
                      <div className="text-sm space-y-1">
                        {feature.properties.address && (
                          <p className="text-gray-600">
                            <span className="font-medium">Address:</span> {feature.properties.address}
                          </p>
                        )}
                        {feature.properties.city && (
                          <p className="text-gray-600">
                            <span className="font-medium">Location:</span> {feature.properties.city}, {feature.properties.state}
                          </p>
                        )}
                        {feature.properties.programs && (
                          <p className="text-gray-600">
                            <span className="font-medium">Programs:</span> {feature.properties.programs}
                          </p>
                        )}
                        {/* Program badges */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {feature.properties.has_ot && (
                            <span className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded font-medium">
                              OT
                            </span>
                          )}
                          {feature.properties.has_pt && (
                            <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-medium">
                              PT
                            </span>
                          )}
                          {feature.properties.has_pa && (
                            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded font-medium">
                              PA
                            </span>
                          )}
                        </div>
                        {feature.properties.source && (
                          <p className="text-xs text-gray-400 mt-2">
                            Source: {feature.properties.source}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Default for other layers */}
                    {layer.layer_key !== "hrsa_sites" && layer.layer_key !== "active_sites" && !feature.properties.professions && (
                      <>
                        <p className="text-sm text-gray-600">{layer.display_name}</p>
                        <p className="text-sm text-gray-500">{feature.properties.state}</p>
                      </>
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
              <div className="min-w-[180px] p-1">
                <h3 className="font-semibold text-[#0D433B] text-base mb-1">
                  {point.name}
                </h3>
                {point.label && (
                  <p className="text-sm text-gray-600">{point.label}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  From AI query result
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Choropleth layer - renders below point markers */}
        {activeChoropleth && (
          <ChoroplethLayer
            layer={activeChoropleth}
            visible={true}
            onLoadingChange={onChoroplethLoadingChange}
          />
        )}
      </MapContainer>

      {/* Map Legend - outside MapContainer but positioned over map */}
      <MapLegend layer={activeChoropleth} />
    </div>
  );
}
