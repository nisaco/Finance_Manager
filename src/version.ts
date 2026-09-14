/**
 * Single source of truth for the version string shown in the UI.
 *
 * Kept here rather than read from package.json so it cannot drift between the
 * bundle and what the footer claims, and so bumping it is one edit.
 */
export const APP_VERSION = '1.3';
