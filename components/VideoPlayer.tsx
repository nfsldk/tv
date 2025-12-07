
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

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
    // Specific icons for Cast
    airPlay: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 22h12l-6-6zM21 3H3c-1.1 0-2 .9-2 2v12h2V5h18v12h2V5c0-1.1-.9-2-2-2z"/></svg>',
    chromecast: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.92-11-11-11zm20-7H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>',
    // Danmaku Icon for Settings Menu
    danmaku: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6h-2v9H6v2c0 .55.45 1 1 1h11l4 4V7c0-.55-.45-1-1-1zm-4 6V3c0-.55-.45-1-1-1H3c-.55 0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/></svg>'
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

/**
 * Filter Ads from M3U8 Content
 */
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
const DANMAKU_API_BASE = 'https://dm1.laidd.de5.net/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';
const SEARCH_API = `${DANMAKU_API_BASE}/api/v2/search/anime?keyword=`;
const MATCH_API = `${DANMAKU_API_BASE}/api/v2/match`;
const COMMENT_API = `${DANMAKU_API_BASE}/api/v2/comment/`;

// Proxy Wrapper to bypass CORS
const proxyFetch = async (url: string, options: RequestInit = {}) => {
    // Add timestamp to prevent caching
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}&_t=${Date.now()}`;
    const res = await fetch(proxyUrl, options);
    return res;
};

const fetchDanmaku = async (title: string, episodeIndex: number) => {
    if (!title) return [];
    
    console.log(`[Danmaku] Start fetching for: ${title} (Index: ${episodeIndex})`);
    let episodeId: number | null = null;
    const currentEpisodeNum = episodeIndex + 1;

    try {
        // --- Strategy 1: Intelligent Match (POST /api/v2/match) ---
        const epStr = currentEpisodeNum < 10 ? `0${currentEpisodeNum}` : `${currentEpisodeNum}`;
        const simulatedFileName = `${title}.S01E${epStr}.mp4`;
        
        console.log(`[Danmaku] Attempting Match with: ${simulatedFileName}`);

        const matchRes = await proxyFetch(MATCH_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileName: simulatedFileName })
        });
        
        if (matchRes.ok) {
            const matchData = await matchRes.json();
            if (matchData.isMatched && matchData.matches && matchData.matches.length > 0) {
                episodeId = matchData.matches[0].episodeId;
                console.log(`[Danmaku] Matched ID via Match API: ${episodeId}`);
            }
        }
    } catch (e) {
        console.warn('[Danmaku] Match API failed, falling back to Search...', e);
    }

    // --- Strategy 2: Fallback Search (GET /api/v2/search/anime) ---
    if (!episodeId) {
        try {
            console.log(`[Danmaku] Fallback to Search API: ${title}`);
            // Try original title first
            let searchUrl = `${SEARCH_API}${encodeURIComponent(title)}`;
            let searchRes = await proxyFetch(searchUrl);
            let searchData = await searchRes.json();

            // If no results, try cleaning the title (remove spaces/punctuation)
            if (!searchData.animes || searchData.animes.length === 0) {
                const cleanTitle = title.replace(/\s+/g, '').replace(/[：:,.，。!！?？]/g, '');
                if (cleanTitle !== title) {
                     console.log(`[Danmaku] Retrying search with clean title: ${cleanTitle}`);
                     searchUrl = `${SEARCH_API}${encodeURIComponent(cleanTitle)}`;
                     searchRes = await proxyFetch(searchUrl);
                     searchData = await searchRes.json();
                }
            }
            
            if (searchData.animes && searchData.animes.length > 0) {
                // Use the first result as the best guess
                const anime = searchData.animes[0]; 
                
                // Try to find episode by index
                // Note: Dandanplay episodes array is usually sorted.
                // We check if the episode index exists in the list
                if (anime.episodes && anime.episodes.length > episodeIndex) {
                    episodeId = anime.episodes[episodeIndex].episodeId;
                    console.log(`[Danmaku] Matched ID via Search API (Index Match): ${episodeId}`);
                } else if (anime.episodes && anime.episodes.length > 0) {
                    // Fallback: If index is out of bounds, maybe it's a movie or just one file?
                    // Just take the first one if we are playing the first episode
                    if (episodeIndex === 0) {
                         episodeId = anime.episodes[0].episodeId;
                         console.log(`[Danmaku] Matched ID via Search API (First Ep Fallback): ${episodeId}`);
                    }
                }
            }
        } catch (e) {
            console.warn('[Danmaku] Search API failed', e);
        }
    }

    if (!episodeId) {
        console.log('[Danmaku] No episode ID found. No comments.');
        return [];
    }

    // --- Strategy 3: Fetch Comments (GET /api/v2/comment/:id) ---
    try {
        const commentUrl = `${COMMENT_API}${episodeId}?withRelated=true&chConvert=1`;
        const commentRes = await proxyFetch(commentUrl);
        const commentData = await commentRes.json();
        
        if (!commentData.comments) return [];

        console.log(`[Danmaku] Loaded ${commentData.comments.length} comments.`);

        return commentData.comments.map((item: any) => {
            const p = item.p.split(',');
            // Dandanplay Mode: 1=scroll(R2L), 4=bottom, 5=top
            // Artplayer Mode: 0=scroll, 1=top, 2=bottom
            let mode = 0;
            const dpMode = parseInt(p[1]);
            if (dpMode === 4) mode = 2;
            else if (dpMode === 5) mode = 1;

            return {
                text: item.m,
                time: parseFloat(p[0]),
                mode: mode, 
                color: '#' + (parseInt(p[2]).toString(16).padStart(6, '0')),
                border: false,
            };
        });

    } catch (e) {
        console.warn('[Danmaku] Comment Fetch Failed:', e);
        return [];
    }
};

const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' + s : s}`;
};

