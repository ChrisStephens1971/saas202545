# P7: Simple Mode Mobile UI

**Task:** Define the Simple Mode mobile interface for church members
**Audience:** Sub-200 church members, elder-first UX
**Platform:** React Native (future), responsive web (V1)

---

## Design Principles

1. **Elder-First**: Large text, high contrast, minimal cognitive load
2. **4-Button Home**: Messages, Events, People, Give - that's it
3. **No Jargon**: Plain language, icon + label always
4. **Big Tap Targets**: Minimum 48px (iOS/Android standard)
5. **High Contrast**: WCAG AA minimum (4.5:1 for text)

---

## Component List

### Core Components

#### `<SimpleHome>`
**Purpose:** Main landing screen with 4 primary actions
**Props:**
- `userName: string` - Personalized greeting
- `unreadCount?: number` - Badge for Messages
- `upcomingEventCount?: number` - Badge for Events
- `onNavigate: (screen: 'messages' | 'events' | 'people' | 'give') => void`

**Layout:**
```
+----------------------------------+
|  Good morning, John!             |
|                                  |
|  [icon] Messages        (2)      |
|  --------------------------------|
|  [icon] Events          (1)      |
|  --------------------------------|
|  [icon] People                   |
|  --------------------------------|
|  [icon] Give                     |
+----------------------------------+
```

#### `<BigButton>`
**Purpose:** Reusable large tap target with icon + label
**Props:**
- `icon: IconName` - From icon library
- `label: string` - Primary text
- `badge?: number` - Optional count badge
- `onPress: () => void`
- `testID?: string` - For E2E testing

**Styling:**
- Min height: 80px
- Min tap area: 48x48dp (Android) / 44x44pt (iOS)
- Icon: 32px
- Label: 20px (scales with system font size)
- Padding: 20px vertical, 24px horizontal

#### `<SimpleHeader>`
**Purpose:** Consistent header with back button and title
**Props:**
- `title: string`
- `onBack?: () => void` - If present, shows back arrow
- `showProfile?: boolean` - Shows avatar/initials in top-right

#### `<EmptyState>`
**Purpose:** Friendly empty states with clear action
**Props:**
- `icon: IconName`
- `message: string`
- `actionLabel?: string`
- `onAction?: () => void`

**Example:**
```
Nothing here yet.
Check back soon!

[actionLabel button if provided]
```

---

## Screen Definitions

### 1. Home Screen (`SimpleHome`)

**Path:** `/simple` or `/`
**Access:** All authenticated users

**Elements:**
- Personalized greeting with time-aware prefix (Good morning/afternoon/evening)
- 4 navigation buttons in vertical stack
- Unread badges on Messages and Events
- Bottom tab bar (optional, can be hamburger menu)

**Gestures:**
- Tap button → Navigate to screen
- Pull-to-refresh → Sync data

---

### 2. Messages Screen

**Path:** `/simple/messages`

**Layout:**
```
[Header: Messages]

Announcements
  • Sunday service time change
  • Potluck next week

Direct Messages
  • Pastor John: "Thanks for..."
  • Prayer Team: "Praying for..."
```

**Elements:**
- Section headers: Announcements, Direct Messages
- List items: 60px height, icon + text + timestamp
- Tap item → Full message view

---

### 3. Events Screen

**Path:** `/simple/events`

**Layout:**
```
[Header: Events]

This Week
  Sunday Service
  Oct 15, 10:00 AM  [RSVP]

  Wednesday Prayer
  Oct 18, 7:00 PM   [RSVP]

Next Month
  Church Potluck
  Nov 5, 6:00 PM    [RSVP]
```

**Elements:**
- Grouped by time period: This Week, Next Month
- Each event: Title, Date/Time, RSVP button
- RSVP states: [Going], [Not Going], [Maybe]

---

### 4. People Screen

**Path:** `/simple/people`

**Layout:**
```
[Header: People]

[Search: "Find someone..."]

A
  • Alice Johnson
  • Andrew Smith

B
  • Bob Williams
```

**Elements:**
- Search bar at top (optional for V1)
- Alphabetical sections
- Avatar + Name (phone if available)
- Tap person → Contact card with call/text/email

---

### 5. Give Screen

**Path:** `/simple/give`

**Layout:**
```
[Header: Give]

Quick Give
  $25   $50   $100   Other

[Amount input]

Give To
  ⦿ General Fund
  ○ Missions
  ○ Building Fund

[Give Now button]

Payment: Visa ****1234  [Change]
```

**Elements:**
- Quick amount buttons
- Custom amount input with large numpad
- Radio buttons for fund selection
- Saved payment method
- Large "Give Now" CTA

---

## Navigation Structure

```
SimpleHome (/)
├── Messages (/simple/messages)
│   └── MessageDetail (/simple/messages/:id)
├── Events (/simple/events)
│   └── EventDetail (/simple/events/:id)
│       └── RSVP confirmation
├── People (/simple/people)
│   └── PersonDetail (/simple/people/:id)
│       └── Contact actions (call/text/email)
└── Give (/simple/give)
    └── Confirmation (/simple/give/confirm)
        └── Receipt (/simple/give/receipt)
```

**Navigation Pattern:**
- Stack-based (iOS/Android standard)
- Back button always visible (except on Home)
- No deep nesting (max 3 levels)

---

## Accessibility Requirements

### Font Scaling

Support iOS/Android system font sizes:

