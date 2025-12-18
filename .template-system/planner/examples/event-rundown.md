# Example: Event Rundown

A vertical planner for production run sheets—conferences, broadcasts, live events, and theatrical productions.

---

## Use Case

Production managers and stage managers need to:

- Coordinate multiple operators (audio, video, lighting)
- Track precise cue timing for live execution
- Document technical requirements per segment
- Generate run sheets for crew distribution
- Handle pre-show, live, and post-show phases

---

## Extended Fields

### Plan-Level

| Field | Type | Purpose |
|-------|------|---------|
| `eventName` | `string` | Name of the production |
| `venue` | `string?` | Location/venue name |
| `producer` | `string?` | Executive producer |
| `director` | `string?` | Show director |
| `callTime` | `string?` | Crew call time |
| `doorsOpen` | `string?` | Audience doors time |
| `broadcastStart` | `string?` | Live stream start (if applicable) |

### Item-Level

| Field | Type | Purpose |
|-------|------|---------|
| `cueNumber` | `string?` | Production cue ID (e.g., "Q15", "LX-3") |
| `operator` | `string?` | Responsible crew member |
| `department` | `string?` | audio / video / lighting / stage |
| `cueNotes` | `string?` | Technical execution notes |
| `talent` | `string?` | On-stage talent for this segment |
| `script` | `string?` | Link to script or teleprompter text |
| `isLive` | `boolean?` | Marks live vs. pre-recorded segments |

---

## Item Types

| Type | Label | Default Duration | Icon Suggestion | Color Suggestion |
|------|-------|------------------|-----------------|------------------|
| `segment` | Segment | 10 min | `Play` | Blue |
| `vtr` | VTR/Package | 3 min | `Film` | Purple |
| `interview` | Interview | 8 min | `Mic` | Teal |
| `performance` | Performance | 5 min | `Music` | Pink |
| `transition` | Transition | 1 min | `ArrowRight` | Slate |
| `commercial` | Commercial Break | 3 min | `Tv` | Gray |
| `standby` | Standby | 2 min | `Clock` | Amber |
| `cue` | Technical Cue | 0 min | `Zap` | Red |
| `note` | Production Note | 0 min | `StickyNote` | Yellow |

---

## Typical Sections

| Section | Purpose | Common Items |
|---------|---------|--------------|
| Pre-Show | Setup and rehearsal | standby, cue, note |
| Show Open | Opening sequence | segment, vtr, performance |
| Block 1 | First content block | segment, interview, transition |
| Commercial 1 | Ad break | commercial, standby |
| Block 2 | Second content block | segment, performance, vtr |
| Show Close | Closing sequence | segment, transition |
| Post-Show | Wrap and strike | note, cue |

---

## Outline Generation

Expected output format:

```
EVENT RUNDOWN
=============
Event: Annual Awards Gala 2025
Venue: Grand Ballroom
Date: March 15, 2025

Call Time: 4:00 PM
Doors: 6:30 PM
Show Start: 7:00 PM | End: 10:00 PM

PRE-SHOW
--------
4:00 PM - Crew Call (0 min) [STANDBY]
4:30 PM - Sound Check (60 min) [CUE: Q1] - Audio Team
5:30 PM - Lighting Focus (30 min) [CUE: LX-1] - Lighting Team
6:00 PM - Rehearsal Run (30 min)
6:30 PM - Doors Open (0 min) [CUE: DOORS]

SHOW OPEN
---------
7:00 PM - House to Half [CUE: LX-2] (1 min)
7:01 PM - Opening VTR (3 min) [VTR: VT-1]
7:04 PM - Host Entrance (2 min) - Jane Smith
          Notes: Enters SR, walks to center mark

BLOCK 1
-------
7:06 PM - Welcome & Intro (5 min) - Jane Smith
7:11 PM - Award: Best New Product (8 min)
          Presenter: John Doe
          Winner VTR: VT-2
7:19 PM - Musical Performance (4 min) - The Band
          [CUE: LX-3, AUDIO-5]

---
Director: Sarah Johnson
Producer: Mike Williams
```

---

## Timing Expectations

- **Precision**: Second-level accuracy for broadcast
- **Cue points**: Zero-duration items mark technical moments
- **Padding**: Build in segment buffers for live shows
- **Hard outs**: Mark non-negotiable time boundaries

---

## UI Considerations

- **Cue number column** — Prominent, sortable
- **Department color coding** — Visual crew assignment
- **Countdown timer** — Live mode with real-time tracking
- **Current item highlight** — "On Air" indicator
- **Print format** — Landscape, dense, crew-friendly
- **Cue sheet export** — Department-specific filtered views

---

## Backend Considerations

- Multiple crew members may edit simultaneously
- Version history critical for production changes
- Export to industry formats (e.g., CSV for lighting consoles)
- Integration with show caller / stage manager apps
- Real-time sync for live show updates
