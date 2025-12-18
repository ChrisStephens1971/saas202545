'use client';

/**
 * Service Plan Detail Page (Dynamic Route)
 *
 * Loads and displays a specific service plan by ID.
 * Uses the shared ServicePlanEditor component.
 *
 * Route: /sunday-planner/[planId]
 *
 * Phase 8: Templates & Plan Library UX
 */

import { use } from 'react';
import { ChurchAppShell } from '@/components/layout/church-shell';
import { PageContainer } from '@/components/layout/PageContainer';
import { ServicePlanEditor } from '@/components/sunday-planner/ServicePlanEditor';

interface PlanDetailPageProps {
  params: Promise<{
    planId: string;
  }>;
}

export default function PlanDetailPage({ params }: PlanDetailPageProps) {
  // Unwrap the params promise (Next.js 15 pattern)
  const { planId } = use(params);

  return (
    <ChurchAppShell>
      <PageContainer>
        <ServicePlanEditor planId={planId} />
      </PageContainer>
    </ChurchAppShell>
  );
}
