import { z } from 'zod';

// ===== User Roles =====
export const UserRole = z.enum(['Admin', 'Editor', 'Submitter', 'Viewer', 'Kiosk']);
export type UserRole = z.infer<typeof UserRole>;

// ===== Person =====
export const PersonSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  householdId: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export type Person = z.infer<typeof PersonSchema>;

// ===== Event =====
export const EventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  startAt: z.date(),
  endAt: z.date(),
  location: z.string().nullable(),
  externalUid: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export type Event = z.infer<typeof EventSchema>;

// ===== Announcement =====
export const AnnouncementSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string().min(1).max(60),
  body: z.string().min(1).max(300),
  priority: z.enum(['high', 'normal', 'low']),
  category: z.string().nullable(),
  expiresAt: z.date().nullable(),
  approvedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export type Announcement = z.infer<typeof AnnouncementSchema>;

// ===== ServiceItem =====
export const ServiceItemType = z.enum([
  'song',
  'prayer',
  'scripture',
  'sermon',
  'announcement',
  'offering',
  'other',
]);

export const ServiceItemSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  bulletinIssueId: z.string().uuid(),
  type: ServiceItemType,
  title: z.string().min(1),
  description: z.string().nullable(),
  ccliNumber: z.string().nullable(),
  orderIndex: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ServiceItem = z.infer<typeof ServiceItemSchema>;
export type ServiceItemType = z.infer<typeof ServiceItemType>;

// ===== BulletinIssue =====
export const BulletinIssueStatus = z.enum([
  'draft',
  'approved',
  'built',
  'locked',
  'reopen_emergency',
]);

export const BulletinIssueSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  serviceDate: z.date(),
  status: BulletinIssueStatus,
  lockedAt: z.date().nullable(),
  lockedBy: z.string().uuid().nullable(),
  templateHash: z.string().nullable(),
  dataHash: z.string().nullable(),
  pdfUrl: z.string().url().nullable(),
  slidesUrl: z.string().url().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type BulletinIssue = z.infer<typeof BulletinIssueSchema>;
export type BulletinIssueStatus = z.infer<typeof BulletinIssueStatus>;

// ===== Contribution =====
export const ContributionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  personId: z.string().uuid().nullable(),
  fundId: z.string().uuid(),
  amount: z.number().positive(),
  date: z.date(),
  method: z.enum(['card', 'ach', 'cash', 'check', 'other']),
  externalId: z.string().nullable(),
  recurring: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Contribution = z.infer<typeof ContributionSchema>;

// ===== Website Schema (URL Normalization) =====
/**
 * Robust URL validation schema that handles common user input patterns.
 * - Blank/empty values → undefined
 * - Full URLs with protocol → passed as-is
 * - Bare hostnames like "mychurch.org" → normalized to "https://mychurch.org"
 * - Invalid URLs → rejected with "Invalid url"
 */
