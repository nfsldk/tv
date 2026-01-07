import React, { useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
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

// Icons for settings
const ICONS = {
    skipStart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="22" height="22"><path d="M5 4h2v16H5V4zm4 1v14l11-7L9 5z"/></svg>',
    skipEnd: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="22" height="22"><path d="M5 5l11 7-11 7V5zm12-1h2v16h-2V4z"/></svg>',
    danmaku: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/></svg>',
    next: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>',
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
const API_MATCH = `${DANMAKU_API_BASE}/api/v2/match`;
const API_SEARCH_EPISODES = `${DANMAKU_API_BASE}/api/v2/search/episodes`;
const API_COMMENT = `${DANMAKU_API_BASE}/api/v2/comment`;

// GLOBAL CUSTOM PROXY
const GLOBAL_PROXY = 'https://daili.laidd.de5.net/?url=';

// Memory Cache to speed up switching episodes in same series
const DANMAKU_CACHE = new Map<string, number>(); // title_epIndex -> episodeId

// Robust Fetch: Tries direct first, then proxy
const robustFetch = async (url: string, forceProxy = false) => {
    const headers = { 'Accept': 'application/json' };
    
    // 1. Try Direct Fetch (Fastest) if not forced to proxy
    if (!forceProxy) {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 3000); // 3s fast timeout
            const response = await fetch(url, { headers, signal: controller.signal });
            clearTimeout(id);
            if (response.ok) return response;
        } catch (e) {
            // Direct failed, fall through to proxy
        }
    }

    // 2. Fallback to Proxy
    const proxyUrl = `${GLOBAL_PROXY}${encodeURIComponent(url)}`;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 15000);
    try {
        const response = await fetch(proxyUrl, { headers, signal: controller.signal });
        clearTimeout(id);
        if (!response.ok) throw new Error(`Proxy Fetch failed: ${response.status}`);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

const transformDanmaku = (comments: any[]) => {
    if (!Array.isArray(comments)) return [];
    
    return comments.map((item: any) => {
        if (!item || typeof item !== 'object') return null;

        const pStr = String(item.p || '');
        const parts = pStr.split(',');
        
        const time = parseFloat(parts[0]);
        if (isNaN(time)) return null;

        const modeId = parseInt(parts[1]) || 1;
        let mode = 0; // 0: scroll, 1: top, 2: bottom
        if (modeId === 4) mode = 2; // Dandan Bottom -> Artplayer Bottom
        else if (modeId === 5) mode = 1; // Dandan Top -> Artplayer Top
        
        const colorInt = parseInt(parts[2]);
        let color = '#FFFFFF';
        if (!isNaN(colorInt)) {
            try {
                const hex = (colorInt & 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
                color = `#${hex}`;
            } catch (e) { /* fallback to white */ }
        }

        const text = String(item.m || item.message || item.text || '');
        if (!text) return null;
        
        return {
            text: text,
            time: time,
            mode: mode as any, 
            color: color,
            border: false, 
            style: {
                textShadow: 'rgb(0, 0, 0) 1px 0px 1px, rgb(0, 0, 0) 0px 1px 1px, rgb(0, 0, 0) 0px -1px 1px, rgb(0, 0, 0) -1px 0px 1px',
                fontFamily: 'SimHei, "Microsoft YaHei", sans-serif',
                fontWeight: 'bold',
            },
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);
};

const fetchComments = async (episodeId: string | number) => {
    try {
        // withRelated=true matches other episodes in the same group/season logic sometimes, ch_convert=1 converts Trad to Simp Chinese
        const commentUrl = `${API_COMMENT}/${episodeId}?withRelated=true&ch_convert=1`;
        const res = await robustFetch(commentUrl, false);
        const data = await res.json();
        const rawComments = data.comments || data;
        return transformDanmaku(rawComments);
    } catch (e) {
        console.warn('Failed to fetch comments', e);
        return [];
    }
};

// Smarter Title Cleaning: Preserves Season/Part info, removes Technical tags
const getSearchTerm = (title: string): string => {
    return title
        .replace(/[\(\[\{【](?!Part|Vol|Ep|Season|第).+?[\)\]\}】]/gi, '') // Remove content inside brackets unless it looks like Season info
        .replace(/(?:4k|1080p|720p|hd|bd|web-dl|hdtv|dvdrip|x264|x265|aac|dd5\.1|国语|粤语|中字|双语|完整版|未删减|电视剧|动漫|综艺|movie|tv|\d{4}年|\d{4})/gi, '')
        .trim()
        .replace(/\s+/g, ' '); // Normalize spaces
};

const fetchDanmaku = async (title: string, episodeIndex: number, videoUrl: string) => {
    if (!title) return [];
    
    // 0. Check Cache
    const cacheKey = `${title}_${episodeIndex}`;
    if (DANMAKU_CACHE.has(cacheKey)) {
        console.log('Danmaku Cache Hit');
        return await fetchComments(DANMAKU_CACHE.get(cacheKey)!);
    }

    const cleanTitle = getSearchTerm(title);
    const episodeNum = episodeIndex + 1;
    const epStr = episodeNum < 10 ? `0${episodeNum}` : `${episodeNum}`;
    
    console.log(`Searching Danmaku for: [${cleanTitle}] Ep: ${episodeNum}`);

    let matchedEpisodeId: number | null = null;

    // STRATEGY 1: Match API (Smart Virtual Filename) - Fastest & Most Accurate
    const virtualFiles = [
        `[Unknown] ${cleanTitle} - ${epStr}.mp4`,
        `${cleanTitle} - ${epStr}.mp4`,
        `${cleanTitle} ${epStr}.mp4`,
        `${cleanTitle} 第${epStr}集.mp4`,
        `${cleanTitle} S01E${epStr}.mp4`
    ];

    if (cleanTitle.includes(' ')) {
        virtualFiles.push(`[Unknown] ${cleanTitle.replace(/\s+/g, '.')} - ${epStr}.mp4`);
    }

    for (const fileName of virtualFiles) {
        try {
            // hash=0&length=0 allows matching purely by filename
            const matchUrl = `${API_MATCH}?fileName=${encodeURIComponent(fileName)}&hash=0&length=0`;
            const matchRes = await robustFetch(matchUrl, false);
            const matchData = await matchRes.json();
            
            if (matchData.isMatched && matchData.matches && matchData.matches.length > 0) {
                matchedEpisodeId = matchData.matches[0].episodeId;
                console.log(`Danmaku Matched via filename: ${fileName} -> ID: ${matchedEpisodeId}`);
                break;
            }
        } catch (e) { /* continue */ }
    }

    // STRATEGY 2: Smart Search Fallback (Fuzzy Title + Episode) - Handles Weird Filenames
    if (!matchedEpisodeId) {
        try {
            console.log('Match failed, trying Smart Search...');
            const searchUrl = `${API_SEARCH_EPISODES}?anime=${encodeURIComponent(cleanTitle)}&episode=${episodeNum}`;
            const searchRes = await robustFetch(searchUrl, false);
            const searchData = await searchRes.json();

            if (searchData.animes && searchData.animes.length > 0) {
                // Heuristic: The first anime result is usually the most relevant for a specific query
                const bestAnime = searchData.animes[0];
                
                // If API returns episode list, pick the first one (since we filtered by episode param)
                if (bestAnime.episodes && bestAnime.episodes.length > 0) {
                    matchedEpisodeId = bestAnime.episodes[0].episodeId;
                    console.log(`Danmaku Matched via Search: ${bestAnime.animeTitle} Ep:${bestAnime.episodes[0].episodeTitle}`);
                }
            }
        } catch (e) {
            console.warn('Smart Search failed', e);
        }
    }

    if (matchedEpisodeId) {
        DANMAKU_CACHE.set(cacheKey, matchedEpisodeId);
        return await fetchComments(matchedEpisodeId);
    }
    
    return [];
};

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
};

const VideoPlayer = forwardRef((props: VideoPlayerProps, ref) => {
  const { url, poster, autoplay = true, onEnded, onNext, title, episodeIndex = 0, doubanId, vodId, className } = props;
  const artRef = useRef<Artplayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const latestOnEnded = useRef(onEnded);
  const latestOnNext = useRef(onNext);

  // Generate a progress key that is consistent across different sources for the same content
  const progressKey = useMemo(() => {
      return (vodId && episodeIndex !== undefined) 
        ? `cine_progress_${vodId}_${episodeIndex}` 
        : `cine_progress_${url}`;
  }, [vodId, episodeIndex, url]);

  useEffect(() => {
    latestOnEnded.current = onEnded;
    latestOnNext.current = onNext;
  }, [onEnded, onNext]);

  useImperativeHandle(ref, () => ({
      getInstance: () => artRef.current
  }));

  // === Custom Auto Mini (PiP) Logic for Mobile Optimization ===
  useEffect(() => {
      if (!containerRef.current) return;

      const observer = new IntersectionObserver((entries) => {
          const entry = entries[0];
          const art = artRef.current;
          if (!art) return;

          // If container is visible (at least 30%)
          if (entry.isIntersecting) {
              // Automatically return to player if in mini mode
              if (art.mini) {
                  art.mini = false;
              }
          } 
          // If container is hidden (scrolled away)
          else {
              // Automatically go to mini mode if playing and not already in another mode
              if (art.playing && !art.pip && !art.fullscreen && !art.mini) {
                  art.mini = true;
              }
          }
      }, {
          threshold: 0.3, // Trigger when 30% of the player is visible/hidden
      });

      observer.observe(containerRef.current);

      return () => observer.disconnect();
  }, []);

  useEffect(() => {
      const observer = new ResizeObserver(() => {
          if (artRef.current && typeof (artRef.current as any).resize === 'function') {
              (artRef.current as any).resize();
          }
      });
      if (containerRef.current) {
          observer.observe(containerRef.current);
      }
      return () => observer.disconnect();
  }, []);

  useEffect(() => {
      if (!containerRef.current || !url) return;
      
      // Force cleanup of existing instance
      if (artRef.current && artRef.current.destroy) {
           try {
              if (artRef.current.mini) artRef.current.mini = false;
              if (artRef.current.pip) artRef.current.pip = false;
          } catch(e){}
          artRef.current.destroy(true);
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
          autoMini: false, // DISABLED BUILT-IN: Use custom IntersectionObserver for better mobile control
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
          } as any,
          plugins: [
              artplayerPluginDanmuku({
                  danmuku: async () => {
                      try {
                          const data = await fetchDanmaku(title || '', episodeIndex, url);
                          if (artRef.current) {
                               if (data.length > 0) {
                                   artRef.current.notice.show = `弹幕加载成功: ${data.length}条`;
                               } else {
                                   // artRef.current.notice.show = '未找到匹配弹幕';
                               }
                          }
                          return data;
                      } catch (e) {
                          console.error("Danmaku error", e);
                          return [];
                      }
                  },
                  speed: 10,
                  opacity: 1, 
                  fontSize: 25,
                  color: '#FFFFFF',
                  mode: 0,
                  margin: [10, '75%'],
                  antiOverlap: true,
                  synchronousPlayback: true,
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
                      
                      const plugin = (this.plugins as any).artplayerPluginDanmuku;
                      if (plugin) {
                          if (nextState) plugin.show();
                          else plugin.hide();
                      }
                      
                      if (this.template.$danmuku) {
                          this.template.$danmuku.style.display = nextState ? 'block' : 'none';
                      }

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
                          pLoader: CustomLoader as any,
                      });

                      if (P2PEngine && (P2PEngine as any).isSupported()) {
                          try {
                            new (P2PEngine as any)(hls, {
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
          // Restore progress from shared key
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
              localStorage.setItem(progressKey, String(art.currentTime));
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
         localStorage.removeItem(progressKey);
         if (autoNext && latestOnNext.current) latestOnNext.current();
      });

      return () => {
          if (artRef.current) {
              // Critical Fix: Save progress exactly before destruction (e.g. source switching)
              try {
                  const currentTime = artRef.current.currentTime;
                  if (currentTime > 0) {
                       localStorage.setItem(progressKey, String(currentTime));
                  }
              } catch(e) {}

              try {
                  if (artRef.current.mini) artRef.current.mini = false;
                  if (artRef.current.pip) artRef.current.pip = false;
                  if (artRef.current.fullscreen) artRef.current.fullscreen = false;
              } catch (e) {
                   console.warn("Error cleaning up player modes:", e);
              }
              
              if (artRef.current.destroy) {
                  artRef.current.destroy(true); // true = remove DOM and clean up events
                  artRef.current = null;
              }
          }
      };
  }, [url, autoplay, poster, title, episodeIndex, vodId]); 

  // Handle URL changes via switchUrl (Seamless Playback)
  useEffect(() => {
      const art = artRef.current;
      if (art && url && url !== art.url) {
          art.switchUrl(url).then(() => {
              // Reload Danmaku with new props
              const danmakuPlugin = (art.plugins as any).artplayerPluginDanmuku;
              if (danmakuPlugin && typeof danmakuPlugin.load === 'function') {
                  danmakuPlugin.load();
              }
              art.notice.show = '';
          });
      }
  }, [url]);

  return (
      <div className={`w-full aspect-video lg:aspect-auto lg:h-full bg-black group relative z-0 ${className || ''}`}>
          <style>{`
            .art-danmuku-control, .art-control-danmuku { display: none !important; }
            .art-layer-mini { z-index: 100 !important; }
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