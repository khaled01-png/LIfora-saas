/**
 * Ads are OFF unless VITE_ADSENSE_CLIENT and VITE_ADSENSE_SLOT are set.
 * Default (VITE_ADS_FOR_MEMBERS not "true"): only signed-out visitors see ads, the ad script is never loaded
 * while a login token exists in the browser, and a login after the script loaded reloads the page without it.
 * With VITE_ADS_FOR_MEMBERS=true, signed-in members also see ads, but only in the AdSlot spots placed on
 * content pages (home, centers). Never place an AdSlot on requests, donor contact or dashboards.
 */
export const ADS_FOR_MEMBERS: boolean = (import.meta.env.VITE_ADS_FOR_MEMBERS || '').trim().toLowerCase() === 'true';
export const ADSENSE_CLIENT: string = (import.meta.env.VITE_ADSENSE_CLIENT || '').trim();
export const ADSENSE_SLOT: string = (import.meta.env.VITE_ADSENSE_SLOT || '').trim();

let scriptLoaded = false;

export const isAdScriptLoaded = (): boolean => scriptLoaded;

/** True when a login must reload the page to get rid of an ad script that was loaded for a guest. */
export const mustReloadAfterLogin = (): boolean => scriptLoaded && !ADS_FOR_MEMBERS;

export function adsAllowedForVisitor(): boolean {
  if (!ADSENSE_CLIENT) return false;
  if (ADS_FOR_MEMBERS) return true;
  try {
    return !localStorage.getItem('lifora_token');
  } catch {
    return false;
  }
}

export function loadAdScript(): void {
  if (scriptLoaded || !ADSENSE_CLIENT) return;
  scriptLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADSENSE_CLIENT)}`;
  document.head.appendChild(s);
}
