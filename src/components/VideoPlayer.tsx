
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
    send: '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:18px;height:18px;"><path stroke-linecap="round" stroke-linejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>'
};

const SKIP_OPTIONS = [
    { html: '关闭', value: 0 }, { html: '30秒', value: 30 }, { html: '45秒', value: 45 }, { html: '60秒', value: 60 }, { html: '90秒', value: 90 }, { html: '120秒', value: 120 }, { html: '150秒', value: 150 }, { html: '180秒', value: 180 },
];

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
            style: { border: '1px solid #22c55e', borderRadius: '10px', padding: '4px 14px', fontWeight: '900', background: 'rgba(34, 197, 94, 0.1)' } 
        });
        art.notice.show = '[发射成功] 液态弹幕已加入战局';
        setDanmakuText('');
        setShowDanmakuInput(false);
    }
  };

  useEffect(() => {
      const art = artRef.current;
      if (art && url && url !== art.url) {
          art.switchUrl(url).then(() => {
              const progressKey = (vodId && episodeIndex !== undefined) ? `cine_progress_${vodId}_${episodeIndex}` : `cine_progress_${url}`;
              const savedTime = parseFloat(localStorage.getItem(progressKey) || '0');
              if (savedTime > 5) art.seek = savedTime;
          });
      }
  }, [url, episodeIndex, vodId]);

  useEffect(() => {
      if (!containerRef.current || !url) return;
      
      const initPlayer = () => {
          const DEFAULT_SKIP_HEAD = 90, DEFAULT_SKIP_TAIL = 120;
          let skipHead = parseInt(localStorage.getItem('art_skip_head') || String(DEFAULT_SKIP_HEAD));
          let skipTail = parseInt(localStorage.getItem('art_skip_tail') || String(DEFAULT_SKIP_TAIL));

          const art = new Artplayer({
              container: containerRef.current!, url: url, poster: poster, autoplay: autoplay, volume: 0.7,
              theme: '#22c55e', lang: 'zh-cn', lock: true, fastForward: true, autoOrientation: true,
              fullscreen: true, fullscreenWeb: true, setting: true, pip: true,
              moreVideoAttr: { crossOrigin: 'anonymous', playsInline: true, 'webkit-playsinline': true } as any,
              plugins: [
                  artplayerPluginDanmuku({
                      danmuku: [], speed: 10, opacity: 0.8, fontSize: 24, visible: true, emitter: false,
                  }),
              ],
              controls: [
                 { name: 'next-episode', position: 'left', index: 15, html: ICONS.next, tooltip: '下一集', click: function () { if (latestOnNext.current) latestOnNext.current(); } },
                 { 
                    name: 'danmaku-toggle', 
                    position: 'right', 
                    index: 10, 
                    html: ICONS.danmaku, 
                    tooltip: '弹幕开关', 
                    click: function () { 
                        const plugin = (this.plugins as any).artplayerPluginDanmuku;
                        if (plugin) { if (plugin.visible) plugin.hide(); else plugin.show(); }
                        this.notice.show = `弹幕已${plugin.visible ? '开启' : '关闭'}`;
                    } 
                 },
                 { 
                    name: 'danmaku-input-toggle', 
                    position: 'right', 
                    index: 11, 
                    html: ICONS.commentAdd, 
                    tooltip: '发送弹幕', 
                    click: function () { setShowDanmakuInput(prev => !prev); } 
                 }
              ],
              settings: [
                  { html: '跳过片头', width: 250, tooltip: skipHead+'秒', icon: ICONS.skipStart, selector: SKIP_OPTIONS.map(o => ({ default: o.value === skipHead, html: o.html, url: o.value })), onSelect: function(item: any) { skipHead = item.url; localStorage.setItem('art_skip_head', String(skipHead)); return item.html; } },
                  { html: '跳过片尾', width: 250, tooltip: skipTail+'秒', icon: ICONS.skipEnd, selector: SKIP_OPTIONS.map(o => ({ default: o.value === skipTail, html: o.html, url: o.value })), onSelect: function(item: any) { skipTail = item.url; localStorage.setItem('art_skip_tail', String(skipTail)); return item.html; } }
              ],
              customType: {
                  m3u8: function (video: HTMLVideoElement, url: string, art: any) {
                      if (Hls.isSupported()) {
                          const hls = new Hls();
                          hls.loadSource(url); hls.attachMedia(video);
                          art.hls = hls; art.on('destroy', () => hls.destroy());
                      } else if (video.canPlayType('application/vnd.apple.mpegurl')) { video.src = url; }
                  }
              },
          });

          art.on('ready', () => {
              const progressKey = (propsRef.current.vodId && propsRef.current.episodeIndex !== undefined) ? `cine_progress_${propsRef.current.vodId}_${propsRef.current.episodeIndex}` : `cine_progress_${propsRef.current.url}`;
              const savedTime = parseFloat(localStorage.getItem(progressKey) || '0');
              if (savedTime > 5 && savedTime < art.duration - 5) {
                  art.seek = savedTime;
                  art.notice.show = `[自动续播] 已定位到上次观影点`;
              }
          });

          art.on('video:timeupdate', function() {
              const progressKey = (propsRef.current.vodId && propsRef.current.episodeIndex !== undefined) ? `cine_progress_${propsRef.current.vodId}_${propsRef.current.episodeIndex}` : `cine_progress_${propsRef.current.url}`;
              if (art.currentTime > 0) localStorage.setItem(progressKey, String(art.currentTime));
              if (skipHead > 0 && art.duration > 300 && art.currentTime < skipHead && !art.userSeek) art.seek = skipHead; 
              if (skipTail > 0 && art.duration > 300 && art.currentTime > 60 && (art.duration - art.currentTime) <= skipTail && !art.userSeek) {
                  if (latestOnNext.current) { art.notice.show = '即将播放下一集'; latestOnNext.current(); }
              }
          });

          artRef.current = art;
          return () => { if (artRef.current) artRef.current.destroy(true); };
      };

      initPlayer();
  }, [vodId]);

  return (
      <div className={`w-full aspect-video lg:aspect-auto lg:h-full bg-black group relative z-0 ${className || ''}`}>
          <style>{`
            /* Artplayer Liquid Floating Control Panel */
            .art-bottom { padding: 0 20px 20px !important; background: transparent !important; }
            .art-controls {
                background: rgba(15, 23, 42, 0.4) !important;
                backdrop-filter: blur(32px) saturate(180%) !important;
                -webkit-backdrop-filter: blur(32px) saturate(180%) !important;
                border: 1px solid rgba(255, 255, 255, 0.15) !important;
                border-radius: 24px !important;
                box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5) !important;
                height: 60px !important;
                padding: 0 16px !important;
            }
            .art-progress { bottom: 70px !important; height: 5px !important; }
            .art-progress-indicator { background: #22c55e !important; border: 3px solid #fff !important; width: 16px !important; height: 16px !important; box-shadow: 0 0 15px rgba(34, 197, 94, 0.8) !important; }
            .art-notice { background: rgba(34, 197, 94, 0.9) !important; border-radius: 100px !important; padding: 12px 28px !important; font-weight: 900 !important; font-size: 14px !important; letter-spacing: 0.1em !important; box-shadow: 0 10px 20px rgba(0,0,0,0.3) !important; }
            .art-control-danmaku-toggle, .art-control-danmaku-input-toggle { color: #fff !important; opacity: 0.8; transition: all 0.3s; }
            .art-control-danmaku-toggle:hover, .art-control-danmaku-input-toggle:hover { opacity: 1; transform: scale(1.1); color: #22c55e !important; }

            @media (max-width: 768px) {
                .art-bottom { padding: 0 10px 10px !important; }
                .art-controls { height: 52px !important; border-radius: 16px !important; }
                .art-progress { bottom: 62px !important; }
            }
          `}</style>
          <div ref={containerRef} className="w-full h-full" />
          {showDanmakuInput && (
              <div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[94%] max-w-xl z-[100] animate-slide-up">
                  <div className="bg-slate-900/60 backdrop-blur-[40px] border border-white/20 rounded-2xl p-2 flex gap-2 shadow-3xl items-center ring-1 ring-white/10">
                      <input 
                        type="text" value={danmakuText} onChange={(e) => setDanmakuText(e.target.value)} 
                        onKeyDown={(e) => e.key === 'Enter' && handleSendDanmaku()} 
                        placeholder="发射超感弹幕..." 
                        className="flex-1 bg-transparent border-none outline-none text-white px-5 py-3 text-sm placeholder:text-gray-500 font-bold" 
                        autoFocus 
                      />
                      <button onClick={handleSendDanmaku} disabled={!danmakuText.trim()} className="bg-brand hover:bg-brand-hover text-black px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-brand/30">
                         <span>发射</span><span dangerouslySetInnerHTML={{ __html: ICONS.send }} />
                      </button>
                      <button onClick={() => setShowDanmakuInput(false)} className="text-gray-400 hover:text-white px-4 py-2 text-xs font-black uppercase tracking-widest">取消</button>
                  </div>
              </div>
          )}
      </div>
  );
});

export default VideoPlayer;
