
import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getHomeSections, getAggregatedSearch, getAggregatedMovieDetail, parseAllSources, fetchDoubanData, fetchCategoryItems, getHistory, addToHistory, removeFromHistory, fetchPersonDetail, initVodSources } from './services/vodService';
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
        <div className="mb-12 animate-fade-in group/section cv-auto" id={id}>
            <div className="flex justify-between items-end mb-6 px-1">
                <h3 className="text-2xl md:text-3xl font-black text-white flex items-center gap-4 border-l-4 border-brand pl-4 tracking-tighter uppercase">{title}</h3>
            </div>
            <div className="relative group">
                 <button className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-brand text-white p-3 rounded-full opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex border border-white/10 shadow-2xl -ml-5 backdrop-blur-md" onClick={() => scroll('left')}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>
                <div ref={scrollRef} className="flex gap-4 md:gap-8 overflow-x-auto pb-6 no-scrollbar snap-x scroll-smooth">
                    {items.map((item) => (
                        <div key={`${item.vod_id}-${(item as HistoryItem).last_updated || ''}`} className="flex-shrink-0 w-[140px] md:w-[220px] snap-start cursor-pointer relative group/card" onClick={() => onItemClick(item)} onContextMenu={(e) => onItemContextMenu && onItemContextMenu(e, item)}>
                            <div className="aspect-[2/3] rounded-2xl overflow-hidden relative shadow-2xl bg-slate-900 border border-white/5 group-hover/card:border-brand/40 transition-all duration-500">
                                <ImageWithFallback src={item.vod_pic} alt={item.vod_name} searchKeyword={item.vod_name} size="m" className="w-full h-full object-cover transform group-hover/card:scale-110 transition-transform duration-700" />
                                <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/30 transition-colors"></div>
                                {(item as any).vod_remarks && <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-md text-[10px] font-black text-white px-2 py-0.5 rounded-lg border border-white/10 uppercase tracking-widest">{(item as any).vod_remarks}</div>}
                                {(item as any).vod_score && <div className="absolute bottom-2 right-2 text-brand font-black text-sm drop-shadow-2xl">{(item as any).vod_score}</div>}
                                {(item as HistoryItem).episode_name && ( <div className="absolute bottom-0 left-0 right-0 bg-brand/90 backdrop-blur-sm text-black text-[10px] font-black px-3 py-1.5 text-center truncate uppercase tracking-tighter shadow-2xl">{(item as HistoryItem).episode_name}</div> )}
                            </div>
                            <h4 className="mt-4 text-sm font-black text-gray-200 truncate group-hover/card:text-brand transition-colors tracking-tight">{item.vod_name}</h4>
                        </div>
                    ))}
                </div>
                <button className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-brand text-white p-3 rounded-full opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex border border-white/10 shadow-2xl -mr-5 backdrop-blur-md" onClick={() => scroll('right')}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
            </div>
        </div>
    );
});

