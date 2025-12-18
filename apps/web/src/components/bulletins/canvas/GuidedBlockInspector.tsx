'use client';

import { useState } from 'react';
import type { BulletinCanvasBlock } from '@elder-first/types';
import { ImageUploadButton } from './ImageUploadButton';
import { TextEditModal } from './TextEditModal';

interface GuidedBlockInspectorProps {
  block: BulletinCanvasBlock;
  onUpdate: (updates: Partial<BulletinCanvasBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  isLocked?: boolean;
  bulletinId: string;
  aiEnabled?: boolean;
}

/**
 * Guided Block Inspector with Basic/Advanced modes
 *
 * Provides a more user-friendly interface for non-technical users
 * while keeping advanced controls available for power users.
 */
export function GuidedBlockInspector({
  block,
  onUpdate,
  onDelete,
  onDuplicate,
  onBringToFront,
  onSendToBack,
  isLocked = false,
  bulletinId: _bulletinId,
  aiEnabled: _aiEnabled = false,
}: GuidedBlockInspectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [textEditOpen, setTextEditOpen] = useState(false);

  const data = (block.data || {}) as any;

  const updateData = (updates: any) => {
    onUpdate({
      data: { ...data, ...updates },
    });
  };

  // Helper functions for basic controls
  const getBlockWidth = () => {
    if (block.width <= 250) return 'third';
    if (block.width <= 400) return 'half';
    return 'full';
  };

  const setBlockWidth = (size: 'full' | 'half' | 'third') => {
    const widths = {
      full: 716,
      half: 350,
      third: 230,
    };
    onUpdate({ width: widths[size] });
  };

  const getBlockPosition = () => {
    const relativeY = block.y / 1056;
    if (relativeY < 0.33) return 'top';
    if (relativeY < 0.66) return 'middle';
    return 'bottom';
  };

  const setBlockPosition = (position: 'top' | 'middle' | 'bottom') => {
    const positions = {
      top: 50,
      middle: 400,
      bottom: 700,
    };
    onUpdate({ y: positions[position] });
  };

  const getBlockAlignment = () => {
    const centerX = 816 / 2;
    const blockCenter = block.x + block.width / 2;
    if (blockCenter < centerX - 100) return 'left';
    if (blockCenter > centerX + 100) return 'right';
    return 'center';
  };

  const setBlockAlignment = (alignment: 'left' | 'center' | 'right') => {
    const alignments = {
      left: 50,
      center: (816 - block.width) / 2,
      right: 816 - block.width - 50,
    };
    onUpdate({ x: alignments[alignment] });
  };

  const getImageSize = () => {
    if (block.width <= 150 && block.height <= 150) return 'small';
    if (block.width <= 300 && block.height <= 300) return 'medium';
    if (block.width <= 600) return 'large';
    return 'full-width';
  };

  const setImageSize = (size: 'small' | 'medium' | 'large' | 'full-width') => {
    const sizes = {
      small: { width: 150, height: 150 },
      medium: { width: 300, height: 300 },
      large: { width: 500, height: 400 },
      'full-width': { width: 716, height: 400 },
    };
    onUpdate(sizes[size]);
  };

  return (
    <div className="space-y-4">
      {/* Block Type Header */}
      <div className="pb-3 border-b">
        <div className="text-sm font-medium text-gray-900 capitalize">
          {block.type === 'serviceItems' && 'Order of Worship'}
          {block.type === 'announcements' && 'Announcements'}
          {block.type === 'events' && 'Events'}
          {block.type === 'giving' && 'Giving Info'}
          {block.type === 'contactInfo' && 'Contact Info'}
          {block.type === 'text' && 'Text Block'}
          {block.type === 'image' && 'Image'}
          {block.type === 'qr' && 'QR Code'}
        </div>
      </div>

      {/* Basic Controls - Always Visible */}
      <div className="space-y-4">
        {/* Layout Controls for Text/Smart Sections */}
        {(block.type === 'text' ||
          block.type === 'serviceItems' ||
          block.type === 'announcements' ||
          block.type === 'events') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Layout</label>
            <div className="space-y-2">
              <div>
                <label className="text-xs text-gray-600">Width</label>
                <select
                  value={getBlockWidth()}
                  onChange={(e) => setBlockWidth(e.target.value as any)}
                  disabled={isLocked}
                  className="w-full px-3 py-1.5 text-sm border rounded disabled:bg-gray-100"
                >
                  <option value="full">Full Width</option>
                  <option value="half">Half Width</option>
                  <option value="third">Third Width</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Position</label>
                <select
                  value={getBlockPosition()}
                  onChange={(e) => setBlockPosition(e.target.value as any)}
                  disabled={isLocked}
                  className="w-full px-3 py-1.5 text-sm border rounded disabled:bg-gray-100"
                >
                  <option value="top">Top</option>
                  <option value="middle">Middle</option>
                  <option value="bottom">Bottom</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Alignment</label>
                <select
                  value={getBlockAlignment()}
                  onChange={(e) => setBlockAlignment(e.target.value as any)}
                  disabled={isLocked}
                  className="w-full px-3 py-1.5 text-sm border rounded disabled:bg-gray-100"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Image/QR Specific Controls */}
        {(block.type === 'image' || block.type === 'qr') && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">
              {block.type === 'image' ? 'Image' : 'QR Code'}
            </label>
            <div className="space-y-2">
              {block.type === 'image' && (
                <div>
                  <ImageUploadButton
                    currentImageUrl={data.imageUrl}
                    onImageSelected={(url) => updateData({ imageUrl: url })}
                    disabled={isLocked}
                  />
                </div>
              )}
              {block.type === 'qr' && (
                <div>
                  <button
                    onClick={() => {
                      const url = prompt('Enter QR code URL:', data.url || 'https://example.com');
                      if (url !== null) {
                        updateData({ url });
                      }
                    }}
                    disabled={isLocked}
                    className="w-full px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
                  >
                    Change QR Link
                  </button>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-600">Size</label>
                <select
                  value={getImageSize()}
                  onChange={(e) => setImageSize(e.target.value as any)}
                  disabled={isLocked}
                  className="w-full px-3 py-1.5 text-sm border rounded disabled:bg-gray-100"
                >
                  <option value="small">Small</option>
                  <option value="medium">Medium</option>
                  <option value="large">Large</option>
                  {block.type === 'image' && <option value="full-width">Full Width</option>}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Align</label>
                <select
                  value={getBlockAlignment()}
                  onChange={(e) => setBlockAlignment(e.target.value as any)}
                  disabled={isLocked}
                  className="w-full px-3 py-1.5 text-sm border rounded disabled:bg-gray-100"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-600">Distance from top</label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round((block.y / 1056) * 100)}
                  onChange={(e) => {
                    const percent = Number(e.target.value) / 100;
                    onUpdate({ y: Math.round(percent * 1056) });
                  }}
                  disabled={isLocked}
                  className="w-full"
                />
              </div>
            </div>
          </div>
        )}

        {/* Page Selection */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Page</label>
          <div className="text-sm text-gray-600">
            This block is on the current page. To move to another page, cut and paste it.
          </div>
        </div>

        {/* Content Controls */}
        {block.type === 'text' && (
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Content</label>
            <button
              onClick={() => setTextEditOpen(true)}
              disabled={isLocked}
              className="w-full px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
            >
              Edit Text...
            </button>
            {data.content && (
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600 truncate">
                {data.content}
              </div>
            )}
          </div>
        )}

        {(block.type === 'serviceItems' ||
          block.type === 'announcements' ||
          block.type === 'events') && (
          <div className="p-3 bg-gray-50 rounded text-sm text-gray-600">
            Auto-filled from {
              block.type === 'serviceItems' ? 'service plan' :
              block.type === 'announcements' ? 'active announcements' :
              'upcoming events'
            }
          </div>
        )}
      </div>

      {/* Advanced Controls Toggle */}
      <div className="pt-4 border-t">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Advanced Controls (for power users)
        </button>
      </div>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div className="space-y-4 pt-4 border-t">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Horizontal position (from left)
              </label>
              <input
                type="number"
                value={block.x}
                onChange={(e) => onUpdate({ x: Number(e.target.value) })}
                disabled={isLocked}
                className="w-full px-2 py-1 text-sm border rounded disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Vertical position (from top)
              </label>
              <input
                type="number"
                value={block.y}
                onChange={(e) => onUpdate({ y: Number(e.target.value) })}
                disabled={isLocked}
                className="w-full px-2 py-1 text-sm border rounded disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Block width
              </label>
              <input
                type="number"
                value={block.width}
                onChange={(e) => onUpdate({ width: Number(e.target.value) })}
                disabled={isLocked}
                className="w-full px-2 py-1 text-sm border rounded disabled:bg-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Block height
              </label>
              <input
                type="number"
                value={block.height}
                onChange={(e) => onUpdate({ height: Number(e.target.value) })}
                disabled={isLocked}
                className="w-full px-2 py-1 text-sm border rounded disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* Layer Order */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-2">Layer</label>
            <div className="flex gap-2">
              <button
                onClick={onBringToFront}
                disabled={isLocked}
                className="flex-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                Bring to Front
              </button>
              <button
                onClick={onSendToBack}
                disabled={isLocked}
                className="flex-1 px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 disabled:opacity-50"
              >
                Send to Back
              </button>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Current z-index: {block.zIndex}
            </div>
          </div>

          {/* Text Block Advanced Options */}
          {block.type === 'text' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Font Size</label>
                <input
                  type="number"
                  value={data.fontSize || 16}
                  onChange={(e) => updateData({ fontSize: Number(e.target.value) })}
                  disabled={isLocked}
                  className="w-full px-2 py-1 text-sm border rounded disabled:bg-gray-100"
                  min="8"
                  max="72"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Text Align</label>
                <select
                  value={data.textAlign || 'left'}
                  onChange={(e) => updateData({ textAlign: e.target.value })}
                  disabled={isLocked}
                  className="w-full px-3 py-1.5 text-sm border rounded disabled:bg-gray-100"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Font Weight</label>
                <select
                  value={data.fontWeight || 'normal'}
                  onChange={(e) => updateData({ fontWeight: e.target.value })}
                  disabled={isLocked}
                  className="w-full px-3 py-1.5 text-sm border rounded disabled:bg-gray-100"
                >
                  <option value="normal">Normal</option>
                  <option value="bold">Bold</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Text Color</label>
                <input
                  type="color"
                  value={data.color || '#000000'}
                  onChange={(e) => updateData({ color: e.target.value })}
                  disabled={isLocked}
                  className="w-full h-8 border rounded disabled:opacity-50"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-4 border-t space-y-2">
        <button
          onClick={onDuplicate}
          disabled={isLocked}
          className="w-full px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Duplicate Block
        </button>
        <button
          onClick={onDelete}
          disabled={isLocked}
          className="w-full px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
        >
          Delete Block
        </button>
      </div>

      {/* Text Edit Modal */}
      {block.type === 'text' && (
        <TextEditModal
          isOpen={textEditOpen}
          currentText={data.content || ''}
          onSave={(text) => {
            updateData({ content: text });
            setTextEditOpen(false);
          }}
          onClose={() => setTextEditOpen(false)}
          title="Edit Text Block"
        />
      )}
    </div>
  );
}