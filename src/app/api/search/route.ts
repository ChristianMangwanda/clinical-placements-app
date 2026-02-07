import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { SearchResult } from "@/lib/types";

const MAX_RESULTS = 50;

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const searchQuery = searchParams.get("q");
    const layersParam = searchParams.get("layers");

    if (!searchQuery || searchQuery.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Search query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const searchTerm = `%${searchQuery.trim()}%`;

    // Determine which layers to search
    const layersToSearch = layersParam
      ? layersParam.split(",").filter(Boolean)
      : ["hrsa_sites", "schools", "post_secondary_schools", "military_sites", "native_american_reserves"];

    const results: SearchResult[] = [];

    // Search each layer
    for (const layer of layersToSearch) {
      const layerResults = await searchLayer(layer, searchTerm);
      results.push(...layerResults);

      // Stop early if we have enough results
      if (results.length >= MAX_RESULTS) {
        break;
      }
    }

    // Sort by relevance (exact matches first, then alphabetically)
    const sortedResults = results
      .sort((a, b) => {
        const aExact = a.name.toLowerCase().startsWith(searchQuery.toLowerCase());
        const bExact = b.name.toLowerCase().startsWith(searchQuery.toLowerCase());
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, MAX_RESULTS);

    return NextResponse.json({
      success: true,
      data: sortedResults,
      meta: {
        count: sortedResults.length,
        query: searchQuery,
      },
    });
  } catch (error) {
    console.error("Error searching:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Search failed",
      },
      { status: 500 }
    );
  }
}

async function searchLayer(layerKey: string, searchTerm: string): Promise<SearchResult[]> {
  let sql = "";
  const params = [searchTerm];

  switch (layerKey) {
    case "hrsa_sites":
      sql = `
        SELECT id, site_name as name, 'hrsa_sites' as layer_key, state, latitude, longitude
        FROM \`hrsa_sites\`
        WHERE site_name LIKE ?
        LIMIT 20
      `;
      break;

    case "schools":
      sql = `
        SELECT id, institution_name as name, 'schools' as layer_key, state, latitude, longitude
        FROM \`schools\`
        WHERE institution_name LIKE ? OR program_name LIKE ?
        LIMIT 20
      `;
      params.push(searchTerm);
      break;

    case "post_secondary_schools":
      sql = `
        SELECT id, institution_name as name, 'post_secondary_schools' as layer_key, state, latitude, longitude
        FROM \`post_secondary_schools\`
        WHERE institution_name LIKE ?
        LIMIT 20
      `;
      break;

    case "military_sites":
      sql = `
        SELECT id, name, 'military_sites' as layer_key, state, latitude, longitude
        FROM \`military_sites\`
        WHERE name LIKE ?
        LIMIT 20
      `;
      break;

    case "native_american_reserves":
      sql = `
        SELECT id, name, 'native_american_reserves' as layer_key, state, latitude, longitude
        FROM \`native_american_reserves\`
        WHERE name LIKE ?
        LIMIT 20
      `;
      break;

    default:
      return [];
  }

  try {
    return await query<SearchResult>(sql, params);
  } catch (error) {
    console.error(`Error searching layer ${layerKey}:`, error);
    return [];
  }
}
