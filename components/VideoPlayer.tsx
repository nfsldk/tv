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
}

// Icons for settings
const ICONS = {
    skipStart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="22" height="22"><path d="M5 4h2v16H5V4zm4 1v14l11-7L9 5z"/></svg>',
    skipEnd: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="22" height="22"><path d="M5 5l11 7-11 7V5zm12-1h2v16h-2V4z"/></svg>',
    danmaku: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    next: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
    cast: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z"/></svg>'
};

const SKIP_OPTIONS = [
    { html: '关闭', value: 0 },
    { html: '30秒', value: 30 },
    { html: '45秒', value: 45 },
    { html: '60秒', value: 60 },
    { html: '90秒', value: 90 },
    { html: '120秒', value: 120 },
    { html: '150秒', value: 150 },
    { html: '180秒', value: 180 },
];

const AD_PATTERNS = [
    'googleads', 'doubleclick', '/ad/', 'ad_', '.m3u8_ad', 
    'advertisement', 'ignore=', 'guanggao', 'hecheng', 
    '666666', '555555', '999999', 'hl_ad', 'm3u8_ad', 
    '/tp/ad', 'cs.html', '111111', '222222', '333333', 
    '444444', '777777', '888888', '000000', 'yibo', 'daohang',
    'aybc', 'qq2', 'hls_ad', 'm3u8_a', '989898', '777999', 
    'ts_ad', 'ad.ts', 'ad_0', 'ad_1', 'ad_2', 'xiaoshuo',
    'wangzhuan', 'gif', '.mp4'
];

function filterAdsFromM3U8(m3u8Content: string): string {
    if (!m3u8Content) return '';
    const lines = m3u8Content.split('\n');
    const filteredLines: string[] = [];
    let inAdBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('EXT-X-CUE-OUT') || line.includes('SCTE35') || (line.includes('DATERANGE') && line.includes('SCTE35'))) { 
            inAdBlock = true; 
            continue; 
        }
        if (line.includes('EXT-X-CUE-IN')) { 
            inAdBlock = false; 
            continue; 
        }
        if (line.includes('EXT-X-DISCONTINUITY')) {
            continue;
        }
        if (inAdBlock) continue;
        if (line && !line.startsWith('#')) {
             const lowerUrl = line.toLowerCase();
             if (AD_PATTERNS.some(p => lowerUrl.includes(p))) {
                 if (filteredLines.length > 0 && filteredLines[filteredLines.length - 1].includes('#EXTINF')) {
                     filteredLines.pop();
                 }
                 continue;
             }
        }
        filteredLines.push(lines[i]);
    }
    return filteredLines.join('\n');
}

// ================= API Configuration =================
const DANMAKU_API_BASE = 'https://dm1.laidd.de5.net/5573108';
const API_SEARCH_EPISODES = `${DANMAKU_API_BASE}/api/v2/search/episodes`;
const API_COMMENT = `${DANMAKU_API_BASE}/api/v2/comment`;

// Robust Fetch with Multiple Proxies
const robustFetch = async (url: string, options: RequestInit = {}) => {
    const strategies = [
        // 1. Direct fetch (fastest if CORS allowed)
        async () => {
            const res = await fetch(url, { ...options, referrerPolicy: 'no-referrer' });
            if (!res.ok) throw new Error(`Direct fetch failed: ${res.status}`);
            return res;
        },
        // 2. CorsProxy.io
        async () => {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl, options);
            if (!res.ok) throw new Error(`CorsProxy failed: ${res.status}`);
            return res;
        },
        // 3. AllOrigins (JSON wrapper for text/raw)
        async () => {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl, options);
            if (!res.ok) throw new Error(`AllOrigins failed: ${res.status}`);
            return res;
        },
        // 4. ThingProxy
        async () => {
            const proxyUrl = `https://thingproxy.freeboard.io/fetch/${url}`;
            const res = await fetch(proxyUrl, options);
            if (!res.ok) throw new Error(`ThingProxy failed: ${res.status}`);
            return res;
        },
        // 5. CodeTabs
        async () => {
            const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
            const res = await fetch(proxyUrl, options);
            if (!res.ok) throw new Error(`CodeTabs failed: ${res.status}`);
            return res;
        }
    ];

    let lastError;
    for (const strategy of strategies) {
        try {
            return await strategy();
        } catch (e) {
            lastError = e;
        }
    }
    throw lastError || new Error('All fetch strategies failed');
};

