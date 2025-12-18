import { router, editorProcedure, protectedProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { db, queryWithTenant } from '../db';
import { logger } from '../utils/logger';
import { decryptSecret, isEncryptionConfigured } from '../utils/encryption';
import { getAiQuotaStatusForTenant } from '../utils/aiQuota';
import { Context } from '../context';
import {
  SuggestBigIdeaResponseSchema,
  SuggestOutlineResponseSchema,
  ShortenTextResponseSchema,
  AiFeature,
  AiQuotaStatus,
} from '@elder-first/types';

// OpenAI usage data from response
interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Result with usage data for tracking
interface OpenAIResultWithUsage<T> {
  data: T;
  usage: {
    model: string;
    tokensIn: number;
    tokensOut: number;
  };
}

// Types for ai_settings table
interface AiSettingsRow {
  id: string;
  provider: string;
  api_key_encrypted: string | null;
  enabled: boolean;
}

/**
 * Determines the deployment environment.
 *
 * Uses DEPLOY_ENV if set (explicit deployment target), otherwise falls back to NODE_ENV.
 * - Local development: NODE_ENV=development (no DEPLOY_ENV needed)
 * - Staging: DEPLOY_ENV=staging (NODE_ENV may be "production" for build optimization)
 * - Production: DEPLOY_ENV=production
 */
function getDeployEnv(): string {
  return process.env.DEPLOY_ENV ?? process.env.NODE_ENV ?? 'development';
}

/**
 * Check if the current environment allows AI features.
 *
 * AI POLICY:
 * - Local dev (NODE_ENV=development): AI allowed
 * - Staging (DEPLOY_ENV=staging): AI allowed
 * - Production (DEPLOY_ENV=production): AI ALWAYS disabled
 */
function isAiAllowedInEnvironment(): boolean {
  const deployEnv = getDeployEnv();
  return (
    deployEnv === 'development' ||
    deployEnv === 'dev' ||
    deployEnv === 'staging'
  );
}

/**
 * Get the effective API key from the database, applying environment gating.
 *
 * Returns null if:
 * - Environment is production (AI blocked)
 * - AI is disabled in settings
 * - No API key is stored
 * - Decryption fails
 *
 * @returns The decrypted API key, or null if AI is not available
 */
async function getEffectiveApiKey(): Promise<string | null> {
  // 1. Environment gate - production always blocks AI
  if (!isAiAllowedInEnvironment()) {
    return null;
  }

  // 2. Check encryption is configured (needed to decrypt stored key)
  if (!isEncryptionConfigured()) {
    logger.warn('[AI] APP_ENCRYPTION_KEY not set; cannot decrypt stored API key');
    return null;
  }

  try {
    // 3. Fetch ai_settings singleton from DB
    const result = await db.query<AiSettingsRow>(
      'SELECT enabled, api_key_encrypted FROM ai_settings LIMIT 1'
    );

    if (result.rows.length === 0) {
      return null;
    }

    const settings = result.rows[0];

    // 4. Check if AI is enabled and key exists
    if (!settings.enabled || !settings.api_key_encrypted) {
      return null;
    }

    // 5. Decrypt the key
    try {
      const apiKey = decryptSecret(settings.api_key_encrypted);
      return apiKey || null;
    } catch (error) {
      logger.error('[AI] Failed to decrypt API key from database');
      return null;
    }
  } catch (error) {
    logger.error('[AI] Failed to fetch AI settings from database', { error });
    return null;
  }
}

/**
 * Check if AI services are configured and allowed in this environment.
 * This is an async check that queries the database.
 */
async function isAiConfigured(): Promise<boolean> {
  const apiKey = await getEffectiveApiKey();
  return !!apiKey;
}

/**
 * Assert that AI services are configured and allowed.
 * Returns the API key if successful.
 * Throws PRECONDITION_FAILED if not configured or not allowed in this environment.
 */
async function assertAiConfigured(): Promise<string> {
  const deployEnv = getDeployEnv();

  // Check environment first (fast, no DB query)
  if (!isAiAllowedInEnvironment()) {
    logger.warn('AI operation blocked in production environment');
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'AI features are disabled in production.',
    });
  }

  const apiKey = await getEffectiveApiKey();

  if (!apiKey) {
    logger.warn('AI operation attempted but not configured', { deployEnv });
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: 'AI features are not configured. Please configure AI in Settings.',
    });
  }

  return apiKey;
}

