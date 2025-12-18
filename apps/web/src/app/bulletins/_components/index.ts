/**
 * Bulletins Dual-View Components
 *
 * Export the container pattern components for the Bulletins page.
 *
 * Usage:
 *   import { BulletinsContainer } from './_components';
 *
 * The container handles data fetching and selects the appropriate view
 * based on the user's UiMode preference.
 *
 * See: docs/ui/ACCESSIBLE-UI-CURRENT-STATE.md (Dual-View)
 */

export { BulletinsContainer } from './BulletinsContainer';
export { BulletinsModernView } from './BulletinsModernView';
export { BulletinsAccessibleView } from './BulletinsAccessibleView';
export type {
  BulletinsViewModel,
  BulletinsViewProps,
  BulletinsViewActions,
  BulletinListItem,
  BulletinFilter,
} from './types';