const transformDanmaku = (comments: any[]) => {
    if (!Array.isArray(comments)) return [];
    
    return comments.map((item: any) => {
        if (!item || typeof item !== 'object') return null;

        // DandanPlay format p="time,mode,color,cid"
        const pStr = String(item.p || '');
        const parts = pStr.split(',');
        
        // 1. Time (Mandatory)
        const time = parseFloat(parts[0]);
        if (isNaN(time)) return null;

        // 2. Mode (Default to 1: Scroll R2L if missing)
        // DandanPlay: 1=Scroll, 4=Bottom, 5=Top
        // Artplayer: 0=Scroll, 1=Top, 2=Bottom
        const modeId = parseInt(parts[1]) || 1;
        let mode = 0; 
        if (modeId === 4) mode = 2; // Bottom
        else if (modeId === 5) mode = 1; // Top
        
        // 3. Color
        const colorInt = parseInt(parts[2]);
        let color = '#FFFFFF';
        if (!isNaN(colorInt)) {
            try {
                const hex = (colorInt & 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
                color = `#${hex}`;
            } catch (e) { /* fallback to white */ }
        }

        // 4. Text
        const text = String(item.m || item.message || item.text || '');
        if (!text) return null;
        
        return {
            text: text,
            time: time,
            mode: mode, 
            color: color,
            border: false, // Removed text border
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
};

const fetchDanmaku = async (title: string, episodeIndex: number, videoUrl: string) => {
    if (!title) return [];
    
    // Clean Title: remove season, year, keywords to get the core name
    const cleanTitle = title
        .replace(/第\s*\d+\s*季|Season\s*\d+|S\d+/gi, '')
        .replace(/\(\d{4}\)/g, '')
        .replace(/电视剧|动漫|综艺|movie|tv/gi, '')
        .trim();
    
    const episodeNum = episodeIndex + 1;
    console.log(`[Danmaku] Searching for: "${cleanTitle}" Ep${episodeNum}`);

    try {
        const searchUrl = `${API_SEARCH_EPISODES}?anime=${encodeURIComponent(cleanTitle)}`;
        const res = await robustFetch(searchUrl);
        const data = await res.json();
        
        let episodeId: number | null = null;

        if (data.animes && Array.isArray(data.animes)) {
            // Sort by relevance
            const scoredAnimes = data.animes.map((anime: any) => {
                let score = 0;
                const animeTitle = (anime.animeTitle || '').toLowerCase();
                const targetTitle = cleanTitle.toLowerCase();

                if (animeTitle === targetTitle) score += 100;
                else if (animeTitle.includes(targetTitle)) score += 50;
                
                return { ...anime, score };
            }).sort((a: any, b: any) => b.score - a.score);

            // Iterate ALL anime results to find episode match
            for (const anime of scoredAnimes) {
                if (!anime.episodes || anime.episodes.length === 0) continue;

                // Regex patterns for episode number extraction
                const regexes = [
                    /(?:第|EP|E|Vol\.?|Episode)\s*0*(\d+)/i, // Matches: 第1集, EP01
                    /^\s*0*(\d+)\s*$/, // Matches: 1, 01
                    /\s+0*(\d+)\s+/, // Matches: " 01 "
                ];

                const targetEp = anime.episodes.find((ep: any) => {
                    let t = ep.episodeTitle || '';
                    // CLEAN UP TITLE: Remove [xxx] or 【xxx】 tags which might interfere
                    t = t.replace(/[【\[].*?[】\]]/g, '').trim();

                    // 1. Try Regex matching
                    for (const r of regexes) {
                        const m = t.match(r);
                        if (m && parseInt(m[1], 10) === episodeNum) {
                            return true;
                        }
                    }
                    return false;
                });

                if (targetEp) {
                    episodeId = targetEp.episodeId;
                    console.log(`[Danmaku] Found via Regex in "${anime.animeTitle}": Episode ID ${episodeId}`);
                    break; 
                }
            }

            // Fallback: Index-based match
            if (!episodeId && scoredAnimes.length > 0) {
                const bestAnime = scoredAnimes[0];
                if (bestAnime.episodes && bestAnime.episodes.length > episodeIndex && bestAnime.score > 50) {
                    episodeId = bestAnime.episodes[episodeIndex].episodeId;
                    console.log(`[Danmaku] Fallback Index in "${bestAnime.animeTitle}": Episode ID ${episodeId}`);
                }
            }
        }

        if (episodeId) {
            const commentUrl = `${API_COMMENT}/${episodeId}?withRelated=true&format=json`;
            const cRes = await robustFetch(commentUrl);
            const cData = await cRes.json();
            
            const rawComments = cData.comments || cData;
            if (rawComments) {
                const comments = transformDanmaku(rawComments);
                console.log(`[Danmaku] Loaded ${comments.length} items`);
                return comments;
            }
        }
    } catch (e) {
        console.warn('[Danmaku] Fetch failed', e);
    }
    
    return [];
};

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
};

const VideoPlayer = forwardRef((props: VideoPlayerProps, ref) => {
  const { url, poster, autoplay = true, onEnded, onNext, title, episodeIndex = 0, doubanId } = props;
  const artRef = useRef<Artplayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const latestOnEnded = useRef(onEnded);
  const latestOnNext = useRef(onNext);

  useEffect(() => {
    latestOnEnded.current = onEnded;
    latestOnNext.current = onNext;
  }, [onEnded, onNext]);

  useImperativeHandle(ref, () => ({
      getInstance: () => artRef.current
  }));

  useEffect(() => {
      const observer = new ResizeObserver(() => {
          if (artRef.current && typeof artRef.current.resize === 'function') {
              artRef.current.resize();
          }
      });
      if (containerRef.current) {
          observer.observe(containerRef.current);
      }
      return () => observer.disconnect();
  }, []);

  useEffect(() => {
      if (!containerRef.current || !url) return;
      
      if (artRef.current && artRef.current.destroy) {
          artRef.current.destroy(false);
      }

      let hasSkippedHead = false;
      let isSkippingTail = false;

      const DEFAULT_SKIP_HEAD = 90;
      const DEFAULT_SKIP_TAIL = 120;
      const autoNext = true; 

      let skipHead = parseInt(localStorage.getItem('art_skip_head') || String(DEFAULT_SKIP_HEAD));
      let skipTail = parseInt(localStorage.getItem('art_skip_tail') || String(DEFAULT_SKIP_TAIL));

      let danmakuEnabled = true;

      const art = new Artplayer({
          container: containerRef.current,
          url: url,
          poster: poster,
          autoplay: autoplay,
          volume: 0.7,
          isLive: false,
          muted: false,
          autoMini: true,
          screenshot: false, 
          setting: true,
          pip: true,
          fullscreen: true,
          fullscreenWeb: true,
          
          flip: false,
          playbackRate: true,
          aspectRatio: false,

          airplay: true,
          theme: '#22c55e',
          lang: 'zh-cn',
          lock: true,
          fastForward: true,
          autoOrientation: true,
          moreVideoAttr: {
              crossOrigin: 'anonymous',
              playsInline: true,
              'webkit-playsinline': true,
          },
          plugins: [
              artplayerPluginDanmuku({
                  danmuku: async () => {
                      const data = await fetchDanmaku(title || '', episodeIndex, url);
                      if (data.length > 0 && artRef.current) {
                          artRef.current.notice.show = `弹幕加载成功: ${data.length}条`;
                      }
                      return data;
                  },
                  speed: 10, // Slower speed (larger number = slower)
                  opacity: 0.8, // 80% opacity
                  fontSize: 25,
                  color: '#FFFFFF',
                  mode: 0,
                  margin: [10, '75%'], // Top 1/4 area
                  antiOverlap: true,
                  synchronousPlayback: true, // Sync with video playback speed
                  visible: danmakuEnabled, 
                  emitter: false,
              }),
          ].filter(Boolean),
          controls: [
             {
                name: 'next-episode',
                position: 'left',
                index: 15,
                html: ICONS.next,
                tooltip: '下一集',
                style: { cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '2px' },
                click: function (item: any) { if (latestOnNext.current) latestOnNext.current(); },
             },
             {
                name: 'cast',
                position: 'right',
                index: 25,
                html: ICONS.cast,
                tooltip: '投屏',
                style: { cursor: 'pointer', display: 'flex', alignItems: 'center' },
                click: function (item: any) {
                    this.airplay();
                    this.notice.show = '正在尝试投屏...';
                },
             }
          ],
          settings: [
              {
                  html: '弹幕状态',
                  icon: ICONS.danmaku,
                  tooltip: danmakuEnabled ? '开启' : '关闭',
                  switch: danmakuEnabled,
                  onSwitch: function (item: any) {
                      const nextState = !item.switch;
                      item.tooltip = nextState ? '开启' : '关闭';
                      
                      const plugin = this.plugins.artplayerPluginDanmuku;
                      if (plugin) {
                          if (nextState) plugin.show();
                          else plugin.hide();
                      }
                      
                      if (this.template.$danmuku) {
                          this.template.$danmuku.style.display = nextState ? 'block' : 'none';
                      }

                      // Use `this` to refer to the Artplayer instance for notice
                      this.notice.show = nextState ? '弹幕已开启' : '弹幕已关闭';
                      
                      return nextState;
                  },
              },
              {
                  html: '跳过片头',
                  width: 250,
                  tooltip: skipHead > 0 ? skipHead+'秒' : '关闭',
                  icon: ICONS.skipStart,
                  selector: SKIP_OPTIONS.map(o => ({
                      default: o.value === skipHead,
                      html: o.html,
                      url: o.value
                  })),
                  onSelect: function(item: any) {
                      skipHead = item.url;
                      localStorage.setItem('art_skip_head', String(skipHead));
                      return item.html;
                  }
              },
              {
                  html: '跳过片尾',
                  width: 250,
                  tooltip: skipTail > 0 ? skipTail+'秒' : '关闭',
                  icon: ICONS.skipEnd,
                  selector: SKIP_OPTIONS.map(o => ({
                      default: o.value === skipTail,
                      html: o.html,
                      url: o.value
                  })),
                  onSelect: function(item: any) {
                      skipTail = item.url;
                      localStorage.setItem('art_skip_tail', String(skipTail));
                      return item.html;
                  }
              }
          ],
          customType: {
              m3u8: function (video: HTMLVideoElement, url: string, art: any) {
                  if (Hls.isSupported()) {
                      class CustomLoader extends Hls.DefaultConfig.loader {
                          constructor(config: any) { super(config); }
                          load(context: any, config: any, callbacks: any) {
                              if (context.type === 'manifest' || context.type === 'level') {
                                  const onSuccess = callbacks.onSuccess;
                                  callbacks.onSuccess = function (response: any, stats: any, ctx: any) {
                                      if (response.data && typeof response.data === 'string') {
                                          try { response.data = filterAdsFromM3U8(response.data); } catch (e) {}
                                      }
                                      return onSuccess(response, stats, ctx, null);
                                  };
                              }
                              super.load(context, config, callbacks);
                          }
                      }

                      const hls = new Hls({
                          debug: false,
                          enableWorker: true,
                          maxBufferLength: 60,
                          maxMaxBufferLength: 600,
                          startLevel: -1,
                          autoStartLoad: true,
                          pLoader: CustomLoader,
                      });

                      if (P2PEngine && P2PEngine.isSupported()) {
                          try {
                            new P2PEngine(hls, {
                                maxBufSize: 120 * 1000 * 1000,
                                p2pEnabled: true,
                            }).on('stats', (stats: any) => {
                                // stats collection
                            });
                          } catch (e) {}
                      }

                      hls.loadSource(url);
                      hls.attachMedia(video);
                      art.hls = hls;
                      art.on('destroy', () => hls.destroy());
                  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                      video.src = url;
                  } else {
                      art.notice.show = 'Unsupported playback format: m3u8';
                  }
              }
          },
      });
      
      art.on('ready', () => {
          const progressKey = `cine_progress_${url}`;
          const savedTimeStr = localStorage.getItem(progressKey);
          if (savedTimeStr) {
              const savedTime = parseFloat(savedTimeStr);
              if (!isNaN(savedTime) && savedTime > 5 && savedTime < art.duration - 5) {
                  art.seek = savedTime;
                  art.notice.show = `已恢复至 ${formatTime(savedTime)}`;
              }
          }
      });

      artRef.current = art;

      art.on('video:timeupdate', function() {
          if (art.currentTime > 0) {
              localStorage.setItem(`cine_progress_${url}`, String(art.currentTime));
          }
          const currentSkipHead = parseInt(localStorage.getItem('art_skip_head') || String(DEFAULT_SKIP_HEAD));
          const currentSkipTail = parseInt(localStorage.getItem('art_skip_tail') || String(DEFAULT_SKIP_TAIL));
          
          if (currentSkipHead > 0 && !hasSkippedHead && art.duration > 300) {
             if (art.currentTime < currentSkipHead) {
                art.notice.show = `已跳过片头`;
                art.seek = currentSkipHead;
                art.play();
             }
             hasSkippedHead = true;
          }

          if (currentSkipTail > 0 && !isSkippingTail && art.duration > 300) {
              const rem = art.duration - art.currentTime;
              if (rem > 0 && rem <= currentSkipTail) {
                  isSkippingTail = true;
                  if (autoNext && latestOnNext.current) {
                      art.notice.show = '即将播放下一集';
                      setTimeout(() => { if (latestOnNext.current) latestOnNext.current(); }, 1000); 
                  }
              }
          }
      });

      art.on('seek', () => { isSkippingTail = false; });
      art.on('restart', () => { isSkippingTail = false; hasSkippedHead = false; });
      art.on('video:ended', () => {
         localStorage.removeItem(`cine_progress_${url}`);
         if (autoNext && latestOnNext.current) latestOnNext.current();
      });

      return () => {
          if (artRef.current && artRef.current.destroy) {
              artRef.current.destroy(false);
              artRef.current = null;
          }
      };
  }, [url, autoplay, poster, title, episodeIndex]); 

  return (
      <div className="w-full aspect-video lg:aspect-auto lg:h-[500px] bg-black lg:rounded-xl overflow-hidden shadow-2xl border border-glass-border ring-1 ring-white/10 group relative z-0">
          <style>{`
            .art-danmuku-control, .art-control-danmuku { display: none !important; }
            @media (max-width: 768px) {
                .art-controls .art-control { padding: 0 1px !important; }
                .art-control-volume, .art-control-fullscreenWeb { display: none !important; }
                .art-time { font-size: 11px !important; padding: 0 4px !important; }
            }
          `}</style>
          <div ref={containerRef} className="w-full h-full" />
      </div>
  );
});

export default VideoPlayer;