# P13: Messaging & Announcements Specification

**Version:** 1.0
**Date:** 2025-11-14
**Status:** Planning

---

## Overview

The communications system provides three primary features:
1. **Channels** - Broadcast and discussion channels with role-based controls
2. **Announcements** - Time-bound, prioritized announcements feed
3. **Weekly Digest** - "Your Week" email summary sent Mondays at 9am

**Design Principle:** Simple, elder-friendly communication that reduces email overload while ensuring important information reaches members.

---

## 1. Channels

### Channel Types

#### Broadcast Channels
**Purpose:** One-way communication from leadership to members
**Examples:** "From the Pastor", "Prayer Requests", "Building Updates"

**Permissions:**
- **Send:** Admin, Editor only
- **Reply:** Optional (configurable per channel)
- **View:** All members (or restricted by group)

#### Discussion Channels
**Purpose:** Two-way conversation among members
**Examples:** "Small Group Chat", "Volunteers", "Youth Ministry"

**Permissions:**
- **Send:** All channel members
- **Reply:** All channel members
- **View:** Channel members only

### Channel Schema

```sql
CREATE TABLE Channel (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES Tenant(id),
  name VARCHAR(60) NOT NULL,
  description VARCHAR(300),
  channel_type VARCHAR(20) NOT NULL CHECK (channel_type IN ('broadcast', 'discussion')),
  allow_replies BOOLEAN DEFAULT false,
  icon VARCHAR(50), -- emoji or icon name

  -- Access control
  visibility VARCHAR(20) CHECK (visibility IN ('all', 'group', 'role')),
  restricted_to_group_id UUID REFERENCES Group(id),
  restricted_to_role VARCHAR(20),

  -- Settings
  notify_on_new_message BOOLEAN DEFAULT true,
  archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  UNIQUE(tenant_id, name)
);

CREATE TABLE Message (
  id UUID PRIMARY KEY,
  channel_id UUID NOT NULL REFERENCES Channel(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES Person(id),
  parent_message_id UUID REFERENCES Message(id), -- For threaded replies

  content TEXT NOT NULL CHECK (LENGTH(content) <= 2000),
  mentioned_user_ids UUID[], -- @mentions

  -- Metadata
  read_by UUID[] DEFAULT '{}', -- Array of person IDs who read it
  pinned BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP, -- Soft delete
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_message_channel ON Message(channel_id, created_at DESC);
CREATE INDEX idx_message_sender ON Message(sender_id);
```

### Channel Features

#### Required for V1
- [x] Create/edit/archive channels
- [x] Send messages to channel
- [x] Reply to messages (if allowed)
- [x] View message history (last 100 messages)
- [x] @mention users
- [x] Mark messages as read
- [x] Pin important messages
- [x] Simple moderation (delete message, ban user)

#### Future (Post-V1)
- [ ] Threaded conversations
- [ ] Message reactions (👍❤️🙏)
- [ ] File attachments
- [ ] Rich text formatting
- [ ] Search messages
- [ ] Message edit history

### API Endpoints (tRPC)

```typescript
// channels router
channels: {
  list: protectedProcedure
    .query(({ ctx }) => {
      // Return channels visible to current user
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(({ input }) => {
      // Get channel details + recent messages
    }),

  create: adminProcedure
    .input(CreateChannelSchema)
    .mutation(({ input }) => {
      // Create new channel
    }),

  sendMessage: protectedProcedure
    .input(z.object({
      channelId: z.string().uuid(),
      content: z.string().min(1).max(2000),
      parentMessageId: z.string().uuid().optional(),
    }))
    .mutation(({ input, ctx }) => {
      // Send message (check permissions)
    }),

  markAsRead: protectedProcedure
    .input(z.object({ messageId: z.string().uuid() }))
    .mutation(({ input, ctx }) => {
      // Add current user to read_by array
    }),
}
```

### UI Components

**ChannelList** - Sidebar with channels
- Shows unread badge count
- Groups by type (Broadcast / Discussions)
- Sort by: Pinned, Recent activity, Name

**ChannelView** - Main message feed
- Reverse chronological (newest at bottom)
- Scroll to load older messages
- Sticky pinned messages at top
- Typing indicator (optional)

**MessageComposer** - Input box
- Text area with character counter (2000 max)
- @mention autocomplete
- Send button (Ctrl+Enter shortcut)

---

## 2. Announcements

### Purpose

Time-sensitive announcements that appear prominently in the app and in the weekly digest.

**Examples:**
- "Service time change this Sunday"
- "Potluck next week - bring a dish!"
- "Building closed for repairs"

### Announcement Schema

```sql
-- Already defined in P3_schema.sql, extending here
ALTER TABLE Announcement ADD COLUMN priority VARCHAR(20) DEFAULT 'normal'
  CHECK (priority IN ('urgent', 'high', 'normal', 'low'));
ALTER TABLE Announcement ADD COLUMN expires_at TIMESTAMP;
ALTER TABLE Announcement ADD COLUMN auto_expire BOOLEAN DEFAULT true;
ALTER TABLE Announcement ADD COLUMN target_audience VARCHAR(20) DEFAULT 'all'
  CHECK (target_audience IN ('all', 'members', 'visitors', 'volunteers'));
```

