/**
 * Geographic utilities for distance calculations.
 * Uses the Haversine formula for straight-line distance between coordinates.
 */

/**
 * Radius configuration for drive-time estimates.
 * These are conservative estimates using straight-line distance.
 */
export const RADIUS_CONFIG = [
  { minutes: 30, miles: 20, km: 32, color: '#27AE60', label: '30 min' },
  { minutes: 60, miles: 45, km: 72, color: '#FAC922', label: '60 min' },
  { minutes: 90, miles: 70, km: 113, color: '#CCCCCC', label: '90 min' },
] as const;

/**
 * Convert degrees to radians.
 */
function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Calculate straight-line distance between two coordinates in miles.
 * Uses the Haversine formula.
 */
export function haversineDistanceMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Convert miles to meters (for Leaflet circle radius).
 */
export function milesToMeters(miles: number): number {
  return miles * 1609.344;
}

/**
 * Bucket sites by distance rings.
 */
export interface SiteWithDistance {
  id: number;
  name: string;
  layer_key: string;
  lat: number;
  lng: number;
  distanceMiles: number;
}

export interface RadiusBuckets {
  within30: SiteWithDistance[];
  within60: SiteWithDistance[];
  within90: SiteWithDistance[];
  beyond: SiteWithDistance[];
}

export function bucketSitesByDistance(
  sites: Array<{ id: number; name: string; layer_key: string; lat: number; lng: number }>,
  originLat: number,
  originLng: number
): RadiusBuckets {
  const buckets: RadiusBuckets = {
    within30: [],
    within60: [],
    within90: [],
    beyond: [],
  };

  for (const site of sites) {
    const distance = haversineDistanceMiles(originLat, originLng, site.lat, site.lng);
    const siteWithDistance: SiteWithDistance = {
      ...site,
      distanceMiles: distance,
    };

    if (distance <= 20) {
      buckets.within30.push(siteWithDistance);
    } else if (distance <= 45) {
      buckets.within60.push(siteWithDistance);
    } else if (distance <= 70) {
      buckets.within90.push(siteWithDistance);
    } else {
      buckets.beyond.push(siteWithDistance);
    }
  }

  // Sort each bucket by distance
  buckets.within30.sort((a, b) => a.distanceMiles - b.distanceMiles);
  buckets.within60.sort((a, b) => a.distanceMiles - b.distanceMiles);
  buckets.within90.sort((a, b) => a.distanceMiles - b.distanceMiles);
  buckets.beyond.sort((a, b) => a.distanceMiles - b.distanceMiles);

  return buckets;
}
