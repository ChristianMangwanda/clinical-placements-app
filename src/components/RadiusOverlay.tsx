"use client";

import { useEffect, useRef, useState } from "react";
import { Circle, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { RADIUS_CONFIG, milesToMeters } from "@/lib/geo-utils";

interface RadiusOverlayProps {
  origin: [number, number]; // [lat, lng]
  onOriginDrag: (newOrigin: [number, number]) => void;
}

// Create a custom gold marker icon for the origin
function createOriginIcon() {
  return L.divIcon({
    className: "radius-origin-marker",
    html: `
      <div style="
        width: 24px;
        height: 24px;
        background: #FAC922;
        border: 3px solid #092E28;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3), 0 0 12px rgba(250, 201, 34, 0.4);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="
          width: 8px;
          height: 8px;
          background: #092E28;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

// Component to fit bounds when origin is set
function FitToRadiusBounds({ origin }: { origin: [number, number] }) {
  const map = useMap();
  const hasZoomed = useRef(false);

  useEffect(() => {
    if (origin && !hasZoomed.current) {
      // Create bounds that encompass the 90-minute radius
      const radiusMeters = milesToMeters(70);
      const bounds = L.latLng(origin[0], origin[1]).toBounds(radiusMeters * 2);
      map.flyToBounds(bounds, {
        padding: [50, 50],
        maxZoom: 9,
        duration: 0.8,
      });
      hasZoomed.current = true;
    }
  }, [map, origin]);

  // Reset when origin changes
  useEffect(() => {
    hasZoomed.current = false;
  }, [origin[0], origin[1]]);

  return null;
}

export default function RadiusOverlay({ origin, onOriginDrag }: RadiusOverlayProps) {
  const map = useMap();
  const originIcon = useRef<L.DivIcon | null>(null);
  const [paneReady, setPaneReady] = useState(false);

  // Create origin icon once
  if (!originIcon.current) {
    originIcon.current = createOriginIcon();
  }

  // Create radius pane for proper z-ordering - must be ready before rendering circles
  useEffect(() => {
    if (!map.getPane("radius")) {
      const pane = map.createPane("radius");
      pane.style.zIndex = "350";
    }
    setPaneReady(true);
  }, [map]);

  // Don't render until pane is ready
  if (!paneReady) {
    return null;
  }

  return (
    <>
      <FitToRadiusBounds origin={origin} />

      {/* Circles - render largest first so smaller ones draw on top */}
      {[...RADIUS_CONFIG].reverse().map((ring) => (
        <Circle
          key={ring.minutes}
          center={origin}
          radius={milesToMeters(ring.miles)}
          pane="radius"
          pathOptions={{
            color: ring.color,
            weight: 2,
            fillColor: ring.color,
            fillOpacity: ring.minutes === 90 ? 0.06 : 0.08,
            dashArray: ring.minutes === 90 ? "8, 6" : undefined,
          }}
        >
          <Tooltip
            permanent
            direction="right"
            offset={[10, 0]}
            className="radius-label"
          >
            <span style={{ color: ring.color, fontWeight: 500 }}>
              {ring.label}
            </span>
            <span style={{ color: "rgba(255,255,255,0.6)", marginLeft: 4 }}>
              ~{ring.miles} mi
            </span>
          </Tooltip>
        </Circle>
      ))}

      {/* Origin marker - draggable */}
      <Marker
        position={origin}
        icon={originIcon.current!}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const marker = e.target;
            const pos = marker.getLatLng();
            onOriginDrag([pos.lat, pos.lng]);
          },
        }}
        zIndexOffset={1000}
      >
        <Tooltip
          permanent
          direction="top"
          offset={[0, -15]}
          className="radius-origin-tooltip"
        >
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
            Drag to move
          </span>
        </Tooltip>
      </Marker>
    </>
  );
}