### Priority Levels

| Priority | Badge Color | Notification | Bulletin Display |
|----------|-------------|--------------|------------------|
| **Urgent** | Red | Push + Email | Top of page, large |
| **High** | Orange | Email | Featured section |
| **Normal** | Blue | None | Standard list |
| **Low** | Gray | None | Bottom of list |

### Auto-Expire Rules

**Default Behavior:**
- Event-related announcements → Expire 1 day after event
- General announcements → Expire 14 days after created
- Urgent announcements → Expire 3 days after created
- Manual override → Expire at specified date

**Implementation:**
```sql
CREATE FUNCTION auto_expire_announcements() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.auto_expire = true AND NEW.expires_at IS NULL THEN
    IF NEW.related_event_id IS NOT NULL THEN
      -- Expire 1 day after event
      NEW.expires_at := (SELECT end_time + INTERVAL '1 day' FROM Event WHERE id = NEW.related_event_id);
    ELSIF NEW.priority = 'urgent' THEN
      NEW.expires_at := NEW.created_at + INTERVAL '3 days';
    ELSE
      NEW.expires_at := NEW.created_at + INTERVAL '14 days';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_announcement_expiry
  BEFORE INSERT ON Announcement
  FOR EACH ROW EXECUTE FUNCTION auto_expire_announcements();
```

### Announcement Feed

**Filtering:**
- Active only (not expired, not future-dated)
- Sorted by: Priority DESC, created_at DESC
- Show top 3 with full text
- Remaining in collapsed list

**Actions:**
- Dismiss (hide from feed for this user)
- Share (copy link, email, SMS)
- Related event → RSVP inline

### API Endpoints

```typescript
// announcements router
announcements: {
  listActive: protectedProcedure
    .input(z.object({
      targetAudience: z.enum(['all', 'members', 'visitors']).optional(),
      limit: z.number().default(20),
    }))
    .query(({ input, ctx }) => {
      // Return active announcements not expired
      // Exclude dismissed by current user
    }),

  create: editorProcedure
    .input(CreateAnnouncementSchema)
    .mutation(({ input }) => {
      // Create announcement
      // Auto-set expires_at if auto_expire = true
    }),

  dismiss: protectedProcedure
    .input(z.object({ announcementId: z.string().uuid() }))
    .mutation(({ input, ctx }) => {
      // Add to user's dismissed_announcements
    }),
}
```

---

## 3. Weekly Digest ("Your Week")

### Purpose

A personalized email sent **every Monday at 9:00 AM** local time that summarizes:
1. Upcoming events this week
2. New/important announcements
3. New messages in channels (if user has unread)
4. This Sunday's service info (if bulletin locked)

**Goal:** Reduce daily email noise while ensuring members stay informed.

### Digest Structure

**Email Layout:**

```
From: [Church Name] <noreply@churchdomain.com>
Subject: Your Week at [Church Name] - Nov 13-19

----------------------------------------------------
Hi John,

Here's what's happening this week at First Community Church:
----------------------------------------------------

📅 THIS SUNDAY
Service: 10:00 AM
Message: "The Good Shepherd" - Pastor Smith
[View Full Bulletin]

----------------------------------------------------

📆 THIS WEEK'S EVENTS (3)

  Wednesday Prayer Meeting
  Nov 15, 7:00 PM - Fellowship Hall
  [RSVP]

  Youth Group
  Nov 16, 6:30 PM - Youth Room
  [RSVP]

  Small Group - Smith Home
  Nov 17, 7:00 PM - 123 Oak St
  [RSVP]

[View All Events]

----------------------------------------------------

📢 ANNOUNCEMENTS (2)

  🔴 Service Time Change - This Sunday Only
  Due to building maintenance, service will start at 11 AM this
  week. Regular 10 AM time resumes next Sunday.

  🔵 Potluck Next Week
  Sunday Nov 19 after service. Bring a dish to share!
  [More Details]

----------------------------------------------------

💬 MESSAGES (5 unread)

  From the Pastor (2 new)
  Prayer Requests (3 new)

  [Read Messages]

----------------------------------------------------

❤️ QUICK GIVE
Give online anytime:
[Give Now]

----------------------------------------------------

Need help? Reply to this email or call (555) 123-4567

[Unsubscribe] | [Email Preferences]
```

### Digest Logic

**Who Receives Digest:**
- All members with email addresses
- Opted-in to weekly digest (default: yes)
- Active account (logged in within 90 days)

**Personalization:**
- Events: Show events user hasn't RSVP'd to + events they're attending
- Announcements: Show active announcements user hasn't dismissed
- Messages: Show channels user is member of with unread count
- Sunday service: If bulletin is locked, show service preview

