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
    skipStart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="22" height="22"><path d="M5 4h2v16H5V4zm4 1v14l11-7L9 5z"/></svg>',
    skipEnd: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="22" height="22"><path d="M5 5l11 7-11 7V5zm12-1h2v16h-2V4z"/></svg>',
    danmaku: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    next: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
};

const DANMAKU_API_BASE = 'https://dm1.laidd.de5.net/5573108';
const GLOBAL_PROXY = 'https://daili.laidd.de5.net/?url=';

const robustFetch = async (url: string) => {
    const headers = { 'Accept': 'application/json' };
    const proxyUrl = `${GLOBAL_PROXY}${encodeURIComponent(url)}`;
    try {
        const response = await fetch(proxyUrl, { headers });
        if (response.ok) return response;
    } catch (e) {}
    return null;
};

const fetchDanmaku = async (title: string, episodeIndex: number) => {
    if (!title) return [];
    const episodeNum = episodeIndex + 1;
    try {
        const searchUrl = `${DANMAKU_API_BASE}/api/v2/search/episodes?anime=${encodeURIComponent(title)}&episode=${episodeNum}`;
        const res = await robustFetch(searchUrl);
        if (res) {
            const data = await res.json();
            if (data.animes?.[0]?.episodes?.[0]?.episodeId) {
                const commentRes = await robustFetch(`${DANMAKU_API_BASE}/api/v2/comment/${data.animes[0].episodes[0].episodeId}?withRelated=true&ch_convert=1`);
                if (commentRes) {
                    const comments = await commentRes.json();
                    return (comments.comments || comments).map((c:any) => ({
                        text: c.m, time: parseFloat(c.p.split(',')[0]), color: '#FFFFFF', border: false, mode: 0
                    }));
                }
            }
        }
    } catch(e) {}
    return [];
};

