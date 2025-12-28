
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import Artplayer from 'artplayer';
import artplayerPluginDanmuku from 'artplayer-plugin-danmuku';
import Hls from 'hls.js';
import P2PEngine from 'swarmcloud-hls';

interface VideoPlayerProps {
  url: string;
  poster?: string;
  autoplay?: boolean;
  onEnded?: () => void;
  onNext?: () => void;
  title?: string;
  episodeIndex?: number;
  doubanId?: string;
  vodId?: string | number;
  className?: string;
}

const ICONS = {
    danmaku: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    next: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>'
};

const VideoPlayer = forwardRef((props: VideoPlayerProps, ref) => {
  const { url, poster, autoplay = true, onNext, title, episodeIndex = 0, vodId, className } = props;
  const artRef = useRef<Artplayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useImperativeHandle(ref, () => ({ getInstance: () => artRef.current }));

  const getProgressKey = () => (vodId && episodeIndex !== undefined) ? `cine_progress_${vodId}_${episodeIndex}` : `cine_prog_url_${btoa(url || '').slice(0, 12)}`;

  useEffect(() => {
      if (!containerRef.current || !url) return;
      
      const art = new Artplayer({
          container: containerRef.current!,
          url: url,
          poster: poster,
          autoplay: autoplay,
          volume: 0.8,
          theme: '#22c55e',
          lang: 'zh-cn',
          lock: true,
          fastForward: true,
          autoOrientation: true,
          fullscreen: true,
          fullscreenWeb: true,
          setting: true,
          pip: true,
          moreVideoAttr: { crossOrigin: 'anonymous', playsInline: true, 'webkit-playsinline': true } as any,
          plugins: [
              artplayerPluginDanmuku({ danmuku: [], speed: 10, opacity: 0.8, fontSize: 24, visible: true }),
          ],
          controls: [
             { name: 'next-episode', position: 'left', index: 15, html: ICONS.next, tooltip: '下一集', click: () => onNext?.() },
             { name: 'danmaku-toggle', position: 'right', index: 10, html: ICONS.danmaku, tooltip: '弹幕', click: function() { const p = (this.plugins as any).artplayerPluginDanmuku; p.visible ? p.hide() : p.show(); } }
          ],
          customType: {
              m3u8: function (video: HTMLVideoElement, url: string, art: any) {
                  if (Hls.isSupported()) {
                      if (art.hls) art.hls.destroy();
                      const hls = new Hls({ enableWorker: true, maxBufferLength: 30 });
                      if (P2PEngine && (P2PEngine as any).isSupported()) new (P2PEngine as any)(hls, { p2pEnabled: true });
                      hls.loadSource(url);
                      hls.attachMedia(video);
                      art.hls = hls;
                      art.on('destroy', () => hls.destroy());
                  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                      video.src = url;
                  }
              }
          },
      });

      art.on('ready', () => {
          const saved = parseFloat(localStorage.getItem(getProgressKey()) || '0');
          if (saved > 10 && saved < art.duration - 10) {
              art.seek = saved;
              art.notice.show = `已续播至 ${Math.floor(saved / 60)}分${Math.floor(saved % 60)}秒`;
          }
      });

      art.on('video:timeupdate', () => {
          if (art.currentTime > 10) localStorage.setItem(getProgressKey(), String(art.currentTime));
          if (art.duration > 30 && (art.duration - art.currentTime) < 10) localStorage.removeItem(getProgressKey());
      });

      artRef.current = art;
      return () => { art.destroy(true); };
  }, [url, vodId, episodeIndex]); 

  return (
      <div className={`w-full aspect-video lg:h-full bg-black group relative overflow-hidden ${className || ''}`}>
          <style>{`
            .art-bottom { padding: 0 16px 16px !important; }
            .art-controls {
                background: rgba(10, 10, 10, 0.7) !important;
                backdrop-filter: blur(20px) !important;
                -webkit-backdrop-filter: blur(20px) !important;
                border: 1px solid rgba(255, 255, 255, 0.08) !important;
                border-radius: 16px !important;
                height: 52px !important;
                padding: 0 12px !important;
            }
            .art-progress { 
                bottom: 52px !important; 
                height: 4px !important;
                transition: height 0.2s;
            }
            .art-progress:hover { height: 8px !important; }
            .art-progress-indicator { 
                background: #22c55e !important; 
                width: 14px !important; 
                height: 14px !important; 
                border: 2px solid white !important;
                box-shadow: 0 0 10px rgba(34, 197, 94, 0.5) !important;
            }
            .art-notice { 
                background: rgba(34, 197, 94, 0.95) !important; 
                border-radius: 50px !important; 
                padding: 8px 20px !important; 
                font-weight: 800 !important;
                color: black !important;
            }
          `}</style>
          <div ref={containerRef} className="w-full h-full" />
      </div>
  );
});

export default VideoPlayer;
