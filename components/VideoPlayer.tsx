
import React, { useEffect, useRef, forwardRef, useImperativeHandle, useState } from 'react';
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
    commentAdd: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="22" height="22"><path d="M12 2C6.477 2 2 6.477 2 12c0 1.821.487 3.53 1.338 5L2 22l5-1.338C8.47 21.513 10.179 22 12 22c5.523 0 10-4.477 10-10S17.523 2 12 2zm1 14h-2v-3H8v-2h3V8h2v3h3v2h-3v3z"/></svg>',
    send: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>'
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
        if (inAdBlock || line.includes('EXT-X-DISCONTINUITY')) continue;
        if (line && !line.startsWith('#')) {
             const lowerUrl = line.toLowerCase();
             if (AD_PATTERNS.some(p => lowerUrl.includes(p))) {
                 if (filteredLines.length > 0 && filteredLines[filteredLines.length - 1].includes('#EXTINF')) filteredLines.pop();
                 continue;
             }
        }
        filteredLines.push(lines[i]);
    }
    return filteredLines.join('\n');
}

const DANMAKU_API_BASE = 'https://dm.laibo123.dpdns.org/5573108';
const API_MATCH = `${DANMAKU_API_BASE}/api/v2/match`;
const API_SEARCH_EPISODES = `${DANMAKU_API_BASE}/api/v2/search/episodes`;
const API_COMMENT = `${DANMAKU_API_BASE}/api/v2/comment`;
const GLOBAL_PROXY = 'https://daili.laibo123.dpdns.org/?url=';
const DANMAKU_CACHE = new Map<string, number>();

const robustFetch = async (url: string, forceProxy = false) => {
    const headers = { 'Accept': 'application/json' };
    if (!forceProxy) {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 3000);
            const response = await fetch(url, { headers, signal: controller.signal });
            clearTimeout(id);
            if (response.ok) return response;
        } catch (e) {}
    }
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
        let mode = 0; 
        if (modeId === 4) mode = 2; else if (modeId === 5) mode = 1; 
        const colorInt = parseInt(parts[2]);
        let color = '#FFFFFF';
        if (!isNaN(colorInt)) {
            try {
                const hex = (colorInt & 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
                color = `#${hex}`;
            } catch (e) {}
        }
        const text = String(item.m || item.message || item.text || '');
        if (!text) return null;
        return {
            text: text, time: time, mode: mode as any, color: color, border: false, 
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
        const commentUrl = `${API_COMMENT}/${episodeId}?withRelated=true&ch_convert=1`;
        const res = await robustFetch(commentUrl, false);
        const data = await res.json();
        const rawComments = data.comments || data;
        return transformDanmaku(rawComments);
    } catch (e) { return []; }
};

const getSearchTerm = (title: string): string => {
    return title
        .replace(/[\(\[\{【](?!Part|Vol|Ep|Season|第).+?[\)\]\}】]/gi, '')
        .replace(/(?:4k|1080p|720p|hd|bd|web-dl|hdtv|dvdrip|x264|x265|aac|dd5\.1|国语|粤语|中字|双语|完整版|未删减|电视剧|动漫|综艺|movie|tv|\d{4}年|\d{4})/gi, '')
        .trim()
        .replace(/\s+/g, ' '); 
};

