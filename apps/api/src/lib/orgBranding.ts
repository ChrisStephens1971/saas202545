import { queryWithTenant } from '../db';
import type { TheologyProfile } from '@elder-first/types';

/**
 * Organization branding data for tax statements and official documents
 */
export interface OrgBranding {
  legalName: string;
  displayName: string | null;
  churchName: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  ein: string | null;
  logoUrl: string | null;
  taxStatementFooter: string | null;
  // Bulletin settings
  bulletinDefaultLayoutMode: 'template' | 'canvas';
  bulletinAiEnabled: boolean;
  bulletinDefaultCanvasGridSize: number;
  bulletinDefaultCanvasShowGrid: boolean;
  bulletinDefaultPages: number;
  givingUrl: string | null;
  // Theology profile for AI sermon helper
  theologyProfile: TheologyProfile;
}

/**
 * Fetch organization branding from the active brand_pack for a tenant.
 *
 * If no active brand pack exists, returns minimal branding with empty values.
 * If legal_name is not set, falls back to church_name.
 *
 * @param tenantId - The tenant/organization ID
 * @returns OrgBranding object with all branding fields
 */
export async function getOrgBranding(tenantId: string): Promise<OrgBranding> {
  const result = await queryWithTenant(
    tenantId,
    `SELECT
      legal_name,
      name as display_name,
      church_name,
      address_line1,
      address_line2,
      city,
      state,
      postal_code,
      country,
      church_phone as phone,
      church_email as email,
      church_website as website,
      ein,
      logo_url,
      tax_statement_footer,
      bulletin_default_layout_mode,
      bulletin_ai_enabled,
      bulletin_default_canvas_grid_size,
      bulletin_default_canvas_show_grid,
      bulletin_default_pages,
      giving_url,
      theology_tradition,
      theology_bible_translation,
      theology_sermon_style,
      theology_sensitivity,
      theology_restricted_topics,
      theology_preferred_tone
    FROM brand_pack
    WHERE is_active = true
      AND deleted_at IS NULL
    LIMIT 1`
  );

  // Default theology profile
  const defaultTheologyProfile: TheologyProfile = {
    tradition: 'Non-denominational evangelical',
    bibleTranslation: 'ESV',
    sermonStyle: 'expository',
    sensitivity: 'moderate',
    restrictedTopics: [],
    preferredTone: 'warm and pastoral',
  };

  if (result.rows.length === 0) {
    // No active brand pack - return default/empty branding
    return {
      legalName: 'Organization',
      displayName: null,
      churchName: null,
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      postalCode: null,
      country: 'US',
      phone: null,
      email: null,
      website: null,
      ein: null,
      logoUrl: null,
      taxStatementFooter: null,
      bulletinDefaultLayoutMode: 'template',
      bulletinAiEnabled: false,
      bulletinDefaultCanvasGridSize: 16,
      bulletinDefaultCanvasShowGrid: true,
      bulletinDefaultPages: 4,
      givingUrl: null,
      theologyProfile: defaultTheologyProfile,
    };
  }

  const row = result.rows[0];

  // legal_name falls back to church_name if not set
  const legalName = row.legal_name || row.church_name || 'Organization';

  // Build theology profile from row with defaults
  const theologyProfile: TheologyProfile = {
    tradition: row.theology_tradition || defaultTheologyProfile.tradition,
    bibleTranslation: row.theology_bible_translation || defaultTheologyProfile.bibleTranslation,
    sermonStyle: row.theology_sermon_style || defaultTheologyProfile.sermonStyle,
    sensitivity: row.theology_sensitivity || defaultTheologyProfile.sensitivity,
    restrictedTopics: row.theology_restricted_topics || defaultTheologyProfile.restrictedTopics,
    preferredTone: row.theology_preferred_tone || defaultTheologyProfile.preferredTone,
  };

  return {
    legalName,
    displayName: row.display_name || null,
    churchName: row.church_name || null,
    addressLine1: row.address_line1 || null,
    addressLine2: row.address_line2 || null,
    city: row.city || null,
    state: row.state || null,
    postalCode: row.postal_code || null,
    country: row.country || 'US',
    phone: row.phone || null,
    email: row.email || null,
    website: row.website || null,
    ein: row.ein || null,
    logoUrl: row.logo_url || null,
    taxStatementFooter: row.tax_statement_footer || null,
    bulletinDefaultLayoutMode: (row.bulletin_default_layout_mode as 'template' | 'canvas') || 'template',
    bulletinAiEnabled: row.bulletin_ai_enabled ?? false,
    bulletinDefaultCanvasGridSize: row.bulletin_default_canvas_grid_size ?? 16,
    bulletinDefaultCanvasShowGrid: row.bulletin_default_canvas_show_grid ?? true,
    bulletinDefaultPages: row.bulletin_default_pages ?? 4,
    givingUrl: row.giving_url || null,
    theologyProfile,
  };
}

/**
 * Format a full address from branding fields
 */
export function formatAddress(branding: OrgBranding): string | null {
  const parts: string[] = [];

  if (branding.addressLine1) {
    parts.push(branding.addressLine1);
  }
  if (branding.addressLine2) {
    parts.push(branding.addressLine2);
  }

  const cityStateZip: string[] = [];
  if (branding.city) {
    cityStateZip.push(branding.city);
  }
  if (branding.state) {
    cityStateZip.push(branding.state);
  }
  if (branding.postalCode) {
    cityStateZip.push(branding.postalCode);
  }

  if (cityStateZip.length > 0) {
    // Format as "City, State ZIP"
    if (branding.city && branding.state) {
      parts.push(`${branding.city}, ${branding.state} ${branding.postalCode || ''}`.trim());
    } else {
      parts.push(cityStateZip.join(' '));
    }
  }

  if (branding.country && branding.country !== 'US') {
    parts.push(branding.country);
  }

  return parts.length > 0 ? parts.join('\n') : null;
}
