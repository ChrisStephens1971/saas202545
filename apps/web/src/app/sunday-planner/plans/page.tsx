'use client';

/**
 * Service Plan Library Page
 *
 * Lists all service plans and templates with filtering.
 * Allows users to:
 * - View upcoming and past plans
 * - View templates
 * - Open a plan in the planner
 * - Create a new plan from a template
 *
 * Phase 8: Templates & Plan Library UX
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChurchAppShell } from '@/components/layout/church-shell';
import { PageContainer } from '@/components/layout/PageContainer';
import { trpc } from '@/lib/trpc/client';
import {
  Loader2,
  AlertCircle,
  Calendar,
  Clock,

  Plus,
  ChevronRight,
  LayoutTemplate,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FilterTab = 'upcoming' | 'past' | 'templates';

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Check if a date is in the future (or today)
 */
function isUpcoming(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T00:00:00');
  return date >= today;
}

/**
 * Get next Sunday date string
 */
function getNextSunday(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const nextSunday = new Date(today);
  nextSunday.setDate(today.getDate() + daysUntilSunday);
  return nextSunday.toISOString().split('T')[0];
}

export default function PlanLibraryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FilterTab>('upcoming');
  const [isCreatingFromTemplate, setIsCreatingFromTemplate] = useState<string | null>(null);

  // Fetch plans
  const {
    data: plans,
    isLoading: isLoadingPlans,
    error: plansError,
  } = trpc.servicePlans.list.useQuery({ limit: 50 });

  // Fetch templates
  const {
    data: templates,
    isLoading: isLoadingTemplates,
    error: templatesError,
  } = trpc.servicePlans.listTemplates.useQuery({ limit: 50 });

  // Create from template mutation
  const createFromTemplateMutation = trpc.servicePlans.createFromTemplate.useMutation({
    onSuccess: (result) => {
      router.push(`/sunday-planner/${result.id}`);
    },
    onError: () => {
      setIsCreatingFromTemplate(null);
    },
  });

  const isLoading = isLoadingPlans || isLoadingTemplates;
  const error = plansError || templatesError;

  // Filter plans by tab
  const filteredPlans =
    plans?.filter((plan) =>
      activeTab === 'upcoming' ? isUpcoming(plan.date) : !isUpcoming(plan.date)
    ) || [];

  // Sort: upcoming by date ascending, past by date descending
  const sortedPlans = [...filteredPlans].sort((a, b) => {
    if (activeTab === 'upcoming') {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const handleOpenPlan = (planId: string) => {
    router.push(`/sunday-planner/${planId}`);
  };

  const handleCreateFromTemplate = (templateId: string) => {
    setIsCreatingFromTemplate(templateId);
    createFromTemplateMutation.mutate({
      templateId,
      date: getNextSunday(),
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <ChurchAppShell>
        <PageContainer>
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="h-10 w-10 animate-spin text-teal-600" />
            <p className="mt-4 text-lg text-gray-600">Loading plans...</p>
          </div>
        </PageContainer>
      </ChurchAppShell>
    );
  }

  // Error state
  if (error) {
    return (
      <ChurchAppShell>
        <PageContainer>
          <div className="flex flex-col items-center justify-center py-24">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Could not load plans
            </h2>
            <p className="mt-2 text-gray-600">{error.message}</p>
          </div>
        </PageContainer>
      </ChurchAppShell>
    );
  }

  return (
    <ChurchAppShell>
      <PageContainer>
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
                Service Plans
              </h1>
              <p className="mt-1 text-gray-500">
                View and manage your service plans and templates
              </p>
            </div>
            <button
              onClick={() => router.push('/sunday-planner')}
              className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
            >
              <Plus className="h-5 w-5" />
              <span>Current Plan</span>
            </button>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="mb-6 flex gap-2 border-b border-gray-200">
          {(['upcoming', 'past', 'templates'] as FilterTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'px-4 py-3 text-sm font-medium transition-colors',
                activeTab === tab
                  ? 'border-b-2 border-teal-600 text-teal-600'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab === 'upcoming' && 'Upcoming'}
              {tab === 'past' && 'Past'}
              {tab === 'templates' && `Templates (${templates?.length || 0})`}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'templates' ? (
          // Templates List
          <div className="space-y-3">
            {!templates || templates.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
                <LayoutTemplate className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  No templates yet
                </h3>
                <p className="mt-2 text-gray-500">
                  Save a service plan as a template to reuse it for future services.
                </p>
              </div>
            ) : (
              templates.map((template) => (
                <div
                  key={template.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 transition-colors hover:border-gray-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                      <LayoutTemplate className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{template.name}</h3>
                      <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {template.startTime}
                        </span>
                        <span>{template.itemCount} items</span>
                        {template.description && (
                          <span className="text-gray-400">· {template.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleCreateFromTemplate(template.id)}
                    disabled={isCreatingFromTemplate === template.id}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                      isCreatingFromTemplate === template.id
                        ? 'bg-gray-100 text-gray-400'
                        : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
                    )}
                  >
                    {isCreatingFromTemplate === template.id ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Use Template
                      </>
                    )}
                  </button>
                </div>
              ))
            )}
          </div>
        ) : (
          // Plans List
          <div className="space-y-3">
            {sortedPlans.length === 0 ? (
              <div className="rounded-xl border border-gray-200 bg-white px-6 py-12 text-center">
                <Calendar className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  No {activeTab} plans
                </h3>
                <p className="mt-2 text-gray-500">
                  {activeTab === 'upcoming'
                    ? 'Create a bulletin to start planning your next service.'
                    : 'Past service plans will appear here.'}
                </p>
              </div>
            ) : (
              sortedPlans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => handleOpenPlan(plan.id)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-6 py-4 text-left transition-colors hover:border-teal-300 hover:bg-teal-50/50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-lg',
                        isUpcoming(plan.date) ? 'bg-teal-100' : 'bg-gray-100'
                      )}
                    >
                      <Calendar
                        className={cn(
                          'h-6 w-6',
                          isUpcoming(plan.date) ? 'text-teal-600' : 'text-gray-400'
                        )}
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {formatDate(plan.date)}
                      </h3>
                      <div className="mt-1 flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {plan.startTime}
                        </span>
                        <span>{plan.itemCount} items</span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-xs font-medium',
                            plan.status === 'locked'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          )}
                        >
                          {plan.status === 'locked' ? 'Published' : 'Draft'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </button>
              ))
            )}
          </div>
        )}
      </PageContainer>
    </ChurchAppShell>
  );
}