const VideoPlayer = forwardRef((props: VideoPlayerProps, ref) => {
  const { url, poster, autoplay = true, onEnded, onNext, title, episodeIndex = 0, vodId, className } = props;
  const artRef = useRef<Artplayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  
  // Keep props fresh in closure
  useEffect(() => { propsRef.current = props; }, [props]);

  useImperativeHandle(ref, () => ({ getInstance: () => artRef.current }));

  // Initialize Artplayer
  useEffect(() => {
      if (!containerRef.current) return;
      
      // Cleanup previous instance
      if (artRef.current) {
          artRef.current.destroy(false); // False = don't remove container
          artRef.current = null;
      }

      console.log('Initializing Artplayer with URL:', url);

      try {
          const plugins = [];
          if (artplayerPluginDanmuku) {
              plugins.push(artplayerPluginDanmuku({
                  danmuku: async () => {
                      try {
                          return await fetchDanmaku(propsRef.current.title || '', propsRef.current.episodeIndex || 0);
                      } catch (e) { return []; }
                  },
                  speed: 10,
                  opacity: 1,
                  fontSize: 25,
                  color: '#FFFFFF',
                  mode: 0,
                  margin: [10, '75%'],
                  antiOverlap: true,
                  synchronousPlayback: true,
              }));
          }

          const art = new Artplayer({
              container: containerRef.current,
              url: propsRef.current.url || '',
              type: 'm3u8', // Always force m3u8 to trigger customType
              poster: propsRef.current.poster,
              autoplay: propsRef.current.autoplay,
              muted: propsRef.current.autoplay, // Mute autoplay to comply with browser policies
              volume: 0.7,
              isLive: false,
              autoMini: true,
              pip: true,
              setting: true,
              fullscreen: true,
              fullscreenWeb: true,
              theme: '#22c55e',
              lang: 'zh-cn',
              playsInline: true,
              lock: true,
              fastForward: true,
              autoPlayback: true,
              autoOrientation: true,
              airplay: true,
              moreVideoAttr: { 
                  crossOrigin: 'anonymous', 
                  playsInline: true, 
                  'webkit-playsinline': true,
                  'x5-video-player-type': 'h5-page' 
              } as any,
              plugins: plugins,
              controls: [
                 {
                    name: 'next-episode',
                    position: 'left',
                    index: 15,
                    html: ICONS.next,
                    tooltip: '下一集',
                    style: { cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '2px' },
                    click: function () { if (propsRef.current.onNext) propsRef.current.onNext(); },
                 }
              ],
              customType: {
                  m3u8: function (video: HTMLVideoElement, url: string, art: any) {
                      if (!url) {
                          art.notice.show = '请选择播放源';
                          return;
                      }

                      // Destroy old HLS instance
                      if (art.hls) {
                          art.hls.destroy();
                          art.hls = null;
                      }

                      // Check for native HLS support (Safari)
                      if (video.canPlayType('application/vnd.apple.mpegurl')) {
                          video.src = url;
                          return;
                      }

                      // Use Hls.js
                      if (Hls.isSupported()) {
                          const hls = new Hls({ 
                              debug: false, 
                              enableWorker: true,
                              // Increase buffer for stability
                              maxBufferLength: 30,
                              maxMaxBufferLength: 600,
                          });
                          
                          hls.on(Hls.Events.ERROR, function (event, data) {
                               if (data.fatal) {
                                   switch (data.type) {
                                   case Hls.ErrorTypes.NETWORK_ERROR:
                                       console.warn('HLS Network Error, recovering...');
                                       hls.startLoad();
                                       break;
                                   case Hls.ErrorTypes.MEDIA_ERROR:
                                       console.warn('HLS Media Error, recovering...');
                                       hls.recoverMediaError();
                                       break;
                                   default:
                                       console.error('HLS Fatal Error:', data);
                                       art.notice.show = '视频加载失败: ' + data.details;
                                       hls.destroy();
                                       break;
                                   }
                               }
                           });

                          // Try P2P Engine
                          try {
                              // Robust P2P Import Check
                              let EngineClass: any = P2PEngine;
                              if ((P2PEngine as any).default) EngineClass = (P2PEngine as any).default;
                              
                              if (EngineClass && EngineClass.isSupported && EngineClass.isSupported()) {
                                  new EngineClass(hls, {
                                      maxBufSize: 1024 * 1024 * 1024,
                                      p2pEnabled: true,
                                  });
                                  console.log('P2P Engine enabled');
                              }
                          } catch (e) {
                              console.warn('P2P Engine failed to initialize, using standard HLS.', e);
                          }
                          
                          hls.loadSource(url);
                          hls.attachMedia(video);
                          art.hls = hls;
                          
                          art.on('destroy', () => {
                              if (art.hls) {
                                  art.hls.destroy();
                                  art.hls = null;
                              }
                          });
                      } else {
                          art.notice.show = '您的浏览器不支持 HLS 播放';
                      }
                  }
              },
          });

          art.on('video:ended', () => { if (propsRef.current.onNext) propsRef.current.onNext(); });
          art.on('ready', () => {
              console.log('Artplayer ready');
              art.notice.show = '如果是黑屏，请点击播放';
              (art as any).resize(); // Force resize on ready
          });
          
          artRef.current = art;

          // Double force resize for safety
          setTimeout(() => (art as any).resize(), 500);

      } catch (e) {
          console.error("Artplayer init fatal error:", e);
      }

      return () => {
          if (artRef.current) {
              artRef.current.destroy(false);
              artRef.current = null;
          }
      };
  }, []); 

  // Handle URL switching separately
  useEffect(() => {
      const art = artRef.current;
      if (art && url && url !== art.url) {
          console.log('Switching video URL to:', url);
          // Manually show loading
          art.loading.show = true;
          (art as any).switchUrl(url, 'm3u8').then(() => {
              art.loading.show = false;
              art.notice.show = '视频已切换';
              if (art.plugins.artplayerPluginDanmuku) {
                  (art.plugins.artplayerPluginDanmuku as any).load();
              }
              // Attempt play, catching autoplay block
              if (autoplay) {
                  art.play().catch((e: any) => {
                      console.warn('Autoplay blocked:', e);
                      art.notice.show = '点击播放';
                      art.muted = true; // Try muting to allow play
                      art.play().catch(() => {});
                  });
              }
          }).catch((err: any) => {
              art.loading.show = false;
              console.error('Switch URL failed:', err);
              art.notice.show = '加载失败: ' + (err.message || '未知错误');
          });
      }
  }, [url, autoplay]);

  return (
      <div className={`w-full h-full bg-black relative z-0 overflow-hidden ${className || ''}`} style={{ minHeight: '300px' }}>
          <div ref={containerRef} className="w-full h-full absolute inset-0" />
      </div>
  );
});

export default VideoPlayer;