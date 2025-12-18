/**
 * Mapper Tests (Phase 2A)
 *
 * Tests the row-to-DTO mapping functions in mappers.ts.
 * Uses node environment - tests pure functions without DOM.
 *
 * @jest-environment node
 */

import { describe, it, expect } from '@jest/globals';
import type {
  BulletinIssueRow,
  ServiceItemRow,
  BulletinListItemDTO,
  BulletinDetailDTO,
  BulletinPublicDTO,
  BulletinCreateDTO,
  BulletinFromPreviousDTO,
  ServiceItemPublicDTO,
} from '../mappers';
import {
  mapBulletinToListItem,
  mapBulletinToDetail,
  mapBulletinToPublic,
  mapBulletinToCreateResponse,
  mapBulletinFromPrevious,
  mapServiceItemToPublic,
} from '../mappers';

// Test UUIDs
const uuid1 = '11111111-1111-1111-1111-111111111111';
const uuid2 = '22222222-2222-2222-2222-222222222222';

// ============================================================================
// TEST DATA FACTORIES
// ============================================================================

/**
 * Creates a full BulletinIssueRow for testing.
 */
function createBulletinRow(overrides: Partial<BulletinIssueRow> = {}): BulletinIssueRow {
  const now = new Date();
  return {
    id: uuid1,
    tenant_id: uuid2,
    issue_date: now,
    status: 'draft',
    brand_pack_id: null,
    pdf_url: null,
    pdf_large_print_url: null,
    slides_json: null,
    loop_mp4_url: null,
    email_html: null,
    propresenter_bundle_url: null,
    locked_at: null,
    locked_by: null,
    reopened_at: null,
    reopened_by: null,
    reopen_reason: null,
    content_hash: null,
    template_key: null,
    design_options: null,
    canvas_layout_json: null,
    use_canvas_layout: false,
    is_published: false,
    is_public: false,
    public_token: null,
    published_at: null,
    created_at: now,
    updated_at: now,
    deleted_at: null,
    ...overrides,
  };
}

/**
 * Creates a ServiceItemRow for testing.
 */
function createServiceItemRow(overrides: Partial<ServiceItemRow> = {}): ServiceItemRow {
  return {
    id: uuid1,
    item_type: 'song',
    title: 'Amazing Grace',
    description: 'Traditional hymn',
    order_index: 1,
    duration_minutes: 5,
    leader_name: 'John Doe',
    song_id: null,
    ccli_number: '4591782',
    scripture_reference: 'Ephesians 2:8-9',
    notes: 'Sing all verses',
    ...overrides,
  };
}

// ============================================================================
// BULLETIN MAPPER TESTS
// ============================================================================

describe('mapBulletinToListItem', () => {
  it('maps all required fields correctly', () => {
    const now = new Date();
    const row = createBulletinRow({
      id: uuid1,
      tenant_id: uuid2,
      issue_date: now,
      status: 'approved',
      brand_pack_id: 'brand-123',
      pdf_url: 'https://example.com/bulletin.pdf',
      locked_at: now,
      locked_by: 'user-123',
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });

    const result = mapBulletinToListItem(row);

    expect(result.id).toBe(uuid1);
    expect(result.tenantId).toBe(uuid2);
    expect(result.serviceDate).toBe(now);
    expect(result.status).toBe('approved');
    expect(result.brandPackId).toBe('brand-123');
    expect(result.pdfUrl).toBe('https://example.com/bulletin.pdf');
    expect(result.lockedAt).toBe(now);
    expect(result.lockedBy).toBe('user-123');
    expect(result.createdAt).toBe(now);
    expect(result.updatedAt).toBe(now);
    expect(result.deletedAt).toBeNull();
  });

  it('maps null fields correctly', () => {
    const row = createBulletinRow({
      brand_pack_id: null,
      pdf_url: null,
      locked_at: null,
      locked_by: null,
    });

    const result = mapBulletinToListItem(row);

    expect(result.brandPackId).toBeNull();
    expect(result.pdfUrl).toBeNull();
    expect(result.lockedAt).toBeNull();
    expect(result.lockedBy).toBeNull();
  });

  it('correctly renames issue_date to serviceDate', () => {
    const testDate = new Date('2024-03-15');
    const row = createBulletinRow({ issue_date: testDate });

    const result = mapBulletinToListItem(row);

    expect(result.serviceDate).toBe(testDate);
  });
});

