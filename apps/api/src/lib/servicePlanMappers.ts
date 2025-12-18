/**
 * Service Plan Mappers
 *
 * Maps between database rows and API DTOs for service plans.
 * These mappers ensure clean separation between storage format and API contract.
 */

// ============================================================================
// Type Definitions - API DTOs
// ============================================================================

/**
 * Service item types supported by the API
 * Maps to frontend types: song, scripture, prayer, communion, etc.
 */
export type ServiceItemTypeDTO =
  | 'song'
  | 'scripture'
  | 'prayer'
  | 'communion'
  | 'announcement'
  | 'offering'
  | 'sermon'
  | 'transition'
  | 'note';

/**
 * A single service item as returned by the API
 */
export interface ServiceItemDTO {
  id: string;
  type: ServiceItemTypeDTO;
  title: string;
  subtitle?: string;
  duration: number; // minutes
  notes?: string;
  ccliNumber?: string;
  scriptureRef?: string;
}

/**
 * A section containing service items
 */
export interface ServiceSectionDTO {
  id: string;
  title: string;
  items: ServiceItemDTO[];
}

/**
 * Full service plan structure
 */
export interface ServicePlanDTO {
  id: string;
  date: string; // ISO date (YYYY-MM-DD)
  startTime: string; // e.g., "10:00 AM"
  status: 'draft' | 'published';
  sections: ServiceSectionDTO[];
}

// ============================================================================
// Database Row Types
// ============================================================================

export interface ServiceItemRow {
  id: string;
  tenant_id: string;
  service_date: Date;
  type: string;
  sequence: number;
  title: string | null;
  content: string | null;
  ccli_number: string | null;
  artist: string | null;
  scripture_ref: string | null;
  speaker: string | null;
  duration_minutes: number | null;
  section: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
  deleted_at: Date | null;
}

export interface BulletinIssueRow {
  id: string;
  tenant_id: string;
  issue_date: Date;
  status: string;
  start_time: string | null;
}

// ============================================================================
// Type Mapping - Backend to Frontend Item Types
// ============================================================================

/**
 * Map backend service item types to frontend types
 * Backend uses PascalCase, frontend uses lowercase
 */
const BACKEND_TO_FRONTEND_TYPE: Record<string, ServiceItemTypeDTO> = {
  Welcome: 'note',
  CallToWorship: 'scripture',
  Song: 'song',
  Prayer: 'prayer',
  Scripture: 'scripture',
  Sermon: 'sermon',
  Offering: 'offering',
  Communion: 'communion',
  Benediction: 'prayer',
  Announcement: 'announcement',
  Other: 'note',
};

/**
 * Map frontend service item types to backend types
 */
const FRONTEND_TO_BACKEND_TYPE: Record<ServiceItemTypeDTO, string> = {
  song: 'Song',
  scripture: 'Scripture',
  prayer: 'Prayer',
  communion: 'Communion',
  announcement: 'Announcement',
  offering: 'Offering',
  sermon: 'Sermon',
  transition: 'Other',
  note: 'Other',
};

// ============================================================================
// Default Section Definitions
// ============================================================================

/**
 * Default section order and titles
 * Used when items don't have section assigned or for new plans
 */
export const DEFAULT_SECTIONS: Array<{ id: string; title: string }> = [
  { id: 'pre-service', title: 'Pre-Service' },
  { id: 'opening', title: 'Opening' },
  { id: 'worship', title: 'Worship' },
  { id: 'message', title: 'Message' },
  { id: 'response', title: 'Response' },
  { id: 'closing', title: 'Closing' },
];

/**
 * Default durations by item type (in minutes)
 */
const DEFAULT_DURATIONS: Record<ServiceItemTypeDTO, number> = {
  song: 4,
  scripture: 3,
  prayer: 3,
  communion: 10,
  announcement: 3,
  offering: 5,
  sermon: 25,
  transition: 2,
  note: 2,
};

// ============================================================================
// Mappers - DB to DTO
// ============================================================================

/**
 * Convert a database service item row to API DTO
 */
export function dbRowToServiceItem(row: ServiceItemRow): ServiceItemDTO {
  const frontendType = BACKEND_TO_FRONTEND_TYPE[row.type] || 'note';

  return {
    id: row.id,
    type: frontendType,
    title: row.title || 'Untitled',
    subtitle: buildSubtitle(row),
    duration: row.duration_minutes || DEFAULT_DURATIONS[frontendType] || 3,
    notes: row.notes || undefined,
    ccliNumber: row.ccli_number || undefined,
    scriptureRef: row.scripture_ref || undefined,
  };
}

/**
 * Build subtitle from various row fields
 */
