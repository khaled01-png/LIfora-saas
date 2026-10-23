import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { checkServer } from '../../services/api';

/**
 * Honest status banner: shown ONLY when the website cannot reach its server
 * (for example the server address was not set when the site was published).
 */
export const SiteNotice: React.FC = () => {
  const { language } = useApp();
  const bn = language === 'bn';
  const [serverDown, setServerDown] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const ok = await checkServer();
      if (!cancelled) setServerDown(!ok);
    };
    void run();
    const timer = setInterval(run, 60000);
    return () => { cancelled = true; clearInterval(timer); };
  }, []);

  if (!serverDown) return null;
  return (
    <div role="alert" className="relative z-20 w-full text-[11px] sm:text-xs leading-snug">
      <div className="bg-red-50 dark:bg-red-950/40 border-b border-red-200 dark:border-red-900 text-red-900 dark:text-red-200 px-4 py-2 flex items-center justify-center gap-2 text-center">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>
          {bn
            ? 'সার্ভারের সাথে সংযোগ নেই, তাই এখন কিছু সংরক্ষণ বা পাঠানো যাবে না। জরুরি রক্তের জন্য সরাসরি হাসপাতালে যোগাযোগ করুন।'
            : 'The server is not reachable, so nothing can be saved or sent right now. For urgent blood needs, contact a hospital or blood bank directly.'}
        </span>
      </div>
    </div>
  );
};

export const MedicalDisclaimer: React.FC = () => {
  const { language } = useApp();
  return (
    <p className="relative z-10 text-[11px] text-center text-[#64748B] dark:text-[#94A3B8] px-4 py-3 border-t border-[#E2E8F0] dark:border-[#1E293B]">
      {language === 'bn'
        ? 'LIFORA রক্তদাতা খুঁজে পেতে সহায়তা করে, এটি চিকিৎসা পরামর্শ বা ট্রান্সফিউশনের অনুমোদন নয়। রক্ত দেওয়া বা নেওয়ার আগে সর্বদা হাসপাতালের ল্যাব ও চিকিৎসকের যাচাই নিন।'
        : 'LIFORA helps you find donors. It is not medical advice or clearance for transfusion. Always have blood group and compatibility confirmed by a hospital laboratory and a physician.'}
    </p>
  );
};
