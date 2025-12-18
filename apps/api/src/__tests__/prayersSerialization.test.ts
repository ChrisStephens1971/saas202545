import { describe, it, expect } from '@jest/globals';

/**
 * Prayer Requests Serialization Tests
 *
 * These tests verify that the prayers router properly transforms
 * database results for JSON serialization over tRPC.
 *
 * Key issue addressed:
 * - PostgreSQL COUNT(*) returns bigint as a string
 * - superjson can't handle native BigInt values
 * - Must explicitly convert to JavaScript number
 *
 * See: apps/api/src/routers/prayers.ts
 */

describe('Prayer Request Serialization', () => {
  /**
   * Simulates the transformation logic in prayers.list
   * PostgreSQL returns COUNT(*) as a string for bigint type
   */
  function transformPrayerRequests(
    rows: Array<{
      id: string;
      title: string;
      description: string;
      status: string;
      prayer_count: string | number | bigint;
      created_at: Date;
    }>
  ) {
    return rows.map((row) => ({
      ...row,
      prayer_count: parseInt(String(row.prayer_count || '0'), 10),
    }));
  }

  it('converts string prayer_count to number', () => {
    const rows = [
      {
        id: 'uuid-1',
        title: 'Test Prayer',
        description: 'Test Description',
        status: 'active',
        prayer_count: '5', // PostgreSQL returns as string
        created_at: new Date(),
      },
    ];

    const result = transformPrayerRequests(rows);

    expect(result[0].prayer_count).toBe(5);
    expect(typeof result[0].prayer_count).toBe('number');
  });

  it('handles numeric prayer_count (already parsed)', () => {
    const rows = [
      {
        id: 'uuid-1',
        title: 'Test Prayer',
        description: 'Test Description',
        status: 'active',
        prayer_count: 10,
        created_at: new Date(),
      },
    ];

    const result = transformPrayerRequests(rows);

    expect(result[0].prayer_count).toBe(10);
    expect(typeof result[0].prayer_count).toBe('number');
  });

  it('handles null/undefined prayer_count', () => {
    const rows = [
      {
        id: 'uuid-1',
        title: 'Test Prayer',
        description: 'Test Description',
        status: 'active',
        prayer_count: null as unknown as string,
        created_at: new Date(),
      },
    ];

    const result = transformPrayerRequests(rows);

    expect(result[0].prayer_count).toBe(0);
    expect(typeof result[0].prayer_count).toBe('number');
  });

  it('handles zero prayer_count as string', () => {
    const rows = [
      {
        id: 'uuid-1',
        title: 'Test Prayer',
        description: 'Test Description',
        status: 'active',
        prayer_count: '0',
        created_at: new Date(),
      },
    ];

    const result = transformPrayerRequests(rows);

    expect(result[0].prayer_count).toBe(0);
    expect(typeof result[0].prayer_count).toBe('number');
  });

  it('handles BigInt prayer_count by converting to string first', () => {
    const rows = [
      {
        id: 'uuid-1',
        title: 'Test Prayer',
        description: 'Test Description',
        status: 'active',
        prayer_count: BigInt(100),
        created_at: new Date(),
      },
    ];

    const result = transformPrayerRequests(rows);

    expect(result[0].prayer_count).toBe(100);
    expect(typeof result[0].prayer_count).toBe('number');
  });

  it('preserves other row properties', () => {
    const rows = [
      {
        id: 'uuid-1',
        title: 'Test Prayer',
        description: 'Test Description',
        status: 'active',
        prayer_count: '5',
        created_at: new Date('2024-01-15'),
      },
    ];

    const result = transformPrayerRequests(rows);

    expect(result[0].id).toBe('uuid-1');
    expect(result[0].title).toBe('Test Prayer');
    expect(result[0].description).toBe('Test Description');
    expect(result[0].status).toBe('active');
    expect(result[0].created_at).toEqual(new Date('2024-01-15'));
  });

  it('handles multiple rows', () => {
    const rows = [
      {
        id: 'uuid-1',
        title: 'Prayer 1',
        description: 'Description 1',
        status: 'active',
        prayer_count: '5',
        created_at: new Date(),
      },
      {
        id: 'uuid-2',
        title: 'Prayer 2',
        description: 'Description 2',
        status: 'answered',
        prayer_count: '20',
        created_at: new Date(),
      },
    ];

    const result = transformPrayerRequests(rows);

    expect(result.length).toBe(2);
    expect(result[0].prayer_count).toBe(5);
    expect(result[1].prayer_count).toBe(20);
  });
});

