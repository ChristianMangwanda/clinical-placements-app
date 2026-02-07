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

// HRSA clinical sites
export interface HrsaSite {
  id: number;
  site_name: string;
  state: string;
  longitude: number;
  latitude: number;
  source: string;
  created_at: Date;
  updated_at: Date;
}

// Schools with PT/OT/PA programs
export type Profession = "PT" | "OT" | "PA";

export interface School {
  id: number;
  program_row_id: number;
  institution_name: string;
  campus_name: string | null;
  state: string;
  profession: Profession;
  program_name: string;
  accreditation_body: string;
  accreditation_status: string;
  address: string;
  longitude: number;
  latitude: number;
  source: string;
  created_at: Date;
  updated_at: Date;
}

// Post-secondary schools (all institutions)
export interface PostSecondarySchool {
  id: number;
  original_id: number;
  institution_name: string;
  state: string;
  latitude: number;
  longitude: number;
  source: string;
  created_at: Date;
  updated_at: Date;
}

// Military installations
export interface MilitarySite {
  id: number;
  name: string;
  state: string;
  component: string;
  longitude: number;
  latitude: number;
  source: string;
  created_at: Date;
  updated_at: Date;
}

// Native American reserves
export interface NativeAmericanReserve {
  id: number;
  name: string;
  state: string;
  latitude: number;
  longitude: number;
  source: string;
  created_at: Date;
  updated_at: Date;
}

// Coordinator notes/annotations
export interface Note {
  id: number;
  layer_key: string | null;
  entity_id: number | null;
  state: string | null;
  note_text: string;
  author: string | null;
  created_at: Date;
  updated_at: Date;
}

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

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Chat message types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  timestamp: Date;
}

// Filter state
export interface FilterState {
  state: string | null;
  profession: Profession | null;
  accreditationStatus: string | null;
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

// State summary statistics
export interface StateSummary {
  state: string;
  hrsa_count: number;
  school_count: number;
  post_secondary_count: number;
  military_count: number;
  native_american_count: number;
  total_count: number;
}

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
