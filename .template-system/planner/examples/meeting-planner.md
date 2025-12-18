# Example: Meeting Planner

A vertical planner for corporate or team meetings with agenda management, time tracking, and presenter assignments.

---

## Use Case

Team leads and meeting organizers need to:

- Structure meetings with clear agenda items
- Assign presenters to specific topics
- Track time to keep meetings on schedule
- Generate shareable agendas for attendees
- Link to meeting recordings post-meeting

---

## Extended Fields

### Plan-Level

| Field | Type | Purpose |
|-------|------|---------|
| `organizer` | `string` | Meeting owner/host |
| `location` | `string?` | Physical room or building |
| `meetingLink` | `string?` | Zoom/Teams/Meet URL |
| `recordingLink` | `string?` | Post-meeting recording URL |
| `attendees` | `string[]?` | List of expected attendees |

### Item-Level

| Field | Type | Purpose |
|-------|------|---------|
| `presenter` | `string?` | Person responsible for this item |
| `attachmentUrl` | `string?` | Link to slides or documents |
| `decision` | `string?` | Recorded decision (filled post-meeting) |
| `actionItems` | `string[]?` | Follow-up tasks from this item |

---

## Item Types

| Type | Label | Default Duration | Icon Suggestion | Color Suggestion |
|------|-------|------------------|-----------------|------------------|
| `welcome` | Welcome | 5 min | `Hand` | Warm gray |
| `presentation` | Presentation | 20 min | `FileText` | Purple |
| `discussion` | Discussion | 15 min | `MessageSquare` | Blue |
| `decision` | Decision Point | 10 min | `CheckCircle` | Green |
| `qa` | Q&A | 10 min | `HelpCircle` | Amber |
| `break` | Break | 10 min | `Coffee` | Slate |
| `action-review` | Action Review | 10 min | `ListChecks` | Teal |
| `wrap-up` | Wrap-Up | 5 min | `Flag` | Indigo |

---

## Typical Sections

| Section | Purpose | Common Items |
|---------|---------|--------------|
| Opening | Set context and goals | welcome, action-review |
| Main Agenda | Core meeting content | presentation, discussion, decision |
| Closing | Summarize and assign | wrap-up, action-review |

---

## Outline Generation

Expected output format:

```
Meeting Agenda
==============
Date: January 15, 2025
Organizer: Jane Smith
Start: 2:00 PM | End: 3:30 PM

Opening
-------
2:00 PM - Welcome (5 min)
2:05 PM - Review Previous Actions (10 min) - Jane Smith

Main Agenda
-----------
2:15 PM - Q3 Budget Review (20 min) - Finance Team
  Attachment: budget-q3.pdf
2:35 PM - Product Roadmap Discussion (15 min)
2:50 PM - Launch Date Decision (10 min)

Closing
-------
3:00 PM - Break (10 min)
3:10 PM - Action Items & Next Steps (10 min)
3:20 PM - Wrap-Up (10 min)

Location: Conference Room B
Meeting Link: https://zoom.us/j/123456789
```

---

## Timing Expectations

- **Total duration**: 60–90 minutes typical
- **Item granularity**: 5-minute increments recommended
- **Buffer**: Include 5-10 min buffer for overruns
- **Breaks**: Include break for meetings > 60 min

---

## UI Considerations

- Show presenter name prominently on each item
- Display meeting link in header for easy access
- "Copy agenda" button for sharing via email/Slack
- Post-meeting mode for recording decisions and action items
- Integration with calendar systems (optional)

---

## Backend Considerations

- Meetings may be recurring (link to series)
- Attendee list may integrate with org directory
- Action items may sync to task management system
- Recording links added asynchronously post-meeting
