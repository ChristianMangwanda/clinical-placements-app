"use client";

import { Layers, BarChart3 } from "lucide-react";
import type { Layer, LayerVisibility } from "@/lib/types";

interface LayerToggleProps {
  layers: Layer[];
  layerVisibility: LayerVisibility;
  onToggle: (layerKey: string) => void;
}

// Choropleth layer keys for grouping
const COUNTY_ANALYSIS_KEYS = ["pop_change", "coverage_ratio"];
const STATE_ANALYSIS_KEYS = ["gdp_growth", "healthcare_employment"];
const ALL_ANALYSIS_KEYS = [...COUNTY_ANALYSIS_KEYS, ...STATE_ANALYSIS_KEYS];

export default function LayerToggle({
  layers,
  layerVisibility,
  onToggle,
}: LayerToggleProps) {
  // Separate regular layers from analysis layers
  const regularLayers = layers.filter(l => !ALL_ANALYSIS_KEYS.includes(l.layer_key));
  const countyAnalysisLayers = layers.filter(l => COUNTY_ANALYSIS_KEYS.includes(l.layer_key));
  const stateAnalysisLayers = layers.filter(l => STATE_ANALYSIS_KEYS.includes(l.layer_key));

  const renderLayerButton = (layer: Layer) => {
    const isVisible = layerVisibility[layer.layer_key] ?? layer.default_visible;
    const isAnalysisLayer = ALL_ANALYSIS_KEYS.includes(layer.layer_key);

    return (
      <button
        key={layer.layer_key}
        onClick={() => onToggle(layer.layer_key)}
        className={`
          group w-full flex items-center gap-3 p-3 rounded-xl
          transition-all duration-200
          ${isVisible
            ? "bg-green-light/20 border border-gold/20"
            : "bg-green-deep/40 border border-white/5 hover:border-white/10 hover:bg-green-deep/60"}
        `}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Color indicator with pulse on active */}
        <div className="relative">
          <div
            className={`
              w-3.5 h-3.5 flex-shrink-0
              ${isAnalysisLayer ? "rounded-sm" : "rounded-full"}
              transition-all duration-200
              ${isVisible ? "scale-110" : "scale-100 opacity-50 group-hover:opacity-70"}
            `}
            style={{ backgroundColor: layer.color || "#E74C3C" }}
          />
          {/* Subtle glow when active */}
          {isVisible && (
            <div
              className="absolute inset-0 rounded-full opacity-40 blur-sm"
              style={{ backgroundColor: layer.color || "#E74C3C" }}
            />
          )}
        </div>

        {/* Layer name */}
        <span className={`
          flex-1 text-left text-sm font-medium
          transition-colors duration-200
          ${isVisible ? "text-white" : "text-white/60 group-hover:text-white/80"}
        `}>
          {layer.display_name}
        </span>

        {/* iOS-style toggle switch */}
        <div
          className={`
            relative w-11 h-[26px] rounded-full flex-shrink-0
            transition-all duration-200
            ${isVisible
              ? "bg-gold"
              : "bg-white/15 group-hover:bg-white/20"}
          `}
          style={{
            transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: isVisible ? '0 0 12px rgba(250, 201, 34, 0.3)' : 'none',
          }}
        >
          <div
            className={`
              absolute top-[3px] w-5 h-5 rounded-full bg-white
              transition-all duration-200
              ${isVisible ? "left-[calc(100%-23px)]" : "left-[3px]"}
            `}
            style={{
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
            }}
          />
        </div>
      </button>
    );
  };

  return (
    <div className="card p-4">
      {/* Point Layers Section */}
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-5 h-5 text-gold" />
        <h3 className="font-heading font-semibold text-white">Map Layers</h3>
      </div>

      <div className="space-y-2">
        {regularLayers.map(renderLayerButton)}
      </div>

      {/* Analysis Layers Section */}
      {(countyAnalysisLayers.length > 0 || stateAnalysisLayers.length > 0) && (
        <>
          <div className="flex items-center gap-2 mt-6 mb-3 pt-4 border-t border-white/5">
            <BarChart3 className="w-4 h-4 text-gold" />
            <h4 className="text-sm font-medium text-text-light">Analysis Layers</h4>
          </div>

          {/* County Level */}
          {countyAnalysisLayers.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-2 pl-1">
                County Level
              </p>
              <div className="space-y-2">
                {countyAnalysisLayers.map(renderLayerButton)}
              </div>
            </div>
          )}

          {/* State Level */}
          {stateAnalysisLayers.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-2 pl-1">
                State Level
              </p>
              <div className="space-y-2">
                {stateAnalysisLayers.map(renderLayerButton)}
              </div>
            </div>
          )}

          <p className="text-xs text-text-muted mt-3 pl-1 pt-2 border-t border-white/5">
            Only one analysis layer at a time
          </p>
        </>
      )}
    </div>
  );
}