const fetchDanmaku = async (title: string, episodeIndex: number, videoUrl: string) => {
    if (!title) return [];
    const cacheKey = `${title}_${episodeIndex}`;
    if (DANMAKU_CACHE.has(cacheKey)) return await fetchComments(DANMAKU_CACHE.get(cacheKey)!);
    const cleanTitle = getSearchTerm(title);
    const episodeNum = episodeIndex + 1;
    const epStr = episodeNum < 10 ? `0${episodeNum}` : `${episodeNum}`;
    let matchedEpisodeId: number | null = null;
    const virtualFiles = [
        `[Unknown] ${cleanTitle} - ${epStr}.mp4`,
        `${cleanTitle} - ${epStr}.mp4`,
        `${cleanTitle} ${epStr}.mp4`,
        `${cleanTitle} 第${epStr}集.mp4`,
        `${cleanTitle} S01E${epStr}.mp4`
    ];
    if (cleanTitle.includes(' ')) virtualFiles.push(`[Unknown] ${cleanTitle.replace(/\s+/g, '.')} - ${epStr}.mp4`);
    for (const fileName of virtualFiles) {
        try {
            const matchUrl = `${API_MATCH}?fileName=${encodeURIComponent(fileName)}&hash=0&length=0`;
            const matchRes = await robustFetch(matchUrl, false);
            const matchData = await matchRes.json();
            if (matchData.isMatched && matchData.matches && matchData.matches.length > 0) {
                matchedEpisodeId = matchData.matches[0].episodeId;
                break;
            }
        } catch (e) {}
    }
    if (!matchedEpisodeId) {
        try {
            const searchUrl = `${API_SEARCH_EPISODES}?anime=${encodeURIComponent(cleanTitle)}&episode=${episodeNum}`;
            const searchRes = await robustFetch(searchUrl, false);
            const searchData = await searchRes.json();
            if (searchData.animes && searchData.animes.length > 0) {
                const bestAnime = searchData.animes[0];
                if (bestAnime.episodes && bestAnime.episodes.length > 0) matchedEpisodeId = bestAnime.episodes[0].episodeId;
            }
        } catch (e) {}
    }
    if (matchedEpisodeId) {
        DANMAKU_CACHE.set(cacheKey, matchedEpisodeId);
        return await fetchComments(matchedEpisodeId);
    }
    return [];
};

