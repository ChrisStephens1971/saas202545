# Elder-First Platform API Documentation

**Version**: 0.1.0
**Protocol**: tRPC over HTTP
**Base URL**: `http://localhost:8045/trpc`
**Authentication**: Bearer JWT token

---

## Table of Contents

1. [Authentication](#authentication)
2. [Common Patterns](#common-patterns)
3. [Bulletins API](#bulletins-api)
4. [People API](#people-api)
5. [Service Items API](#service-items-api)
6. [Events API](#events-api)
7. [Announcements API](#announcements-api)
8. [Error Codes](#error-codes)
9. [TypeScript Client Usage](#typescript-client-usage)

---

## Authentication

All endpoints require authentication via JWT token and tenant context.

### Headers

```http
Authorization: Bearer <jwt-token>
x-tenant-id: <tenant-uuid>
```

### Development Tokens

For local development, generate a token:

```typescript
const devTokenPayload = {
  userId: 'dev-user-id',
  role: 'admin',
  tenantId: '753161b3-e698-46a6-965f-b2ef814c6874',
  personId: null,
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (12 * 60 * 60),
};

const token = btoa(JSON.stringify(devTokenPayload));
```

---

## Common Patterns

### Pagination

List endpoints support pagination:

```typescript
{
  limit: number;   // Default: 50, Max: 100
  offset: number;  // Default: 0
}
```

### Soft Deletes

All delete operations are soft deletes using `deleted_at` timestamp.

### Date Handling

All dates use ISO 8601 format with superjson transformer.

---

## Bulletins API

### `bulletins.list` - Get bulletins list
### `bulletins.get` - Get single bulletin
### `bulletins.create` - Create bulletin
### `bulletins.update` - Update bulletin
### `bulletins.delete` - Delete bulletin
### `bulletins.lock` - Lock bulletin for publication

## People API

### `people.list` - Search people
### `people.get` - Get single person
### `people.create` - Create person
### `people.update` - Update person
### `people.delete` - Delete person

## Service Items API

### `serviceItems.list` - Get service items
### `serviceItems.create` - Create service item
### `serviceItems.update` - Update service item
### `serviceItems.delete` - Delete service item
### `serviceItems.reorder` - Reorder items

## Events API

### `events.list` - Get events
### `events.get` - Get single event
### `events.create` - Create event
### `events.update` - Update event
### `events.delete` - Delete event

## Announcements API

### `announcements.listActive` - Get active announcements
### `announcements.list` - Get all announcements
### `announcements.get` - Get single announcement
### `announcements.create` - Create announcement
### `announcements.update` - Update announcement
### `announcements.delete` - Delete announcement
### `announcements.approve` - Approve announcement

---

**Last Updated**: November 14, 2025
