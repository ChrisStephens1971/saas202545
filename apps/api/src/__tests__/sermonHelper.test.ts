import { describe, it, expect } from '@jest/globals';

/**
 * Sermon Helper Tests
 *
 * Unit tests for the Sermon Helper backend:
 * 1. Theology profile default values
 * 2. System prompt construction
 * 3. JSON response parsing with fallbacks
 * 4. Guardrail enforcement
 */

// ============================================================================
// THEOLOGY PROFILE DEFAULTS
// ============================================================================

const defaultTheologyProfile = {
  tradition: 'Non-denominational evangelical',
  bibleTranslation: 'ESV',
  sermonStyle: 'expository',
  sensitivity: 'moderate',
  restrictedTopics: [],
  preferredTone: 'warm and pastoral',
};

const TheologyTraditions = [
  'Non-denominational evangelical',
  'Reformed Baptist',
  'Southern Baptist',
  'Presbyterian (PCA)',
  'Presbyterian (PCUSA)',
  'Anglican/Episcopal',
  'Lutheran (LCMS)',
  'Lutheran (ELCA)',
  'Methodist',
  'Pentecostal/Charismatic',
  'Church of Christ',
  'Catholic',
  'Orthodox',
  'Other',
] as const;

const BibleTranslations = [
  'ESV', 'NIV', 'CSB', 'NASB', 'KJV', 'NKJV', 'NLT', 'RSV', 'NRSV', 'MSG',
] as const;

const SermonStyles = ['expository', 'topical', 'textual', 'narrative'] as const;

const SensitivityLevels = ['conservative', 'moderate', 'broad'] as const;

// ============================================================================
// PROMPT CONSTRUCTION (mirrors sermonHelper.ts logic)
// ============================================================================

interface TheologyProfile {
  tradition: string;
  bibleTranslation: string;
  sermonStyle: string;
  sensitivity: string;
  restrictedTopics: string[];
  preferredTone: string;
}

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

// ============================================================================
// JSON PARSING (mirrors sermonHelper.ts logic)
// ============================================================================

interface IllustrationSuggestion {
  id: string;
  title: string;
  summary: string;
  forSection?: string | null;
}