/**
 * Log AI usage to the database.
 * Best-effort: failures are logged but don't disrupt the main operation.
 *
 * @param tenantId - The tenant ID
 * @param feature - The AI feature used (from AiFeature enum)
 * @param model - The model used (e.g., 'gpt-4o-mini')
 * @param tokensIn - Number of prompt tokens
 * @param tokensOut - Number of completion tokens
 * @param meta - Optional metadata (e.g., sermonId, bulletinId)
 */
async function logAiUsage(
  tenantId: string,
  feature: AiFeature,
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
    logger.debug('[AI Usage] Logged usage event', { tenantId, feature, model, tokensIn, tokensOut });
  } catch (error) {
    // Best-effort logging - don't fail the main operation
    logger.warn('[AI Usage] Failed to log usage event', { error, tenantId, feature });
  }
}

/**
 * Ensure tenant has available AI quota before making an AI call.
 *
 * Checks:
 * 1. AI is enabled for the tenant
 * 2. Tenant hasn't exceeded their monthly token limit
 *
 * @param ctx - The request context
 * @returns The quota status if checks pass
 * @throws FORBIDDEN if AI is disabled or quota exceeded
 */
async function ensureAiQuotaAvailable(ctx: Context): Promise<AiQuotaStatus> {
  const quota = await getAiQuotaStatusForTenant(ctx);

  if (!quota.enabled) {
    logger.warn('[AI Quota] AI features disabled for tenant', { tenantId: ctx.tenantId });
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'AI features are disabled for this tenant.',
    });
  }

  if (quota.overLimit) {
    logger.warn('[AI Quota] Monthly limit reached for tenant', {
      tenantId: ctx.tenantId,
      usedTokens: quota.usedTokens,
      limitTokens: quota.limitTokens,
    });
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Monthly AI usage limit reached for this tenant.',
    });
  }

  return quota;
}

const TextGenerationMode = z.enum([
  'welcome',
  'sermon_summary',
  'reflection',
  'announcements',
  'social_blurb',
]);

type TextGenerationMode = z.infer<typeof TextGenerationMode>;

// Length limits per mode
const MODE_WORD_LIMITS: Record<TextGenerationMode, { min: number; max: number }> = {
  welcome: { min: 80, max: 150 },
  sermon_summary: { min: 120, max: 250 },
  reflection: { min: 80, max: 180 },
  announcements: { min: 80, max: 200 },
  social_blurb: { min: 30, max: 80 },
};

/**
 * OpenAI API wrapper for JSON responses (used by Sermon Builder)
 * Returns both the parsed data and usage information for tracking.
 *
 * @param apiKey - The OpenAI API key (from assertAiConfigured)
 * @param systemPrompt - The system prompt
 * @param userPrompt - The user prompt
 * @param schema - Zod schema to validate the response
 */