function buildSubtitle(row: ServiceItemRow): string | undefined {
  const parts: string[] = [];

  if (row.content) {
    parts.push(row.content);
  }
  if (row.artist) {
    parts.push(row.artist);
  }
  if (row.speaker) {
    parts.push(row.speaker);
  }

  return parts.length > 0 ? parts.join(' - ') : undefined;
}

/**
 * Group database rows into sections based on section field
 * Items without section go into 'other' section
 */
export function groupItemsIntoSections(
  rows: ServiceItemRow[]
): ServiceSectionDTO[] {
  // Sort by sequence
  const sortedRows = [...rows].sort((a, b) => a.sequence - b.sequence);

  // Group by section
  const sectionMap = new Map<string, ServiceItemDTO[]>();

  // Initialize default sections
  for (const sec of DEFAULT_SECTIONS) {
    sectionMap.set(sec.id, []);
  }

  // Group items
  for (const row of sortedRows) {
    const sectionId = row.section || 'other';
    if (!sectionMap.has(sectionId)) {
      sectionMap.set(sectionId, []);
    }
    sectionMap.get(sectionId)!.push(dbRowToServiceItem(row));
  }

  // Build sections array, preserving order and only including non-empty sections
  // plus any custom sections that have items
  const sections: ServiceSectionDTO[] = [];

  // Add default sections that have items
  for (const sec of DEFAULT_SECTIONS) {
    const items = sectionMap.get(sec.id) || [];
    if (items.length > 0) {
      sections.push({
        id: sec.id,
        title: sec.title,
        items,
      });
    }
  }

  // Add any custom sections (not in defaults)
  for (const [sectionId, items] of sectionMap) {
    if (items.length > 0 && !DEFAULT_SECTIONS.find((s) => s.id === sectionId)) {
      sections.push({
        id: sectionId,
        title: formatSectionTitle(sectionId),
        items,
      });
    }
  }

  return sections;
}

/**
 * Format a section ID as a title
 */
function formatSectionTitle(sectionId: string): string {
  return sectionId
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Build a full service plan DTO from database rows
 */
export function buildServicePlanDTO(
  bulletinRow: BulletinIssueRow,
  itemRows: ServiceItemRow[]
): ServicePlanDTO {
  return {
    id: bulletinRow.id,
    date: formatDate(bulletinRow.issue_date),
    startTime: bulletinRow.start_time || '10:00 AM',
    status: bulletinRow.status === 'locked' ? 'published' : 'draft',
    sections: groupItemsIntoSections(itemRows),
  };
}

/**
 * Format a Date to ISO date string (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// ============================================================================
// Mappers - DTO to DB Updates
// ============================================================================

/**
 * Input for saving a service item
 */
export interface ServiceItemSaveInput {
  id?: string; // Present if updating, absent if creating
  type: ServiceItemTypeDTO;
  title: string;
  subtitle?: string;
  duration: number;
  notes?: string;
  ccliNumber?: string;
  scriptureRef?: string;
  sectionId: string;
  sequence: number;
  delete?: boolean;
}

/**
 * Convert a service item DTO to database update format
 */
export function serviceItemToDbInput(
  item: ServiceItemSaveInput,
  serviceDate: Date,
  tenantId: string
): {
  id: string | undefined;
  tenant_id: string;
  service_date: Date;
  type: string;
  sequence: number;
  title: string;
  content: string | null;
  ccli_number: string | null;
  scripture_ref: string | null;
  duration_minutes: number;
  section: string;
  notes: string | null;
  delete?: boolean;
} {
  return {
    id: item.id,
    tenant_id: tenantId,
    service_date: serviceDate,
    type: FRONTEND_TO_BACKEND_TYPE[item.type] || 'Other',
    sequence: item.sequence,
    title: item.title,
    content: item.subtitle || null,
    ccli_number: item.ccliNumber || null,
    scripture_ref: item.scriptureRef || null,
    duration_minutes: item.duration,
    section: item.sectionId,
    notes: item.notes || null,
    delete: item.delete,
  };
}

/**
 * Flatten sections into a list of items with section IDs and sequences
 */
export function flattenSectionsToItems(
  sections: ServiceSectionDTO[]
): ServiceItemSaveInput[] {
  const items: ServiceItemSaveInput[] = [];
  let globalSequence = 0;

  for (const section of sections) {
    for (const item of section.items) {
      items.push({
        id: item.id,
        type: item.type,
        title: item.title,
        subtitle: item.subtitle,
        duration: item.duration,
        notes: item.notes,
        ccliNumber: item.ccliNumber,
        scriptureRef: item.scriptureRef,
        sectionId: section.id,
        sequence: globalSequence++,
      });
    }
  }

  return items;
}
