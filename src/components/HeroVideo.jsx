import { useRef, useEffect } from 'react';
import Hls from 'hls.js';
import { HERO_VIDEO_SRC } from '../config/league.js';

export function HeroVideo() {
  const videoRef = useRef(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let hls = null;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = HERO_VIDEO_SRC;
    } else if (Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(HERO_VIDEO_SRC);
      hls.attachMedia(video);
    }
    return () => { if (hls) hls.destroy(); };
  }, []);
  return <video ref={videoRef} className="hero-video" autoPlay loop muted playsInline aria-hidden="true" />;
}
