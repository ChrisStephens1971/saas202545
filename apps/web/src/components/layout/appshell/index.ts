/**
 * AppShell Module Exports
 *
 * The dual-UI shell architecture:
 * - AppShell: Main switcher that renders Modern or Accessible based on UiMode
 * - AppShellModern: Compact/dense layout (current behavior)
 * - AppShellAccessible: Elder-friendly layout with always-visible nav
 */

export { AppShell } from './AppShell';
export { AppShellModern } from './AppShellModern';
export { AppShellAccessible } from './AppShellAccessible';
export type { AppShellProps, AppShellUser } from './types';
export { isNavItemActive } from './types';
