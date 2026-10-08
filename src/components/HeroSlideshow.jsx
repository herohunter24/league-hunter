import { useState, useEffect, useRef } from 'react';
import { HERO_PHOTOS } from '../config/heroPhotos.js';

const N = HERO_PHOTOS.length;

export function HeroSlideshow() {
  const [slotA, setSlotA] = useState({ idx: 0, key: 0, opacity: 1 });
  const [slotB, setSlotB] = useState({ idx: 1, key: 1, opacity: 0 });

  const fgRef   = useRef('a');
  const nextRef = useRef(2);

  const reduced = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );

  useEffect(() => {
    const SHOW = 4000;
    const FADE = 1000;

    const iv = setInterval(() => {
      const fg = fgRef.current;

      if (fg === 'a') {
        setSlotA(s => ({ ...s, opacity: 0 }));
        setSlotB(s => ({ ...s, opacity: 1 }));
      } else {
        setSlotB(s => ({ ...s, opacity: 0 }));
        setSlotA(s => ({ ...s, opacity: 1 }));
      }

      setTimeout(() => {
        const newFg  = fg === 'a' ? 'b' : 'a';
        const nextPh = nextRef.current % N;
        nextRef.current++;
        fgRef.current = newFg;

        if (fg === 'a') {
          setSlotA(s => ({ idx: nextPh, key: s.key + 2, opacity: 0 }));
        } else {
          setSlotB(s => ({ idx: nextPh, key: s.key + 2, opacity: 0 }));
        }
      }, FADE);
    }, SHOW + FADE);

    return () => clearInterval(iv);
  }, []);

  const rm = reduced.current;

  function renderSlot(slot) {
    const photo = HERO_PHOTOS[slot.idx % N];
    return (
      <div key={slot.key} className="hero-slide-wrap" style={{ opacity: slot.opacity }}>
        <img
          src={photo.src}
          alt=""
          className={`hero-slide${rm ? '' : ' hero-slide-pan'}`}
          style={{ objectPosition: photo.objectPosition }}
          draggable="false"
          fetchpriority={slot.opacity === 1 ? 'high' : 'low'}
        />
      </div>
    );
  }

  return (
    <div className="hero-slideshow" aria-hidden="true">
      {renderSlot(slotA)}
      {renderSlot(slotB)}
    </div>
  );
}