const VideoPlayer = forwardRef((props: VideoPlayerProps, ref) => {
  const { url, poster, autoplay = true, onEnded, onNext, title, episodeIndex = 0, doubanId } = props;
  const artRef = useRef<any>(null);
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

      const Artplayer = (window as any).Artplayer;
      const artplayerPluginDanmuku = (window as any).artplayerPluginDanmuku;
      if (!Artplayer) return;

      let hasSkippedHead = false;
      let isSkippingTail = false;

      const DEFAULT_SKIP_HEAD = 90;
      const DEFAULT_SKIP_TAIL = 120;
      const autoNext = true; 

      let skipHead = parseInt(localStorage.getItem('art_skip_head') || String(DEFAULT_SKIP_HEAD));
      let skipTail = parseInt(localStorage.getItem('art_skip_tail') || String(DEFAULT_SKIP_TAIL));
      let danmakuEnabled = true; // Default ON

      let p2pStats = { total: 0, p2p: 0, http: 0, peers: 0 };
      let lastLoadedBytes = 0;
      let lastTime = Date.now();
      let downloadSpeed = 0;

      const isApple = /Mac|iPod|iPhone|iPad/.test(navigator.platform) || /Macintosh/.test(navigator.userAgent);
      
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
          playbackRate: false,
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
              'x5-video-player-type': 'h5',
              'x5-video-player-fullscreen': 'false',
          },
          plugins: [
              artplayerPluginDanmuku && artplayerPluginDanmuku({
                  danmuku: () => fetchDanmaku(title || '', episodeIndex),
                  speed: 5,
                  opacity: 1,
                  fontSize: 25,
                  color: '#FFFFFF',
                  mode: 0,
                  margin: [10, '25%'],
                  antiOverlap: true,
                  synchronousPlayback: false,
                  visible: danmakuEnabled, 
                  emitter: false, 
              }),
          ].filter(Boolean),
          controls: [
             {
                name: 'next-episode',
                position: 'left',
                index: 11, 
                html: '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M5.536 21.886a1.004 1.004 0 0 0 1.033-.064l13-9a1 1 0 0 0 0-1.644l-13-9A1 1 0 0 0 5 3v18a1 1 0 0 0 .536.886z"/><path d="M19 3a1 1 0 0 0-1 1v16a1 1 0 0 0 2 0V4a1 1 0 0 0-1-1z"/></svg>',
                tooltip: '下一集',
                style: { cursor: 'pointer', display: 'flex', alignItems: 'center', marginLeft: '10px' },
                click: function () { if (latestOnNext.current) latestOnNext.current(); },
             }
          ],
          settings: [
              {
                  html: '弹幕状态',
                  width: 250,
                  icon: ICONS.danmaku,
                  tooltip: danmakuEnabled ? '开启' : '关闭',
                  selector: [
                      { html: '开启', default: danmakuEnabled },
                      { html: '关闭', default: !danmakuEnabled }
                  ],
                  onSelect: function(item: any) {
                      const plugin = art.plugins.artplayerPluginDanmuku;
                      if (!plugin) return item.html;
                      
                      if (item.html === '开启') {
                          plugin.show();
                          plugin.isHide = false;
                          danmakuEnabled = true;
                          art.notice.show = '弹幕已开启';
                      } else {
                          plugin.hide();
                          plugin.isHide = true;
                          danmakuEnabled = false;
                          art.notice.show = '弹幕已关闭';
                      }
                      return item.html;
                  }
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
                  const Hls = (window as any).Hls;
                  const P2PEngine = (window as any).P2PEngine;

                  if (Hls.isSupported()) {
                      class CustomLoader extends Hls.DefaultConfig.loader {
                          constructor(config: any) {
                              super(config);
                          }

                          load(context: any, config: any, callbacks: any) {
                              if (context.type === 'manifest' || context.type === 'level') {
                                  const onSuccess = callbacks.onSuccess;
                                  callbacks.onSuccess = function (response: any, stats: any, ctx: any) {
                                      if (response.data && typeof response.data === 'string') {
                                          try { 
                                              response.data = filterAdsFromM3U8(response.data); 
                                          } catch (e) {
                                              console.warn("Ad filtering failed", e);
                                          }
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

                      if (P2PEngine) {
                          try {
                            new P2PEngine(hls, {
                                maxBufSize: 120 * 1000 * 1000,
                                p2pEnabled: true,
                                logLevel: 'warn',
                            }).on('stats', (stats: any) => {
                                p2pStats.total = stats.totalHTTPDownloaded + stats.totalP2PDownloaded;
                                p2pStats.p2p = stats.totalP2PDownloaded;
                                p2pStats.http = stats.totalHTTPDownloaded;
                                updateP2PDisplay();
                            }).on('peers', (peers: any[]) => {
                                p2pStats.peers = peers.length;
                                updateP2PDisplay();
                            });
                          } catch (e) { console.warn("P2P Init Error", e); }
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

      // Add Cast Control dynamically (Optimized with State Feedback)
      art.controls.add({
        name: 'cast',
        position: 'right',
        index: 20,
        html: isApple ? ICONS.airPlay : ICONS.chromecast,
        tooltip: isApple ? 'AirPlay' : '投屏',
        style: { cursor: 'pointer', display: 'flex', alignItems: 'center', marginRight: '10px' },
        click: function (item: any, event: Event) {
           const video = art.video as any;
           if (isApple && video.webkitShowPlaybackTargetPicker) {
               video.webkitShowPlaybackTargetPicker();
           } else {
               art.notice.show = '请使用浏览器菜单(⋮)中的"投屏"功能';
           }
        },
        mounted: function($el: HTMLElement) {
            const video = art.video as any;
            if (isApple && video.webkitPlaybackTargetAvailability !== undefined) {
                const onAvailabilityChange = (event: any) => {
                    if (event.availability === 'available') {
                        $el.style.display = 'flex';
                    } else {
                        $el.style.display = 'none'; 
                    }
                };
                video.addEventListener('webkitplaybacktargetavailabilitychanged', onAvailabilityChange);

                const onTargetChange = () => {
                     const isConnected = video.webkitCurrentPlaybackTargetIsWireless;
                     if (isConnected) {
                         $el.style.color = '#34d399'; 
                         $el.setAttribute('data-tooltip', 'AirPlay 已连接'); 
                         art.notice.show = 'AirPlay 投屏已连接';
                     } else {
                         $el.style.color = ''; 
                         $el.setAttribute('data-tooltip', 'AirPlay');
                         if (art.notice.show === 'AirPlay 投屏已连接') {
                             art.notice.show = 'AirPlay 投屏已断开';
                         }
                     }
                };
                video.addEventListener('webkitcurrentplaybacktargetiswirelesschanged', onTargetChange);
                if (video.webkitCurrentPlaybackTargetIsWireless) onTargetChange();

            } else if (!isApple) {
                $el.style.display = 'flex';
            }
        }
      });

      // Memory Playback Logic: Restore progress on ready
      art.on('ready', () => {
          const progressKey = `cine_progress_${url}`;
          const savedTimeStr = localStorage.getItem(progressKey);
          if (savedTimeStr) {
              const savedTime = parseFloat(savedTimeStr);
              if (!isNaN(savedTime) && savedTime > 5 && savedTime < art.duration - 5) {
                  art.seek = savedTime;
                  art.notice.show = `已为您恢复至 ${formatTime(savedTime)}`;
              }
          }
      });

      artRef.current = art;

      const p2pEl = document.createElement('div');
      p2pEl.className = 'p2p-stats';
      p2pEl.style.display = 'none';
      p2pEl.innerHTML = `
        <div class="p2p-header"><span class="p2p-status-dot"></span> <span id="p2p-status-text">Connecting...</span></div>
        <div class="p2p-row"><span>Peers</span><strong id="p2p-peers">0</strong></div>
        <div class="p2p-row"><span>Speed</span><strong id="p2p-speed">0 KB/s</strong></div>
        <div class="p2p-row"><span>Ratio</span><strong id="p2p-ratio">0%</strong></div>
        <div class="p2p-bar-container"><div id="p2p-bar-fill" class="p2p-bar-fill"></div></div>
      `;
      if (art.template.$player) {
          art.template.$player.appendChild(p2pEl);
      }

      function updateP2PDisplay() {
          if (p2pStats.total > 0) {
              p2pEl.style.display = 'flex';
              const percent = p2pStats.total > 0 ? Math.round((p2pStats.p2p / p2pStats.total) * 100) : 0;
              const peersEl = document.getElementById('p2p-peers');
              const ratioEl = document.getElementById('p2p-ratio');
              const barFill = document.getElementById('p2p-bar-fill');
              if(peersEl) peersEl.innerText = String(p2pStats.peers);
              if(ratioEl) ratioEl.innerText = `${percent}%`;
              if(barFill) barFill.style.width = `${percent}%`;
          }
      }

      function formatSpeed(bytesPerSec: number) {
        if (bytesPerSec < 1024) return bytesPerSec.toFixed(0) + ' B/s';
        if (bytesPerSec < 1024 * 1024) return (bytesPerSec / 1024).toFixed(0) + ' KB/s';
        return (bytesPerSec / 1024 / 1024).toFixed(1) + ' MB/s';
      }

      const speedInterval = setInterval(() => {
        if(p2pStats.total > 0) {
            const now = Date.now();
            const duration = (now - lastTime) / 1000;
            if(duration >= 1) {
                const diff = p2pStats.total - lastLoadedBytes;
                downloadSpeed = diff / duration;
                lastLoadedBytes = p2pStats.total;
                lastTime = now;
                const speedEl = document.getElementById('p2p-speed');
                if(speedEl) speedEl.innerText = formatSpeed(downloadSpeed);
            }
        }
      }, 1000);
      
      art.on('destroy', () => clearInterval(speedInterval));

      art.on('video:timeupdate', function() {
          if (art.currentTime > 0) {
              localStorage.setItem(`cine_progress_${url}`, String(art.currentTime));
          }

          const currentSkipHead = parseInt(localStorage.getItem('art_skip_head') || String(DEFAULT_SKIP_HEAD));
          const currentSkipTail = parseInt(localStorage.getItem('art_skip_tail') || String(DEFAULT_SKIP_TAIL));
          
          if (currentSkipHead > 0 && !hasSkippedHead && art.duration > 300) {
             if (art.currentTime < currentSkipHead) {
                art.notice.show = `已自动去除片头/广告 (${currentSkipHead}秒)`;
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
                      art.notice.show = '正在为您播放下一集...';
                      setTimeout(() => { if (latestOnNext.current) latestOnNext.current(); }, 500); 
                  } else {
                      art.notice.show = '已跳过片尾';
                      art.seek = art.duration; 
                      art.pause();
                  }
              }
          }
      });

      art.on('seek', () => { isSkippingTail = false; });
      art.on('restart', () => { isSkippingTail = false; hasSkippedHead = false; });
      art.on('video:ended', () => {
         localStorage.removeItem(`cine_progress_${url}`);
         if (autoNext && latestOnNext.current) {
             latestOnNext.current();
         }
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
            .p2p-stats {
                position: absolute;
                top: 20px;
                right: 20px;
                display: flex;
                flex-direction: column;
                gap: 3px;
                padding: 8px 10px;
                border-radius: 8px;
                background: rgba(10, 10, 10, 0.6);
                backdrop-filter: blur(8px);
                -webkit-backdrop-filter: blur(8px);
                border: 1px solid rgba(255,255,255,0.05);
                pointer-events: none;
                z-index: 20;
                transition: opacity 0.3s;
                min-width: 100px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            }
            .p2p-header {
                display: flex;
                align-items: center;
                font-size: 10px;
                color: #23ade5;
                font-weight: 700;
                margin-bottom: 2px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .p2p-status-dot {
                width: 5px;
                height: 5px;
                background-color: #23ade5;
                border-radius: 50%;
                margin-right: 5px;
                box-shadow: 0 0 5px rgba(35, 173, 229, 0.8);
            }
            .p2p-row {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-size: 10px;
                color: rgba(255, 255, 255, 0.7);
                font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
                line-height: 1.4;
            }
            .p2p-row strong { color: #fff; font-weight: 500; }
            .p2p-bar-container {
                width: 100%;
                height: 2px;
                background: rgba(255,255,255,0.1);
                border-radius: 2px;
                margin-top: 4px;
                overflow: hidden;
            }
            .p2p-bar-fill {
                height: 100%;
                background: linear-gradient(90deg, #23ade5, #00ff88);
                width: 0%;
                transition: width 0.5s ease;
            }
            
            /* Hide Danmaku controls forcefully */
            .art-danmuku-control,
            .art-control-danmuku {
                display: none !important;
            }
            
            @media (max-width: 500px) {
                .p2p-stats { top: 10px; right: 10px; padding: 6px 8px; min-width: 85px; }
            }
           `}</style>
          <div ref={containerRef} className="w-full h-full" />
      </div>
  );
});

export default VideoPlayer;
