import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

interface VideoPlayerProps {
  url: string;
  poster?: string;
  autoplay?: boolean;
  onEnded?: () => void;
  onNext?: () => void;
}

// Icons for settings
const ICONS = {
    autoPlay: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="22" height="22"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>',
    skipStart: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="22" height="22"><path d="M5 4h2v16H5V4zm4 1v14l11-7L9 5z"/></svg>',
    skipEnd: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff" width="22" height="22"><path d="M5 5l11 7-11 7V5zm12-1h2v16h-2V4z"/></svg>',
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
    'ts_ad', 'ad.ts', 'ad_0', 'ad_1', 'ad_2', 'xiaoshuo'
];

// Refined Ad Filter using Buffer Strategy & Tag Filtering
function filterAdsFromM3U8(m3u8Content: string): string {
    if (!m3u8Content) return '';
    const lines = m3u8Content.split('\n');
    const filteredLines: string[] = [];
    
    let inAdBlock = false;
    let segmentBuffer: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // 1. Standard Ad Block Detection (User requested strategy)
        if (line.includes('EXT-X-CUE-OUT') || line.includes('SCTE35') || (line.includes('DATERANGE') && line.includes('SCTE35'))) {
            inAdBlock = true;
            continue; 
        }
        if (line.includes('EXT-X-CUE-IN')) {
            inAdBlock = false;
            continue; 
        }

        // 2. Aggressive Discontinuity Removal
        // Removing discontinuities helps prevent playback freezing when ad segments are removed
        if (line.includes('EXT-X-DISCONTINUITY')) {
            continue;
        }

        if (line.startsWith('#')) {
            // Check for Global Tags that should not be buffered with segments
             if (line.startsWith('#EXTM3U') || 
                line.startsWith('#EXT-X-VERSION') || 
                line.startsWith('#EXT-X-TARGETDURATION') ||
                line.startsWith('#EXT-X-MEDIA-SEQUENCE') ||
                line.startsWith('#EXT-X-PLAYLIST-TYPE') || 
                line.startsWith('#EXT-X-ENDLIST') ||
                line.startsWith('#EXT-X-INDEPENDENT-SEGMENTS')) { 
                
                // Flush buffer before global tag
                if (segmentBuffer.length > 0) {
                     filteredLines.push(...segmentBuffer);
                     segmentBuffer = [];
                }
                filteredLines.push(line);
            } else {
                // Segment Metadata (EXTINF, EXT-X-KEY, etc.)
                segmentBuffer.push(line);
            }
        } else {
            // URL Line
            const lowerUrl = line.toLowerCase();
            const isPatternAd = AD_PATTERNS.some(p => lowerUrl.includes(p));
            
            if (inAdBlock || isPatternAd) {
                // Drop this segment (URL + buffered metadata)
                segmentBuffer = [];
            } else {
                // Keep content: Flush buffer then URL
                if (segmentBuffer.length > 0) {
                    filteredLines.push(...segmentBuffer);
                }
                filteredLines.push(line);
                segmentBuffer = [];
            }
        }
    }
    // Flush trailing
    if (segmentBuffer.length > 0) filteredLines.push(...segmentBuffer);
    
    return filteredLines.join('\n');
}

