/**
 * Bulletin Service Templates
 *
 * Code-defined templates for service order/structure.
 * Each template defines an ordered list of sections that will be
 * created as service_item rows when generating a bulletin.
 */

export type ServiceTemplateSectionType = 'generic' | 'sermon';

export interface ServiceTemplateSection {
  /** Unique key within the template */
  id: string;
  /** Section type - 'sermon' gets special handling */
  type: ServiceTemplateSectionType;
  /** Display label (e.g., "Call to Worship") */
  label: string;
  /** Default notes/instructions for this section */
  defaultNotes?: string;
}

export interface ServiceTemplate {
  /** Unique template key (e.g., 'standard_sunday') */
  key: string;
  /** Display name (e.g., 'Standard Sunday Worship') */
  name: string;
  /** Optional description */
  description?: string;
  /** Ordered list of sections */
  sections: ServiceTemplateSection[];
}

/**
 * Predefined service templates
 */
export const SERVICE_TEMPLATES: ServiceTemplate[] = [
  {
    key: 'standard_sunday',
    name: 'Standard Sunday Worship',
    description: 'Traditional Sunday morning worship service with hymns, scripture, and sermon.',
    sections: [
      { id: 'welcome', type: 'generic', label: 'Welcome & Announcements', defaultNotes: 'Greet congregation and share announcements' },
      { id: 'call_to_worship', type: 'generic', label: 'Call to Worship', defaultNotes: 'Leader reads opening scripture or liturgy' },
      { id: 'opening_hymn', type: 'generic', label: 'Opening Hymn', defaultNotes: 'Congregation stands' },
      { id: 'invocation', type: 'generic', label: 'Invocation Prayer' },
      { id: 'scripture_reading', type: 'generic', label: 'Scripture Reading', defaultNotes: 'Reader approaches lectern' },
      { id: 'hymn_of_preparation', type: 'generic', label: 'Hymn of Preparation' },
      { id: 'sermon', type: 'sermon', label: 'Sermon' },
      { id: 'response_hymn', type: 'generic', label: 'Hymn of Response' },
      { id: 'offering', type: 'generic', label: 'Offertory', defaultNotes: 'Ushers collect offering' },
      { id: 'doxology', type: 'generic', label: 'Doxology', defaultNotes: 'Congregation stands' },
      { id: 'pastoral_prayer', type: 'generic', label: 'Pastoral Prayer' },
      { id: 'closing_hymn', type: 'generic', label: 'Closing Hymn' },
      { id: 'benediction', type: 'generic', label: 'Benediction' },
    ],
  },
  {
    key: 'communion_sunday',
    name: 'Communion Sunday',
    description: 'Sunday service with the Lord\'s Supper. Includes communion liturgy and distribution.',
    sections: [
      { id: 'welcome', type: 'generic', label: 'Welcome & Announcements', defaultNotes: 'Greet congregation and share announcements' },
      { id: 'call_to_worship', type: 'generic', label: 'Call to Worship' },
      { id: 'opening_hymn', type: 'generic', label: 'Opening Hymn', defaultNotes: 'Congregation stands' },
      { id: 'invocation', type: 'generic', label: 'Invocation Prayer' },
      { id: 'scripture_reading', type: 'generic', label: 'Scripture Reading' },
      { id: 'sermon', type: 'sermon', label: 'Sermon' },
      { id: 'response_hymn', type: 'generic', label: 'Hymn of Response' },
      { id: 'communion_intro', type: 'generic', label: 'Communion Introduction', defaultNotes: 'Pastor introduces the Lord\'s Supper' },
      { id: 'communion_prayer', type: 'generic', label: 'Communion Prayer', defaultNotes: 'Prayer of thanksgiving over elements' },
      { id: 'bread', type: 'generic', label: 'Breaking of the Bread', defaultNotes: '"This is my body..."' },
      { id: 'cup', type: 'generic', label: 'Sharing of the Cup', defaultNotes: '"This cup is the new covenant..."' },
      { id: 'communion_hymn', type: 'generic', label: 'Communion Hymn', defaultNotes: 'Sung during distribution' },
      { id: 'offering', type: 'generic', label: 'Offertory' },
      { id: 'benediction', type: 'generic', label: 'Benediction' },
    ],
  },
  {
    key: 'evening_service',
    name: 'Evening Worship',
    description: 'Simplified evening service focused on prayer, hymns, and teaching.',
    sections: [
      { id: 'welcome', type: 'generic', label: 'Welcome' },
      { id: 'opening_song', type: 'generic', label: 'Opening Song' },
      { id: 'prayer_time', type: 'generic', label: 'Prayer Time', defaultNotes: 'Open prayer and sharing of prayer requests' },
      { id: 'hymn', type: 'generic', label: 'Hymn' },
      { id: 'scripture', type: 'generic', label: 'Scripture Reading' },
      { id: 'sermon', type: 'sermon', label: 'Message' },
      { id: 'closing_song', type: 'generic', label: 'Closing Song' },
      { id: 'benediction', type: 'generic', label: 'Benediction' },
    ],
  },
  {
    key: 'contemporary_worship',
    name: 'Contemporary Worship',
    description: 'Modern worship style with praise band and contemporary songs.',
    sections: [
      { id: 'gathering', type: 'generic', label: 'Gathering Music', defaultNotes: 'Band plays as congregation gathers' },
      { id: 'welcome', type: 'generic', label: 'Welcome' },
      { id: 'worship_set_1', type: 'generic', label: 'Worship Set (Fast)', defaultNotes: '2-3 upbeat songs' },
      { id: 'worship_set_2', type: 'generic', label: 'Worship Set (Slow)', defaultNotes: '2-3 reflective songs' },
      { id: 'announcements', type: 'generic', label: 'Announcements & Greeting' },
      { id: 'offering', type: 'generic', label: 'Offering', defaultNotes: 'Special music during offering' },
      { id: 'scripture', type: 'generic', label: 'Scripture Reading' },
      { id: 'sermon', type: 'sermon', label: 'Message' },
      { id: 'response_song', type: 'generic', label: 'Response Song' },
      { id: 'closing', type: 'generic', label: 'Closing & Dismissal' },
    ],
  },
];

/**
 * Get a service template by its key
 */
export function getServiceTemplateByKey(key: string): ServiceTemplate | undefined {
  return SERVICE_TEMPLATES.find((t) => t.key === key);
}

/**
 * Get the sermon section index for a template (for ordering)
 */
export function getSermonSectionIndex(template: ServiceTemplate): number {
  return template.sections.findIndex((s) => s.type === 'sermon');
}
