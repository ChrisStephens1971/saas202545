# P15: Accessibility Testing Implementation

**Version:** 1.1
**Date:** 2025-12-06 (Updated)

---

## 0. Implemented P15/UiMode Tests (Phase 5)

The following tests are **implemented and running** as part of the dual UiMode architecture:

### Run All P15 Accessibility Tests

```bash
# From apps/web directory
npm run test:accessibility

# Or run individual test suites
npm run test:p15
```

### Implemented Test Files

| Test File | Tests | Description |
|-----------|-------|-------------|
| `src/components/ui/__tests__/P15Compliance.test.ts` | 31 | Button/Input CSS utility compliance |
| `src/components/layout/appshell/__tests__/AppShellModes.test.ts` | 50 | Shell mode-dependent rendering |
| `src/__tests__/P15AccessibilityContract.test.ts` | 54 | P15 baseline requirements |
| **Total** | **135** | All passing |

### What These Tests Verify

**1. Button/Input P15 Compliance (`P15Compliance.test.ts`)**
- Both size variants (`sm`, `md`, `lg`) use mode-responsive utilities
- `min-h-touch` used for touch target compliance
- `text-base`, `text-sm` map to CSS variables per mode
- No forbidden tiny classes (12px, 32px heights, etc.)

**2. AppShell Modes (`AppShellModes.test.ts`)**
- Accessible mode: wider sidebar, larger text, high-contrast borders
- Modern mode: compact sidebar, standard density
- Both modes use `min-h-touch` for nav items
- Accessible mode has always-visible nav (tablet horizontal, mobile bottom tab)
- Modern mode has hamburger menu pattern

**3. P15 Contract (`P15AccessibilityContract.test.ts`)**
- Accessible mode: 18px fonts, 48px controls, 2px borders
- Modern mode: 16px fonts, 40px controls, 1px borders
- Regression guards prevent values going below baselines
- CSS variable contract documented

### Coverage by UiMode

| Mode | Font (body) | Font (small) | Control Height | Border |
|------|-------------|--------------|----------------|--------|
| `accessible` | 18px | 16px | 48px | 2px |
| `modern` | 16px | 14px | 40px | 1px |

Both modes pass P15 minimum requirements. Modern mode is denser but still compliant.

---

## 1. Automated Accessibility Tests (Planned)

### 1.1 Setup

```bash
# Install dependencies
npm install --save-dev @axe-core/react jest-axe @testing-library/react @testing-library/jest-dom
```

### 1.2 Jest + axe-core Integration

**File:** `tests/accessibility/axe.test.tsx`

```typescript
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { HomePage } from '@/pages/index';
import { GivePage } from '@/pages/give';
import { EventsPage } from '@/pages/events';
import { MessagesPage } from '@/pages/messages';

expect.extend(toHaveNoViolations);

describe('Accessibility Tests', () => {
  it('Home page should have no accessibility violations', async () => {
    const { container } = render(<HomePage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Give page should have no accessibility violations', async () => {
    const { container } = render(<GivePage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Events page should have no accessibility violations', async () => {
    const { container } = render(<EventsPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('Messages page should have no accessibility violations', async () => {
    const { container } = render(<MessagesPage />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
```

### 1.3 Component-Level Tests

**File:** `tests/components/Button.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { Button } from '@/components/Button';

describe('Button Accessibility', () => {
  it('should have accessible name', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    expect(button).toBeInTheDocument();
  });

  it('should have no axe violations', async () => {
    const { container } = render(<Button>Click me</Button>);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should be keyboard accessible', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button');
    button.focus();
    expect(button).toHaveFocus();
  });

  it('should have visible focus indicator', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button');
    button.focus();

    // Check computed style has outline
    const styles = window.getComputedStyle(button);
    expect(styles.outline).not.toBe('none');
  });
});
```

### 1.4 Form Accessibility Tests

