/**
 * Sermon Helper Router
 *
 * AI-powered sermon preparation with theological guardrails.
 * All AI calls are server-side only, using the church's theology profile.
 */

import { router, editorProcedure, adminProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db, queryWithTenant } from '../db';
import { logger } from '../utils/logger';
import { decryptSecret, isEncryptionConfigured } from '../utils/encryption';
import { getAiQuotaStatusForTenant } from '../utils/aiQuota';
import { getOrgBranding } from '../lib/orgBranding';
import { Context } from '../context';
import {
  TheologyTraditionSchema,
  BibleTranslationSchema,
  SermonStyleSchema,
  TheologySensitivitySchema,
  SermonHelperSuggestionsSchema,
  SermonPlanInputSchema,
  SermonElementSchema,
  SermonStyleProfileSchema,
  SermonStyleProfileLabels,
  type TheologyProfile,
  type SermonHelperSuggestions,
  type SermonPlan,
  type SermonPlanDraft,
  type SermonElement,
  type SermonTemplate,
  type SermonStyleProfile,
  type SermonDraft,
} from '@elder-first/types';

// ============================================================================
// AI CONFIGURATION & HELPERS (Server-side only)
// ============================================================================

interface AiSettingsRow {
  id: string;
  provider: string;
  api_key_encrypted: string | null;
  enabled: boolean;
}

interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

function getDeployEnv(): string {
  return process.env.DEPLOY_ENV ?? process.env.NODE_ENV ?? 'development';
}

function isAiAllowedInEnvironment(): boolean {
  const deployEnv = getDeployEnv();
  return deployEnv === 'development' || deployEnv === 'dev' || deployEnv === 'staging';
}

async function getEffectiveApiKey(): Promise<string | null> {
  if (!isAiAllowedInEnvironment()) return null;
  if (!isEncryptionConfigured()) {
    logger.warn('[SermonHelper] APP_ENCRYPTION_KEY not set');
    return null;
  }

  try {
    const result = await db.query<AiSettingsRow>(
      'SELECT enabled, api_key_encrypted FROM ai_settings LIMIT 1'
    );
    if (result.rows.length === 0) return null;

    const settings = result.rows[0];
    if (!settings.enabled || !settings.api_key_encrypted) return null;

    try {
      return decryptSecret(settings.api_key_encrypted) || null;
    } catch {
      logger.error('[SermonHelper] Failed to decrypt API key');
      return null;
    }
  } catch (error) {
    logger.error('[SermonHelper] Failed to fetch AI settings', { error });
    return null;
  }
}

async function assertAiConfigured(): Promise<string> {
  if (!isAiAllowedInEnvironment()) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'AI features are disabled in production.',
    });
  }

  const apiKey = await getEffectiveApiKey();
  if (!apiKey) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'AI features are not configured. Please configure AI in Settings.',
    });
  }

  return apiKey;
}

async function ensureAiQuotaAvailable(ctx: Context): Promise<void> {
  const quota = await getAiQuotaStatusForTenant(ctx);

  if (!quota.enabled) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'AI features are disabled for this tenant.',
    });
  }

  if (quota.overLimit) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Monthly AI usage limit reached.',
    });
  }
}

