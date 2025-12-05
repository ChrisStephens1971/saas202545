'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Sparkles, Music, FileText, Wand2 } from 'lucide-react';
import { SermonHelperOutline } from './SermonHelperOutline';
import { SermonHelperAISuggestions } from './SermonHelperAISuggestions';
import { SermonHelperHymnFinder } from './SermonHelperHymnFinder';
import type { SermonElement } from '@elder-first/types';

interface SermonHelperPanelProps {
  sermonId: string;
  sermonTitle: string;
  primaryScripture: string | null;
}

type TabKey = 'ai' | 'hymns' | 'outline';

interface Tab {
  key: TabKey;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { key: 'ai', label: 'AI Suggestions', icon: <Sparkles size={16} /> },
  { key: 'hymns', label: 'Hymn Finder', icon: <Music size={16} /> },
  { key: 'outline', label: 'Outline Editor', icon: <FileText size={16} /> },
];

export function SermonHelperPanel({
  sermonId,
  sermonTitle,
  primaryScripture,
}: SermonHelperPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('ai');
  const [elements, setElements] = useState<SermonElement[]>([]);

  // Add element to outline (used by AI Suggestions and Hymn Finder)
  const handleAddToOutline = useCallback((element: SermonElement) => {
    setElements((prev) => [...prev, element]);
    // Optionally switch to outline tab to show the new element
    // setActiveTab('outline');
  }, []);

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 size={24} className="text-purple-600" />
          Sermon Helper
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Tab Navigation */}
        <div className="flex border-b mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.key === 'outline' && elements.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                  {elements.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[300px]">
          {activeTab === 'ai' && (
            <SermonHelperAISuggestions
              sermonId={sermonId}
              sermonTitle={sermonTitle}
              primaryScripture={primaryScripture}
              onAddToOutline={handleAddToOutline}
            />
          )}

          {activeTab === 'hymns' && (
            <SermonHelperHymnFinder onAddToOutline={handleAddToOutline} />
          )}

          {activeTab === 'outline' && (
            <SermonHelperOutline
              elements={elements}
              onElementsChange={setElements}
              sermonTitle={sermonTitle}
            />
          )}
        </div>

        {/* Helpful hint for outline tab */}
        {activeTab !== 'outline' && elements.length > 0 && (
          <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-700">
            <span className="font-medium">{elements.length} item{elements.length === 1 ? '' : 's'}</span> in your outline.
            Switch to the <button onClick={() => setActiveTab('outline')} className="underline font-medium">Outline Editor</button> to view and edit.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