**File:** `tests/forms/GiveForm.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import userEvent from '@testing-library/user-event';
import { GiveForm } from '@/components/GiveForm';

describe('Give Form Accessibility', () => {
  it('should have no axe violations', async () => {
    const { container } = render(<GiveForm />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('all inputs should have labels', () => {
    render(<GiveForm />);

    // Amount input
    const amountLabel = screen.getByLabelText(/amount/i);
    expect(amountLabel).toBeInTheDocument();

    // Fund selection
    const fundLabel = screen.getByLabelText(/fund/i);
    expect(fundLabel).toBeInTheDocument();
  });

  it('error messages should be announced', async () => {
    const user = userEvent.setup();
    render(<GiveForm />);

    const submitButton = screen.getByRole('button', { name: /give now/i });
    await user.click(submitButton);

    // Error should be linked to input via aria-describedby
    const amountInput = screen.getByLabelText(/amount/i);
    const errorId = amountInput.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();

    const errorMessage = document.getElementById(errorId!);
    expect(errorMessage).toHaveTextContent(/required/i);
    expect(errorMessage).toHaveAttribute('role', 'alert');
  });

  it('should be keyboard navigable', async () => {
    render(<GiveForm />);

    // Tab through form
    const amountInput = screen.getByLabelText(/amount/i);
    const fundSelect = screen.getByLabelText(/fund/i);
    const submitButton = screen.getByRole('button', { name: /give now/i });

    amountInput.focus();
    expect(amountInput).toHaveFocus();

    // Tab to next field
    userEvent.tab();
    expect(fundSelect).toHaveFocus();

    // Tab to submit
    userEvent.tab();
    expect(submitButton).toHaveFocus();
  });
});
```

### 1.5 Color Contrast Tests

**File:** `tests/accessibility/contrast.test.ts`

```typescript
import { getContrastRatio } from '@/utils/colorContrast';

describe('Color Contrast', () => {
  it('body text should meet WCAG AAA (7:1)', () => {
    const ratio = getContrastRatio('#1a1a1a', '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(7);
  });

  it('button text should meet WCAG AAA (7:1)', () => {
    const ratio = getContrastRatio('#ffffff', '#2563eb');
    expect(ratio).toBeGreaterThanOrEqual(7);
  });

  it('secondary text should meet WCAG AA (4.5:1)', () => {
    const ratio = getContrastRatio('#6b7280', '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it('links should meet WCAG AA (4.5:1)', () => {
    const ratio = getContrastRatio('#2563eb', '#ffffff');
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});

// Utility function (utils/colorContrast.ts)
export function getContrastRatio(color1: string, color2: string): number {
  const getLuminance = (hex: string): number => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = ((rgb >> 16) & 0xff) / 255;
    const g = ((rgb >> 8) & 0xff) / 255;
    const b = (rgb & 0xff) / 255;

    const [rs, gs, bs] = [r, g, b].map(c =>
      c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    );

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}
```

---

## 2. Playwright E2E Accessibility Tests

**File:** `tests/e2e/accessibility.spec.ts`

```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility E2E Tests', () => {
  test('Home page should be accessible', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Give page should be accessible', async ({ page }) => {
    await page.goto('/give');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('Keyboard navigation should work', async ({ page }) => {
    await page.goto('/');

    // Tab to skip link
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a:has-text("Skip to content")');
    await expect(skipLink).toBeFocused();

    // Activate skip link
    await page.keyboard.press('Enter');

    // Should jump to main content
    const mainContent = page.locator('main');
    await expect(mainContent).toBeInViewport();
  });

  test('Screen reader landmarks should exist', async ({ page }) => {
    await page.goto('/');

    // Check for ARIA landmarks
    await expect(page.locator('header[role="banner"]')).toBeVisible();
    await expect(page.locator('nav[role="navigation"]')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('footer[role="contentinfo"]')).toBeVisible();
  });

  test('Focus should be visible', async ({ page }) => {
    await page.goto('/');

    // Tab to first interactive element
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Get focused element
    const focusedElement = await page.evaluateHandle(() => document.activeElement);

    // Check outline is visible
    const outlineStyle = await page.evaluate(
      el => window.getComputedStyle(el as Element).outline,
      focusedElement
    );

    expect(outlineStyle).not.toBe('none');
  });
});
```

---

## 3. CI/CD Integration

**File:** `.github/workflows/accessibility.yml`

```yaml
name: Accessibility Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  accessibility:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run accessibility tests
        run: npm run test:accessibility

      - name: Run Pa11y
        run: |
          npm run build
          npm run start &
          npx wait-on http://localhost:3000
          npx pa11y-ci --sitemap http://localhost:3000/sitemap.xml

      - name: Upload results
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: accessibility-results
          path: pa11y-results/
```

**File:** `.pa11yci.json`

```json
{
  "defaults": {
    "standard": "WCAG2AA",
    "runners": ["axe", "htmlcs"],
    "timeout": 10000,
    "wait": 500
  },
  "urls": [
    "http://localhost:3000/",
    "http://localhost:3000/give",
    "http://localhost:3000/events",
    "http://localhost:3000/messages",
    "http://localhost:3000/people"
  ]
}
```

---

## 4. Manual Senior Usability Testing Script

### 4.1 Participant Requirements

