import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import type { Layer } from "@/lib/types";

export async function GET() {
  try {
    const layers = await query<Layer>(
      "SELECT * FROM `layers` ORDER BY `sort_order` ASC"
    );

    // Convert tinyint to boolean for default_visible
    const formattedLayers = layers.map((layer) => ({
      ...layer,
      default_visible: Boolean(layer.default_visible),
    }));

    return NextResponse.json({
      success: true,
      data: formattedLayers,
    });
  } catch (error) {
    console.error("Error fetching layers:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch layers",
      },
      { status: 500 }
    );
  }
}
