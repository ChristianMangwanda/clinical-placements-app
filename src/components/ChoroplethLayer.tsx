"use client";

import { useEffect, useState, useCallback } from "react";
import { GeoJSON, useMap } from "react-leaflet";
import { feature } from "topojson-client";
import type { Topology } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import L from "leaflet";

const COUNTIES_TOPOJSON_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";

interface CountyData {
  fips: string;
  county_name: string;
  state: string;
  pop_current: number;
  pop_previous: number;
  pop_change_pct: number;
  facility_count: number;
  people_per_facility: number | null;
}

interface ChoroplethLayerProps {
  layer: "pop_change" | "coverage_ratio";
  visible: boolean;
  onLoadingChange?: (loading: boolean) => void;
}

// Module-level caches
let cachedGeoJSON: FeatureCollection | null = null;
let cachedCountyData: Map<string, CountyData> | null = null;

// Color scale for population change (diverging: red to green)
function getPopChangeColor(pct: number | null): string {
  if (pct === null || pct === undefined) return "#CCCCCC";
  if (pct < -5) return "#C0392B";  // Dark red - significant decline
  if (pct < -2) return "#E74C3C";  // Red
  if (pct < 0) return "#FADBD8";   // Light pink - slight decline
  if (pct < 2) return "#D5F5E3";   // Light green - slight growth
  if (pct < 5) return "#27AE60";   // Green
  return "#1E8449";                 // Dark green - significant growth
}

// Color scale for coverage ratio (sequential: green to red/purple)
function getCoverageColor(ratio: number | null, facilityCount: number): string {
  if (facilityCount === 0 || ratio === null) return "#4A235A"; // Dark purple - NO facilities
  if (ratio < 500) return "#27AE60";   // Green - well-covered
  if (ratio < 1000) return "#7DCEA0";  // Light green
  if (ratio < 2500) return "#F9E79F";  // Yellow - moderate
  if (ratio < 5000) return "#E74C3C";  // Red - underserved
  return "#922B21";                     // Dark red - highly underserved
}

async function loadCountyGeoJSON(): Promise<FeatureCollection> {
  const response = await fetch(COUNTIES_TOPOJSON_URL);
  const topology: Topology = await response.json();
  const geojson = feature(topology, topology.objects.counties) as FeatureCollection;
  return geojson;
}

async function getCountyGeoJSON(): Promise<FeatureCollection> {
  if (cachedGeoJSON) return cachedGeoJSON;
  cachedGeoJSON = await loadCountyGeoJSON();
  return cachedGeoJSON;
}

async function loadCountyData(): Promise<Map<string, CountyData>> {
  if (cachedCountyData) return cachedCountyData;

  const response = await fetch("/api/population");
  const result = await response.json();

  if (!result.success) {
    throw new Error("Failed to load county data");
  }

  const dataMap = new Map<string, CountyData>();
  for (const county of result.data as CountyData[]) {
    dataMap.set(county.fips, county);
  }

  cachedCountyData = dataMap;
  return dataMap;
}

export default function ChoroplethLayer({ layer, visible, onLoadingChange }: ChoroplethLayerProps) {
  const map = useMap();
  const [geoJsonData, setGeoJsonData] = useState<FeatureCollection | null>(null);
  const [countyDataMap, setCountyDataMap] = useState<Map<string, CountyData> | null>(null);
  const [loading, setLoading] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  // Create choropleth pane with lower z-index
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
          getCountyGeoJSON(),
          loadCountyData(),
        ]);

        setGeoJsonData(geoJson);
        setCountyDataMap(dataMap);
        setRenderKey((k) => k + 1);
      } catch (error) {
        console.error("Error loading choropleth data:", error);
      } finally {
        setLoading(false);
        onLoadingChange?.(false);
      }
    };

    loadData();
  }, [visible, onLoadingChange]);

  // Force re-render when layer type changes
  useEffect(() => {
    if (visible && geoJsonData && countyDataMap) {
      setRenderKey((k) => k + 1);
    }
  }, [layer, visible, geoJsonData, countyDataMap]);

  // Style function for GeoJSON features
  const styleFeature = useCallback(
    (feature: Feature<Geometry> | undefined) => {
      if (!feature || !countyDataMap) {
        return {
          fillColor: "#CCCCCC",
          fillOpacity: 0.55,
          weight: 0.5,
          color: "#888888",
          opacity: 0.3,
        };
      }

      const fips = String(feature.id).padStart(5, "0");
      const data = countyDataMap.get(fips);

      let fillColor = "#CCCCCC";
      if (data) {
        if (layer === "pop_change") {
          fillColor = getPopChangeColor(data.pop_change_pct);
        } else {
          fillColor = getCoverageColor(data.people_per_facility, data.facility_count);
        }
      }

      return {
        fillColor,
        fillOpacity: 0.55,
        weight: 0.5,
        color: "#888888",
        opacity: 0.3,
      };
    },
    [layer, countyDataMap]
  );

  // Bind tooltip to each feature
  const onEachFeature = useCallback(
    (feature: Feature<Geometry>, leafletLayer: L.Layer) => {
      if (!countyDataMap) return;

      const fips = String(feature.id).padStart(5, "0");
      const d = countyDataMap.get(fips);

      if (!d) return;

      const changeColor = d.pop_change_pct >= 0 ? "#27AE60" : "#E74C3C";
      const changeSign = d.pop_change_pct > 0 ? "+" : "";

      const coverageText = d.people_per_facility
        ? `${Math.round(d.people_per_facility).toLocaleString()} people/facility`
        : '<span style="color: #922B21; font-weight: bold;">No facilities</span>';

      const tooltip = `
        <div style="font-family: system-ui, -apple-system, sans-serif; font-size: 13px; line-height: 1.5; min-width: 180px;">
          <strong style="font-size: 14px; color: #0D433B;">${d.county_name}, ${d.state}</strong><br/>
          Population: ${d.pop_current.toLocaleString()}<br/>
          Change: <span style="color: ${changeColor}; font-weight: 500;">
            ${changeSign}${d.pop_change_pct}%
          </span><br/>
          HRSA Facilities: ${d.facility_count}<br/>
          Coverage: ${coverageText}
        </div>
      `;

      (leafletLayer as L.Path).bindTooltip(tooltip, {
        sticky: true,
        direction: "top",
        opacity: 0.95,
      });
    },
    [countyDataMap]
  );

  if (!visible || !geoJsonData || !countyDataMap || loading) {
    return null;
  }

  return (
    <GeoJSON
      key={`${layer}-${renderKey}`}
      data={geoJsonData}
      style={styleFeature}
      onEachFeature={onEachFeature}
      pane="choropleth"
    />
  );
}
