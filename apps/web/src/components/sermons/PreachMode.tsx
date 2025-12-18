'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/Button';
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Moon,
  Sun,
  X,
  Play,
  Pause,
  RotateCcw,
  Maximize,
  Minimize,
  Settings,
  FileText,
  BookOpen,
  Lightbulb,
  StickyNote,
  Music,
  Heading1,
  CircleDot,
} from 'lucide-react';
import { getEffectiveBlockType } from '@elder-first/types';
import type { SermonBlockType, SermonOutlinePoint, SermonPlan, SermonElement } from '@elder-first/types';
import {
  buildPreachModeBlocks,
  PREACH_MODE_STYLES,
  ELEMENT_COLORS,
  getElementDisplayText,
  getElementNote,
  getElementTypeLabel,
  type PreachModeBlock,
} from '@/lib/sermonPlanRenderer';

interface PreachModeProps {
  sermon: any; // Using any for now to avoid strict type issues during dev, will refine
  onExit: () => void;
  plan?: SermonPlan | null; // Phase 9: Optional SermonPlan for structured navigation
}

// Block type styling configuration for PreachMode
const BLOCK_STYLES: Record<SermonBlockType, {
  labelClass: string;
  contentClass: string;
  icon: React.ReactNode;
  dividerClass: string;
}> = {
  POINT: {
    labelClass: 'font-bold text-[1.2em]',
    contentClass: '',
    icon: <FileText size={20} />,
    dividerClass: 'border-t-2 border-current opacity-20 mt-4 mb-2',
  },
  SCRIPTURE: {
    labelClass: 'font-semibold italic text-[1.1em]',
    contentClass: 'italic',
    icon: <BookOpen size={20} />,
    dividerClass: 'border-t border-current opacity-10 mt-2 mb-2',
  },
  ILLUSTRATION: {
    labelClass: 'font-medium text-[1em]',
    contentClass: 'text-[0.95em]',
    icon: <Lightbulb size={20} />,
    dividerClass: 'border-t border-dashed border-current opacity-10 mt-2 mb-2',
  },
  NOTE: {
    labelClass: 'font-normal text-[0.9em] opacity-80',
    contentClass: 'text-[0.85em] opacity-80',
    icon: <StickyNote size={20} />,
    dividerClass: '',
  },
};

// Icon component mapping for SermonElement types
const ELEMENT_ICONS: Record<SermonElement['type'], React.ReactNode> = {
  section: <Heading1 size={20} />,
  point: <CircleDot size={20} />,
  note: <StickyNote size={20} />,
  scripture: <BookOpen size={20} />,
  hymn: <Music size={20} />,
  illustration: <Lightbulb size={20} />,
};

