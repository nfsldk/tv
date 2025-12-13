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

// --- M3U8 Ad Filtering Logic ---
function filterAdsFromM3U8(m3u8Content: string) {
    if (!m3u8Content) return '';
    const lines = m3u8Content.split('\n');
    const filteredLines = [];
    let inAdBlock = false;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('EXT-X-CUE-OUT') || line.includes('SCTE35') || (line.includes('DATERANGE') && line.includes('SCTE35'))) { inAdBlock = true; continue; }
        if (line.includes('EXT-X-CUE-IN')) { inAdBlock = false; continue; }
        if (inAdBlock || line.includes('EXT-X-DISCONTINUITY')) continue;
        filteredLines.push(lines[i]);
    }
    return filteredLines.join('\n');
}

function resolveRelativePaths(content: string, baseUrl: string) {
    const lines = content.split('\n');
    return lines.map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('http') && !trimmed.startsWith('blob:')) {
             try {
                 return new URL(trimmed, baseUrl).href;
             } catch(e) { return line; }
        }
        return line;
    }).join('\n');
}

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
  const isSwitchingRef = useRef(false);
  
  // Keep props fresh
  useEffect(() => { propsRef.current = props; }, [props]);

  useImperativeHandle(ref, () => ({ getInstance: () => artRef.current }));

  // Initialize Artplayer
  useEffect(() => {
      if (!containerRef.current) return;
      
      // CRITICAL FIX: Pass false to destroy() to PREVENT removing the DOM node managed by React.
      // If true is passed, strict mode or re-renders will cause Artplayer to attach to a detached node.
      if (artRef.current) {
          artRef.current.destroy(false);
          artRef.current = null;
      }

      console.log('Initializing Artplayer with URL:', url);

      try {
          const plugins = [];
          
          // Robust Plugin Loading
          let DanmukuPlugin: any = artplayerPluginDanmuku;
          if (typeof artplayerPluginDanmuku !== 'function' && (artplayerPluginDanmuku as any).default) {
              DanmukuPlugin = (artplayerPluginDanmuku as any).default;
          }

          if (DanmukuPlugin) {
              plugins.push(DanmukuPlugin({
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
              type: 'm3u8', 
              poster: propsRef.current.poster,
              autoplay: propsRef.current.autoplay,
              muted: propsRef.current.autoplay, // Muted autoplay to ensure video starts
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
                  m3u8: async function (video: HTMLVideoElement, url: string, art: any) {
                      if (!url) {
                          art.notice.show = '请选择播放源';
                          return;
                      }

                      // Check for native HLS support (Safari)
                      if (video.canPlayType('application/vnd.apple.mpegurl')) {
                          video.src = url;
                          return;
                      }

                      // Use Hls.js
                      if (Hls.isSupported()) {
                          if (art.hls) art.hls.destroy();
                          
                          let playUrl = url;
                          
                          // --- M3U8 Filtering Logic ---
                          // Attempt to fetch, filter ads, and create Blob URL
                          try {
                              // Only filter if not a blob/local url already
                              if (url.startsWith('http')) {
                                  console.log('Attempting to filter ads from M3U8...');
                                  const response = await fetch(url);
                                  if (response.ok) {
                                      const rawText = await response.text();
                                      const filteredText = filterAdsFromM3U8(rawText);
                                      // IMPORTANT: We must resolve relative paths because Blob URL changes the base
                                      const resolvedText = resolveRelativePaths(filteredText, url);
                                      
                                      const blob = new Blob([resolvedText], { type: 'application/vnd.apple.mpegurl' });
                                      playUrl = URL.createObjectURL(blob);
                                      console.log('Ad filtering successful, using Blob URL');
                                  }
                              }
                          } catch (e) {
                              console.warn('Ad filtering fetch failed (likely CORS), falling back to direct URL.', e);
                              playUrl = url;
                          }

                          const hls = new Hls({ 
                              debug: false, 
                              enableWorker: true,
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
                                       art.notice.show = '视频加载失败: ' + (data.details || '未知错误');
                                       hls.destroy();
                                       break;
                                   }
                               }
                           });

                          // Try P2P Engine with robust import handling
                          try {
                              let EngineClass: any = P2PEngine;
                              if (typeof P2PEngine !== 'function' && (P2PEngine as any).default) {
                                  EngineClass = (P2PEngine as any).default;
                              }
                              
                              if (EngineClass && EngineClass.isSupported && EngineClass.isSupported()) {
                                  new EngineClass(hls, {
                                      maxBufSize: 1024 * 1024 * 1024,
                                      p2pEnabled: true,
                                      // CRITICAL FIX: Use the original 'url' (from m3u8 function scope), NOT the 'playUrl' (which might be blob)
                                      // And ignore the argument passed to channelId, because that would be the blob url if filtered
                                      channelId: function(_segmentUrl: string) { return url; } 
                                  });
                                  console.log('P2P Engine enabled');
                              }
                          } catch (e) {
                              console.warn('P2P Engine failed to initialize, using standard HLS.', e);
                          }
                          
                          hls.attachMedia(video);
                          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
                              hls.loadSource(playUrl);
                          });
                          
                          art.hls = hls;
                          
                          art.on('destroy', () => {
                              if (art.hls) {
                                  art.hls.destroy();
                                  art.hls = null;
                              }
                              // Revoke Blob URL to free memory
                              if (playUrl.startsWith('blob:')) {
                                  URL.revokeObjectURL(playUrl);
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
              (art as any).resize();
              
              if (propsRef.current.autoplay) {
                   art.play().catch(e => {
                       console.warn('Autoplay blocked, trying muted', e);
                       art.muted = true;
                       art.play().catch(e2 => console.warn('Muted autoplay blocked', e2));
                   });
              }
          });
          
          artRef.current = art;

          // Force Resize to ensure visibility
          setTimeout(() => { if(artRef.current) (artRef.current as any).resize(); }, 500);

      } catch (e) {
          console.error("Artplayer init fatal error:", e);
      }

      return () => {
          if (artRef.current) {
              artRef.current.destroy(false); // CRITICAL: Do not remove DOM on cleanup
              artRef.current = null;
          }
      };
  }, []); 

  // Handle URL switching
  useEffect(() => {
      const art = artRef.current;
      if (art && url && url !== art.url) {
          if (isSwitchingRef.current) return;
          
          console.log('Switching video URL to:', url);
          isSwitchingRef.current = true;
          art.loading.show = true;
          
          (art as any).switchUrl(url, 'm3u8').then(() => {
              art.loading.show = false;
              art.notice.show = '视频已切换';
              
              if (art.plugins.artplayerPluginDanmuku) {
                  (art.plugins.artplayerPluginDanmuku as any).load();
              }
              
              if (autoplay) {
                  art.play().catch(() => {
                      art.muted = true;
                      art.play();
                  });
              }
          }).catch((err: any) => {
              art.loading.show = false;
              console.error('Switch URL failed:', err);
              art.notice.show = '加载失败: ' + (err.message || '未知错误');
          }).finally(() => {
              isSwitchingRef.current = false;
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