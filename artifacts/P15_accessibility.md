# P15: Accessibility & Senior Usability

**Version:** 1.0
**Date:** 2025-11-14
**Target:** WCAG 2.1 Level AA + Elder-First Design

---

## Overview

This church platform prioritizes **elder-first accessibility** because the primary users (church members) include a significant 65+ demographic.

**Goals:**
1. Meet WCAG 2.1 Level AA compliance
2. Optimize for seniors (65+) usability
3. Test with actual senior volunteers
4. Provide automated + manual testing

---

## 1. WCAG 2.1 Level AA Checklist (Tailored)

### 1.1 Perceivable

#### Text Alternatives (1.1)
- [ ] **1.1.1** All images have descriptive alt text
  - **Relevant to:** Bulletin generator images, event photos, branding
  - **Implementation:** Require alt text in upload forms
  - **Test:** Axe DevTools

#### Time-Based Media (1.2)
- [ ] **1.2.1** Audio/video has captions (if used)
  - **Relevant to:** Future sermon recordings, announcements
  - **V1 Scope:** Not applicable (no video in V1)

#### Adaptable (1.3)
- [ ] **1.3.1** Info and relationships
  - **Relevant to:** Forms (labels), tables (headers), lists
  - **Implementation:** Semantic HTML, ARIA labels
  - **Test:** Screen reader (NVDA/JAWS)

- [ ] **1.3.2** Meaningful sequence
  - **Relevant to:** Bulletin reading order, form flow
  - **Implementation:** DOM order matches visual order
  - **Test:** Tab through forms

- [ ] **1.3.3** Sensory characteristics
  - **Relevant to:** Don't rely only on color for errors
  - **Implementation:** Icons + text + color for states
  - **Example:** "Required" not just red asterisk

- [ ] **1.3.4** Orientation
  - **Relevant to:** Mobile app (portrait/landscape)
  - **Implementation:** Support both orientations
  - **Test:** Rotate device

- [ ] **1.3.5** Identify input purpose
  - **Relevant to:** Give form, login form
  - **Implementation:** autocomplete attributes
  - **Example:** `<input autocomplete="email">`

#### Distinguishable (1.4)
- [ ] **1.4.1** Use of color
  - **Relevant to:** Error states, announcement priority
  - **Implementation:** Never use color alone
  - **Example:** Red + icon + "Error:" text

- [ ] **1.4.2** Audio control
  - **Not applicable:** No auto-play audio in V1

