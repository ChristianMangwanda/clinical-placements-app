/**
 * SQL Query Validation and Map Point Extraction
 * Ensures only read-only queries are executed and extracts geographic data
 */

import { MapPoint, SearchResult } from "./types";

/**
 * Check if a SQL query is read-only (SELECT or WITH only)
 * Returns true if the query is safe to execute
 */
export function isReadOnlyQuery(sql: string): boolean {
  if (!sql || typeof sql !== "string") {
    return false;
  }

  const normalized = sql.trim().toUpperCase();

  // Must start with SELECT or WITH (for CTEs)
  if (!normalized.startsWith("SELECT") && !normalized.startsWith("WITH")) {
    return false;
  }

  // Block dangerous keywords
  const dangerousKeywords = [
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "ALTER",
    "TRUNCATE",
    "CREATE",
    "GRANT",
    "REVOKE",
    "EXEC",
    "EXECUTE",
    "CALL",
    "SET ",
    "MERGE",
    "REPLACE",
    "UPSERT",
  ];

  for (const keyword of dangerousKeywords) {
    // Check for keyword as a whole word (not part of a column name)
    const regex = new RegExp(`\\b${keyword}\\b`, "i");
    if (regex.test(normalized)) {
      return false;
    }
  }

  // Block comment-based SQL injection attempts
  if (normalized.includes("--") || normalized.includes("/*")) {
    return false;
  }

  // Block multiple statements
  if (normalized.includes(";") && normalized.indexOf(";") < normalized.length - 1) {
    return false;
  }

  return true;
}

/**
 * Extract map points from query results
 * Looks for latitude/longitude columns and name columns
 */
export function extractMapPoints(results: Record<string, unknown>[]): MapPoint[] {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return [];
  }

  // Check if results have coordinate columns
  const sample = results[0];
  const keys = Object.keys(sample);

  // Find latitude column
  const latColumn = keys.find((k) => {
    const lower = k.toLowerCase();
    return lower === "latitude" || lower === "lat";
  });

  // Find longitude column
  const lngColumn = keys.find((k) => {
    const lower = k.toLowerCase();
    return lower === "longitude" || lower === "lng" || lower === "long";
  });

  // If no coordinate columns, return empty array
  if (!latColumn || !lngColumn) {
    return [];
  }

  // Find name column (prefer more specific names)
  const nameColumn = keys.find((k) => {
    const lower = k.toLowerCase();
    return (
      lower === "site_name" ||
      lower === "institution_name" ||
      lower === "name" ||
      lower === "title"
    );
  });

  // Find label column (like profession, component, type)
  const labelColumn = keys.find((k) => {
    const lower = k.toLowerCase();
    return (
      lower === "profession" ||
      lower === "component" ||
      lower === "type" ||
      lower === "category"
    );
  });

  // Extract map points
  const mapPoints: MapPoint[] = [];

  for (const row of results) {
    const lat = parseFloat(String(row[latColumn]));
    const lng = parseFloat(String(row[lngColumn]));

    // Skip invalid coordinates
    if (isNaN(lat) || isNaN(lng)) {
      continue;
    }

    // Skip coordinates that are clearly invalid (outside valid ranges)
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      continue;
    }

    const point: MapPoint = {
      lat,
      lng,
      name: nameColumn ? String(row[nameColumn] || "Unknown") : "Location",
    };

    // Add label if available
    if (labelColumn && row[labelColumn]) {
      point.label = String(row[labelColumn]);
    }

    mapPoints.push(point);
  }

  // Limit to 500 points to prevent UI overload
  return mapPoints.slice(0, 500);
}

/**
 * Extract table-ready results from query results
 * Converts raw query results to SearchResult format for DataTable display
 */
export function extractTableResults(results: Record<string, unknown>[]): SearchResult[] {
  if (!results || !Array.isArray(results) || results.length === 0) {
    return [];
  }

  const sample = results[0];
  const keys = Object.keys(sample);

  // Find ID column
  const idColumn = keys.find((k) => {
    const lower = k.toLowerCase();
    return lower === "id" || lower === "site_id" || lower === "school_id";
  });

  // Find name column (prefer more specific names)
  const nameColumn = keys.find((k) => {
    const lower = k.toLowerCase();
    return (
      lower === "site_name" ||
      lower === "institution_name" ||
      lower === "name" ||
      lower === "title"
    );
  });

  // Find state column
  const stateColumn = keys.find((k) => {
    const lower = k.toLowerCase();
    return lower === "state" || lower === "state_code";
  });

  // Find latitude column
  const latColumn = keys.find((k) => {
    const lower = k.toLowerCase();
    return lower === "latitude" || lower === "lat";
  });

  // Find longitude column
  const lngColumn = keys.find((k) => {
    const lower = k.toLowerCase();
    return lower === "longitude" || lower === "lng" || lower === "long";
  });

  // Find layer_key column or infer from table hints
  const layerColumn = keys.find((k) => {
    const lower = k.toLowerCase();
    return lower === "layer_key" || lower === "source" || lower === "type";
  });

  // Extract table results
  const tableResults: SearchResult[] = [];
  let autoId = 1;

  for (const row of results) {
    // Get ID (use auto-increment if not found)
    const id = idColumn ? Number(row[idColumn]) || autoId++ : autoId++;

    // Get name (required)
    const name = nameColumn ? String(row[nameColumn] || "Unknown") : "Result";

    // Get state (default to empty string)
    const state = stateColumn ? String(row[stateColumn] || "") : "";

    // Get coordinates
    const latitude = latColumn ? parseFloat(String(row[latColumn])) : 0;
    const longitude = lngColumn ? parseFloat(String(row[lngColumn])) : 0;

    // Infer layer_key from data or use default
    let layer_key = "ai_results";
    if (layerColumn && row[layerColumn]) {
      const sourceValue = String(row[layerColumn]).toLowerCase();
      // Map common source values to layer keys
      if (sourceValue.includes("hrsa")) layer_key = "hrsa_sites";
      else if (sourceValue.includes("school") && !sourceValue.includes("post")) layer_key = "schools";
      else if (sourceValue.includes("post") || sourceValue.includes("secondary")) layer_key = "post_secondary_schools";
      else if (sourceValue.includes("military")) layer_key = "military_sites";
      else if (sourceValue.includes("native") || sourceValue.includes("reserve")) layer_key = "native_american_reserves";
      else layer_key = sourceValue;
    }

    tableResults.push({
      id,
      name,
      layer_key,
      state,
      latitude: isNaN(latitude) ? 0 : latitude,
      longitude: isNaN(longitude) ? 0 : longitude,
    });
  }

  // Limit to 500 results to prevent UI overload
  return tableResults.slice(0, 500);
}

/**
 * Add LIMIT clause to query if not present
 */
export function ensureLimit(sql: string, maxLimit: number = 500): string {
  const normalized = sql.trim().toUpperCase();

  // If already has LIMIT, return as-is
  if (normalized.includes("LIMIT")) {
    return sql;
  }

  // Add LIMIT at the end (before any trailing semicolon)
  const trimmed = sql.trim().replace(/;$/, "");
  return `${trimmed} LIMIT ${maxLimit}`;
}
