// Shared configuration constants

// Accessibility constants (elder-first design)
export const ACCESSIBILITY = {
  MIN_FONT_SIZE: 18,
  MIN_TOUCH_TARGET: 48,
  MIN_CONTRAST_RATIO: 4.5, // WCAG AA
  READING_LEVEL: '6-8th grade',
} as const;

// Bulletin constraints
export const BULLETIN = {
  ANNOUNCEMENT_TITLE_MAX: 60,
  ANNOUNCEMENT_BODY_MAX: 300,
  LOCK_DEADLINE_DAY: 4, // Thursday
  LOCK_DEADLINE_HOUR: 14, // 2pm
  TOP_ANNOUNCEMENTS_LARGE: 3,
  IMAGE_MAX_SIZE_MB: 4,
  IMAGE_ASPECT_RATIO: '16:9',
} as const;

// Ports (from .project-state.json)
export const PORTS = {
  FRONTEND: 3045,
  BACKEND: 8045,
  POSTGRES: 5445,
  REDIS: 6445,
  MONGO: 27045,
} as const;

// User roles
export const ROLES = {
  ADMIN: 'Admin',
  EDITOR: 'Editor',
  SUBMITTER: 'Submitter',
  VIEWER: 'Viewer',
  KIOSK: 'Kiosk',
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MAX_LIMIT: 100,
} as const;

// Rate limiting
export const RATE_LIMITS = {
  PER_TENANT_RPM: 60, // requests per minute per tenant
} as const;
