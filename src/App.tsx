
import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
// Removed fetchCategoryItems as it is not exported by ./services/vodService and not used in this component
import { getHomeSections, getAggregatedSearch, getAggregatedMovieDetail, parseAllSources, fetchDoubanData, getHistory, addToHistory, removeFromHistory, fetchPersonDetail, initVodSources } from './services/vodService';
import MovieInfoCard from './components/MovieInfoCard';
import ImageWithFallback from './components/ImageWithFallback';
import { VodItem, VodDetail, Episode, PlaySource, HistoryItem, PersonDetail } from './types';

const VideoPlayer = lazy(() => import('./components/VideoPlayer'));
const GeminiChat = lazy(() => import('./components/GeminiChat'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

const NavIcons = {
    Home: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
    Search: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
    Movie: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125 1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 5.496 4.5 4.875 4.5M6 9.375c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125V8.625c0-.621-.504-1.125-1.125-1.125h-1.5M6 9.375v5.25m0-5.25C6 8.754 5.496 8.25 4.875 8.25M6 14.625c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125v-2.25c0-.621-.504-1.125-1.125-1.125h-1.5" /></svg>,
    Series: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" /></svg>,
    Anime: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>,
    Variety: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
    Settings: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>
};

const URL_TO_TAB: Record<string, string> = { '': 'home', 'dianying': 'movies', 'dianshiju': 'series', 'dongman': 'anime', 'zongyi': 'variety', 'sousuo': 'search' };
const TAB_TO_URL: Record<string, string> = { 'home': '/', 'movies': '/dianying', 'series': '/dianshiju', 'anime': '/dongman', 'variety': '/zongyi', 'search': '/sousuo' };
const TAB_NAME: Record<string, string> = { 'home': '首页', 'movies': '电影', 'series': '剧集', 'anime': '动漫', 'variety': '综艺', 'search': '搜索' };

const HeroBanner = React.memo(({ items, onPlay }: { items: VodItem[], onPlay: (item: VodItem) => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [detail, setDetail] = useState<any>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => { handleNext(); }, 8000); 
    return () => clearInterval(interval);
  }, [currentIndex, items.length]);

  useEffect(() => {
      if (items && items.length > 0) {
          const item = items[currentIndex];
          setDetail(null);
          fetchDoubanData(item.vod_name, item.vod_id).then(res => { if (res) setDetail(res); });
      }
  }, [currentIndex, items]);

  const handleNext = useCallback(() => { setCurrentIndex((prev) => (prev + 1) % items.length); }, [items.length]);
  const handlePrev = useCallback(() => { setCurrentIndex((prev) => (prev - 1 + items.length) % items.length); }, [items.length]);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.targetTouches[0].clientX);
  const handleTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > 50) handleNext(); else if (distance < -50) handlePrev();
    setTouchStart(0); setTouchEnd(0);
  };

  if (!items || items.length === 0) return null;
  const activeItem = items[currentIndex];

  return (
    <div className="relative w-full h-[210px] md:h-[360px] rounded-2xl overflow-hidden mb-8 md:mb-12 group shadow-2xl bg-[#0a0a0a] touch-pan-y border border-white/5" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <div key={activeItem.vod_id + '_bg'} className="absolute inset-0 animate-fade-in transition-all duration-700">
          <ImageWithFallback src={activeItem.vod_pic} alt={activeItem.vod_name} priority={true} size="l" className="w-full h-full object-cover blur-md opacity-40 scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent z-0"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/70 to-transparent z-0"></div>
      </div>
      <div key={activeItem.vod_id + '_content'} className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="container mx-auto px-4 md:px-12 w-full h-full flex items-center">
            <div className="flex flex-row items-center gap-4 md:gap-10 w-full animate-slide-up">
                <div className="flex-shrink-0 w-[90px] md:w-[160px] aspect-[2/3] rounded-lg md:rounded-xl overflow-hidden shadow-[0_5px_20px_rgba(0,0,0,0.6)] border border-white/20 relative z-20 hover:scale-105 transition-transform duration-500 bg-black">
                    <ImageWithFallback src={activeItem.vod_pic} alt={activeItem.vod_name} priority={true} size="l" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 text-left space-y-1.5 md:space-y-4 flex flex-col items-start justify-center min-w-0">
                    <div className="flex flex-wrap items-center justify-start gap-1.5 md:gap-2">
                        <span className="bg-brand text-black text-[10px] md:text-xs font-black px-1.5 py-0.5 rounded uppercase tracking-wider">{detail?.score || activeItem.vod_score || 'HOT'}</span>
                        <span className="bg-white/10 border border-white/10 text-gray-200 text-[10px] md:text-xs font-medium px-1.5 py-0.5 rounded backdrop-blur-md">{activeItem.vod_year || '2025'}</span>
                        <span className="bg-white/10 border border-white/10 text-gray-200 text-[10px] md:text-xs font-medium px-1.5 py-0.5 rounded backdrop-blur-md">{activeItem.type_name || detail?.type_name || '精选'}</span>
                    </div>
                    <h2 className="text-xl md:text-4xl font-black text-white leading-tight drop-shadow-xl tracking-tight line-clamp-2">{activeItem.vod_name}</h2>
                    <div className="text-gray-300 text-[10px] md:text-sm font-medium line-clamp-1 opacity-90">{detail?.director && <span className="mr-2">导演: {detail.director}</span>}{detail?.actor && <span>主演: {detail.actor}</span>}</div>
                    <p className="text-gray-400 text-[10px] md:text-sm leading-relaxed line-clamp-2 md:line-clamp-3 drop-shadow-md max-w-2xl hidden xs:block">{detail?.content ? detail.content.replace(/<[^>]+>/g, '') : (activeItem.vod_remarks || "暂无简介...")}</p>
                    <div className="pt-1 md:pt-2 flex flex-row gap-2 md:gap-4">
                        <button onClick={() => onPlay(activeItem)} className="bg-white text-black hover:bg-gray-200 text-xs md:text-base font-bold px-4 py-1.5 md:px-8 md:py-3 rounded-full flex items-center gap-1 md:gap-2 transition-all hover:scale-105 shadow-lg whitespace-nowrap">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 md:w-5 md:h-5"><path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" /></svg>
                            <span>播放</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>
      <div className="absolute bottom-3 md:bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {items.map((_, idx) => ( <button key={idx} onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }} className={`h-1 md:h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-brand w-6 md:w-8' : 'bg-white/20 w-1.5 md:w-2 hover:bg-white/50'}`} /> ))}
      </div>
    </div>
  );
});

