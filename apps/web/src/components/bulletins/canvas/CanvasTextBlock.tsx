'use client';

import type { CanvasBlockRendererProps, TextBlockData } from './types';

/**
 * CanvasTextBlock
 *
 * Renders a text block with customizable styling.
 * Used for titles, headings, body text, labels, etc.
 */
export function CanvasTextBlock({ block, mode }: CanvasBlockRendererProps) {
  const data = (block.data || {}) as unknown as TextBlockData;
  const {
    content = 'Text Block',
    fontSize = 16,
    fontWeight = 'normal',
    textAlign = 'left',
    color = '#000000',
  } = data;

  const fontWeightMap = {
    normal: 400,
    semibold: 600,
    bold: 700,
  };

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{
        fontSize: `${fontSize}px`,
        fontWeight: fontWeightMap[fontWeight],
        textAlign,
        color,
        lineHeight: 1.4,
      }}
    >
      {mode === 'editor' && !content ? (
        <span className="text-gray-400 italic">Enter text...</span>
      ) : (
        <div className="whitespace-pre-wrap break-words">{content}</div>
      )}
    </div>
  );
}
