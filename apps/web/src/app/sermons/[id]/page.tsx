'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc/client';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { SermonForm } from '@/components/sermons/SermonForm';
import { SermonBuilder } from '@/components/sermons/SermonBuilder';
import { ProtectedPage } from '@/components/auth/ProtectedPage';
import { SermonHelperPanel, ManuscriptImportModal, GenerateDraftModal } from './_components';
import { Presentation, Printer, FileUp, Sparkles } from 'lucide-react';
import type { SermonPlanDraft } from '@elder-first/types';

export default function SermonDetailPage() {
  const params = useParams();
  const router = useRouter();
  const sermonId = params.id as string;
  const utils = trpc.useContext();

  const [isEditing, setIsEditing] = useState(false);
  const [isManuscriptModalOpen, setIsManuscriptModalOpen] = useState(false);
  const [isGenerateDraftModalOpen, setIsGenerateDraftModalOpen] = useState(false);

  const { data: sermon, isLoading, error } = trpc.sermons.get.useQuery({
    id: sermonId,
  });

  const updateSermon = trpc.sermons.update.useMutation({
    onSuccess: () => {
      utils.sermons.get.invalidate({ id: sermonId });
      utils.sermons.list.invalidate();
      setIsEditing(false);
    },
    onError: (error) => {
      alert(`Error updating sermon: ${error.message}`);
    },
  });

  const deleteSermon = trpc.sermons.delete.useMutation({
    onSuccess: () => {
      utils.sermons.list.invalidate();
      router.push('/sermons');
    },
    onError: (error) => {
      alert(`Error deleting sermon: ${error.message}`);
    },
  });

  const savePlan = trpc.sermonHelper.savePlan.useMutation({
    onSuccess: () => {
      utils.sermons.get.invalidate({ id: sermonId });
      utils.sermonHelper.getPlan.invalidate({ sermonId });
    },
    onError: (error) => {
      alert(`Error saving plan: ${error.message}`);
    },
  });

  const handleUpdate = async (data: any) => {
    await updateSermon.mutateAsync({
      id: sermonId,
      ...data,
    });
  };

  const handleDelete = async () => {
    if (confirm(`Archive "${sermon?.title}"? This can be undone from the archive view.`)) {
      await deleteSermon.mutateAsync({ id: sermonId });
    }
  };

  const handleManuscriptImport = async (draft: SermonPlanDraft) => {
    // Save the extracted draft as a new sermon plan
    await savePlan.mutateAsync({
      sermonId: draft.sermonId,
      title: draft.title || sermon?.title || 'Untitled',
      bigIdea: draft.bigIdea || '',
      primaryText: draft.primaryText || '',
      supportingTexts: draft.supportingTexts || [],
      elements: draft.elements || [],
      tags: draft.tags || [],
      notes: draft.notes,
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-lg">Loading sermon...</p>
      </div>
    );
  }

  if (error || !sermon) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card variant="outlined">
          <CardContent className="text-red-600">
            <p className="text-lg">Error loading sermon: {error?.message || 'Not found'}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <SermonForm
            initialData={{
              id: sermon.id,
              title: sermon.title,
              sermonDate: new Date(sermon.sermon_date).toISOString().split('T')[0],
              seriesId: sermon.series_id,
              preacher: sermon.preacher,
              primaryScripture: sermon.primary_scripture,
              additionalScripture: sermon.additional_scripture,
              manuscript: sermon.manuscript,
              audioUrl: sermon.audio_url,
              videoUrl: sermon.video_url,
              tags: sermon.tags,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <ProtectedPage requiredRoles={['admin', 'editor', 'submitter']}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">{sermon.title}</h1>
              <div className="flex items-center gap-3">
                <span className="px-4 py-2 bg-primary-100 text-primary-800 rounded-full text-base font-medium">
                  📅 {new Date(sermon.sermon_date).toLocaleDateString()}
                </span>
                {(sermon as any).series_title && (
                  <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-base font-medium">
                    📚 {(sermon as any).series_title}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button variant="secondary" onClick={() => router.push('/sermons')}>
                Back to List
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/sermons/${sermonId}/print`)}
                className="gap-2"
              >
                <Printer size={16} /> Print Outline
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push(`/sermons/${sermonId}/preach`)}
                className="gap-2"
              >
                <Presentation size={16} /> Preach Mode
              </Button>
              <Button variant="primary" size="lg" onClick={() => setIsEditing(true)}>
                Edit Sermon
              </Button>
            </div>
          </div>
        </div>

        {/* Sermon Builder Section */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4 text-primary-800">Sermon Builder</h2>
          <SermonBuilder
            sermonId={sermonId}
            sermon={{
              id: sermon.id,
              title: sermon.title,
              primary_scripture: sermon.primary_scripture,
              preacher: sermon.preacher,
              sermon_date: sermon.sermon_date,
              outline: (sermon as any).outline || null,
              path_stage: (sermon as any).path_stage || 'text_setup',
              status: (sermon as any).status || 'draft',
              series_title: (sermon as any).series_title,
            }}
            onUpdate={() => {
              utils.sermons.get.invalidate({ id: sermonId });
            }}
          />
        </div>

        {/* Manuscript Import Panel */}
        <Card variant="outlined" className="mb-6">
          <CardContent className="py-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileUp size={20} className="text-purple-600" />
                  Import from Manuscript
                  <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded">
                    Beta
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Have a sermon manuscript? AI can extract a structured outline for you.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsManuscriptModalOpen(true)}
                className="gap-2"
              >
                <FileUp size={16} />
                Import Manuscript
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Generate Preaching Draft Panel */}
        <Card variant="outlined" className="mb-6">
          <CardContent className="py-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles size={20} className="text-purple-600" />
                  Generate Preaching Draft
                  <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                    Phase 8
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Have a sermon plan? AI can generate a full preaching manuscript for you.
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => setIsGenerateDraftModalOpen(true)}
                className="gap-2"
              >
                <Sparkles size={16} />
                Generate Draft
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Sermon Helper Section - AI Suggestions, Hymn Finder, Outline Editor */}
        <div className="mb-6">
          <SermonHelperPanel
            sermonId={sermonId}
            sermonTitle={sermon.title}
            primaryScripture={sermon.primary_scripture}
          />
        </div>

        {/* Sermon Details */}
        <Card variant="elevated" className="mb-6">
          <CardHeader>
            <CardTitle>Sermon Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center gap-3">
              <span className="text-base font-semibold">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                (sermon as any).status === 'ready' ? 'bg-green-100 text-green-800' :
                (sermon as any).status === 'preached' ? 'bg-blue-100 text-blue-800' :
                (sermon as any).status === 'idea' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {(sermon as any).status === 'ready' ? 'Ready for Sunday' :
                 (sermon as any).status === 'preached' ? 'Preached' :
                 (sermon as any).status === 'idea' ? 'Idea' : 'Draft'}
              </span>
            </div>

            {/* Preacher */}
            {sermon.preacher && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Preacher</h3>
                <p className="text-base text-gray-700">{sermon.preacher}</p>
              </div>
            )}

            {/* Primary Scripture */}
            {sermon.primary_scripture && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Primary Scripture</h3>
                <p className="text-base text-gray-700">{sermon.primary_scripture}</p>
              </div>
            )}

            {/* Additional Scripture */}
            {sermon.additional_scripture && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Additional Scripture</h3>
                <p className="text-base text-gray-700 whitespace-pre-wrap">
                  {sermon.additional_scripture}
                </p>
              </div>
            )}

            {/* Manuscript */}
            {sermon.manuscript && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Manuscript</h3>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-base text-gray-700 whitespace-pre-wrap">
                    {sermon.manuscript}
                  </p>
                </div>
              </div>
            )}

            {/* Media Links */}
            {(sermon.audio_url || sermon.video_url) && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Media</h3>
                <div className="space-y-2">
                  {sermon.audio_url && (
                    <div className="flex items-center gap-2">
                      <span className="text-base font-medium">Audio:</span>
                      <a
                        href={sermon.audio_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        {sermon.audio_url}
                      </a>
                    </div>
                  )}
                  {sermon.video_url && (
                    <div className="flex items-center gap-2">
                      <span className="text-base font-medium">Video:</span>
                      <a
                        href={sermon.video_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:underline"
                      >
                        {sermon.video_url}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tags */}
            {sermon.tags && sermon.tags.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {sermon.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Created:</span>{' '}
                  {new Date(sermon.created_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span>{' '}
                  {new Date(sermon.updated_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Archive Sermon */}
        <Card variant="outlined">
          <CardContent className="py-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold mb-1 text-red-600">Archive Sermon</h3>
                <p className="text-base text-gray-600">
                  Archived sermons can be restored later if needed.
                </p>
              </div>
              <Button
                variant="danger"
                size="lg"
                onClick={handleDelete}
                disabled={deleteSermon.isLoading}
              >
                {deleteSermon.isLoading ? 'Archiving...' : 'Archive Sermon'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manuscript Import Modal */}
      <ManuscriptImportModal
        isOpen={isManuscriptModalOpen}
        onClose={() => setIsManuscriptModalOpen(false)}
        sermonId={sermonId}
        sermonTitle={sermon.title}
        onImport={handleManuscriptImport}
      />

      {/* Generate Draft Modal */}
      <GenerateDraftModal
        isOpen={isGenerateDraftModalOpen}
        onClose={() => setIsGenerateDraftModalOpen(false)}
        sermonId={sermonId}
        sermonTitle={sermon.title}
      />
    </ProtectedPage>
  );
}
