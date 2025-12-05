/**
 * DriftTestHelper
 *
 * A test component for validating that resize drift has been fixed.
 * Provides automated testing and manual validation tools.
 */

import React, { useState, useEffect } from 'react';
import type { BulletinCanvasBlock } from '@elder-first/types';

interface DriftTestHelperProps {
  blocks: BulletinCanvasBlock[];
  selectedBlockId: string | null;
  onCreateTestBlock?: (rotation?: number) => void;
}

interface TestResult {
  timestamp: string;
  blockType: string;
  rotation?: number;
  handle: string;
  driftDetected: boolean;
  driftType?: 'Model' | 'CSS' | 'DOM';
  driftAmount?: { x: number; y: number };
}

export function DriftTestHelper({ blocks, selectedBlockId, onCreateTestBlock }: DriftTestHelperProps) {
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [autoTest, setAutoTest] = useState(false);

  useEffect(() => {
    if (!isMonitoring) return;

    const handleResizeEnd = (e: CustomEvent) => {
      const { blockId, driftDetected, driftType, driftAmount } = e.detail;

      const block = blocks.find(b => b.id === blockId);
      if (!block) return;

      const result: TestResult = {
        timestamp: new Date().toISOString(),
        blockType: block.type,
        rotation: block.rotation,
        handle: e.detail.handle || 'se',
        driftDetected,
        driftType,
        driftAmount,
      };

      setTestResults(prev => [...prev.slice(-9), result]);

      // Alert if drift detected
      if (driftDetected) {
        console.error('❌ DRIFT DETECTED IN TEST!', result);
      } else {
        console.log('✅ No drift - test passed', result);
      }
    };

    // Listen for resize end events from ResizeTestMonitor
    window.addEventListener('resize-test-complete' as any, handleResizeEnd);

    return () => {
      window.removeEventListener('resize-test-complete' as any, handleResizeEnd);
    };
  }, [isMonitoring, blocks]);

  const runAutomatedTest = async () => {
    console.log('🧪 Starting automated drift test...');
    setTestResults([]);
    setAutoTest(true);

    // Test rotations: 0°, 15°, 45°, 90°
    const rotations = [0, 15, 45, 90];

    for (const rotation of rotations) {
      console.log(`Testing rotation: ${rotation}°`);

      // Create test block
      if (onCreateTestBlock) {
        onCreateTestBlock(rotation);

        // Wait for block creation and rendering
        await new Promise(resolve => setTimeout(resolve, 500));

        // Simulate resize (would need to trigger programmatically)
        // This would require exposing resize methods or using synthetic events
        console.log(`Would test resize at ${rotation}° - manual interaction needed`);
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    setAutoTest(false);
    console.log('🧪 Automated test complete. Check results below.');
  };

  const selectedBlock = blocks.find(b => b.id === selectedBlockId);
  const passCount = testResults.filter(r => !r.driftDetected).length;
  const failCount = testResults.filter(r => r.driftDetected).length;
  const passRate = testResults.length > 0
    ? Math.round((passCount / testResults.length) * 100)
    : 0;

  return (
    <div className="fixed bottom-4 right-4 bg-white shadow-2xl rounded-lg p-4 border border-gray-200"
         style={{ width: '400px', maxHeight: '500px', zIndex: 9999 }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">Drift Test Helper</h3>
        <button
          onClick={() => setIsMonitoring(!isMonitoring)}
          className={`px-3 py-1 rounded text-sm font-medium ${
            isMonitoring
              ? 'bg-green-500 text-white'
              : 'bg-gray-200 text-gray-700'
          }`}
        >
          {isMonitoring ? 'Monitoring' : 'Start Monitor'}
        </button>
      </div>

      {/* Test Controls */}
      <div className="border-b pb-3 mb-3">
        <div className="flex gap-2 mb-2">
          <button
            onClick={() => onCreateTestBlock && onCreateTestBlock(0)}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
            title="Create announcements block with no rotation"
          >
            Test 0°
          </button>
          <button
            onClick={() => onCreateTestBlock && onCreateTestBlock(15)}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
            title="Create announcements block with 15° rotation"
          >
            Test 15°
          </button>
          <button
            onClick={() => onCreateTestBlock && onCreateTestBlock(45)}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
            title="Create announcements block with 45° rotation"
          >
            Test 45°
          </button>
          <button
            onClick={() => onCreateTestBlock && onCreateTestBlock(90)}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
            title="Create announcements block with 90° rotation"
          >
            Test 90°
          </button>
        </div>

        <button
          onClick={runAutomatedTest}
          className="w-full px-3 py-1 bg-purple-500 text-white rounded text-sm font-medium"
          disabled={autoTest}
        >
          {autoTest ? 'Running Tests...' : 'Run Automated Test Suite'}
        </button>
      </div>

      {/* Current Selection Info */}
      {selectedBlock && (
        <div className="bg-gray-50 rounded p-2 mb-3 text-xs">
          <div className="font-semibold mb-1">Selected Block:</div>
          <div>Type: {selectedBlock.type}</div>
          <div>Position: ({selectedBlock.x}, {selectedBlock.y})</div>
          <div>Size: {selectedBlock.width} × {selectedBlock.height}</div>
          {selectedBlock.rotation && <div>Rotation: {selectedBlock.rotation}°</div>}
        </div>
      )}

      {/* Test Results Summary */}
      {testResults.length > 0 && (
        <div className="mb-3">
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-sm">Test Results</span>
            <div className="flex gap-2 text-xs">
              <span className="text-green-600">✅ {passCount}</span>
              <span className="text-red-600">❌ {failCount}</span>
              <span className="font-medium">({passRate}% pass)</span>
            </div>
          </div>

          {/* Results List */}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {testResults.slice().reverse().map((result, i) => (
              <div
                key={i}
                className={`text-xs p-2 rounded ${
                  result.driftDetected
                    ? 'bg-red-50 border border-red-200'
                    : 'bg-green-50 border border-green-200'
                }`}
              >
                <div className="flex justify-between">
                  <span className="font-medium">
                    {result.blockType} @ {result.rotation || 0}°
                  </span>
                  <span>{result.driftDetected ? '❌ FAIL' : '✅ PASS'}</span>
                </div>
                {result.driftDetected && (
                  <div className="mt-1 text-red-600">
                    {result.driftType} drift:
                    ({result.driftAmount?.x.toFixed(1)}, {result.driftAmount?.y.toFixed(1)})
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="text-xs text-gray-600 border-t pt-2">
        <div className="font-semibold mb-1">Test Instructions:</div>
        <ol className="space-y-1 text-[10px]">
          <li>1. Click &quot;Start Monitor&quot; to begin tracking</li>
          <li>2. Create test blocks with different rotations</li>
          <li>3. Resize blocks from bottom-right handle</li>
          <li>4. Monitor will report any drift detected</li>
          <li>5. All tests should show &quot;✅ PASS&quot; when fixed</li>
        </ol>
      </div>

      {/* Clear Results */}
      {testResults.length > 0 && (
        <button
          onClick={() => setTestResults([])}
          className="mt-2 text-xs text-gray-500 hover:text-gray-700"
        >
          Clear Results
        </button>
      )}
    </div>
  );
}