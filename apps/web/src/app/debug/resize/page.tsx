'use client';

import { useState, useEffect, useRef } from 'react';

export default function DebugResize() {
  const [rect, setRect] = useState({ x: 200, y: 200, width: 350, height: 200 });
  const [isResizing, setIsResizing] = useState(false);
  const startRectRef = useRef<typeof rect | null>(null);
  const startMouseRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!startRectRef.current || !startMouseRef.current) return;

      const deltaX = e.clientX - startMouseRef.current.x;
      const deltaY = e.clientY - startMouseRef.current.y;

      // CRITICAL: x and y stay CONSTANT (equal to startRect values)
      // Only width and height change
      setRect({
        x: startRectRef.current.x,  // NEVER CHANGES
        y: startRectRef.current.y,  // NEVER CHANGES
        width: Math.max(50, startRectRef.current.width + deltaX),
        height: Math.max(50, startRectRef.current.height + deltaY),
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      startRectRef.current = null;
      startMouseRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsResizing(true);
    startRectRef.current = { ...rect };
    startMouseRef.current = { x: e.clientX, y: e.clientY };
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Debug Resize - Minimal Repro</h1>

      <div style={{ marginBottom: '10px' }}>
        <code>x: {rect.x}, y: {rect.y}, width: {rect.width}, height: {rect.height}</code>
      </div>

      {/* Canvas */}
      <div
        style={{
          position: 'relative',
          width: 800,
          height: 600,
          border: '1px solid #ccc',
          background: '#fafafa',
        }}
      >
        {/* Debug Block */}
        <div
          style={{
            position: 'absolute',
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
            border: '2px solid #333',
            background: 'rgba(255, 255, 255, 0.9)',
            padding: '10px',
            boxSizing: 'border-box',
          }}
        >
          <div>Debug Block</div>
          <div style={{ fontSize: '12px', marginTop: '5px' }}>
            x={rect.x} y={rect.y}
          </div>

          {/* Bottom-right resize handle */}
          <div
            className="resize-handle-se"
            onMouseDown={handleResizeStart}
            style={{
              position: 'absolute',
              bottom: -5,
              right: -5,
              width: 10,
              height: 10,
              background: '#3b82f6',
              cursor: 'se-resize',
              border: '1px solid white',
            }}
          />
        </div>

        {/* Visual anchor marker to verify position stability */}
        <div
          style={{
            position: 'absolute',
            left: rect.x - 2,
            top: rect.y - 2,
            width: 4,
            height: 4,
            background: 'red',
            borderRadius: '50%',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
          title="This should NEVER move during SE resize"
        />
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px' }}>
        <h3>Test Instructions:</h3>
        <ol>
          <li>Drag the blue handle at bottom-right corner</li>
          <li>The red dot (anchor) should NEVER move</li>
          <li>Only width and height should change</li>
          <li>x and y should remain at 200, 200</li>
        </ol>
        <p><strong>Expected:</strong> No drift. The top-left position stays fixed.</p>
      </div>
    </div>
  );
}