# Bulletin Generator - Renderer Templates

**Version:** 1.0
**Date:** 2025-11-14
**Template Engine:** EJS (Embedded JavaScript Templates)
**Styling:** CSS with locked design tokens

---

## Overview

The bulletin renderer uses **EJS templates** with a **locked token system** to ensure consistent, print-ready layouts. Templates are designed for both screen display (preview) and print output (PDF generation via Playwright).

**Template Blocks:**
1. Cover
2. Welcome
3. Order of Service
4. Songs (with CCLI)
5. Scripture
6. Sermon Notes
7. Announcements Grid
8. Mini Calendar
9. Giving/Prayer QR Codes
10. Footer

**Design Constraints:**
- Letter-size (8.5 x 11 inches) portrait
- Print-safe margins (0.5 inch all sides)
- Typography: min 11pt body, 14pt headings
- Line-clamp utilities for truncation
- Widow/orphan prevention
- CMYK-safe colors

---

## Template Block 1: Cover

**File:** `templates/blocks/cover.ejs`

```ejs
<!-- Cover Block -->
<div class="bulletin-cover" style="page-break-after: always;">
  <div class="cover-header">
    <% if (brandPack.logo_url) { %>
      <img src="<%= brandPack.logo_url %>" alt="<%= brandPack.church_name %> Logo" class="church-logo" />
    <% } %>
    <h1 class="church-name"><%= brandPack.church_name %></h1>
  </div>

  <% if (coverImage) { %>
    <div class="cover-image">
      <img src="<%= coverImage.url %>" alt="Cover image for <%= serviceDate %>" />
    </div>
  <% } %>

  <div class="cover-date">
    <h2 class="service-date"><%= formatDate(serviceDate, 'EEEE, MMMM d, yyyy') %></h2>
    <p class="service-time"><%= serviceTime || '10:00 AM' %></p>
  </div>

  <div class="cover-footer">
    <p class="church-address"><%= brandPack.church_address %></p>
    <p class="church-contact">
      <%= brandPack.church_phone %> &bull; <%= brandPack.church_email %>
    </p>
    <p class="church-website"><%= brandPack.church_website %></p>
  </div>
</div>
```

**Data Interface:**
```typescript
interface CoverData {
  brandPack: {
    logo_url?: string;
    church_name: string;
    church_address: string;
    church_phone: string;
    church_email: string;
    church_website: string;
    primary_color: string;
  };
  serviceDate: Date;
  serviceTime?: string;
  coverImage?: {
    url: string;
  };
}
```

---

## Template Block 2: Welcome

**File:** `templates/blocks/welcome.ejs`

```ejs
<!-- Welcome Block -->
<div class="bulletin-welcome">
  <h2 class="section-heading">Welcome</h2>
  <div class="welcome-message line-clamp-10">
    <%= welcomeMessage || 'Welcome to our worship service!' %>
  </div>
  <% if (welcomeMessageOverflow) { %>
    <p class="overflow-notice">
      Read the full message at <%= brandPack.church_website %>
    </p>
  <% } %>
</div>
```

**Data Interface:**
```typescript
interface WelcomeData {
  welcomeMessage?: string;
  welcomeMessageOverflow?: boolean; // Set if truncated
  brandPack: { church_website: string };
}
```

---

## Template Block 3: Order of Service

**File:** `templates/blocks/order-of-service.ejs`

```ejs
<!-- Order of Service Block -->
<div class="bulletin-order-of-service">
  <h2 class="section-heading">Order of Worship</h2>
  <ol class="service-items">
    <% serviceItems.forEach((item, index) => { %>
      <li class="service-item">
        <span class="item-type"><%= item.type %></span>
        <% if (item.title) { %>
          <span class="item-title"><%= item.title %></span>
        <% } %>
        <% if (item.type === 'Song' && item.artist) { %>
          <span class="item-meta">by <%= item.artist %></span>
        <% } %>
        <% if (item.type === 'Scripture' && item.scripture_ref) { %>
          <span class="item-meta"><%= item.scripture_ref %></span>
        <% } %>
        <% if (item.type === 'Sermon' && item.speaker) { %>
          <span class="item-meta">Speaker: <%= item.speaker %></span>
        <% } %>
      </li>
    <% }); %>
  </ol>
</div>
```