| System Setting | Base Font | Button Text | Headings |
|----------------|-----------|-------------|----------|
| Small          | 16px      | 18px        | 24px     |
| **Default**    | **18px**  | **20px**    | **28px** |
| Large          | 20px      | 22px        | 32px     |
| XL             | 22px      | 24px        | 36px     |
| XXL            | 24px      | 26px        | 40px     |

**Implementation:**
- Use relative units (`sp` on Android, Dynamic Type on iOS)
- Test at XXL to ensure no text truncation
- Allow horizontal scrolling on tables if needed at XXL

### Color Contrast

| Element           | Foreground | Background | Ratio  | WCAG  |
|-------------------|------------|------------|--------|-------|
| Body text         | #1a1a1a    | #ffffff    | 16.8:1 | AAA   |
| Button text       | #ffffff    | #2563eb    | 8.6:1  | AAA   |
| Secondary text    | #6b7280    | #ffffff    | 4.6:1  | AA    |
| Disabled text     | #9ca3af    | #ffffff    | 3.1:1  | Fail* |

*Disabled state doesn't require AA, but we use icons + text to indicate state

### Touch Targets

- **Minimum:** 48x48dp/pt (WCAG 2.1 Level AAA)
- **Recommended:** 60x60dp/pt for primary actions
- **Spacing:** 8px minimum between adjacent tap targets

### Screen Reader Support

- All buttons have `accessibilityLabel`
- Form inputs have `accessibilityHint`
- Badges announce count: "Messages, 2 unread"
- Loading states: "Loading events..."
- Error states: "Failed to load. Tap to retry."

**VoiceOver/TalkBack Order:**
1. Header/Title
2. Navigation buttons (top to bottom)
3. Action buttons
4. Secondary content

### Reduce Motion

Respect `prefers-reduced-motion`:
- Disable carousel auto-advance
- Crossfade instead of slide animations
- No parallax scrolling

---

## Theming & Brand

### Color Tokens

```css
/* Primary Actions */
--color-primary: #2563eb;        /* Blue for CTAs */
--color-primary-dark: #1e40af;   /* Active state */

/* Semantic */
--color-success: #059669;        /* Going to event */
--color-warning: #d97706;        /* Maybe attending */
--color-error: #dc2626;          /* Not going */

/* Neutrals */
--color-text: #1a1a1a;
--color-text-secondary: #6b7280;
--color-border: #e5e7eb;
--color-background: #ffffff;
--color-surface: #f9fafb;
```

### Typography

**Font Family:** System default (San Francisco on iOS, Roboto on Android)

**Weights:**
- Regular (400): Body text
- Medium (500): Button labels
- Semibold (600): Headings
- Bold (700): Emphasis only

**Line Heights:**
- Body: 1.5 (27px at default size)
- Headings: 1.2
- Buttons: 1.0 (tight)

---

## Offline Behavior

### Cached Content (V1)
- Last 50 messages
- Events for next 30 days
- Full people directory

### Offline Actions
- Queue giving transactions (sync when online)
- Show cached content with banner: "Last updated 2 hours ago"
- Disable RSVP changes (require online)

### Sync Strategy
- On app open
- Pull-to-refresh
- Background sync every 15 minutes (if app open)

---

## Icons

Use **Heroicons** or **React Native Vector Icons** (Ionicons set)

| Action   | Icon Name          | Fallback Text |
|----------|--------------------|---------------|
| Messages | `ChatBubbleLeft`   | Messages      |
| Events   | `CalendarDays`     | Events        |
| People   | `UserGroup`        | People        |
| Give     | `Heart`            | Give          |
| Back     | `ChevronLeft`      | Back          |
| Profile  | `User`             | Profile       |
| Search   | `MagnifyingGlass`  | Search        |
| Add      | `Plus`             | Add           |
| Close    | `XMark`            | Close         |

**Icon Sizing:**
- Navigation: 32px
- Buttons: 24px
- Inline: 20px

---

## Edge Cases

### No Content States

**Messages:** "No messages yet. Check back soon!"
**Events:** "No upcoming events. Check the bulletin for updates."
**People:** "Directory loading..." (should always have data)
**Give:** Always available (can give anytime)

### Long Names/Text

- Event titles: Truncate at 40 chars with ellipsis
- Person names: Allow 2 lines (wrap), then ellipsis
- Messages preview: 1 line, ellipsis

### Badge Overflow

- Show exact count up to 99
- Show "99+" for counts over 99
- Color: Red dot for unread, no number

---

## Testing Checklist

### Functional
- [ ] All 4 buttons navigate correctly
- [ ] Badges update in real-time
- [ ] Back button returns to previous screen
- [ ] Search filters people list
- [ ] RSVP changes are persisted
- [ ] Give transaction completes

### Accessibility
- [ ] VoiceOver announces all elements correctly
- [ ] Font scales to XXL without breaking layout
- [ ] Contrast meets WCAG AA
- [ ] Touch targets are 48px minimum
- [ ] Reduce motion disables animations

### Performance
- [ ] Home screen loads < 1 second
- [ ] Scrolling is smooth (60fps)
- [ ] Images load progressively
- [ ] Offline mode works without errors

---

## Future Enhancements (Not V1)

- Kiosk mode (single button: "Check In")
- Widget for iOS/Android home screen (next event)
- Push notifications for new messages
- Apple Watch complication (next event countdown)
- Voice commands: "Show me upcoming events"

---

**Artifact:** `P7_mobile.md`
**Version:** 1.0
**Date:** 2025-11-14
