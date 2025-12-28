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
];

const AD_PATTERNS = ['googleads', 'doubleclick', 'ad_', '.m3u8_ad', 'guanggao', 'hecheng', 'hl_ad', 'cs.html', 'yibo', 'aybc', 'hls_ad', 'ts_ad', 'ad.ts'];

function filterAdsFromM3U8(m3u8Content: string): string {
    if (!m3u8Content) return '';
    const lines = m3u8Content.split('\n');
    const filteredLines: string[] = [];
    let inAdBlock = false;
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.includes('EXT-X-CUE-OUT') || line.includes('SCTE35')) { inAdBlock = true; continue; }
        if (line.includes('EXT-X-CUE-IN')) { inAdBlock = false; continue; }
        if (inAdBlock) continue;
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

const DANMAKU_API_BASE = 'https://dm1.laidd.de5.net/5573108';
const API_MATCH = `${DANMAKU_API_BASE}/api/v2/match`;
const API_SEARCH_EPISODES = `${DANMAKU_API_BASE}/api/v2/search/episodes`;
const API_COMMENT = `${DANMAKU_API_BASE}/api/v2/comment`;
const GLOBAL_PROXY = 'https://daili.laidd.de5.net/?url=';

interface DanmakuCacheItem { episodeId: number; comments: any[]; timestamp: number; }
const DANMAKU_CACHE = new Map<string, DanmakuCacheItem>();
const CACHE_TTL = 1000 * 60 * 20;

const robustFetch = async (url: string, timeout = 5000) => {
    const headers = { 'Accept': 'application/json' };
    try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(id);
        if (response.ok) return response;
    } catch (e) {}

    const proxyUrl = `${GLOBAL_PROXY}${encodeURIComponent(url)}`;
    return fetch(proxyUrl, { headers });
};

const transformDanmaku = (comments: any[]) => {
    if (!Array.isArray(comments)) return [];
    const result = [];
    const MAX_DANMAKU = 3000; 

    for (let i = 0; i < comments.length; i++) {
        if (result.length >= MAX_DANMAKU) break;
        const item = comments[i];
        const parts = String(item.p || '').split(',');
        const time = parseFloat(parts[0]);
        if (isNaN(time)) continue;
        const text = String(item.m || item.message || item.text || '');
        if (!text) continue;
        
        result.push({
            text, time,
            mode: (parseInt(parts[1]) === 4 ? 2 : (parseInt(parts[1]) === 5 ? 1 : 0)) as any,
            color: parts[2] ? `#${(parseInt(parts[2]) & 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0')}` : '#FFFFFF',
            style: { textShadow: '1px 1px 1px #000', fontWeight: 'bold' },
        });
    }
    return result;
};

const getSearchTerm = (title: string): string => {
    return title
        .replace(/[\(\[\{【].+?[\)\]\}】]/gi, '')
        .replace(/(?:4k|1080p|720p|hd|bd|web-dl|hdtv|中字|双语|完整版|未删减|电影|电视剧|动漫|综艺|\d{4}年|\d{4})/gi, '')
        .trim();
};

const fetchDanmaku = async (title: string, episodeIndex: number) => {
    if (!title) return [];
    const cacheKey = `${title}_${episodeIndex}`;
    const cachedItem = DANMAKU_CACHE.get(cacheKey);
    if (cachedItem && (Date.now() - cachedItem.timestamp < CACHE_TTL)) return cachedItem.comments;

    const cleanTitle = getSearchTerm(title);
    const epStr = (episodeIndex + 1).toString().padStart(2, '0');
    
    const virtualFiles = [`${cleanTitle} - ${epStr}.mp4`, `${cleanTitle} 第${epStr}集.mp4`, `${cleanTitle} S01E${epStr}.mp4`];
    
    let matchedEpisodeId: number | null = null;
    try {
        const matches = await Promise.all(virtualFiles.map(async (f) => {
            try {
                const res = await robustFetch(`${API_MATCH}?fileName=${encodeURIComponent(f)}&hash=0&length=0`, 2500);
                const data = await res.json();
                return data.isMatched ? data.matches[0].episodeId : null;
            } catch(e) { return null; }
        }));
        matchedEpisodeId = matches.find(id => id !== null) || null;
    } catch(e) {}

    if (!matchedEpisodeId) {
        try {
            const res = await robustFetch(`${API_SEARCH_EPISODES}?anime=${encodeURIComponent(cleanTitle)}&episode=${episodeIndex + 1}`, 3000);
            const data = await res.json();
            if (data.animes?.[0]?.episodes?.[0]) matchedEpisodeId = data.animes[0].episodes[0].episodeId;
        } catch(e) {}
    }

    if (matchedEpisodeId) {
        try {
            const res = await robustFetch(`${API_COMMENT}/${matchedEpisodeId}?ch_convert=1`);
            const data = await res.json();
            const comments = transformDanmaku(data.comments || data);
            DANMAKU_CACHE.set(cacheKey, { episodeId: matchedEpisodeId, comments, timestamp: Date.now() });
            return comments;
        } catch(e) {}
    }
    return [];
};

