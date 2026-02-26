"use client";

import { Layers, Eye, EyeOff, BarChart3 } from "lucide-react";
import type { Layer, LayerVisibility } from "@/lib/types";

interface LayerToggleProps {
  layers: Layer[];
  layerVisibility: LayerVisibility;
  onToggle: (layerKey: string) => void;
}

// Choropleth layer keys for grouping
const ANALYSIS_LAYER_KEYS = ["pop_change", "coverage_ratio"];

export default function LayerToggle({
  layers,
  layerVisibility,
  onToggle,
}: LayerToggleProps) {
  // Separate regular layers from analysis layers
  const regularLayers = layers.filter(l => !ANALYSIS_LAYER_KEYS.includes(l.layer_key));
  const analysisLayers = layers.filter(l => ANALYSIS_LAYER_KEYS.includes(l.layer_key));

  const renderLayerButton = (layer: Layer) => {
    const isVisible = layerVisibility[layer.layer_key] ?? layer.default_visible;
    const isAnalysisLayer = ANALYSIS_LAYER_KEYS.includes(layer.layer_key);

    return (
      <button
        key={layer.layer_key}
        onClick={() => onToggle(layer.layer_key)}
        className={`w-full flex items-center gap-3 p-2.5 rounded transition-all ${
          isVisible
            ? "bg-green-light/30 border border-gold/20"
            : "bg-green-deep/50 border border-white/5 opacity-60"
        } hover:border-gold/30`}
      >
        {/* Color indicator */}
        <div
          className={`w-3 h-3 flex-shrink-0 ${isAnalysisLayer ? "rounded" : "rounded-full"}`}
          style={{ backgroundColor: layer.color || "#E74C3C" }}
        />

        {/* Layer name */}
        <span className="flex-1 text-left text-sm text-white">
          {layer.display_name}
        </span>

        {/* Visibility icon */}
        {isVisible ? (
          <Eye className="w-4 h-4 text-gold" />
        ) : (
          <EyeOff className="w-4 h-4 text-text-muted" />
        )}
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
      {analysisLayers.length > 0 && (
        <>
          <div className="flex items-center gap-2 mt-6 mb-3">
            <BarChart3 className="w-4 h-4 text-gold" />
            <h4 className="text-sm font-medium text-text-light">Analysis Layers</h4>
          </div>

          <div className="space-y-2">
            {analysisLayers.map(renderLayerButton)}
          </div>

          <p className="text-xs text-text-muted mt-2 italic">
            Only one analysis layer at a time
          </p>
        </>
      )}

      {/* Legend hint */}
      <p className="text-xs text-text-muted mt-4">
        Click to toggle layer visibility
      </p>
    </div>
  );
}
