"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Layer, LayerVisibility, MapBounds } from "@/lib/types";

// Site properties from the API
interface SiteProperties {
  id: number;
  name: string;
  layer_key: string;
  state: string;
  professions?: string[]; // Only for schools layer - array of programs (PT, OT, PA)
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

interface MapProps {
  layers: Layer[];
  layerVisibility: LayerVisibility;
  stateFilter?: string[];
  flyToLocation?: { lat: number; lng: number } | null;
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

export default function MapClient({
  layers,
  layerVisibility,
  stateFilter,
  flyToLocation,
}: MapProps) {
  const [sitesData, setSitesData] = useState<Record<string, SiteFeatureCollection>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [bounds, setBounds] = useState<MapBounds | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const iconCache = useRef<Record<string, L.DivIcon>>({});

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

  return (
    <div className="h-full w-full relative">
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute top-4 right-4 z-[1000] bg-[#092E28]/90 text-[#FAC922] px-3 py-1.5 rounded text-sm font-medium">
          Loading sites...
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
                  <div className="min-w-[200px] p-1">
                    <h3 className="font-semibold text-[#0D433B] text-base mb-1">
                      {feature.properties.name}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {feature.properties.professions && feature.properties.professions.length > 0
                        ? `Programs: ${feature.properties.professions.join(", ")}`
                        : layer.display_name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {feature.properties.state}
                    </p>
                  </div>
                </Popup>
              </Marker>
            );
          });
        })}
      </MapContainer>
    </div>
  );
}
