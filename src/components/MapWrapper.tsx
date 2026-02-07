"use client";

import dynamic from "next/dynamic";
import type { Layer, LayerVisibility } from "@/lib/types";

// Dynamically import the Map component with SSR disabled
const MapComponent = dynamic(() => import("./MapClient"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-green-deep">
      <div className="text-gold">Loading map...</div>
    </div>
  ),
});

interface MapWrapperProps {
  layers: Layer[];
  layerVisibility: LayerVisibility;
  stateFilter?: string[];
  flyToLocation?: { lat: number; lng: number } | null;
}

export default function MapWrapper(props: MapWrapperProps) {
  return <MapComponent {...props} />;
}
