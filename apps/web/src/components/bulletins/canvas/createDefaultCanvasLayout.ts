/**
 * Default Canvas Layout Seeder
 *
 * Generates a sensible default canvas layout for bulletins that don't have one yet.
 * This prevents users from seeing a blank canvas on first use.
 */

import type { BulletinCanvasLayout, BulletinCanvasBlock } from '@elder-first/types';

interface DefaultLayoutOptions {
  bulletinIssueId: string;
  churchName?: string;
  givingUrl?: string;
  // Add more options as needed
}

/**
 * Creates a default 2-page canvas layout with pre-positioned blocks
 *
 * Page 1 (Front):
 * - Welcome text header
 * - Service items (order of worship)
 * - Giving info block
 *
 * Page 2 (Back):
 * - Announcements
 * - Events
 * - Contact info
 *
 * All blocks use 816×1056px coordinate system with 16px grid alignment.
 */
export function createDefaultCanvasLayout(options: DefaultLayoutOptions): BulletinCanvasLayout {
  const { bulletinIssueId, churchName = 'Our Church', givingUrl = 'https://example.com/give' } = options;

  // Canvas dimensions: 816×1056px (standard letter at 96 DPI)
  // Helper to create centered header
  const createWelcomeBlock = (): BulletinCanvasBlock => ({
    id: crypto.randomUUID(),
    type: 'text',
    x: 58,  // Center horizontally (816 - 700) / 2
    y: 32,  // Top margin
    width: 700,
    height: 80,
    zIndex: 1,
    data: {
      content: `Welcome to ${churchName}`,
      fontSize: 32,
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#1F2937', // gray-800
    },
  });

  // Page 1 blocks
  const page1Blocks: BulletinCanvasBlock[] = [
    // Welcome header
    createWelcomeBlock(),

    // Service Items (Order of Worship) - Main content
    {
      id: crypto.randomUUID(),
      type: 'serviceItems',
      x: 58,
      y: 144,
      width: 700,
      height: 600,
      zIndex: 2,
      data: {
        bulletinIssueId,
        maxItems: 20,
        showCcli: false,
      },
    },

    // Giving Info - Footer
    {
      id: crypto.randomUUID(),
      type: 'giving',
      x: 233, // Center (816 - 350) / 2
      y: 784,
      width: 350,
      height: 240,
      zIndex: 3,
      data: {
        displayType: 'both',
        givingUrl,
      },
    },
  ];

  // Page 2 blocks
  const page2Blocks: BulletinCanvasBlock[] = [
    // Announcements - Top section
    {
      id: crypto.randomUUID(),
      type: 'announcements',
      x: 58,
      y: 32,
      width: 700,
      height: 320,
      zIndex: 1,
      data: {
        maxItems: 5,
        category: null,
        priorityFilter: null,
      },
    },

    // Events - Middle section
    {
      id: crypto.randomUUID(),
      type: 'events',
      x: 58,
      y: 384,
      width: 700,
      height: 320,
      zIndex: 2,
      data: {
        maxItems: 5,
        dateRange: 'month',
      },
    },

    // Contact Info - Bottom section
    {
      id: crypto.randomUUID(),
      type: 'contactInfo',
      x: 233, // Center (816 - 350) / 2
      y: 736,
      width: 350,
      height: 288,
      zIndex: 3,
      data: {
        showAddress: true,
        showPhone: true,
        showEmail: true,
        showWebsite: true,
      },
    },
  ];

  // Create the layout with 4 pages (booklet-ready)
  // Pages 1-2 have content, pages 3-4 are blank (user can add content later)
  const layout: BulletinCanvasLayout = {
    pages: [
      {
        id: crypto.randomUUID(),
        pageNumber: 1,
        blocks: page1Blocks,
      },
      {
        id: crypto.randomUUID(),
        pageNumber: 2,
        blocks: page2Blocks,
      },
      {
        id: crypto.randomUUID(),
        pageNumber: 3,
        blocks: [], // Blank page
      },
      {
        id: crypto.randomUUID(),
        pageNumber: 4,
        blocks: [], // Blank page
      },
    ],
  };

  return layout;
}
