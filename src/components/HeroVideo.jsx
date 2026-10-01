import { useRef, useEffect } from 'react';
import { HERO_VIDEO_SRC } from '../config/league.js';

export function HeroVideo() {
  const videoRef = useRef(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls = null;

    async function init() {
      const { default: Hls } = await import('hls.js');
      if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(HERO_VIDEO_SRC);
        hls.attachMedia(video);
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari / iOS native HLS
        video.src = HERO_VIDEO_SRC;
      }
    }

    init();
    return () => { if (hls) hls.destroy(); };
  }, []);

  return (
    <video
      ref={videoRef}
      className="hero-video"
      autoPlay
      loop
      muted
      playsInline
      aria-hidden="true"
      style={{ background: '#0a0a0c' }}
    />
  );
}
