'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { BulletinCanvasEditor } from '@/components/bulletins/canvas';
import { BulletinLayoutWizard, type WizardConfig } from '@/components/bulletins/canvas/BulletinLayoutWizard';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import type { BulletinCanvasLayout } from '@elder-first/types';

export default function BulletinCanvasEditorPage() {
  const params = useParams();
  const router = useRouter();
  const bulletinId = params.id as string;
  const utils = trpc.useContext();

  // Wizard state - show wizard first for new layouts or if user requests it
  const [showWizard, setShowWizard] = useState<boolean | null>(null); // null = determining, true = show, false = skip
  const [wizardConfig, setWizardConfig] = useState<WizardConfig | null>(null);
  const [generatedLayout, setGeneratedLayout] = useState<BulletinCanvasLayout | null>(null);

  // Fetch bulletin data
  const { data: bulletin, isLoading } = trpc.bulletins.get.useQuery({
    id: bulletinId,
  });

  // Fetch organization data for church name and bulletin settings
  const { data: org } = trpc.org.getBranding.useQuery();

  // Update bulletin mutation
  const updateBulletin = trpc.bulletins.update.useMutation({
    onSuccess: () => {
      utils.bulletins.get.invalidate({ id: bulletinId });
      // Don't navigate - stay in canvas editor after save
    },
    onError: (error) => {
      // More helpful error messages
      console.error('Failed to save canvas layout:', error);

      let message = 'Failed to save canvas layout. ';

      if (error.message.includes('request entity too large') || error.message.includes('PayloadTooLarge')) {
        message += 'The layout is too large. Try reducing the number of images or using smaller image files.';
      } else if (error.message.includes('locked')) {
        message += 'This bulletin is locked and cannot be edited.';
      } else if (error.message.includes('not found')) {
        message += 'This bulletin could not be found.';
      } else {
        message += error.message || 'Please try again or contact support if this continues.';
      }

      alert(message);
    },
  });

  // Determine whether to show wizard
  useMemo(() => {
    if (showWizard !== null) return; // Already determined
    if (!bulletin) return; // Wait for bulletin to load

    // Check URL params for explicit wizard request
    const searchParams = new URLSearchParams(window.location.search);
    const forceWizard = searchParams.get('wizard') === 'true';

    if (forceWizard) {
      setShowWizard(true);
      return;
    }

    // Show wizard for new layouts (no canvas layout yet)
    if (!bulletin.canvasLayoutJson) {
      setShowWizard(true);
    } else {
      // Skip wizard for existing layouts by default
      setShowWizard(false);
    }
  }, [bulletin, showWizard]);

  // Generate or use initial layout
  const initialLayout = useMemo(() => {
    if (!bulletin) return null;

    // If we have a generated layout from wizard, use it
    if (generatedLayout) {
      return generatedLayout;
    }

    // If canvas layout already exists, use it
    if (bulletin.canvasLayoutJson) {
      return bulletin.canvasLayoutJson as unknown as BulletinCanvasLayout;
    }

    // Otherwise, return null (wizard will generate it)
    return null;
  }, [bulletin, generatedLayout]);

  if (isLoading) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor']}>
        <div className="flex items-center justify-center h-screen">
          <p className="text-lg text-gray-600">Loading canvas editor...</p>
        </div>
      </ProtectedPage>
    );
  }

  if (!bulletin) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor']}>
        <div className="flex items-center justify-center h-screen">
          <p className="text-lg text-red-600">Bulletin not found</p>
        </div>
      </ProtectedPage>
    );
  }

  const handleSave = async (layout: BulletinCanvasLayout) => {
    try {
      // Merge wizard config into layout metadata if available
      const layoutToSave = wizardConfig ? {
        ...layout,
        metadata: {
          ...(layout as any).metadata,
          ...wizardConfig,
        },
      } : layout;

      // Check size before sending (warn if over 5MB)
      const jsonSize = JSON.stringify(layoutToSave).length;
      const sizeMB = jsonSize / (1024 * 1024);
      if (sizeMB > 5) {
        console.warn(`Canvas layout is ${sizeMB.toFixed(2)}MB. Consider using smaller images or fewer images.`);
      }

      await updateBulletin.mutateAsync({
        id: bulletinId,
        canvasLayoutJson: layoutToSave as any,
      });
    } catch (error) {
      // Error is handled by the mutation's onError callback
      console.error('Error saving canvas layout:', error);
      throw error; // Re-throw to let mutation handle it
    }
  };

  const handleCancel = () => {
    router.push(`/bulletins/${bulletinId}`);
  };

  const handleWizardComplete = (config: WizardConfig, layout?: BulletinCanvasLayout) => {
    setWizardConfig(config);
    if (layout) {
      setGeneratedLayout(layout);
    }
    setShowWizard(false);
  };

  const handleWizardCancel = () => {
    if (bulletin?.canvasLayoutJson) {
      // If we have an existing layout, just skip wizard
      setShowWizard(false);
    } else {
      // No layout exists, go back to bulletin detail
      router.push(`/bulletins/${bulletinId}`);
    }
  };

  // Determine if bulletin is locked
  const isLocked = bulletin?.status === 'locked';

  // Show wizard if needed
  if (showWizard === true) {
    return (
      <ProtectedPage requiredRoles={['admin', 'editor']}>
        <BulletinLayoutWizard
          bulletinId={bulletinId}
          currentLayout={bulletin?.canvasLayoutJson as unknown as BulletinCanvasLayout | null}
          churchName={org?.churchName || org?.legalName || 'Our Church'}
          givingUrl={org?.givingUrl ?? undefined}
          orgBranding={org ? {
            primaryColor: (org as any).primaryColor || undefined,
            accentColor: (org as any).accentColor || undefined,
            headingFont: (org as any).fontFamilyHeading || undefined,
            bodyFont: (org as any).fontFamilyBody || undefined,
          } : undefined}
          onComplete={handleWizardComplete}
          onCancel={handleWizardCancel}
        />
      </ProtectedPage>
    );
  }

  // Show editor (with initial layout from wizard if generated)
  return (
    <ProtectedPage requiredRoles={['admin', 'editor']}>
      {/* Canvas Warning Banner - Canvas is for special services only */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-3">
          <span className="text-2xl flex-shrink-0">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              Canvas Layout Mode (Special Services Only)
            </p>
            <p className="text-sm text-amber-700">
              Canvas layouts do <strong>not</strong> auto-update from service plan or announcements.
              Use this for Easter, Christmas, or other special occasions. For weekly bulletins,
              use the <a href={`/bulletins/${bulletinId}/generator`} className="underline hover:text-amber-900">Bulletin Generator</a> instead.
            </p>
          </div>
          <a
            href={`/bulletins/${bulletinId}`}
            className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 text-sm font-medium rounded transition-colors flex-shrink-0"
          >
            Back to Bulletin
          </a>
        </div>
      </div>
      {initialLayout ? (
        <BulletinCanvasEditor
          bulletinId={bulletinId}
          initialLayout={initialLayout}
          bulletinIssueId={bulletinId}
          onSave={handleSave}
          onCancel={handleCancel}
          isLocked={isLocked}
          orgSettings={org ? {
            defaultGridSize: org.bulletinDefaultCanvasGridSize,
            defaultShowGrid: org.bulletinDefaultCanvasShowGrid,
            aiEnabled: org.bulletinAiEnabled,
          } : undefined}
        />
      ) : (
        <div className="flex items-center justify-center h-screen">
          <p className="text-lg text-gray-600">Preparing canvas editor...</p>
        </div>
      )}
    </ProtectedPage>
  );
}
