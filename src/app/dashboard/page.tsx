"use client";

import { useState, useEffect, useCallback } from "react";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MapWrapper from "@/components/MapWrapper";
import DataTable from "@/components/DataTable";
import ChatPanel from "@/components/ChatPanel";
import type { Layer, LayerVisibility, Profession, SearchResult, MapPoint } from "@/lib/types";

export default function Home() {
  // Layer state
  const [layers, setLayers] = useState<Layer[]>([]);
  const [layerVisibility, setLayerVisibility] = useState<LayerVisibility>({});
  const [layersLoading, setLayersLoading] = useState(true);

  // Filter state
  const [stateFilter, setStateFilter] = useState<string[]>([]);
  const [professionFilter, setProfessionFilter] = useState<Profession | null>(null);

  // Map state
  const [flyToLocation, setFlyToLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Choropleth state - only one can be active at a time
  const [activeChoropleth, setActiveChoropleth] = useState<"pop_change" | "coverage_ratio" | null>(null);
  const [choroplethLoading, setChoroplethLoading] = useState(false);

  // AI highlight state
  const [highlightPoints, setHighlightPoints] = useState<MapPoint[]>([]);

  // AI mode state - for toggling layers and showing AI results in table
  const [isAiMode, setIsAiMode] = useState(false);
  const [savedLayerVisibility, setSavedLayerVisibility] = useState<LayerVisibility | null>(null);
  const [aiTableData, setAiTableData] = useState<SearchResult[]>([]);

  // Data table state
  const [tableData, setTableData] = useState<SearchResult[]>([]);
  const [tableLoading, setTableLoading] = useState(false);

  // Fetch layers on mount
  useEffect(() => {
    async function fetchLayers() {
      try {
        const response = await fetch("/api/layers");
        const result = await response.json();

        if (result.success) {
          setLayers(result.data);

          // Initialize visibility from default_visible
          const initialVisibility: LayerVisibility = {};
          result.data.forEach((layer: Layer) => {
            initialVisibility[layer.layer_key] = layer.default_visible;
          });
          setLayerVisibility(initialVisibility);
        }
      } catch (error) {
        console.error("Error fetching layers:", error);
      } finally {
        setLayersLoading(false);
      }
    }

    fetchLayers();
  }, []);

  // Load saved layer visibility from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("layerVisibility");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setLayerVisibility((prev) => ({ ...prev, ...parsed }));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save layer visibility to localStorage
  useEffect(() => {
    if (Object.keys(layerVisibility).length > 0) {
      localStorage.setItem("layerVisibility", JSON.stringify(layerVisibility));
    }
  }, [layerVisibility]);

  // Fetch table data when filters change
  const fetchTableData = useCallback(async () => {
    setTableLoading(true);
    try {
      // Get visible layers
      const visibleLayers = Object.entries(layerVisibility)
        .filter(([, visible]) => visible)
        .map(([key]) => key);

      if (visibleLayers.length === 0) {
        setTableData([]);
        return;
      }

      // When state filter is applied, fetch from all visible layers via /api/sites
      if (stateFilter.length > 0) {
        const allResults: SearchResult[] = [];

        // Fetch from each visible layer in parallel
        const fetchPromises = visibleLayers.map(async (layerKey) => {
          const url = `/api/sites?layer=${layerKey}&states=${stateFilter.join(",")}`;
          const response = await fetch(url);
          const result = await response.json();

          if (result.success && result.data?.features) {
            return result.data.features.map(
              (f: { properties: { id: number; name: string; layer_key: string; state: string }; geometry: { coordinates: [number, number] } }) => ({
                id: f.properties.id,
                name: f.properties.name,
                layer_key: f.properties.layer_key,
                state: f.properties.state,
                latitude: f.geometry.coordinates[1],
                longitude: f.geometry.coordinates[0],
              })
            );
          }
          return [];
        });

        const resultsArrays = await Promise.all(fetchPromises);
        resultsArrays.forEach((results) => allResults.push(...results));

        setTableData(allResults);
      } else {
        // No state filter - use search endpoint
        const url = `/api/search?q=.&layers=${visibleLayers.join(",")}`;
        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
          setTableData(result.data || []);
        }
      }
    } catch (error) {
      console.error("Error fetching table data:", error);
    } finally {
      setTableLoading(false);
    }
  }, [layerVisibility, stateFilter]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchTableData();
    }, 500);

    return () => clearTimeout(timeout);
  }, [fetchTableData]);

  // Choropleth layer keys
  const choroplethLayers = ["pop_change", "coverage_ratio"];

  // Handlers
  const handleLayerToggle = (layerKey: string) => {
    // Handle choropleth layers with mutual exclusion
    if (choroplethLayers.includes(layerKey)) {
      if (activeChoropleth === layerKey) {
        // Toggle off
        setActiveChoropleth(null);
      } else {
        // Toggle on (this automatically turns off the other)
        setActiveChoropleth(layerKey as "pop_change" | "coverage_ratio");
      }
      return;
    }

    // Regular layer toggle
    setLayerVisibility((prev) => ({
      ...prev,
      [layerKey]: !prev[layerKey],
    }));
  };

  const handleClearFilters = () => {
    setStateFilter([]);
    setProfessionFilter(null);
  };

  const handleSearchSelect = (result: SearchResult) => {
    setFlyToLocation({ lat: result.latitude, lng: result.longitude });
  };

  const handleRowClick = (item: SearchResult) => {
    setFlyToLocation({ lat: item.latitude, lng: item.longitude });
  };

  // Handle AI chat query results - toggle layers and show results
  const handleQueryResult = (result: { mapPoints: MapPoint[]; tableResults: SearchResult[] }) => {
    // Save current layer visibility before hiding
    if (!isAiMode) {
      setSavedLayerVisibility({ ...layerVisibility });
    }

    // Hide all layers to show only AI highlights
    const hiddenVisibility: LayerVisibility = {};
    Object.keys(layerVisibility).forEach((key) => {
      hiddenVisibility[key] = false;
    });
    setLayerVisibility(hiddenVisibility);

    // Set AI results
    setHighlightPoints(result.mapPoints);
    setAiTableData(result.tableResults);
    setIsAiMode(true);
  };

  const handleClearHighlights = () => {
    // Restore original layer visibility
    if (savedLayerVisibility) {
      setLayerVisibility(savedLayerVisibility);
      setSavedLayerVisibility(null);
    }

    // Clear AI results
    setHighlightPoints([]);
    setAiTableData([]);
    setIsAiMode(false);
  };

  // Get layer colors for data table
  const layerColors: Record<string, string> = {};
  layers.forEach((layer) => {
    layerColors[layer.layer_key] = layer.color || "#E74C3C";
  });

  // Merge choropleth visibility with layer visibility for sidebar display
  const effectiveLayerVisibility: LayerVisibility = {
    ...layerVisibility,
    pop_change: activeChoropleth === "pop_change",
    coverage_ratio: activeChoropleth === "coverage_ratio",
  };

  if (layersLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-green-deep">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gold/30 border-t-gold rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-light">Loading Clinical Placements Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-green-deep overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          layers={layers}
          layerVisibility={effectiveLayerVisibility}
          onLayerToggle={handleLayerToggle}
          stateFilter={stateFilter}
          professionFilter={professionFilter}
          onStateChange={setStateFilter}
          onProfessionChange={setProfessionFilter}
          onClearFilters={handleClearFilters}
          onSearchSelect={handleSearchSelect}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Map */}
          <div className="flex-1 relative">
            <MapWrapper
              layers={layers}
              layerVisibility={layerVisibility}
              stateFilter={stateFilter}
              flyToLocation={flyToLocation}
              highlightPoints={highlightPoints}
              onClearHighlights={handleClearHighlights}
              activeChoropleth={activeChoropleth}
              onChoroplethLoadingChange={setChoroplethLoading}
            />
          </div>

          {/* Data Table */}
          <DataTable
            data={isAiMode ? aiTableData : tableData}
            loading={isAiMode ? false : tableLoading}
            onRowClick={handleRowClick}
            layerColors={layerColors}
            isAiResults={isAiMode}
          />
        </div>
      </div>

      {/* Chat Panel - bottom right floating */}
      <ChatPanel onQueryResult={handleQueryResult} />
    </div>
  );
}