const VideoPlayer = forwardRef((props: VideoPlayerProps, ref) => {
  const { url, poster, autoplay = true, onEnded, onNext, title, episodeIndex = 0, vodId, className } = props;
  const artRef = useRef<Artplayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const latestOnNext = useRef(onNext);

  const progressKey = useMemo(() => (vodId && episodeIndex !== undefined) ? `cine_progress_${vodId}_${episodeIndex}` : `cine_progress_${url}`, [vodId, episodeIndex, url]);

  useEffect(() => { latestOnNext.current = onNext; }, [onNext]);
  useImperativeHandle(ref, () => ({ getInstance: () => artRef.current }));

  useEffect(() => {
      if (!containerRef.current || !url) return;
      if (artRef.current) artRef.current.destroy(true);

      const skipHead = parseInt(localStorage.getItem('art_skip_head') || '0');
      const skipTail = parseInt(localStorage.getItem('art_skip_tail') || '0');

      const art = new Artplayer({
          container: containerRef.current,
          url, poster, autoplay,
          volume: 0.7,
          setting: true,
          pip: true,
          fullscreen: true,
          fullscreenWeb: true,
          theme: '#22c55e',
          lang: 'zh-cn',
          lock: true,
          fastForward: true,
          autoOrientation: true,
          moreVideoAttr: { crossOrigin: 'anonymous', playsInline: true, 'webkit-playsinline': true },
          plugins: [
              artplayerPluginDanmuku({
                  danmuku: () => {
                      // 1. 并行化和非阻塞优化，减少起播等待
                      return new Promise((resolve) => {
                          setTimeout(async () => {
                              const racePromise = Promise.race([
                                  fetchDanmaku(title || '', episodeIndex),
                                  new Promise((_, reject) => setTimeout(() => reject('timeout'), 1500))
                              ]);
                              try {
                                  const data = await racePromise;
                                  resolve(data as any[]);
                              } catch(e) {
                                  resolve([]); // 超时则先不显示弹幕，避免卡住视频加载
                              }
                          }, 500);
                      });
                  },
                  speed: 10, fontSize: 25, opacity: 1, margin: [10, '75%'],
                  antiOverlap: true, synchronousPlayback: true,
                  visible: false, // 2. 默认关闭弹幕
              }),
          ],
          controls: [{
              name: 'next-episode', position: 'left', index: 15, html: ICONS.next, tooltip: '下一集',
              click: () => latestOnNext.current?.(),
          }],
          settings: [
              {
                  html: '弹幕开关',
                  icon: ICONS.danmaku,
                  tooltip: '关闭',
                  switch: false,
                  onSwitch: function (item: any) {
                      const nextState = !item.switch;
                      const plugin = (this.plugins as any).artplayerPluginDanmuku;
                      if (plugin) {
                          if (nextState) plugin.show();
                          else plugin.hide();
                      }
                      item.tooltip = nextState ? '开启' : '关闭';
                      return nextState;
                  },
              },
              {
                  html: '跳过片头', icon: ICONS.skipStart, tooltip: skipHead > 0 ? `${skipHead}秒` : '关闭',
                  selector: SKIP_OPTIONS.map(o => ({ default: o.value === skipHead, html: o.html, url: o.value })),
                  onSelect: (item: any) => { localStorage.setItem('art_skip_head', String(item.url)); return item.html; }
              },
              {
                  html: '跳过片尾', icon: ICONS.skipEnd, tooltip: skipTail > 0 ? `${skipTail}秒` : '关闭',
                  selector: SKIP_OPTIONS.map(o => ({ default: o.value === skipTail, html: o.html, url: o.value })),
                  onSelect: (item: any) => { localStorage.setItem('art_skip_tail', String(item.url)); return item.html; }
              }
          ],
          customType: {
              m3u8: (video: HTMLVideoElement, url: string, art: any) => {
                  if (Hls.isSupported()) {
                      const hls = new Hls({
                          enableWorker: true,
                          maxBufferLength: 30, // 3. 调优 Hls 缓冲设置，加速起播
                          maxMaxBufferLength: 60,
                          startLevel: -1,
                          autoStartLoad: true,
                          pLoader: class extends Hls.DefaultConfig.loader {
                              load(context: any, config: any, callbacks: any) {
                                  if (context.type === 'manifest' || context.type === 'level') {
                                      const onSuccess = callbacks.onSuccess;
                                      callbacks.onSuccess = (response: any, stats: any, ctx: any) => {
                                          if (response.data && typeof response.data === 'string') response.data = filterAdsFromM3U8(response.data);
                                          return onSuccess(response, stats, ctx, null);
                                      };
                                  }
                                  super.load(context, config, callbacks);
                              }
                          } as any,
                      });
                      if (P2PEngine.isSupported()) new P2PEngine(hls, { maxBufSize: 100 * 1024 * 1024, p2pEnabled: true });
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
          const savedTime = parseFloat(localStorage.getItem(progressKey) || '0');
          if (savedTime > 5 && savedTime < art.duration - 10) art.seek = savedTime;
      });

      art.on('video:timeupdate', () => {
          if (art.currentTime > 0) localStorage.setItem(progressKey, String(art.currentTime));
          const curHead = parseInt(localStorage.getItem('art_skip_head') || '0');
          const curTail = parseInt(localStorage.getItem('art_skip_tail') || '0');
          if (curHead > 0 && art.currentTime < curHead && art.duration > 300) art.seek = curHead;
          if (curTail > 0 && art.duration - art.currentTime <= curTail && art.duration > 300) latestOnNext.current?.();
      });

      art.on('video:ended', () => { localStorage.removeItem(progressKey); latestOnNext.current?.(); });
      artRef.current = art;
      return () => { if (artRef.current) artRef.current.destroy(true); };
  }, [url, poster, title, episodeIndex, vodId]); 

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