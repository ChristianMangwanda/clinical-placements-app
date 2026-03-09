/**
 * Geographic Utilities Tests
 * Tests Haversine distance calculations and radius bucketing logic
 */

import {
  haversineDistanceMiles,
  milesToMeters,
  getDistanceRing,
  bucketSitesByDistance,
  RADIUS_CONFIG,
} from '@/lib/geo-utils';

describe('haversineDistanceMiles', () => {
  describe('calculates known distances correctly', () => {
    it('returns 0 for same point', () => {
      const dist = haversineDistanceMiles(44.66, -74.98, 44.66, -74.98);
      expect(dist).toBe(0);
    });

    it('calculates NYC to LA (~2,451 miles)', () => {
      // NYC: 40.7128, -74.0060
      // LA: 34.0522, -118.2437
      const dist = haversineDistanceMiles(40.7128, -74.006, 34.0522, -118.2437);
      expect(dist).toBeGreaterThan(2400);
      expect(dist).toBeLessThan(2500);
    });

    it('calculates Potsdam, NY to Canton, NY (~10 miles)', () => {
      // Potsdam: 44.6697, -74.9813
      // Canton: 44.5959, -75.1693
      const dist = haversineDistanceMiles(44.6697, -74.9813, 44.5959, -75.1693);
      expect(dist).toBeGreaterThan(8);
      expect(dist).toBeLessThan(15);
    });

    it('calculates NYC to Boston (~190 miles)', () => {
      // NYC: 40.7128, -74.0060
      // Boston: 42.3601, -71.0589
      const dist = haversineDistanceMiles(40.7128, -74.006, 42.3601, -71.0589);
      expect(dist).toBeGreaterThan(180);
      expect(dist).toBeLessThan(220);
    });

    it('calculates short distance Albany to Schenectady (~15 miles)', () => {
      // Albany: 42.6526, -73.7562
      // Schenectady: 42.8142, -73.9396
      const dist = haversineDistanceMiles(42.6526, -73.7562, 42.8142, -73.9396);
      expect(dist).toBeGreaterThan(10);
      expect(dist).toBeLessThan(20);
    });
  });

  describe('handles edge cases', () => {
    it('is symmetric (A to B = B to A)', () => {
      const ab = haversineDistanceMiles(40.7128, -74.006, 34.0522, -118.2437);
      const ba = haversineDistanceMiles(34.0522, -118.2437, 40.7128, -74.006);
      expect(ab).toBeCloseTo(ba, 10);
    });

    it('handles equator crossing', () => {
      // Miami: 25.7617, -80.1918
      // Bogota: 4.7110, -74.0721
      const dist = haversineDistanceMiles(25.7617, -80.1918, 4.711, -74.0721);
      expect(dist).toBeGreaterThan(1400);
      expect(dist).toBeLessThan(1600);
    });

    it('handles international date line', () => {
      // Tokyo: 35.6762, 139.6503
      // Honolulu: 21.3069, -157.8583
      const dist = haversineDistanceMiles(35.6762, 139.6503, 21.3069, -157.8583);
      expect(dist).toBeGreaterThan(3500);
      expect(dist).toBeLessThan(4000);
    });
  });
});

describe('milesToMeters', () => {
  it('converts 1 mile to ~1609 meters', () => {
    expect(milesToMeters(1)).toBeCloseTo(1609.344, 2);
  });

  it('converts 0 miles to 0 meters', () => {
    expect(milesToMeters(0)).toBe(0);
  });

  it('converts 10 miles to ~16093 meters', () => {
    expect(milesToMeters(10)).toBeCloseTo(16093.44, 1);
  });
});

