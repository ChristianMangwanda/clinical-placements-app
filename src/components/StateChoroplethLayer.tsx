"use client";

import { useEffect, useState, useCallback } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import L from "leaflet";

const STATES_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json";

interface StateEconomicData {
  state_fips: string;
  state: string;
  state_name: string;
  gdp_current: number | null;
  gdp_previous: number | null;
  gdp_change_pct: number | null;
  gdp_year: number | null;
  healthcare_employment: number | null;
  total_employment: number | null;
  healthcare_share_pct: number | null;
  avg_healthcare_weekly_wage: number | null;
  employment_year: number | null;
}

interface StateChoroplethLayerProps {
  layer: "gdp_growth" | "healthcare_employment";
  visible: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

// Module-level caches
let cachedStateGeoJSON: FeatureCollection | null = null;
let cachedStateData: Map<string, StateEconomicData> | null = null;

// Color scale for GDP growth (diverging: red to green)
function getGdpGrowthColor(pct: number | null): string {
  if (pct === null || pct === undefined) return "#CCCCCC";
  if (pct < 0) return "#C0392B";    // Dark red — declining
  if (pct < 1) return "#E74C3C";    // Red — slow growth
  if (pct < 2) return "#FADBD8";    // Light pink — below average
  if (pct < 4) return "#D5F5E3";    // Light green — average
  if (pct < 6) return "#27AE60";    // Green — strong growth
  return "#1E8449";                   // Dark green — exceptional
}

// Color scale for healthcare employment share (sequential blue)
function getHealthcareShareColor(pct: number | null): string {
  if (pct === null || pct === undefined) return "#CCCCCC";
  if (pct < 10) return "#D6EAF8";   // Very light blue — low concentration
  if (pct < 13) return "#85C1E9";   // Light blue
  if (pct < 15) return "#3498DB";   // Medium blue — average
  if (pct < 18) return "#2471A3";   // Darker blue — above average
  return "#1A5276";                   // Dark blue — high concentration
}

async function loadStateGeoJSON(): Promise<FeatureCollection> {
  const response = await fetch(STATES_TOPOJSON_URL);
  const topology: Topology = await response.json();
  const geojson = feature(topology, topology.objects.states) as FeatureCollection;
  return geojson;
}

async function getStateGeoJSON(): Promise<FeatureCollection> {
  if (cachedStateGeoJSON) return cachedStateGeoJSON;
  cachedStateGeoJSON = await loadStateGeoJSON();
  return cachedStateGeoJSON;
}

async function loadStateData(): Promise<Map<string, StateEconomicData>> {
  if (cachedStateData) return cachedStateData;

  const response = await fetch("/api/economic");
  const result = await response.json();

  if (!result.success) {
    throw new Error("Failed to load state economic data");
  }

  const dataMap = new Map<string, StateEconomicData>();
  for (const state of result.data as StateEconomicData[]) {
    // The TopoJSON uses numeric IDs, so pad to 2 digits
    const fips = String(state.state_fips).padStart(2, "0");
    dataMap.set(fips, state);
  }

  cachedStateData = dataMap;
  return dataMap;
}

export default function StateChoroplethLayer({ layer, visible, onLoadingChange }: StateChoroplethLayerProps) {
  const map = useMap();
  const [geoJsonData, setGeoJsonData] = useState<FeatureCollection | null>(null);
  const [stateDataMap, setStateDataMap] = useState<Map<string, StateEconomicData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  // Create choropleth pane with lower z-index (shared with county choropleth)
  useEffect(() => {
    if (!map.getPane("choropleth")) {
      const pane = map.createPane("choropleth");
      pane.style.zIndex = "300"; // Below marker pane (400) and popup pane (700)
    }
  }, [map]);

  // Load data when layer becomes visible
  useEffect(() => {
    if (!visible) {
      return;
    }

    const loadData = async () => {
      setLoading(true);
      onLoadingChange?.(true);

      try {
        const [geoJson, dataMap] = await Promise.all([
          getStateGeoJSON(),
          loadStateData(),
        ]);

        setGeoJsonData(geoJson);
        setStateDataMap(dataMap);
        setRenderKey((k) => k + 1);
      } catch (error) {
        console.error("Error loading state choropleth data:", error);
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    loadData();
  }, [visible, onLoadingChange]);

  // Force re-render when layer type changes
  useEffect(() => {
    if (visible && geoJsonData && stateDataMap) {
      setRenderKey((k) => k + 1);
    }
  }, [layer, visible, geoJsonData, stateDataMap]);

  // Style function for GeoJSON features
  const styleFeature = useCallback(
    (feature: Feature<Geometry> | undefined) => {
      if (!feature || !stateDataMap) {
        return {
          fillColor: "#CCCCCC",
          fillOpacity: 0.55,
          weight: 1.5,
          color: "#666666",
          opacity: 0.5,
        };
      }

      const fips = String(feature.id).padStart(2, "0");
      const data = stateDataMap.get(fips);

      let fillColor = "#CCCCCC";
      if (data) {
        if (layer === "gdp_growth") {
          fillColor = getGdpGrowthColor(data.gdp_change_pct);
        } else {
          fillColor = getHealthcareShareColor(data.healthcare_share_pct);
        }
      }

      return {
        fillColor,
        fillOpacity: 0.55,
        weight: 1.5,        // Slightly thicker than county borders
        color: "#666666",
        opacity: 0.5,
      };
    },
    [layer, stateDataMap]
  );

  // Bind tooltip to each feature - shows ALL economic data regardless of active layer
  const onEachFeature = useCallback(
    (feature: Feature<Geometry>, leafletLayer: L.Layer) => {
      if (!stateDataMap) return;

      const fips = String(feature.id).padStart(2, "0");
      const d = stateDataMap.get(fips);

      if (!d) return;

      const gdpSection = d.gdp_change_pct !== null ? `
        GDP Growth: <span style="color: ${d.gdp_change_pct >= 0 ? '#27AE60' : '#E74C3C'}; font-weight: 500;">
          ${d.gdp_change_pct > 0 ? '+' : ''}${d.gdp_change_pct}%
        </span> (${d.gdp_year})<br/>
        GDP: $${(d.gdp_current! / 1000).toFixed(0)}B<br/>
      ` : '';

      const empSection = d.healthcare_share_pct !== null ? `
        Healthcare Jobs: ${d.healthcare_employment?.toLocaleString() ?? 'N/A'}<br/>
        HC Share: <strong>${d.healthcare_share_pct}%</strong> of employment<br/>
        Avg HC Wage: $${d.avg_healthcare_weekly_wage?.toLocaleString() ?? 'N/A'}/week<br/>
      ` : '';

      // Show the relevant layer's data first
      const content = layer === "gdp_growth"
        ? gdpSection + empSection
        : empSection + gdpSection;

      const tooltip = `
        <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 13px; line-height: 1.6; min-width: 200px;">
          <strong style="font-size: 15px; color: #0D433B;">${d.state_name}</strong><br/>
          ${content}
        </div>
      `;

      (leafletLayer as L.Path).bindTooltip(tooltip, {
        sticky: true,
        direction: "top",
        opacity: 0.95,
      });
    },
    [layer, stateDataMap]
  );

  if (!visible || !geoJsonData || !stateDataMap || loading) {
    return null;
  }

  return (
    <GeoJSON
      key={`state-${layer}-${renderKey}`}
      data={geoJsonData}
      style={styleFeature}
      onEachFeature={onEachFeature}
      pane="choropleth"
    />
  );
}
