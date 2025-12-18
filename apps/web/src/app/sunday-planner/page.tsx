'use client';

/**
 * Sunday Planner Page
 *
 * Main entry point for the Sunday Service Planner.
 * Loads the current (next upcoming) service plan.
 * Uses the shared ServicePlanEditor component.
 *
 * Route: /sunday-planner (loads current plan via getCurrent)
 * Shell is provided by layout.tsx (ChurchAppShell).
 *
 * Phase 8: Refactored to use shared ServicePlanEditor component
 */

import { PageContainer } from '@/components/layout/PageContainer';
import { ServicePlanEditor } from '@/components/sunday-planner/ServicePlanEditor';

export default function SundayPlannerPage() {
  return (
    <PageContainer>
      <ServicePlanEditor />
    </PageContainer>
  );
}
