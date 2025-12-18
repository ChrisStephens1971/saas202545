/**
 * UI Shell Variant Configuration
 *
 * Controls which shell the web app uses and density settings.
 * Safe to import on both server and client.
 *
 * See: docs/ui/CARBON-SHELL-EXPERIMENT.md
 */

export type UiShellVariant = 'legacy' | 'carbon';
export type UiDensity = 'standard' | 'elder';

/**
 * Get the current UI shell variant from environment.
 *
 * @returns 'carbon' if explicitly set, otherwise 'legacy' (default)
 */
export function getUiShellVariant(): UiShellVariant {
  const raw = process.env.NEXT_PUBLIC_CHURCH_UI_SHELL_VARIANT ?? '';
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'carbon') return 'carbon';
  return 'legacy';
}

/**
 * Get the current UI density from environment.
 *
 * @returns 'elder' if explicitly set, otherwise 'standard' (default)
 */
export function getUiDensity(): UiDensity {
  const raw = process.env.NEXT_PUBLIC_CHURCH_UI_DENSITY ?? '';
  const normalized = raw.trim().toLowerCase();
  if (normalized === 'elder') return 'elder';
  return 'standard';
}
