# Sermon Helper Backend Documentation

**Date:** 2025-12-05
**Status:** Phase 8 Complete (Generate Preaching Draft)
**Location:** `apps/api/src/routers/sermonHelper.ts`

## Overview

The Sermon Helper is an AI-powered feature that assists pastors in sermon preparation with **theological guardrails** driven by each church's configuration. All AI calls are server-side only, using OpenAI with church-specific theology profiles.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Phase 2)                        │
│  apps/web/src/app/sermons/[id]/                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼ tRPC call
┌─────────────────────────────────────────────────────────────────┐
│                   sermonHelperRouter                             │
│  apps/api/src/routers/sermonHelper.ts                           │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ getTheologyProfile│  │updateTheologyProfile│                  │
│  └──────────────────┘  └──────────────────┘                     │
│  ┌──────────────────┐  ┌──────────────────┐                     │
│  │ getAISuggestions │  │   searchHymns    │                     │
│  └──────────────────┘  └──────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                              │
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
┌──────────────┐    ┌──────────────────┐    ┌──────────────┐
│  brand_pack  │    │   ai_settings    │    │   sermon     │
│ (theology)   │    │ (API key enc.)   │    │   (data)     │
└──────────────┘    └──────────────────┘    └──────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  OpenAI API      │
                    │  (gpt-4o-mini)   │
                    └──────────────────┘
```

## Theology Profile

### Database Schema

Location: `packages/database/migrations/036_add_theology_profile_to_brand_pack.sql`

```sql
ALTER TABLE brand_pack
ADD COLUMN theology_tradition VARCHAR(100) DEFAULT 'Non-denominational evangelical',
ADD COLUMN theology_bible_translation VARCHAR(20) DEFAULT 'ESV',
ADD COLUMN theology_sermon_style VARCHAR(50) DEFAULT 'expository',
ADD COLUMN theology_sensitivity VARCHAR(20) DEFAULT 'moderate',
ADD COLUMN theology_restricted_topics TEXT[] DEFAULT '{}',
ADD COLUMN theology_preferred_tone VARCHAR(100) DEFAULT 'warm and pastoral';
```

### Field Reference

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `tradition` | enum | `Non-denominational evangelical` | Church's theological tradition |
| `bibleTranslation` | enum | `ESV` | Preferred Bible translation for references |
| `sermonStyle` | enum | `expository` | Preaching approach |
| `sensitivity` | enum | `moderate` | How cautious AI should be |
| `restrictedTopics` | string[] | `[]` | Topics AI should avoid |
| `preferredTone` | string | `warm and pastoral` | AI's communication style |

### Supported Values

**Traditions:**
- Non-denominational evangelical
- Reformed Baptist
- Southern Baptist
- Presbyterian (PCA)
- Presbyterian (PCUSA)
- Anglican/Episcopal
- Lutheran (LCMS)
- Lutheran (ELCA)
- Methodist
- Pentecostal/Charismatic
- Church of Christ
- Catholic
- Orthodox
- Other

**Bible Translations:**
- ESV, NIV, CSB, NASB, KJV, NKJV, NLT, RSV, NRSV, MSG

**Sermon Styles:**
- `expository` - Verse-by-verse through a passage
- `topical` - Theme-based from multiple passages
- `textual` - Single passage exposition
- `narrative` - Story-driven approach

**Sensitivity Levels:**
- `conservative` - Very cautious, avoid most controversial topics
- `moderate` - Balanced approach, handle with care
- `broad` - More latitude, assume mature audience

### Helper Function

Location: `apps/api/src/lib/orgBranding.ts`

```typescript
import { getOrgBranding } from '../lib/orgBranding';