const VideoPlayer = forwardRef<unknown, VideoPlayerProps>(({ url, poster, autoplay = true, onEnded, onNext }, ref) => {
  const artRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Store callbacks in refs to prevent useEffect triggers on parent re-renders
  const latestOnEnded = useRef(onEnded);
  const latestOnNext = useRef(onNext);

  // Update refs when props change
  useEffect(() => {
    latestOnEnded.current = onEnded;
    latestOnNext.current = onNext;
  }, [onEnded, onNext]);

  useImperativeHandle(ref, () => ({
      getInstance: () => artRef.current
  }));

  // Handle Resize
  useEffect(() => {
      const observer = new ResizeObserver(() => {
          if (artRef.current) {
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
      
      if (artRef.current) {
          artRef.current.destroy(false);
      }

      const Artplayer = (window as any).Artplayer;
      if (!Artplayer) return;

      let hasSkippedHead = false;
      let isSkippingTail = false;

      // Default Values matching logic
      const DEFAULT_SKIP_HEAD = 90;
      const DEFAULT_SKIP_TAIL = 120;
      const DEFAULT_AUTO_NEXT = '1';

      // Initialize UI values
      let skipHead = parseInt(localStorage.getItem('art_skip_head') || String(DEFAULT_SKIP_HEAD));
      let skipTail = parseInt(localStorage.getItem('art_skip_tail') || String(DEFAULT_SKIP_TAIL));
      let autoNext = (localStorage.getItem('art_auto_next') || DEFAULT_AUTO_NEXT) !== '0'; 

      let p2pStats = { total: 0, p2p: 0, http: 0, peers: 0 };
      let lastLoadedBytes = 0;
      let lastTime = Date.now();
      let downloadSpeed = 0;

      const art = new Artplayer({
          container: containerRef.current,
          url: url,
          poster: poster,
          autoplay: autoplay,
          volume: 0.7,
          isLive: false,
          muted: false,
          autoMini: true,
          screenshot: true,
          setting: true,
          pip: true,
          fullscreen: true,
          fullscreenWeb: true,
          flip: true,
          playbackRate: true,
          aspectRatio: true,
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
                  html: '自动下一集',
                  width: 250,
                  icon: ICONS.autoPlay,
                  tooltip: autoNext ? '开启' : '关闭',
                  switch: autoNext,
                  onSwitch: function (item: any) {
                      autoNext = !item.switch;
                      item.tooltip = autoNext ? '开启' : '关闭';
                      localStorage.setItem('art_auto_next', autoNext ? '1' : '0');
                      return !item.switch;
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
                  const Hls = (window as any).Hls;
                  const P2PEngine = (window as any).P2PEngine;

                  if (Hls.isSupported()) {
                      class CustomHlsJsLoader extends Hls.DefaultConfig.loader {
                          constructor(config: any) { super(config); }
                          load(context: any, config: any, callbacks: any) {
                              if (context.type === 'manifest' || context.type === 'level') {
                                  const onSuccess = callbacks.onSuccess;
                                  callbacks.onSuccess = function (response: any, stats: any, ctx: any) {
                                      if (response.data && typeof response.data === 'string') {
                                          try { 
                                              response.data = filterAdsFromM3U8(response.data); 
                                          } catch (e) { console.error('Error filtering M3U8', e); }
                                      }
                                      return onSuccess(response, stats, ctx, null);
                                  };
                              }
                              super.load(context, config, callbacks);
                          }
                      }

                      const hls = new Hls({
                          loader: CustomHlsJsLoader,
                          debug: false,
                          enableWorker: true,
                          startLevel: -1,
                          capLevelToPlayerSize: false,
                          autoStartLoad: true,
                          xhrSetup: function (xhr: XMLHttpRequest, url: string) {
                              const lowerUrl = url.toLowerCase();
                              if (AD_PATTERNS.some(pattern => lowerUrl.includes(pattern))) {
                                  xhr.abort();
                                  return;
                              }
                          }
                      });

                      if (P2PEngine) {
                          try {
                            const p2pEngine = new P2PEngine(hls, {
                                maxBufSize: 120 * 1000 * 1000,
                                p2pEnabled: true,
                                logLevel: 'warn',
                            });
                            p2pEngine.on('stats', (stats: any) => {
                                p2pStats.total = stats.totalHTTPDownloaded + stats.totalP2PDownloaded;
                                p2pStats.p2p = stats.totalP2PDownloaded;
                                p2pStats.http = stats.totalHTTPDownloaded;
                                updateP2PDisplay();
                            });
                            p2pEngine.on('peers', (peers: any[]) => {
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

      artRef.current = art;

      // --- P2P UI ---
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

      // Skip Logic
      art.on('video:timeupdate', function() {
          // IMPORTANT: Read defaults here as well to match UI
          const currentSkipHead = parseInt(localStorage.getItem('art_skip_head') || String(DEFAULT_SKIP_HEAD));
          const currentSkipTail = parseInt(localStorage.getItem('art_skip_tail') || String(DEFAULT_SKIP_TAIL));
          const isAutoNext = (localStorage.getItem('art_auto_next') || DEFAULT_AUTO_NEXT) !== '0';

          // Skip Intro
          if (currentSkipHead > 0 && !hasSkippedHead && art.duration > 300) {
             if (art.currentTime < currentSkipHead) {
                art.notice.show = `已自动去除片头/广告 (${currentSkipHead}秒)`;
                art.seek = currentSkipHead;
                art.play();
             }
             hasSkippedHead = true;
          }

          // Skip Outro
          if (currentSkipTail > 0 && !isSkippingTail && art.duration > 300) {
              const rem = art.duration - art.currentTime;
              if (rem > 0 && rem <= currentSkipTail) {
                  isSkippingTail = true;
                  if (isAutoNext && latestOnNext.current) {
                      art.notice.show = '正在为您播放下一集...';
                      // Use a timeout to give UI feedback before switching
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
         const isAutoNext = (localStorage.getItem('art_auto_next') || DEFAULT_AUTO_NEXT) !== '0';
         if (isAutoNext && latestOnNext.current) {
             latestOnNext.current();
         }
      });

      return () => {
          if (artRef.current) artRef.current.destroy(false);
      };
      
      // Removed onEnded and onNext from dependency array to prevent re-init
  }, [url, autoplay, poster]); 

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
            @media (max-width: 500px) {
                .p2p-stats { top: 10px; right: 10px; padding: 6px 8px; min-width: 85px; }
            }
           `}</style>
          <div ref={containerRef} className="w-full h-full" />
      </div>
  );
});

export default VideoPlayer;