**Recruit 2 participants:**
- **Participant A:** Age 65+, comfortable with technology (uses smartphone daily)
- **Participant B:** Age 65+, less comfortable with technology (rarely uses apps)

**Compensation:** $50 gift card each

**Duration:** 60 minutes each

**Location:** In-person preferred (observe physical interactions)

### 4.2 Testing Environment

**Equipment:**
- iPad or Android tablet (10" minimum)
- Computer with large monitor (24"+)
- High-speed internet
- Screen recording software (with permission)
- Note-taking device

**Setup:**
- Brightness: 75%
- Font size: Default (will test with increased size)
- Volume: Medium (for screen reader testing)

### 4.3 Introduction Script

> "Thank you for helping us test our church platform! This is not a test of you—it's a test of our design. There are no wrong answers. We want to see what works well and what's confusing.
>
> Please think out loud as you work. Tell me what you're thinking, what you're trying to do, and if anything is unclear.
>
> I'll give you some tasks to complete. Take your time, and let me know if you get stuck or frustrated.
>
> Do you have any questions before we start?"

### 4.4 Task List

#### **Task 1: View Upcoming Events (Easy)**

**Instructions:**
> "You heard there's a potluck next week. Can you find information about upcoming events?"

**Success Criteria:**
- [ ] Finds Events page within 30 seconds
- [ ] Can read event details clearly
- [ ] Understands how to RSVP

**Observations:**
- Did they find the nav menu easily?
- Could they read the text without zooming?
- Did they understand the icons?

---

#### **Task 2: RSVP to an Event (Medium)**

**Instructions:**
> "You'd like to attend the Wednesday Prayer Meeting. Can you let the church know you're coming?"

**Success Criteria:**
- [ ] Finds event in list
- [ ] Clicks RSVP button
- [ ] Successfully RSVPs

**Observations:**
- Could they tap the RSVP button easily?
- Was the confirmation clear?
- Did they understand the next steps?

---

#### **Task 3: Read Messages (Easy)**

**Instructions:**
> "Check if there are any new messages from the pastor."

**Success Criteria:**
- [ ] Finds Messages page
- [ ] Can see unread count
- [ ] Opens and reads a message

**Observations:**
- Was the Messages icon clear?
- Could they distinguish read from unread?
- Was the text readable?

---

#### **Task 4: Make a One-Time Gift (Complex)**

**Instructions:**
> "You'd like to give $50 to the Building Fund. Can you do that?"

**Success Criteria:**
- [ ] Finds Give page
- [ ] Enters amount ($50)
- [ ] Selects Building Fund
- [ ] Gets to payment step (don't complete)

**Observations:**
- Was the Give button obvious?
- Could they enter the amount easily?
- Did they understand fund options?
- Was the form layout clear?
- Any confusion about payment methods?

---

#### **Task 5: Increase Text Size (Accessibility)**

**Instructions:**
> "The text feels a bit small. Can you make it larger?"

**Success Criteria:**
- [ ] Knows to use browser/system settings (or we guide them)
- [ ] Text increases without breaking layout
- [ ] Can still complete tasks with larger text

**Observations:**
- Did they know how to zoom?
- Did layout remain usable at 150%? 200%?
- Any text truncation or overlapping?

---

#### **Task 6: Find Help (Recovery)**

**Instructions:**
> "You're stuck and need to call the church office. Can you find the phone number?"

**Success Criteria:**
- [ ] Finds phone number within 30 seconds
- [ ] Number is tap-to-call on mobile

**Observations:**
- Was the help info easy to find?
- Was the number large enough to read?
- Did tap-to-call work?

---

### 4.5 Post-Task Questions

**After completing tasks, ask:**

1. **Overall Impression**
   - "On a scale of 1-10, how easy was it to use this app?"
   - "What did you like most?"
   - "What was most frustrating?"

2. **Visual Design**
   - "Was the text large enough to read comfortably?"
   - "Were the colors easy on your eyes?"
   - "Did any buttons or links look too small?"

3. **Language & Clarity**
   - "Was the language clear and easy to understand?"
   - "Were there any words or phrases that confused you?"
   - "Did you know what would happen when you clicked buttons?"

4. **Confidence**
   - "Did you feel confident using the app?"
   - "Were you ever worried you might do something wrong?"
   - "Would you use this app regularly?"

5. **Comparison**
   - "How does this compare to other apps you use?"
   - "Is there anything you wish it did differently?"

---

### 4.6 Observation Checklist

**During testing, observe and note:**

#### Visual
- [ ] Do they zoom or lean in to read?
- [ ] Do they squint or strain?
- [ ] Do they comment on colors or contrast?

#### Motor/Dexterity
- [ ] Do they have trouble clicking small targets?
- [ ] Do they mis-click adjacent buttons?
- [ ] Do they prefer mouse or touchscreen?

#### Cognitive
- [ ] Do they get lost in navigation?
- [ ] Do they re-read instructions multiple times?
- [ ] Do they seem overwhelmed by options?

#### Emotional
- [ ] Do they express frustration?
- [ ] Do they seem confused?
- [ ] Do they smile or show satisfaction?

---

### 4.7 Severity Rating

**Rate each issue found:**

| Severity | Description | Action |
|----------|-------------|--------|
| **Critical** | Prevents task completion | Fix before launch |
| **High** | Causes significant frustration | Fix before launch |
| **Medium** | Noticeable but workaround exists | Fix post-launch |
| **Low** | Minor annoyance | Backlog |

---

### 4.8 Report Template

```markdown
# Senior Usability Test Results

**Date:** [Date]
**Tester:** [Your Name]

## Participant A

**Demographics:**
- Age: [Age]
- Tech Comfort: High
- Vision: [Glasses? Contacts?]
- Devices Used: [Smartphone, tablet, computer]

**Task Success Rates:**
1. View Events: ✅ Success (15 seconds)
2. RSVP: ✅ Success (30 seconds)
3. Read Messages: ✅ Success (10 seconds)
4. Make Gift: ⚠️ Partial (confused by fund selection)
5. Increase Text: ✅ Success (with guidance)
6. Find Help: ✅ Success (5 seconds)

**Issues Found:**
1. [Critical] Give button on homepage too small (32px)
2. [High] Fund selection dropdown unclear
3. [Medium] Back button not obvious on Events page

**Quotes:**
> "I like how big the text is. Easy to read."
> "Not sure what 'Building Fund' means. Is that for repairs?"

**Overall Rating:** 8/10

---

## Participant B

**Demographics:**
- Age: [Age]
- Tech Comfort: Low
- Vision: [Bifocals? Magnification?]
- Devices Used: [Mainly phone, rarely computer]

**Task Success Rates:**
1. View Events: ✅ Success (45 seconds)
2. RSVP: ❌ Failed (couldn't find button)
3. Read Messages: ⚠️ Partial (found page, couldn't open message)
4. Make Gift: ❌ Failed (abandoned at form)
5. Increase Text: ❌ Failed (needed full guidance)
6. Find Help: ✅ Success (20 seconds)

**Issues Found:**
1. [Critical] RSVP button not recognizable as button
2. [Critical] Message list items not obviously tappable
3. [High] Give form too complex (too many fields visible)
4. [High] No clear "Cancel" or "Back" on Give form

**Quotes:**
> "I'm not sure if I should click here or here."
> "This is a lot to read. Can I see just one thing at a time?"

**Overall Rating:** 4/10

---

## Recommendations

1. **Increase button size** (48px minimum → 60px recommended)
2. **Simplify Give form** (one field per screen on mobile)
3. **Make tap targets more obvious** (add visible borders/shadows)
4. **Add "Back" button** to all sub-pages
5. **Provide tooltips** for unfamiliar terms ("What's a fund?")

## Action Items

- [ ] Redesign RSVP button (make it more button-like)
- [ ] Break Give form into steps
- [ ] Add help text for fund selection
- [ ] Test with 3 more participants age 70+
```

---

## 5. Lighthouse CI Integration

**File:** `lighthouserc.js`

```javascript
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/give',
        'http://localhost:3000/events',
      ],
      numberOfRuns: 3,
    },
    assert: {
      preset: 'lighthouse:recommended',
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:performance': ['warn', { minScore: 0.8 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
```

---

## 6. Screen Reader Testing Checklist

**Test with NVDA (Windows) or VoiceOver (Mac)**

### Home Page
- [ ] Page title is announced
- [ ] Skip to content link works
- [ ] Navigation menu items are announced
- [ ] Main content is in logical order
- [ ] All images have alt text

### Give Form
- [ ] Form fields have labels
- [ ] Required fields are announced
- [ ] Error messages are read aloud
- [ ] Success message is announced
- [ ] Submit button has clear label

### Events List
- [ ] Each event is announced correctly
- [ ] RSVP button is labeled
- [ ] Event details are in reading order
- [ ] Date/time is properly formatted

### Messages
- [ ] Unread count is announced
- [ ] Channel names are clear
- [ ] Message sender and content are read
- [ ] Reply button is labeled

---

**Artifacts:**
- `P15_accessibility.md` (accessibility guidelines)
- `P15_tests.md` (this file - test implementations)

**Version:** 1.0
**Date:** 2025-11-14