async function callOpenAIForJSON<T>(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  schema: z.ZodSchema<T>
): Promise<OpenAIResultWithUsage<T>> {
  const MODEL = 'gpt-4o-mini';
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
        max_tokens: 1500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('OpenAI API error', { status: response.status, error: errorData });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'AI service temporarily unavailable. Please try again.',
      });
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[];
      usage?: OpenAIUsage;
      model?: string;
    };
    const generatedText = data.choices?.[0]?.message?.content?.trim();

    if (!generatedText) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'AI service returned empty response.',
      });
    }

    // Parse and validate JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(generatedText);
    } catch (parseError) {
      logger.error('Failed to parse AI JSON response', { generatedText });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'AI service returned invalid response. Please try again.',
      });
    }

    // Validate against schema
    const result = schema.safeParse(parsed);
    if (!result.success) {
      logger.error('AI response failed schema validation', { parsed, errors: result.error });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'AI service returned unexpected response format. Please try again.',
      });
    }

    // Extract usage information
    const usage = {
      model: data.model || MODEL,
      tokensIn: data.usage?.prompt_tokens ?? 0,
      tokensOut: data.usage?.completion_tokens ?? 0,
    };

    return { data: result.data, usage };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    logger.error('OpenAI API call failed', { error });
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to generate content. Please try again.',
    });
  }
}

/**
 * Simple OpenAI API wrapper
 * Returns both the generated text and usage information for tracking.
 *
 * @param apiKey - The OpenAI API key (from assertAiConfigured)
 * @param prompt - The user prompt
 * @param maxWords - Maximum words for the response
 */
async function callOpenAI(apiKey: string, prompt: string, maxWords: number): Promise<OpenAIResultWithUsage<string>> {
  const MODEL = 'gpt-4o-mini';
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
          {
            role: 'system',
            content: `You are a helpful assistant for a church bulletin editor. Generate concise, warm, faith-filled content. Maximum ${maxWords} words.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: maxWords * 2, // Rough token estimate
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('OpenAI API error', { status: response.status, error: errorData });
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'AI service temporarily unavailable. Please try again.',
      });
    }

    const data = await response.json() as {
      choices?: { message?: { content?: string } }[];
      usage?: OpenAIUsage;
      model?: string;
    };
    const generatedText = data.choices?.[0]?.message?.content?.trim();

    if (!generatedText) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'AI service returned empty response.',
      });
    }

    // Extract usage information
    const usage = {
      model: data.model || MODEL,
      tokensIn: data.usage?.prompt_tokens ?? 0,
      tokensOut: data.usage?.completion_tokens ?? 0,
    };

    return { data: generatedText, usage };
  } catch (error) {
    if (error instanceof TRPCError) {
      throw error;
    }
    logger.error('OpenAI API call failed', { error });
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to generate content. Please try again.',
    });
  }
}

/**
 * Build prompt based on mode and bulletin context
 */
function buildPrompt(
  mode: TextGenerationMode,
  context: {
    orgName: string;
    serviceDate: string;
    sermonTitle?: string;
    preacher?: string;
    scripture?: string;
    announcements?: string[];
    events?: string[];
  },
  userGuidance?: string
): string {
  const { orgName, serviceDate, sermonTitle, preacher, scripture, announcements, events } = context;

  let prompt = '';

  switch (mode) {
    case 'welcome':
      prompt = `Write a warm welcome paragraph for ${orgName}'s bulletin for ${serviceDate}.`;
      if (sermonTitle) {
        prompt += ` Today's message: "${sermonTitle}"`;
        if (preacher) {
          prompt += ` by ${preacher}`;
        }
      }
      prompt += '. Focus on inviting newcomers and expressing gratitude.';
      break;

    case 'sermon_summary':
      if (!sermonTitle) {
        prompt = `Write a brief sermon summary for ${serviceDate} at ${orgName}.`;
      } else {
        prompt = `Write a compelling summary for the sermon titled "${sermonTitle}"`;
        if (preacher) {
          prompt += ` by ${preacher}`;
        }
        if (scripture) {
          prompt += ` based on ${scripture}`;
        }
        prompt += `. Make it engaging and faith-building.`;
      }
      break;

    case 'reflection':
      prompt = `Write a reflective devotional paragraph for ${orgName}'s bulletin for ${serviceDate}.`;
      if (sermonTitle) {
        prompt += ` Connect it to today's sermon: "${sermonTitle}"`;
        if (scripture) {
          prompt += ` (${scripture})`;
        }
      }
      prompt += '. Include a practical application or encouragement.';
      break;

    case 'announcements':
      prompt = `Write a brief announcements summary for ${orgName} for ${serviceDate}.`;
      if (announcements && announcements.length > 0) {
        prompt += ` Key items: ${announcements.slice(0, 3).join('; ')}.`;
      }
      if (events && events.length > 0) {
        prompt += ` Upcoming events: ${events.slice(0, 2).join('; ')}.`;
      }
      prompt += ' Keep it warm and inviting.';
      break;

    case 'social_blurb':
      prompt = `Write a short social media post for ${orgName} about ${serviceDate}.`;
      if (sermonTitle) {
        prompt += ` Feature the sermon: "${sermonTitle}"`;
        if (scripture) {
          prompt += ` (${scripture})`;
        }
      }
      prompt += '. Make it engaging and shareable. Include a call to action like "Join us!"';
      break;
  }

  if (userGuidance) {
    prompt += `\n\nAdditional guidance: ${userGuidance}`;
  }

  return prompt;
}