async function logAiUsage(
  tenantId: string,
  feature: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
  meta?: Record<string, unknown>
): Promise<void> {
  try {
    await db.query(
      `INSERT INTO ai_usage_events (tenant_id, feature, model, tokens_in, tokens_out, meta)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [tenantId, feature, model, tokensIn, tokensOut, meta ? JSON.stringify(meta) : null]
    );
  } catch (error) {
    logger.warn('[SermonHelper] Failed to log usage event', { error });
  }
}

// ============================================================================
// THEOLOGY-AWARE PROMPT CONSTRUCTION
// ============================================================================

/**
 * Build the system prompt dynamically from church's theology profile.
 * This is the core of the theological guardrails.
 */
function buildTheologyAwareSystemPrompt(
  churchName: string,
  profile: TheologyProfile
): string {
  const restrictedTopicsList = profile.restrictedTopics.length > 0
    ? profile.restrictedTopics.join(', ')
    : 'none specified';

  return `You are a sermon preparation assistant for the church "${churchName}".

Theological Profile:
- Tradition: ${profile.tradition}
- Preferred Bible translation: ${profile.bibleTranslation}
- Sermon style: ${profile.sermonStyle}
- Sensitivity level: ${profile.sensitivity}
- Restricted topics: ${restrictedTopicsList}
- Preferred tone: ${profile.preferredTone}

RULES (Non-negotiable):
1. Stay within mainstream ${profile.tradition} theology. Do not introduce doctrines or interpretations that would be controversial within this tradition.
2. When citing Scripture, use references compatible with the ${profile.bibleTranslation} versification, but return ONLY references (e.g., "John 3:16-18"), NOT full verse text.
3. Avoid these restricted topics unless explicitly requested: ${restrictedTopicsList}. If asked directly, respond gently and suggest the pastor handle that topic personally.
4. Do NOT discuss partisan politics, endorse political candidates, or frame issues in a culture-war style. Keep the focus on Scripture, Christ, and pastoral application.
5. Keep suggestions pastoral, humble, and helpful – not sensational, speculative, or divisive.
6. Keep outline points concise (3-7 words each). Keep explanations short and clear.
7. For a "${profile.sensitivity}" sensitivity level, ${
    profile.sensitivity === 'conservative'
      ? 'be very cautious with any topic that could be divisive or controversial.'
      : profile.sensitivity === 'moderate'
        ? 'handle potentially sensitive topics with care and balance.'
        : 'provide more latitude for mature theological discussion, while still avoiding extremes.'
  }

Output format:
- Always return a single JSON object with the exact fields and types requested.
- Do not include any commentary, markdown fences, or explanation outside the JSON.
- Do not include actual Bible verse text, only references.`;
}

/**
 * Build the user prompt for sermon suggestions.
 */
/**
 * Get style-specific guidance for illustrations based on the sermon style profile.
 */
function getIllustrationStyleGuidance(styleProfile: SermonStyleProfile | null | undefined): string {
  switch (styleProfile) {
    case 'story_first_3_point':
      return 'Since this is a story-first style, prioritize narrative illustrations and personal stories that connect emotionally. Lead with the story before the principle.';
    case 'expository_verse_by_verse':
      return 'Since this is an expository style, focus on illustrations that illuminate the text\'s original context, historical background, or word meanings. Keep illustrations brief and text-focused.';
    case 'topical_teaching':
      return 'Since this is a topical style, use illustrations that relate to contemporary life situations and practical application of the topic being taught.';
    default:
      return 'Provide versatile illustrations that can work with various preaching styles.';
  }
}

function buildUserPrompt(
  theme: string,
  sermon: {
    title: string;
    primaryScripture: string | null;
    preacher: string | null;
    sermonDate: string | null;
    seriesTitle: string | null;
  },
  notes?: string,
  styleProfile?: SermonStyleProfile | null
): string {
  let prompt = `Generate sermon preparation suggestions for this sermon.

Sermon context:
- Theme or big idea: ${theme}`;

  // Add style profile hint if present
  if (styleProfile) {
    const styleLabel = SermonStyleProfileLabels[styleProfile];
    prompt += `\n- Preferred sermon style: ${styleLabel}`;
  }

  if (sermon.primaryScripture) {
    prompt += `\n- Scripture already chosen: ${sermon.primaryScripture}`;
  }
  if (sermon.title) {
    prompt += `\n- Title: ${sermon.title}`;
  }
  if (sermon.seriesTitle) {
    prompt += `\n- Series: ${sermon.seriesTitle}`;
  }
  if (sermon.sermonDate) {
    prompt += `\n- Date: ${sermon.sermonDate}`;
  }
  if (sermon.preacher) {
    prompt += `\n- Preacher: ${sermon.preacher}`;
  }
  if (notes) {
    prompt += `\n- Additional notes from pastor: ${notes}`;
  }

  // Add illustration style guidance
  const illustrationGuidance = getIllustrationStyleGuidance(styleProfile);

  prompt += `

Return ONLY a single JSON object with this exact structure:

{
  "scriptureSuggestions": [
    { "reference": "Book Chapter:Verse-Verse", "reason": "Short explanation (max 25 words)" }
  ],
  "outline": [
    { "type": "section", "title": "Section Name" },
    { "type": "point", "text": "Main point text (3-7 words)" }
  ],
  "applicationIdeas": [
    { "audience": "believers | seekers | youth | families | all", "idea": "Specific, concrete application (max 35 words)" }
  ],
  "hymnThemes": [
    { "theme": "grace | cross | resurrection | mission | etc.", "reason": "Why this fits (max 20 words)" }
  ],
  "illustrationSuggestions": [
    { "id": "unique-id-1", "title": "Short descriptive title (max 8 words)", "summary": "2-4 sentence story outline that illustrates the point", "forSection": "introduction | point1 | point2 | point3 | application | null" }
  ]
}

- Include 2-4 scripture suggestions
- Include 3-5 outline elements (mix of sections and points)
- Include 2-4 application ideas for different audiences
- Include 2-3 hymn themes
- Include 2-4 illustration suggestions that connect to the sermon's theme and scripture
  - ${illustrationGuidance}
  - Each illustration should have a unique id (like "illus-1", "illus-2", etc.)
  - The forSection field indicates where in the sermon the illustration fits best (or null if general)
  - Keep illustrations pastoral, non-political, and appropriate for a church setting
  - Avoid divisive cultural topics, partisan content, or controversial current events
- Do not add extra fields
- Do not include markdown fences or explanation`;

  return prompt;
}

/**
 * Parse AI response with defensive handling.
 * Strips markdown fences, validates with Zod, returns fallback on error.
 */
function parseAiResponse(
  rawResponse: string
): { suggestions: SermonHelperSuggestions; fallback: boolean } {
  // Strip markdown code fences if present
  let cleaned = rawResponse.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Try to parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (parseError) {
    logger.error('[SermonHelper] Failed to parse AI response as JSON', {
      rawResponse: rawResponse.substring(0, 500),
      error: parseError,
    });
    return {
      suggestions: getEmptyFallback(),
      fallback: true,
    };
  }

  // Validate with Zod
  const result = SermonHelperSuggestionsSchema.safeParse(parsed);
  if (!result.success) {
    logger.error('[SermonHelper] AI response failed schema validation', {
      parsed,
      errors: result.error.issues,
    });
    return {
      suggestions: getEmptyFallback(),
      fallback: true,
    };
  }

  return {
    suggestions: result.data,
    fallback: false,
  };
}

function getEmptyFallback(): SermonHelperSuggestions {
  return {
    scriptureSuggestions: [],
    outline: [],
    applicationIdeas: [],
    hymnThemes: [],
    illustrationSuggestions: [],
  };
}

// ============================================================================
// GUARDRAILS: RESTRICTED TOPIC DETECTION
// ============================================================================

/**
 * Normalize text for topic matching (case-insensitive, trimmed)
 */
function normalizeForTopicMatch(text: string): string {
  return text.toLowerCase().trim();
}

/**
 * Build a combined string from input fields for topic detection.
 * Includes theme, notes, and sermon title.
 */
function buildTopicDetectionString(
  theme: string,
  notes: string | undefined,
  sermonTitle: string
): string {
  const parts = [theme, notes || '', sermonTitle].filter(Boolean);
  return normalizeForTopicMatch(parts.join(' '));
}

/**
 * Check if any restricted topics are present in the input content.
 * Returns the first matched topic or null if none found.
 */
function checkRestrictedTopics(
  content: string,
  restrictedTopics: string[]
): string | null {
  const normalizedContent = normalizeForTopicMatch(content);

  for (const topic of restrictedTopics) {
    const normalizedTopic = normalizeForTopicMatch(topic);
    if (normalizedTopic && normalizedContent.includes(normalizedTopic)) {
      return topic; // Return original casing for logging
    }
  }

  return null;
}

// ============================================================================
// GUARDRAILS: POLITICAL CONTENT FILTER
// ============================================================================

/**
 * List of political keywords to filter from AI responses.
 * These are checked case-insensitively against all suggestion text.
 */
const POLITICAL_KEYWORDS = [
  'republican',
  'democrat',
  'gop',
  'dnc',
  'trump',
  'biden',
  'harris',
  'obama',
  'maga',
  'liberal party',
  'conservative party',
  'vote for',
  'election campaign',
  'political party',
  'far-left',
  'far-right',
  'left-wing',
  'right-wing',
];

/**
 * Check if text contains any political keywords.
 */
function containsPoliticalContent(text: string): boolean {
  const normalizedText = normalizeForTopicMatch(text);
  return POLITICAL_KEYWORDS.some(keyword =>
    normalizedText.includes(normalizeForTopicMatch(keyword))
  );
}

/**
 * Filter political content from AI suggestions.
 * Returns filtered suggestions and whether any content was removed.
 */
function filterPoliticalContent(
  suggestions: SermonHelperSuggestions
): { filtered: SermonHelperSuggestions; detected: boolean } {
  let detected = false;

  // Filter scripture suggestions
  const scriptureSuggestions = (suggestions.scriptureSuggestions ?? []).filter(item => {
    const hasPolitical = containsPoliticalContent(item.reference) ||
      containsPoliticalContent(item.reason ?? '');
    if (hasPolitical) detected = true;
    return !hasPolitical;
  });

  // Filter outline items
  const outline = (suggestions.outline ?? []).filter(item => {
    const text = item.title ?? item.text ?? '';
    const hasPolitical = containsPoliticalContent(text);
    if (hasPolitical) detected = true;
    return !hasPolitical;
  });

  // Filter application ideas
  const applicationIdeas = (suggestions.applicationIdeas ?? []).filter(item => {
    const hasPolitical = containsPoliticalContent(item.idea);
    if (hasPolitical) detected = true;
    return !hasPolitical;
  });

  // Filter hymn themes
  const hymnThemes = (suggestions.hymnThemes ?? []).filter(item => {
    const hasPolitical = containsPoliticalContent(item.theme) ||
      containsPoliticalContent(item.reason ?? '');
    if (hasPolitical) detected = true;
    return !hasPolitical;
  });

  // Filter illustration suggestions
  const illustrationSuggestions = (suggestions.illustrationSuggestions ?? []).filter(item => {
    const hasPolitical = containsPoliticalContent(item.title) ||
      containsPoliticalContent(item.summary);
    if (hasPolitical) detected = true;
    return !hasPolitical;
  });

  return {
    filtered: {
      scriptureSuggestions,
      outline,
      applicationIdeas,
      hymnThemes,
      illustrationSuggestions,
    },
    detected,
  };
}

// ============================================================================
// DRAFT GENERATION (Phase 8)
// ============================================================================

/**
 * Build the user prompt for generating a preaching draft from a SermonPlan.
 * Respects the style profile for oral delivery guidance.
 */
function buildDraftPrompt(
  plan: {
    title: string;
    bigIdea: string;
    primaryText: string;
    supportingTexts: string[];
    elements: SermonElement[];
    styleProfile: SermonStyleProfile | null;
  },
  theologyProfile: TheologyProfile
): string {
  // Build elements description
  const elementsDescription = plan.elements.map((el, idx) => {
    switch (el.type) {
      case 'section':
        return `${idx + 1}. [SECTION] ${el.title}`;
      case 'point':
        return `${idx + 1}. [POINT] ${el.text}`;
      case 'scripture':
        return `${idx + 1}. [SCRIPTURE] ${el.reference}${el.note ? ` – ${el.note}` : ''}`;
      case 'hymn':
        return `${idx + 1}. [HYMN] ${el.title}${el.note ? ` – ${el.note}` : ''}`;
      case 'illustration':
        return `${idx + 1}. [ILLUSTRATION] ${el.title}${el.note ? ` – ${el.note}` : ''}`;
      case 'note':
        return `${idx + 1}. [NOTE] ${el.text}`;
      default:
        return `${idx + 1}. [UNKNOWN]`;
    }
  }).join('\n');

  // Style-specific guidance
  let styleGuidance = '';
  switch (plan.styleProfile) {
    case 'story_first_3_point':
      styleGuidance = `
Style: Story-First 3-Point
- Lead with engaging stories and illustrations
- Structure around three memorable takeaways
- Use narrative hooks to transition between points
- Emphasize emotional connection before doctrine
- Include personal anecdotes where appropriate`;
      break;
    case 'expository_verse_by_verse':
      styleGuidance = `
Style: Expository Verse-by-Verse
- Walk through the text systematically
- Explain original language insights where helpful
- Focus on what the text says, means, and applies
- Keep illustrations brief and text-focused
- Prioritize doctrinal accuracy and textual fidelity`;
      break;
    case 'topical_teaching':
      styleGuidance = `
Style: Topical Teaching
- Organize around the central topic/theme
- Use multiple scripture passages to support points
- Connect to contemporary life situations
- Balance teaching with practical application
- Maintain logical flow through sub-topics`;
      break;
    default:
      styleGuidance = `
Style: General
- Balance exposition with application
- Include appropriate illustrations
- Maintain clear structure
- Connect scripture to life`;
  }

  const supportingTextsStr = plan.supportingTexts.length > 0
    ? plan.supportingTexts.join(', ')
    : 'None specified';

  return `Generate a complete preaching manuscript draft based on this sermon plan.

=== SERMON PLAN ===
Title: ${plan.title}
Big Idea: ${plan.bigIdea}
Primary Scripture: ${plan.primaryText}
Supporting Texts: ${supportingTextsStr}

Outline Elements:
${elementsDescription}

=== STYLE GUIDANCE ===${styleGuidance}

=== THEOLOGY CONTEXT ===
Tradition: ${theologyProfile.tradition}
Bible Translation: ${theologyProfile.bibleTranslation}
Tone: ${theologyProfile.preferredTone}

=== INSTRUCTIONS ===
1. Write a complete preaching manuscript in markdown format
2. This is for ORAL DELIVERY - write as you would speak from a pulpit
3. Include natural transitions between sections
4. Expand each outline point with appropriate depth
5. Include scripture references but NOT full verse text (pastor has their Bible)
6. Expand illustration placeholders with brief story summaries
7. Include application points throughout
8. End with a clear call to action or closing prayer prompt
9. Use ## for main sections and ### for sub-points
10. Keep paragraphs short for easy reading while preaching
11. Total length: approximately 2,000-3,500 words (15-25 minute sermon)

Return ONLY the markdown manuscript text. No JSON, no code fences, no meta-commentary.`;
}

/**
 * Parse the draft generation response.
 * Just returns the raw markdown text if valid.
 */
function parseDraftResponse(rawResponse: string): { markdown: string; valid: boolean } {
  let cleaned = rawResponse.trim();

  // Strip markdown code fences if AI wrapped the response
  if (cleaned.startsWith('```markdown')) {
    cleaned = cleaned.slice(11);
  } else if (cleaned.startsWith('```md')) {
    cleaned = cleaned.slice(5);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // Basic validation - should have some content
  if (cleaned.length < 200) {
    return { markdown: '', valid: false };
  }

  return { markdown: cleaned, valid: true };
}

/**
 * Filter political content from the generated draft.
 * Returns filtered content and detection flag.
 */
function filterPoliticalContentFromDraft(
  markdown: string
): { filtered: string; detected: boolean } {
  let detected = false;
  let filtered = markdown;

  // Check each political keyword
  for (const keyword of POLITICAL_KEYWORDS) {
    const regex = new RegExp(keyword, 'gi');
    if (regex.test(filtered)) {
      detected = true;
      // Replace with a placeholder that won't disrupt reading
      filtered = filtered.replace(regex, '[content filtered]');
    }
  }

  return { filtered, detected };
}

// ============================================================================
// ROUTER DEFINITION
// ============================================================================

export const sermonHelperRouter = router({
  /**
   * Get theology profile for the current tenant.
   * Available to all authenticated users.
   */
  getTheologyProfile: protectedProcedure.query(async ({ ctx }) => {
    const tenantId = ctx.tenantId!;
    const branding = await getOrgBranding(tenantId);
    return branding.theologyProfile;
  }),

  /**
   * Update theology profile. Admin only.
   */
  updateTheologyProfile: adminProcedure
    .input(
      z.object({
        tradition: TheologyTraditionSchema.optional(),
        bibleTranslation: BibleTranslationSchema.optional(),
        sermonStyle: SermonStyleSchema.optional(),
        sensitivity: TheologySensitivitySchema.optional(),
        restrictedTopics: z.array(z.string().max(100)).max(20).optional(),
        preferredTone: z.string().max(100).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Get existing brand pack
      const existingResult = await queryWithTenant(
        tenantId,
        `SELECT id FROM brand_pack WHERE is_active = true AND deleted_at IS NULL LIMIT 1`
      );

      if (existingResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No active brand pack found. Please set up organization settings first.',
        });
      }

      const brandPackId = existingResult.rows[0].id;

      // Build update query dynamically
      const updates: string[] = [];
      const values: unknown[] = [brandPackId];
      let paramIndex = 2;

      if (input.tradition !== undefined) {
        updates.push(`theology_tradition = $${paramIndex++}`);
        values.push(input.tradition);
      }
      if (input.bibleTranslation !== undefined) {
        updates.push(`theology_bible_translation = $${paramIndex++}`);
        values.push(input.bibleTranslation);
      }
      if (input.sermonStyle !== undefined) {
        updates.push(`theology_sermon_style = $${paramIndex++}`);
        values.push(input.sermonStyle);
      }
      if (input.sensitivity !== undefined) {
        updates.push(`theology_sensitivity = $${paramIndex++}`);
        values.push(input.sensitivity);
      }
      if (input.restrictedTopics !== undefined) {
        updates.push(`theology_restricted_topics = $${paramIndex++}`);
        values.push(input.restrictedTopics);
      }
      if (input.preferredTone !== undefined) {
        updates.push(`theology_preferred_tone = $${paramIndex++}`);
        values.push(input.preferredTone);
      }

      if (updates.length === 0) {
        // Nothing to update
        const branding = await getOrgBranding(tenantId);
        return branding.theologyProfile;
      }

      updates.push('updated_at = NOW()');

      await queryWithTenant(
        tenantId,
        `UPDATE brand_pack SET ${updates.join(', ')} WHERE id = $1 AND deleted_at IS NULL`,
        values
      );

      // Return updated profile
      const branding = await getOrgBranding(tenantId);
      return branding.theologyProfile;
    }),

  /**
   * Get AI suggestions for sermon preparation.
   * This is the main theology-aware endpoint.
   *
   * Guardrails:
   * 1. Restricted Topic Hard Block: If input matches any restricted topic,
   *    AI is NOT called and empty response with restrictedTopicTriggered=true is returned.
   * 2. Political Content Post-Filter: After AI response, any political content
   *    is filtered out and politicalContentDetected=true is set.
   */
  getAISuggestions: editorProcedure
    .input(
      z.object({
        sermonId: z.string().uuid(),
        theme: z.string().min(1).max(500),
        notes: z.string().max(2000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 1. Verify AI is configured
      const apiKey = await assertAiConfigured();

      // 2. Check tenant AI quota
      await ensureAiQuotaAvailable(ctx);

      const tenantId = ctx.tenantId!;
      const { sermonId, theme, notes } = input;

      logger.info('[SermonHelper] AI suggestions request', { sermonId, theme, tenantId });

      // 3. Fetch sermon data
      const sermonResult = await queryWithTenant<{
        id: string;
        title: string;
        primary_scripture: string | null;
        preacher: string | null;
        sermon_date: string | null;
        series_title: string | null;
      }>(
        tenantId,
        `SELECT
          s.id,
          s.title,
          s.primary_scripture,
          s.preacher,
          s.sermon_date::text,
          ss.title as series_title
        FROM sermon s
        LEFT JOIN sermon_series ss ON s.series_id = ss.id
        WHERE s.id = $1 AND s.deleted_at IS NULL`,
        [sermonId]
      );

      if (sermonResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sermon not found',
        });
      }

      const sermon = sermonResult.rows[0];

      // 3b. Fetch sermon plan's style profile (if exists)
      const planResult = await queryWithTenant<{
        style_profile: SermonStyleProfile | null;
      }>(
        tenantId,
        `SELECT style_profile FROM sermon_plans WHERE sermon_id = $1 AND deleted_at IS NULL`,
        [sermonId]
      );
      const styleProfile = planResult.rows[0]?.style_profile ?? null;

      // 4. Fetch org branding with theology profile
      const branding = await getOrgBranding(tenantId);
      const churchName = branding.churchName || branding.legalName;
      const theologyProfile = branding.theologyProfile;

      // 5. GUARDRAIL: Check for restricted topics BEFORE calling AI
      const topicDetectionContent = buildTopicDetectionString(theme, notes, sermon.title);
      const matchedRestrictedTopic = checkRestrictedTopics(
        topicDetectionContent,
        theologyProfile.restrictedTopics
      );

      if (matchedRestrictedTopic) {
        // Log the restricted topic trigger (metadata only - no content)
        logger.info('[SermonHelper] Guardrail: Restricted topic detected - AI skipped', {
          event: 'sermonHelper.restrictedTopic',
          tenantId,
          theologyTradition: theologyProfile.tradition,
          restrictedTopicsCount: theologyProfile.restrictedTopics.length,
          sermonId,
        });

        // Log as usage event with zero tokens
        await logAiUsage(
          tenantId,
          'sermon.helperSuggestions',
          'none',
          0,
          0,
          { sermonId, restrictedTopicTriggered: true }
        );

        // Return empty response with flag
        return {
          suggestions: getEmptyFallback(),
          meta: {
            fallback: false,
            restrictedTopicTriggered: true,
          },
        };
      }

      // 6. Build prompts
      const systemPrompt = buildTheologyAwareSystemPrompt(churchName, theologyProfile);
      const userPrompt = buildUserPrompt(
        theme,
        {
          title: sermon.title,
          primaryScripture: sermon.primary_scripture,
          preacher: sermon.preacher,
          sermonDate: sermon.sermon_date,
          seriesTitle: sermon.series_title,
        },
        notes,
        styleProfile
      );

      // 7. Call OpenAI (server-side only)
      const MODEL = 'gpt-4o-mini';
      let rawResponse: string;
      let usage: OpenAIUsage | null = null;

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 2000,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          logger.error('[SermonHelper] OpenAI API error', { status: response.status, error: errorData });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'AI service temporarily unavailable. Please try again.',
          });
        }

        const data = await response.json() as {
          choices?: { message?: { content?: string } }[];
          usage?: OpenAIUsage;
        };

        rawResponse = data.choices?.[0]?.message?.content?.trim() || '';
        usage = data.usage || null;

        if (!rawResponse) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'AI service returned empty response.',
          });
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('[SermonHelper] OpenAI call failed', { error });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get AI suggestions. Please try again.',
        });
      }

      // 8. Parse response with defensive handling
      const { suggestions: parsedSuggestions, fallback } = parseAiResponse(rawResponse);

      // 9. GUARDRAIL: Filter political content from response
      const { filtered: suggestions, detected: politicalContentDetected } =
        filterPoliticalContent(parsedSuggestions);

      if (politicalContentDetected) {
        // Log the political content filter event (metadata only - no content)
        logger.info('[SermonHelper] Guardrail: Political content filtered from AI response', {
          event: 'sermonHelper.politicalFiltered',
          tenantId,
          theologyTradition: theologyProfile.tradition,
          sermonId,
        });
      }

      // 10. Log usage (best-effort)
      if (usage) {
        await logAiUsage(
          tenantId,
          'sermon.helperSuggestions',
          MODEL,
          usage.prompt_tokens,
          usage.completion_tokens,
          { sermonId, theme, fallback, politicalContentDetected }
        );
      }

      logger.info('[SermonHelper] AI suggestions generated', {
        sermonId,
        fallback,
        politicalContentDetected,
        scriptures: suggestions.scriptureSuggestions?.length ?? 0,
        outlineItems: suggestions.outline?.length ?? 0,
        applications: suggestions.applicationIdeas?.length ?? 0,
        hymnThemes: suggestions.hymnThemes?.length ?? 0,
        illustrations: suggestions.illustrationSuggestions?.length ?? 0,
      });

      // 11. Return response
      return {
        suggestions,
        meta: {
          fallback,
          tokensUsed: usage ? usage.prompt_tokens + usage.completion_tokens : undefined,
          model: MODEL,
          politicalContentDetected: politicalContentDetected || undefined,
        },
      };
    }),

  /**
   * Search songs/hymns by theme or keyword.
   * Uses existing song table.
   */
  searchHymns: protectedProcedure
    .input(
      z.object({
        query: z.string().min(1).max(200),
        limit: z.number().int().min(1).max(50).default(10),
      })
    )
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const { query, limit } = input;

      const result = await queryWithTenant<{
        id: string;
        title: string;
        alternate_title: string | null;
        hymn_number: string | null;
        hymnal_code: string | null;
        tune_name: string | null;
        author: string | null;
        is_public_domain: boolean;
        ccli_number: string | null;
      }>(
        tenantId,
        `SELECT
          id,
          title,
          alternate_title,
          hymn_number,
          hymnal_code,
          tune_name,
          author,
          is_public_domain,
          ccli_number
        FROM song
        WHERE deleted_at IS NULL
          AND (
            title ILIKE $1
            OR alternate_title ILIKE $1
            OR first_line ILIKE $1
            OR tune_name ILIKE $1
            OR lyrics ILIKE $1
          )
        ORDER BY
          CASE WHEN title ILIKE $1 THEN 0 ELSE 1 END,
          title ASC
        LIMIT $2`,
        [`%${query}%`, limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        alternateTitle: row.alternate_title,
        hymnNumber: row.hymn_number,
        hymnalCode: row.hymnal_code,
        tuneName: row.tune_name,
        author: row.author,
        isPublicDomain: row.is_public_domain,
        ccliNumber: row.ccli_number,
      }));
    }),

  // ============================================================================
  // SERMON PLAN ENDPOINTS (Phase 5)
  // ============================================================================

  /**
   * Get the sermon plan for a specific sermon.
   * Returns null if no plan exists.
   */
  getPlan: protectedProcedure
    .input(z.object({ sermonId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const { sermonId } = input;

      // Verify sermon exists and belongs to tenant
      const sermonCheck = await queryWithTenant<{ id: string }>(
        tenantId,
        `SELECT id FROM sermon WHERE id = $1 AND deleted_at IS NULL`,
        [sermonId]
      );

      if (sermonCheck.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sermon not found',
        });
      }

      // Fetch the plan
      const result = await queryWithTenant<{
        id: string;
        sermon_id: string;
        title: string;
        big_idea: string | null;
        primary_text: string | null;
        supporting_texts: string[] | null;
        elements: SermonElement[];
        tags: string[] | null;
        notes: string | null;
        template_id: string | null;
        style_profile: SermonStyleProfile | null;
        created_at: Date;
        updated_at: Date;
      }>(
        tenantId,
        `SELECT * FROM sermon_plan WHERE sermon_id = $1`,
        [sermonId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        sermonId: row.sermon_id,
        title: row.title,
        bigIdea: row.big_idea || '',
        primaryText: row.primary_text || '',
        supportingTexts: row.supporting_texts || [],
        elements: row.elements || [],
        tags: row.tags || [],
        notes: row.notes,
        templateId: row.template_id,
        styleProfile: row.style_profile,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      } as SermonPlan;
    }),

  /**
   * Save (upsert) a sermon plan.
   * Creates a new plan if one doesn't exist, updates if it does.
   */
  savePlan: editorProcedure
    .input(SermonPlanInputSchema)
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      // Verify sermon exists
      const sermonCheck = await queryWithTenant<{ id: string }>(
        tenantId,
        `SELECT id FROM sermon WHERE id = $1 AND deleted_at IS NULL`,
        [input.sermonId]
      );

      if (sermonCheck.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sermon not found',
        });
      }

      // Check if plan exists
      const existingPlan = await queryWithTenant<{ id: string }>(
        tenantId,
        `SELECT id FROM sermon_plan WHERE sermon_id = $1`,
        [input.sermonId]
      );

      let planId: string;

      if (existingPlan.rows.length > 0) {
        // Update existing plan
        planId = existingPlan.rows[0].id;
        await queryWithTenant(
          tenantId,
          `UPDATE sermon_plan SET
            title = $1,
            big_idea = $2,
            primary_text = $3,
            supporting_texts = $4,
            elements = $5,
            tags = $6,
            notes = $7,
            template_id = $8,
            style_profile = $9,
            updated_at = NOW()
          WHERE id = $10`,
          [
            input.title,
            input.bigIdea,
            input.primaryText,
            input.supportingTexts,
            JSON.stringify(input.elements),
            input.tags,
            input.notes || null,
            input.templateId || null,
            input.styleProfile || null,
            planId,
          ]
        );
      } else {
        // Create new plan
        const insertResult = await queryWithTenant<{ id: string }>(
          tenantId,
          `INSERT INTO sermon_plan (
            tenant_id, sermon_id, title, big_idea, primary_text,
            supporting_texts, elements, tags, notes, template_id, style_profile
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING id`,
          [
            tenantId,
            input.sermonId,
            input.title,
            input.bigIdea,
            input.primaryText,
            input.supportingTexts,
            JSON.stringify(input.elements),
            input.tags,
            input.notes || null,
            input.templateId || null,
            input.styleProfile || null,
          ]
        );
        planId = insertResult.rows[0].id;
      }

      logger.info('[SermonHelper] Plan saved', { sermonId: input.sermonId, planId, tenantId });

      // Return the updated/created plan
      const result = await queryWithTenant<{
        id: string;
        sermon_id: string;
        title: string;
        big_idea: string | null;
        primary_text: string | null;
        supporting_texts: string[] | null;
        elements: SermonElement[];
        tags: string[] | null;
        notes: string | null;
        template_id: string | null;
        style_profile: SermonStyleProfile | null;
        created_at: Date;
        updated_at: Date;
      }>(
        tenantId,
        `SELECT * FROM sermon_plan WHERE id = $1`,
        [planId]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        sermonId: row.sermon_id,
        title: row.title,
        bigIdea: row.big_idea || '',
        primaryText: row.primary_text || '',
        supportingTexts: row.supporting_texts || [],
        elements: row.elements || [],
        tags: row.tags || [],
        notes: row.notes,
        templateId: row.template_id,
        styleProfile: row.style_profile,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      } as SermonPlan;
    }),

  // ============================================================================
  // SERMON TEMPLATE ENDPOINTS (Phase 5)
  // ============================================================================

  /**
   * List all sermon templates for the current tenant.
   */
  listTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant<{
        id: string;
        name: string;
        default_title: string | null;
        default_primary_text: string | null;
        tags: string[] | null;
        style_profile: SermonStyleProfile | null;
        created_at: Date;
      }>(
        tenantId,
        `SELECT id, name, default_title, default_primary_text, tags, style_profile, created_at
         FROM sermon_template
         ORDER BY created_at DESC`
      );

      return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        defaultTitle: row.default_title || '',
        defaultPrimaryText: row.default_primary_text || '',
        tags: row.tags || [],
        styleProfile: row.style_profile,
        createdAt: row.created_at.toISOString(),
      }));
    }),

  /**
   * Get a single template by ID.
   */
  getTemplate: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;

      const result = await queryWithTenant<{
        id: string;
        tenant_id: string;
        name: string;
        default_title: string | null;
        default_big_idea: string | null;
        default_primary_text: string | null;
        default_supporting_texts: string[] | null;
        structure: SermonElement[];
        tags: string[] | null;
        style_profile: SermonStyleProfile | null;
        created_at: Date;
        updated_at: Date;
      }>(
        tenantId,
        `SELECT * FROM sermon_template WHERE id = $1`,
        [input.templateId]
      );

      if (result.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Template not found',
        });
      }

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        defaultTitle: row.default_title || '',
        defaultBigIdea: row.default_big_idea || '',
        defaultPrimaryText: row.default_primary_text || '',
        defaultSupportingTexts: row.default_supporting_texts || [],
        structure: row.structure || [],
        tags: row.tags || [],
        styleProfile: row.style_profile,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      } as SermonTemplate;
    }),

  /**
   * Create a template from an existing sermon's plan.
   */
  createTemplateFromPlan: editorProcedure
    .input(
      z.object({
        sermonId: z.string().uuid(),
        name: z.string().min(1).max(200),
        tags: z.array(z.string()).default([]),
        styleProfile: SermonStyleProfileSchema.nullish(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const tenantId = ctx.tenantId!;
      const { sermonId, name, tags, styleProfile } = input;

      // Fetch the sermon plan
      const planResult = await queryWithTenant<{
        title: string;
        big_idea: string | null;
        primary_text: string | null;
        supporting_texts: string[] | null;
        elements: SermonElement[];
        tags: string[] | null;
        style_profile: SermonStyleProfile | null;
      }>(
        tenantId,
        `SELECT title, big_idea, primary_text, supporting_texts, elements, tags, style_profile
         FROM sermon_plan WHERE sermon_id = $1`,
        [sermonId]
      );

      if (planResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No plan found for this sermon. Please save a plan first.',
        });
      }

      const plan = planResult.rows[0];

      // Use provided styleProfile if set, otherwise inherit from plan
      const effectiveStyleProfile = styleProfile !== undefined ? styleProfile : plan.style_profile;

      // Create the template
      const insertResult = await queryWithTenant<{ id: string }>(
        tenantId,
        `INSERT INTO sermon_template (
          tenant_id, name, default_title, default_big_idea, default_primary_text,
          default_supporting_texts, structure, tags, style_profile
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id`,
        [
          tenantId,
          name,
          plan.title,
          plan.big_idea,
          plan.primary_text,
          plan.supporting_texts || [],
          JSON.stringify(plan.elements || []),
          tags.length > 0 ? tags : (plan.tags || []),
          effectiveStyleProfile || null,
        ]
      );

      const templateId = insertResult.rows[0].id;

      logger.info('[SermonHelper] Template created from plan', {
        sermonId,
        templateId,
        name,
        styleProfile: effectiveStyleProfile,
        tenantId,
      });

      // Return the created template
      const result = await queryWithTenant<{
        id: string;
        tenant_id: string;
        name: string;
        default_title: string | null;
        default_big_idea: string | null;
        default_primary_text: string | null;
        default_supporting_texts: string[] | null;
        structure: SermonElement[];
        tags: string[] | null;
        style_profile: SermonStyleProfile | null;
        created_at: Date;
        updated_at: Date;
      }>(
        tenantId,
        `SELECT * FROM sermon_template WHERE id = $1`,
        [templateId]
      );

      const row = result.rows[0];
      return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        defaultTitle: row.default_title || '',
        defaultBigIdea: row.default_big_idea || '',
        defaultPrimaryText: row.default_primary_text || '',
        defaultSupportingTexts: row.default_supporting_texts || [],
        structure: row.structure || [],
        tags: row.tags || [],
        styleProfile: row.style_profile,
        createdAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      } as SermonTemplate;
    }),

  // ============================================================================
  // MANUSCRIPT IMPORT ENDPOINT (Phase 5)
  // ============================================================================

  /**
   * Import sermon outline from manuscript text using AI.
   * Returns a draft plan for user review before saving.
   *
   * NOTE: Manuscript text is NOT stored. Only extracted outline is returned.
   */
  importFromManuscript: editorProcedure
    .input(
      z.object({
        sermonId: z.string().uuid(),
        manuscriptText: z.string().min(100).max(50000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 1. Verify AI is configured
      const apiKey = await assertAiConfigured();

      // 2. Check tenant AI quota
      await ensureAiQuotaAvailable(ctx);

      const tenantId = ctx.tenantId!;
      const { sermonId, manuscriptText } = input;

      logger.info('[SermonHelper] Manuscript import request', {
        sermonId,
        textLength: manuscriptText.length,
        tenantId,
      });

      // 3. Verify sermon exists
      const sermonCheck = await queryWithTenant<{ id: string; title: string }>(
        tenantId,
        `SELECT id, title FROM sermon WHERE id = $1 AND deleted_at IS NULL`,
        [sermonId]
      );

      if (sermonCheck.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sermon not found',
        });
      }

      // 4. Fetch org branding with theology profile
      const branding = await getOrgBranding(tenantId);
      const churchName = branding.churchName || branding.legalName;
      const theologyProfile = branding.theologyProfile;

      // 5. Build AI prompt for manuscript extraction
      const systemPrompt = `You are a sermon manuscript analyzer for the church "${churchName}".

Your task is to extract a structured sermon outline from a manuscript text.

Theological Profile:
- Tradition: ${theologyProfile.tradition}
- Preferred Bible translation: ${theologyProfile.bibleTranslation}

RULES:
1. Extract the main structural elements from the manuscript
2. Identify the primary scripture text (the main passage being preached)
3. Identify supporting/secondary scripture references
4. Extract the big idea or main thesis
5. Create a structured outline with sections and points
6. Keep point labels concise (3-10 words)
7. Do NOT include the full manuscript text in the output
8. Only include scripture REFERENCES (e.g., "John 3:16"), not full verse text

Output a single JSON object with this exact structure (no markdown fences):`;

      const userPrompt = `Extract a sermon outline from this manuscript:

---
${manuscriptText}
---

Return ONLY a JSON object with this structure:
{
  "title": "Sermon title (extract from manuscript or infer)",
  "bigIdea": "Main thesis in one sentence (max 100 words)",
  "primaryText": "Main scripture reference (e.g., 'Luke 1:26-38')",
  "supportingTexts": ["Supporting reference 1", "Supporting reference 2"],
  "elements": [
    { "id": "uuid-1", "type": "section", "title": "Section Name" },
    { "id": "uuid-2", "type": "point", "text": "Main point (3-10 words)" },
    { "id": "uuid-3", "type": "scripture", "reference": "John 3:16", "note": "Optional context" },
    { "id": "uuid-4", "type": "note", "text": "Important observation" }
  ]
}

- Generate unique UUIDs for each element
- Include 3-8 outline elements
- Mix sections, points, scriptures, and notes as appropriate
- Do NOT use markdown fences in your response`;

      // 6. Call OpenAI
      const MODEL = 'gpt-4o-mini';
      let rawResponse: string;
      let usage: OpenAIUsage | null = null;

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.5,
            max_tokens: 3000,
            response_format: { type: 'json_object' },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          logger.error('[SermonHelper] OpenAI API error during manuscript import', {
            status: response.status,
            error: errorData,
          });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'AI service temporarily unavailable. Please try again.',
          });
        }

        const data = await response.json() as {
          choices?: { message?: { content?: string } }[];
          usage?: OpenAIUsage;
        };

        rawResponse = data.choices?.[0]?.message?.content?.trim() || '';
        usage = data.usage || null;

        if (!rawResponse) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'AI service returned empty response.',
          });
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('[SermonHelper] OpenAI call failed during manuscript import', { error });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to process manuscript. Please try again.',
        });
      }

      // 7. Parse and validate response
      let cleaned = rawResponse.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      cleaned = cleaned.trim();

      let parsed: unknown;
      try {
        parsed = JSON.parse(cleaned);
      } catch (parseError) {
        logger.error('[SermonHelper] Failed to parse manuscript import response', {
          error: parseError,
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to parse AI response. Please try again.',
        });
      }

      // Validate the structure
      const draftSchema = z.object({
        title: z.string().max(200).default(''),
        bigIdea: z.string().max(500).default(''),
        primaryText: z.string().max(100).default(''),
        supportingTexts: z.array(z.string()).default([]),
        elements: z.array(SermonElementSchema).default([]),
      });

      const validated = draftSchema.safeParse(parsed);
      if (!validated.success) {
        logger.error('[SermonHelper] Manuscript import response validation failed', {
          errors: validated.error.issues,
        });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'AI returned invalid structure. Please try again.',
        });
      }

      // 8. Log usage
      if (usage) {
        await logAiUsage(
          tenantId,
          'sermon.manuscriptImport',
          MODEL,
          usage.prompt_tokens,
          usage.completion_tokens,
          { sermonId, elementsExtracted: validated.data.elements.length }
        );
      }

      logger.info('[SermonHelper] Manuscript import successful', {
        sermonId,
        elementsExtracted: validated.data.elements.length,
        tokensUsed: usage ? usage.prompt_tokens + usage.completion_tokens : 0,
      });

      // 9. Return draft for user review
      const draft: SermonPlanDraft = {
        sermonId,
        title: validated.data.title || sermonCheck.rows[0].title,
        bigIdea: validated.data.bigIdea,
        primaryText: validated.data.primaryText,
        supportingTexts: validated.data.supportingTexts,
        elements: validated.data.elements,
        tags: ['imported'],
      };

      return {
        draft,
        meta: {
          tokensUsed: usage ? usage.prompt_tokens + usage.completion_tokens : undefined,
          model: MODEL,
          extractedElementsCount: validated.data.elements.length,
        },
      };
    }),

  // ============================================================================
  // PREACHING DRAFT GENERATION (Phase 8)
  // ============================================================================

  /**
   * Generate a preaching draft from an existing SermonPlan.
   *
   * This endpoint:
   * 1. Fetches the sermon and its plan
   * 2. Applies theology guardrails (restricted topic check on plan content)
   * 3. Generates a markdown manuscript using AI
   * 4. Filters political content from the result
   * 5. Returns an ephemeral SermonDraft (not persisted)
   *
   * The draft is optimized for oral delivery and respects the plan's styleProfile.
   */
  generateDraftFromPlan: editorProcedure
    .input(z.object({ sermonId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      // 1. Verify AI is configured
      const apiKey = await assertAiConfigured();

      // 2. Check tenant AI quota
      await ensureAiQuotaAvailable(ctx);

      const tenantId = ctx.tenantId!;
      const { sermonId } = input;

      logger.info('[SermonHelper] Draft generation request', { sermonId, tenantId });

      // 3. Fetch sermon data
      const sermonResult = await queryWithTenant<{
        id: string;
        title: string;
        primary_scripture: string | null;
      }>(
        tenantId,
        `SELECT id, title, primary_scripture FROM sermon WHERE id = $1 AND deleted_at IS NULL`,
        [sermonId]
      );

      if (sermonResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Sermon not found',
        });
      }

      // 4. Fetch the sermon plan
      const planResult = await queryWithTenant<{
        id: string;
        title: string;
        big_idea: string | null;
        primary_text: string | null;
        supporting_texts: string[] | null;
        elements: SermonElement[];
        style_profile: SermonStyleProfile | null;
      }>(
        tenantId,
        `SELECT id, title, big_idea, primary_text, supporting_texts, elements, style_profile
         FROM sermon_plan WHERE sermon_id = $1`,
        [sermonId]
      );

      if (planResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'No sermon plan found. Please create a plan first before generating a draft.',
        });
      }

      const planRow = planResult.rows[0];
      const plan = {
        title: planRow.title,
        bigIdea: planRow.big_idea || '',
        primaryText: planRow.primary_text || '',
        supportingTexts: planRow.supporting_texts || [],
        elements: planRow.elements || [],
        styleProfile: planRow.style_profile,
      };

      // 5. Fetch org branding with theology profile
      const branding = await getOrgBranding(tenantId);
      const churchName = branding.churchName || branding.legalName;
      const theologyProfile = branding.theologyProfile;

      // 6. GUARDRAIL: Check for restricted topics in plan content
      // Build content string from plan fields for topic detection
      const planContentForTopicCheck = [
        plan.title,
        plan.bigIdea,
        plan.primaryText,
        ...plan.supportingTexts,
        ...plan.elements.map(el => {
          switch (el.type) {
            case 'section': return el.title;
            case 'point': return el.text;
            case 'note': return el.text;
            case 'scripture': return `${el.reference} ${el.note || ''}`;
            case 'hymn': return `${el.title} ${el.note || ''}`;
            case 'illustration': return `${el.title} ${el.note || ''}`;
            default: return '';
          }
        }),
      ].filter(Boolean).join(' ');

      const matchedRestrictedTopic = checkRestrictedTopics(
        planContentForTopicCheck,
        theologyProfile.restrictedTopics
      );

      if (matchedRestrictedTopic) {
        logger.info('[SermonHelper] Guardrail: Restricted topic in plan - draft generation skipped', {
          event: 'sermonHelper.draftRestrictedTopic',
          tenantId,
          sermonId,
        });

        // Log as usage event with zero tokens
        await logAiUsage(
          tenantId,
          'sermon.generateDraft',
          'none',
          0,
          0,
          { sermonId, restrictedTopicTriggered: true }
        );

        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Draft generation is disabled for sermons containing restricted topics. Please handle this content personally.',
        });
      }

      // 7. Build prompts
      const systemPrompt = buildTheologyAwareSystemPrompt(churchName, theologyProfile);
      const userPrompt = buildDraftPrompt(plan, theologyProfile);

      // 8. Call OpenAI (using gpt-4o for better long-form content)
      const MODEL = 'gpt-4o-mini';
      let rawResponse: string;
      let usage: OpenAIUsage | null = null;

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: MODEL,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 4000,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          logger.error('[SermonHelper] OpenAI API error during draft generation', {
            status: response.status,
            error: errorData,
          });
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'AI service temporarily unavailable. Please try again.',
          });
        }

        const data = await response.json() as {
          choices?: { message?: { content?: string } }[];
          usage?: OpenAIUsage;
        };

        rawResponse = data.choices?.[0]?.message?.content?.trim() || '';
        usage = data.usage || null;

        if (!rawResponse) {
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'AI service returned empty response.',
          });
        }
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        logger.error('[SermonHelper] OpenAI call failed during draft generation', { error });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to generate draft. Please try again.',
        });
      }

      // 9. Parse and validate response
      const { markdown, valid } = parseDraftResponse(rawResponse);

      if (!valid) {
        logger.error('[SermonHelper] Draft response validation failed - too short');
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'AI generated incomplete draft. Please try again.',
        });
      }

      // 10. GUARDRAIL: Filter political content
      const { filtered: filteredMarkdown, detected: politicalContentDetected } =
        filterPoliticalContentFromDraft(markdown);

      if (politicalContentDetected) {
        logger.info('[SermonHelper] Guardrail: Political content filtered from draft', {
          event: 'sermonHelper.draftPoliticalFiltered',
          tenantId,
          sermonId,
        });
      }

      // 11. Log usage
      if (usage) {
        await logAiUsage(
          tenantId,
          'sermon.generateDraft',
          MODEL,
          usage.prompt_tokens,
          usage.completion_tokens,
          { sermonId, styleProfile: plan.styleProfile, politicalContentDetected }
        );
      }

      logger.info('[SermonHelper] Draft generated successfully', {
        sermonId,
        styleProfile: plan.styleProfile,
        markdownLength: filteredMarkdown.length,
        tokensUsed: usage ? usage.prompt_tokens + usage.completion_tokens : 0,
        politicalContentDetected,
      });

      // 12. Build and return SermonDraft
      const draft: SermonDraft = {
        sermonId,
        styleProfile: plan.styleProfile,
        theologyTradition: theologyProfile.tradition,
        createdAt: new Date().toISOString(),
        contentMarkdown: filteredMarkdown,
      };

      return {
        draft,
        meta: {
          tokensUsed: usage ? usage.prompt_tokens + usage.completion_tokens : undefined,
          model: MODEL,
          politicalContentDetected: politicalContentDetected || undefined,
        },
      };
    }),
});
