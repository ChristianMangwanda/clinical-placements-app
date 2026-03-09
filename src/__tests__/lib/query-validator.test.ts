/**
 * SQL Validation Tests
 * Security-critical: ensures only read-only queries are executed
 */

import { isReadOnlyQuery, ensureLimit, extractMapPoints, extractTableResults } from '@/lib/query-validator';

describe('isReadOnlyQuery', () => {
  describe('allows valid SELECT queries', () => {
    it('allows simple SELECT', () => {
      expect(isReadOnlyQuery('SELECT * FROM hrsa_sites LIMIT 10')).toBe(true);
    });

    it('allows SELECT with WHERE clause', () => {
      expect(isReadOnlyQuery('SELECT * FROM hrsa_sites WHERE state = \'NY\'')).toBe(true);
    });

    it('allows SELECT with JOINs', () => {
      expect(isReadOnlyQuery('SELECT a.*, b.name FROM hrsa_sites a JOIN schools b ON a.state = b.state')).toBe(true);
    });

    it('allows SELECT with aggregations', () => {
      expect(isReadOnlyQuery('SELECT state, COUNT(*) FROM hrsa_sites GROUP BY state')).toBe(true);
    });

    it('allows WITH (CTE) queries', () => {
      expect(isReadOnlyQuery('WITH cte AS (SELECT * FROM hrsa_sites) SELECT * FROM cte')).toBe(true);
    });

    it('allows lowercase select', () => {
      expect(isReadOnlyQuery('select * from hrsa_sites')).toBe(true);
    });

    it('allows mixed case select', () => {
      expect(isReadOnlyQuery('Select * From hrsa_sites Where state = \'NY\'')).toBe(true);
    });
  });

  describe('blocks dangerous DML keywords', () => {
    it('blocks INSERT', () => {
      expect(isReadOnlyQuery('INSERT INTO hrsa_sites VALUES (1, \'test\')')).toBe(false);
    });

    it('blocks UPDATE', () => {
      expect(isReadOnlyQuery('UPDATE hrsa_sites SET state = \'XX\'')).toBe(false);
    });

    it('blocks DELETE', () => {
      expect(isReadOnlyQuery('DELETE FROM hrsa_sites')).toBe(false);
    });

    it('blocks DELETE with WHERE', () => {
      expect(isReadOnlyQuery('DELETE FROM hrsa_sites WHERE id = 1')).toBe(false);
    });
  });

  describe('blocks dangerous DDL keywords', () => {
    it('blocks DROP TABLE', () => {
      expect(isReadOnlyQuery('DROP TABLE hrsa_sites')).toBe(false);
    });

    it('blocks DROP DATABASE', () => {
      expect(isReadOnlyQuery('DROP DATABASE clinical')).toBe(false);
    });

    it('blocks ALTER TABLE', () => {
      expect(isReadOnlyQuery('ALTER TABLE hrsa_sites ADD COLUMN foo TEXT')).toBe(false);
    });

    it('blocks CREATE TABLE', () => {
      expect(isReadOnlyQuery('CREATE TABLE new_table (id INT)')).toBe(false);
    });

    it('blocks TRUNCATE', () => {
      expect(isReadOnlyQuery('TRUNCATE TABLE hrsa_sites')).toBe(false);
    });
  });

  describe('blocks privilege keywords', () => {
    it('blocks GRANT', () => {
      expect(isReadOnlyQuery('GRANT SELECT ON hrsa_sites TO public')).toBe(false);
    });

    it('blocks REVOKE', () => {
      expect(isReadOnlyQuery('REVOKE SELECT ON hrsa_sites FROM public')).toBe(false);
    });
  });

  describe('blocks execution keywords', () => {
    it('blocks EXEC', () => {
      expect(isReadOnlyQuery('EXEC sp_help')).toBe(false);
    });

    it('blocks EXECUTE', () => {
      expect(isReadOnlyQuery('EXECUTE sp_help')).toBe(false);
    });

    it('blocks CALL', () => {
      expect(isReadOnlyQuery('CALL some_procedure()')).toBe(false);
    });
  });

  describe('blocks SQL injection patterns', () => {
    it('blocks queries with -- comments', () => {
      expect(isReadOnlyQuery('SELECT * FROM hrsa_sites -- DROP TABLE')).toBe(false);
    });

    it('blocks queries with /* */ comments', () => {
      expect(isReadOnlyQuery('SELECT * FROM hrsa_sites /* comment */')).toBe(false);
    });

    it('blocks multiple statements with semicolon', () => {
      expect(isReadOnlyQuery('SELECT * FROM hrsa_sites; DROP TABLE users')).toBe(false);
    });

    it('allows trailing semicolon (single statement)', () => {
      expect(isReadOnlyQuery('SELECT * FROM hrsa_sites;')).toBe(true);
    });
  });

  describe('blocks queries embedded in SELECT', () => {
    // Note: These may trigger false positives in legitimate column names
    // but that's acceptable for security purposes
    it('blocks SELECT with INSERT subquery attempt', () => {
      expect(isReadOnlyQuery('SELECT * FROM (INSERT INTO hrsa_sites VALUES (1))')).toBe(false);
    });

    it('blocks SELECT with DELETE in UNION', () => {
      expect(isReadOnlyQuery('SELECT * FROM hrsa_sites UNION DELETE FROM schools')).toBe(false);
    });
  });

  describe('handles edge cases', () => {
    it('returns false for empty string', () => {
      expect(isReadOnlyQuery('')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isReadOnlyQuery(null as unknown as string)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isReadOnlyQuery(undefined as unknown as string)).toBe(false);
    });

    it('returns false for non-string', () => {
      expect(isReadOnlyQuery(123 as unknown as string)).toBe(false);
    });

    it('returns false for whitespace only', () => {
      expect(isReadOnlyQuery('   ')).toBe(false);
    });
  });
});