const branding = await getOrgBranding(tenantId);
const theologyProfile = branding.theologyProfile;
```

Returns the theology profile merged with safe defaults if fields are null.

## API Endpoints

### 1. `sermonHelper.getTheologyProfile`

**Access:** All authenticated users (`protectedProcedure`)

**Input:** None

**Returns:**
```typescript
{
  tradition: string;
  bibleTranslation: string;
  sermonStyle: string;
  sensitivity: string;
  restrictedTopics: string[];
  preferredTone: string;
}
```

---

### 2. `sermonHelper.updateTheologyProfile`

**Access:** Admin only (`adminProcedure`)

**Input:**
```typescript
{
  tradition?: TheologyTradition;
  bibleTranslation?: BibleTranslation;
  sermonStyle?: SermonStyle;
  sensitivity?: TheologySensitivity;
  restrictedTopics?: string[];  // max 20 items, each max 100 chars
  preferredTone?: string;       // max 100 chars
}
```

**Returns:** Updated `TheologyProfile`

---

### 3. `sermonHelper.getAISuggestions`

**Access:** Editor role required (`editorProcedure`)

**Input:**
```typescript
{
  sermonId: string;   // UUID
  theme: string;      // 1-500 chars
  notes?: string;     // max 2000 chars
}
```

**Returns:**
```typescript
{
  suggestions: {
    scriptureSuggestions: Array<{
      reference: string;  // e.g., "John 3:16-18"
      reason: string;     // max 25 words
    }>;
    outline: Array<{
      type: 'section' | 'point';
      title?: string;
      text?: string;
    }>;
    applicationIdeas: Array<{
      audience: 'believers' | 'seekers' | 'youth' | 'families' | 'all';
      idea: string;       // max 35 words
    }>;
    hymnThemes: Array<{
      theme: string;      // e.g., "grace", "cross", "resurrection"
      reason: string;     // max 20 words
    }>;
    illustrationSuggestions?: Array<{  // Phase 7 addition
      id: string;         // unique identifier
      title: string;      // illustration title
      summary: string;    // brief summary of the illustration
      forSection?: string | null;  // target section (e.g., "Introduction")
    }>;
  };
  meta: {
    fallback: boolean;              // true if JSON parsing failed
    tokensUsed?: number;
    model?: string;                 // "gpt-4o-mini"
    restrictedTopicTriggered?: boolean;  // true if input matched a restricted topic
    politicalContentDetected?: boolean;  // true if political content was filtered
  };
}
```

**Error Codes:**
- `PRECONDITION_FAILED` - AI not configured or disabled in production
- `FORBIDDEN` - Tenant AI disabled or quota exceeded
- `NOT_FOUND` - Sermon not found
- `INTERNAL_SERVER_ERROR` - OpenAI API error

---

### 4. `sermonHelper.generateDraftFromPlan` (Phase 8)

**Access:** Editor role required (`editorProcedure`)

**Description:** Generates a full preaching manuscript (markdown) from an existing SermonPlan. The draft is ephemeral (not stored in DB) and can be copied for use in the pastor's preferred word processor.

**Input:**
```typescript
{
  sermonId: string;   // UUID of sermon with existing SermonPlan
}
```

**Returns:**
```typescript
{
  draft: {
    sermonId: string;            // Same as input
    styleProfile: SermonStyleProfile | null;  // From plan or null
    theologyTradition: string | null;         // From church profile
    createdAt: string;           // ISO timestamp
    contentMarkdown: string;     // Full manuscript in markdown
  };
  meta: {
    tokensUsed: number;
    model: string;               // "gpt-4o-mini"
    politicalContentDetected?: boolean;  // true if content was filtered
  };
}
```

**Error Codes:**
- `NOT_FOUND` - No sermon plan found for this sermon
- `FORBIDDEN` - Restricted topic detected in plan content
- `PRECONDITION_FAILED` - AI not configured or disabled
- `INTERNAL_SERVER_ERROR` - OpenAI API error

**Guardrails:**
- Plan content is checked for restricted topics BEFORE calling OpenAI
- Political content is filtered from generated manuscript
- Theology profile shapes the AI prompt and tone
- Style profile (story_first, expository, topical) tailors the manuscript structure

**Prompt Construction:**
The system prompt includes:
1. Church name and theology profile
2. Style-specific manuscript guidance:
   - `story_first_3_point`: Lead with illustrations, emotional narrative flow
   - `expository_verse_by_verse`: Text-focused, historical context emphasis
   - `topical_teaching`: Contemporary applications, practical structure
3. Bible translation preference
4. Preferred tone (warm and pastoral, direct and challenging, etc.)

**Response Validation:**
- Markdown fences are stripped from response
- Minimum length check (200 characters) to detect incomplete responses
- Political keywords are replaced with `[content filtered]`

---

### 5. `sermonHelper.searchHymns`

**Access:** All authenticated users (`protectedProcedure`)

**Input:**
```typescript
{
  query: string;  // 1-200 chars
  limit?: number; // 1-50, default 10
}
```

**Returns:**
```typescript
Array<{
  id: string;
  title: string;
  alternateTitle: string | null;
  hymnNumber: string | null;
  hymnalCode: string | null;
  tuneName: string | null;
  author: string | null;
  isPublicDomain: boolean;
  ccliNumber: string | null;
}>
```

## System Prompt Construction

The AI system prompt is built dynamically from the church's theology profile. Location: `sermonHelper.ts:146-183`

### Template

```
You are a sermon preparation assistant for the church "{churchName}".