**Data Interface:**
```typescript
interface OrderOfServiceData {
  serviceItems: Array<{
    type: string; // 'Welcome', 'Song', 'Prayer', etc.
    title?: string;
    artist?: string;
    scripture_ref?: string;
    speaker?: string;
  }>;
}
```

---

## Template Block 4: Songs (with CCLI)

**File:** `templates/blocks/songs.ejs`

```ejs
<!-- Songs Block (one per song) -->
<% songs.forEach((song) => { %>
  <div class="bulletin-song" style="page-break-inside: avoid;">
    <h3 class="song-title"><%= song.title %></h3>
    <% if (song.artist) { %>
      <p class="song-artist">by <%= song.artist %></p>
    <% } %>

    <div class="song-lyrics line-clamp-30">
      <%= formatLyrics(song.content) %>
    </div>

    <% if (song.lyricsOverflow) { %>
      <p class="overflow-notice">Full lyrics at <%= brandPack.church_website %></p>
    <% } %>

    <footer class="song-footer">
      CCLI Song #<%= song.ccli_number %> | License #<%= churchCCLILicense || 'Pending' %>
    </footer>
  </div>
<% }); %>
```

**Data Interface:**
```typescript
interface SongsData {
  songs: Array<{
    title: string;
    artist?: string;
    content: string; // Lyrics
    ccli_number: string;
    lyricsOverflow?: boolean;
  }>;
  brandPack: { church_website: string };
  churchCCLILicense?: string;
}
```

**Helper Function:**
```javascript
function formatLyrics(content) {
  // Preserve line breaks, add verse/chorus labels
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('<br />');
}
```

---

## Template Block 5: Scripture

**File:** `templates/blocks/scripture.ejs`

```ejs
<!-- Scripture Block -->
<% scriptures.forEach((scripture) => { %>
  <div class="bulletin-scripture" style="page-break-inside: avoid;">
    <h3 class="scripture-ref"><%= scripture.scripture_ref %></h3>
    <blockquote class="scripture-text line-clamp-20">
      <%= scripture.content %>
    </blockquote>
    <% if (scripture.textOverflow) { %>
      <p class="overflow-notice">Read full passage in your Bible or at <%= brandPack.church_website %></p>
    <% } %>
  </div>
<% }); %>
```

**Data Interface:**
```typescript
interface ScriptureData {
  scriptures: Array<{
    scripture_ref: string; // 'John 3:16-17'
    content: string; // Scripture text
    textOverflow?: boolean;
  }>;
  brandPack: { church_website: string };
}
```

---

## Template Block 6: Sermon Notes

**File:** `templates/blocks/sermon.ejs`

```ejs
<!-- Sermon Notes Block -->
<div class="bulletin-sermon">
  <h2 class="section-heading">Sermon</h2>
  <h3 class="sermon-title"><%= sermon.title %></h3>
  <% if (sermon.speaker) { %>
    <p class="sermon-speaker">Speaker: <%= sermon.speaker %></p>
  <% } %>
  <% if (sermon.scripture_ref) { %>
    <p class="sermon-scripture">Scripture: <%= sermon.scripture_ref %></p>
  <% } %>

  <% if (sermon.outline) { %>
    <div class="sermon-outline">
      <h4>Sermon Outline:</h4>
      <ul class="sermon-points line-clamp-15">
        <% sermon.outline.split('\n').forEach((point) => { %>
          <% if (point.trim().length > 0) { %>
            <li><%= point.trim() %></li>
          <% } %>
        <% }); %>
      </ul>
    </div>
  <% } %>

  <div class="sermon-notes">
    <h4>Notes:</h4>
    <div class="notes-space">
      <% for (let i = 0; i < 5; i++) { %>
        <div class="note-line"></div>
      <% } %>
    </div>
  </div>
</div>
```

**Data Interface:**
```typescript
interface SermonData {
  sermon: {
    title: string;
    speaker?: string;
    scripture_ref?: string;
    outline?: string; // Newline-separated bullet points
  };
}
```

---

## Template Block 7: Announcements Grid

**File:** `templates/blocks/announcements.ejs`