describe('mapBulletinToDetail', () => {
  it('maps all detail fields correctly', () => {
    const designOptions = { theme: 'modern', color: 'blue' };
    const canvasLayout = { sections: [], header: {} };

    const row = createBulletinRow({
      pdf_large_print_url: 'https://example.com/large.pdf',
      slides_json: { slides: [] },
      content_hash: 'abc123',
      template_key: 'classic',
      design_options: designOptions,
      canvas_layout_json: canvasLayout,
      use_canvas_layout: true,
    });

    const result = mapBulletinToDetail(row);

    expect(result.pdfLargePrintUrl).toBe('https://example.com/large.pdf');
    expect(result.slidesJson).toEqual({ slides: [] });
    expect(result.contentHash).toBe('abc123');
    expect(result.templateKey).toBe('classic');
    expect(result.designOptions).toEqual(designOptions);
    expect(result.canvasLayoutJson).toEqual(canvasLayout);
    expect(result.useCanvasLayout).toBe(true);
  });

  it('excludes deletedAt from detail response', () => {
    const row = createBulletinRow({ deleted_at: new Date() });

    const result = mapBulletinToDetail(row);

    expect(result).not.toHaveProperty('deletedAt');
  });
});

describe('mapBulletinToPublic', () => {
  it('maps all public fields correctly', () => {
    const publishedAt = new Date();

    const row = createBulletinRow({
      is_published: true,
      is_public: true,
      published_at: publishedAt,
    });

    const result = mapBulletinToPublic(row);

    expect(result.isPublished).toBe(true);
    expect(result.isPublic).toBe(true);
    expect(result.publishedAt).toBe(publishedAt);
  });

  it('excludes lockedAt/lockedBy from public response', () => {
    const row = createBulletinRow({
      locked_at: new Date(),
      locked_by: 'user-123',
    });

    const result = mapBulletinToPublic(row);

    expect(result).not.toHaveProperty('lockedAt');
    expect(result).not.toHaveProperty('lockedBy');
  });
});

describe('mapBulletinToCreateResponse', () => {
  it('returns null for optional fields in create response', () => {
    const row = createBulletinRow({
      locked_at: new Date(),
      locked_by: 'user-123',
      pdf_url: 'https://example.com/bulletin.pdf',
    });

    const result = mapBulletinToCreateResponse(row);

    // These should always be null in create response
    expect(result.lockedAt).toBeNull();
    expect(result.lockedBy).toBeNull();
    expect(result.pdfUrl).toBeNull();
    expect(result.slidesUrl).toBeNull();
  });

  it('maps id and serviceDate correctly', () => {
    const testDate = new Date('2024-03-15');
    const row = createBulletinRow({
      id: uuid1,
      issue_date: testDate,
      status: 'draft',
    });

    const result = mapBulletinToCreateResponse(row);

    expect(result.id).toBe(uuid1);
    expect(result.serviceDate).toBe(testDate);
    expect(result.status).toBe('draft');
  });
});

describe('mapBulletinFromPrevious', () => {
  it('maps all fields needed for createFromPrevious response', () => {
    const designOptions = { theme: 'classic' };
    const row = createBulletinRow({
      brand_pack_id: 'brand-123',
      template_key: 'sunday-service',
      design_options: designOptions,
      use_canvas_layout: true,
    });

    const result = mapBulletinFromPrevious(row);

    expect(result.brandPackId).toBe('brand-123');
    expect(result.templateKey).toBe('sunday-service');
    expect(result.designOptions).toEqual(designOptions);
    expect(result.useCanvasLayout).toBe(true);
  });

  it('does not include fields not needed in response', () => {
    const row = createBulletinRow({
      pdf_url: 'https://example.com/bulletin.pdf',
      locked_at: new Date(),
      is_published: true,
    });

    const result = mapBulletinFromPrevious(row);

    expect(result).not.toHaveProperty('pdfUrl');
    expect(result).not.toHaveProperty('lockedAt');
    expect(result).not.toHaveProperty('isPublished');
  });
});

