/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
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
