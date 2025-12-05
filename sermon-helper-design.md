# Sermon Helper Module - Design Document

**Version:** 1.0  
**Date:** December 2024  
**Purpose:** Technical design review  

---

## 1. Executive Summary

Sermon Helper is a module for an existing multi-tenant B2B SaaS platform. It reduces sermon preparation time from 10-20 hours to 4-6 hours by providing AI-powered search for scriptures, hymns, and sermon structure suggestions.

**Target Users:** Pastors, ministers, worship leaders across various Christian denominations.

**Deployment:** Web-only, integrated into existing platform infrastructure.

---

## 2. Problem Statement

Pastors spend significant time each week on sermon preparation tasks that could be automated or assisted:

- Searching for relevant scripture passages (2-4 hours)
- Finding hymns that match the sermon theme (1-2 hours)
- Organizing thoughts into a coherent outline (2-4 hours)
- Cross-referencing commentaries and illustrations (2-4 hours)

**Goal:** Reduce this time by 50-60% through intelligent search and AI assistance.

---

## 3. Core Features

### 3.1 AI Theme Search

**Input:** User enters a sermon theme (e.g., "forgiveness", "hope in suffering")

**Output:** AI returns:
- 3-5 relevant scripture passages with explanations of relevance
- 3-4 hymn suggestions with reasoning
- 3-4 sermon outline point suggestions
- 1-2 illustration ideas

**Technology:** Claude API (claude-sonnet-4-20250514 model)

**Prompt Structure:**
```
Given the theme "[USER_THEME]", provide:
- Scriptures with relevance explanations
- Hymns that complement the theme
- Outline structure suggestions
- Illustration ideas

Return as structured JSON.
```

### 3.2 Scripture Search

**Search Methods:**
- By reference (e.g., "John 3:16")
- By keyword (e.g., "love", "redemption")
- By theme/topic (e.g., "salvation", "comfort")

**Data Source Options:**
- Public domain: KJV, ASV, WEB translations
- Licensed: ESV, NIV, NASB (requires API agreements)

**Metadata Per Verse:**
- Reference (Book, Chapter, Verse)
- Full text
- Theme tags
- Cross-references
- Commentary snippets (optional)

### 3.3 Hymn Finder

**Search Methods:**
- By title
- By theme/topic
- By scripture reference (hymns based on specific passages)
- By occasion (Easter, Christmas, Communion, etc.)

**Denomination Filtering:**
- Baptist
- Methodist
- Lutheran
- Presbyterian
- Catholic
- Episcopal
- Non-denominational
- Pentecostal
- Church of Christ
- Other

**Metadata Per Hymn:**
- Title
- Author/Composer
- Year written
- Themes (array)
- Denominations that use it (array)
- Suggested service placement (opening, offertory, closing, etc.)
- Lyrics (if public domain or licensed)
- Tune name

### 3.4 Sermon Builder

**Components:**
- Sermon metadata (title, date, series, speaker)
- Ordered list of sermon elements
- Export functionality

**Element Types:**
| Type | Fields |
|------|--------|
| Scripture | Reference, text, translation, notes |
| Hymn | Title, placement suggestion, notes |
| Section Header | Title text |
| Main Point | Point text, supporting notes |
| Illustration | Story/example text |
| Note | Freeform text |
| Quote | Text, attribution |

**Interactions:**
- Add elements from AI suggestions or search results
- Reorder via drag-and-drop
- Edit inline notes for each element
- Delete elements
- Duplicate elements

### 3.5 Service Planner (Future Phase)

**Full order of service builder including:**
- Call to worship
- Opening hymn
- Prayer
- Scripture reading
- Sermon
- Closing hymn
- Benediction
- Announcements

**Export to:** Print bulletin, presentation slides, planning center integration

---

## 4. Technical Architecture

### 4.1 System Context

```
┌─────────────────────────────────────────────────────────────┐
│                    EXISTING PLATFORM                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │   Auth &    │  │   Tenant    │  │   Other Platform    │ │
│  │   Users     │  │   Config    │  │   Modules           │ │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────────┘ │
│         │                │                                  │
│         └────────┬───────┘                                  │
│                  │                                          │
│         ┌────────▼────────┐                                 │
│         │  SERMON HELPER  │                                 │
│         │     MODULE      │                                 │
│         └────────┬────────┘                                 │
│                  │                                          │
└──────────────────┼──────────────────────────────────────────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
     ▼             ▼             ▼
┌─────────┐  ┌─────────┐  ┌─────────┐
│ Claude  │  │ Bible   │  │  Hymn   │
│   API   │  │   API   │  │   DB    │
└─────────┘  └─────────┘  └─────────┘
```

### 4.2 Component Architecture

