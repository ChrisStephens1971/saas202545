'use client';

/**
 * Bulletins Page - Dual View Support
 *
 * Uses the container + dual view pattern to render:
 * - ModernView: Grid layout with compact cards (original design)
 * - AccessibleView: Linear layout with larger touch targets, "This Sunday" focus
 *
 * Shell is provided by layout.tsx (ChurchAppShell).
 *
 * See: docs/ui/ACCESSIBLE-UI-CURRENT-STATE.md (Dual-View Eligibility Rules)
 */

import { BulletinsContainer } from './_components';

export default function BulletinsPage() {
  return <BulletinsContainer />;
}