export function PreachMode({ sermon, onExit, plan }: PreachModeProps) {
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [fontSize, setFontSize] = useState(24);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Timer state
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [targetMinutes, setTargetMinutes] = useState<number | null>(null);

  // Phase 9: Use SermonPlan if available, otherwise fall back to legacy mainPoints
  // Priority: SermonPlan > legacy mainPoints > fallback
  const hasSermonPlan = plan && plan.elements && plan.elements.length > 0;
  const hasMainPoints = !hasSermonPlan && sermon.outline?.mainPoints && sermon.outline.mainPoints.length > 0;

  // Build blocks based on available data source
  const blocks: PreachModeBlock[] | Array<{
    type: 'header' | 'point' | 'conclusion' | 'fallback';
    content: any;
    blockType?: SermonBlockType;
  }> = hasSermonPlan
    ? buildPreachModeBlocks(sermon, plan)
    : hasMainPoints
    ? [
        { type: 'header' as const, content: { title: sermon.title, scripture: sermon.primary_scripture } },
        ...(sermon.outline?.mainPoints?.map((p: SermonOutlinePoint) => ({
          type: 'point' as const,
          content: p,
          blockType: getEffectiveBlockType(p.type),
        })) || []),
        { type: 'conclusion' as const, content: { text: sermon.outline?.callToAction || 'Conclusion' } }
      ]
    : [
        // Fallback: simple scrolling mode with manuscript or combined content
        { type: 'fallback' as const, content: {
          title: sermon.title,
          scripture: sermon.primary_scripture,
          manuscript: sermon.manuscript,
          bigIdea: sermon.outline?.bigIdea,
          application: sermon.outline?.application,
          callToAction: sermon.outline?.callToAction,
        }}
      ];

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate overtime
  const targetSeconds = targetMinutes ? targetMinutes * 60 : null;
  const isOvertime = targetSeconds !== null && elapsedSeconds > targetSeconds;
  const overtimeSeconds = isOvertime ? elapsedSeconds - targetSeconds : 0;

  // Navigation handlers
  const goNext = useCallback(() => {
    if (currentBlockIndex < blocks.length - 1) {
      setCurrentBlockIndex(c => c + 1);
    }
  }, [currentBlockIndex, blocks.length]);

  const goPrev = useCallback(() => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex(c => c - 1);
    }
  }, [currentBlockIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't capture when settings modal is open and user is typing
    if (showSettings && (e.target as HTMLElement)?.tagName === 'INPUT') return;

    if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
      e.preventDefault();
      goNext();
    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      goPrev();
    } else if (e.key === 'Escape') {
      if (showSettings) {
        setShowSettings(false);
      } else if (isFullscreen) {
        document.exitFullscreen();
      } else {
        onExit();
      }
    } else if (e.key === 'f' || e.key === 'F') {
      toggleFullscreen();
    }
  }, [goNext, goPrev, onExit, showSettings, isFullscreen]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Tap zone click handler
  const handleTapZoneClick = (zone: 'left' | 'right') => {
    if (zone === 'left') {
      goPrev();
    } else {
      goNext();
    }
  };

  const currentBlock = blocks[currentBlockIndex];

  // Get block type styling
  const getBlockStyle = (blockType: SermonBlockType) => BLOCK_STYLES[blockType] || BLOCK_STYLES.POINT;

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 flex flex-col ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-white text-gray-900'} transition-colors duration-300`}
    >
      {/* Top Bar */}
      <div className="flex justify-between items-center p-3 md:p-4 border-b border-gray-700/20 relative z-20">
        <div className="flex items-center gap-2 md:gap-4">
          <Button variant="outline" size="sm" onClick={onExit} className="gap-1 md:gap-2">
            <X size={18} /> <span className="hidden md:inline">Exit</span>
          </Button>

          {/* Timer */}
          <div className={`flex items-center gap-2 rounded-lg px-3 py-1.5 ${
            isOvertime
              ? 'bg-red-500/20 text-red-400'
              : isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'
          }`}>
            <Clock size={16} />
            <span className="font-mono text-lg md:text-xl font-bold">
              {formatTime(elapsedSeconds)}
            </span>
            {isOvertime && (
              <span className="text-xs font-medium text-red-400">
                +{formatTime(overtimeSeconds)}
              </span>
            )}
            <button onClick={() => setTimerRunning(!timerRunning)} className="p-1 hover:text-primary-500">
              {timerRunning ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button onClick={() => { setTimerRunning(false); setElapsedSeconds(0); }} className="p-1 hover:text-red-500">
              <RotateCcw size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          {/* Font Size */}
          <div className="hidden md:flex items-center gap-1">
            <button onClick={() => setFontSize(s => Math.max(16, s - 2))} className="p-2 font-bold text-sm">A-</button>
            <span className="text-xs text-gray-500 w-8 text-center">{fontSize}</span>
            <button onClick={() => setFontSize(s => Math.min(64, s + 2))} className="p-2 font-bold text-lg">A+</button>
          </div>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-full transition-colors ${showSettings ? 'bg-primary-500 text-white' : 'hover:bg-gray-700/20'}`}
          >
            <Settings size={20} />
          </button>

          {/* Dark Mode Toggle */}
          <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-gray-700/20">
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Fullscreen Toggle */}
          <button onClick={toggleFullscreen} className="p-2 rounded-full hover:bg-gray-700/20">
            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
          </button>
        </div>
      </div>

      {/* Settings Dropdown */}
      {showSettings && (
        <div className={`absolute top-16 right-4 z-30 p-4 rounded-lg shadow-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white border'}`}>
          <div className="space-y-4 min-w-[200px]">
            <div>
              <label className="block text-sm font-medium mb-2">Target Time (minutes)</label>
              <input
                type="number"
                min="1"
                max="120"
                value={targetMinutes ?? ''}
                onChange={(e) => setTargetMinutes(e.target.value ? parseInt(e.target.value) : null)}
                placeholder="e.g., 30"
                className={`w-full px-3 py-2 rounded border ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
              />
              <p className="text-xs text-gray-500 mt-1">Timer turns red when overtime</p>
            </div>
            <div className="md:hidden">
              <label className="block text-sm font-medium mb-2">Font Size</label>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFontSize(s => Math.max(16, s - 4))}
                  className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700"
                >
                  A-
                </button>
                <span className="flex-1 text-center">{fontSize}px</span>
                <button
                  onClick={() => setFontSize(s => Math.min(64, s + 4))}
                  className="px-3 py-1 rounded bg-gray-200 dark:bg-gray-700"
                >
                  A+
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area with Tap Zones */}
      <div className="flex-1 relative overflow-hidden">
        {/* Left Tap Zone - Previous */}
        <div
          onClick={() => handleTapZoneClick('left')}
          className={`absolute left-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer transition-colors active:bg-gray-500/10 ${
            currentBlockIndex === 0 ? 'pointer-events-none' : ''
          }`}
          aria-label="Previous"
        />

        {/* Right Tap Zone - Next */}
        <div
          onClick={() => handleTapZoneClick('right')}
          className={`absolute right-0 top-0 bottom-0 w-1/3 z-10 cursor-pointer transition-colors active:bg-gray-500/10 ${
            currentBlockIndex === blocks.length - 1 ? 'pointer-events-none' : ''
          }`}
          aria-label="Next"
        />

        {/* Content (centered, not affected by tap zones) */}
        <div className="absolute inset-0 overflow-y-auto p-6 md:p-12 lg:p-16 flex flex-col items-center justify-center">
          <div style={{ fontSize: `${fontSize}px`, lineHeight: 1.6 }} className="max-w-4xl w-full">

            {currentBlock.type === 'header' && (
              <div className="space-y-6 text-center">
                <h1 className="font-bold text-[1.5em] leading-tight">{currentBlock.content.title}</h1>
                {currentBlock.content.scripture && (
                  <p className="text-[0.8em] opacity-70 font-mono">{currentBlock.content.scripture}</p>
                )}
                {/* Phase 9: Show bigIdea if available from SermonPlan */}
                {currentBlock.content.bigIdea && (
                  <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-purple-900/30' : 'bg-purple-50'}`}>
                    <p className="text-[0.85em] italic">{currentBlock.content.bigIdea}</p>
                  </div>
                )}
              </div>
            )}

            {/* Phase 9: SermonPlan element rendering */}
            {currentBlock.type === 'element' && (() => {
              const block = currentBlock as PreachModeBlock & { type: 'element' };
              const element = block.element;
              const elementStyle = PREACH_MODE_STYLES[element.type];
              const colorClass = isDarkMode
                ? ELEMENT_COLORS[element.type].dark
                : ELEMENT_COLORS[element.type].light;

              return (
                <div className={`space-y-4 ${elementStyle.containerClass}`}>
                  {elementStyle.dividerClass && <div className={elementStyle.dividerClass} />}

                  {/* Element Type Badge */}
                  <div className="flex items-center gap-2 opacity-60 text-[0.5em]">
                    {ELEMENT_ICONS[element.type]}
                    <span className="uppercase tracking-wider">{getElementTypeLabel(element.type)}</span>
                  </div>

                  {/* Main Content */}
                  <h2 className={`${elementStyle.labelClass} ${colorClass}`}>
                    {getElementDisplayText(element)}
                  </h2>

                  {/* Additional note if present */}
                  {getElementNote(element) && (
                    <div className={`mt-4 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'} text-[0.75em] opacity-80`}>
                      <p className="whitespace-pre-wrap">{getElementNote(element)}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {currentBlock.type === 'point' && (() => {
              const blockType = (currentBlock as any).blockType as SermonBlockType;
              const style = getBlockStyle(blockType);
              const content = currentBlock.content as SermonOutlinePoint;

              return (
                <div className="space-y-4 text-left">
                  {style.dividerClass && <div className={style.dividerClass} />}

                  {/* Block Type Badge */}
                  <div className="flex items-center gap-2 opacity-60 text-[0.5em]">
                    {style.icon}
                    <span className="uppercase tracking-wider">{blockType}</span>
                  </div>

                  {/* Label */}
                  <h2 className={`${style.labelClass} ${
                    blockType === 'POINT' ? (isDarkMode ? 'text-blue-400' : 'text-blue-600') :
                    blockType === 'SCRIPTURE' ? (isDarkMode ? 'text-amber-400' : 'text-amber-700') :
                    blockType === 'ILLUSTRATION' ? (isDarkMode ? 'text-green-400' : 'text-green-700') :
                    'opacity-80'
                  }`}>
                    {content.label}
                  </h2>

                  {/* Scripture Reference */}
                  {content.scriptureRef && (
                    <p className="text-[0.7em] font-mono opacity-60">
                      📖 {content.scriptureRef}
                    </p>
                  )}

                  {/* Summary/Content */}
                  {content.summary && (
                    <div className={`mt-4 ${style.contentClass}`}>
                      <p className="whitespace-pre-wrap">{content.summary}</p>
                    </div>
                  )}

                  {/* Notes */}
                  {content.notes && (
                    <div className={`mt-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100'} text-[0.75em] opacity-80`}>
                      <p className="whitespace-pre-wrap">{content.notes}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            {currentBlock.type === 'conclusion' && (
              <div className="space-y-6 text-center">
                <div className="border-t-2 border-current opacity-20 mb-4" />
                <h2 className={`font-bold text-[1.2em] ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>
                  Conclusion
                </h2>
                {/* Phase 9: Show notes from SermonPlan or legacy text */}
                {(currentBlock.content.notes || currentBlock.content.text) && (
                  <p className="text-[0.9em]">{currentBlock.content.notes || currentBlock.content.text}</p>
                )}
              </div>
            )}

            {/* Fallback mode when no mainPoints exist */}
            {currentBlock.type === 'fallback' && (
              <div className="space-y-8 text-left">
                <div className="text-center mb-8">
                  <h1 className="font-bold text-[1.4em]">{currentBlock.content.title}</h1>
                  {currentBlock.content.scripture && (
                    <p className="text-[0.8em] opacity-70 mt-2">{currentBlock.content.scripture}</p>
                  )}
                </div>

                {currentBlock.content.bigIdea && (
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
                    <p className="font-semibold text-[0.9em]">Big Idea:</p>
                    <p className="mt-1">{currentBlock.content.bigIdea}</p>
                  </div>
                )}

                {currentBlock.content.manuscript && (
                  <div className="text-[0.85em] whitespace-pre-wrap leading-relaxed">
                    {currentBlock.content.manuscript}
                  </div>
                )}

                {currentBlock.content.application && (
                  <div className="border-t pt-4 mt-4">
                    <p className="font-semibold text-[0.9em]">Application:</p>
                    <p className="mt-1">{currentBlock.content.application}</p>
                  </div>
                )}

                {currentBlock.content.callToAction && (
                  <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-green-900/30' : 'bg-green-50'}`}>
                    <p className="font-semibold text-[0.9em]">Call to Action:</p>
                    <p className="mt-1">{currentBlock.content.callToAction}</p>
                  </div>
                )}

                <p className="text-center text-[0.7em] opacity-50 mt-8">
                  (No structured outline - showing full content)
                </p>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className={`p-3 md:p-4 border-t border-gray-700/20 flex justify-between items-center relative z-20 ${isDarkMode ? 'bg-gray-900/90' : 'bg-white/90'}`}>
        <Button
          variant="outline"
          onClick={goPrev}
          disabled={currentBlockIndex === 0}
          className="w-24 md:w-32"
        >
          <ChevronLeft className="mr-1 md:mr-2" size={18} /> <span className="hidden md:inline">Prev</span>
        </Button>

        <div className="text-sm opacity-50 flex flex-col items-center">
          <span>{currentBlockIndex + 1} / {blocks.length}</span>
          {/* Phase 9: Show element type for SermonPlan elements */}
          {hasSermonPlan && currentBlock.type === 'element' && (
            <span className="text-xs opacity-70 uppercase">
              {getElementTypeLabel((currentBlock as PreachModeBlock & { type: 'element' }).element.type)}
            </span>
          )}
          {hasMainPoints && currentBlock.type === 'point' && (
            <span className="text-xs opacity-70 uppercase">
              {(currentBlock as any).blockType}
            </span>
          )}
        </div>

        <Button
          variant="primary"
          onClick={goNext}
          disabled={currentBlockIndex === blocks.length - 1}
          className="w-24 md:w-32"
        >
          <span className="hidden md:inline">Next</span> <ChevronRight className="ml-1 md:ml-2" size={18} />
        </Button>
      </div>
    </div>
  );
}
