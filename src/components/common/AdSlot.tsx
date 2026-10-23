import React, { useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { ADSENSE_CLIENT, ADSENSE_SLOT, ADS_FOR_MEMBERS, adsAllowedForVisitor, loadAdScript } from '../../utils/ads';

declare global {
  interface Window { adsbygoogle?: unknown[]; }
}

/** One clearly labelled ad block for signed-out visitors. Renders nothing when ads are not configured. */
export const AdSlot: React.FC<{ slot?: string }> = ({ slot }) => {
  const { currentUser, language } = useApp();
  const pushed = useRef(false);
  const slotId = slot || ADSENSE_SLOT;
  const enabled = !!ADSENSE_CLIENT && !!slotId && (!currentUser || ADS_FOR_MEMBERS) && adsAllowedForVisitor();

  useEffect(() => {
    if (!enabled || pushed.current) return;
    loadAdScript();
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      /* ad blockers or network problems must never break the page */
    }
  }, [enabled]);

  if (!enabled) return null;
  return (
    <aside aria-label="Advertisement" className="max-w-3xl mx-auto px-4 sm:px-6 py-6 text-center">
      <span className="block text-[10px] uppercase tracking-wider text-[#94A3B8] mb-1">
        {language === 'bn' ? 'বিজ্ঞাপন' : 'Advertisement'}
      </span>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
};