export const aiRouter = router({
  /**
   * Check if AI services are configured.
   * Returns { enabled: boolean } so the UI can show/hide AI features.
   */
  aiConfig: protectedProcedure.query(async () => {
    return {
      enabled: await isAiConfigured(),
    };
  }),

  /**
   * Generate bulletin text content using AI
   */
  generateBulletinText: editorProcedure
    .input(
      z.object({
        bulletinId: z.string().uuid(),
        mode: TextGenerationMode,
        guidance: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 1. Verify AI is configured before proceeding and get the API key
      const apiKey = await assertAiConfigured();

      // 2. Check tenant AI quota
      await ensureAiQuotaAvailable(ctx);

      const { bulletinId, mode, guidance } = input;
      const tenantId = ctx.tenantId!;

      logger.info('[AI] Generate bulletin text request', {
        bulletinId,
        mode,
        tenantId,
        hasGuidance: !!guidance,
      });

      // Fetch bulletin and check permissions
      const bulletinQuery = `
        SELECT
          id,
          tenant_id,
          issue_date,
          status,
          locked_at
        FROM bulletin_issue
        WHERE id = $1 AND deleted_at IS NULL
      `;

      const bulletinResult = await queryWithTenant<{
        id: string;
        tenant_id: string;
        issue_date: Date;
        status: string;
        locked_at: Date | null;
      }>(tenantId, bulletinQuery, [bulletinId]);

      if (bulletinResult.rows.length === 0) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Bulletin not found',
        });
      }

      const bulletin = bulletinResult.rows[0];

      // Enforce lock state
      if (bulletin.status === 'locked' || bulletin.locked_at) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Cannot generate content for locked bulletin',
        });
      }

      // Fetch org info
      const orgQuery = `
        SELECT name FROM org WHERE tenant_id = $1
      `;
      const orgResult = await queryWithTenant<{ name: string }>(tenantId, orgQuery, []);
      const orgName = orgResult.rows[0]?.name || 'Our Church';

      // Fetch service items for sermon context
      const serviceItemsQuery = `
        SELECT
          type,
          title,
          content,
          scripture_ref,
          speaker
        FROM service_item
        WHERE bulletin_issue_id = $1 AND deleted_at IS NULL
        ORDER BY sequence ASC
      `;

      const itemsResult = await queryWithTenant<{
        type: string;
        title: string;
        content: string | null;
        scripture_ref: string | null;
        speaker: string | null;
      }>(tenantId, serviceItemsQuery, [bulletinId]);

      // Extract sermon info
      const sermonItem = itemsResult.rows.find(item => item.type === 'sermon');
      const sermonTitle = sermonItem?.title;
      const preacher = sermonItem?.speaker;
      const scripture = sermonItem?.scripture_ref;

      // Fetch announcements if needed
      let announcements: string[] = [];
      let events: string[] = [];

      if (mode === 'announcements' || mode === 'social_blurb') {
        const announcementsQuery = `
          SELECT title FROM announcement
          WHERE tenant_id = $1
            AND deleted_at IS NULL
            AND (expires_at IS NULL OR expires_at > NOW())
          ORDER BY priority DESC, created_at DESC
          LIMIT 5
        `;
        const announcementsResult = await queryWithTenant<{ title: string }>(tenantId, announcementsQuery, []);
        announcements = announcementsResult.rows.map(a => a.title);

        const eventsQuery = `
          SELECT title FROM event
          WHERE tenant_id = $1
            AND deleted_at IS NULL
            AND start_at >= NOW()
          ORDER BY start_at ASC
          LIMIT 3
        `;
        const eventsResult = await queryWithTenant<{ title: string }>(tenantId, eventsQuery, []);
        events = eventsResult.rows.map(e => e.title);
      }

      // Build context
      const serviceDate = new Date(bulletin.issue_date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });

      const context = {
        orgName,
        serviceDate,
        sermonTitle,
        preacher: preacher ?? undefined,
        scripture: scripture ?? undefined,
        announcements,
        events,
      };

      // Build prompt
      const prompt = buildPrompt(mode, context, guidance);

      // Call OpenAI
      const limits = MODE_WORD_LIMITS[mode];
      const { data: generatedText, usage } = await callOpenAI(apiKey, prompt, limits.max);

      // Log usage (best-effort)
      await logAiUsage(
        tenantId,
        'bulletin.generateText',
        usage.model,
        usage.tokensIn,
        usage.tokensOut,
        { bulletinId, mode }
      );

      logger.info('[AI] Generated text successfully', {
        bulletinId,
        mode,
        length: generatedText.length,
        tokensIn: usage.tokensIn,
        tokensOut: usage.tokensOut,
      });

      return {
        text: generatedText,
      };
    }),

  // ============================================================================
  // SERMON BUILDER AI ENDPOINTS
  // ============================================================================

  /**
   * Suggest a "Big Idea" from a Bible passage for sermon preparation.
   * Returns a main big idea and up to 3 alternatives.
   */
  suggestBigIdea: editorProcedure
    .input(
      z.object({
        passage: z.string().min(1).max(200),
        title: z.string().max(200).optional(),
        audienceFocus: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 1. Verify AI is configured before proceeding and get the API key
      const apiKey = await assertAiConfigured();

      // 2. Check tenant AI quota
      await ensureAiQuotaAvailable(ctx);

      const tenantId = ctx.tenantId!;

      const { passage, title, audienceFocus } = input;

      logger.info('[AI] Suggest big idea request', { passage, title });

      const systemPrompt = `You are helping a pastor write a sermon. Given the sermon text, working title, and audience, write ONE clear 'big idea' sentence and up to 3 alternative wordings. The big idea must be faithful to the text, short (one sentence), and in everyday language that a congregation can understand. Return ONLY valid JSON with keys "bigIdea" (string) and "alternatives" (string array, max 3 items).`;

      let userPrompt = `Bible Passage: ${passage}`;
      if (title) {
        userPrompt += `\nWorking Title: ${title}`;
      }
      if (audienceFocus) {
        userPrompt += `\nAudience: ${audienceFocus}`;
      }
      userPrompt += `\n\nGenerate a clear, memorable "big idea" for this sermon and provide a few alternative wordings.`;

      const { data: result, usage } = await callOpenAIForJSON(
        apiKey,
        systemPrompt,
        userPrompt,
        SuggestBigIdeaResponseSchema
      );

      // Log usage (best-effort)
      await logAiUsage(
        tenantId,
        'sermon.suggestBigIdea',
        usage.model,
        usage.tokensIn,
        usage.tokensOut,
        { passage }
      );

      logger.info('[AI] Generated big idea successfully', {
        passage,
        tokensIn: usage.tokensIn,
        tokensOut: usage.tokensOut,
      });

      return result;
    }),

  /**
   * Suggest a sermon outline from a Bible passage.
   * Returns a structured outline with main points.
   */
  suggestOutline: editorProcedure
    .input(
      z.object({
        passage: z.string().min(1).max(200),
        title: z.string().max(200).optional(),
        bigIdea: z.string().max(500).optional(),
        desiredPoints: z.number().int().min(2).max(5).default(3),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 1. Verify AI is configured before proceeding and get the API key
      const apiKey = await assertAiConfigured();

      // 2. Check tenant AI quota
      await ensureAiQuotaAvailable(ctx);

      const tenantId = ctx.tenantId!;

      const { passage, title, bigIdea, desiredPoints } = input;

      logger.info('[AI] Suggest outline request', { passage, desiredPoints });

      const systemPrompt = `You are helping a pastor build a simple sermon outline. Given the passage, title, and big idea, propose a ${desiredPoints}-point outline. Each point must include:
- "label": a short, memorable phrase (5-8 words max)
- "scriptureRef": the specific verses for this point (e.g., "Eph 2:1-3")
- "summary": 1-3 sentences explaining the point

Do NOT write a full manuscript. Focus on clear, biblical exposition that follows the text's flow.

Return ONLY valid JSON with the structure: { "mainPoints": [{ "label": string, "scriptureRef": string, "summary": string }] }`;

      let userPrompt = `Bible Passage: ${passage}`;
      if (title) {
        userPrompt += `\nSermon Title: ${title}`;
      }
      if (bigIdea) {
        userPrompt += `\nBig Idea: ${bigIdea}`;
      }
      userPrompt += `\n\nCreate a ${desiredPoints}-point sermon outline that faithfully expounds this passage.`;

      const { data: result, usage } = await callOpenAIForJSON(
        apiKey,
        systemPrompt,
        userPrompt,
        SuggestOutlineResponseSchema
      );

      // Log usage (best-effort)
      await logAiUsage(
        tenantId,
        'sermon.suggestOutline',
        usage.model,
        usage.tokensIn,
        usage.tokensOut,
        { passage, desiredPoints }
      );

      logger.info('[AI] Generated outline successfully', {
        passage,
        points: result.mainPoints?.length ?? 0,
        tokensIn: usage.tokensIn,
        tokensOut: usage.tokensOut,
      });

      return result;
    }),

  /**
   * Shorten/tighten a paragraph of text.
   * Useful for making sermon notes more concise.
   */
  shortenText: editorProcedure
    .input(
      z.object({
        text: z.string().min(1).max(5000),
        maxSentences: z.number().int().min(1).max(10).default(3),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 1. Verify AI is configured before proceeding and get the API key
      const apiKey = await assertAiConfigured();

      // 2. Check tenant AI quota
      await ensureAiQuotaAvailable(ctx);

      const tenantId = ctx.tenantId!;

      const { text, maxSentences } = input;

      logger.info('[AI] Shorten text request', { textLength: text.length, maxSentences });

      const systemPrompt = `You are editing a pastor's sermon notes. Tighten the following text to no more than ${maxSentences} sentences in a clear, conversational tone. Preserve the core meaning and any theological points. Do not add new ideas. Return ONLY valid JSON with the structure: { "shortened": string }`;

      const userPrompt = `Please tighten this text:\n\n${text}`;

      const { data: result, usage } = await callOpenAIForJSON(
        apiKey,
        systemPrompt,
        userPrompt,
        ShortenTextResponseSchema
      );

      // Log usage (best-effort)
      await logAiUsage(
        tenantId,
        'sermon.shortenText',
        usage.model,
        usage.tokensIn,
        usage.tokensOut,
        { originalLength: text.length, maxSentences }
      );

      logger.info('[AI] Shortened text successfully', {
        originalLength: text.length,
        shortenedLength: result.shortened.length,
        tokensIn: usage.tokensIn,
        tokensOut: usage.tokensOut,
      });

      return result;
    }),
});