export const WebsiteSchema = z
  .string()
  .nullish()
  .transform((val) => {
    // Handle empty/null/undefined
    if (!val || val.trim() === '') {
      return undefined;
    }
    const trimmed = val.trim();

    // If it already has a protocol, validate as URL
    if (trimmed.match(/^https?:\/\//i)) {
      try {
        new URL(trimmed);
        return trimmed;
      } catch {
        return null; // Will be caught by refine
      }
    }

    // Add https:// to bare hostnames
    const withProtocol = `https://${trimmed}`;
    try {
      new URL(withProtocol);
      return withProtocol;
    } catch {
      return null; // Will be caught by refine
    }
  })
  .refine((val) => val !== null, { message: 'Invalid url' })
  .transform((val) => val as string | undefined);

// ===== Sermon Block Types =====
/**
 * Sermon block types for outline organization.
 * Each type has different default display behaviors.
 */
export const SermonBlockTypeSchema = z.enum(['POINT', 'SCRIPTURE', 'ILLUSTRATION', 'NOTE']);
export type SermonBlockType = z.infer<typeof SermonBlockTypeSchema>;

/**
 * Get the effective block type, defaulting to 'POINT' if undefined.
 * Used for backward compatibility with legacy data.
 */
export function getEffectiveBlockType(type: SermonBlockType | undefined): SermonBlockType {
  return type ?? 'POINT';
}

/**
 * Block display defaults configuration.
 */
export interface BlockDefaults {
  showOnSlides: boolean;
  includeInPrint: boolean;
}

/**
 * Get default display settings for a block type.
 * - POINT: shown on slides, included in print
 * - SCRIPTURE: shown on slides, included in print
 * - ILLUSTRATION: hidden from slides, included in print
 * - NOTE: hidden from slides, included in print
 */
export function getBlockDefaults(type: SermonBlockType | undefined): BlockDefaults {
  const effectiveType = getEffectiveBlockType(type);
  switch (effectiveType) {
    case 'SCRIPTURE':
      return { showOnSlides: true, includeInPrint: true };
    case 'ILLUSTRATION':
      return { showOnSlides: false, includeInPrint: true };
    case 'NOTE':
      return { showOnSlides: false, includeInPrint: true };
    case 'POINT':
    default:
      return { showOnSlides: true, includeInPrint: true };
  }
}

// ===== Sermon Outline Point Schema =====
export const SermonOutlinePointSchema = z.object({
  label: z.string().min(1),
  scriptureRef: z.string().optional(),
  summary: z.string().optional(),
  notes: z.string().optional(),
  type: SermonBlockTypeSchema.optional(),
  showOnSlides: z.boolean().optional(),
  includeInPrint: z.boolean().optional(),
});

export type SermonOutlinePoint = z.infer<typeof SermonOutlinePointSchema>;

// ===== Sermon Outline Schema =====
export const SermonOutlineSchema = z.object({
  introduction: z.string().optional(),
  mainPoints: z.array(SermonOutlinePointSchema).default([]),
  conclusion: z.string().optional(),
  applicationPoints: z.array(z.string()).optional(),
  // Extended fields for sermon builder
  passage: z.string().optional(),
  audienceFocus: z.string().optional(),
  bigIdea: z.string().optional(),
  application: z.string().optional(),
  callToAction: z.string().optional(),
  extraNotes: z.string().optional(),
});

export type SermonOutline = z.infer<typeof SermonOutlineSchema>;

// ===== Sermon Path Stage & Status =====
// Includes both legacy uppercase and builder lowercase stages
export const SermonPathStageSchema = z.enum([
  'BLANK', 'PREPARING', 'OUTLINING', 'READY',
  'text_setup', 'big_idea', 'outline', 'finalize'
]);
export type SermonPathStage = z.infer<typeof SermonPathStageSchema>;

export const SermonStatusSchema = z.enum(['draft', 'ready', 'delivered', 'archived', 'idea', 'preached']);
export type SermonStatus = z.infer<typeof SermonStatusSchema>;

// ===== Sermon Element Schema (Discriminated Union for Sermon Plans) =====
const SermonElementBaseSchema = z.object({
  id: z.string().uuid(),
  level: z.number().int().min(0).optional(),
});

const SectionElementSchema = SermonElementBaseSchema.extend({
  type: z.literal('section'),
  title: z.string(),
});

const PointElementSchema = SermonElementBaseSchema.extend({
  type: z.literal('point'),
  text: z.string(),
});

const NoteElementSchema = SermonElementBaseSchema.extend({
  type: z.literal('note'),
  text: z.string(),
});

const ScriptureElementSchema = SermonElementBaseSchema.extend({
  type: z.literal('scripture'),
  reference: z.string(),
  note: z.string().optional(),
});

const HymnElementSchema = SermonElementBaseSchema.extend({
  type: z.literal('hymn'),
  hymnId: z.string().uuid(),
  title: z.string(),
  note: z.string().optional(),
});

export const SermonElementSchema = z.discriminatedUnion('type', [
  SectionElementSchema,
  PointElementSchema,
  NoteElementSchema,
  ScriptureElementSchema,
  HymnElementSchema,
]);

export type SermonElement = z.infer<typeof SermonElementSchema>;

// ===== Sermon Plan Schemas =====
export const SermonPlanSchema = z.object({
  id: z.string().uuid(),
  sermonId: z.string().uuid(),
  templateId: z.string().uuid().nullish(),
  title: z.string().max(200),
  bigIdea: z.string().max(500),
  primaryText: z.string().max(100),
  supportingTexts: z.array(z.string()).optional().default([]),
  elements: z.array(SermonElementSchema).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type SermonPlan = z.infer<typeof SermonPlanSchema>;

export const SermonPlanInputSchema = z.object({
  sermonId: z.string().uuid(),
  templateId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  bigIdea: z.string().max(500),
  primaryText: z.string().max(100),
  supportingTexts: z.array(z.string()).optional().default([]),
  elements: z.array(SermonElementSchema).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
});

export type SermonPlanInput = z.infer<typeof SermonPlanInputSchema>;

// SermonPlanDraft: More lenient for AI-extracted content (title can be empty)
export const SermonPlanDraftSchema = z.object({
  sermonId: z.string().uuid(),
  title: z.string().max(200), // Empty string allowed for AI extraction
  bigIdea: z.string().max(500),
  primaryText: z.string().max(100),
  supportingTexts: z.array(z.string()).optional().default([]),
  elements: z.array(SermonElementSchema).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  notes: z.string().optional(),
});

export type SermonPlanDraft = z.infer<typeof SermonPlanDraftSchema>;

// ===== Sermon Template Schemas =====
export const SermonTemplateSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  name: z.string().min(1).max(200),
  defaultTitle: z.string().max(200).optional().default(''),
  defaultBigIdea: z.string().max(500).optional().default(''),
  defaultPrimaryText: z.string().max(100).optional().default(''),
  defaultSupportingTexts: z.array(z.string()).optional().default([]),
  structure: z.array(SermonElementSchema).optional().default([]),
  tags: z.array(z.string()).optional().default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SermonTemplate = z.infer<typeof SermonTemplateSchema>;

export const SermonTemplateInputSchema = z.object({
  sermonId: z.string().uuid(),
  name: z.string().min(1).max(200),
  tags: z.array(z.string()).optional().default([]),
});

export type SermonTemplateInput = z.infer<typeof SermonTemplateInputSchema>;

export const SermonTemplateListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  defaultTitle: z.string(),
  defaultPrimaryText: z.string(),
  tags: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export type SermonTemplateListItem = z.infer<typeof SermonTemplateListItemSchema>;

// ===== Manuscript Import Schemas =====
export const ManuscriptImportInputSchema = z.object({
  sermonId: z.string().uuid(),
  manuscriptText: z.string().min(100).max(50000),
});

export type ManuscriptImportInput = z.infer<typeof ManuscriptImportInputSchema>;

export const ManuscriptImportMetaSchema = z.object({
  tokensUsed: z.number().int().nonnegative().optional(),
  model: z.string().optional(),
  extractedElementsCount: z.number().int().nonnegative(),
});

export const ManuscriptImportResponseSchema = z.object({
  draft: SermonPlanDraftSchema,
  meta: ManuscriptImportMetaSchema,
});

export type ManuscriptImportResponse = z.infer<typeof ManuscriptImportResponseSchema>;

// ===== AI & Theology Types =====

/**
 * Subscription plan identifiers.
 * Plans have different AI token limits and feature availability.
 */
export type PlanId = 'core' | 'starter' | 'standard' | 'plus';

/**
 * AI defaults for a subscription plan.
 */
export interface PlanAiDefaults {
  aiEnabled: boolean;
  aiLimitTokens: number;
}

/**
 * AI quota status for a tenant.
 */
export interface AiQuotaStatus {
  enabled: boolean;
  limitTokens: number | null;
  usedTokens: number;
  remainingTokens: number | null;
  overLimit: boolean;
}

/**
 * Current tenant AI configuration.
 */
export interface TenantAiConfig {
  aiEnabled: boolean;
  aiMonthlyTokenLimit: number | null;
}

/**
 * Tenant plan information with AI configuration.
 */
export interface TenantPlanInfo {
  plan: PlanId;
  planDefaults: PlanAiDefaults;
  currentConfig: TenantAiConfig;
  isOverridden: boolean;
}

/**
 * AI quota status for a tenant (used by quota checking).
 */
export interface TenantAiQuotaInfo {
  plan: PlanId;
  planId: PlanId;
  aiEnabled: boolean;
  aiLimitTokens: number | null;
  aiUsedTokens: number;
  isOverridden: boolean;
}

/**
 * AI feature identifiers for quota tracking.
 */
export type AiFeature =
  | 'sermon_suggest_big_idea'
  | 'sermon_suggest_outline'
  | 'sermon_shorten_text'
  | 'sermon_expand_point'
  | 'sermon_manuscript_import'
  | 'bulletin_generate'
  | 'bulletin.generateText'
  | 'sermon.suggestBigIdea'
  | 'sermon.suggestOutline'
  | 'sermon.shortenText'
  | 'general';

// ===== Theology Profile Types =====

/**
 * Theological tradition/denomination for sermon content.
 */
export const TheologyTraditionSchema = z.enum([
  'Non-denominational evangelical',
  'Baptist',
  'Methodist',
  'Presbyterian',
  'Lutheran',
  'Anglican',
  'Pentecostal',
  'Catholic',
  'Reformed',
  'Other',
]);
export type TheologyTradition = z.infer<typeof TheologyTraditionSchema>;

/**
 * Bible translation preference.
 */
export const BibleTranslationSchema = z.enum([
  'ESV',
  'NIV',
  'KJV',
  'NKJV',
  'NLT',
  'NASB',
  'MSG',
  'CSB',
  'Other',
]);
export type BibleTranslation = z.infer<typeof BibleTranslationSchema>;

/**
 * Sermon style preference.
 */
export const SermonStyleSchema = z.enum([
  'expository',
  'topical',
  'narrative',
  'textual',
  'biographical',
]);
export type SermonStyle = z.infer<typeof SermonStyleSchema>;

/**
 * Theological sensitivity level for AI content generation.
 */
export const TheologySensitivitySchema = z.enum([
  'conservative',
  'moderate',
  'progressive',
]);
export type TheologySensitivity = z.infer<typeof TheologySensitivitySchema>;

/**
 * Complete theology profile for AI sermon helper.
 */
export interface TheologyProfile {
  tradition: TheologyTradition | string;
  bibleTranslation: BibleTranslation | string;
  sermonStyle: SermonStyle | string;
  sensitivity: TheologySensitivity | string;
  restrictedTopics: string[];
  preferredTone: string;
}

export const TheologyProfileSchema = z.object({
  tradition: z.string(),
  bibleTranslation: z.string(),
  sermonStyle: z.string(),
  sensitivity: z.string(),
  restrictedTopics: z.array(z.string()).default([]),
  preferredTone: z.string().default('warm and pastoral'),
});

// ===== AI Response Schemas =====

/**
 * Response from AI big idea suggestion.
 */
export const SuggestBigIdeaResponseSchema = z.object({
  bigIdea: z.string(),
  supportingPoints: z.array(z.string()).optional(),
  suggestedTitle: z.string().optional(),
  alternatives: z.array(z.string()).optional(),
});
export type SuggestBigIdeaResponse = z.infer<typeof SuggestBigIdeaResponseSchema>;

/**
 * Response from AI outline suggestion.
 */
export const SuggestOutlineResponseSchema = z.object({
  outline: z.array(SermonOutlinePointSchema),
  mainPoints: z.array(SermonOutlinePointSchema).optional(),
  suggestedIntroduction: z.string().optional(),
  suggestedConclusion: z.string().optional(),
});
export type SuggestOutlineResponse = z.infer<typeof SuggestOutlineResponseSchema>;

/**
 * Response from AI text shortening.
 */
export const ShortenTextResponseSchema = z.object({
  shortened: z.string(),
  originalLength: z.number().optional(),
  shortenedLength: z.number().optional(),
});
export type ShortenTextResponse = z.infer<typeof ShortenTextResponseSchema>;

/**
 * Scripture suggestion with reference and optional reason.
 */
export const ScriptureSuggestionSchema = z.object({
  reference: z.string(),
  reason: z.string().optional(),
});
export type ScriptureSuggestion = z.infer<typeof ScriptureSuggestionSchema>;

/**
 * Application idea for sermon.
 */
export const ApplicationIdeaSchema = z.object({
  idea: z.string(),
  audience: z.string().optional(),
});
export type ApplicationIdea = z.infer<typeof ApplicationIdeaSchema>;

/**
 * Hymn theme suggestion with reason.
 */
export const HymnThemeSchema = z.object({
  theme: z.string(),
  reason: z.string().optional(),
});
export type HymnTheme = z.infer<typeof HymnThemeSchema>;

/**
 * Outline item for sermon structure.
 */
export const OutlineItemSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
});
export type OutlineItem = z.infer<typeof OutlineItemSchema>;

/**
 * Sermon helper suggestions from AI.
 */
export const SermonHelperSuggestionsSchema = z.object({
  bigIdea: z.string().optional(),
  outlinePoints: z.array(SermonOutlinePointSchema).optional(),
  outline: z.array(OutlineItemSchema).optional(),
  illustrations: z.array(z.string()).optional(),
  applications: z.array(z.string()).optional(),
  applicationIdeas: z.array(ApplicationIdeaSchema).optional(),
  quotes: z.array(z.string()).optional(),
  scriptureSuggestions: z.array(ScriptureSuggestionSchema).optional(),
  hymnThemes: z.array(HymnThemeSchema).optional(),
});
export type SermonHelperSuggestions = z.infer<typeof SermonHelperSuggestionsSchema>;

// ===== Bulletin View Model =====

/**
 * Church info for bulletin rendering.
 */
export interface BulletinChurchInfo {
  churchName: string;
  serviceLabel?: string;
  serviceDate?: string;
  serviceTime?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  logoUrl?: string;
}

/**
 * Sermon info for bulletin rendering.
 */
export interface BulletinSermon {
  title?: string;
  preacher?: string;
  primaryScripture?: string;
  outline?: string[];
  seriesTitle?: string;
  bigIdea?: string;
}

/**
 * Contact info for bulletin.
 */
export interface BulletinContactInfo {
  name?: string;
  phone?: string;
  email?: string;
  office?: string;
  address?: string;
  website?: string;
  officePhone?: string;
  officeEmail?: string;
}

/**
 * Giving/donation info for bulletin.
 */
export interface BulletinGivingInfo {
  onlineUrl?: string;
  textToGive?: string;
  qrCode?: string;
  headerText?: string;
  bodyText?: string;
}

/**
 * Marker legend item for service order.
 */
export interface MarkerLegendItem {
  marker: string;
  meaning: string;
  description?: string;
}

/**
 * View model for bulletin rendering and preview.
 */
export interface BulletinViewModel {
  id: string;
  tenantId: string;
  serviceDate: string;
  status: string;
  serviceName?: string;
  serviceTime?: string;
  layoutKey?: string;
  markerLegend?: MarkerLegendItem[];
  churchInfo?: BulletinChurchInfo;
  sermon?: BulletinSermon;
  contactInfo?: BulletinContactInfo;
  givingInfo?: BulletinGivingInfo;
  upcomingEvents: Array<{
    id: string;
    title: string;
    date: string;
    time?: string;
    location?: string;
    startAt?: Date | string;
  }>;
  announcements: Array<{
    id: string;
    title: string;
    body: string;
    priority: string;
    category?: string;
  }>;
  serviceItems: Array<{
    id: string;
    type: string;
    title: string;
    description?: string;
    ccliNumber?: string;
    orderIndex: number;
    printedText?: string;
    marker?: string;
  }>;
  brandPack?: {
    churchName?: string;
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
  };
}

/**
 * Result of bulletin preflight validation.
 */
export interface BulletinPreflightResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ===== Bulletin Generator Types =====

/**
 * Service item child (sub-items like verses, stanzas).
 */
export interface BulletinServiceItemChild {
  id: string;
  type: string;
  title?: string;
  content?: string;
  orderIndex: number;
  label?: string;
  leader?: string;
  marker?: string;
}

/**
 * Service item for bulletin generator.
 */
export interface BulletinServiceItem {
  id: string;
  type: string;
  title: string;
  content?: string;
  ccliNumber?: string;
  artist?: string;
  scriptureRef?: string;
  scriptureText?: string;
  speaker?: string;
  orderIndex: number;
  children?: BulletinServiceItemChild[];
  printedText?: string;
  marker?: string;
  description?: string;
}

/**
 * Announcement for bulletin generator.
 */
export interface BulletinAnnouncement {
  id: string;
  title: string;
  body: string;
  priority: 'high' | 'normal' | 'low';
  category?: string;
  expiresAt?: string;
}

/**
 * Event for bulletin generator.
 */
export interface BulletinEvent {
  id: string;
  title: string;
  startAt: Date | string;
  endAt?: Date | string;
  location?: string;
  locationName?: string;
  description?: string;
  allDay?: boolean;
}

/**
 * Layout engine types for bulletin generation.
 */
export type BulletinLayoutEngine = 'classic' | 'simpleText' | 'canvas';

// ===== Bulletin Canvas Types =====

/**
 * Block types available in the canvas editor.
 */
export const BulletinCanvasBlockTypeSchema = z.enum([
  'text',
  'image',
  'qr',
  'serviceItems',
  'announcements',
  'events',
  'giving',
  'contactInfo',
]);
export type BulletinCanvasBlockType = z.infer<typeof BulletinCanvasBlockTypeSchema>;

/**
 * Text block data configuration.
 */
export interface TextBlockData {
  content: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | 'semibold';
  textAlign?: 'left' | 'center' | 'right';
  color?: string;
}

/**
 * Image block data configuration.
 */
export interface ImageBlockData {
  imageUrl: string;
  alt?: string;
  objectFit?: 'contain' | 'cover' | 'fill';
}

/**
 * QR code block data configuration.
 */
export interface QrBlockData {
  url: string;
  label?: string;
}

/**
 * Service items block data configuration.
 */
export interface ServiceItemsBlockData {
  bulletinIssueId: string;
  maxItems?: number;
  showCcli?: boolean;
}

/**
 * Announcements block data configuration.
 */
export interface AnnouncementsBlockData {
  maxItems?: number;
  category?: string | null;
  priorityFilter?: 'high' | 'normal' | 'low' | null;
}

/**
 * Events block data configuration.
 */
export interface EventsBlockData {
  maxItems?: number;
  dateRange?: 'week' | 'month' | 'all';
}

/**
 * Giving block data configuration.
 */
export interface GivingBlockData {
  displayType?: 'qr' | 'text' | 'both';
  givingUrl?: string;
}

/**
 * Contact info block data configuration.
 */
export interface ContactInfoBlockData {
  showAddress?: boolean;
  showPhone?: boolean;
  showEmail?: boolean;
  showWebsite?: boolean;
}

/**
 * Union type of all block data types.
 */
export type BulletinCanvasBlockData =
  | TextBlockData
  | ImageBlockData
  | QrBlockData
  | ServiceItemsBlockData
  | AnnouncementsBlockData
  | EventsBlockData
  | GivingBlockData
  | ContactInfoBlockData;

/**
 * Individual block instance in the canvas.
 */
export interface BulletinCanvasBlock {
  id: string;
  type: BulletinCanvasBlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  data?: Record<string, unknown>;
}

/**
 * Page in the bulletin canvas (max 4 for booklet compatibility).
 */
export interface BulletinCanvasPage {
  id: string;
  pageNumber: number;
  blocks: BulletinCanvasBlock[];
}

/**
 * Complete bulletin canvas layout.
 */
export interface BulletinCanvasLayout {
  pages: BulletinCanvasPage[];
}
