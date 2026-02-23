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
  active_sites: "site_name",
};

// Extended HRSA site interface
interface HrsaSiteRow {
  id: number;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  site_category?: string;
  city?: string;
  physician_ftes?: number;
  physician_assistant_ftes?: number;
  num_beds?: number;
  is_federally_funded_hc?: boolean;
  is_hospital_based?: boolean;
  site_type?: string;
  is_rural_health_clinic?: boolean;
  rural_status?: string;
}

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
      "SELECT * FROM layers WHERE layer_key = $1",
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
    const isHrsa = layerKey === "hrsa_sites";
    const isActiveSites = layerKey === "active_sites";

    // Build query with optional filters
    // For schools, include the profession column
    // For HRSA and Active Sites, include extended fields
    let sql: string;
    if (isSchools) {
      sql = `SELECT id, ${escapeId(nameColumn)} as name, state, latitude, longitude, profession FROM ${escapeId(tableName)} WHERE 1=1`;
    } else if (isHrsa) {
      sql = `SELECT id, ${escapeId(nameColumn)} as name, state, latitude, longitude,
             site_category, city, physician_ftes, physician_assistant_ftes, num_beds,
             is_federally_funded_hc, is_hospital_based, site_type, is_rural_health_clinic, rural_status
             FROM ${escapeId(tableName)} WHERE 1=1`;
    } else if (isActiveSites) {
      sql = `SELECT id, ${escapeId(nameColumn)} as name, state, latitude, longitude,
             address, city, programs, has_ot, has_pt, has_pa, source
             FROM ${escapeId(tableName)} WHERE 1=1`;
    } else {
      sql = `SELECT id, ${escapeId(nameColumn)} as name, state, latitude, longitude FROM ${escapeId(tableName)} WHERE 1=1`;
    }
    const params: unknown[] = [];
    let paramIndex = 1;

    // State filter - handle both single state and multiple states
    if (states) {
      // Multiple states (comma-separated)
      const stateList = states.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean);
      if (stateList.length > 0) {
        const placeholders = stateList.map(() => `$${paramIndex++}`).join(", ");
        sql += ` AND state IN (${placeholders})`;
        params.push(...stateList);
      }
    } else if (state) {
      // Single state (legacy support)
      sql += ` AND state = $${paramIndex++}`;
      params.push(state.toUpperCase());
    }

    // Bounds filter for viewport-based loading
    if (boundsParam) {
      const bounds = parseBounds(boundsParam);
      if (bounds) {
        sql += ` AND latitude BETWEEN $${paramIndex++} AND $${paramIndex++} AND longitude BETWEEN $${paramIndex++} AND $${paramIndex++}`;
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
      // HRSA extended fields
      site_category?: string;
      city?: string;
      physician_ftes?: number;
      physician_assistant_ftes?: number;
      num_beds?: number;
      is_federally_funded_hc?: boolean;
      is_hospital_based?: boolean;
      site_type?: string;
      is_rural_health_clinic?: boolean;
      rural_status?: string;
      // Active Sites extended fields
      address?: string;
      programs?: string;
      has_ot?: boolean;
      has_pt?: boolean;
      has_pa?: boolean;
      source?: string;
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
    } else if (isHrsa) {
      // HRSA sites with extended properties
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
          // Extended HRSA fields
          city: site.city,
          site_category: site.site_category,
          site_type: site.site_type,
          physician_ftes: site.physician_ftes,
          physician_assistant_ftes: site.physician_assistant_ftes,
          num_beds: site.num_beds,
          is_federally_funded_hc: site.is_federally_funded_hc,
          is_hospital_based: site.is_hospital_based,
          is_rural_health_clinic: site.is_rural_health_clinic,
          rural_status: site.rural_status,
        },
      }));
    } else if (isActiveSites) {
      // Active Clarkson Sites with extended properties
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
          // Extended Active Sites fields
          address: site.address,
          city: site.city,
          programs: site.programs,
          has_ot: site.has_ot,
          has_pt: site.has_pt,
          has_pa: site.has_pa,
          source: site.source,
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
