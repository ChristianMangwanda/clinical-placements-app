import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, escapeId } from "@/lib/db";
import type { Layer, GeoJSONFeatureCollection, MapBounds } from "@/lib/types";

// Maximum number of sites to return per request (performance limit)
const MAX_RESULTS = 5000;

// Map layer_key to the name column in each table
const NAME_COLUMNS: Record<string, string> = {
  hrsa_sites: "site_name",
  schools: "institution_name",
  post_secondary_schools: "institution_name",
  military_sites: "name",
  native_american_reserves: "name",
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const layerKey = searchParams.get("layer");
    const state = searchParams.get("state"); // Single state (legacy)
    const states = searchParams.get("states"); // Multiple states (comma-separated)
    const boundsParam = searchParams.get("bounds");

    if (!layerKey) {
      return NextResponse.json(
        { success: false, error: "layer parameter is required" },
        { status: 400 }
      );
    }

    // Get layer metadata to find the table name
    const layer = await queryOne<Layer>(
      "SELECT * FROM `layers` WHERE `layer_key` = ?",
      [layerKey]
    );

    if (!layer) {
      return NextResponse.json(
        { success: false, error: `Layer '${layerKey}' not found` },
        { status: 404 }
      );
    }

    const tableName = layer.table_name;
    const nameColumn = NAME_COLUMNS[tableName] || "name";
    const isSchools = layerKey === "schools";

    // Build query with optional filters
    // For schools, also include the profession column
    let sql = isSchools
      ? `SELECT id, ${escapeId(nameColumn)} as name, state, latitude, longitude, profession FROM ${escapeId(tableName)} WHERE 1=1`
      : `SELECT id, ${escapeId(nameColumn)} as name, state, latitude, longitude FROM ${escapeId(tableName)} WHERE 1=1`;
    const params: unknown[] = [];

    // State filter - handle both single state and multiple states
    if (states) {
      // Multiple states (comma-separated)
      const stateList = states.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      if (stateList.length > 0) {
        sql += ` AND state IN (${stateList.map(() => "?").join(", ")})`;
        params.push(...stateList);
      }
    } else if (state) {
      // Single state (legacy support)
      sql += " AND state = ?";
      params.push(state.toUpperCase());
    }

    // Bounds filter for viewport-based loading
    if (boundsParam) {
      const bounds = parseBounds(boundsParam);
      if (bounds) {
        sql += " AND latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?";
        params.push(bounds.minLat, bounds.maxLat, bounds.minLng, bounds.maxLng);
      }
    }

    // Limit results for performance
    sql += ` LIMIT ${MAX_RESULTS}`;

    interface SiteRow {
      id: number;
      name: string;
      state: string;
      latitude: number;
      longitude: number;
      profession?: string;
    }

    const sites = await query<SiteRow>(sql, params);

    // For schools, group by institution to show all programs in one marker
    let features;
    if (isSchools) {
      // Group schools by name + state (same institution may have multiple programs)
      const grouped = new Map<string, {
        id: number;
        name: string;
        state: string;
        latitude: number;
        longitude: number;
        professions: string[];
      }>();

      for (const site of sites) {
        const key = `${site.name}|${site.state}|${site.latitude}|${site.longitude}`;
        const existing = grouped.get(key);
        if (existing) {
          if (site.profession && !existing.professions.includes(site.profession)) {
            existing.professions.push(site.profession);
          }
        } else {
          grouped.set(key, {
            id: site.id,
            name: site.name || "Unknown",
            state: site.state,
            latitude: site.latitude,
            longitude: site.longitude,
            professions: site.profession ? [site.profession] : [],
          });
        }
      }

      features = Array.from(grouped.values()).map((school) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [school.longitude, school.latitude] as [number, number],
        },
        properties: {
          id: school.id,
          name: school.name,
          layer_key: layerKey,
          state: school.state,
          professions: school.professions, // Array of all programs
        },
      }));
    } else {
      features = sites.map((site) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [site.longitude, site.latitude] as [number, number],
        },
        properties: {
          id: site.id,
          name: site.name || "Unknown",
          layer_key: layerKey,
          state: site.state,
        },
      }));
    }

    // Convert to GeoJSON FeatureCollection
    const geojson: GeoJSONFeatureCollection = {
      type: "FeatureCollection",
      features,
    };

    return NextResponse.json({
      success: true,
      data: geojson,
      meta: {
        count: sites.length,
        limited: sites.length >= MAX_RESULTS,
      },
    });
  } catch (error) {
    console.error("Error fetching sites:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch sites",
      },
      { status: 500 }
    );
  }
}

// Parse bounds string: "minLat,minLng,maxLat,maxLng"
function parseBounds(boundsStr: string): MapBounds | null {
  const parts = boundsStr.split(",").map(Number);
  if (parts.length !== 4 || parts.some(isNaN)) {
    return null;
  }
  return {
    minLat: parts[0],
    minLng: parts[1],
    maxLat: parts[2],
    maxLng: parts[3],
  };
}
