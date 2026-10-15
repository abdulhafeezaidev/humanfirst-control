/**
 * Utility to get the public application web origin.
 *
 * In Electron / Desktop mode, window.location.protocol is "file:" and window.location.origin
 * is "null" or "file://", which breaks invite links, email redirects, and public shares.
 * This helper returns the configured web URL or fallback production Vercel domain.
 */
export function getAppOrigin(): string {
  if (typeof window === 'undefined') {
    return 'https://humanfirst-control.vercel.app';
  }

  const isDesktop =
    Boolean((window as any).humanfirstDesktop?.isDesktop) ||
    window.location.protocol === 'file:' ||
    !window.location.origin ||
    window.location.origin === 'null' ||
    window.location.origin.startsWith('file:');

  if (isDesktop) {
    return import.meta.env.VITE_PUBLIC_APP_URL || 'https://humanfirst-control.vercel.app';
  }

  return window.location.origin;
}
