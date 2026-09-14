/**
 * Single source of truth for the version string shown in the UI.
 *
 * Kept here rather than read from package.json so it cannot drift between the
 * bundle and what the footer claims, and so bumping it is one edit.
 * Increment this on each release so cache-busters, support tickets and bug
 * reports all refer to the same build.
 */
export const APP_VERSION = '1.3';
export const APP_VERSION = '1.6.5';