// ============================================================================
// SERVICE ITEM MAPPER TESTS
// ============================================================================

describe('mapServiceItemToPublic', () => {
  it('maps all service item fields correctly', () => {
    const row = createServiceItemRow({
      id: uuid1,
      item_type: 'song',
      title: 'Amazing Grace',
      description: 'Traditional hymn',
      order_index: 2,
      duration_minutes: 5,
      leader_name: 'John Doe',
      song_id: 'song-123',
      ccli_number: '4591782',
      scripture_reference: 'Ephesians 2:8-9',
      notes: 'Sing all verses',
    });

    const result = mapServiceItemToPublic(row);

    expect(result.id).toBe(uuid1);
    expect(result.itemType).toBe('song');
    expect(result.title).toBe('Amazing Grace');
    expect(result.description).toBe('Traditional hymn');
    expect(result.orderIndex).toBe(2);
    expect(result.durationMinutes).toBe(5);
    expect(result.speaker).toBe('John Doe'); // leader_name → speaker
    expect(result.songId).toBe('song-123');
    expect(result.ccliNumber).toBe('4591782');
    expect(result.scriptureText).toBe('Ephesians 2:8-9'); // scripture_reference → scriptureText
    expect(result.notes).toBe('Sing all verses');
  });

  it('renames leader_name to speaker', () => {
    const row = createServiceItemRow({
      leader_name: 'Pastor Smith',
    });

    const result = mapServiceItemToPublic(row);

    expect(result.speaker).toBe('Pastor Smith');
  });

  it('renames scripture_reference to scriptureText', () => {
    const row = createServiceItemRow({
      scripture_reference: 'John 3:16',
    });

    const result = mapServiceItemToPublic(row);

    expect(result.scriptureText).toBe('John 3:16');
  });

  it('handles null values correctly', () => {
    const row = createServiceItemRow({
      description: null,
      duration_minutes: null,
      leader_name: null,
      song_id: null,
      ccli_number: null,
      scripture_reference: null,
      notes: null,
    });

    const result = mapServiceItemToPublic(row);

    expect(result.description).toBeNull();
    expect(result.durationMinutes).toBeNull();
    expect(result.speaker).toBeNull();
    expect(result.songId).toBeNull();
    expect(result.ccliNumber).toBeNull();
    expect(result.scriptureText).toBeNull();
    expect(result.notes).toBeNull();
  });
});

// ============================================================================
// TYPE SAFETY TESTS
// ============================================================================

describe('Type safety', () => {
  it('mapBulletinToListItem returns BulletinListItemDTO type', () => {
    const row = createBulletinRow();
    const result: BulletinListItemDTO = mapBulletinToListItem(row);
    expect(result).toBeDefined();
  });

  it('mapBulletinToDetail returns BulletinDetailDTO type', () => {
    const row = createBulletinRow();
    const result: BulletinDetailDTO = mapBulletinToDetail(row);
    expect(result).toBeDefined();
  });

  it('mapBulletinToPublic returns BulletinPublicDTO type', () => {
    const row = createBulletinRow();
    const result: BulletinPublicDTO = mapBulletinToPublic(row);
    expect(result).toBeDefined();
  });

  it('mapBulletinToCreateResponse returns BulletinCreateDTO type', () => {
    const row = createBulletinRow();
    const result: BulletinCreateDTO = mapBulletinToCreateResponse(row);
    expect(result).toBeDefined();
  });

  it('mapBulletinFromPrevious returns BulletinFromPreviousDTO type', () => {
    const row = createBulletinRow();
    const result: BulletinFromPreviousDTO = mapBulletinFromPrevious(row);
    expect(result).toBeDefined();
  });

  it('mapServiceItemToPublic returns ServiceItemPublicDTO type', () => {
    const row = createServiceItemRow();
    const result: ServiceItemPublicDTO = mapServiceItemToPublic(row);
    expect(result).toBeDefined();
  });
});
