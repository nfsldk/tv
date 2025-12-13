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
        // Start of ad block
        if (line.includes('#EXT-X-CUE-OUT') || line.includes('#EXT-X-SCTE35')) {
            inAdBlock = true;
            continue;
        }
        // End of ad block
        if (line.includes('#EXT-X-CUE-IN')) {
            inAdBlock = false;
            continue;
        }
        if (inAdBlock) continue;
        filteredLines.push(lines[i]);
    }
    return filteredLines.join('\n');
}

function resolveRelativePaths(content: string, baseUrl: string) {
    const lines = content.split('\n');
    return lines.map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('http') && !trimmed.startsWith('blob:') && !trimmed.startsWith('data:')) {
             try { return new URL(trimmed, baseUrl).href; } catch(e) { return line; }
        }
        return line;
    }).join('\n');
}

const robustFetch = async (url: string) => {
    try {
        const response = await fetch(`${GLOBAL_PROXY}${encodeURIComponent(url)}`, { headers: { 'Accept': 'application/json' } });
        if (response.ok) return response;
    } catch (e) {}
    return null;
};

const fetchDanmaku = async (title: string, episodeIndex: number) => {
    if (!title) return [];
    try {
        const searchUrl = `${DANMAKU_API_BASE}/api/v2/search/episodes?anime=${encodeURIComponent(title)}&episode=${episodeIndex + 1}`;
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
  const { url, poster, autoplay = true, className } = props;
  const artRef = useRef<Artplayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const propsRef = useRef(props);
  const isSwitchingRef = useRef(false);
  const retryCount = useRef(0);
  
  useEffect(() => { propsRef.current = props; }, [props]);
  useImperativeHandle(ref, () => ({ getInstance: () => artRef.current }));

  useEffect(() => {
      if (!containerRef.current) return;
      if (artRef.current) { artRef.current.destroy(false); artRef.current = null; }

      try {
          // Resolve Classes safely
          const ArtplayerClass = (Artplayer as any).default || Artplayer;
          const HlsClass = (Hls as any).default || Hls;
          const DanmukuPlugin = (artplayerPluginDanmuku as any).default || artplayerPluginDanmuku;
          const P2PClass = (P2PEngine as any).default || P2PEngine;

          const plugins = [
              DanmukuPlugin({
                  danmuku: async () => {
                      try { return await fetchDanmaku(propsRef.current.title || '', propsRef.current.episodeIndex || 0); } catch (e) { return []; }
                  },
                  speed: 10, opacity: 1, fontSize: 25, color: '#FFFFFF', mode: 0, margin: [10, '75%'], antiOverlap: true, synchronousPlayback: true,
              })
          ];

          const art = new ArtplayerClass({
              container: containerRef.current,
              url: propsRef.current.url || '',
              type: 'm3u8',
              poster: propsRef.current.poster,
              autoplay: propsRef.current.autoplay,
              muted: propsRef.current.autoplay,
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
              moreVideoAttr: { crossOrigin: 'anonymous', playsInline: true, 'webkit-playsinline': true, 'x5-video-player-type': 'h5-page' } as any,
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
                      if (HlsClass.isSupported()) {
                          if (art.hls) art.hls.destroy();
                          
                          let playUrl = url;
                          const originalUrl = url;

                          // Try to fetch and filter M3U8 for ads
                          try {
                              if (url.startsWith('http')) {
                                  const response = await fetch(url);
                                  if (response.ok) {
                                      const text = await response.text();
                                      const filtered = filterAdsFromM3U8(text);
                                      // Only create blob if we actually filtered something to save memory/complexity
                                      if (filtered.length !== text.length) {
                                          const resolved = resolveRelativePaths(filtered, url);
                                          const blob = new Blob([resolved], { type: 'application/vnd.apple.mpegurl' });
                                          playUrl = URL.createObjectURL(blob);
                                          console.log('Ads filtered from M3U8');
                                      }
                                  }
                              }
                          } catch (e) {
                              console.warn('Direct play due to fetch fail:', e);
                          }

                          const hls = new HlsClass({ debug: false, enableWorker: true });
                          
                          // Error Handling
                          hls.on(HlsClass.Events.ERROR, function (event: any, data: any) {
                              if (data.fatal) {
                                  switch (data.type) {
                                      case HlsClass.ErrorTypes.NETWORK_ERROR:
                                          console.log('Network error, recovering...');
                                          hls.startLoad();
                                          break;
                                      case HlsClass.ErrorTypes.MEDIA_ERROR:
                                          console.log('Media error, recovering...');
                                          hls.recoverMediaError();
                                          break;
                                      default:
                                          console.error('Fatal error:', data);
                                          art.notice.show = '播放出错，请切换源';
                                          hls.destroy();
                                          break;
                                  }
                              }
                          });

                          // P2P Setup
                          if (P2PClass && P2PClass.isSupported && P2PClass.isSupported()) {
                              try {
                                  new P2PClass(hls, {
                                      maxBufSize: 1024 * 1024 * 1024,
                                      p2pEnabled: true,
                                      // IMPORTANT: Use original URL for P2P matching, not the Blob URL
                                      channelId: function(_segmentUrl: string) { return originalUrl; }
                                  });
                                  console.log('P2P initialized');
                              } catch(e) { console.warn('P2P init failed', e); }
                          }

                          hls.loadSource(playUrl);
                          hls.attachMedia(video);
                          art.hls = hls;

                          art.on('destroy', () => {
                              if (art.hls) art.hls.destroy();
                              if (playUrl.startsWith('blob:')) URL.revokeObjectURL(playUrl);
                          });
                      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                          video.src = url;
                      } else {
                          art.notice.show = '浏览器不支持 HLS';
                      }
                  }
              },
          });

          art.on('video:ended', () => { if (propsRef.current.onNext) propsRef.current.onNext(); });
          art.on('ready', () => {
              (art as any).resize();
              if (propsRef.current.autoplay) {
                  art.play().catch(() => { art.muted = true; art.play(); });
              }
          });
          
          artRef.current = art;
          setTimeout(() => { if(artRef.current) (artRef.current as any).resize(); }, 500);

      } catch (e) {
          console.error("Artplayer Init Failed:", e);
      }

      return () => {
          if (artRef.current) { artRef.current.destroy(false); artRef.current = null; }
      };
  }, []); 

  // URL Switching
  useEffect(() => {
      const art = artRef.current;
      if (art && url && url !== art.url) {
          if (isSwitchingRef.current) return;
          isSwitchingRef.current = true;
          art.loading.show = true;
          
          (art as any).switchUrl(url, 'm3u8').then(() => {
              art.loading.show = false;
              art.notice.show = '视频切换成功';
              if (art.plugins.artplayerPluginDanmuku) (art.plugins.artplayerPluginDanmuku as any).load();
              if (autoplay) art.play().catch(() => { art.muted = true; art.play(); });
          }).catch((err: any) => {
              art.loading.show = false;
              art.notice.show = '切换失败';
          }).finally(() => {
              isSwitchingRef.current = false;
          });
      }
  }, [url, autoplay]);

  return (
      <div className={`w-full h-full bg-black relative z-0 overflow-hidden ${className || ''}`} style={{ minHeight: '300px' }}>
          <div ref={containerRef} className="w-full h-full absolute inset-0 bg-black" />
      </div>
  );
});

export default VideoPlayer;