Theological Profile:
- Tradition: {tradition}
- Preferred Bible translation: {bibleTranslation}
- Sermon style: {sermonStyle}
- Sensitivity level: {sensitivity}
- Restricted topics: {restrictedTopicsList}
- Preferred tone: {preferredTone}

RULES (Non-negotiable):
1. Stay within mainstream {tradition} theology...
2. Return ONLY scripture references, NOT full verse text...
3. Avoid restricted topics unless explicitly requested...
4. No partisan politics or culture-war framing...
5. Keep suggestions pastoral, humble, and helpful...
6. Keep outline points concise (3-7 words each)...
7. For "{sensitivity}" sensitivity level, [specific guidance]...

Output format:
- Always return a single JSON object...
- Do not include markdown fences or explanation...
- Do not include actual Bible verse text...
```

### Sensitivity-Specific Guidance

- **Conservative:** "be very cautious with any topic that could be divisive or controversial"
- **Moderate:** "handle potentially sensitive topics with care and balance"
- **Broad:** "provide more latitude for mature theological discussion, while still avoiding extremes"

## User Prompt Construction

Location: `sermonHelper.ts:188-251`

The user prompt includes:
- Theme or big idea (required)
- Primary scripture (if set on sermon)
- Sermon title
- Series title
- Sermon date
- Preacher name
- Additional notes from pastor

And explicitly requests a JSON response with:
- 2-4 scripture suggestions
- 3-5 outline elements
- 2-4 application ideas
- 2-3 hymn themes
- 2-3 illustration suggestions (shaped by styleProfile)

### Style-Aware Illustration Guidance (Phase 7)

Location: `sermonHelper.ts:getIllustrationStyleGuidance()`

The AI prompt includes tailored guidance for illustrations based on the sermon's `styleProfile`:

| Style Profile | Illustration Guidance |
|---------------|----------------------|
| `story_first_3_point` | Prioritize narrative illustrations and personal stories that connect emotionally. Lead with the story before the principle. |
| `expository_verse_by_verse` | Focus on illustrations that illuminate the text's original context, historical background, or word meanings. Keep illustrations brief and text-focused. |
| `topical_teaching` | Use illustrations that relate to contemporary life situations and practical application of the topic being taught. |
| (default/null) | Provide versatile illustrations that can work with various preaching styles. |

The `styleProfile` is read from the sermon plan (if saved) and passed to the AI prompt builder, ensuring illustration suggestions match the preaching approach.

## JSON Response Parsing

Location: `sermonHelper.ts:257-313`

### Defensive Handling

1. **Strip markdown fences** - Removes `\`\`\`json` and `\`\`\`` wrappers
2. **Parse JSON** - Standard `JSON.parse()`
3. **Validate with Zod** - `SermonHelperSuggestionsSchema.safeParse()`
4. **Fallback on error** - Returns empty arrays if parsing fails

### Fallback Response

```typescript
{
  scriptureSuggestions: [],
  outline: [],
  applicationIdeas: [],
  hymnThemes: [],
  illustrationSuggestions: [],  // Phase 7 addition
}
```

The `meta.fallback` flag is set to `true` when fallback is used.

## AI Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_ENCRYPTION_KEY` | Yes | 32-byte hex (64 chars) for API key encryption |
| `DEPLOY_ENV` | No | `development`, `staging`, or `production` |

**Generate encryption key:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### AI Settings Table

```sql
CREATE TABLE ai_settings (
  id UUID PRIMARY KEY,
  provider TEXT DEFAULT 'openai',
  api_key_encrypted TEXT,  -- AES-256-GCM encrypted
  enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Environment Gating

AI features are **only available** in `development` or `staging` environments. Production is disabled by default.

Check: `sermonHelper.ts:49-52`

```typescript
function isAiAllowedInEnvironment(): boolean {
  const deployEnv = getDeployEnv();
  return deployEnv === 'development' || deployEnv === 'dev' || deployEnv === 'staging';
}
```

## Quota System

### Per-Tenant Limits

```sql
ALTER TABLE tenant
ADD COLUMN ai_enabled BOOLEAN DEFAULT true,
ADD COLUMN ai_monthly_token_limit INTEGER NULL;
```

### Usage Tracking

```sql
CREATE TABLE ai_usage_events (
  tenant_id UUID NOT NULL,
  feature TEXT NOT NULL,      -- 'sermon.helperSuggestions'
  model TEXT NOT NULL,        -- 'gpt-4o-mini'
  tokens_in INT NOT NULL,
  tokens_out INT NOT NULL,
  created_at TIMESTAMPTZ,
  meta JSONB
);
```

### Quota Check

```typescript
import { getAiQuotaStatusForTenant } from '../utils/aiQuota';