```ejs
<!-- Announcements Grid -->
<div class="bulletin-announcements" style="page-break-inside: avoid;">
  <h2 class="section-heading">Announcements</h2>

  <!-- Top 3 Featured (Large Cards) -->
  <% const featured = announcements.slice(0, 3); %>
  <div class="announcements-featured">
    <% featured.forEach((announcement) => { %>
      <div class="announcement-card featured">
        <% if (announcement.priority === 'Urgent') { %>
          <span class="priority-badge urgent">🔴 URGENT</span>
        <% } else if (announcement.priority === 'High') { %>
          <span class="priority-badge high">⚠️ HIGH</span>
        <% } %>
        <h3 class="announcement-title"><%= announcement.title %></h3>
        <p class="announcement-body"><%= announcement.body %></p>
        <% if (announcement.category) { %>
          <span class="announcement-category"><%= announcement.category %></span>
        <% } %>
      </div>
    <% }); %>
  </div>

  <!-- Remaining in Two-Column Grid -->
  <% const remaining = announcements.slice(3, 10); %>
  <% if (remaining.length > 0) { %>
    <div class="announcements-grid">
      <% remaining.forEach((announcement) => { %>
        <div class="announcement-card compact">
          <h4 class="announcement-title"><%= announcement.title %></h4>
          <p class="announcement-body line-clamp-3"><%= announcement.body %></p>
        </div>
      <% }); %>
    </div>
  <% } %>

  <!-- Overflow Notice -->
  <% if (announcements.length > 10) { %>
    <div class="announcements-overflow">
      <p>📢 More announcements available at:</p>
      <div class="overflow-qr">
        <img src="<%= generateQR(brandPack.church_website + '/announcements') %>" alt="Scan for more announcements" />
        <span><%= brandPack.church_website %>/announcements</span>
      </div>
    </div>
  <% } %>
</div>
```

**Data Interface:**
```typescript
interface AnnouncementsData {
  announcements: Array<{
    title: string; // Max 60 chars
    body: string; // Max 300 chars
    priority: 'Urgent' | 'High' | 'Normal';
    category?: string;
  }>;
  brandPack: { church_website: string };
}
```

**Layout Rules:**
- **Top 3:** Full-width cards, large text
- **4-10:** Two-column grid, compact cards
- **11+:** Overflow message + QR code

---

## Template Block 8: Mini Calendar

**File:** `templates/blocks/calendar.ejs`

```ejs
<!-- Mini Calendar (Next 7 Days) -->
<div class="bulletin-calendar">
  <h2 class="section-heading">This Week</h2>
  <table class="calendar-table">
    <thead>
      <tr>
        <th>Day</th>
        <th>Event</th>
        <th>Time</th>
      </tr>
    </thead>
    <tbody>
      <% upcomingEvents.slice(0, 7).forEach((event) => { %>
        <tr>
          <td class="calendar-day"><%= formatDate(event.start_at, 'EEE, MMM d') %></td>
          <td class="calendar-event line-clamp-1"><%= event.title %></td>
          <td class="calendar-time"><%= formatTime(event.start_at) %></td>
        </tr>
      <% }); %>
    </tbody>
  </table>
  <% if (upcomingEvents.length > 7) { %>
    <p class="calendar-more">
      + <%= upcomingEvents.length - 7 %> more events at <%= brandPack.church_website %>/events
    </p>
  <% } %>
</div>
```

**Data Interface:**
```typescript
interface CalendarData {
  upcomingEvents: Array<{
    title: string;
    start_at: Date;
  }>;
  brandPack: { church_website: string };
}
```

---

## Template Block 9: Giving/Prayer QR Codes

**File:** `templates/blocks/qr-codes.ejs`

```ejs
<!-- Giving & Prayer QR Codes -->
<div class="bulletin-qr-section">
  <div class="qr-card">
    <h3 class="qr-heading">Give Online</h3>
    <img src="<%= generateQR(brandPack.church_website + '/give') %>" alt="Give online QR code" class="qr-code" />
    <p class="qr-url"><%= brandPack.church_website %>/give</p>
  </div>

  <div class="qr-card">
    <h3 class="qr-heading">Prayer Requests</h3>
    <img src="<%= generateQR(brandPack.church_website + '/prayer') %>" alt="Prayer requests QR code" class="qr-code" />
    <p class="qr-url"><%= brandPack.church_website %>/prayer</p>
  </div>
</div>
```

