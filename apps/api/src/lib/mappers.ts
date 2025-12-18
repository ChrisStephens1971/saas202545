/**
 * Row Mapper Utilities (Phase 2A)
 *
 * Centralized row-to-DTO mapping functions for tRPC routers.
 * These mappers convert PostgreSQL snake_case rows to camelCase DTOs
 * for consistent API responses.
 *
 * IMPORTANT: When adding new mappers:
 * 1. Define the DB row interface (snake_case)
 * 2. Define the DTO interface (camelCase)
 * 3. Create a focused mapper function
 * 4. Export both interfaces and mapper
 *
 * @see docs/architecture/QUERY-PATTERNS.md
 */

// ============================================================================
// BULLETIN ISSUE MAPPERS
// ============================================================================

/**
 * Database row type for bulletin_issue table.
 * This matches the PostgreSQL column names (snake_case).
 */
export interface BulletinIssueRow {
  id: string;
  tenant_id: string;
  issue_date: Date;
  status: 'draft' | 'approved' | 'built' | 'locked' | 'deleted';
  brand_pack_id: string | null;
  pdf_url: string | null;
  pdf_large_print_url: string | null;
  slides_json: unknown | null;
  loop_mp4_url: string | null;
  email_html: string | null;
  propresenter_bundle_url: string | null;
  locked_at: Date | null;
  locked_by: string | null;
  reopened_at: Date | null;
  reopened_by: string | null;
  reopen_reason: string | null;
  content_hash: string | null;
  template_key: string | null;
  design_options: Record<string, unknown> | null;
  canvas_layout_json: Record<string, unknown> | null;
  use_canvas_layout: boolean;
  is_published: boolean;
  is_public: boolean;
  public_token: string | null;
  published_at: Date | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

/**
 * DTO for bulletin list items (minimal fields for list view).
 * Used by: bulletins.list()
 */
export interface BulletinListItemDTO {
  id: string;
  tenantId: string;
  serviceDate: Date;
  status: 'draft' | 'approved' | 'built' | 'locked' | 'deleted';
  brandPackId: string | null;
  pdfUrl: string | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

/**
 * DTO for bulletin detail view (full fields).
 * Used by: bulletins.get()
 */
export interface BulletinDetailDTO {
  id: string;
  tenantId: string;
  serviceDate: Date;
  status: 'draft' | 'approved' | 'built' | 'locked' | 'deleted';
  brandPackId: string | null;
  pdfUrl: string | null;
  pdfLargePrintUrl: string | null;
  slidesJson: unknown | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  contentHash: string | null;
  templateKey: string | null;
  designOptions: Record<string, unknown> | null;
  canvasLayoutJson: Record<string, unknown> | null;
  useCanvasLayout: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for public bulletin view (includes published fields).
 * Used by: bulletins.getByPublicToken()
 */
export interface BulletinPublicDTO {
  id: string;
  tenantId: string;
  serviceDate: Date;
  status: 'draft' | 'approved' | 'built' | 'locked' | 'deleted';
  brandPackId: string | null;
  pdfUrl: string | null;
  pdfLargePrintUrl: string | null;
  slidesJson: unknown | null;
  templateKey: string | null;
  designOptions: Record<string, unknown> | null;
  canvasLayoutJson: Record<string, unknown> | null;
  useCanvasLayout: boolean;
  isPublished: boolean;
  isPublic: boolean;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for bulletin create response.
 * Used by: bulletins.create()
 */
export interface BulletinCreateDTO {
  id: string;
  tenantId: string;
  serviceDate: Date;
  status: 'draft' | 'approved' | 'built' | 'locked' | 'deleted';
  lockedAt: null;
  lockedBy: null;
  pdfUrl: null;
  slidesUrl: null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DTO for bulletin createFromPrevious response.
 * Used by: bulletins.createFromPrevious()
 */
export interface BulletinFromPreviousDTO {
  id: string;
  tenantId: string;
  serviceDate: Date;
  status: 'draft' | 'approved' | 'built' | 'locked' | 'deleted';
  brandPackId: string | null;
  templateKey: string | null;
  designOptions: Record<string, unknown> | null;
  useCanvasLayout: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Maps a bulletin_issue DB row to a list item DTO.
 *
 * @param row - The database row with snake_case columns
 * @returns Mapped DTO with camelCase properties
 *
 * @example
 * ```typescript
 * const result = await queryWithTenant<BulletinIssueRow>(tenantId, queryText, params);
 * return {
 *   bulletins: result.rows.map(mapBulletinToListItem),
 *   total: pgCountToNumber(countResult.rows[0].total),
 * };
 * ```
 */
export function mapBulletinToListItem(row: BulletinIssueRow): BulletinListItemDTO {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    serviceDate: row.issue_date,
    status: row.status,
    brandPackId: row.brand_pack_id,
    pdfUrl: row.pdf_url,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  };
}

/**
 * Maps a bulletin_issue DB row to a detail DTO.
 *
 * @param row - The database row with snake_case columns
 * @returns Mapped DTO with camelCase properties for detail view
 */
export function mapBulletinToDetail(row: BulletinIssueRow): BulletinDetailDTO {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    serviceDate: row.issue_date,
    status: row.status,
    brandPackId: row.brand_pack_id,
    pdfUrl: row.pdf_url,
    pdfLargePrintUrl: row.pdf_large_print_url,
    slidesJson: row.slides_json,
    lockedAt: row.locked_at,
    lockedBy: row.locked_by,
    contentHash: row.content_hash,
    templateKey: row.template_key,
    designOptions: row.design_options,
    canvasLayoutJson: row.canvas_layout_json,
    useCanvasLayout: row.use_canvas_layout,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a bulletin_issue DB row to a public DTO.
 *
 * @param row - The database row with snake_case columns
 * @returns Mapped DTO with camelCase properties for public view
 */
export function mapBulletinToPublic(row: BulletinIssueRow): BulletinPublicDTO {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    serviceDate: row.issue_date,
    status: row.status,
    brandPackId: row.brand_pack_id,
    pdfUrl: row.pdf_url,
    pdfLargePrintUrl: row.pdf_large_print_url,
    slidesJson: row.slides_json,
    templateKey: row.template_key,
    designOptions: row.design_options,
    canvasLayoutJson: row.canvas_layout_json,
    useCanvasLayout: row.use_canvas_layout,
    isPublished: row.is_published,
    isPublic: row.is_public,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a bulletin_issue DB row to a create response DTO.
 *
 * @param row - The database row with snake_case columns
 * @returns Mapped DTO with camelCase properties for create response
 */
export function mapBulletinToCreateResponse(row: BulletinIssueRow): BulletinCreateDTO {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    serviceDate: row.issue_date,
    status: row.status,
    lockedAt: null,
    lockedBy: null,
    pdfUrl: null,
    slidesUrl: null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a bulletin_issue DB row to a createFromPrevious response DTO.
 *
 * @param row - The database row with snake_case columns
 * @returns Mapped DTO with camelCase properties for createFromPrevious response
 */
export function mapBulletinFromPrevious(row: BulletinIssueRow): BulletinFromPreviousDTO {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    serviceDate: row.issue_date,
    status: row.status,
    brandPackId: row.brand_pack_id,
    templateKey: row.template_key,
    designOptions: row.design_options,
    useCanvasLayout: row.use_canvas_layout,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// SERVICE ITEM MAPPERS
// ============================================================================

/**
 * Database row type for service_item table.
 */
export interface ServiceItemRow {
  id: string;
  item_type: string;
  title: string;
  description: string | null;
  order_index: number;
  duration_minutes: number | null;
  leader_name: string | null;
  song_id: string | null;
  ccli_number: string | null;
  scripture_reference: string | null;
  notes: string | null;
}

/**
 * DTO for service item in public bulletin view.
 */
export interface ServiceItemPublicDTO {
  id: string;
  itemType: string;
  title: string;
  description: string | null;
  orderIndex: number;
  durationMinutes: number | null;
  speaker: string | null;
  songId: string | null;
  ccliNumber: string | null;
  scriptureText: string | null;
  notes: string | null;
}

/**
 * Maps a service_item DB row to a public DTO.
 *
 * @param row - The database row with snake_case columns
 * @returns Mapped DTO with camelCase properties
 */
export function mapServiceItemToPublic(row: ServiceItemRow): ServiceItemPublicDTO {
  return {
    id: row.id,
    itemType: row.item_type,
    title: row.title,
    description: row.description,
    orderIndex: row.order_index,
    durationMinutes: row.duration_minutes,
    speaker: row.leader_name,
    songId: row.song_id,
    ccliNumber: row.ccli_number,
    scriptureText: row.scripture_reference,
    notes: row.notes,
  };
}