const quota = await getAiQuotaStatusForTenant(ctx);
// quota.enabled, quota.overLimit, quota.remainingTokens
```

## Type Definitions

Location: `packages/types/src/index.ts:676-872`

### Key Types

```typescript
import {
  TheologyProfileSchema,
  TheologyTradition,
  BibleTranslation,
  SermonStyle,
  TheologySensitivity,
  SermonHelperSuggestionsSchema,
  SermonElementSchema,
  IllustrationSuggestionSchema,  // Phase 7 addition
  SermonDraftSchema,             // Phase 8 addition
  type TheologyProfile,
  type SermonHelperSuggestions,
  type SermonElement,
  type IllustrationSuggestion,  // Phase 7 addition
  type SermonDraft,             // Phase 8 addition
} from '@elder-first/types';
```

### SermonDraft Type (Phase 8)

```typescript
interface SermonDraft {
  sermonId: string;
  styleProfile?: SermonStyleProfile | null;
  theologyTradition?: string | null;
  createdAt: string;      // ISO 8601 timestamp
  contentMarkdown: string;
}
```

This type represents an ephemeral (non-persisted) preaching manuscript generated from a SermonPlan.

## Testing

Location: `apps/api/src/__tests__/sermonHelper.test.ts`

### Test Coverage

- Theology profile default values
- System prompt construction
- JSON response parsing (valid, fenced, malformed)
- Guardrail enforcement
- Fallback behavior
- Illustration suggestions (Phase 7)
  - Response parsing with illustrationSuggestions
  - Style-aware illustration guidance
  - Political content filtering for illustrations
  - Empty fallback includes illustrations
- Draft generation (Phase 8)
  - buildDraftPrompt helper function
  - parseDraftResponse with validation
  - filterPoliticalContentFromDraft
  - SermonDraft type structure
  - Restricted topic check for plan content
  - Meta response structure validation
  - Integration flow tests

### Run Tests

```bash
cd apps/api
npm test -- --testPathPattern=sermonHelper.test.ts
```

**Phase 8 test count:** 21 tests for draft generation covering prompt building, response parsing, political filtering, and integration.

## Runtime Guardrails

### Restricted Topic Hard Block

**Location:** `sermonHelper.ts:checkRestrictedTopics()`

When a pastor requests AI suggestions, the system checks if the theme, notes, or sermon title contain any of the church's configured restricted topics **before calling OpenAI**. This saves API costs and prevents the AI from attempting to discuss topics the church has explicitly blocked.

**Behavior:**
1. Combines `theme + notes + sermonTitle` into a single string
2. Normalizes to lowercase for case-insensitive matching
3. Checks for substring matches against each item in `restrictedTopics`
4. If a match is found, returns empty suggestions immediately with `meta.restrictedTopicTriggered = true`

**Example:**

If a church has `restrictedTopics: ["predestination", "speaking in tongues"]`:

| Input | Result |
|-------|--------|
| Theme: "God's grace" | ✅ AI called normally |
| Theme: "Predestination and free will" | ❌ Blocked, no AI call |
| Notes: "discuss speaking in tongues" | ❌ Blocked, no AI call |

**Response when blocked:**
```json
{
  "suggestions": {
    "scriptureSuggestions": [],
    "outline": [],
    "applicationIdeas": [],
    "hymnThemes": []
  },
  "meta": {
    "fallback": false,
    "restrictedTopicTriggered": true
  }
}
```

**What pastors/admins should expect:**
- The UI displays an amber banner explaining AI is disabled for this topic
- No AI tokens are consumed
- The pastor should handle this content personally without AI assistance
- To change restricted topics, an admin can update the theology profile

---

### Political Content Post-Filter

**Location:** `sermonHelper.ts:filterPoliticalContent()`

After receiving AI suggestions, the system filters out any content containing political keywords. This provides defense-in-depth even if the AI ignores its prompt instructions.

**Blocked Keywords:**
- Party names: `republican`, `democrat`, `gop`, `dnc`
- Political figures: `trump`, `biden`, `harris`, `obama`
- Political movements: `maga`, `far-left`, `far-right`, `left-wing`, `right-wing`
- Campaign language: `vote for`, `election campaign`, `political party`, `liberal party`, `conservative party`

**Behavior:**
1. After parsing AI response, scans each suggestion field for political keywords
2. Removes any scripture suggestion, outline item, application idea, or hymn theme containing blocked words
3. Sets `meta.politicalContentDetected = true` if any content was filtered

**Example:**

If AI returns a scripture suggestion with `reason: "Supports Republican values"`:
- That specific suggestion is removed from the array
- `meta.politicalContentDetected` is set to `true`
- Other clean suggestions remain intact

**Response when filtered:**
```json
{
  "suggestions": {
    "scriptureSuggestions": [/* filtered array */],
    "outline": [/* filtered array */],
    "applicationIdeas": [/* filtered array */],
    "hymnThemes": [/* filtered array */]
  },
  "meta": {
    "fallback": false,
    "politicalContentDetected": true
  }
}
```

**What pastors/admins should expect:**
- The UI displays a blue banner explaining some content was filtered
- Remaining suggestions are still usable
- The pastor is reminded to focus on Christ-centered, non-partisan teaching

---

### Meta Flags Reference

| Field | Type | When Set |
|-------|------|----------|
| `fallback` | boolean | JSON parsing failed, empty arrays returned |
| `tokensUsed` | number | AI was called successfully |
| `model` | string | AI was called, contains model ID |
| `restrictedTopicTriggered` | boolean | Input matched restricted topic, AI NOT called |
| `politicalContentDetected` | boolean | AI response contained political content that was filtered |

**Priority:**
- `restrictedTopicTriggered` takes precedence (no AI call made)
- `politicalContentDetected` only possible when AI was called
- Both flags are mutually exclusive in practice

---

## Runtime Logging

**Location:** `apps/api/src/routers/sermonHelper.ts`

Guardrail events are logged at **INFO level** for observability and analytics. Only metadata is logged—no content, prompts, or responses are recorded.

### Events

| Event Name | Trigger | Description |
|------------|---------|-------------|
| `sermonHelper.restrictedTopic` | Input matches restricted topic | AI call skipped, pastor should handle personally |
| `sermonHelper.politicalFiltered` | AI response contained political keywords | Content filtered from response |

### Log Fields

**Restricted Topic Event:**
```json
{
  "level": "info",
  "message": "[SermonHelper] Guardrail: Restricted topic detected - AI skipped",
  "event": "sermonHelper.restrictedTopic",
  "tenantId": "uuid",
  "theologyTradition": "Reformed Baptist",
  "restrictedTopicsCount": 3,
  "sermonId": "uuid"
}
```

**Political Content Filtered Event:**
```json
{
  "level": "info",
  "message": "[SermonHelper] Guardrail: Political content filtered from AI response",
  "event": "sermonHelper.politicalFiltered",
  "tenantId": "uuid",
  "theologyTradition": "Non-denominational evangelical",
  "sermonId": "uuid"
}
```

### Security Notes

- **No content logged:** Theme, notes, sermon text, and AI responses are never logged
- **No API keys logged:** OpenAI keys remain encrypted and private
- **Metadata only:** Only tenant ID, tradition name, and counts are recorded
- **Audit-friendly:** Event names allow filtering in log aggregation tools

### Viewing Logs

```bash
# Filter guardrail events in development
grep "sermonHelper.restrictedTopic\|sermonHelper.politicalFiltered" logs/

# Count events by type (example with jq)
cat logs/*.json | jq 'select(.event | startswith("sermonHelper"))' | jq -s 'group_by(.event) | map({event: .[0].event, count: length})'
```

---

## Guardrails Checklist

- [x] All OpenAI calls server-side only
- [x] API key encrypted with AES-256-GCM
- [x] Tenant theology profile drives prompts
- [x] No secrets in client bundles
- [x] AI returns references only, not raw Bible text
- [x] No partisan political content in prompts
- [x] JSON responses validated with Zod
- [x] Fallback to empty response on parse errors
- [x] Usage logged to `ai_usage_events`
- [x] Quota enforcement per tenant
- [x] Environment gating (disabled in production)
- [x] Restricted topic hard block (pre-AI check)
- [x] Political content post-filter (post-AI check)
- [x] Guardrail events logged with metadata only

## Future Work (Phase 2+)

1. **Scripture Search** - Add Bible verse search endpoint
2. **Sermon Helper UI** - React components for `/sermons/[id]`
3. **Outline Persistence** - Save/load sermon outlines
4. **Export** - Markdown/text export of sermon outline