describe('getDistanceRing', () => {
  it('returns 30 min ring for distances <= 20 miles', () => {
    const ring = getDistanceRing(15);
    expect(ring).not.toBeNull();
    expect(ring?.minutes).toBe(30);
  });

  it('returns 30 min ring for exactly 20 miles', () => {
    const ring = getDistanceRing(20);
    expect(ring?.minutes).toBe(30);
  });

  it('returns 60 min ring for distances 21-45 miles', () => {
    const ring = getDistanceRing(30);
    expect(ring?.minutes).toBe(60);
  });

  it('returns 90 min ring for distances 46-70 miles', () => {
    const ring = getDistanceRing(50);
    expect(ring?.minutes).toBe(90);
  });

  it('returns null for distances > 70 miles', () => {
    const ring = getDistanceRing(100);
    expect(ring).toBeNull();
  });
});

describe('RADIUS_CONFIG', () => {
  it('has correct 30 minute configuration', () => {
    const ring30 = RADIUS_CONFIG[0];
    expect(ring30.minutes).toBe(30);
    expect(ring30.miles).toBe(20);
    expect(ring30.color).toBe('#27AE60');
  });

  it('has correct 60 minute configuration', () => {
    const ring60 = RADIUS_CONFIG[1];
    expect(ring60.minutes).toBe(60);
    expect(ring60.miles).toBe(45);
    expect(ring60.color).toBe('#FAC922');
  });

  it('has correct 90 minute configuration', () => {
    const ring90 = RADIUS_CONFIG[2];
    expect(ring90.minutes).toBe(90);
    expect(ring90.miles).toBe(70);
    expect(ring90.color).toBe('#CCCCCC');
  });

  it('has exactly 3 rings', () => {
    expect(RADIUS_CONFIG).toHaveLength(3);
  });
});

describe('bucketSitesByDistance', () => {
  const testSites = [
    { id: 1, name: 'Very Close', layer_key: 'hrsa', lat: 40.72, lng: -74.01 },
    { id: 2, name: 'Close', layer_key: 'hrsa', lat: 40.9, lng: -74.2 },
    { id: 3, name: 'Medium', layer_key: 'hrsa', lat: 41.3, lng: -74.8 },
    { id: 4, name: 'Far', layer_key: 'hrsa', lat: 42.5, lng: -76 },
  ];

  // Origin: NYC (40.7128, -74.0060)
  const originLat = 40.7128;
  const originLng = -74.006;

  it('buckets sites into correct distance rings', () => {
    const buckets = bucketSitesByDistance(testSites, originLat, originLng);

    // Very Close (~1 mile) should be in within30
    expect(buckets.within30.some((s) => s.id === 1)).toBe(true);

    // Far (~140 miles) should be in beyond
    expect(buckets.beyond.some((s) => s.id === 4)).toBe(true);
  });

  it('returns empty buckets for empty sites array', () => {
    const buckets = bucketSitesByDistance([], originLat, originLng);
    expect(buckets.within30).toHaveLength(0);
    expect(buckets.within60).toHaveLength(0);
    expect(buckets.within90).toHaveLength(0);
    expect(buckets.beyond).toHaveLength(0);
  });

  it('sorts sites within each bucket by distance', () => {
    const sites = [
      { id: 1, name: 'Far', layer_key: 'test', lat: 40.75, lng: -74.1 },
      { id: 2, name: 'Close', layer_key: 'test', lat: 40.715, lng: -74.01 },
      { id: 3, name: 'Medium', layer_key: 'test', lat: 40.73, lng: -74.05 },
    ];

    const buckets = bucketSitesByDistance(sites, originLat, originLng);

    // All should be in within30 (< 20 miles)
    // Should be sorted by distance ascending
    if (buckets.within30.length >= 2) {
      expect(buckets.within30[0].distanceMiles).toBeLessThanOrEqual(
        buckets.within30[1].distanceMiles
      );
    }
  });

  it('includes distance in output', () => {
    const buckets = bucketSitesByDistance(testSites, originLat, originLng);

    // Check that distanceMiles is populated
    const allSites = [
      ...buckets.within30,
      ...buckets.within60,
      ...buckets.within90,
      ...buckets.beyond,
    ];

    for (const site of allSites) {
      expect(typeof site.distanceMiles).toBe('number');
      expect(site.distanceMiles).toBeGreaterThanOrEqual(0);
    }
  });
});