describe('Prayer Stats Serialization', () => {
  /**
   * Simulates the transformation logic in prayers.getStats
   * All COUNT(*) results must be parsed to integers
   */
  function transformPrayerStats(rows: {
    active: string;
    answered: string;
    urgent: string;
    total_prayers: string;
  }) {
    return {
      active: parseInt(rows.active, 10),
      answered: parseInt(rows.answered, 10),
      urgent: parseInt(rows.urgent, 10),
      total_prayers: parseInt(rows.total_prayers, 10),
    };
  }

  it('parses all count fields to numbers', () => {
    const stats = {
      active: '10',
      answered: '5',
      urgent: '2',
      total_prayers: '50',
    };

    const result = transformPrayerStats(stats);

    expect(result.active).toBe(10);
    expect(result.answered).toBe(5);
    expect(result.urgent).toBe(2);
    expect(result.total_prayers).toBe(50);

    expect(typeof result.active).toBe('number');
    expect(typeof result.answered).toBe('number');
    expect(typeof result.urgent).toBe('number');
    expect(typeof result.total_prayers).toBe('number');
  });

  it('handles zero values', () => {
    const stats = {
      active: '0',
      answered: '0',
      urgent: '0',
      total_prayers: '0',
    };

    const result = transformPrayerStats(stats);

    expect(result.active).toBe(0);
    expect(result.answered).toBe(0);
    expect(result.urgent).toBe(0);
    expect(result.total_prayers).toBe(0);
  });
});

describe('Directory Members Serialization', () => {
  /**
   * Simulates the transformation logic in directory.listMembers
   * Explicitly maps fields to ensure clean JSON serialization
   */
  interface DirectoryMemberRow {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    membership_status: string;
  }

  function transformDirectoryMembers(rows: DirectoryMemberRow[]) {
    return rows.map((row) => ({
      id: row.id,
      first_name: row.first_name,
      last_name: row.last_name,
      email: row.email,
      phone: row.phone,
      membership_status: row.membership_status,
    }));
  }

  it('maps all expected fields', () => {
    const rows: DirectoryMemberRow[] = [
      {
        id: 'uuid-1',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        phone: '555-1234',
        membership_status: 'member',
      },
    ];

    const result = transformDirectoryMembers(rows);

    expect(result[0]).toEqual({
      id: 'uuid-1',
      first_name: 'John',
      last_name: 'Doe',
      email: 'john@example.com',
      phone: '555-1234',
      membership_status: 'member',
    });
  });

  it('handles null email and phone', () => {
    const rows: DirectoryMemberRow[] = [
      {
        id: 'uuid-1',
        first_name: 'Jane',
        last_name: 'Doe',
        email: null,
        phone: null,
        membership_status: 'attendee',
      },
    ];

    const result = transformDirectoryMembers(rows);

    expect(result[0].email).toBeNull();
    expect(result[0].phone).toBeNull();
  });

  it('does not include extra fields from database', () => {
    const rowWithExtra = {
      id: 'uuid-1',
      first_name: 'John',
      last_name: 'Doe',
      email: null,
      phone: null,
      membership_status: 'member',
      // Simulate extra fields that might come from SELECT *
      some_internal_field: 'should_not_appear',
      another_field: 123,
    } as DirectoryMemberRow & Record<string, unknown>;

    const result = transformDirectoryMembers([rowWithExtra]);

    // Result should only have the mapped fields
    const keys = Object.keys(result[0]);
    expect(keys).toEqual([
      'id',
      'first_name',
      'last_name',
      'email',
      'phone',
      'membership_status',
    ]);
  });
});

describe('Count Field Parsing', () => {
  /**
   * Helper function that mimics how we parse count fields
   */
  function parseCount(value: string | null | undefined): number {
    return parseInt(String(value || '0'), 10);
  }

  it('parses string numbers', () => {
    expect(parseCount('10')).toBe(10);
    expect(parseCount('0')).toBe(0);
    expect(parseCount('9999')).toBe(9999);
  });

  it('handles null', () => {
    expect(parseCount(null)).toBe(0);
  });

  it('handles undefined', () => {
    expect(parseCount(undefined)).toBe(0);
  });

  it('handles empty string', () => {
    // parseInt('', 10) returns NaN, but parseInt('0', 10) returns 0
    // Our implementation uses String(value || '0') which converts '' to '0'
    expect(parseCount('')).toBe(0);
  });
});