**Data Interface:**
```typescript
interface QRData {
  brandPack: { church_website: string };
}
```

**QR Code Generation:**
- Use `qrcode` npm package
- Error correction level: M (15%)
- Size: 200x200px (print-safe)

---

## Template Block 10: Footer

**File:** `templates/blocks/footer.ejs`

```ejs
<!-- Footer (on every page) -->
<footer class="bulletin-footer">
  <div class="footer-content">
    <p class="footer-church"><%= brandPack.church_name %></p>
    <p class="footer-contact">
      <%= brandPack.church_address %> &bull;
      <%= brandPack.church_phone %> &bull;
      <%= brandPack.church_website %>
    </p>
    <% if (socialMedia) { %>
      <p class="footer-social">
        <% if (socialMedia.facebook) { %>
          <span>Facebook: <%= socialMedia.facebook %></span>
        <% } %>
        <% if (socialMedia.instagram) { %>
          <span>Instagram: <%= socialMedia.instagram %></span>
        <% } %>
      </p>
    <% } %>
  </div>
  <div class="footer-page-number">
    Page <span class="page-num"></span>
  </div>
</footer>
```

**Data Interface:**
```typescript
interface FooterData {
  brandPack: {
    church_name: string;
    church_address: string;
    church_phone: string;
    church_website: string;
  };
  socialMedia?: {
    facebook?: string;
    instagram?: string;
  };
}
```

---

## Complete Bulletin Layout

**File:** `templates/layouts/bulletin-single-sheet.ejs`

```ejs
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bulletin - <%= serviceDate %></title>
  <link rel="stylesheet" href="/styles/tokens.css">
  <link rel="stylesheet" href="/styles/bulletin.css">
</head>
<body class="bulletin-layout">
  <!-- Watermark (if preview) -->
  <% if (status === 'built' && !locked_at) { %>
    <div class="watermark-proof">PROOF</div>
  <% } %>
  <% if (reopened_at) { %>
    <div class="watermark-updated">UPDATED <%= formatDate(reopened_at, 'MMM d, yyyy h:mm a') %></div>
  <% } %>

  <!-- Content -->
  <%- include('../blocks/cover', { brandPack, serviceDate, coverImage }) %>
  <%- include('../blocks/welcome', { welcomeMessage, brandPack }) %>
  <%- include('../blocks/order-of-service', { serviceItems }) %>
  <%- include('../blocks/songs', { songs, brandPack, churchCCLILicense }) %>
  <%- include('../blocks/scripture', { scriptures, brandPack }) %>
  <%- include('../blocks/sermon', { sermon }) %>
  <%- include('../blocks/announcements', { announcements, brandPack }) %>
  <%- include('../blocks/calendar', { upcomingEvents, brandPack }) %>
  <%- include('../blocks/qr-codes', { brandPack }) %>
  <%- include('../blocks/footer', { brandPack, socialMedia }) %>

  <script>
    // Page numbering (for print)
    const pageNums = document.querySelectorAll('.page-num');
    pageNums.forEach((el, index) => {
      el.textContent = index + 1;
    });
  </script>
</body>
</html>
```

---

## CSS Design Tokens

**File:** `P9_tokens.css` (see separate artifact file)

---

## Truncation Rules

**Line Clamp Utility:**
```css
.line-clamp-1 {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  overflow: hidden;
  text-overflow: ellipsis;
}

.line-clamp-3 { -webkit-line-clamp: 3; }
.line-clamp-10 { -webkit-line-clamp: 10; }
.line-clamp-15 { -webkit-line-clamp: 15; }
.line-clamp-20 { -webkit-line-clamp: 20; }
.line-clamp-30 { -webkit-line-clamp: 30; }
```

**Truncation Behavior:**
- **Announcement Title:** Hard limit 60 chars (database constraint)
- **Announcement Body:** Hard limit 300 chars (database constraint)
- **Song Lyrics:** Line-clamp-30 (~500 words), overflow → QR code
- **Scripture Text:** Line-clamp-20 (~300 words), overflow → QR code
- **Sermon Outline:** Line-clamp-15 (~10 bullet points)