const VideoPlayer = forwardRef((props: VideoPlayerProps, ref) => {
  const { url, poster, autoplay = true, onEnded, onNext, title, episodeIndex = 0, vodId, className } = props;
  const artRef = useRef<Artplayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showDanmakuInput, setShowDanmakuInput] = useState(false);
  const [danmakuText, setDanmakuText] = useState('');
  
  const propsRef = useRef(props);
  useEffect(() => { propsRef.current = props; }, [props]);

  const latestOnNext = useRef(onNext);
  useEffect(() => { latestOnNext.current = onNext; }, [onNext]);

  useImperativeHandle(ref, () => ({ getInstance: () => artRef.current }));

  const handleSendDanmaku = () => {
    if (!danmakuText.trim() || !artRef.current) return;
    const art = artRef.current;
    const danmakuPlugin = (art.plugins as any).artplayerPluginDanmuku;
    if (danmakuPlugin) {
        danmakuPlugin.emit({ 
            text: danmakuText, 
            color: '#22c55e', 
            style: { 
                border: '1px solid #22c55e', 
                borderRadius: '4px', 
                padding: '2px 8px', 
                fontWeight: 'bold', 
                backgroundColor: 'rgba(34, 197, 94, 0.1)' 
            } 
        });
        art.notice.show = '弹幕已发射';
        setDanmakuText('');
        setShowDanmakuInput(false);
    }
  };

  useEffect(() => {
      const art = artRef.current;
      if (art && url && url !== art.url) {
          art.switchUrl(url).then(() => {
              const danmakuPlugin = (art.plugins as any).artplayerPluginDanmuku;
              if (danmakuPlugin && typeof danmakuPlugin.load === 'function') {
                  danmakuPlugin.load();
              }
              const progressKey = (vodId && episodeIndex !== undefined) ? `cine_progress_${vodId}_${episodeIndex}` : `cine_progress_${url}`;
              const savedTimeStr = localStorage.getItem(progressKey);
              if (savedTimeStr) {
                  const savedTime = parseFloat(savedTimeStr);
                  if (!isNaN(savedTime) && savedTime > 5) art.seek = savedTime;
              }
          });
      }
  }, [url, episodeIndex, vodId]);

  useEffect(() => {
      if (!containerRef.current || !url) return;
      
      const initPlayer = () => {
          const DEFAULT_SKIP_HEAD = 90, DEFAULT_SKIP_TAIL = 120;
          let skipHead = parseInt(localStorage.getItem('art_skip_head') || String(DEFAULT_SKIP_HEAD));
          let skipTail = parseInt(localStorage.getItem('art_skip_tail') || String(DEFAULT_SKIP_TAIL));
          let danmakuEnabled = true;

          const art = new Artplayer({
              container: containerRef.current!, url: url, poster: poster, autoplay: autoplay, volume: 0.7,
              isLive: false, muted: false, autoMini: false, screenshot: false, setting: true, pip: true, fullscreen: true, fullscreenWeb: true,
              theme: '#22c55e', lang: 'zh-cn', lock: true, fastForward: true, autoOrientation: true,
              moreVideoAttr: { crossOrigin: 'anonymous', playsInline: true, 'webkit-playsinline': true } as any,
              plugins: [
                  artplayerPluginDanmuku({
                      danmuku: async () => await fetchDanmaku(propsRef.current.title || '', propsRef.current.episodeIndex || 0, propsRef.current.url),
                      speed: 10, opacity: 0.8, fontSize: 20, color: '#FFFFFF', mode: 0, margin: [10, '75%'],
                      antiOverlap: true, synchronousPlayback: true, visible: danmakuEnabled, emitter: false,
                  }),
              ],
              controls: [
                 { name: 'next-episode', position: 'left', index: 15, html: ICONS.next, tooltip: '下一集', click: function () { if (latestOnNext.current) latestOnNext.current(); } },
                 { name: 'danmaku-input-toggle', position: 'left', index: 14, html: ICONS.commentAdd, tooltip: '发弹幕', click: function () { setShowDanmakuInput(prev => !prev); } }
              ],
              settings: [
                  { html: '弹幕状态', icon: ICONS.danmaku, tooltip: danmakuEnabled ? '开启' : '关闭', switch: danmakuEnabled, onSwitch: function (item: any) {
                          const nextState = !item.switch;
                          item.tooltip = nextState ? '开启' : '关闭';
                          const plugin = (this.plugins as any).artplayerPluginDanmuku;
                          if (plugin) { if (nextState) plugin.show(); else plugin.hide(); }
                          if (this.template.$danmuku) this.template.$danmuku.style.display = nextState ? 'block' : 'none';
                          return nextState;
                      }
                  },
                  { html: '跳过片头', width: 250, tooltip: skipHead > 0 ? skipHead+'秒' : '关闭', icon: ICONS.skipStart, selector: SKIP_OPTIONS.map(o => ({ default: o.value === skipHead, html: o.html, url: o.value })), onSelect: function(item: any) { skipHead = item.url; localStorage.setItem('art_skip_head', String(skipHead)); return item.html; } },
                  { html: '跳过片尾', width: 250, tooltip: skipTail > 0 ? skipTail+'秒' : '关闭', icon: ICONS.skipEnd, selector: SKIP_OPTIONS.map(o => ({ default: o.value === skipTail, html: o.html, url: o.value })), onSelect: function(item: any) { skipTail = item.url; localStorage.setItem('art_skip_tail', String(skipTail)); return item.html; } }
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
                          const hls = new Hls({ debug: false, enableWorker: true, maxBufferLength: 30, maxMaxBufferLength: 600, startLevel: -1, autoStartLoad: true, pLoader: CustomLoader as any });
                          if (P2PEngine && (P2PEngine as any).isSupported()) {
                              try { new (P2PEngine as any)(hls, { maxBufSize: 120 * 1000 * 1000, p2pEnabled: true }).on('stats', () => {}); } catch (e) {}
                          }
                          hls.loadSource(url); hls.attachMedia(video);
                          art.hls = hls; art.on('destroy', () => hls.destroy());
                      } else if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = url; }
                  }
              },
          });

          art.on('ready', () => {
              const progressKey = (propsRef.current.vodId && propsRef.current.episodeIndex !== undefined) ? `cine_progress_${propsRef.current.vodId}_${propsRef.current.episodeIndex}` : `cine_progress_${propsRef.current.url}`;
              const savedTimeStr = localStorage.getItem(progressKey);
              if (savedTimeStr) {
                  const savedTime = parseFloat(savedTimeStr);
                  if (!isNaN(savedTime) && savedTime > 5 && savedTime < art.duration - 5) art.seek = savedTime;
              }
          });

          art.on('video:timeupdate', function() {
              const progressKey = (propsRef.current.vodId && propsRef.current.episodeIndex !== undefined) ? `cine_progress_${propsRef.current.vodId}_${propsRef.current.episodeIndex}` : `cine_progress_${propsRef.current.url}`;
              if (art.currentTime > 0) localStorage.setItem(progressKey, String(art.currentTime));
              const currentSkipHead = parseInt(localStorage.getItem('art_skip_head') || String(DEFAULT_SKIP_HEAD));
              const currentSkipTail = parseInt(localStorage.getItem('art_skip_tail') || String(DEFAULT_SKIP_TAIL));
              if (currentSkipHead > 0 && art.duration > 300 && art.currentTime < currentSkipHead && !art.userSeek) art.seek = currentSkipHead; 
              if (currentSkipTail > 0 && art.duration > 300 && (art.duration - art.currentTime) <= currentSkipTail && !art.userSeek) {
                  if (latestOnNext.current) { art.notice.show = '即将播放下一集'; setTimeout(() => { if (latestOnNext.current) latestOnNext.current(); }, 1000); }
              }
          });

          art.on('video:ended', () => {
             const progressKey = (propsRef.current.vodId && propsRef.current.episodeIndex !== undefined) ? `cine_progress_${propsRef.current.vodId}_${propsRef.current.episodeIndex}` : `cine_progress_${propsRef.current.url}`;
             localStorage.removeItem(progressKey);
          });

          artRef.current = art;
      };

      if (!artRef.current) {
          initPlayer();
      }

      return () => {
          // Cleanup handled by the second useEffect
      };
  }, [vodId]);

  useEffect(() => {
      return () => {
          if (artRef.current && artRef.current.destroy) {
              artRef.current.destroy(true);
              artRef.current = null;
          }
      };
  }, []);

  useEffect(() => {
      const observer = new ResizeObserver(() => { if (artRef.current) (artRef.current as any).resize(); });
      if (containerRef.current) observer.observe(containerRef.current);
      return () => observer.disconnect();
  }, []);

  return (
      <div className={`w-full aspect-video lg:aspect-auto lg:h-full bg-black group relative z-0 ${className || ''}`}>
          <style>{`
            .art-danmuku-control, .art-control-danmuku { display: none !important; }
            .art-layer-mini { z-index: 100 !important; }
            .art-control-danmaku-input-toggle { color: #22c55e !important; }
            @media (max-width: 768px) {
                .art-controls .art-control { padding: 0 1px !important; }
                .art-control-volume, .art-control-fullscreenWeb { display: none !important; }
                .art-time { font-size: 11px !important; padding: 0 4px !important; }
            }
          `}</style>
          <div ref={containerRef} className="w-full h-full" />
          {showDanmakuInput && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-[100] animate-slide-up">
                  <div className="bg-black/60 backdrop-blur-xl border border-brand/30 rounded-full p-1.5 flex gap-2 shadow-2xl items-center ring-2 ring-brand/10">
                      <input 
                        type="text" 
                        value={danmakuText} 
                        onChange={(e) => setDanmakuText(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSendDanmaku()} 
                        placeholder="发条友善的弹幕吧..." 
                        className="flex-1 bg-transparent border-none outline-none text-white px-4 py-1.5 text-sm placeholder:text-gray-500" 
                        autoFocus 
                      />
                      <button 
                        onClick={handleSendDanmaku} 
                        disabled={!danmakuText.trim()} 
                        className="bg-brand hover:bg-brand-hover text-black p-2 rounded-full transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100"
                      >
                        {ICONS.send}
                      </button>
                      <button 
                        onClick={() => setShowDanmakuInput(false)} 
                        className="text-gray-400 hover:text-white px-3 py-1.5 text-xs font-medium border-l border-white/10"
                      >
                        取消
                      </button>
                  </div>
              </div>
          )}
      </div>
  );
});

export default VideoPlayer;