```
sermon-helper/
├── components/
│   ├── SermonBuilder/
│   │   ├── SermonBuilder.jsx       # Main builder container
│   │   ├── SermonMetadata.jsx      # Title, date, series inputs
│   │   ├── ElementList.jsx         # Draggable element list
│   │   ├── ElementCard.jsx         # Individual element display
│   │   └── ExportPanel.jsx         # Export options
│   │
│   ├── AIAssistant/
│   │   ├── ThemeSearch.jsx         # Theme input and search
│   │   ├── SuggestionPanel.jsx     # Display AI suggestions
│   │   └── SuggestionCard.jsx      # Individual suggestion
│   │
│   ├── ScriptureSearch/
│   │   ├── ScriptureSearch.jsx     # Search interface
│   │   ├── ScriptureResults.jsx    # Results list
│   │   └── ScriptureCard.jsx       # Individual scripture
│   │
│   └── HymnFinder/
│       ├── HymnFinder.jsx          # Search interface
│       ├── HymnResults.jsx         # Results list
│       ├── HymnCard.jsx            # Individual hymn
│       └── DenominationFilter.jsx  # Denomination selector
│
├── services/
│   ├── aiService.js                # Claude API integration
│   ├── scriptureService.js         # Bible API integration
│   ├── hymnService.js              # Hymn database queries
│   └── exportService.js            # Export generation
│
├── hooks/
│   ├── useSermon.js                # Sermon state management
│   ├── useAISuggestions.js         # AI search state
│   └── useSearch.js                # Search state
│
├── types/
│   └── index.ts                    # TypeScript interfaces
│
└── utils/
    ├── formatters.js               # Text formatting
    └── validators.js               # Input validation
```

### 4.3 Data Models

#### Sermon
```typescript
interface Sermon {
  id: string;
  tenantId: string;
  userId: string;
  title: string;
  date: string;                    // ISO date
  series?: string;
  theme?: string;
  elements: SermonElement[];
  status: 'draft' | 'complete';
  createdAt: string;
  updatedAt: string;
}
```

#### SermonElement
```typescript
interface SermonElement {
  id: string;
  type: 'scripture' | 'hymn' | 'section' | 'point' | 'illustration' | 'note' | 'quote';
  order: number;
  content: ScriptureContent | HymnContent | TextContent | QuoteContent;
  notes?: string;
}

interface ScriptureContent {
  reference: string;
  text: string;
  translation: string;
}

interface HymnContent {
  title: string;
  author?: string;
  placement?: string;
}

interface TextContent {
  text: string;
}

interface QuoteContent {
  text: string;
  attribution: string;
}
```

#### Scripture (Reference Data)
```typescript
interface Scripture {
  id: string;
  book: string;
  chapter: number;
  verseStart: number;
  verseEnd?: number;
  text: string;
  translation: string;
  themes: string[];
  crossReferences: string[];
}
```

#### Hymn (Reference Data)
```typescript
interface Hymn {
  id: string;
  title: string;
  author: string;
  composer?: string;
  year?: number;
  themes: string[];
  denominations: string[];
  occasions: string[];
  suggestedPlacements: string[];
  lyrics?: string;                 // If public domain
  tuneName?: string;
  meter?: string;
  isPublicDomain: boolean;
}
```

### 4.4 API Endpoints

#### Sermons
```
GET    /api/sermons                 # List user's sermons
POST   /api/sermons                 # Create new sermon
GET    /api/sermons/:id             # Get sermon by ID
PUT    /api/sermons/:id             # Update sermon
DELETE /api/sermons/:id             # Delete sermon
POST   /api/sermons/:id/export      # Export sermon (PDF, DOCX, etc.)
```

#### AI Assistant
```
POST   /api/ai/theme-search         # Get AI suggestions for theme
  Body: { theme: string, denominationPreference?: string }
  Response: { scriptures: [], hymns: [], outlineIdeas: [], illustrations: [] }
```

#### Scripture Search
```
GET    /api/scriptures/search       # Search scriptures
  Query: { q: string, themes?: string[], translation?: string, limit?: number }

GET    /api/scriptures/:reference   # Get specific passage
  Params: { reference: "john-3-16" }
```

#### Hymn Search
```
GET    /api/hymns/search            # Search hymns
  Query: { q: string, themes?: string[], denominations?: string[], occasions?: string[], limit?: number }

GET    /api/hymns/:id               # Get specific hymn
```

---

## 5. AI Integration Details

### 5.1 Claude API Configuration

**Model:** claude-sonnet-4-20250514  
**Max Tokens:** 1500  
**Temperature:** 0.7 (balanced creativity/consistency)

### 5.2 Prompt Engineering

**System Context:**
```
You are a sermon preparation assistant helping pastors find relevant 
scriptures, hymns, and develop sermon outlines. You are knowledgeable 
about Christian theology across denominations. Provide practical, 
actionable suggestions.
```