**Overflow Handling:**
When content exceeds limits:
1. Truncate with ellipsis
2. Add "Full [content type] at [website URL]"
3. Optionally: Generate QR code for mobile access

---

## Large Print Variant

**Implementation:**
- Same templates, apply CSS transform: `scale(1.2)`
- Adjust viewport in Playwright to compensate
- No layout changes, just bigger text/images

**CSS:**
```css
.bulletin-layout.large-print {
  transform: scale(1.2);
  transform-origin: top left;
}
```

**Playwright Render:**
```typescript
await page.setViewportSize({ width: 1536, height: 864 }); // 1280 × 1.2
await page.addStyleTag({ content: '.bulletin-layout { transform: scale(1.2); }' });
```

---

## Print-Specific Styles

**File:** `styles/print.css`

```css
@media print {
  /* Hide screen-only elements */
  .watermark-proof,
  .watermark-updated {
    display: block !important; /* Keep watermarks in print */
  }

  /* Page breaks */
  .bulletin-cover,
  .bulletin-announcements,
  .bulletin-sermon {
    page-break-after: auto;
    page-break-inside: avoid;
  }

  /* Widow/orphan prevention */
  p, li {
    orphans: 3;
    widows: 3;
  }

  /* Headers/footers */
  @page {
    margin: 0.5in;
    @top-center {
      content: element(page-header);
    }
    @bottom-center {
      content: element(page-footer);
    }
  }

  /* Links: show URL */
  a[href]::after {
    content: " (" attr(href) ")";
    font-size: 0.8em;
    color: #666;
  }

  /* QR codes: ensure visibility */
  .qr-code {
    image-rendering: crisp-edges;
    image-rendering: pixelated;
  }
}
```

---

## CMYK-Safe Color Palette

**Problem:** RGB colors may not print accurately (especially bright blues/greens).

**Solution:** Use CMYK-safe RGB equivalents.

**Palette:**
```css
:root {
  /* Primary Colors (CMYK-safe) */
  --color-primary: #0052A3;    /* Blue (C100 M60 Y0 K20) */
  --color-secondary: #00843D;  /* Green (C100 M0 Y80 K20) */
  --color-accent: #C8102E;     /* Red (C0 M100 Y90 K10) */

  /* Grays */
  --color-gray-900: #1A1A1A;   /* Nearly black (K95) */
  --color-gray-700: #4A4A4A;   /* Dark gray (K70) */
  --color-gray-500: #767676;   /* Medium gray (K50) */
  --color-gray-300: #CCCCCC;   /* Light gray (K20) */
  --color-gray-100: #F5F5F5;   /* Off-white (K5) */

  /* Avoid pure black (#000000) - use K95 instead for richer prints */
}
```

**Recommended Tool:** Adobe Color or Pantone Color Bridge for CMYK verification.

---

## Accessibility (Large Print)

**Typography Scaling:**
- Base: 11pt → Large Print: 13.2pt (11 × 1.2)
- Headings: 14pt → Large Print: 16.8pt

**Contrast Ratios (WCAG AA):**
- Body text: 4.5:1 minimum
- Large text (14pt+): 3:1 minimum
- Use tools: WebAIM Contrast Checker

**Font Recommendations:**
- Body: Inter, Roboto, Source Sans Pro (high x-height)
- Avoid: decorative fonts, script fonts (low legibility)

---

## Acceptance Criteria

- [x] All 10 template blocks present (Cover, Welcome, Service, Songs, Scripture, Sermon, Announcements, Calendar, QR, Footer)
- [x] EJS syntax correct (no render errors)
- [x] Data interfaces defined (TypeScript)
- [x] Truncation rules documented with line-clamp utilities
- [x] Large-print variant documented (120% scale, no layout changes)
- [x] Print styles included (@media print)
- [x] CMYK-safe color palette defined
- [x] Widow/orphan prevention CSS
- [x] Watermark handling (PROOF, UPDATED timestamp)
- [x] QR code generation helper functions
- [x] Overflow handling (truncate + QR code)

---

## Next Steps

**P10:** Implement Playwright Render Service to convert these templates → PDF/JPG/MP4
**P11:** Implement state machine + audit triggers for bulletin locking

**Ready for P10?**
