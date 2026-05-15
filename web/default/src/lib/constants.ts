/**
 * Application-wide constants
 */

// System Configuration Defaults
export const DEFAULT_SYSTEM_NAME = 'OORouter'
export const DEFAULT_LOGO = '/logo.png'

/**
 * Optional build-time branding override.
 *
 * Set `PUBLIC_BRAND_NAME` (or `VITE_BRAND_NAME`) at build time to customize
 * the fallback site name used when the backend has not yet returned a value
 * from `/api/status`. The backend value (when present and non-empty) always
 * takes precedence; this only affects the local fallback chain.
 *
 * Resolution order at runtime:
 *   1. `status.system_name` from `/api/status` (admin-configured)
 *   2. `BRAND_NAME_OVERRIDE` (this build-time value, if set)
 *   3. `DEFAULT_SYSTEM_NAME` (existing hard-coded fallback, preserved)
 */
export const BRAND_NAME_OVERRIDE: string =
  (typeof process !== 'undefined' &&
    (process.env?.PUBLIC_BRAND_NAME ||
      process.env?.VITE_BRAND_NAME ||
      process.env?.RSBUILD_BRAND_NAME)) ||
  ''

// LocalStorage Keys
export const STORAGE_KEYS = {
  SYSTEM_NAME: 'system_name',
  LOGO: 'logo',
  FOOTER_HTML: 'footer_html',
} as const