**Send Schedule:**
- **Time:** Mondays at 9:00 AM tenant's local timezone
- **Batching:** Send in batches of 100/minute to avoid rate limits
- **Retry:** If send fails, retry up to 3 times with exponential backoff

### Digest Generator

See `P13_digest.ts` for implementation.

---

## 4. Notification Settings

### User Preferences

Users can control notifications per channel and globally.

**Notification Types:**
1. **Push Notifications** (mobile app)
2. **Email Notifications** (immediate)
3. **Weekly Digest** (batched)

**Granularity:**
```
Global:
  ☑ Weekly digest (Mondays 9am)
  ☐ Push notifications
  ☑ Email for urgent announcements

Per Channel:
  Channels:
    From the Pastor
      ☑ Email on new message
      ☑ Include in digest
      ☐ Push notification

    Prayer Requests
      ☐ Email on new message
      ☑ Include in digest
      ☐ Push notification
```

### Notification Rules

**Email (Immediate):**
- Urgent announcements → Always email (unless globally disabled)
- Channel messages → Only if user enabled "Email on new message"
- @mentions → Always email
- Event reminders → 24 hours before + 1 hour before

**Push (Mobile App - Future):**
- Urgent announcements
- @mentions
- Event starting in 15 minutes (if RSVP'd)

**Weekly Digest:**
- Sent Monday 9am
- Includes all enabled channels
- Always includes urgent/high announcements
- Can't be disabled (but can unsubscribe)

---

## 5. Moderation & Safety

### Message Moderation

**Admin Powers:**
- Delete any message
- Ban user from channel (soft ban, can rejoin if unbanned)
- Edit pinned messages
- Archive entire channel

**Audit Trail:**
```sql
CREATE TABLE ModerationLog (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  moderator_id UUID REFERENCES Person(id),
  action VARCHAR(50) NOT NULL, -- 'delete_message', 'ban_user', etc.
  target_message_id UUID,
  target_user_id UUID,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Profanity Filter (Optional)

- Use simple word list filter
- Flag for review, don't auto-delete (false positives common)
- Admin can review flagged messages

### Report Message

- Any user can report a message
- Admin gets notification
- Admin reviews and takes action

---

## 6. Implementation Tasks

### Backend

- [x] Database schema (Channel, Message, Announcement)
- [ ] tRPC routers (channels, messages, announcements)
- [ ] Auto-expire announcements cron job (runs daily)
- [ ] Weekly digest generator (runs Mondays 9am)
- [ ] Real-time message delivery (WebSocket or polling)
- [ ] Notification preferences CRUD
- [ ] Moderation APIs

### Frontend

- [ ] Channel list sidebar
- [ ] Message feed view
- [ ] Message composer with @mentions
- [ ] Announcements feed widget
- [ ] Digest preview (for admins)
- [ ] Notification settings page

### Email Templates

- [ ] Weekly digest template
- [ ] Urgent announcement template
- [ ] @mention notification template
- [ ] Welcome email with channel intro

### Background Jobs

- [ ] Send weekly digest (Mondays 9am)
- [ ] Expire announcements (daily 2am)
- [ ] Send event reminders (hourly check)
- [ ] Clean up old messages (monthly, keep last 90 days)

---

## 7. Metrics & Analytics

**Track:**
- Messages sent per channel per week
- Announcement views/dismissals
- Digest open rate
- Digest click-through rate (events, announcements, give)
- Channel engagement (active users per channel)

**Reports:**
- Weekly comms summary (for admins)
- Most engaged channels
- Announcement effectiveness

---

## 8. Accessibility

**Screen Reader:**
- Announce new messages via aria-live region
- Keyboard shortcuts (j/k for next/prev message, c for compose)

**High Contrast:**
- Priority badges visible in high contrast mode
- Unread indicators clear

**Font Scaling:**
- Message text scales with system font size
- Max width to prevent long lines at XXL size

---

## 9. Edge Cases

**No Upcoming Events:**
- Digest shows "No events this week" with link to full calendar

**No Announcements:**
- Skip announcements section in digest

**User Has No Channels:**
- Show welcome message: "Join a channel to start messaging"

**Digest Send Failure:**
- Log error
- Retry 3 times
- If still failing, alert admin

**Timezone Handling:**
- Store digest send time in tenant's timezone
- Convert to UTC for cron scheduling
- Show times in user's timezone in app

---

## 10. Security

**Input Validation:**
- Sanitize all message content (prevent XSS)
- Strip HTML tags (plain text only for V1)
- Rate limit: 10 messages per minute per user

**Permissions:**
- Every message send checks if user can post to channel
- Every message read checks if user can view channel
- Tenant isolation via RLS on all tables

**Email Safety:**
- Unsubscribe link required
- SPF/DKIM configured
- Bounce handling (disable email for hard bounces)

---

**Artifacts:**
- `P13_comms_spec.md` (this file)
- `P13_digest.ts` (digest generator implementation)

**Version:** 1.0
**Date:** 2025-11-14
