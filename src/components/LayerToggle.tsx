"use client";

import { Layers, Eye, EyeOff } from "lucide-react";
import type { Layer, LayerVisibility } from "@/lib/types";

interface LayerToggleProps {
  layers: Layer[];
  layerVisibility: LayerVisibility;
  onToggle: (layerKey: string) => void;
}

export default function LayerToggle({
  layers,
  layerVisibility,
  onToggle,
}: LayerToggleProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 mb-4">
        <Layers className="w-5 h-5 text-gold" />
        <h3 className="font-heading font-semibold text-white">Map Layers</h3>
      </div>

      <div className="space-y-2">
        {layers.map((layer) => {
          const isVisible = layerVisibility[layer.layer_key] ?? layer.default_visible;

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
                className="w-3 h-3 rounded-full flex-shrink-0"
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
        })}
      </div>

      {/* Legend hint */}
      <p className="text-xs text-text-muted mt-4">
        Click to toggle layer visibility
      </p>
    </div>
  );
}
