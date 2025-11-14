import { z } from 'zod';

// ===== User Roles =====
export const UserRole = z.enum(['Admin', 'Editor', 'Submitter', 'Viewer', 'Kiosk']);
export type UserRole = z.infer<typeof UserRole>;

// ===== Person =====
export const PersonSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().nullable(),
  phone: z.string().nullable(),
  householdId: z.string().uuid().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export type Person = z.infer<typeof PersonSchema>;

// ===== Event =====
export const EventSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().nullable(),
  startAt: z.date(),
  endAt: z.date(),
  location: z.string().nullable(),
  externalUid: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export type Event = z.infer<typeof EventSchema>;

// ===== Announcement =====
export const AnnouncementSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  title: z.string().min(1).max(60),
  body: z.string().min(1).max(300),
  priority: z.enum(['high', 'normal', 'low']),
  category: z.string().nullable(),
  expiresAt: z.date().nullable(),
  approvedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable(),
});

export type Announcement = z.infer<typeof AnnouncementSchema>;

// ===== ServiceItem =====
export const ServiceItemType = z.enum([
  'song',
  'prayer',
  'scripture',
  'sermon',
  'announcement',
  'offering',
  'other',
]);

export const ServiceItemSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  bulletinIssueId: z.string().uuid(),
  type: ServiceItemType,
  title: z.string().min(1),
  description: z.string().nullable(),
  ccliNumber: z.string().nullable(),
  orderIndex: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ServiceItem = z.infer<typeof ServiceItemSchema>;
export type ServiceItemType = z.infer<typeof ServiceItemType>;

// ===== BulletinIssue =====
export const BulletinIssueStatus = z.enum([
  'draft',
  'approved',
  'built',
  'locked',
  'reopen_emergency',
]);

export const BulletinIssueSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  serviceDate: z.date(),
  status: BulletinIssueStatus,
  lockedAt: z.date().nullable(),
  lockedBy: z.string().uuid().nullable(),
  templateHash: z.string().nullable(),
  dataHash: z.string().nullable(),
  pdfUrl: z.string().url().nullable(),
  slidesUrl: z.string().url().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type BulletinIssue = z.infer<typeof BulletinIssueSchema>;
export type BulletinIssueStatus = z.infer<typeof BulletinIssueStatus>;

// ===== Contribution =====
export const ContributionSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  personId: z.string().uuid().nullable(),
  fundId: z.string().uuid(),
  amount: z.number().positive(),
  date: z.date(),
  method: z.enum(['card', 'ach', 'cash', 'check', 'other']),
  externalId: z.string().nullable(),
  recurring: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Contribution = z.infer<typeof ContributionSchema>;
