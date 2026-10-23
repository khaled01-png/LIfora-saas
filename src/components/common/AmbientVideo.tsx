import React, { useEffect, useRef, useState } from 'react';

/**
 * Decorative background video that costs nothing until it is needed:
 * it downloads only when it is near the viewport, plays only while visible, and is skipped entirely when the
 * visitor prefers reduced motion or has Data Saver on (the poster image is shown instead).
 */
export const AmbientVideo: React.FC<{ src: string; poster: string; className?: string }> = ({ src, poster, className }) => {
  const ref = useRef<HTMLVideoElement>(null);
  const [near, setNear] = useState(false);

  const allowed = (() => {
    try {
      const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const saveData = (navigator as unknown as { connection?: { saveData?: boolean } }).connection?.saveData === true;
      return !reduce && !saveData;
    } catch { return true; }
  })();

  useEffect(() => {
    const el = ref.current;
    if (!el || !allowed || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setNear(true);
        el.play().catch(() => { /* autoplay blocked: the poster stays visible */ });
      } else {
        el.pause();
      }
    }, { rootMargin: '150px' });
    io.observe(el);
    return () => io.disconnect();
  }, [allowed]);

  return (
    <video ref={ref} loop muted playsInline preload="none" poster={poster} className={className} aria-hidden="true">
      {near && allowed && <source src={src} type="video/mp4" />}
    </video>
  );
};
