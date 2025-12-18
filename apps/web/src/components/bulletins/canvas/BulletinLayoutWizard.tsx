'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import type { BulletinCanvasLayout, BulletinCanvasBlock } from '@elder-first/types';

// Wizard configuration types
export interface WizardConfig {
  layoutStyle: 'simple' | 'photoHeader' | 'sidebar';
  pageCount: 2 | 4;
  sectionsEnabled: {
    orderOfWorship: boolean;
    sermonInfo: boolean;
    announcements: boolean;
    events: boolean;
    givingInfo: boolean;
    contactInfo: boolean;
  };
  sectionPageMap: Record<string, number>;
  branding?: {
    primaryColor?: string;
    accentColor?: string;
    headingFont?: string;
    bodyFont?: string;
  };
}

interface BulletinLayoutWizardProps {
  bulletinId: string;
  currentLayout?: BulletinCanvasLayout | null;
  churchName: string;
  givingUrl?: string;
  orgBranding?: {
    primaryColor?: string;
    accentColor?: string;
    headingFont?: string;
    bodyFont?: string;
  };
  onComplete: (config: WizardConfig, generatedLayout?: BulletinCanvasLayout) => void;
  onCancel: () => void;
}

export function BulletinLayoutWizard({
  bulletinId,
  currentLayout,
  churchName,
  givingUrl,
  orgBranding,
  onComplete,
  onCancel,
}: BulletinLayoutWizardProps) {
  // Wizard state
  const [currentStep, setCurrentStep] = useState(1);
  const [config, setConfig] = useState<WizardConfig>(() => {
    // Initialize from existing layout metadata if available
    const metadata = (currentLayout as any)?.metadata || {};
    return {
      layoutStyle: metadata.layoutStyle || 'simple',
      pageCount: currentLayout?.pages?.length as (2 | 4) || 4,
      sectionsEnabled: metadata.sectionsEnabled || {
        orderOfWorship: true,
        sermonInfo: true,
        announcements: true,
        events: true,
        givingInfo: true,
        contactInfo: true,
      },
      sectionPageMap: metadata.sectionPageMap || {
        cover: 1,
        orderOfWorship: 2,
        sermonInfo: 2,
        announcements: 3,
        events: 4,
        givingInfo: 4,
        contactInfo: 4,
      },
      branding: metadata.branding || orgBranding || {
        primaryColor: '#3B82F6',
        accentColor: '#1E40AF',
        headingFont: 'system',
        bodyFont: 'system',
      },
    };
  });

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete wizard
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    // Generate layout if needed
    if (!currentLayout) {
      const generatedLayout = generateLayout(config, churchName, givingUrl);
      onComplete(config, generatedLayout);
    } else {
      // Update existing layout metadata
      onComplete(config);
    }
  };

  const updateConfig = (updates: Partial<WizardConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const generateLayout = (config: WizardConfig, churchName: string, givingUrl?: string): BulletinCanvasLayout => {
    const pages: BulletinCanvasLayout['pages'] = [];
    const pageCount = config.pageCount;

    // Create pages
    for (let i = 1; i <= pageCount; i++) {
      pages.push({
        id: crypto.randomUUID(),
        pageNumber: i,
        blocks: [],
      });
    }

    // Helper to add block to specific page
    const addBlock = (pageNum: number, block: Omit<BulletinCanvasBlock, 'id'>) => {
      const page = pages.find(p => p.pageNumber === pageNum);
      if (page) {
        page.blocks.push({
          ...block,
          id: crypto.randomUUID(),
        } as BulletinCanvasBlock);
      }
    };

    // Page 1 - Front Cover
    addBlock(1, {
      type: 'text',
      x: 50,
      y: 100,
      width: 716,
      height: 120,
      zIndex: 1,
      data: {
        content: churchName,
        fontSize: 48,
        fontWeight: 'bold',
        textAlign: 'center',
        color: config.branding?.primaryColor || '#3B82F6',
      },
    });

    addBlock(1, {
      type: 'text',
      x: 50,
      y: 250,
      width: 716,
      height: 80,
      zIndex: 2,
      data: {
        content: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
        fontSize: 24,
        textAlign: 'center',
        color: '#666666',
      },
    });

    if (config.layoutStyle === 'photoHeader') {
      addBlock(1, {
        type: 'image',
        x: 108,
        y: 400,
        width: 600,
        height: 400,
        zIndex: 0,
        data: {
          imageUrl: '',
          alt: 'Church Image',
          objectFit: 'cover',
        },
      });
    }

    // Add sections based on configuration
    const sectionGenerators: Record<string, () => Omit<BulletinCanvasBlock, 'id'>> = {
      orderOfWorship: () => ({
        type: 'serviceItems',
        x: 50,
        y: 50,
        width: 716,
        height: 800,
        zIndex: 1,
        data: {
          bulletinIssueId: bulletinId,
          maxItems: 20,
          showCcli: true,
        },
      }),
      sermonInfo: () => ({
        type: 'text',
        x: 50,
        y: 50,
        width: 716,
        height: 150,
        zIndex: 1,
        data: {
          content: 'Sermon Title\nSpeaker Name',
          fontSize: 20,
          fontWeight: 'bold',
          textAlign: 'left',
        },
      }),
      announcements: () => ({
        type: 'announcements',
        x: 50,
        y: 250,
        width: 716,
        height: 400,
        zIndex: 1,
        data: {
          maxItems: 5,
          category: null,
          priorityFilter: null,
        },
      }),
      events: () => ({
        type: 'events',
        x: 50,
        y: 50,
        width: 716,
        height: 300,
        zIndex: 1,
        data: {
          maxItems: 5,
          dateRange: 'month',
        },
      }),
      givingInfo: () => ({
        type: 'giving',
        x: 50,
        y: 400,
        width: 350,
        height: 250,
        zIndex: 1,
        data: {
          displayType: 'both',
          givingUrl: givingUrl || 'https://example.com/give',
        },
      }),
      contactInfo: () => ({
        type: 'contactInfo',
        x: 416,
        y: 400,
        width: 350,
        height: 250,
        zIndex: 1,
        data: {
          showAddress: true,
          showPhone: true,
          showEmail: true,
          showWebsite: true,
        },
      }),
    };

    // Add enabled sections to their assigned pages
    Object.entries(config.sectionsEnabled).forEach(([section, enabled]) => {
      if (enabled && config.sectionPageMap[section]) {
        const pageNum = config.sectionPageMap[section];
        const generator = sectionGenerators[section];
        if (generator) {
          addBlock(pageNum, generator());
        }
      }
    });

    return {
      pages,
      metadata: config as any,
    } as BulletinCanvasLayout;
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Card variant="elevated">
        <CardHeader>
          <CardTitle>Bulletin Layout Setup</CardTitle>
          <CardDescription>
            Let&apos;s set up your bulletin layout. Step {currentStep} of 4
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              {[1, 2, 3, 4].map((step) => (
                <div
                  key={step}
                  className={`flex-1 ${step < 4 ? 'mr-2' : ''}`}
                >
                  <div className="relative">
                    <div
                      className={`h-2 rounded-full ${
                        step <= currentStep ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    />
                    <div
                      className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        step === currentStep
                          ? 'bg-blue-600 text-white'
                          : step < currentStep
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {step}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-xs text-gray-600">Layout Style</span>
              <span className="text-xs text-gray-600">Content</span>
              <span className="text-xs text-gray-600">Pages</span>
              <span className="text-xs text-gray-600">Branding</span>
            </div>
          </div>

          {/* Step content */}
          {currentStep === 1 && (
            <Step1LayoutStyle
              config={config}
              updateConfig={updateConfig}
              hasExistingLayout={!!currentLayout}
            />
          )}

          {currentStep === 2 && (
            <Step2ConnectContent
              config={config}
              updateConfig={updateConfig}
            />
          )}

          {currentStep === 3 && (
            <Step3PageAssignment
              config={config}
              updateConfig={updateConfig}
            />
          )}

          {currentStep === 4 && (
            <Step4Branding
              config={config}
              updateConfig={updateConfig}
              orgBranding={orgBranding}
            />
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8">
            <div>
              {currentStep > 1 && (
                <Button
                  variant="secondary"
                  onClick={handlePrevious}
                >
                  Previous
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={onCancel}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleNext}
              >
                {currentStep === 4 ? 'Complete Setup' : 'Next'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Step 1: Layout Style
function Step1LayoutStyle({ config, updateConfig, hasExistingLayout }: any) {
  const layoutStyles = [
    { value: 'simple', label: 'Simple', description: 'Clean single-column layout', icon: '📄' },
    { value: 'photoHeader', label: 'Photo Header', description: 'Large header image', icon: '🖼️' },
    { value: 'sidebar', label: 'Sidebar', description: 'Two-column with sidebar', icon: '📑' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Choose Layout Style</h3>
        <div className="grid grid-cols-3 gap-4">
          {layoutStyles.map((style) => (
            <button
              key={style.value}
              onClick={() => updateConfig({ layoutStyle: style.value })}
              className={`p-4 border-2 rounded-lg text-center transition-colors ${
                config.layoutStyle === style.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="text-3xl mb-2">{style.icon}</div>
              <div className="font-medium">{style.label}</div>
              <div className="text-sm text-gray-600 mt-1">{style.description}</div>
            </button>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-4">Page Count</h3>
        <div className="flex gap-4">
          <button
            onClick={() => updateConfig({ pageCount: 4 })}
            className={`flex-1 p-4 border-2 rounded-lg ${
              config.pageCount === 4
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium">4-Page Booklet</div>
            <div className="text-sm text-gray-600">Standard folded bulletin</div>
          </button>
          <button
            onClick={() => updateConfig({ pageCount: 2 })}
            className={`flex-1 p-4 border-2 rounded-lg ${
              config.pageCount === 2
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="font-medium">2 Pages</div>
            <div className="text-sm text-gray-600">Simple front/back</div>
          </button>
        </div>
      </div>

      {hasExistingLayout && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="flex items-start gap-2">
            <span className="text-amber-600">ℹ️</span>
            <div className="text-sm text-amber-800">
              This bulletin already has a layout. Your style choices will update the layout metadata
              but won&apos;t change manually positioned blocks.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Step 2: Connect Content
function Step2ConnectContent({ config, updateConfig }: any) {
  const sections = [
    { key: 'orderOfWorship', label: 'Order of Worship', icon: '📋' },
    { key: 'sermonInfo', label: 'Sermon Title & Speaker', icon: '🎤' },
    { key: 'announcements', label: 'Announcements', icon: '📢' },
    { key: 'events', label: 'Upcoming Events', icon: '📅' },
    { key: 'givingInfo', label: 'Giving Information', icon: '💝' },
    { key: 'contactInfo', label: 'Contact Information', icon: '📞' },
  ];

  const toggleSection = (key: string) => {
    updateConfig({
      sectionsEnabled: {
        ...config.sectionsEnabled,
        [key]: !config.sectionsEnabled[key],
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Select Content Sections</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose which sections to include in your bulletin. You can position them on specific pages in the next step.
        </p>
        <div className="space-y-2">
          {sections.map((section) => (
            <label
              key={section.key}
              className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={config.sectionsEnabled[section.key]}
                onChange={() => toggleSection(section.key)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <span className="text-2xl">{section.icon}</span>
              <span className="flex-1 font-medium">{section.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="text-sm text-blue-800">
          <strong>Tip:</strong> Content will be automatically pulled from your service plan,
          announcements, and events. The Canvas Editor will let you fine-tune positioning after setup.
        </div>
      </div>
    </div>
  );
}

// Step 3: Page Assignment
function Step3PageAssignment({ config, updateConfig }: any) {
  const pageLabels = config.pageCount === 4
    ? ['Page 1 – Front Cover', 'Page 2 – Inside Left', 'Page 3 – Inside Right', 'Page 4 – Back Cover']
    : ['Page 1 – Front', 'Page 2 – Back'];

  const sections = [
    { key: 'orderOfWorship', label: 'Order of Worship', enabled: config.sectionsEnabled.orderOfWorship },
    { key: 'sermonInfo', label: 'Sermon Info', enabled: config.sectionsEnabled.sermonInfo },
    { key: 'announcements', label: 'Announcements', enabled: config.sectionsEnabled.announcements },
    { key: 'events', label: 'Events', enabled: config.sectionsEnabled.events },
    { key: 'givingInfo', label: 'Giving Info', enabled: config.sectionsEnabled.givingInfo },
    { key: 'contactInfo', label: 'Contact Info', enabled: config.sectionsEnabled.contactInfo },
  ].filter(s => s.enabled);

  const updateSectionPage = (sectionKey: string, pageNum: number) => {
    updateConfig({
      sectionPageMap: {
        ...config.sectionPageMap,
        [sectionKey]: pageNum,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Assign Sections to Pages</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose which page each section should appear on. You can adjust exact positions in the Canvas Editor.
        </p>

        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.key} className="flex items-center gap-4">
              <span className="w-40 font-medium">{section.label}</span>
              <select
                value={config.sectionPageMap[section.key] || 1}
                onChange={(e) => updateSectionPage(section.key, Number(e.target.value))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              >
                {pageLabels.map((label, index) => (
                  <option key={index + 1} value={index + 1}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Suggested Layout:</h4>
        <div className="grid grid-cols-2 gap-4">
          {pageLabels.map((label, index) => {
            const pageNum = index + 1;
            const pageSections = sections.filter(
              s => config.sectionPageMap[s.key] === pageNum
            );
            return (
              <div key={pageNum} className="border rounded-lg p-3 bg-gray-50">
                <div className="font-medium text-sm mb-2">{label}</div>
                {pageSections.length > 0 ? (
                  <ul className="text-sm text-gray-600 space-y-1">
                    {pageSections.map(s => (
                      <li key={s.key}>• {s.label}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm text-gray-400">No sections assigned</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Step 4: Branding
function Step4Branding({ config, updateConfig, orgBranding }: any) {
  const fonts = [
    { value: 'system', label: 'System Default' },
    { value: 'serif', label: 'Serif (Georgia)' },
    { value: 'sans', label: 'Sans-Serif' },
  ];

  const updateBranding = (key: string, value: string) => {
    updateConfig({
      branding: {
        ...config.branding,
        [key]: value,
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Branding & Colors</h3>

        {orgBranding && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="text-sm text-gray-600">
              Using organization defaults. You can override these for this bulletin if needed.
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.branding?.primaryColor || '#3B82F6'}
                onChange={(e) => updateBranding('primaryColor', e.target.value)}
                className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={config.branding?.primaryColor || '#3B82F6'}
                onChange={(e) => updateBranding('primaryColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.branding?.accentColor || '#1E40AF'}
                onChange={(e) => updateBranding('accentColor', e.target.value)}
                className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={config.branding?.accentColor || '#1E40AF'}
                onChange={(e) => updateBranding('accentColor', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Heading Font
            </label>
            <select
              value={config.branding?.headingFont || 'system'}
              onChange={(e) => updateBranding('headingFont', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {fonts.map(font => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Body Font
            </label>
            <select
              value={config.branding?.bodyFont || 'system'}
              onChange={(e) => updateBranding('bodyFont', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              {fonts.map(font => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="border-t pt-4">
        <h4 className="font-medium mb-3">Summary</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <div>• Layout: <strong>{config.layoutStyle}</strong></div>
          <div>• Pages: <strong>{config.pageCount}</strong></div>
          <div>• Sections enabled: <strong>{Object.values(config.sectionsEnabled).filter(Boolean).length}</strong></div>
        </div>
      </div>
    </div>
  );
}