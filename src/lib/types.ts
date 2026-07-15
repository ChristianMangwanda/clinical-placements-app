// Layer metadata from the `layers` table
export interface Layer {
  id: number;
  layer_key: string;
  display_name: string;
  table_name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  default_visible: boolean;
  sort_order: number;
  created_at: Date;
}

// PT/OT/PA programs. See docs/DATABASE.md for the full table schemas —
// the API routes declare their own row shapes for the columns they select.
export type Profession = "PT" | "OT" | "PA";

// GeoJSON types for map data
export interface GeoJSONPoint {
  type: "Point";
  coordinates: [number, number]; // [longitude, latitude]
}

export interface GeoJSONFeature<T = Record<string, unknown>> {
  type: "Feature";
  geometry: GeoJSONPoint;
  properties: T & {
    id: number;
    name: string;
    layer_key: string;
  };
}

export interface GeoJSONFeatureCollection<T = Record<string, unknown>> {
  type: "FeatureCollection";
  features: GeoJSONFeature<T>[];
}

// Map bounds for viewport-based loading
export interface MapBounds {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

// Map point for AI query result highlights
export interface MapPoint {
  lat: number;
  lng: number;
  name: string;
  label?: string;
  layer?: string;
}

// Chat message types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  mapPoints?: MapPoint[];
  rowCount?: number;
  timestamp: Date;
}

// Layer visibility state
export type LayerVisibility = Record<string, boolean>;

// Search result
export interface SearchResult {
  id: number;
  name: string;
  layer_key: string;
  state: string;
  latitude: number;
  longitude: number;
}

// HRSA Site Categories for filter dropdown
export const SITE_CATEGORIES: Record<string, string> = {
  "Hospital": "Hospital",
  "Community Health Center": "Community Health Center",
  "Federally Qualified Health Center": "FQHC",
  "Rural Health Clinic": "Rural Health Clinic",
  "Skilled Nursing Facility": "Skilled Nursing",
  "Ambulatory Surgical Center": "Ambulatory Surgery",
  "Home Health Agency": "Home Health",
  "School-Based Health Center": "School-Based",
  "Migrant Health Center": "Migrant Health",
  "Homeless Health Center": "Homeless Health",
  "Indian Health Service": "Indian Health",
  "Public Housing Primary Care": "Public Housing",
};

// US States for filter dropdown
export const US_STATES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "District of Columbia",
  PR: "Puerto Rico",
  VI: "Virgin Islands",
  GU: "Guam",
  AS: "American Samoa",
  MP: "Northern Mariana Islands",
};