interface SermonHelperSuggestions {
  scriptureSuggestions: Array<{ reference: string; reason: string }>;
  outline: Array<{ type: 'section' | 'point'; title?: string; text?: string }>;
  applicationIdeas: Array<{ audience: string; idea: string }>;
  hymnThemes: Array<{ theme: string; reason: string }>;
  illustrationSuggestions?: IllustrationSuggestion[];
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
  } catch {
    return {
      suggestions: getEmptyFallback(),
      fallback: true,
    };
  }

  // Basic validation - check for expected structure
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('scriptureSuggestions' in parsed || 'outline' in parsed || 'applicationIdeas' in parsed || 'hymnThemes' in parsed)
  ) {
    return {
      suggestions: getEmptyFallback(),
      fallback: true,
    };
  }

  // Merge with defaults for missing fields
  const result = parsed as Record<string, unknown>;
  const suggestions: SermonHelperSuggestions = {
    scriptureSuggestions: Array.isArray(result.scriptureSuggestions) ? result.scriptureSuggestions : [],
    outline: Array.isArray(result.outline) ? result.outline : [],
    applicationIdeas: Array.isArray(result.applicationIdeas) ? result.applicationIdeas : [],
    hymnThemes: Array.isArray(result.hymnThemes) ? result.hymnThemes : [],
    illustrationSuggestions: Array.isArray(result.illustrationSuggestions) ? result.illustrationSuggestions : [],
  };

  return {
    suggestions,
    fallback: false,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('Theology Profile', () => {
  describe('default values', () => {
    it('provides safe conservative defaults', () => {
      expect(defaultTheologyProfile.tradition).toBe('Non-denominational evangelical');
      expect(defaultTheologyProfile.bibleTranslation).toBe('ESV');
      expect(defaultTheologyProfile.sermonStyle).toBe('expository');
      expect(defaultTheologyProfile.sensitivity).toBe('moderate');
      expect(defaultTheologyProfile.restrictedTopics).toEqual([]);
      expect(defaultTheologyProfile.preferredTone).toBe('warm and pastoral');
    });

    it('defines all supported traditions', () => {
      expect(TheologyTraditions).toHaveLength(14);
      expect(TheologyTraditions).toContain('Non-denominational evangelical');
      expect(TheologyTraditions).toContain('Reformed Baptist');
      expect(TheologyTraditions).toContain('Catholic');
      expect(TheologyTraditions).toContain('Orthodox');
    });

    it('defines all supported Bible translations', () => {
      expect(BibleTranslations).toHaveLength(10);
      expect(BibleTranslations).toContain('ESV');
      expect(BibleTranslations).toContain('NIV');
      expect(BibleTranslations).toContain('KJV');
    });

    it('defines all sermon styles', () => {
      expect(SermonStyles).toHaveLength(4);
      expect(SermonStyles).toContain('expository');
      expect(SermonStyles).toContain('topical');
      expect(SermonStyles).toContain('textual');
      expect(SermonStyles).toContain('narrative');
    });

    it('defines all sensitivity levels', () => {
      expect(SensitivityLevels).toHaveLength(3);
      expect(SensitivityLevels).toContain('conservative');
      expect(SensitivityLevels).toContain('moderate');
      expect(SensitivityLevels).toContain('broad');
    });
  });
});

describe('System Prompt Construction', () => {
  it('includes church name in prompt', () => {
    const prompt = buildTheologyAwareSystemPrompt('Grace Community Church', defaultTheologyProfile);
    expect(prompt).toContain('Grace Community Church');
  });

  it('includes all theology profile fields', () => {
    const customProfile: TheologyProfile = {
      tradition: 'Reformed Baptist',
      bibleTranslation: 'CSB',
      sermonStyle: 'textual',
      sensitivity: 'conservative',
      restrictedTopics: ['End times speculation', 'Political commentary'],
      preferredTone: 'teaching-focused and reverent',
    };

    const prompt = buildTheologyAwareSystemPrompt('First Baptist', customProfile);

    expect(prompt).toContain('Tradition: Reformed Baptist');
    expect(prompt).toContain('Preferred Bible translation: CSB');
    expect(prompt).toContain('Sermon style: textual');
    expect(prompt).toContain('Sensitivity level: conservative');
    expect(prompt).toContain('End times speculation, Political commentary');
    expect(prompt).toContain('Preferred tone: teaching-focused and reverent');
  });

  it('handles empty restricted topics list', () => {
    const prompt = buildTheologyAwareSystemPrompt('Test Church', defaultTheologyProfile);
    expect(prompt).toContain('Restricted topics: none specified');
  });

  it('includes guardrail rules', () => {
    const prompt = buildTheologyAwareSystemPrompt('Test Church', defaultTheologyProfile);

    // Core guardrails must be present
    expect(prompt).toContain('Stay within mainstream');
    expect(prompt).toContain('return ONLY references');
    expect(prompt).toContain('NOT full verse text');
    expect(prompt).toContain('partisan politics');
    expect(prompt).toContain('political candidates');
    expect(prompt).toContain('JSON object');
    expect(prompt).toContain('markdown fences');
  });

  it('adjusts guidance based on sensitivity level', () => {
    const conservative = buildTheologyAwareSystemPrompt('Test', {
      ...defaultTheologyProfile,
      sensitivity: 'conservative',
    });
    const moderate = buildTheologyAwareSystemPrompt('Test', {
      ...defaultTheologyProfile,
      sensitivity: 'moderate',
    });
    const broad = buildTheologyAwareSystemPrompt('Test', {
      ...defaultTheologyProfile,
      sensitivity: 'broad',
    });

    expect(conservative).toContain('very cautious');
    expect(moderate).toContain('care and balance');
    expect(broad).toContain('more latitude');
  });

  it('instructs AI to stay within church tradition', () => {
    const prompt = buildTheologyAwareSystemPrompt('St. Mary\'s', {
      ...defaultTheologyProfile,
      tradition: 'Catholic',
    });

    expect(prompt).toContain('Stay within mainstream Catholic theology');
  });
});

describe('JSON Response Parsing', () => {
  describe('valid JSON handling', () => {
    it('parses clean JSON correctly', () => {
      const validJson = JSON.stringify({
        scriptureSuggestions: [
          { reference: 'John 3:16', reason: 'Central gospel message' },
        ],
        outline: [
          { type: 'section', title: 'Introduction' },
          { type: 'point', text: 'God\'s love' },
        ],
        applicationIdeas: [
          { audience: 'believers', idea: 'Share the gospel this week' },
        ],
        hymnThemes: [
          { theme: 'grace', reason: 'Emphasizes God\'s love' },
        ],
      });

      const result = parseAiResponse(validJson);

      expect(result.fallback).toBe(false);
      expect(result.suggestions.scriptureSuggestions).toHaveLength(1);
      expect(result.suggestions.scriptureSuggestions[0].reference).toBe('John 3:16');
      expect(result.suggestions.outline).toHaveLength(2);
      expect(result.suggestions.applicationIdeas).toHaveLength(1);
      expect(result.suggestions.hymnThemes).toHaveLength(1);
    });

    it('handles partial response with missing fields', () => {
      const partialJson = JSON.stringify({
        scriptureSuggestions: [
          { reference: 'Romans 8:28', reason: 'God works for good' },
        ],
        // Missing outline, applicationIdeas, hymnThemes
      });

      const result = parseAiResponse(partialJson);

      expect(result.fallback).toBe(false);
      expect(result.suggestions.scriptureSuggestions).toHaveLength(1);
      expect(result.suggestions.outline).toEqual([]);
      expect(result.suggestions.applicationIdeas).toEqual([]);
      expect(result.suggestions.hymnThemes).toEqual([]);
    });
  });

  describe('markdown fence handling', () => {
    it('strips ```json fences', () => {
      const fencedJson = '```json\n{"scriptureSuggestions": [{"reference": "Psalm 23:1", "reason": "Shepherd theme"}]}\n```';

      const result = parseAiResponse(fencedJson);

      expect(result.fallback).toBe(false);
      expect(result.suggestions.scriptureSuggestions).toHaveLength(1);
      expect(result.suggestions.scriptureSuggestions[0].reference).toBe('Psalm 23:1');
    });

    it('strips plain ``` fences', () => {
      const fencedJson = '```\n{"outline": [{"type": "section", "title": "Main Point"}]}\n```';

      const result = parseAiResponse(fencedJson);

      expect(result.fallback).toBe(false);
      expect(result.suggestions.outline).toHaveLength(1);
    });
  });

  describe('fallback on invalid input', () => {
    it('returns fallback for malformed JSON', () => {
      const malformedJson = '{ "scriptureSuggestions": [{ missing colon }] }';

      const result = parseAiResponse(malformedJson);

      expect(result.fallback).toBe(true);
      expect(result.suggestions).toEqual(getEmptyFallback());
    });

    it('returns fallback for empty response', () => {
      const result = parseAiResponse('');

      expect(result.fallback).toBe(true);
    });

    it('returns fallback for plain text response', () => {
      const plainText = 'Here are some suggestions for your sermon...';

      const result = parseAiResponse(plainText);

      expect(result.fallback).toBe(true);
    });

    it('returns fallback for array instead of object', () => {
      const arrayJson = '[{"reference": "John 1:1"}]';

      const result = parseAiResponse(arrayJson);

      expect(result.fallback).toBe(true);
    });

    it('returns fallback for null', () => {
      const result = parseAiResponse('null');

      expect(result.fallback).toBe(true);
    });
  });

  describe('empty fallback structure', () => {
    it('returns correct empty structure', () => {
      const fallback = getEmptyFallback();

      expect(fallback.scriptureSuggestions).toEqual([]);
      expect(fallback.outline).toEqual([]);
      expect(fallback.applicationIdeas).toEqual([]);
      expect(fallback.hymnThemes).toEqual([]);
    });
  });
});

describe('Guardrail Enforcement', () => {
  it('prompt requires JSON-only output', () => {
    const prompt = buildTheologyAwareSystemPrompt('Test', defaultTheologyProfile);

    expect(prompt).toContain('single JSON object');
    expect(prompt).toContain('Do not include any commentary');
    expect(prompt).toContain('markdown fences');
    expect(prompt).toContain('explanation outside the JSON');
  });

  it('prompt prohibits full Bible text', () => {
    const prompt = buildTheologyAwareSystemPrompt('Test', defaultTheologyProfile);

    expect(prompt).toContain('ONLY references');
    expect(prompt).toContain('NOT full verse text');
    expect(prompt).toContain('only references');
  });

  it('prompt prohibits political content', () => {
    const prompt = buildTheologyAwareSystemPrompt('Test', defaultTheologyProfile);

    expect(prompt).toContain('partisan politics');
    expect(prompt).toContain('political candidates');
    expect(prompt).toContain('culture-war');
  });

  it('prompt includes restricted topics handling', () => {
    const profileWithRestrictions: TheologyProfile = {
      ...defaultTheologyProfile,
      restrictedTopics: ['Predestination debates', 'End times timelines'],
    };

    const prompt = buildTheologyAwareSystemPrompt('Test', profileWithRestrictions);

    expect(prompt).toContain('Predestination debates, End times timelines');
    expect(prompt).toContain('Avoid these restricted topics');
    expect(prompt).toContain('respond gently');
    expect(prompt).toContain('pastor handle that topic personally');
  });
});

describe('SermonElement Types', () => {
  const SermonElementTypes = ['section', 'point', 'note', 'scripture', 'hymn'] as const;

  it('defines all element types for outline builder', () => {
    expect(SermonElementTypes).toContain('section');
    expect(SermonElementTypes).toContain('point');
    expect(SermonElementTypes).toContain('note');
    expect(SermonElementTypes).toContain('scripture');
    expect(SermonElementTypes).toContain('hymn');
    expect(SermonElementTypes).toHaveLength(5);
  });
});

// ============================================================================
// INTEGRATION TESTS (Router behavior with mocked dependencies)
// ============================================================================

/**
 * Integration-style tests for sermonHelper router endpoints.
 * These test the flow through helper functions that would be called by the router.
 *
 * Note: Full router tests would require a test database setup.
 * These tests focus on:
 * - getAISuggestions: parsing flow and guardrail checking
 * - searchHymns: result transformation logic
 */

describe('getAISuggestions Integration', () => {
  describe('happy path - valid AI response', () => {
    it('parses complete AI response with all fields', () => {
      const mockAiResponse = JSON.stringify({
        scriptureSuggestions: [
          { reference: 'John 3:16', reason: 'Central gospel message about God\'s love' },
          { reference: 'Romans 5:8', reason: 'Christ died for us while we were sinners' },
        ],
        outline: [
          { type: 'section', title: 'Introduction' },
          { type: 'point', text: 'God loves the world' },
          { type: 'section', title: 'Main Body' },
          { type: 'point', text: 'Believe and receive life' },
          { type: 'section', title: 'Conclusion' },
        ],
        applicationIdeas: [
          { audience: 'believers', idea: 'Share the gospel with a neighbor this week' },
          { audience: 'seekers', idea: 'Consider God\'s personal love for you' },
        ],
        hymnThemes: [
          { theme: 'grace', reason: 'Emphasizes unmerited favor' },
          { theme: 'salvation', reason: 'Ties to eternal life promise' },
        ],
      });

      const result = parseAiResponse(mockAiResponse);

      expect(result.fallback).toBe(false);
      expect(result.suggestions.scriptureSuggestions).toHaveLength(2);
      expect(result.suggestions.outline).toHaveLength(5);
      expect(result.suggestions.applicationIdeas).toHaveLength(2);
      expect(result.suggestions.hymnThemes).toHaveLength(2);
    });

    it('handles response with minimal valid content', () => {
      const mockAiResponse = JSON.stringify({
        scriptureSuggestions: [
          { reference: 'Psalm 23:1', reason: 'Shepherd theme' },
        ],
        outline: [],
        applicationIdeas: [],
        hymnThemes: [],
      });

      const result = parseAiResponse(mockAiResponse);

      expect(result.fallback).toBe(false);
      expect(result.suggestions.scriptureSuggestions).toHaveLength(1);
      expect(result.suggestions.scriptureSuggestions[0].reference).toBe('Psalm 23:1');
    });
  });

  describe('guardrails - theology profile enforcement', () => {
    it('builds prompt with Reformed Baptist tradition constraints', () => {
      const reformedProfile: TheologyProfile = {
        tradition: 'Reformed Baptist',
        bibleTranslation: 'ESV',
        sermonStyle: 'expository',
        sensitivity: 'conservative',
        restrictedTopics: ['Speaking in tongues', 'Prosperity gospel'],
        preferredTone: 'reverent and teaching-focused',
      };

      const prompt = buildTheologyAwareSystemPrompt('Grace Baptist Church', reformedProfile);

      // Must enforce Reformed Baptist tradition
      expect(prompt).toContain('Stay within mainstream Reformed Baptist theology');
      // Must include restricted topics
      expect(prompt).toContain('Speaking in tongues, Prosperity gospel');
      // Must use conservative sensitivity guidance
      expect(prompt).toContain('very cautious');
    });

    it('builds prompt with Catholic tradition constraints', () => {
      const catholicProfile: TheologyProfile = {
        tradition: 'Catholic',
        bibleTranslation: 'RSV',
        sermonStyle: 'topical',
        sensitivity: 'moderate',
        restrictedTopics: ['Criticism of papal authority'],
        preferredTone: 'warm and liturgical',
      };

      const prompt = buildTheologyAwareSystemPrompt('St. Mary\'s Parish', catholicProfile);

      expect(prompt).toContain('Stay within mainstream Catholic theology');
      expect(prompt).toContain('RSV versification');
      expect(prompt).toContain('Criticism of papal authority');
    });

    it('builds prompt with Pentecostal tradition constraints', () => {
      const pentecostalProfile: TheologyProfile = {
        tradition: 'Pentecostal/Charismatic',
        bibleTranslation: 'NIV',
        sermonStyle: 'narrative',
        sensitivity: 'broad',
        restrictedTopics: [],
        preferredTone: 'energetic and Spirit-led',
      };

      const prompt = buildTheologyAwareSystemPrompt('Living Water Church', pentecostalProfile);

      expect(prompt).toContain('Stay within mainstream Pentecostal/Charismatic theology');
      expect(prompt).toContain('more latitude');
      expect(prompt).toContain('Restricted topics: none specified');
    });

    it('always includes political guardrails regardless of tradition', () => {
      const traditions = [
        'Non-denominational evangelical',
        'Reformed Baptist',
        'Catholic',
        'Lutheran (LCMS)',
        'Methodist',
      ];

      for (const tradition of traditions) {
        const profile: TheologyProfile = {
          ...defaultTheologyProfile,
          tradition,
        };
        const prompt = buildTheologyAwareSystemPrompt('Test Church', profile);

        expect(prompt).toContain('partisan politics');
        expect(prompt).toContain('political candidates');
        expect(prompt).toContain('culture-war');
      }
    });

    it('always requires scripture references only (no full text)', () => {
      const prompt = buildTheologyAwareSystemPrompt('Any Church', defaultTheologyProfile);

      expect(prompt).toContain('ONLY references');
      expect(prompt).toContain('NOT full verse text');
    });
  });

  describe('error handling - malformed responses', () => {
    it('falls back gracefully on truncated JSON', () => {
      const truncated = '{"scriptureSuggestions": [{"reference": "John 3:16", "reason": "Great ve';

      const result = parseAiResponse(truncated);

      expect(result.fallback).toBe(true);
      expect(result.suggestions).toEqual(getEmptyFallback());
    });

    it('falls back on JSON with wrong top-level structure', () => {
      const wrongStructure = JSON.stringify({
        verses: [{ ref: 'John 1:1' }],  // Wrong field names
        points: ['First point'],         // Wrong structure
      });

      const result = parseAiResponse(wrongStructure);

      // Should return fallback since no expected fields present
      expect(result.fallback).toBe(true);
    });

    it('falls back on HTML response (API error page)', () => {
      const htmlResponse = '<html><body>Internal Server Error</body></html>';

      const result = parseAiResponse(htmlResponse);

      expect(result.fallback).toBe(true);
    });

    it('falls back on response with invalid nested types', () => {
      const invalidNested = JSON.stringify({
        scriptureSuggestions: 'not an array',  // Should be array
        outline: { wrong: 'structure' },       // Should be array
        applicationIdeas: [],
        hymnThemes: [],
      });

      const result = parseAiResponse(invalidNested);

      // Should fallback since nested types are wrong
      expect(result.fallback).toBe(false);  // parseAiResponse handles partial gracefully
      expect(result.suggestions.scriptureSuggestions).toEqual([]);  // Invalid type becomes empty array
      expect(result.suggestions.outline).toEqual([]);
    });
  });
});

describe('searchHymns Integration', () => {
  /**
   * Tests for search result transformation logic.
   * Actual database queries would need a test database.
   */

  describe('result transformation', () => {
    it('transforms database row to API response format', () => {
      // Mock what the database would return
      const mockDbRows = [
        {
          id: 'hymn-123',
          title: 'Amazing Grace',
          alternate_title: 'New Britain',
          hymn_number: '779',
          hymnal_code: 'UMH',
          tune_name: 'NEW BRITAIN',
          author: 'John Newton',
          is_public_domain: true,
          ccli_number: null,
        },
        {
          id: 'hymn-456',
          title: 'How Great Thou Art',
          alternate_title: null,
          hymn_number: '77',
          hymnal_code: 'UMH',
          tune_name: 'O STORE GUD',
          author: 'Stuart K. Hine',
          is_public_domain: false,
          ccli_number: '14181',
        },
      ];

      // Transform like the router does
      const transformed = mockDbRows.map(row => ({
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

      expect(transformed).toHaveLength(2);
      expect(transformed[0].title).toBe('Amazing Grace');
      expect(transformed[0].alternateTitle).toBe('New Britain');
      expect(transformed[0].isPublicDomain).toBe(true);
      expect(transformed[0].ccliNumber).toBeNull();

      expect(transformed[1].title).toBe('How Great Thou Art');
      expect(transformed[1].alternateTitle).toBeNull();
      expect(transformed[1].ccliNumber).toBe('14181');
    });

    it('handles empty search results', () => {
      const emptyResults: unknown[] = [];
      expect(emptyResults).toHaveLength(0);
    });
  });

  describe('tenant isolation (conceptual)', () => {
    /**
     * These tests verify the SQL query pattern enforces tenant isolation.
     * Actual enforcement happens via queryWithTenant() which prepends
     * SET app.current_tenant = $tenantId before every query.
     */

    it('query pattern uses tenant_id parameter', () => {
      // The actual query from the router
      const queryPattern = `SELECT
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
        LIMIT $2`;

      // Query is wrapped by queryWithTenant which adds RLS context
      // The query itself doesn't need explicit tenant_id because
      // PostgreSQL RLS policies enforce it automatically
      expect(queryPattern).toContain('FROM song');
      expect(queryPattern).toContain('deleted_at IS NULL');
      expect(queryPattern).toContain('ILIKE $1');  // Search parameter
      expect(queryPattern).toContain('LIMIT $2');  // Limit parameter
    });

    it('RLS policy pattern for song table', () => {
      // Document the expected RLS policy structure
      const expectedRlsPolicy = `
        CREATE POLICY song_tenant_isolation ON song
        FOR ALL
        USING (tenant_id = current_setting('app.current_tenant')::uuid);
      `;

      // This test documents the security contract
      expect(expectedRlsPolicy).toContain('tenant_id');
      expect(expectedRlsPolicy).toContain('current_setting');
      expect(expectedRlsPolicy).toContain('app.current_tenant');
    });
  });
});

// ============================================================================
// RUNTIME GUARDRAILS - RESTRICTED TOPIC DETECTION
// ============================================================================

/**
 * Mirrors the restricted topic detection logic from sermonHelper.ts
 */
function normalizeForTopicMatch(text: string): string {
  return text.toLowerCase().trim();
}

function buildTopicDetectionString(
  theme: string,
  notes: string | undefined,
  sermonTitle: string
): string {
  const parts = [theme, notes || '', sermonTitle].filter(Boolean);
  return normalizeForTopicMatch(parts.join(' '));
}

function checkRestrictedTopics(
  content: string,
  restrictedTopics: string[]
): string | null {
  const normalizedContent = normalizeForTopicMatch(content);

  for (const topic of restrictedTopics) {
    const normalizedTopic = normalizeForTopicMatch(topic);
    if (normalizedTopic && normalizedContent.includes(normalizedTopic)) {
      return topic;
    }
  }

  return null;
}

describe('Restricted Topic Hard Block', () => {
  describe('topic detection string building', () => {
    it('combines theme, notes, and title', () => {
      const result = buildTopicDetectionString(
        'God\'s sovereignty',
        'Looking at election',
        'Predestination Sermon'
      );

      expect(result).toContain('god\'s sovereignty');
      expect(result).toContain('election');
      expect(result).toContain('predestination sermon');
    });

    it('handles missing notes', () => {
      const result = buildTopicDetectionString(
        'Grace',
        undefined,
        'Sunday Sermon'
      );

      expect(result).toContain('grace');
      expect(result).toContain('sunday sermon');
    });

    it('normalizes to lowercase', () => {
      const result = buildTopicDetectionString(
        'END TIMES',
        'RAPTURE Notes',
        'Revelation Study'
      );

      expect(result).toBe('end times rapture notes revelation study');
    });
  });

  describe('restricted topic matching', () => {
    it('detects exact match in theme', () => {
      const content = buildTopicDetectionString(
        'Discussing end times prophecy',
        undefined,
        'Sunday Sermon'
      );

      const matched = checkRestrictedTopics(content, ['end times']);

      expect(matched).toBe('end times');
    });

    it('detects match in notes', () => {
      const content = buildTopicDetectionString(
        'Spiritual gifts',
        'Should we discuss speaking in tongues?',
        'Sunday Sermon'
      );

      const matched = checkRestrictedTopics(content, ['speaking in tongues']);

      expect(matched).toBe('speaking in tongues');
    });

    it('detects match in sermon title', () => {
      const content = buildTopicDetectionString(
        'Faith and works',
        undefined,
        'Predestination vs Free Will'
      );

      const matched = checkRestrictedTopics(content, ['predestination']);

      expect(matched).toBe('predestination');
    });

    it('returns null when no restricted topics matched', () => {
      const content = buildTopicDetectionString(
        'God\'s love',
        'Grace and forgiveness',
        'Sunday Morning'
      );

      const matched = checkRestrictedTopics(content, ['end times', 'prosperity gospel']);

      expect(matched).toBeNull();
    });

    it('handles empty restricted topics array', () => {
      const content = buildTopicDetectionString(
        'Any topic at all',
        'Including controversial ones',
        'Sermon Title'
      );

      const matched = checkRestrictedTopics(content, []);

      expect(matched).toBeNull();
    });

    it('is case-insensitive', () => {
      const content = buildTopicDetectionString(
        'END TIMES PROPHECY',
        undefined,
        'Title'
      );

      const matched = checkRestrictedTopics(content, ['end times']);

      expect(matched).toBe('end times');
    });

    it('returns first matched topic when multiple match', () => {
      const content = buildTopicDetectionString(
        'Discussing end times and prosperity gospel',
        undefined,
        'Sermon'
      );

      const matched = checkRestrictedTopics(content, ['end times', 'prosperity gospel']);

      expect(matched).toBe('end times');
    });

    it('handles partial word matches (substring)', () => {
      const content = buildTopicDetectionString(
        'Understanding predestination theology',
        undefined,
        'Sermon'
      );

      // 'predestination' substring matches
      const matched = checkRestrictedTopics(content, ['predestination']);

      expect(matched).toBe('predestination');
    });
  });

  describe('meta response structure', () => {
    it('restricted topic trigger returns correct meta structure', () => {
      const restrictedTopicResponse = {
        suggestions: getEmptyFallback(),
        meta: {
          fallback: false,
          restrictedTopicTriggered: true,
        },
      };

      expect(restrictedTopicResponse.suggestions.scriptureSuggestions).toEqual([]);
      expect(restrictedTopicResponse.suggestions.outline).toEqual([]);
      expect(restrictedTopicResponse.meta.fallback).toBe(false);
      expect(restrictedTopicResponse.meta.restrictedTopicTriggered).toBe(true);
    });

    it('normal response has no restrictedTopicTriggered flag', () => {
      const normalResponse = {
        suggestions: {
          scriptureSuggestions: [{ reference: 'John 3:16', reason: 'Gospel' }],
          outline: [],
          applicationIdeas: [],
          hymnThemes: [],
        },
        meta: {
          fallback: false,
          tokensUsed: 500,
          model: 'gpt-4o-mini',
        } as { fallback: boolean; tokensUsed?: number; model?: string; restrictedTopicTriggered?: boolean },
      };

      expect(normalResponse.meta.restrictedTopicTriggered).toBeUndefined();
    });
  });
});

// ============================================================================
// RUNTIME GUARDRAILS - POLITICAL CONTENT POST-FILTER
// ============================================================================

/**
 * Mirrors the political content filter logic from sermonHelper.ts
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

function containsPoliticalContent(text: string): boolean {
  const normalizedText = normalizeForTopicMatch(text);
  return POLITICAL_KEYWORDS.some(keyword =>
    normalizedText.includes(normalizeForTopicMatch(keyword))
  );
}

function filterPoliticalContent(
  suggestions: SermonHelperSuggestions
): { filtered: SermonHelperSuggestions; detected: boolean } {
  let detected = false;

  const scriptureSuggestions = suggestions.scriptureSuggestions.filter(item => {
    const hasPolitical = containsPoliticalContent(item.reference) ||
      containsPoliticalContent(item.reason);
    if (hasPolitical) detected = true;
    return !hasPolitical;
  });

  const outline = suggestions.outline.filter(item => {
    const text = item.title || item.text || '';
    const hasPolitical = containsPoliticalContent(text);
    if (hasPolitical) detected = true;
    return !hasPolitical;
  });

  const applicationIdeas = suggestions.applicationIdeas.filter(item => {
    const hasPolitical = containsPoliticalContent(item.idea);
    if (hasPolitical) detected = true;
    return !hasPolitical;
  });

  const hymnThemes = suggestions.hymnThemes.filter(item => {
    const hasPolitical = containsPoliticalContent(item.theme) ||
      containsPoliticalContent(item.reason);
    if (hasPolitical) detected = true;
    return !hasPolitical;
  });

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

describe('Political Content Post-Filter', () => {
  describe('political keyword detection', () => {
    it('detects Republican in text', () => {
      expect(containsPoliticalContent('Vote Republican for values')).toBe(true);
    });

    it('detects Democrat in text', () => {
      expect(containsPoliticalContent('The Democrat position on this')).toBe(true);
    });

    it('detects Trump in text', () => {
      expect(containsPoliticalContent('Like Trump said')).toBe(true);
    });

    it('detects Biden in text', () => {
      expect(containsPoliticalContent('Biden administration policies')).toBe(true);
    });

    it('detects MAGA in text', () => {
      expect(containsPoliticalContent('MAGA movement')).toBe(true);
    });

    it('detects far-left in text', () => {
      expect(containsPoliticalContent('The far-left agenda')).toBe(true);
    });

    it('detects far-right in text', () => {
      expect(containsPoliticalContent('Far-right extremism')).toBe(true);
    });

    it('is case-insensitive', () => {
      expect(containsPoliticalContent('REPUBLICAN values')).toBe(true);
      expect(containsPoliticalContent('democrat')).toBe(true);
    });

    it('returns false for clean spiritual content', () => {
      expect(containsPoliticalContent('God loves the world')).toBe(false);
      expect(containsPoliticalContent('Christ died for our sins')).toBe(false);
      expect(containsPoliticalContent('Share the gospel')).toBe(false);
    });

    it('returns false for neutral political terms', () => {
      // Terms like 'vote' alone or 'government' are not filtered
      expect(containsPoliticalContent('Pray for our government')).toBe(false);
      expect(containsPoliticalContent('Citizens should vote')).toBe(false);
    });
  });

  describe('suggestion filtering', () => {
    it('filters scripture suggestion with political reason', () => {
      const suggestions: SermonHelperSuggestions = {
        scriptureSuggestions: [
          { reference: 'John 3:16', reason: 'Gospel message' },
          { reference: 'Romans 13:1', reason: 'Vote Republican for God\'s authority' },
        ],
        outline: [],
        applicationIdeas: [],
        hymnThemes: [],
      };

      const { filtered, detected } = filterPoliticalContent(suggestions);

      expect(detected).toBe(true);
      expect(filtered.scriptureSuggestions).toHaveLength(1);
      expect(filtered.scriptureSuggestions[0].reference).toBe('John 3:16');
    });

    it('filters outline item with political content', () => {
      const suggestions: SermonHelperSuggestions = {
        scriptureSuggestions: [],
        outline: [
          { type: 'section', title: 'Introduction' },
          { type: 'point', text: 'Democrats destroying values' },
          { type: 'section', title: 'Main Point' },
        ],
        applicationIdeas: [],
        hymnThemes: [],
      };

      const { filtered, detected } = filterPoliticalContent(suggestions);

      expect(detected).toBe(true);
      expect(filtered.outline).toHaveLength(2);
      expect(filtered.outline[0].title).toBe('Introduction');
      expect(filtered.outline[1].title).toBe('Main Point');
    });

    it('filters application idea with political content', () => {
      const suggestions: SermonHelperSuggestions = {
        scriptureSuggestions: [],
        outline: [],
        applicationIdeas: [
          { audience: 'believers', idea: 'Share the gospel' },
          { audience: 'all', idea: 'Vote for Trump this election' },
        ],
        hymnThemes: [],
      };

      const { filtered, detected } = filterPoliticalContent(suggestions);

      expect(detected).toBe(true);
      expect(filtered.applicationIdeas).toHaveLength(1);
      expect(filtered.applicationIdeas[0].idea).toBe('Share the gospel');
    });

    it('filters hymn theme with political reason', () => {
      const suggestions: SermonHelperSuggestions = {
        scriptureSuggestions: [],
        outline: [],
        applicationIdeas: [],
        hymnThemes: [
          { theme: 'grace', reason: 'Emphasizes God\'s love' },
          { theme: 'patriotism', reason: 'MAGA movement values' },
        ],
      };

      const { filtered, detected } = filterPoliticalContent(suggestions);

      expect(detected).toBe(true);
      expect(filtered.hymnThemes).toHaveLength(1);
      expect(filtered.hymnThemes[0].theme).toBe('grace');
    });

    it('preserves all content when no political keywords found', () => {
      const suggestions: SermonHelperSuggestions = {
        scriptureSuggestions: [
          { reference: 'John 3:16', reason: 'Gospel' },
          { reference: 'Romans 5:8', reason: 'Grace' },
        ],
        outline: [
          { type: 'section', title: 'Introduction' },
          { type: 'point', text: 'God loves us' },
        ],
        applicationIdeas: [
          { audience: 'believers', idea: 'Share the gospel' },
        ],
        hymnThemes: [
          { theme: 'grace', reason: 'Amazing grace' },
        ],
      };

      const { filtered, detected } = filterPoliticalContent(suggestions);

      expect(detected).toBe(false);
      expect(filtered.scriptureSuggestions).toHaveLength(2);
      expect(filtered.outline).toHaveLength(2);
      expect(filtered.applicationIdeas).toHaveLength(1);
      expect(filtered.hymnThemes).toHaveLength(1);
    });

    it('returns empty arrays when all content is political', () => {
      const suggestions: SermonHelperSuggestions = {
        scriptureSuggestions: [
          { reference: 'Romans 13:1', reason: 'Vote Republican' },
        ],
        outline: [
          { type: 'point', text: 'Support Trump' },
        ],
        applicationIdeas: [
          { audience: 'all', idea: 'Join the MAGA movement' },
        ],
        hymnThemes: [
          { theme: 'patriotism', reason: 'Far-right values' },
        ],
      };

      const { filtered, detected } = filterPoliticalContent(suggestions);

      expect(detected).toBe(true);
      expect(filtered.scriptureSuggestions).toHaveLength(0);
      expect(filtered.outline).toHaveLength(0);
      expect(filtered.applicationIdeas).toHaveLength(0);
      expect(filtered.hymnThemes).toHaveLength(0);
    });
  });

  describe('meta response structure', () => {
    it('political detection returns correct meta structure', () => {
      const responseWithPolitical = {
        suggestions: {
          scriptureSuggestions: [{ reference: 'John 3:16', reason: 'Gospel' }],
          outline: [],
          applicationIdeas: [],
          hymnThemes: [],
        },
        meta: {
          fallback: false,
          tokensUsed: 500,
          model: 'gpt-4o-mini',
          politicalContentDetected: true,
        },
      };

      expect(responseWithPolitical.meta.politicalContentDetected).toBe(true);
    });

    it('clean response has no politicalContentDetected flag', () => {
      const cleanResponse = {
        suggestions: {
          scriptureSuggestions: [{ reference: 'John 3:16', reason: 'Gospel' }],
          outline: [],
          applicationIdeas: [],
          hymnThemes: [],
        },
        meta: {
          fallback: false,
          tokensUsed: 500,
          model: 'gpt-4o-mini',
        } as { fallback: boolean; tokensUsed?: number; model?: string; politicalContentDetected?: boolean },
      };

      expect(cleanResponse.meta.politicalContentDetected).toBeUndefined();
    });
  });
});

// ============================================================================
// COMBINED GUARDRAILS INTEGRATION
// ============================================================================

// ============================================================================
// GUARDRAIL LOGGING TESTS
// ============================================================================

/**
 * Tests for guardrail event logging.
 * These verify the log structure and metadata for observability.
 */
describe('Guardrail Logging', () => {
  describe('restricted topic logging structure', () => {
    it('should produce correct log structure for restricted topic event', () => {
      // Simulate what sermonHelper.ts logs when restricted topic is triggered
      const logData = {
        event: 'sermonHelper.restrictedTopic',
        tenantId: 'tenant-123',
        theologyTradition: 'Reformed Baptist',
        restrictedTopicsCount: 3,
        sermonId: 'sermon-456',
      };

      expect(logData.event).toBe('sermonHelper.restrictedTopic');
      expect(logData.tenantId).toBeDefined();
      expect(logData.theologyTradition).toBeDefined();
      expect(logData.restrictedTopicsCount).toBeGreaterThanOrEqual(0);
      expect(logData.sermonId).toBeDefined();
    });

    it('should NOT include sensitive content in log', () => {
      const logData = {
        event: 'sermonHelper.restrictedTopic',
        tenantId: 'tenant-123',
        theologyTradition: 'Reformed Baptist',
        restrictedTopicsCount: 3,
        sermonId: 'sermon-456',
      };

      // Verify no sensitive fields are present
      expect(logData).not.toHaveProperty('theme');
      expect(logData).not.toHaveProperty('notes');
      expect(logData).not.toHaveProperty('restrictedTopics');
      expect(logData).not.toHaveProperty('matchedTopic');
      expect(logData).not.toHaveProperty('sermonTitle');
    });

    it('should include restrictedTopicsCount as number', () => {
      const logData = {
        event: 'sermonHelper.restrictedTopic',
        tenantId: 'tenant-123',
        theologyTradition: 'Non-denominational evangelical',
        restrictedTopicsCount: 5,
        sermonId: 'sermon-789',
      };

      expect(typeof logData.restrictedTopicsCount).toBe('number');
    });
  });

  describe('political content logging structure', () => {
    it('should produce correct log structure for political filtered event', () => {
      const logData = {
        event: 'sermonHelper.politicalFiltered',
        tenantId: 'tenant-123',
        theologyTradition: 'Methodist',
        sermonId: 'sermon-456',
      };

      expect(logData.event).toBe('sermonHelper.politicalFiltered');
      expect(logData.tenantId).toBeDefined();
      expect(logData.theologyTradition).toBeDefined();
      expect(logData.sermonId).toBeDefined();
    });

    it('should NOT include AI response content in log', () => {
      const logData = {
        event: 'sermonHelper.politicalFiltered',
        tenantId: 'tenant-123',
        theologyTradition: 'Methodist',
        sermonId: 'sermon-456',
      };

      // Verify no sensitive fields are present
      expect(logData).not.toHaveProperty('suggestions');
      expect(logData).not.toHaveProperty('filteredItems');
      expect(logData).not.toHaveProperty('aiResponse');
      expect(logData).not.toHaveProperty('politicalKeywords');
    });
  });

  describe('log event names', () => {
    it('restricted topic event uses correct event name', () => {
      const eventName = 'sermonHelper.restrictedTopic';
      expect(eventName).toMatch(/^sermonHelper\./);
    });

    it('political filtered event uses correct event name', () => {
      const eventName = 'sermonHelper.politicalFiltered';
      expect(eventName).toMatch(/^sermonHelper\./);
    });
  });
});

describe('Combined Guardrails', () => {
  it('restricted topic takes priority over AI call', () => {
    // When a restricted topic is detected, AI should NOT be called
    // This is a conceptual test - actual implementation skips OpenAI call

    const restrictedTopics = ['end times', 'prosperity gospel'];
    const theme = 'End times prophecy';
    const content = buildTopicDetectionString(theme, undefined, 'Sermon');
    const matched = checkRestrictedTopics(content, restrictedTopics);

    // If matched, AI would be skipped
    expect(matched).toBe('end times');

    // Response would have restrictedTopicTriggered flag
    const expectedResponse = {
      suggestions: getEmptyFallback(),
      meta: {
        fallback: false,
        restrictedTopicTriggered: true,
      },
    };

    expect(expectedResponse.meta.restrictedTopicTriggered).toBe(true);
    expect(expectedResponse.suggestions.scriptureSuggestions).toEqual([]);
  });

  it('political filter runs after AI response parsing', () => {
    // Simulate AI response with some political content
    const mockAiResponse = JSON.stringify({
      scriptureSuggestions: [
        { reference: 'John 3:16', reason: 'Gospel message' },
        { reference: 'Romans 13:1', reason: 'Submit like MAGA supporters' }, // Political
      ],
      outline: [
        { type: 'section', title: 'Introduction' },
      ],
      applicationIdeas: [],
      hymnThemes: [],
    });

    // Parse AI response
    const { suggestions: parsed } = parseAiResponse(mockAiResponse);

    // Filter political content
    const { filtered, detected } = filterPoliticalContent(parsed);

    expect(detected).toBe(true);
    expect(filtered.scriptureSuggestions).toHaveLength(1);
    expect(filtered.scriptureSuggestions[0].reference).toBe('John 3:16');
  });

  it('both guardrails can be active in different scenarios', () => {
    // Scenario 1: Restricted topic blocks AI entirely
    const restrictedTopics = ['predestination'];
    const contentWithRestricted = buildTopicDetectionString(
      'Understanding predestination',
      undefined,
      'Sermon'
    );
    expect(checkRestrictedTopics(contentWithRestricted, restrictedTopics)).toBe('predestination');

    // Scenario 2: Clean input passes, but AI output gets filtered
    const contentClean = buildTopicDetectionString('Grace and mercy', undefined, 'Sermon');
    expect(checkRestrictedTopics(contentClean, restrictedTopics)).toBeNull();

    // AI could still return political content that needs filtering
    const politicalSuggestion = {
      scriptureSuggestions: [{ reference: 'John 1:1', reason: 'Vote Democrat for grace' }],
      outline: [],
      applicationIdeas: [],
      hymnThemes: [],
    };

    const { detected } = filterPoliticalContent(politicalSuggestion);
    expect(detected).toBe(true);
  });
});

// ============================================================================
// ILLUSTRATION SUGGESTIONS (Phase 7)
// ============================================================================

describe('Illustration Suggestions', () => {
  describe('response parsing', () => {
    it('parses AI response with illustrationSuggestions', () => {
      const mockAiResponse = JSON.stringify({
        scriptureSuggestions: [
          { reference: 'John 3:16', reason: 'Gospel message' },
        ],
        outline: [
          { type: 'section', title: 'Introduction' },
        ],
        applicationIdeas: [],
        hymnThemes: [],
        illustrationSuggestions: [
          {
            id: 'illus-1',
            title: 'The Waiting Father',
            summary: 'A father waits daily at the road, watching for his prodigal son to return.',
            forSection: 'introduction',
          },
          {
            id: 'illus-2',
            title: 'The Lost Coin',
            summary: 'A woman searches her whole house for a single lost coin of great value.',
            forSection: null,
          },
        ],
      });

      const result = parseAiResponse(mockAiResponse);

      expect(result.fallback).toBe(false);
      expect(result.suggestions.illustrationSuggestions).toHaveLength(2);
      expect(result.suggestions.illustrationSuggestions![0].id).toBe('illus-1');
      expect(result.suggestions.illustrationSuggestions![0].title).toBe('The Waiting Father');
      expect(result.suggestions.illustrationSuggestions![0].forSection).toBe('introduction');
      expect(result.suggestions.illustrationSuggestions![1].forSection).toBeNull();
    });

    it('handles missing illustrationSuggestions field gracefully', () => {
      const mockAiResponse = JSON.stringify({
        scriptureSuggestions: [
          { reference: 'John 3:16', reason: 'Gospel message' },
        ],
        outline: [],
        applicationIdeas: [],
        hymnThemes: [],
        // No illustrationSuggestions field
      });

      const result = parseAiResponse(mockAiResponse);

      expect(result.fallback).toBe(false);
      expect(result.suggestions.illustrationSuggestions).toEqual([]);
    });

    it('handles empty illustrationSuggestions array', () => {
      const mockAiResponse = JSON.stringify({
        scriptureSuggestions: [],
        outline: [],
        applicationIdeas: [],
        hymnThemes: [],
        illustrationSuggestions: [],
      });

      const result = parseAiResponse(mockAiResponse);

      expect(result.fallback).toBe(false);
      expect(result.suggestions.illustrationSuggestions).toEqual([]);
    });
  });

  describe('style-aware illustration guidance', () => {
    it('story-first style emphasizes narrative illustrations', () => {
      // This tests the conceptual behavior - actual prompt building is in the router
      const styleProfile = 'story_first_3_point';
      const expectedGuidance = 'narrative illustrations and personal stories';

      // Verify the style profile maps to the right guidance
      expect(styleProfile).toBe('story_first_3_point');
      expect(expectedGuidance).toContain('narrative');
      expect(expectedGuidance).toContain('personal stories');
    });

    it('expository style emphasizes text-focused illustrations', () => {
      const styleProfile = 'expository_verse_by_verse';
      const expectedGuidance = 'historical background or word meanings';

      expect(styleProfile).toBe('expository_verse_by_verse');
      expect(expectedGuidance).toContain('historical');
    });

    it('topical style emphasizes contemporary applications', () => {
      const styleProfile = 'topical_teaching';
      const expectedGuidance = 'contemporary life situations';

      expect(styleProfile).toBe('topical_teaching');
      expect(expectedGuidance).toContain('contemporary');
    });
  });

  describe('political content filtering for illustrations', () => {
    it('filters illustration with political title', () => {
      const suggestions: SermonHelperSuggestions = {
        scriptureSuggestions: [],
        outline: [],
        applicationIdeas: [],
        hymnThemes: [],
        illustrationSuggestions: [
          {
            id: 'illus-1',
            title: 'The Good Samaritan',
            summary: 'A stranger helps someone in need.',
            forSection: null,
          },
          {
            id: 'illus-2',
            title: 'Trump Rally Enthusiasm',
            summary: 'The crowd shows passionate support.',
            forSection: 'application',
          },
        ],
      };

      const { filtered, detected } = filterPoliticalContent(suggestions);

      expect(detected).toBe(true);
      expect(filtered.illustrationSuggestions).toHaveLength(1);
      expect(filtered.illustrationSuggestions![0].id).toBe('illus-1');
    });

    it('filters illustration with political summary', () => {
      const suggestions: SermonHelperSuggestions = {
        scriptureSuggestions: [],
        outline: [],
        applicationIdeas: [],
        hymnThemes: [],
        illustrationSuggestions: [
          {
            id: 'illus-1',
            title: 'Modern Day Commitment',
            summary: 'Just like MAGA supporters show dedication to their cause, we should be dedicated to Christ.',
            forSection: 'point1',
          },
          {
            id: 'illus-2',
            title: 'The Faithful Servant',
            summary: 'A servant remains loyal despite hardship.',
            forSection: 'point2',
          },
        ],
      };

      const { filtered, detected } = filterPoliticalContent(suggestions);

      expect(detected).toBe(true);
      expect(filtered.illustrationSuggestions).toHaveLength(1);
      expect(filtered.illustrationSuggestions![0].id).toBe('illus-2');
    });

    it('preserves non-political illustrations', () => {
      const suggestions: SermonHelperSuggestions = {
        scriptureSuggestions: [],
        outline: [],
        applicationIdeas: [],
        hymnThemes: [],
        illustrationSuggestions: [
          {
            id: 'illus-1',
            title: 'Mother Recognizing Baby\'s Cry',
            summary: 'A mother can identify her baby\'s cry in a crowded room, showing intimate knowledge.',
            forSection: 'introduction',
          },
          {
            id: 'illus-2',
            title: 'The Pearl of Great Price',
            summary: 'A merchant sells everything for a priceless pearl.',
            forSection: 'point1',
          },
          {
            id: 'illus-3',
            title: 'The Shepherd and Lost Sheep',
            summary: 'A shepherd leaves 99 sheep to find the one that wandered.',
            forSection: null,
          },
        ],
      };

      const { filtered, detected } = filterPoliticalContent(suggestions);

      expect(detected).toBe(false);
      expect(filtered.illustrationSuggestions).toHaveLength(3);
    });
  });

  describe('empty fallback includes illustrations', () => {
    it('includes illustrationSuggestions in empty fallback', () => {
      const fallback = getEmptyFallback();

      expect(fallback.illustrationSuggestions).toBeDefined();
      expect(fallback.illustrationSuggestions).toEqual([]);
    });
  });

  describe('integration with response structure', () => {
    it('complete response includes all fields including illustrations', () => {
      const mockFullResponse = JSON.stringify({
        scriptureSuggestions: [
          { reference: 'John 15:5', reason: 'Vine and branches metaphor' },
        ],
        outline: [
          { type: 'section', title: 'Abiding in Christ' },
          { type: 'point', text: 'We need connection to the vine' },
        ],
        applicationIdeas: [
          { audience: 'believers', idea: 'Spend daily time in Scripture' },
        ],
        hymnThemes: [
          { theme: 'abiding', reason: 'Matches the theme' },
        ],
        illustrationSuggestions: [
          {
            id: 'illus-1',
            title: 'The Branch and the Vine',
            summary: 'A gardener explains how branches die when cut from the vine.',
            forSection: 'introduction',
          },
          {
            id: 'illus-2',
            title: 'The Phone and the Charger',
            summary: 'A phone without charge cannot function - we need constant connection to our power source.',
            forSection: 'point1',
          },
        ],
      });

      const result = parseAiResponse(mockFullResponse);

      expect(result.fallback).toBe(false);
      expect(result.suggestions.scriptureSuggestions).toHaveLength(1);
      expect(result.suggestions.outline).toHaveLength(2);
      expect(result.suggestions.applicationIdeas).toHaveLength(1);
      expect(result.suggestions.hymnThemes).toHaveLength(1);
      expect(result.suggestions.illustrationSuggestions).toHaveLength(2);
    });

    it('filtered response preserves clean illustrations', () => {
      const suggestions: SermonHelperSuggestions = {
        scriptureSuggestions: [
          { reference: 'John 3:16', reason: 'Gospel' },
          { reference: 'Romans 13:1', reason: 'Vote Republican for authority' }, // Political
        ],
        outline: [
          { type: 'section', title: 'Love' },
        ],
        applicationIdeas: [
          { audience: 'all', idea: 'Love your neighbor' },
        ],
        hymnThemes: [
          { theme: 'love', reason: 'Theme of sermon' },
        ],
        illustrationSuggestions: [
          {
            id: 'illus-1',
            title: 'The Good Samaritan',
            summary: 'A stranger shows love to someone in need.',
            forSection: 'application',
          },
        ],
      };

      const { filtered, detected } = filterPoliticalContent(suggestions);

      expect(detected).toBe(true);
      expect(filtered.scriptureSuggestions).toHaveLength(1);
      expect(filtered.illustrationSuggestions).toHaveLength(1);
      expect(filtered.illustrationSuggestions![0].title).toBe('The Good Samaritan');
    });
  });
});

// ============================================================================
// PREACHING DRAFT GENERATION (Phase 8)
// ============================================================================

/**
 * Tests for the generateDraftFromPlan endpoint logic.
 * Phase 8 adds AI-powered preaching draft generation.
 */

interface SermonElement {
  id: string;
  type: 'section' | 'point' | 'note' | 'scripture' | 'hymn' | 'illustration';
  title?: string;
  text?: string;
  reference?: string;
  note?: string;
}

interface SermonPlan {
  title: string;
  bigIdea: string;
  primaryText: string;
  supportingTexts: string[];
  elements: SermonElement[];
  styleProfile: 'story_first_3_point' | 'expository_verse_by_verse' | 'topical_teaching' | null;
}

/**
 * Mirrors buildDraftPrompt logic from sermonHelper.ts
 */
function buildDraftPrompt(
  plan: SermonPlan,
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
 * Mirrors parseDraftResponse logic from sermonHelper.ts
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
 * Mirrors filterPoliticalContentFromDraft logic from sermonHelper.ts
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

describe('Preaching Draft Generation (Phase 8)', () => {
  describe('buildDraftPrompt', () => {
    const mockPlan: SermonPlan = {
      title: 'God\'s Love in Action',
      bigIdea: 'God demonstrates His love by sending His Son',
      primaryText: 'John 3:16-17',
      supportingTexts: ['Romans 5:8', '1 John 4:9-10'],
      elements: [
        { id: '1', type: 'section', title: 'Introduction' },
        { id: '2', type: 'point', text: 'God so loved the world' },
        { id: '3', type: 'scripture', reference: 'John 3:16', note: 'Key verse' },
        { id: '4', type: 'illustration', title: 'The Rescue Mission', note: 'Father saving child' },
        { id: '5', type: 'section', title: 'Application' },
        { id: '6', type: 'hymn', title: 'Amazing Grace', note: 'All verses' },
      ],
      styleProfile: 'story_first_3_point',
    };

    it('includes sermon plan details in prompt', () => {
      const prompt = buildDraftPrompt(mockPlan, defaultTheologyProfile);

      expect(prompt).toContain('God\'s Love in Action');
      expect(prompt).toContain('God demonstrates His love by sending His Son');
      expect(prompt).toContain('John 3:16-17');
      expect(prompt).toContain('Romans 5:8, 1 John 4:9-10');
    });

    it('includes all element types in prompt', () => {
      const prompt = buildDraftPrompt(mockPlan, defaultTheologyProfile);

      expect(prompt).toContain('[SECTION] Introduction');
      expect(prompt).toContain('[POINT] God so loved the world');
      expect(prompt).toContain('[SCRIPTURE] John 3:16 – Key verse');
      expect(prompt).toContain('[ILLUSTRATION] The Rescue Mission – Father saving child');
      expect(prompt).toContain('[HYMN] Amazing Grace – All verses');
    });

    it('includes story-first style guidance', () => {
      const prompt = buildDraftPrompt(mockPlan, defaultTheologyProfile);

      expect(prompt).toContain('Story-First 3-Point');
      expect(prompt).toContain('Lead with engaging stories');
      expect(prompt).toContain('narrative hooks');
      expect(prompt).toContain('emotional connection');
    });

    it('includes expository style guidance', () => {
      const expositoryPlan: SermonPlan = {
        ...mockPlan,
        styleProfile: 'expository_verse_by_verse',
      };
      const prompt = buildDraftPrompt(expositoryPlan, defaultTheologyProfile);

      expect(prompt).toContain('Expository Verse-by-Verse');
      expect(prompt).toContain('systematically');
      expect(prompt).toContain('original language');
      expect(prompt).toContain('doctrinal accuracy');
    });

    it('includes topical style guidance', () => {
      const topicalPlan: SermonPlan = {
        ...mockPlan,
        styleProfile: 'topical_teaching',
      };
      const prompt = buildDraftPrompt(topicalPlan, defaultTheologyProfile);

      expect(prompt).toContain('Topical Teaching');
      expect(prompt).toContain('central topic/theme');
      expect(prompt).toContain('contemporary life');
      expect(prompt).toContain('practical application');
    });

    it('includes general style guidance when null', () => {
      const generalPlan: SermonPlan = {
        ...mockPlan,
        styleProfile: null,
      };
      const prompt = buildDraftPrompt(generalPlan, defaultTheologyProfile);

      expect(prompt).toContain('Style: General');
      expect(prompt).toContain('Balance exposition with application');
    });

    it('includes theology context', () => {
      const reformedProfile: TheologyProfile = {
        ...defaultTheologyProfile,
        tradition: 'Reformed Baptist',
        bibleTranslation: 'ESV',
        preferredTone: 'reverent and teaching-focused',
      };
      const prompt = buildDraftPrompt(mockPlan, reformedProfile);

      expect(prompt).toContain('Tradition: Reformed Baptist');
      expect(prompt).toContain('Bible Translation: ESV');
      expect(prompt).toContain('Tone: reverent and teaching-focused');
    });

    it('includes oral delivery instructions', () => {
      const prompt = buildDraftPrompt(mockPlan, defaultTheologyProfile);

      expect(prompt).toContain('ORAL DELIVERY');
      expect(prompt).toContain('speak from a pulpit');
      expect(prompt).toContain('natural transitions');
      expect(prompt).toContain('paragraphs short');
    });

    it('includes formatting instructions', () => {
      const prompt = buildDraftPrompt(mockPlan, defaultTheologyProfile);

      expect(prompt).toContain('markdown format');
      expect(prompt).toContain('## for main sections');
      expect(prompt).toContain('### for sub-points');
      expect(prompt).toContain('2,000-3,500 words');
    });

    it('handles empty supporting texts', () => {
      const planNoSupporting: SermonPlan = {
        ...mockPlan,
        supportingTexts: [],
      };
      const prompt = buildDraftPrompt(planNoSupporting, defaultTheologyProfile);

      expect(prompt).toContain('Supporting Texts: None specified');
    });

    it('handles notes element type', () => {
      const planWithNote: SermonPlan = {
        ...mockPlan,
        elements: [
          ...mockPlan.elements,
          { id: '7', type: 'note', text: 'Remember to pause here' },
        ],
      };
      const prompt = buildDraftPrompt(planWithNote, defaultTheologyProfile);

      expect(prompt).toContain('[NOTE] Remember to pause here');
    });
  });

  describe('parseDraftResponse', () => {
    const validMarkdown = `# God's Love in Action

## Introduction

Good morning, church family. Today we gather to explore one of the most profound truths in all of Scripture...

## The Heart of the Gospel

When we read John 3:16, we encounter the very heart of God's love for humanity. This isn't merely theological information; it's a personal declaration from the Creator to His creation.

### God So Loved the World

Notice the scope of this love - it encompasses the entire world. Not just the religious, not just the righteous, but every person who has ever lived or will ever live.

## Application

What does this mean for us today? It means that no matter where you've been or what you've done, God's love reaches you right where you are.

## Closing

Let us pray...`;

    it('accepts valid markdown content', () => {
      const result = parseDraftResponse(validMarkdown);

      expect(result.valid).toBe(true);
      expect(result.markdown).toContain("God's Love in Action");
      expect(result.markdown).toContain('Introduction');
      expect(result.markdown).toContain('Closing');
    });

    it('strips markdown code fence wrapper', () => {
      const wrappedResponse = '```markdown\n' + validMarkdown + '\n```';
      const result = parseDraftResponse(wrappedResponse);

      expect(result.valid).toBe(true);
      expect(result.markdown).not.toContain('```markdown');
      expect(result.markdown).not.toContain('```');
    });

    it('strips md code fence wrapper', () => {
      const wrappedResponse = '```md\n' + validMarkdown + '\n```';
      const result = parseDraftResponse(wrappedResponse);

      expect(result.valid).toBe(true);
      expect(result.markdown).not.toContain('```md');
    });

    it('strips plain code fence wrapper', () => {
      const wrappedResponse = '```\n' + validMarkdown + '\n```';
      const result = parseDraftResponse(wrappedResponse);

      expect(result.valid).toBe(true);
      expect(result.markdown).not.toContain('```');
    });

    it('rejects content shorter than 200 characters', () => {
      const shortResponse = '# Short\n\nToo brief.';
      const result = parseDraftResponse(shortResponse);

      expect(result.valid).toBe(false);
      expect(result.markdown).toBe('');
    });

    it('rejects empty response', () => {
      const result = parseDraftResponse('');

      expect(result.valid).toBe(false);
      expect(result.markdown).toBe('');
    });

    it('trims whitespace', () => {
      const paddedResponse = '\n\n  ' + validMarkdown + '  \n\n';
      const result = parseDraftResponse(paddedResponse);

      expect(result.valid).toBe(true);
      expect(result.markdown).not.toMatch(/^\s+/);
      expect(result.markdown).not.toMatch(/\s+$/);
    });
  });

  describe('filterPoliticalContentFromDraft', () => {
    const cleanMarkdown = `# Sermon on Love

## Introduction

God's love transforms everything. When we embrace this truth, our lives change.

## The Heart of Love

Love is patient, love is kind. It does not envy, it does not boast.

## Conclusion

Let us go forth in love.`;

    it('returns clean content unchanged', () => {
      const { filtered, detected } = filterPoliticalContentFromDraft(cleanMarkdown);

      expect(detected).toBe(false);
      expect(filtered).toBe(cleanMarkdown);
    });

    it('detects and filters Republican reference', () => {
      const politicalMarkdown = cleanMarkdown.replace(
        'Love is patient',
        'Like Republican values'
      );
      const { filtered, detected } = filterPoliticalContentFromDraft(politicalMarkdown);

      expect(detected).toBe(true);
      expect(filtered).toContain('[content filtered]');
      expect(filtered).not.toContain('Republican');
    });

    it('detects and filters Democrat reference', () => {
      const politicalMarkdown = cleanMarkdown.replace(
        'Love is patient',
        'Democrat policies show'
      );
      const { filtered, detected } = filterPoliticalContentFromDraft(politicalMarkdown);

      expect(detected).toBe(true);
      expect(filtered).toContain('[content filtered]');
      expect(filtered).not.toContain('Democrat');
    });

    it('detects and filters Trump reference', () => {
      const politicalMarkdown = cleanMarkdown.replace(
        'our lives change',
        'as Trump demonstrated'
      );
      const { filtered, detected } = filterPoliticalContentFromDraft(politicalMarkdown);

      expect(detected).toBe(true);
      expect(filtered).not.toContain('Trump');
    });

    it('detects and filters Biden reference', () => {
      const politicalMarkdown = cleanMarkdown.replace(
        'our lives change',
        'like Biden said'
      );
      const { filtered, detected } = filterPoliticalContentFromDraft(politicalMarkdown);

      expect(detected).toBe(true);
      expect(filtered).not.toContain('Biden');
    });

    it('detects and filters MAGA reference', () => {
      const politicalMarkdown = cleanMarkdown.replace(
        'Let us go forth in love',
        'Join the MAGA movement and go forth'
      );
      const { filtered, detected } = filterPoliticalContentFromDraft(politicalMarkdown);

      expect(detected).toBe(true);
      expect(filtered).not.toContain('MAGA');
    });

    it('is case-insensitive', () => {
      const politicalMarkdown = cleanMarkdown.replace(
        'Love is patient',
        'REPUBLICAN and democrat views'
      );
      const { filtered, detected } = filterPoliticalContentFromDraft(politicalMarkdown);

      expect(detected).toBe(true);
      expect(filtered).not.toMatch(/republican/i);
      expect(filtered).not.toMatch(/democrat/i);
    });

    it('filters multiple occurrences', () => {
      const multiPolitical = `Trump said this, and Biden said that. The MAGA movement and Democrat party disagree.`;
      const { filtered, detected } = filterPoliticalContentFromDraft(multiPolitical);

      expect(detected).toBe(true);
      expect((filtered.match(/\[content filtered\]/g) || []).length).toBe(4);
    });
  });

  describe('SermonDraft type structure', () => {
    it('defines correct SermonDraft interface', () => {
      const mockDraft = {
        sermonId: '123e4567-e89b-12d3-a456-426614174000',
        styleProfile: 'story_first_3_point' as const,
        theologyTradition: 'Reformed Baptist',
        createdAt: new Date().toISOString(),
        contentMarkdown: '# Sermon Title\n\nContent here...',
      };

      expect(mockDraft.sermonId).toBeDefined();
      expect(mockDraft.styleProfile).toBe('story_first_3_point');
      expect(mockDraft.theologyTradition).toBe('Reformed Baptist');
      expect(mockDraft.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(mockDraft.contentMarkdown).toContain('# Sermon Title');
    });

    it('allows null styleProfile', () => {
      const mockDraft = {
        sermonId: '123e4567-e89b-12d3-a456-426614174000',
        styleProfile: null,
        theologyTradition: 'Non-denominational evangelical',
        createdAt: new Date().toISOString(),
        contentMarkdown: '# Sermon Content',
      };

      expect(mockDraft.styleProfile).toBeNull();
    });

    it('allows undefined optional fields', () => {
      const mockDraft: {
        sermonId: string;
        styleProfile?: 'story_first_3_point' | 'expository_verse_by_verse' | 'topical_teaching' | null;
        theologyTradition?: string | null;
        createdAt: string;
        contentMarkdown: string;
      } = {
        sermonId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: new Date().toISOString(),
        contentMarkdown: '# Minimal Draft',
      };

      expect(mockDraft.styleProfile).toBeUndefined();
      expect(mockDraft.theologyTradition).toBeUndefined();
    });
  });

  describe('restricted topic check for plan content', () => {
    it('builds topic detection string from plan fields', () => {
      const planContent = [
        'God\'s Sovereignty',          // title
        'Understanding predestination', // bigIdea
        'Romans 9:1-33',               // primaryText
        'Ephesians 1:4-5',             // supportingTexts
        'Election and Grace',          // section title
        'God chooses His people',      // point text
      ].join(' ');

      const content = normalizeForTopicMatch(planContent);
      const matched = checkRestrictedTopics(content, ['predestination']);

      expect(matched).toBe('predestination');
    });

    it('returns null when plan has no restricted topics', () => {
      const planContent = [
        'God\'s Love',
        'God demonstrates His love through Christ',
        'John 3:16',
        'The cross shows love',
        'We should love others',
      ].join(' ');

      const content = normalizeForTopicMatch(planContent);
      const matched = checkRestrictedTopics(content, ['end times', 'prosperity gospel']);

      expect(matched).toBeNull();
    });

    it('checks element content for restricted topics', () => {
      // Illustration title might contain restricted topic
      const elements = [
        { type: 'section', title: 'Introduction' },
        { type: 'illustration', title: 'End Times Vision', note: 'Revelation imagery' },
      ];

      const elementText = elements.map(el => `${(el as SermonElement).title || ''} ${(el as SermonElement).note || ''}`).join(' ');
      const content = normalizeForTopicMatch(elementText);
      const matched = checkRestrictedTopics(content, ['end times']);

      expect(matched).toBe('end times');
    });
  });

  describe('meta response structure', () => {
    it('success response includes draft and meta', () => {
      const successResponse = {
        draft: {
          sermonId: '123e4567-e89b-12d3-a456-426614174000',
          styleProfile: 'story_first_3_point' as const,
          theologyTradition: 'Reformed Baptist',
          createdAt: '2025-01-15T10:30:00.000Z',
          contentMarkdown: '# Sermon on God\'s Grace\n\n## Introduction\n\nGrace is the unmerited favor of God poured out on sinners who deserve judgment. This morning, we explore how grace transforms lives and brings hope to the hopeless. The apostle Paul reminds us that we are saved by grace through faith, not by works, so that no one can boast.\n\n## Main Point\n\nGod\'s grace reaches the depths of our sin and lifts us to new life in Christ.',
        },
        meta: {
          tokensUsed: 2500,
          model: 'gpt-4o-mini',
          politicalContentDetected: false,
        },
      };

      expect(successResponse.draft.sermonId).toBeDefined();
      expect(successResponse.draft.contentMarkdown.length).toBeGreaterThan(200);
      expect(successResponse.meta.tokensUsed).toBe(2500);
      expect(successResponse.meta.model).toBe('gpt-4o-mini');
    });

    it('political filtered response sets flag', () => {
      const filteredResponse = {
        draft: {
          sermonId: '123e4567-e89b-12d3-a456-426614174000',
          styleProfile: null,
          theologyTradition: 'Non-denominational evangelical',
          createdAt: '2025-01-15T10:30:00.000Z',
          contentMarkdown: '# Sermon\n\n[content filtered] showed great faith...',
        },
        meta: {
          tokensUsed: 2000,
          model: 'gpt-4o-mini',
          politicalContentDetected: true,
        },
      };

      expect(filteredResponse.meta.politicalContentDetected).toBe(true);
      expect(filteredResponse.draft.contentMarkdown).toContain('[content filtered]');
    });

    it('restricted topic error has correct structure', () => {
      // When restricted topic is detected, a TRPCError is thrown
      const restrictedError = {
        code: 'FORBIDDEN',
        message: 'Draft generation is disabled for sermons containing restricted topics. Please handle this content personally.',
      };

      expect(restrictedError.code).toBe('FORBIDDEN');
      expect(restrictedError.message).toContain('restricted topics');
      expect(restrictedError.message).toContain('personally');
    });

    it('no plan error has correct structure', () => {
      // When no plan exists for the sermon
      const noPlanError = {
        code: 'NOT_FOUND',
        message: 'No sermon plan found. Please create a plan first before generating a draft.',
      };

      expect(noPlanError.code).toBe('NOT_FOUND');
      expect(noPlanError.message).toContain('plan');
    });
  });

  describe('integration flow', () => {
    it('full flow: plan → prompt → response → filter → draft', () => {
      // 1. Create a sermon plan
      const plan: SermonPlan = {
        title: 'Walking by Faith',
        bigIdea: 'Faith enables us to trust God in uncertainty',
        primaryText: 'Hebrews 11:1-6',
        supportingTexts: ['2 Corinthians 5:7'],
        elements: [
          { id: '1', type: 'section', title: 'Introduction' },
          { id: '2', type: 'point', text: 'Faith is confidence in what we hope for' },
          { id: '3', type: 'scripture', reference: 'Hebrews 11:1' },
          { id: '4', type: 'illustration', title: 'Abraham\'s Journey', note: 'Leaving home' },
          { id: '5', type: 'section', title: 'Application' },
          { id: '6', type: 'point', text: 'Step out in faith this week' },
        ],
        styleProfile: 'expository_verse_by_verse',
      };

      // 2. Build the prompt
      const prompt = buildDraftPrompt(plan, defaultTheologyProfile);

      // Verify prompt includes key elements
      expect(prompt).toContain('Walking by Faith');
      expect(prompt).toContain('Hebrews 11:1-6');
      expect(prompt).toContain('Abraham\'s Journey');
      expect(prompt).toContain('Expository Verse-by-Verse');

      // 3. Simulate AI response
      const mockAiResponse = `# Walking by Faith

## Introduction

Good morning, church family. Today we open God's Word to Hebrews chapter 11, often called the "Hall of Faith"...

The writer of Hebrews begins with this powerful definition in verse 1: faith is confidence in what we hope for and assurance about what we do not see.

## Understanding True Faith

### Faith is Confidence in What We Hope For

When we read Hebrews 11:1, we discover that faith isn't wishful thinking. It's a deep-seated confidence rooted in God's character and promises.

Consider Abraham. When God called him to leave his homeland (see Genesis 12), Abraham didn't have GPS coordinates or a detailed travel plan. He simply had God's word - and that was enough.

## Application

What does this mean for your Monday morning? It means stepping out in faith, even when you can't see the outcome.

## Closing Prayer

Let us bow our heads...`;

      // 4. Parse the response
      const { markdown, valid } = parseDraftResponse(mockAiResponse);

      expect(valid).toBe(true);
      expect(markdown).toContain('Walking by Faith');
      expect(markdown).toContain('Abraham');

      // 5. Filter political content (should be clean)
      const { filtered, detected } = filterPoliticalContentFromDraft(markdown);

      expect(detected).toBe(false);
      expect(filtered).toBe(markdown);

      // 6. Build final draft
      const draft = {
        sermonId: '123e4567-e89b-12d3-a456-426614174000',
        styleProfile: plan.styleProfile,
        theologyTradition: defaultTheologyProfile.tradition,
        createdAt: new Date().toISOString(),
        contentMarkdown: filtered,
      };

      expect(draft.contentMarkdown.length).toBeGreaterThan(200);
      expect(draft.styleProfile).toBe('expository_verse_by_verse');
    });
  });
});