**Theme Search Prompt:**
```
Given the sermon theme "[THEME]", provide suggestions in this JSON format:

{
  "scriptures": [
    {
      "reference": "Book Chapter:Verse",
      "relevance": "1-2 sentence explanation of why this fits the theme"
    }
  ],
  "hymns": [
    {
      "title": "Hymn Title",
      "reason": "Why this hymn complements the theme"
    }
  ],
  "outlineIdeas": [
    "Main point that could structure the sermon"
  ],
  "illustrations": [
    "Brief illustration idea connecting to the theme"
  ]
}

Provide 3-4 scriptures, 3 hymns, 3 outline points, and 1-2 illustrations.
Prioritize well-known passages and hymns used across denominations.
Return ONLY valid JSON with no additional text.
```

### 5.3 Error Handling

| Scenario | Handling |
|----------|----------|
| API timeout | Retry once, then show cached/fallback suggestions |
| Invalid JSON response | Parse what's possible, log error, show partial results |
| Rate limiting | Queue requests, show loading state |
| Empty results | Show helpful message with search tips |

### 5.4 Caching Strategy

- Cache AI responses by theme (24-hour TTL)
- Cache scripture lookups indefinitely (content doesn't change)
- Cache hymn searches (1-hour TTL)

---

## 6. Data Sources

### 6.1 Scripture Data

**Option A: Bible API (api.bible)**
- Pros: Multiple translations, well-maintained
- Cons: Rate limits, requires API key per tenant

**Option B: Self-hosted database**
- Pros: No external dependencies, faster
- Cons: Need to license translations, storage costs

**Recommended:** Hybrid - self-host public domain (KJV, WEB) + API for licensed translations

### 6.2 Hymn Data

**Public Domain Sources:**
- Hymnary.org (API available)
- CPDL (Choral Public Domain Library)
- CyberHymnal archive

**Licensed Sources (if needed):**
- CCLI SongSelect API
- Hymnary premium

**Recommended:** Start with public domain (~10,000 hymns), add licensed content based on customer demand

---

## 7. Multi-Tenant Considerations

### 7.1 Tenant Configuration

Each tenant can configure:
- Default Bible translation
- Preferred denominations (filters hymn results)
- Custom hymnal (tenant-specific hymns)
- AI suggestion preferences
- Export templates

### 7.2 Data Isolation

| Data Type | Isolation |
|-----------|-----------|
| Sermons | Per-tenant, per-user |
| Scripture DB | Shared (read-only) |
| Hymn DB | Shared base + tenant additions |
| AI Cache | Shared (theme-based) |
| Export Templates | Per-tenant |

### 7.3 Usage Tracking

Track per tenant:
- AI API calls (for billing/limits)
- Sermons created
- Exports generated
- Search queries (for improvement)

---

## 8. Export Functionality

### 8.1 Export Formats

| Format | Use Case |
|--------|----------|
| PDF | Print-ready sermon notes |
| DOCX | Editable in Word |
| Plain Text | Copy/paste anywhere |
| Markdown | Technical users |
| HTML | Web display |
| JSON | API integration |

### 8.2 Export Contents

- Sermon title, date, series
- All elements in order
- Scripture texts (full or reference-only option)
- Hymn titles with suggested placements
- Notes and illustrations
- Optional: speaker notes vs. bulletin version

---

## 9. User Interface Specifications

### 9.1 Layout

**Desktop (1024px+):**
```
┌─────────────────────────────────────────────────────────┐
│  Header: Logo | Sermon Helper | [User Menu]             │
├─────────────────────────────────────────────────────────┤
│  Tabs: [Builder] [Scripture Search] [Hymn Finder]       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐  ┌─────────────────────────────────┐  │
│  │             │  │                                 │  │
│  │  Sidebar    │  │       Main Content Area         │  │
│  │  - Details  │  │       - Sermon Outline          │  │
│  │  - AI       │  │       - Search Results          │  │
│  │             │  │                                 │  │
│  └─────────────┘  └─────────────────────────────────┘  │
│       300px              Remaining Width                │
└─────────────────────────────────────────────────────────┘
```

**Tablet (768-1023px):**
- Collapsible sidebar
- Full-width content area

**Mobile (< 768px):**
- Not primary target (web-only spec)
- Basic responsive support

### 9.2 Interaction Patterns

| Action | Interaction |
|--------|-------------|
| Add to sermon | Click "+" button on any search result or suggestion |
| Reorder elements | Drag handle or up/down arrows |
| Edit element | Click to expand, inline editing |
| Delete element | Click "X", confirm if has content |
| AI search | Enter theme, click button, results appear in sidebar |
| Export | Click export button, select format, download |

### 9.3 Visual Design

- **Primary Color:** Indigo (#4F46E5) - trustworthy, calm
- **Scripture elements:** Blue tint background
- **Hymn elements:** Purple tint background
- **Notes/sections:** Gray/neutral background
- **AI suggestions:** Gradient indigo-to-purple panel

---

## 10. Security Considerations

### 10.1 Authentication

- Inherit from parent platform
- Module-level permissions: `sermon:read`, `sermon:write`, `sermon:export`

### 10.2 Data Security

- All API calls over HTTPS
- Claude API key stored in environment variables (server-side only)
- No PII in AI prompts
- Sermon data encrypted at rest

### 10.3 Rate Limiting

| Resource | Limit |
|----------|-------|
| AI searches | 50/hour per user |
| Scripture searches | 200/hour per user |
| Exports | 20/hour per user |

---

## 11. Performance Targets

| Metric | Target |
|--------|--------|
| Scripture search response | < 200ms |
| Hymn search response | < 200ms |
| AI theme search | < 5 seconds |
| Page load (initial) | < 2 seconds |
| Export generation | < 10 seconds |

---

## 12. Success Metrics

| Metric | Target |
|--------|--------|
| Time to first sermon | < 10 minutes |
| Average prep time reduction | 50%+ |
| AI suggestion acceptance rate | > 40% |
| Weekly active users (per tenant) | > 60% of pastors |
| Export usage | > 80% of completed sermons |

---

## 13. Implementation Phases

### Phase 1: MVP (4-6 weeks)
- Sermon builder with manual entry
- Scripture search (public domain)
- Hymn search (public domain, basic denomination filter)
- AI theme search
- PDF export

### Phase 2: Enhanced (4 weeks)
- Drag-and-drop reordering
- Additional Bible translations
- Expanded hymn database
- DOCX export
- Sermon templates

### Phase 3: Advanced (4 weeks)
- Service planner
- Sermon series management
- Usage analytics
- Custom hymnal per tenant
- Presentation export

---

## 14. Open Questions for Review

1. **AI Model Choice:** Claude Sonnet is balanced for speed/quality. Should we offer Claude Opus for "deeper" theological suggestions at higher cost?

2. **Offline Support:** Should sermons work offline with sync? Adds complexity but useful for pastors in rural areas.

3. **Collaboration:** Should multiple staff members edit the same sermon? Real-time or async?

4. **Version History:** Should we track sermon revisions? How many versions to keep?

5. **Integrations:** Priority order for external integrations?
   - Planning Center
   - ProPresenter
   - Google Slides
   - Church management systems

6. **Hymn Licensing:** Budget for CCLI/licensed content, or public domain only for MVP?

7. **Mobile App:** Web-only for now, but is native mobile app on the roadmap?

---

## 15. Appendix

### A. Sample AI Response

**Input Theme:** "Finding peace in anxious times"

**AI Response:**
```json
{
  "scriptures": [
    {
      "reference": "Philippians 4:6-7",
      "relevance": "Direct instruction on anxiety and the peace that guards our hearts"
    },
    {
      "reference": "Isaiah 26:3",
      "relevance": "Promise of perfect peace for those who trust in God"
    },
    {
      "reference": "Matthew 6:25-34",
      "relevance": "Jesus' teaching on worry and God's provision"
    },
    {
      "reference": "Psalm 46:10",
      "relevance": "Call to be still and know God's sovereignty"
    }
  ],
  "hymns": [
    {
      "title": "It Is Well With My Soul",
      "reason": "Classic hymn about peace despite circumstances, widely known"
    },
    {
      "title": "Be Still My Soul",
      "reason": "Directly addresses finding calm in God's presence"
    },
    {
      "title": "Great Is Thy Faithfulness",
      "reason": "Reinforces trust in God's unchanging nature"
    }
  ],
  "outlineIdeas": [
    "The reality of anxiety in modern life - acknowledge the struggle",
    "God's invitation: Cast your cares (1 Peter 5:7)",
    "The practice of peace: Prayer, gratitude, and presence",
    "Living in peace: Daily rhythms that anchor us"
  ],
  "illustrations": [
    "Story of Horatio Spafford writing 'It Is Well' after losing his children",
    "Analogy of a ship's anchor holding steady in a storm"
  ]
}
```

### B. Competitive Analysis

| Feature | Sermon Helper | Logos | SermonCentral | Preaching Today |
|---------|--------------|-------|---------------|-----------------|
| AI Theme Search | ✅ | ❌ | ❌ | ❌ |
| Multi-denomination | ✅ | ✅ | ❌ | ❌ |
| Hymn Integration | ✅ | ❌ | ❌ | ❌ |
| Built-in Builder | ✅ | ❌ | ❌ | ❌ |
| Price Point | $$ | $$$$ | $$ | $$ |

---

**End of Design Document**

*Prepared for technical review. Please provide feedback on architecture, feature scope, and implementation approach.*
