import { useState, useEffect, useRef } from 'react';
import { HERO_PHOTOS } from '../config/heroPhotos.js';

const N = HERO_PHOTOS.length;

export function HeroSlideshow() {
  // Two slots: each slot has a photo index and a key (increments on new photo load → remounts img → resets pan)
  const [slotA, setSlotA] = useState({ idx: 0, key: 0, opacity: 1 });
  const [slotB, setSlotB] = useState({ idx: 1, key: 1, opacity: 0 });

  // Use refs for mutable state read inside setInterval without stale closure
  const fgRef   = useRef('a');   // which slot is currently foreground
  const nextRef = useRef(2);     // index of next photo to preload after each swap

  const reduced = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const SHOW = 4000;   // ms each photo is fully visible
    const FADE = 1000;   // ms crossfade duration (must match CSS transition)

    const iv = setInterval(() => {
      const fg = fgRef.current;

      // Step 1: start crossfade — incoming (bg) fades to 1, outgoing (fg) fades to 0
      if (fg === 'a') {
        setSlotA(s => ({ ...s, opacity: 0 }));
        setSlotB(s => ({ ...s, opacity: 1 }));
      } else {
        setSlotB(s => ({ ...s, opacity: 0 }));
        setSlotA(s => ({ ...s, opacity: 1 }));
      }

      // Step 2: after crossfade completes, swap fg and reload old fg slot with next photo
      setTimeout(() => {
        const newFg  = fg === 'a' ? 'b' : 'a';
        const nextPh = nextRef.current % N;
        nextRef.current++;
        fgRef.current = newFg;

        // Reset the OLD fg slot: new photo + incremented key (triggers remount → pan reset)
        if (fg === 'a') {
          setSlotA(s => ({ idx: nextPh, key: s.key + 2, opacity: 0 }));
        } else {
          setSlotB(s => ({ idx: nextPh, key: s.key + 2, opacity: 0 }));
        }
      }, FADE);
    }, SHOW + FADE); // 5000 ms total per photo

    return () => clearInterval(iv);
  }, []);

  const rm = reduced.current;

  function renderSlot(slot) {
    const photo = HERO_PHOTOS[slot.idx % N];
    return (
      <img
        key={slot.key}
        src={photo.src}
        alt=""
        className={`hero-slide${rm ? '' : ' hero-slide-pan'}`}
        style={{ objectPosition: photo.objectPosition, opacity: slot.opacity }}
        fetchpriority="low"
        draggable="false"
      />
    );
  }

  return (
    <div className="hero-slideshow" aria-hidden="true">
      {renderSlot(slotA)}
      {renderSlot(slotB)}
    </div>
  );
}