- [ ] **1.4.3** Contrast (minimum 4.5:1)
  - **Relevant to:** ALL text
  - **Implementation:**
    - Body text (#1a1a1a on #ffffff = 16.8:1) ✅
    - Button text (#ffffff on #2563eb = 8.6:1) ✅
    - Secondary text (#6b7280 on #ffffff = 4.6:1) ✅
  - **Test:** WebAIM Contrast Checker

- [ ] **1.4.4** Resize text (200%)
  - **Relevant to:** Entire app
  - **Implementation:** Relative units (rem, em)
  - **Test:** Browser zoom to 200%

- [ ] **1.4.5** Images of text
  - **Relevant to:** Avoid text in images (except logos)
  - **Implementation:** Use CSS text, not images
  - **Exception:** Church logo, bulletin header graphics

- [ ] **1.4.10** Reflow (no horizontal scroll at 320px)
  - **Relevant to:** Mobile responsive design
  - **Implementation:** Responsive layouts
  - **Test:** Chrome DevTools mobile view

- [ ] **1.4.11** Non-text contrast (3:1)
  - **Relevant to:** Icons, buttons, form borders
  - **Implementation:** Sufficient contrast for UI elements
  - **Test:** Contrast checker on icons

- [ ] **1.4.12** Text spacing
  - **Relevant to:** User can adjust spacing without breaking layout
  - **Implementation:** Don't use fixed heights
  - **Test:** Apply bookmarklet to increase spacing

- [ ] **1.4.13** Content on hover/focus
  - **Relevant to:** Tooltips, dropdowns
  - **Implementation:** Dismissable, hoverable, persistent
  - **Test:** Hover over tooltips

---

### 1.2 Operable

#### Keyboard Accessible (2.1)
- [ ] **2.1.1** Keyboard access
  - **Relevant to:** All interactive elements
  - **Implementation:** No mouse-only functionality
  - **Test:** Navigate entire app with Tab key

- [ ] **2.1.2** No keyboard trap
  - **Relevant to:** Modals, overlays
  - **Implementation:** Esc to close, Tab cycles through
  - **Test:** Open modal, navigate with Tab

- [ ] **2.1.4** Character key shortcuts
  - **Not applicable:** No single-key shortcuts in V1

#### Enough Time (2.2)
- [ ] **2.2.1** Timing adjustable
  - **Relevant to:** Session timeout
  - **Implementation:** 30-minute warning before logout
  - **Test:** Wait for session timeout

- [ ] **2.2.2** Pause, stop, hide
  - **Not applicable:** No auto-updating content in V1

#### Seizures and Physical Reactions (2.3)
- [ ] **2.3.1** Three flashes or below
  - **Relevant to:** Avoid flashing animations
  - **Implementation:** No flashing content
  - **Test:** Visual review

#### Navigable (2.4)
- [ ] **2.4.1** Bypass blocks
  - **Relevant to:** Skip to content link
  - **Implementation:** "Skip to main content" link
  - **Test:** Tab to first element

- [ ] **2.4.2** Page titled
  - **Relevant to:** All pages have unique `<title>`
  - **Implementation:** Dynamic titles in Next.js
  - **Example:** "Give | First Community Church"

- [ ] **2.4.3** Focus order
  - **Relevant to:** Form fields, navigation
  - **Implementation:** Tab order matches visual order
  - **Test:** Tab through page

- [ ] **2.4.4** Link purpose
  - **Relevant to:** All links descriptive
  - **Bad:** "Click here"
  - **Good:** "Download bulletin PDF"

- [ ] **2.4.5** Multiple ways
  - **Relevant to:** Navigation, search, sitemap
  - **Implementation:** Menu + breadcrumbs
  - **Test:** Find page via multiple paths

- [ ] **2.4.6** Headings and labels
  - **Relevant to:** Form labels, page headings
  - **Implementation:** Clear, descriptive labels
  - **Example:** "Email address" not just "Email"

- [ ] **2.4.7** Focus visible
  - **Relevant to:** Keyboard navigation
  - **Implementation:** Visible focus ring
  - **CSS:** `outline: 2px solid #2563eb`
  - **Test:** Tab through interactive elements

#### Input Modalities (2.5)
- [ ] **2.5.1** Pointer gestures
  - **Relevant to:** Mobile swipe gestures
  - **Implementation:** Provide button alternatives
  - **Example:** Swipe OR button to dismiss

- [ ] **2.5.2** Pointer cancellation
  - **Relevant to:** Buttons activate on mouseup
  - **Implementation:** onClick, not onMouseDown
  - **Test:** Click and hold, move away

- [ ] **2.5.3** Label in name
  - **Relevant to:** Button text matches aria-label
  - **Implementation:** Visible label = accessible name
  - **Test:** Screen reader announces button text

- [ ] **2.5.4** Motion actuation
  - **Not applicable:** No shake/tilt gestures in V1

---

### 1.3 Understandable

#### Readable (3.1)
- [ ] **3.1.1** Language of page
  - **Relevant to:** HTML lang attribute
  - **Implementation:** `<html lang="en">`
  - **Test:** View source

- [ ] **3.1.2** Language of parts
  - **Relevant to:** If using non-English content
  - **Implementation:** `<span lang="es">` for Spanish
  - **V1:** Not applicable (English only)

#### Predictable (3.2)
- [ ] **3.2.1** On focus
  - **Relevant to:** Focus doesn't trigger navigation
  - **Implementation:** No auto-submit on focus
  - **Test:** Tab through form

- [ ] **3.2.2** On input
  - **Relevant to:** Input doesn't trigger navigation
  - **Implementation:** Require button click to submit
  - **Test:** Type in form fields

- [ ] **3.2.3** Consistent navigation
  - **Relevant to:** Nav menu same on all pages
  - **Implementation:** Shared layout component
  - **Test:** Navigate through pages

- [ ] **3.2.4** Consistent identification
  - **Relevant to:** Icons/buttons same throughout
  - **Implementation:** Design system
  - **Example:** "Save" button always same icon

#### Input Assistance (3.3)
- [ ] **3.3.1** Error identification
  - **Relevant to:** Form validation
  - **Implementation:** Clear error messages
  - **Example:** "Email address is required"
  - **Not:** "Invalid input"

- [ ] **3.3.2** Labels or instructions
  - **Relevant to:** All form fields have labels
  - **Implementation:** `<label for="email">`
  - **Test:** Screen reader

- [ ] **3.3.3** Error suggestion
  - **Relevant to:** Help user fix errors
  - **Example:** "Email must include @"
  - **Test:** Submit invalid form

- [ ] **3.3.4** Error prevention (legal/financial)
  - **Relevant to:** Give form (financial transaction)
  - **Implementation:** Confirmation step before payment
  - **Test:** Give flow has review step

---

### 1.4 Robust

#### Compatible (4.1)
- [ ] **4.1.1** Parsing
  - **Relevant to:** Valid HTML
  - **Implementation:** No duplicate IDs, proper nesting
  - **Test:** HTML validator

- [ ] **4.1.2** Name, role, value
  - **Relevant to:** Custom components
  - **Implementation:** ARIA attributes
  - **Example:** Custom dropdown has role="combobox"

- [ ] **4.1.3** Status messages
  - **Relevant to:** Loading states, success messages
  - **Implementation:** `role="status"` or `role="alert"`
  - **Example:** "Contribution saved" with aria-live

---

## 2. Elder-First Usability Checklist

### 2.1 Visual Design

- [ ] **Minimum font size: 18px** (body text)
  - Default: 18px
  - Scales up to 24px at XXL system size
  - No text smaller than 14px (legal/fine print only)

- [ ] **Line height: 1.5** (body), 1.2 (headings)
  - Improves readability for low vision
  - Prevents text cramping

- [ ] **High contrast** (WCAG AAA where possible)
  - Body text: 16.8:1 ratio
  - Avoid light gray text (#ccc on white)
  - Use #6b7280 minimum for secondary text

- [ ] **Large clickable areas** (minimum 48x48px)
  - Buttons: 60px height recommended
  - Icons: 32px minimum
  - Checkbox/radio: 24px
  - Touch targets on mobile: 48x48dp

- [ ] **Spacing between interactive elements** (minimum 8px)
  - Prevents accidental clicks
  - Particularly important on mobile

- [ ] **Avoid pure black text** (#000)
  - Use #1a1a1a instead
  - Reduces eye strain

### 2.2 Language & Content

- [ ] **Plain language** (6th-8th grade reading level)
  - "Messages" not "Communications Dashboard"
  - "Give" not "Charitable Contributions Portal"
  - "Events" not "Calendar of Engagements"

- [ ] **Avoid jargon**
  - Not: "Navigate to your profile settings"
  - Yes: "Click your name → Settings"

- [ ] **Clear instructions**
  - Not: "Proceed"
  - Yes: "Continue to Payment"

- [ ] **Error messages in plain English**
  - Not: "Validation error: email format invalid"
  - Yes: "Please enter your email address with an @ symbol"

### 2.3 Navigation

- [ ] **Breadcrumbs** (show where you are)
  - Home → Events → Sunday Service

- [ ] **Back button** always visible
  - Consistent location (top-left)
  - Large enough to tap easily (44x44pt)

- [ ] **Obvious primary action**
  - One clear CTA per screen
  - Large, high-contrast button

- [ ] **Minimal menu items** (5-7 max)
  - Reduce cognitive load
  - Group related items

### 2.4 Forms

- [ ] **One question per screen** (mobile)
  - Break long forms into steps
  - Show progress indicator

- [ ] **Large input fields**
  - Minimum height: 48px
  - Large text (18px)
  - Sufficient padding

- [ ] **Autocomplete enabled**
  - Reduces typing burden
  - Particularly helpful on mobile

- [ ] **Clear labels above inputs**
  - Not placeholder text
  - Label always visible

- [ ] **Forgiving validation**
  - Accept "(555) 123-4567" and "5551234567"
  - Trim whitespace automatically
  - Show example format

### 2.5 Motion & Animation

- [ ] **Respect `prefers-reduced-motion`**
  - Disable animations if set
  - Use crossfade instead of slide

- [ ] **No auto-play** (videos, carousels)
  - Requires explicit user action
  - Provide play/pause controls

- [ ] **Slow, gentle animations** (300-500ms)
  - Not jarring or fast
  - Ease-in-out timing function

### 2.6 Help & Support

- [ ] **Context-sensitive help** (tooltips)
  - "What's CCLI?" → Tooltip explains

- [ ] **Phone number visible** (for help)
  - On every page footer
  - Large, clickable (call on mobile)

- [ ] **Simple error recovery**
  - "Undo" for destructive actions
  - "Cancel" always available

---

## 3. Automated Testing

See `P15_tests.md` for implementation.

**Tools:**
- **axe DevTools** - Browser extension
- **axe-core + Jest** - Automated tests
- **Pa11y** - CI/CD integration
- **Lighthouse** - Chrome audit

**Coverage:**
- Run on all pages
- Test at multiple zoom levels (100%, 150%, 200%)
- Test with keyboard only
- Test with screen reader (NVDA on Windows, VoiceOver on Mac)

---

## 4. Manual Senior Testing

See `P15_tests.md` for complete script.

**Participants:**
- 2 volunteers, age 65+
- One tech-comfortable, one tech-hesitant
- Compensate with $50 gift card

**Test Duration:** 60 minutes each

**Goals:**
- Identify usability issues
- Validate font sizes, tap targets
- Confirm language is clear
- Observe pain points

---

## 5. Accessibility Statement

**Location:** `/accessibility` page on website

**Content:**
```markdown
# Accessibility Statement

[Church Name] is committed to ensuring our platform is accessible to all members of our community, including those with disabilities.

## Our Commitment

We strive to meet WCAG 2.1 Level AA standards and continuously improve accessibility.

## Features

- Large, readable text (18px minimum)
- High-contrast colors for easy reading
- Keyboard navigation support
- Screen reader compatible
- Simple, plain language
- Mobile-friendly design

## Need Help?

If you encounter any accessibility barriers, please contact us:

- Phone: (555) 123-4567
- Email: accessibility@church.com

We're here to help and will respond within 2 business days.

## Testing

We regularly test our platform with:
- Automated accessibility tools
- Manual keyboard testing
- Screen reader testing (NVDA, JAWS, VoiceOver)
- User testing with seniors (65+)

Last updated: [Date]
```

---

## 6. Common Violations to Avoid

### ❌ Don't Do This

1. **Placeholder-only labels**
   ```html
   <input placeholder="Email" /> <!-- NO! -->
   ```

2. **Color-only error indication**
   ```html
   <input style="border-color: red" /> <!-- NO! -->
   ```

3. **Low contrast text**
   ```css
   color: #999; background: #fff; /* 2.8:1 - FAIL */
   ```

4. **Tiny click targets**
   ```html
   <button style="width: 20px; height: 20px;">X</button> <!-- NO! -->
   ```

5. **Auto-playing carousel**
   ```js
   setInterval(nextSlide, 3000); // NO!
   ```

6. **Jargon and technical language**
   ```
   "Navigate to the administrative control panel" <!-- NO! -->
   ```

### ✅ Do This Instead

1. **Visible labels**
   ```html
   <label for="email">Email address</label>
   <input id="email" type="email" />
   ```

2. **Multi-modal error indication**
   ```html
   <input aria-invalid="true" aria-describedby="email-error" style="border: 2px solid red" />
   <span id="email-error" role="alert">
     <span aria-hidden="true">⚠️</span> Email address is required
   </span>
   ```

3. **High contrast**
   ```css
   color: #1a1a1a; background: #fff; /* 16.8:1 - AAA */
   ```

4. **Large click targets**
   ```html
   <button style="min-width: 48px; min-height: 48px; padding: 12px;">
     <span aria-hidden="true">✕</span>
     <span class="sr-only">Close</span>
   </button>
   ```

5. **User-controlled carousel**
   ```html
   <button onclick="prevSlide()">Previous</button>
   <button onclick="nextSlide()">Next</button>
   <button onclick="pauseCarousel()">Pause</button>
   ```

6. **Plain language**
   ```
   "Click Settings" <!-- YES! -->
   ```

---

## 7. Screen Reader Testing Checklist

Test with **NVDA** (Windows) or **VoiceOver** (Mac)

- [ ] Tab through entire page, all elements announced correctly
- [ ] Form labels read before inputs
- [ ] Error messages announced when present
- [ ] Buttons have descriptive labels
- [ ] Images have meaningful alt text
- [ ] Skip to content link works
- [ ] Modals trap focus correctly
- [ ] Loading states announced
- [ ] Success messages announced

**Common screen reader issues:**
- Icon-only buttons without labels
- Empty links
- Form inputs without labels
- Dynamic content updates not announced

---

## 8. Keyboard Navigation Checklist

Test with **keyboard only** (no mouse)

- [ ] Tab reaches all interactive elements
- [ ] Skip to content link is first tab stop
- [ ] Focus indicator visible on all elements
- [ ] Enter/Space activates buttons
- [ ] Escape closes modals
- [ ] Arrow keys navigate menus/lists (where appropriate)
- [ ] No keyboard traps
- [ ] Tab order matches visual order

**Keyboard shortcuts (optional for V1):**
- `?` - Show keyboard shortcuts
- `/` - Focus search
- `Esc` - Close modal/dropdown

---

## 9. Mobile Accessibility

- [ ] Touch targets: 48x48dp minimum (iOS/Android standard)
- [ ] Pinch-to-zoom enabled (don't disable)
- [ ] Text scales with system font size
- [ ] Both portrait and landscape orientation supported
- [ ] No horizontal scrolling required
- [ ] Large form inputs (easy to tap)
- [ ] Sufficient spacing between tap targets (8px min)

---

## 10. Resources

**Testing Tools:**
- [axe DevTools Chrome Extension](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [NVDA Screen Reader](https://www.nvaccess.org/) (free)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

**Guidelines:**
- [WCAG 2.1 Quick Reference](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM: Accessibility Principles](https://webaim.org/intro/)
- [Inclusive Components](https://inclusive-components.design/)

**Elder-Friendly Design:**
- [Nielsen Norman Group: Seniors](https://www.nngroup.com/articles/usability-for-senior-citizens/)
- [W3C: Older Users](https://www.w3.org/WAI/older-users/)

---

**Artifacts:**
- `P15_accessibility.md` (this file)
- `P15_tests.md` (test implementations)

**Version:** 1.0
**Date:** 2025-11-14