const HorizontalSection = React.memo(({ title, items, id, onItemClick, onItemContextMenu }: { title: string, items: (VodItem | HistoryItem)[], id: string, onItemClick: (item: VodItem) => void, onItemContextMenu?: (e: React.MouseEvent, item: VodItem) => void }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    if (!items || items.length === 0) return null;
    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = direction === 'left' ? -current.clientWidth * 0.75 : current.clientWidth * 0.75;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };
    return (
        <div className="mb-8 animate-fade-in group/section cv-auto" id={id}>
            <div className="flex justify-between items-end mb-4 px-1">
                <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 border-l-4 border-brand pl-3">{title}</h3>
            </div>
            <div className="relative group">
                 <button className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-brand text-white p-2 rounded-full opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex border border-white/10 shadow-lg -ml-4" onClick={() => scroll('left')}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x scroll-smooth">
                    {items.map((item) => (
                        <div key={`${item.vod_id}-${(item as HistoryItem).last_updated || ''}`} className="flex-shrink-0 w-[140px] md:w-[180px] snap-start cursor-pointer relative group/card" onClick={() => onItemClick(item)} onContextMenu={(e) => onItemContextMenu && onItemContextMenu(e, item)}>
                            <div className="aspect-[2/3] rounded-lg overflow-hidden relative shadow-lg bg-gray-900 border border-white/5 group-hover/card:border-brand/50 transition-all duration-300">
                                <ImageWithFallback src={item.vod_pic} alt={item.vod_name} searchKeyword={item.vod_name} size="m" className="w-full h-full object-cover transform group-hover/card:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/20 transition-colors"></div>
                                {(item as any).vod_remarks && <div className="absolute top-1 right-1 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded backdrop-blur-sm">{(item as any).vod_remarks}</div>}
                                {(item as any).vod_score && <div className="absolute bottom-1 right-1 text-brand font-bold text-xs drop-shadow-md">{(item as any).vod_score}</div>}
                                {(item as HistoryItem).episode_name && ( <div className="absolute bottom-0 left-0 right-0 bg-brand/90 text-black text-[10px] font-bold px-2 py-1 text-center">上次看到: {(item as HistoryItem).episode_name}</div> )}
                            </div>
                            <h4 className="mt-2 text-sm text-gray-200 font-medium truncate group-hover/card:text-brand transition-colors">{item.vod_name}</h4>
                        </div>
                    ))}
                </div>
                <button className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-brand text-white p-2 rounded-full opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex border border-white/10 shadow-lg -mr-4" onClick={() => scroll('right')}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
            </div>
        </div>
    );
});

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<VodItem[]>([]);
  const [personProfile, setPersonProfile] = useState<PersonDetail | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentMovie, setCurrentMovie] = useState<VodDetail | null>(null);
  const [availableSources, setAvailableSources] = useState<PlaySource[]>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(-1);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [sidePanelTab, setSidePanelTab] = useState<'episodes' | 'sources'>('episodes');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const [homeSections, setHomeSections] = useState<any>({ movies: [], series: [], shortDrama: [], anime: [], variety: [] });
  const [heroItems, setHeroItems] = useState<VodItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<HistoryItem[]>([]);
  
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, item: VodItem | null }>({ visible: false, x: 0, y: 0, item: null });

  useEffect(() => {
    const SITE_NAME = 'CineStream AI';
    let title = `${SITE_NAME} - 免费高清影视聚合平台 | 智能P2P加速秒播`;
    let description = 'CineStream AI为您提供最新最全的高清电影、电视剧、动漫和综艺正版视频在线观看。采用先进P2P加速技术，实现极致秒播体验。';
    let keywords = '免费电影,高清影视,在线观看,CineStream AI,影视搜索,Gemini AI';
    let jsonLd: any = null;

    if (currentMovie) {
        const movieName = currentMovie.vod_name;
        const episodeName = episodes[currentEpisodeIndex]?.title || '';
        const director = currentMovie.vod_director || '未知';
        const actor = currentMovie.vod_actor || '群星';
        const year = currentMovie.vod_year || '2025';
        const type = currentMovie.type_name || '影视';
        const contentSnippet = currentMovie.vod_content?.replace(/<[^>]+>/g, '').slice(0, 100) || '';
        title = `《${movieName}》_${episodeName}_高清正版视频在线观看 - ${SITE_NAME}`;
        description = `${SITE_NAME}为您提供《${movieName}》高清在线观看。该片由${director}执导，${actor}等主演。剧情简介：${contentSnippet}... 更多精彩高清视频尽在${SITE_NAME}。`;
        keywords = `${movieName},${movieName}在线观看,${movieName}高清版,${movieName}全集,${movieName}剧情,${type},${year}`;
        jsonLd = [ { "@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": [ { "@type": "ListItem", "position": 1, "name": "首页", "item": window.location.origin }, { "@type": "ListItem", "position": 2, "name": type, "item": `${window.location.origin}/${activeTab}` }, { "@type": "ListItem", "position": 3, "name": movieName, "item": window.location.href } ] }, { "@context": "https://schema.org", "@type": "VideoObject", "name": `${movieName} ${episodeName}`, "description": contentSnippet, "thumbnailUrl": currentMovie.vod_pic, "uploadDate": "2025-01-01T08:00:00+08:00", "duration": "PT45M", "contentUrl": window.location.href, "embedUrl": window.location.href, "interactionStatistic": { "@type": "InteractionCounter", "interactionType": { "@type": "WatchAction" }, "userInteractionCount": 12850 } } ];
    } else if (activeTab === 'search' && searchQuery) {
        title = `${searchQuery}的搜索结果 - ${SITE_NAME}影视搜索`;
        description = `为您找到关于“${searchQuery}”的所有高清电影、电视剧及动漫资源，点击即可免费在线观看。`;
    } else if (activeTab !== 'home') {
        title = `${TAB_NAME[activeTab]}频道 - 2025最新${TAB_NAME[activeTab]}高清在线观看 - ${SITE_NAME}`;
        description = `${SITE_NAME}${TAB_NAME[activeTab]}频道为您汇总全网最火爆的${TAB_NAME[activeTab]}资源，支持4K超清画质，智能推荐您喜爱的作品。`;
    }

    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) metaDesc.setAttribute('content', description);
    const metaKey = document.querySelector('meta[name="keywords"]');
    if (metaKey) metaKey.setAttribute('content', keywords);
    const existingScript = document.getElementById('json-ld-seo');
    if (existingScript) existingScript.remove();
    if (jsonLd) {
        const script = document.createElement('script');
        script.id = 'json-ld-seo';
        script.type = 'application/ld+json';
        script.text = JSON.stringify(jsonLd);
        document.head.appendChild(script);
    }
  }, [currentMovie, activeTab, searchQuery, currentEpisodeIndex, episodes]);

  useEffect(() => { initVodSources(); setWatchHistory(getHistory()); }, []);

  useEffect(() => {
    const handleGlobalClick = () => { if (contextMenu.visible) setContextMenu({ ...contextMenu, visible: false }); };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('scroll', handleGlobalClick, true);
    return () => { window.removeEventListener('click', handleGlobalClick); window.removeEventListener('scroll', handleGlobalClick, true); };
  }, [contextMenu.visible]);

  useEffect(() => {
       setLoading(true);
       getHomeSections().then(initialData => {
           if (initialData) {
               setHomeSections(initialData);
               const allItems = [ 
                   ...(initialData.movies || []), 
                   ...(initialData.series || []), 
                   ...(initialData.anime || []) 
               ];
               setHeroItems(allItems.slice(0, 10));
           }
           setLoading(false);
       });
  }, []);

  useEffect(() => {
      const path = location.pathname.split('/')[1] || '';
      if (path === 'play') {
          const id = location.pathname.split('/')[2];
          if (id && (!currentMovie || String(currentMovie.vod_id) !== id)) handleSelectMovie(id);
      } else {
          setActiveTab(URL_TO_TAB[path] || 'home');
          if (path !== 'play') setCurrentMovie(null); 
          setHasSearched(activeTab === 'search');
      }
  }, [location.pathname]);

  const handleSelectMovie = async (id: number | string, apiUrl?: string, vodName?: string) => {
      setLoading(true);
      try {
          const result = await getAggregatedMovieDetail(id, apiUrl, vodName);
          if (result && result.main) {
              const { main, alternatives } = result;
              const allSources = parseAllSources([main, ...alternatives]);
              if (allSources.length > 0) {
                  setAvailableSources(allSources);
                  const initialIndex = allSources.findIndex(s => s.name.toLowerCase().includes('m3u8')) >= 0 ? allSources.findIndex(s => s.name.toLowerCase().includes('m3u8')) : 0;
                  setCurrentSourceIndex(initialIndex);
                  setEpisodes(allSources[initialIndex].episodes);
                  setCurrentMovie(main);
                  const savedIndex = parseInt(localStorage.getItem(`cine_last_episode_${main.vod_id}`) || '0');
                  setCurrentEpisodeIndex((!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < allSources[initialIndex].episodes.length) ? savedIndex : 0);
              }
          }
      } catch (error) {} finally { setLoading(false); }
  };

  const handleItemClick = (item: VodItem) => {
      if (item.type_name === 'celebrity') {
        setLoading(true);
        fetchPersonDetail(item.vod_id).then(detail => {
            if (detail) { setPersonProfile(detail); setSearchResults(detail.works || []); }
            setLoading(false);
        });
        return;
      }
      handleSelectMovie(item.vod_id, item.api_url, item.vod_name);
      navigate(`/play/${item.vod_id}`);
  };

  const handleRemoveHistory = (e: React.MouseEvent, item: VodItem) => {
      e.stopPropagation();
      const updated = removeFromHistory(item.vod_id);
      setWatchHistory(updated);
      setContextMenu({ ...contextMenu, visible: false });
  };

  const triggerSearch = async (query: string) => {
      if(!query.trim()) return;
      setSearchQuery(query);
      setLoading(true);
      setHasSearched(true);
      setPersonProfile(null); 
      if (activeTab !== 'search') navigate(TAB_TO_URL['search']);
      try {
          const results = await getAggregatedSearch(query);
          setSearchResults(results);
          if (resultsRef.current) resultsRef.current.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {} finally { setLoading(false); }
  };

  const NavBar = ({ activeTab, onTabChange, onSettingsClick }: any) => {
    const navItems = [ 
        { id: 'home', label: '首页', icon: NavIcons.Home }, 
        { id: 'movies', label: '电影', icon: NavIcons.Movie }, 
        { id: 'series', label: '剧集', icon: NavIcons.Series }, 
        { id: 'anime', label: '动漫', icon: NavIcons.Anime }, 
        { id: 'variety', label: '综艺', icon: NavIcons.Variety }, 
        { id: 'search', label: '搜索', icon: NavIcons.Search } 
    ];
    return (
        <>
            {/* Desktop Header */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5 hidden lg:block">
                <div className="container mx-auto max-w-[1400px]">
                    <div className="flex items-center justify-between h-16 px-4">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange('home')}><span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand to-cyan-400">CineStream</span></div>
                        <div className="flex items-center gap-1 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                            {navItems.map(item => ( <button key={item.id} onClick={() => onTabChange(item.id)} className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${activeTab === item.id ? 'bg-white/10 text-brand' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>{item.icon}{item.label}</button> ))}
                        </div>
                        <button onClick={onSettingsClick} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10">{NavIcons.Settings}</button>
                    </div>
                </div>
            </nav>

            {/* Mobile Header (Title only) */}
            <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md h-14 flex items-center justify-between px-5 border-b border-white/5">
                <span className="text-xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand to-cyan-400">CineStream</span>
                <button onClick={onSettingsClick} className="text-gray-400 hover:text-white p-1.5">{NavIcons.Settings}</button>
            </header>

            {/* Mobile Bottom TabBar */}
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f111a]/95 backdrop-blur-2xl border-t border-white/5 safe-area-bottom">
                <div className="grid grid-cols-6 h-16">
                    {navItems.map(item => (
                        <button 
                            key={item.id} 
                            onClick={() => onTabChange(item.id)} 
                            className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === item.id ? 'text-brand' : 'text-gray-500'}`}
                        >
                            <div className={`${activeTab === item.id ? 'scale-110' : 'scale-100'}`}>{item.icon}</div>
                            <span className="text-[10px] font-medium">{item.label}</span>
                            {activeTab === item.id && <div className="w-1 h-1 rounded-full bg-brand absolute top-1"></div>}
                        </button>
                    ))}
                </div>
            </nav>
        </>
    );
  };

  return (
      <div className="relative min-h-screen pb-24 lg:pb-16 overflow-x-hidden font-sans pt-14 lg:pt-16">
          <NavBar activeTab={activeTab} onTabChange={(tab: string) => navigate(TAB_TO_URL[tab])} onSettingsClick={() => setShowSettings(true)} />
          <Suspense fallback={null}><SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} /></Suspense>
          
          {/* Context Menu Component */}
          {contextMenu.visible && contextMenu.item && (
              <div 
                  className="fixed z-[9999] bg-gray-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in py-1.5 min-w-[160px]"
                  style={{ 
                    top: Math.min(contextMenu.y, window.innerHeight - 100), 
                    left: Math.min(contextMenu.x, window.innerWidth - 170) 
                  }}
                  onClick={(e) => e.stopPropagation()}
              >
                  <button 
                      onClick={(e) => handleRemoveHistory(e, contextMenu.item!)}
                      className="w-full text-left px-5 py-3 text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-3 transition-colors active:bg-red-500/20"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      删除观看记录
                  </button>
                  <div className="h-px bg-white/5 my-1 mx-2"></div>
                  <button 
                      onClick={() => setContextMenu({ ...contextMenu, visible: false })}
                      className="w-full text-left px-5 py-3 text-xs text-gray-500 hover:bg-white/5 transition-colors active:bg-white/10"
                  >
                      取消
                  </button>
              </div>
          )}

          <div className="relative z-10 container mx-auto px-4 lg:px-6 py-4 lg:py-6 max-w-[1400px]">
              {currentMovie && (
                  <section className="mb-12 animate-fade-in space-y-4 lg:space-y-6 mt-0 lg:mt-4">
                      <h1 className="sr-only">{currentMovie.vod_name} {episodes[currentEpisodeIndex]?.title} 高清在线观看</h1>
                      
                      <div className="flex flex-col lg:flex-row gap-0 items-stretch bg-[#0f111a] rounded-xl lg:rounded-2xl overflow-hidden border border-white/5 shadow-[0_30px_60px_rgba(0,0,0,0.5)] transition-all duration-300 relative">
                          <div className={`flex-1 min-w-0 bg-black relative group transition-all duration-300 z-10 ${!showSidePanel ? 'lg:h-[650px]' : 'lg:h-[500px] h-auto aspect-video'}`}>
                              <Suspense fallback={<div className="w-full h-full bg-black flex items-center justify-center animate-pulse"></div>}>
                                  <VideoPlayer url={currentMovie.vod_play_url ? availableSources[currentSourceIndex]?.episodes[currentEpisodeIndex]?.url : ''} poster={currentMovie.vod_pic} title={currentMovie.vod_name} episodeIndex={currentEpisodeIndex} vodId={currentMovie.vod_id} onEnded={() => currentEpisodeIndex < episodes.length - 1 && setCurrentEpisodeIndex(prev => prev + 1)} onNext={() => currentEpisodeIndex < episodes.length - 1 && setCurrentEpisodeIndex(prev => prev + 1)} />
                              </Suspense>
                              {!showSidePanel && (
                                  <div className="absolute top-4 right-4 lg:top-6 lg:right-6 z-30 opacity-0 group-hover:opacity-100 transition-all duration-300">
                                      <button onClick={() => setShowSidePanel(true)} className="flex items-center gap-2 px-4 py-2 lg:px-5 lg:py-2.5 rounded-full bg-brand/90 backdrop-blur-md text-black font-black shadow-2xl hover:bg-brand transition-all text-xs lg:text-sm tracking-wide">展开选集<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg></button>
                                  </div>
                              )}
                          </div>

                          {showSidePanel && (
                              <div className="w-full lg:w-[360px] flex flex-col border-l border-white/10 bg-[#121620] relative z-0 h-[400px] lg:h-auto">
                                  <div className="flex items-center justify-between p-3 lg:p-4 border-b border-white/5 bg-black/20">
                                      <div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-brand shadow-[0_0_8px_#22c55e]"></div><h3 className="text-xs lg:text-sm font-bold text-gray-200">正在播放</h3></div>
                                      <button onClick={() => setShowSidePanel(false)} className="p-1.5 rounded-lg text-gray-500 hover:text-white transition-all"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                                  </div>
                                  <div className="flex bg-black/10">
                                      <button onClick={() => setSidePanelTab('episodes')} className={`flex-1 py-3 lg:py-3.5 text-[10px] lg:text-xs font-black tracking-widest uppercase transition-all relative ${sidePanelTab === 'episodes' ? 'text-brand' : 'text-gray-500'}`}>选集{sidePanelTab === 'episodes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand shadow-[0_0_10px_#22c55e]"></div>}</button>
                                      <button onClick={() => setSidePanelTab('sources')} className={`flex-1 py-3 lg:py-3.5 text-[10px] lg:text-xs font-black tracking-widest uppercase transition-all relative ${sidePanelTab === 'sources' ? 'text-brand' : 'text-gray-500'}`}>播放源{sidePanelTab === 'sources' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand shadow-[0_0_10px_#22c55e]"></div>}</button>
                                  </div>
                                  <div className="flex-1 overflow-y-auto custom-scrollbar p-3 lg:p-4 bg-black/5">
                                      {sidePanelTab === 'episodes' ? ( <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-2">{episodes.map((ep) => ( <button key={ep.index} onClick={() => setCurrentEpisodeIndex(ep.index)} className={`h-9 lg:h-10 rounded-md border text-[10px] lg:text-[11px] font-bold transition-all truncate px-1 flex items-center justify-center ${currentEpisodeIndex === ep.index ? 'bg-brand text-black border-brand shadow-[0_4px_12px_rgba(34,197,94,0.3)]' : 'bg-[#1a1f2e] text-gray-400 border-white/5 active:border-brand/40 hover:text-brand'}`} title={ep.title}>{ep.title.replace('第', '').replace('集', '')}</button> ))}</div> ) : ( <div className="space-y-2.5">{availableSources.map((source, idx) => ( <button key={idx} onClick={() => { setCurrentSourceIndex(idx); setEpisodes(source.episodes); setSidePanelTab('episodes'); }} className={`w-full text-left p-3 lg:p-4 rounded-xl border transition-all flex justify-between items-center group ${currentSourceIndex === idx ? 'bg-brand/10 border-brand/50 text-brand' : 'bg-[#1a1f2e] border-white/5 text-gray-400 active:bg-white/5'}`}><div className="min-w-0"><div className={`font-black text-[10px] lg:text-xs mb-1 truncate ${currentSourceIndex === idx ? 'text-brand' : 'text-gray-200'}`}>{source.name}</div><div className="text-[9px] lg:text-[10px] text-gray-500 font-mono opacity-60">{source.episodes.length} 集资源</div></div>{currentSourceIndex === idx ? ( <div className="flex items-center gap-1"><span className="text-[9px] lg:text-[10px] font-bold uppercase">Active</span><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3 lg:w-4 lg:h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg></div> ) : ( <div className="w-2 h-2 rounded-full bg-white/10"></div> )}</button> ))}</div> )}
                                  </div>
                                  <div className="p-2 lg:p-3 text-center border-t border-white/5 bg-black/20"><p className="text-[9px] lg:text-[10px] text-gray-600 font-medium">智能 P2P 加速已开启</p></div>
                              </div>
                          )}
                      </div>
                      <MovieInfoCard movie={currentMovie} onSearch={triggerSearch} />
                      <Suspense fallback={null}><GeminiChat currentMovie={currentMovie} /></Suspense>
                  </section>
              )}

              {activeTab === 'home' && !currentMovie && (
                  <>
                      {heroItems.length > 0 && <HeroBanner items={heroItems} onPlay={handleItemClick} />}
                      {watchHistory.length > 0 && <HorizontalSection title="继续观看" items={watchHistory} id="history" onItemClick={handleItemClick} onItemContextMenu={(e, item) => { e.preventDefault(); setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item }); }} />}
                      <HorizontalSection title="热门电影" items={homeSections.movies || []} id="movies" onItemClick={handleItemClick} />
                      <HorizontalSection title="热播剧集" items={homeSections.series || []} id="series" onItemClick={handleItemClick} />
                      <HorizontalSection title="热门动漫" items={homeSections.anime || []} id="anime" onItemClick={handleItemClick} />
                      <HorizontalSection title="精选综艺" items={homeSections.variety || []} id="variety" onItemClick={handleItemClick} />
                  </>
              )}
              
              {activeTab === 'search' && !currentMovie && (
                  <div className="animate-fade-in max-w-5xl mx-auto">
                      <div className="flex gap-2 lg:gap-4 mb-6 lg:mb-8">
                          <form onSubmit={(e) => { e.preventDefault(); triggerSearch(searchQuery); }} className="relative flex-1 group">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 group-focus-within:text-brand transition-colors"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg></div>
                              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索电影、剧集、综艺..." className="w-full bg-[#121620] border border-white/10 rounded-xl py-3 lg:py-4 pl-12 pr-4 text-white text-sm focus:outline-none focus:border-brand/50 shadow-xl transition-all" />
                          </form>
                          <button onClick={() => triggerSearch(searchQuery)} className="bg-brand hover:bg-brand-hover text-black font-bold px-5 lg:px-8 rounded-xl transition-all active:scale-95 shadow-[0_0_15px_rgba(34,197,94,0.3)] whitespace-nowrap text-sm">搜索</button>
                      </div>
                      <div ref={resultsRef}>
                          {loading ? <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-brand border-t-transparent rounded-full"></div></div> : (
                              <>
                                  {searchResults.length > 0 ? (
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 lg:gap-6">
                                          {searchResults.map((item) => (
                                              <div key={item.vod_id} onClick={() => handleItemClick(item)} className="group cursor-pointer bg-gray-900 rounded-xl overflow-hidden aspect-[2/3] relative border border-white/5 hover:border-brand/50 transition-all duration-300 shadow-lg">
                                                  <ImageWithFallback src={item.vod_pic || ''} alt={item.vod_name} searchKeyword={item.vod_name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2.5 pt-10">
                                                      <h4 className="text-xs lg:text-sm font-bold text-white truncate group-hover:text-brand transition-colors">{item.vod_name}</h4>
                                                      <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400"><span>{item.vod_year || 'N/A'}</span><span className="bg-white/10 px-1 py-0.5 rounded">{item.type_name || '影视'}</span></div>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  ) : (hasSearched && <div className="text-center py-20 text-gray-500">未找到相关内容</div>)}
                              </>
                          )}
                      </div>
                  </div>
              )}
          </div>
      </div>
  );
};

export default App;