describe('ensureLimit', () => {
  it('adds LIMIT if not present', () => {
    const result = ensureLimit('SELECT * FROM hrsa_sites', 100);
    expect(result).toBe('SELECT * FROM hrsa_sites LIMIT 100');
  });

  it('does not add LIMIT if already present', () => {
    const result = ensureLimit('SELECT * FROM hrsa_sites LIMIT 50', 100);
    expect(result).toBe('SELECT * FROM hrsa_sites LIMIT 50');
  });

  it('removes trailing semicolon before adding LIMIT', () => {
    const result = ensureLimit('SELECT * FROM hrsa_sites;', 100);
    expect(result).toBe('SELECT * FROM hrsa_sites LIMIT 100');
  });

  it('uses default limit of 500', () => {
    const result = ensureLimit('SELECT * FROM hrsa_sites');
    expect(result).toContain('LIMIT 500');
  });
});

describe('extractMapPoints', () => {
  it('extracts points with latitude/longitude columns', () => {
    const results = [
      { latitude: 40.7128, longitude: -74.006, site_name: 'NYC Hospital' },
      { latitude: 34.0522, longitude: -118.2437, site_name: 'LA Clinic' },
    ];
    const points = extractMapPoints(results);
    expect(points).toHaveLength(2);
    expect(points[0]).toEqual({
      lat: 40.7128,
      lng: -74.006,
      name: 'NYC Hospital',
    });
  });

  it('extracts points with lat/lng columns', () => {
    const results = [{ lat: 40.7128, lng: -74.006, name: 'Test Site' }];
    const points = extractMapPoints(results);
    expect(points).toHaveLength(1);
    expect(points[0].lat).toBe(40.7128);
  });

  it('returns empty array if no coordinate columns', () => {
    const results = [{ name: 'Test', state: 'NY' }];
    const points = extractMapPoints(results);
    expect(points).toHaveLength(0);
  });

  it('returns empty array for empty results', () => {
    expect(extractMapPoints([])).toHaveLength(0);
  });

  it('returns empty array for null/undefined', () => {
    expect(extractMapPoints(null as unknown as [])).toHaveLength(0);
    expect(extractMapPoints(undefined as unknown as [])).toHaveLength(0);
  });

  it('skips rows with invalid coordinates', () => {
    const results = [
      { latitude: 40.7128, longitude: -74.006, name: 'Valid' },
      { latitude: 'invalid', longitude: -74.006, name: 'Invalid lat' },
      { latitude: 200, longitude: -74.006, name: 'Out of range' },
    ];
    const points = extractMapPoints(results);
    expect(points).toHaveLength(1);
    expect(points[0].name).toBe('Valid');
  });

  it('limits to 500 points', () => {
    const results = Array.from({ length: 600 }, (_, i) => ({
      latitude: 40 + i * 0.001,
      longitude: -74,
      name: `Site ${i}`,
    }));
    const points = extractMapPoints(results);
    expect(points).toHaveLength(500);
  });
});

describe('extractTableResults', () => {
  it('extracts table results with all columns', () => {
    const results = [
      { id: 1, site_name: 'Hospital', state: 'NY', latitude: 40.7, longitude: -74 },
    ];
    const tableResults = extractTableResults(results);
    expect(tableResults).toHaveLength(1);
    expect(tableResults[0]).toMatchObject({
      id: 1,
      name: 'Hospital',
      state: 'NY',
      latitude: 40.7,
      longitude: -74,
    });
  });

  it('returns empty array for empty results', () => {
    expect(extractTableResults([])).toHaveLength(0);
  });

  it('auto-generates IDs if not present', () => {
    const results = [{ name: 'Test1' }, { name: 'Test2' }];
    const tableResults = extractTableResults(results);
    expect(tableResults[0].id).toBe(1);
    expect(tableResults[1].id).toBe(2);
  });

  it('limits to 500 results', () => {
    const results = Array.from({ length: 600 }, (_, i) => ({ name: `Site ${i}` }));
    const tableResults = extractTableResults(results);
    expect(tableResults).toHaveLength(500);
  });
});