// Fix: Added the missing CategoryPage component definition
const CategoryPage = ({ category, onPlay }: { category: string, onPlay: (item: VodItem) => void }) => {
  const [items, setItems] = useState<VodItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({ filter1: '全部', filter2: '全部' });

  useEffect(() => {
    setPage(1);
    setItems([]);
  }, [category, filters]);

  useEffect(() => {
    setLoading(true);
    fetchCategoryItems(category, { ...filters, page }).then(res => {
      if (page === 1) setItems(res);
      else setItems(prev => [...prev, ...res]);
      setLoading(false);
    });
  }, [category, filters, page]);

  return (
    <div className="animate-fade-in space-y-12">
      <div className="flex flex-wrap gap-3 mb-8 px-1">
        {['全部', '动作', '喜剧', '爱情', '科幻', '动画', '悬疑', '惊悚'].map(f => (
          <button 
            key={f} 
            onClick={() => setFilters({ ...filters, filter1: f })}
            className={`px-6 py-2 rounded-full text-xs font-black transition-all tracking-widest uppercase border ${filters.filter1 === f ? 'bg-brand text-black border-brand shadow-xl shadow-brand/20' : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:text-white'}`}
          >
            {f}
          </button>
        ))}
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 md:gap-8">
        {items.map((item, idx) => (
          <div key={`${item.vod_id}-${idx}`} onClick={() => onPlay(item)} className="group cursor-pointer bg-[#0f111a] rounded-2xl overflow-hidden aspect-[2/3] relative border border-white/5 hover:border-brand/40 transition-all duration-500 shadow-2xl hover:-translate-y-2 flex flex-col">
            <ImageWithFallback src={item.vod_pic} alt={item.vod_name} searchKeyword={item.vod_name} size="m" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-12">
              <h4 className="text-sm font-black text-white truncate group-hover:text-brand transition-colors tracking-tight">{item.vod_name}</h4>
              <div className="flex justify-between items-center mt-2 text-[10px] font-black text-gray-500 uppercase tracking-tighter"><span>{item.vod_year || '2024'}</span><span className="text-brand">{item.vod_score || 'HOT'}</span></div>
            </div>
          </div>
        ))}
      </div>
      
      {loading && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="animate-spin h-10 w-10 border-4 border-brand border-t-transparent rounded-full shadow-[0_0_15px_#22c55e]"></div>
          <span className="text-gray-500 text-[10px] font-black tracking-[0.3em] uppercase">极速检索中...</span>
        </div>
      )}
      
      {!loading && items.length > 0 && (
        <div className="flex justify-center pt-12">
          <button 
            onClick={() => setPage(p => p + 1)} 
            className="group relative overflow-hidden bg-white/5 hover:bg-white/10 text-white font-black px-16 py-4 rounded-2xl transition-all active:scale-95 border border-white/10 uppercase text-xs tracking-[0.2em]"
          >
            <span className="relative z-10">加载更多 / LOAD MORE</span>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
          </button>
        </div>
      )}
    </div>
  );
};

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
  const [homeSections, setHomeSections] = useState<any>({ movies: [], series: [], anime: [], variety: [], all: [] });
  const [heroItems, setHeroItems] = useState<VodItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<HistoryItem[]>([]);
  
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, item: VodItem | null }>({ visible: false, x: 0, y: 0, item: null });

  useEffect(() => { initVodSources(); setWatchHistory(getHistory()); }, []);

  useEffect(() => {
    const handleGlobalClose = () => { if (contextMenu.visible) setContextMenu(prev => ({ ...prev, visible: false })); };
    window.addEventListener('click', handleGlobalClose);
    window.addEventListener('scroll', handleGlobalClose, true);
    window.addEventListener('contextmenu', handleGlobalClose);
    return () => { window.removeEventListener('click', handleGlobalClose); window.removeEventListener('scroll', handleGlobalClose, true); window.removeEventListener('contextmenu', handleGlobalClose); };
  }, [contextMenu.visible]);

  useEffect(() => {
       setLoading(true);
       getHomeSections().then(initialData => {
           if (initialData) {
               setHomeSections(initialData);
               setHeroItems(initialData.all?.slice(0, 10) || []);
           }
           setLoading(false);
       });
  }, []);

  useEffect(() => {
      const path = location.pathname.split('/')[1] || '';
      if (path === 'play') {
          const id = location.pathname.split('/')[2];
          const state = location.state as any;
          if (id && (!currentMovie || String(currentMovie.vod_id) !== id)) {
              handleSelectMovie(id, state?.apiUrl, state?.vodName);
          }
      } else {
          setActiveTab(URL_TO_TAB[path] || 'home');
          if (path !== 'play') setCurrentMovie(null); 
      }
  }, [location.pathname]);

  // 同步观看历史：每当集数或影片改变时更新
  useEffect(() => {
      if (currentMovie && currentEpisodeIndex >= 0 && episodes[currentEpisodeIndex]) {
          const historyItem: HistoryItem = {
              ...currentMovie,
              episode_index: currentEpisodeIndex,
              episode_name: episodes[currentEpisodeIndex].title,
              last_updated: Date.now(),
              source_index: currentSourceIndex
          };
          const updated = addToHistory(historyItem);
          setWatchHistory(updated);
          localStorage.setItem(`cine_last_episode_${currentMovie.vod_id}`, String(currentEpisodeIndex));
      }
  }, [currentEpisodeIndex, currentMovie, currentSourceIndex, episodes]);

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
                  
                  // 尝试从历史记录中恢复集数
                  const history = getHistory();
                  const inHistory = history.find(h => String(h.vod_id) === String(main.vod_id));
                  const savedIndex = inHistory ? inHistory.episode_index : parseInt(localStorage.getItem(`cine_last_episode_${main.vod_id}`) || '0');
                  
                  setCurrentEpisodeIndex((!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < allSources[initialIndex].episodes.length) ? savedIndex : 0);
              }
          }
      } catch (error) {
          console.error("Movie detail error", error);
      } finally { setLoading(false); }
  };

  const handleItemClick = (item: VodItem) => {
      navigate(`/play/${item.vod_id}`, { state: { apiUrl: item.api_url, vodName: item.vod_name } });
  };

  const handleRemoveHistory = (e: React.MouseEvent, item: VodItem) => {
      e.preventDefault();
      e.stopPropagation();
      const updated = removeFromHistory(item.vod_id);
      setWatchHistory(updated);
      setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const triggerSearch = async (query: string) => {
      if(!query.trim()) return;
      setSearchQuery(query);
      setLoading(true);
      setHasSearched(true);
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
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/90 backdrop-blur-3xl border-b border-white/5 hidden lg:block">
                <div className="container mx-auto max-w-[1400px]">
                    <div className="flex items-center justify-between h-16 px-6">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange('home')}>
                            <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center text-black font-black">C</div>
                            <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand to-cyan-400 tracking-tighter">CineStream</span>
                        </div>
                        <div className="flex items-center gap-1">
                            {navItems.map(item => ( <button key={item.id} onClick={() => onTabChange(item.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-black transition-all tracking-widest uppercase ${activeTab === item.id ? 'bg-brand text-black shadow-xl shadow-brand/20' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>{item.icon}{item.label}</button> ))}
                        </div>
                        <button onClick={onSettingsClick} className="text-gray-400 hover:text-white p-2.5 rounded-xl hover:bg-white/10 transition-all font-bold text-xs uppercase tracking-widest">Settings</button>
                    </div>
                </div>
            </nav>
            <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0f111a]/95 backdrop-blur-2xl border-t border-white/5 safe-area-bottom">
                <div className="grid grid-cols-6 h-16">
                    {navItems.map(item => (
                        <button key={item.id} onClick={() => onTabChange(item.id)} className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 relative ${activeTab === item.id ? 'text-brand' : 'text-gray-500'}`}>
                            <div className={`${activeTab === item.id ? 'scale-110' : 'scale-100'}`}>{item.icon}</div>
                            <span className="text-[10px] font-black uppercase tracking-tight">{item.label}</span>
                            {activeTab === item.id && <div className="absolute top-0 w-8 h-0.5 bg-brand rounded-full shadow-[0_0_10px_#22c55e]"></div>}
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
          
          {/* 交互式右键菜单 */}
          {contextMenu.visible && contextMenu.item && (
              <div 
                  className="fixed z-[9999] bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden animate-slide-up py-2 min-w-[200px]"
                  style={{ 
                    top: Math.min(contextMenu.y, window.innerHeight - 120), 
                    left: Math.min(contextMenu.x, window.innerWidth - 220) 
                  }}
                  onClick={(e) => e.stopPropagation()}
              >
                  <div className="px-4 py-2 border-b border-white/5 mb-1">
                      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest">操作选项</p>
                  </div>
                  <button 
                      onClick={(e) => handleRemoveHistory(e, contextMenu.item!)}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 font-bold hover:bg-red-500/10 flex items-center gap-3 transition-colors active:bg-red-500/20"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      删除这条历史记录
                  </button>
                  <button 
                      onClick={() => setContextMenu(prev => ({ ...prev, visible: false }))}
                      className="w-full text-left px-4 py-3 text-sm text-gray-400 font-bold hover:bg-white/5 transition-colors"
                  >
                      取消
                  </button>
              </div>
          )}

          <div className="relative z-10 container mx-auto px-4 lg:px-10 py-4 lg:py-8 max-w-[1600px]">
              {location.pathname.startsWith('/play/') && (
                  <section className="mb-12 animate-fade-in space-y-6">
                      <div className="flex flex-col lg:flex-row bg-[#0f111a] rounded-[2rem] lg:rounded-[3rem] overflow-hidden border border-white/5 shadow-3xl relative">
                          <div className={`flex-1 min-w-0 bg-black relative transition-all duration-700 z-10 ${!showSidePanel ? 'lg:h-[720px]' : 'lg:h-[500px] h-auto aspect-video'}`}>
                              {loading && !currentMovie ? (
                                  <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center gap-6 animate-pulse">
                                      <div className="w-16 h-16 border-4 border-brand border-t-transparent rounded-full animate-spin shadow-[0_0_20px_#22c55e]"></div>
                                      <span className="text-gray-500 font-black text-xs tracking-[0.3em] uppercase">深度检索极致片源...</span>
                                  </div>
                              ) : (
                                  <Suspense fallback={<div className="w-full h-full bg-black"></div>}>
                                      <VideoPlayer 
                                        url={currentMovie && episodes[currentEpisodeIndex] ? episodes[currentEpisodeIndex].url : ''} 
                                        poster={currentMovie?.vod_pic} 
                                        title={currentMovie?.vod_name} 
                                        episodeIndex={currentEpisodeIndex} 
                                        vodId={currentMovie?.vod_id} 
                                        onNext={() => currentEpisodeIndex < episodes.length - 1 && setCurrentEpisodeIndex(prev => prev + 1)} 
                                        sourceType={availableSources[currentSourceIndex]?.name}
                                      />
                                  </Suspense>
                              )}
                          </div>
                          {showSidePanel && currentMovie && (
                              <div className="w-full lg:w-[400px] flex flex-col border-l border-white/10 bg-[#0f111a]/80 backdrop-blur-3xl h-[450px] lg:h-auto animate-fade-in">
                                  <div className="flex bg-black/20">
                                      <button onClick={() => setSidePanelTab('episodes')} className={`flex-1 py-5 text-xs font-black tracking-widest uppercase transition-all relative ${sidePanelTab === 'episodes' ? 'text-brand' : 'text-gray-500'}`}>剧集选择{sidePanelTab === 'episodes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand shadow-[0_0_10px_#22c55e]"></div>}</button>
                                      <button onClick={() => setSidePanelTab('sources')} className={`flex-1 py-5 text-xs font-black tracking-widest uppercase transition-all relative ${sidePanelTab === 'sources' ? 'text-brand' : 'text-gray-500'}`}>极致线路{sidePanelTab === 'sources' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand shadow-[0_0_10px_#22c55e]"></div>}</button>
                                  </div>
                                  <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                                      {sidePanelTab === 'episodes' ? ( 
                                          <div className="grid grid-cols-4 lg:grid-cols-4 gap-4">{episodes.map((ep) => ( 
                                              <button key={ep.index} onClick={() => setCurrentEpisodeIndex(ep.index)} className={`h-12 rounded-xl border text-xs font-black transition-all shadow-lg ${currentEpisodeIndex === ep.index ? 'bg-brand text-black border-brand scale-105' : 'bg-white/5 text-gray-400 border-white/5 hover:text-brand active:scale-95'}`}>{ep.title.replace('第', '').replace('集', '')}</button> ))}
                                          </div> 
                                      ) : ( 
                                          <div className="space-y-4">{availableSources.map((source, idx) => ( 
                                              <button key={idx} onClick={() => { setCurrentSourceIndex(idx); setEpisodes(source.episodes); setSidePanelTab('episodes'); }} className={`w-full text-left p-5 rounded-2xl border transition-all flex justify-between items-center group ${currentSourceIndex === idx ? 'bg-brand/10 border-brand/40 text-brand' : 'bg-white/5 border-white/5 text-gray-400'}`}>
                                                  <div className="font-black text-xs truncate uppercase tracking-tight">{source.name}</div>
                                                  <div className={`w-2 h-2 rounded-full ${currentSourceIndex === idx ? 'bg-brand animate-pulse shadow-[0_0_8px_#22c55e]' : 'bg-white/10'}`}></div>
                                              </button> ))}
                                          </div> 
                                      )}
                                  </div>
                                  <div className="p-4 text-center bg-black/10 border-t border-white/5">
                                      <p className="text-[10px] text-gray-600 font-black tracking-[0.2em] uppercase">P2P 加速与弹幕系统已就绪</p>
                                  </div>
                              </div>
                          )}
                      </div>
                      {currentMovie && <MovieInfoCard movie={currentMovie} onSearch={(k) => navigate('/sousuo', { state: { query: k } })} />}
                      <Suspense fallback={null}><GeminiChat currentMovie={currentMovie} /></Suspense>
                  </section>
              )}

              {activeTab === 'home' && !location.pathname.startsWith('/play/') && (
                  <div className="space-y-12">
                      {heroItems.length > 0 && <HeroBanner items={heroItems} onPlay={handleItemClick} />}
                      
                      {watchHistory.length > 0 && (
                          <HorizontalSection 
                            title="继续观看 / RECENT WATCH" 
                            items={watchHistory} 
                            id="history" 
                            onItemClick={handleItemClick} 
                            onItemContextMenu={(e, item) => { 
                                e.preventDefault(); 
                                setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item }); 
                            }} 
                          />
                      )}
                      
                      {['movies', 'series', 'variety', 'anime'].map(cat => (
                        <HorizontalSection 
                            key={cat}
                            title={`${TAB_NAME[cat]} / POPULAR ${cat.toUpperCase()}`}
                            items={homeSections[cat] || []}
                            id={cat}
                            onItemClick={handleItemClick}
                        />
                      ))}
                  </div>
              )}

              {['movies', 'series', 'anime', 'variety'].includes(activeTab) && !location.pathname.startsWith('/play/') && <CategoryPage category={activeTab} onPlay={handleItemClick} />}

              {activeTab === 'search' && !location.pathname.startsWith('/play/') && (
                  <div className="animate-fade-in max-w-5xl mx-auto py-12">
                      <div className="flex gap-4 mb-12">
                          <form onSubmit={(e) => { e.preventDefault(); triggerSearch(searchQuery); }} className="relative flex-1 group">
                              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-500 group-focus-within:text-brand transition-colors"><NavIcons.Search /></div>
                              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="全网搜索高清资源、明星、导演..." className="w-full bg-[#0f111a] border border-white/10 rounded-3xl py-6 pl-14 pr-8 text-white text-lg font-black focus:border-brand/60 focus:ring-8 focus:ring-brand/5 shadow-3xl transition-all" />
                          </form>
                          <button onClick={() => triggerSearch(searchQuery)} className="bg-brand hover:bg-brand-hover text-black font-black px-12 rounded-3xl transition-all active:scale-95 shadow-[0_10px_30px_rgba(34,197,94,0.3)]">搜索</button>
                      </div>
                      <div ref={resultsRef}>
                          {loading ? <div className="flex justify-center py-40"><div className="animate-spin h-12 w-12 border-4 border-brand border-t-transparent rounded-full shadow-[0_0_20px_#22c55e]"></div></div> : (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                                  {searchResults.map((item, idx) => (
                                      <div key={`${item.vod_id}-${idx}`} onClick={() => handleItemClick(item)} className="group cursor-pointer bg-[#0f111a] rounded-2xl overflow-hidden aspect-[2/3] relative border border-white/5 hover:border-brand/40 transition-all duration-500 shadow-2xl hover:-translate-y-2 flex flex-col">
                                          <ImageWithFallback src={item.vod_pic} alt={item.vod_name} searchKeyword={item.vod_name} size="m" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-4 pt-12">
                                              <h4 className="text-sm font-black text-white truncate group-hover:text-brand transition-colors tracking-tight">{item.vod_name}</h4>
                                              <div className="flex justify-between items-center mt-2 text-[10px] font-black text-gray-500"><span>{item.vod_year || '2024'}</span><span className="text-brand">{item.vod_score || ''}</span></div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          )}
                          {hasSearched && !loading && searchResults.length === 0 && <div className="text-center py-40 text-gray-600 font-black tracking-widest uppercase">资源未命中，请更换关键词尝试</div>}
                      </div>
                  </div>
              )}
          </div>
      </div>
  );
};

export default App;
