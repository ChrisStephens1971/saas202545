'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { SermonForm } from '@/components/sermons/SermonForm';
import { TemplateSelector } from '@/components/sermons/TemplateSelector';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import type { SermonTemplate } from '@elder-first/types';

export default function NewSermonPage() {
  const router = useRouter();
  const utils = trpc.useContext();
  const [selectedTemplate, setSelectedTemplate] = useState<SermonTemplate | null>(null);
  const [formKey, setFormKey] = useState(0); // Key to force form re-render on template change

  const createSermon = trpc.sermons.create.useMutation({
    onError: (error) => {
      alert(`Error creating sermon: ${error.message}`);
    },
  });

  const savePlan = trpc.sermonHelper.savePlan.useMutation({
    onError: (error) => {
      console.error('Failed to apply template:', error.message);
    },
  });

  const handleSubmit = async (data: any) => {
    // Create the sermon first
    const sermon = await createSermon.mutateAsync(data);

    // If a template was selected, apply the template structure as a sermon plan
    if (selectedTemplate) {
      try {
        await savePlan.mutateAsync({
          sermonId: sermon.id,
          title: data.title,
          bigIdea: selectedTemplate.defaultBigIdea || '',
          primaryText: data.primaryScripture || selectedTemplate.defaultPrimaryText || '',
          supportingTexts: selectedTemplate.defaultSupportingTexts || [],
          elements: selectedTemplate.structure || [],
          tags: selectedTemplate.tags || [],
        });
      } catch (error) {
        // Log but don't block - sermon was created successfully
        console.error('Template structure was not applied:', error);
      }
    }

    // Invalidate and navigate
    utils.sermons.list.invalidate();
    router.push(`/sermons/${sermon.id}`);
  };

  const handleCancel = () => {
    router.push('/sermons');
  };

  // Handle template selection - update form with template defaults
  const handleTemplateSelect = useCallback((template: SermonTemplate | null) => {
    setSelectedTemplate(template);
    // Force form re-render to apply new initial values
    setFormKey((prev) => prev + 1);
  }, []);

  // Build initial data from template
  const initialData = selectedTemplate
    ? {
        title: selectedTemplate.defaultTitle || '',
        sermonDate: '',
        primaryScripture: selectedTemplate.defaultPrimaryText || null,
        tags: selectedTemplate.tags || null,
      }
    : undefined;

  return (
    <ProtectedPage requiredRoles={['admin', 'editor', 'submitter']}>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Template Selector */}
          <TemplateSelector
            onSelect={handleTemplateSelect}
            selectedTemplateId={selectedTemplate?.id}
          />

          {/* Sermon Form */}
          <SermonForm
            key={formKey}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>
      </div>
    </ProtectedPage>
  );
}
