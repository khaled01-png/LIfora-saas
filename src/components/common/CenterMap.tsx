import React from 'react';
import { MapPin, Navigation, ExternalLink } from 'lucide-react';
import { BloodCenter } from '../../types';
import { useApp } from '../../context/AppContext';

const asNumber = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** Real coordinates only. A center without a saved pin returns null (nothing is guessed). */
export function centerCoords(c: BloodCenter): { lat: number; lng: number } | null {
  const lat = asNumber(c.coordinates?.lat);
  const lng = asNumber(c.coordinates?.lng);
  if (lat === null || lng === null) return null;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

/** Opens Google Maps directions (free link, no API key). Falls back to searching by name and address. */
export function directionsUrl(c: BloodCenter): string {
  const pt = centerCoords(c);
  const destination = pt
    ? `${pt.lat},${pt.lng}`
    : encodeURIComponent([c.name, c.address, c.city].filter(Boolean).join(', '));
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}`;
}

export const CenterMap: React.FC<{ center: BloodCenter }> = ({ center }) => {
  const { language } = useApp();
  const bn = language === 'bn';
  const pt = centerCoords(center);
  const d = 0.008;
  const embed = pt
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${pt.lng - d}%2C${pt.lat - d}%2C${pt.lng + d}%2C${pt.lat + d}&layer=mapnik&marker=${pt.lat}%2C${pt.lng}`
    : null;

  return (
    <div className="space-y-3">
      {embed ? (
        <iframe
          title={`${center.name} map`}
          src={embed}
          loading="lazy"
          className="w-full h-56 rounded-2xl border border-[#E2E8F0] dark:border-[#222D35]"
        />
      ) : (
        <div className="p-4 rounded-2xl bg-[#F8FAF9] dark:bg-[#0B0F12] border border-[#E2E8F0] dark:border-[#222D35] text-xs text-[#64748B] dark:text-[#94A3B8] flex items-start gap-2">
          <MapPin className="w-4 h-4 text-[#0D7A5F] shrink-0 mt-0.5" />
          <span>
            {bn
              ? 'এই কেন্দ্রের সঠিক পিন এখনো যোগ করা হয়নি। "রুট দেখুন" চাপলে Google Maps-এ নাম ও ঠিকানা দিয়ে খুঁজবে।'
              : 'The exact map pin for this center has not been added yet. "Directions" will search Google Maps by name and address.'}
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <a
          href={directionsUrl(center)}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 rounded-xl bg-[#0D7A5F] hover:bg-[#095C48] text-white text-xs font-bold shadow-xs transition-all flex items-center gap-2 cursor-pointer"
        >
          <Navigation className="w-4 h-4" />
          <span>{bn ? 'রুট দেখুন' : 'Get Directions'}</span>
        </a>
        {pt && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${pt.lat}&mlon=${pt.lng}#map=16/${pt.lat}/${pt.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 rounded-xl border border-[#E2E8F0] dark:border-[#222D35] hover:border-[#0D7A5F] text-xs font-semibold text-[#0F172A] dark:text-white transition-all flex items-center gap-2 cursor-pointer"
          >
            <ExternalLink className="w-4 h-4 text-[#0D7A5F]" />
            <span>{bn ? 'বড় মানচিত্র' : 'Larger map'}</span>
          </a>
        )}
      </div>
    </div>
  );
};
