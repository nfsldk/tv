import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getHomeSections, searchCms, getAggregatedSearch, getAggregatedMovieDetail, parseAllSources, enrichVodDetail, fetchDoubanData, fetchCategoryItems, getHistory, addToHistory, removeFromHistory, fetchPersonDetail, initVodSources } from './services/vodService';
import MovieInfoCard from './components/MovieInfoCard';
import ImageWithFallback from './components/ImageWithFallback';
import { VodItem, VodDetail, Episode, PlaySource, HistoryItem, PersonDetail } from './types';

const VideoPlayer = lazy(() => import('./components/VideoPlayer'));
const GeminiChat = lazy(() => import('./components/GeminiChat'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

const NavIcons = {
    Home: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
    Search: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
    Movie: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125 1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 5.496 4.5 4.875 4.5M6 9.375c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125V8.625c0-.621-.504-1.125-1.125-1.125h-1.5M6 9.375v5.25m0-5.25C6 8.754 5.496 8.25 4.875 8.25M6 14.625c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125v-2.25c0-.621-.504-1.125-1.125-1.125h-1.5M6 14.625v3.75m0-3.75C6 14.004 5.496 13.5 4.875 13.5M6 18.375c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-1.5" /></svg>,
    Series: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" /></svg>,
    Anime: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>,
    Variety: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
    Settings: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>
};

const URL_TO_TAB: Record<string, string> = {
    '': 'home',
    'dianying': 'movies',
    'dianshiju': 'series',
    'dongman': 'anime',
    'zongyi': 'variety',
    'sousuo': 'search'
};

const TAB_TO_URL: Record<string, string> = {
    'home': '/',
    'movies': '/dianying',
    'series': '/dianshiju',
    'anime': '/dongman',
    'variety': '/zongyi',
    'search': '/sousuo'
};

const HeroBanner = ({ items, onPlay }: { items: VodItem[], onPlay: (item: VodItem) => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [detail, setDetail] = useState<any>(null);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => {
        handleNext();
    }, 8000); 
    return () => clearInterval(interval);
  }, [currentIndex, items.length]);

  useEffect(() => {
      if (items && items.length > 0) {
          const item = items[currentIndex];
          setDetail(null);
          fetchDoubanData(item.vod_name, item.vod_id).then(res => {
              if (res) setDetail(res);
          });
      }
  }, [currentIndex, items]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const handlePrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) handleNext();
    if (isRightSwipe) handlePrev();
    setTouchStart(0);
    setTouchEnd(0);
  };

  if (!items || items.length === 0) return null;
  const activeItem = items[currentIndex];

  return (
    <div 
        className="relative w-full h-[280px] md:h-[450px] rounded-2xl overflow-hidden mb-6 md:mb-12 group shadow-2xl bg-[#0a0a0a] touch-pan-y select-none border border-white/5"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
      {/* Background Layer */}
      <div key={activeItem.vod_id + '_bg'} className="absolute inset-0 animate-fade-in transition-all duration-700">
          <ImageWithFallback 
              src={activeItem.vod_pic} 
              alt={activeItem.vod_name} 
              className="w-full h-full object-cover blur-md opacity-40 scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/70 to-transparent z-0"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/60 to-transparent z-0"></div>
      </div>

      {/* Content Container */}
      <div key={activeItem.vod_id + '_content'} className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="container mx-auto px-4 md:px-12 w-full h-full flex items-center">
            {/* Force Row Layout on ALL screens (including mobile) */}
            <div className="flex flex-row items-center gap-4 md:gap-10 w-full animate-slide-up">
                
                {/* Poster: Optimized size for mobile */}
                <div className="flex-shrink-0 w-[110px] md:w-[200px] aspect-[2/3] rounded-lg md:rounded-xl overflow-hidden shadow-[0_8px_25px_rgba(0,0,0,0.7)] border border-white/20 relative z-20 hover:scale-105 transition-transform duration-500 bg-black/50">
                    <ImageWithFallback 
                        src={activeItem.vod_pic} 
                        alt={activeItem.vod_name} 
                        searchKeyword={activeItem.vod_name}
                        className="w-full h-full object-cover" 
                    />
                </div>

                {/* Info Section: Always Left Aligned */}
                <div className="flex-1 text-left space-y-2 md:space-y-5 flex flex-col items-start justify-center min-w-0">
                    
                    {/* Tags */}
                    <div className="flex flex-wrap items-center justify-start gap-1.5 md:gap-2">
                        <span className="bg-brand text-black text-[10px] md:text-xs font-black px-1.5 py-0.5 rounded uppercase tracking-wider shadow-lg shadow-brand/20">
                            {detail?.score || activeItem.vod_score || 'HOT'}
                        </span>
                        <span className="bg-white/10 border border-white/10 text-gray-200 text-[10px] md:text-xs font-medium px-2 py-0.5 rounded backdrop-blur-md">
                            {activeItem.vod_year || '2025'}
                        </span>
                        <span className="bg-white/10 border border-white/10 text-gray-200 text-[10px] md:text-xs font-medium px-2 py-0.5 rounded backdrop-blur-md">
                            {activeItem.type_name || detail?.type_name || '精选'}
                        </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-xl md:text-5xl font-black text-white leading-tight drop-shadow-xl tracking-tight line-clamp-2">
                        {activeItem.vod_name}
                    </h2>

                    {/* Sub-info */}
                    <div className="text-gray-300 text-xs md:text-base font-medium line-clamp-1 opacity-90 flex gap-3">
                        {detail?.director && <span>导: {detail.director}</span>}
                        {detail?.actor && <span>演: {detail.actor}</span>}
                    </div>

                    {/* Description - Ensure visible on mobile */}
                    <p className="text-gray-300/90 text-[11px] md:text-base leading-relaxed line-clamp-3 drop-shadow-md max-w-3xl">
                        {detail?.content ? detail.content.replace(/<[^>]+>/g, '') : (activeItem.vod_remarks || "暂无简介...")}
                    </p>

                    {/* Action Buttons */}
                    <div className="pt-1 md:pt-3 flex flex-row gap-3">
                        <button 
                            onClick={() => onPlay(activeItem)}
                            className="bg-white text-black hover:bg-gray-200 text-xs md:text-lg font-bold px-5 py-2 md:px-10 md:py-3.5 rounded-full flex items-center gap-1.5 md:gap-2 transition-all hover:scale-105 shadow-[0_0_20px_rgba(255,255,255,0.3)] active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 md:w-6 md:h-6">
                                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                            </svg>
                            <span>立即播放</span>
                        </button>
                        
                        <button 
                            className="bg-white/10 text-white hover:bg-white/20 border border-white/10 backdrop-blur-md text-xs md:text-lg font-bold px-5 py-2 md:px-10 md:py-3.5 rounded-full flex items-center gap-1.5 md:gap-2 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 md:w-6 md:h-6">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                            </svg>
                            <span>详情</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Indicators */}
      <div className="absolute bottom-3 md:bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {items.map((_, idx) => (
              <button 
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                  className={`h-1 md:h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-brand w-6 md:w-8' : 'bg-white/20 w-1.5 md:w-2 hover:bg-white/50'}`}
              />
          ))}
      </div>
      
      {/* Arrows (Hidden on Mobile) */}
      <button 
        onClick={(e) => { e.stopPropagation(); handlePrev(); }}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 text-white/50 hover:bg-black/50 hover:text-white transition-all hidden md:flex backdrop-blur-sm border border-white/5"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
      </button>
      <button 
        onClick={(e) => { e.stopPropagation(); handleNext(); }}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 text-white/50 hover:bg-black/50 hover:text-white transition-all hidden md:flex backdrop-blur-sm border border-white/5"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
      </button>
    </div>
  );
};

const HorizontalSection = ({ title, items, id, onItemClick, onItemContextMenu }: { 
    title: string, 
    items: (VodItem | HistoryItem)[], 
    id: string, 
    onItemClick: (item: VodItem) => void,
    onItemContextMenu?: (e: React.MouseEvent, item: VodItem) => void
}) => {
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
        <div className="mb-8 animate-fade-in group/section" id={id}>
            <div className="flex justify-between items-end mb-4 px-1">
                <h3 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2 border-l-4 border-brand pl-3">
                    {title}
                </h3>
            </div>
            <div className="relative group">
                 {/* Left Arrow Button */}
                 <button
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-brand text-white p-2 rounded-full opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex border border-white/10 shadow-lg -ml-4"
                    onClick={() => scroll('left')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                </button>

                <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-4 no-scrollbar snap-x scroll-smooth">
                    {items.map((item) => (
                        <div 
                            key={`${item.vod_id}-${(item as HistoryItem).last_updated || ''}`} 
                            className="flex-shrink-0 w-[140px] md:w-[180px] snap-start cursor-pointer relative group/card"
                            onClick={() => onItemClick(item)}
                            onContextMenu={(e) => onItemContextMenu && onItemContextMenu(e, item)}
                        >
                            <div className="aspect-[2/3] rounded-lg overflow-hidden relative shadow-lg bg-gray-900 border border-white/5 group-hover/card:border-brand/50 transition-all duration-300">
                                <ImageWithFallback src={item.vod_pic} alt={item.vod_name} className="w-full h-full object-cover transform group-hover/card:scale-105 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/20 transition-colors"></div>
                                {(item as any).vod_remarks && <div className="absolute top-1 right-1 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded backdrop-blur-sm">{(item as any).vod_remarks}</div>}
                                {(item as any).vod_score && <div className="absolute bottom-1 right-1 text-brand font-bold text-xs drop-shadow-md">{(item as any).vod_score}</div>}
                                {(item as HistoryItem).episode_name && (
                                     <div className="absolute bottom-0 left-0 right-0 bg-brand/90 text-black text-[10px] font-bold px-2 py-1 text-center">
                                         上次看到: {(item as HistoryItem).episode_name}
                                     </div>
                                )}
                            </div>
                            <h4 className="mt-2 text-sm text-gray-200 font-medium truncate group-hover/card:text-brand transition-colors">{item.vod_name}</h4>
                        </div>
                    ))}
                </div>

                {/* Right Arrow Button */}
                <button
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-black/60 hover:bg-brand text-white p-2 rounded-full opacity-0 group-hover/section:opacity-100 transition-all hidden md:flex border border-white/10 shadow-lg -mr-4"
                    onClick={() => scroll('right')}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                </button>
            </div>
        </div>
    );
};

const CategoryGrid = ({ category, onItemClick }: { category: string, onItemClick: (item: VodItem) => void }) => {
    const [items, setItems] = useState<VodItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter1, setFilter1] = useState('全部');
    const [filter2, setFilter2] = useState('全部');

    const getFilters = () => {
        if (category === 'movies') return { f1: ['全部', '最新电影', '豆瓣高分', '冷门佳片'], f2: ['全部', '动作', '喜剧', '爱情', '科幻', '悬疑', '恐怖'] };
        if (category === 'series') return { f1: ['最近热门'], f2: ['全部', '国产', '欧美', '日本', '韩国', '动漫'] };
        if (category === 'anime') return { f1: ['全部', '剧场版'], f2: ['全部', '周一', '周二', '周三', '周四', '周五', '周六', '周日'] };
        if (category === 'variety') return { f1: ['全部'], f2: ['全部', '国内', '韩国', '欧美', '日本'] };
        return { f1: [], f2: [] };
    };

    const filters = getFilters();

    useEffect(() => {
        setLoading(true);
        fetchCategoryItems(category, { filter1, filter2 }).then(res => {
            setItems(res);
            setLoading(false);
        });
    }, [category, filter1, filter2]);

    return (
        <div className="animate-fade-in">
             <div className="mb-6 flex flex-wrap gap-4">
                 {filters.f1.length > 0 && (
                     <div className="flex flex-wrap gap-2 items-center">
                         <span className="text-gray-500 text-xs">排序:</span>
                         {filters.f1.map(f => (
                             <button key={f} onClick={() => setFilter1(f)} className={`text-xs px-3 py-1 rounded-full border ${filter1 === f ? 'bg-brand text-black border-brand' : 'bg-transparent text-gray-400 border-gray-700 hover:text-white'}`}>{f}</button>
                         ))}
                     </div>
                 )}
                 {filters.f2.length > 0 && (
                     <div className="flex flex-wrap gap-2 items-center">
                         <span className="text-gray-500 text-xs">筛选:</span>
                         {filters.f2.map(f => (
                             <button key={f} onClick={() => setFilter2(f)} className={`text-xs px-3 py-1 rounded-full border ${filter2 === f ? 'bg-brand text-black border-brand' : 'bg-transparent text-gray-400 border-gray-700 hover:text-white'}`}>{f}</button>
                         ))}
                     </div>
                 )}
             </div>

             {loading ? (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                     {Array.from({length: 10}).map((_, i) => (
                         <div key={i} className="aspect-[2/3] bg-gray-800 rounded-lg animate-pulse"></div>
                     ))}
                 </div>
             ) : (
                 <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                     {items.map(item => (
                         <div key={item.vod_id} onClick={() => onItemClick(item)} className="group cursor-pointer">
                             <div className="aspect-[2/3] bg-gray-900 rounded-xl overflow-hidden relative shadow-lg border border-white/5 group-hover:border-brand/50 transition-all duration-300 hover:-translate-y-1">
                                 <ImageWithFallback src={item.vod_pic} alt={item.vod_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                 {item.vod_score && <div className="absolute top-1 right-1 bg-brand text-black text-[10px] font-bold px-1.5 py-0.5 rounded">{item.vod_score}</div>}
                                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                             </div>
                             <h4 className="mt-2 text-sm text-gray-200 font-bold truncate group-hover:text-brand transition-colors">{item.vod_name}</h4>
                             <p className="text-xs text-gray-500 truncate">{item.vod_remarks || item.type_name}</p>
                         </div>
                     ))}
                 </div>
             )}
        </div>
    );
};

const PersonProfileCard = ({ person }: { person: PersonDetail }) => {
    return (
        <div className="bg-gray-900 border border-white/10 rounded-xl p-6 mb-8 flex flex-col md:flex-row gap-6 animate-fade-in">
             <div className="w-32 h-44 md:w-40 md:h-56 flex-shrink-0 rounded-lg overflow-hidden shadow-xl mx-auto md:mx-0">
                 <ImageWithFallback src={person.pic} alt={person.name} className="w-full h-full object-cover" />
             </div>
             <div className="flex-1 text-center md:text-left">
                 <h2 className="text-2xl font-bold text-white mb-2">{person.name}</h2>
                 <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-400 mb-4 justify-center md:justify-start">
                     {person.gender && <span>性别: {person.gender}</span>}
                     {person.birthdate && <span>生日: {person.birthdate}</span>}
                     {person.birthplace && <span>出生地: {person.birthplace}</span>}
                     {person.role && <span>职业: {person.role}</span>}
                     {person.constellation && <span>星座: {person.constellation}</span>}
                 </div>
                 <h3 className="text-brand font-bold mb-2 text-sm uppercase tracking-wider">简介</h3>
                 <p className="text-gray-300 text-sm leading-relaxed line-clamp-4 md:line-clamp-none">
                     {person.intro || '暂无简介'}
                 </p>
             </div>
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
  
  // PWA Install State
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  // Player State
  const [availableSources, setAvailableSources] = useState<PlaySource[]>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(-1);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [sidePanelTab, setSidePanelTab] = useState<'episodes' | 'sources'>('episodes');
  const [isReverseOrder, setIsReverseOrder] = useState(false);
  
  // Pagination State for Episodes
  const [currentEpisodePage, setCurrentEpisodePage] = useState(0);
  const EPISODES_PER_PAGE = 36;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ visible: boolean, x: number, y: number, item: VodItem | null }>({ visible: false, x: 0, y: 0, item: null });
  
  const [homeSections, setHomeSections] = useState<{
      movies: VodItem[];
      series: VodItem[];
      shortDrama: VodItem[];
      anime: VodItem[];
      variety: VodItem[];
  }>({ movies: [], series: [], shortDrama: [], anime: [], variety: [] });

  const [heroItems, setHeroItems] = useState<VodItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<HistoryItem[]>([]);

  // PWA Install Prompt Listener
  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
    }
  };

  // Initialize Sources from Cloud on App Mount
  useEffect(() => {
      initVodSources();
  }, []);

  // SEO Update logic
  // ... (SEO logic same as before) ...
  useEffect(() => {
      const path = location.pathname;
      const updateSEO = (title: string, description: string, keywords: string, image?: string) => {
        document.title = title;
        const setMeta = (name: string, content: string) => {
            let element = document.querySelector(`meta[name="${name}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute('name', name);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };
        const setOg = (property: string, content: string) => {
            let element = document.querySelector(`meta[property="${property}"]`);
            if (!element) {
                element = document.createElement('meta');
                element.setAttribute('property', property);
                document.head.appendChild(element);
            }
            element.setAttribute('content', content);
        };
        setMeta('description', description);
        setMeta('keywords', keywords);
        setOg('og:title', title);
        setOg('og:description', description);
        setOg('og:type', 'website');
        setOg('og:site_name', 'CineStream AI');
        setOg('og:url', window.location.href);
        if (image) setOg('og:image', image);
      };

      if (path === '/') {
          updateSEO(
              'CineStream AI-海量高清电影电视剧动漫综艺在线观看_中国领先的影视聚合平台',
              'CineStream AI为您提供最新最热的电影、电视剧、综艺、动漫高清在线观看。包含国产剧、美剧、韩剧、日剧等海量资源，支持智能P2P加速与AI助手互动，致力于为您提供极致的视听体验。',
              '电影,电视剧,综艺,动漫,视频,在线观看,CineStream AI,美剧,韩剧,4K,高清,免费视频'
          );
      } else if (path === '/dianying') {
          updateSEO(
              '电影频道-2025最新好看的电影大全-高清电影在线观看-CineStream AI',
              'CineStream AI电影频道汇集了全球最新最热的大片，涵盖动作、喜剧、科幻、恐怖、爱情等多种类型，提供高清流畅的在线观看体验。',
              '电影,电影大全,高清电影,免费电影,在线观看,动作片,喜剧片,科幻片,CineStream AI'
          );
      } else if (path === '/dianshiju') {
          updateSEO(
              '电视剧频道-2025最新好看的电视剧大全-高清电视剧在线观看-CineStream AI',
              'CineStream AI电视剧频道为您提供最新热播的国产剧、美剧、韩剧、日剧、港台剧等，同步更新，高清免费在线观看。',
              '电视剧,电视剧大全,高清电视剧,国产剧,美剧,韩剧,日剧,在线观看,CineStream AI'
          );
      } else if (path === '/dongman') {
          updateSEO(
              '动漫频道-2025最新好看的动漫大全-高清动漫在线观看-CineStream AI',
              'CineStream AI动漫频道为您提供最新好看的日本动漫、国产动漫、欧美动漫，海量新番连载，高清在线观看。',
              '动漫,动漫大全,日本动漫,国产动漫,新番,在线观看,CineStream AI'
          );
      } else if (path === '/zongyi') {
          updateSEO(
              '综艺频道-2025最新好看的综艺大全-高清综艺在线观看-CineStream AI',
              'CineStream AI综艺频道为您提供最新最热的国内综艺、韩国综艺、欧美综艺等，真人秀、脱口秀应有尽有。',
              '综艺,综艺大全,韩国综艺,真人秀,在线观看,CineStream AI'
          );
      } else if (path.startsWith('/play/') && currentMovie) {
          const rawContent = currentMovie.vod_content ? currentMovie.vod_content.replace(/<[^>]+>/g, '').slice(0, 150) : '暂无简介';
          const actors = currentMovie.vod_actor || '';
          const director = currentMovie.vod_director || '';
          const type = currentMovie.type_name || '影视';
          
          let titleSuffix = '';
          const isMovie = type === '电影' || episodes.length <= 1;

          if (isMovie) {
              const epTitle = episodes[currentEpisodeIndex]?.title || 'HD';
              const cleanEpTitle = epTitle.replace(/第|集/g, '').replace(/^0+/, ''); 
              titleSuffix = ` ${isNaN(Number(cleanEpTitle)) ? cleanEpTitle : 'HD'}`; 
          } else {
              const epTitle = episodes[currentEpisodeIndex]?.title;
              if (epTitle) {
                  const raw = epTitle.replace(/第|集/g, '').replace(/^0+/, '');
                  const display = isNaN(Number(raw)) ? raw : `第${raw}集`;
                  titleSuffix = ` ${display}`;
              }
          }

          updateSEO(
              `《${currentMovie.vod_name}》${titleSuffix}在线观看_全集高清播放_${type}_CineStream AI`,
              `CineStream AI为您提供《${currentMovie.vod_name}》免费高清在线观看，${currentMovie.vod_name}剧情介绍：${rawContent}...`,
              `${currentMovie.vod_name},${currentMovie.vod_name}在线观看,${currentMovie.vod_name}全集,${actors},${director},${type},CineStream AI`,
              currentMovie.vod_pic
          );
      } else if (path.startsWith('/sousuo')) {
           const title = searchQuery ? `${searchQuery}-搜索结果-CineStream AI` : '搜索中心-CineStream AI';
           updateSEO(
              title,
              'CineStream AI全网搜索，找到你想看的每一部影视作品。',
              '搜索,视频搜索,影视搜索,CineStream AI'
           );
      }
  }, [location.pathname, currentMovie, searchQuery, currentEpisodeIndex, episodes]);

  // Load Watch History on Mount
  useEffect(() => {
      setWatchHistory(getHistory());
  }, []);

  // Save episode progress to localStorage AND History list whenever it changes
  useEffect(() => {
      if (currentMovie && currentEpisodeIndex >= 0) {
          localStorage.setItem(`cine_last_episode_${currentMovie.vod_id}`, String(currentEpisodeIndex));
          
          const episodeName = episodes[currentEpisodeIndex] ? episodes[currentEpisodeIndex].title : `第${currentEpisodeIndex+1}集`;
          const historyItem: HistoryItem = {
              ...currentMovie,
              episode_index: currentEpisodeIndex,
              episode_name: episodeName,
              last_updated: Date.now(),
              source_index: currentSourceIndex
          };
          const updatedHistory = addToHistory(historyItem);
          setWatchHistory(updatedHistory);
      }
  }, [currentEpisodeIndex, currentMovie]);

  // Update current page when episode index changes (auto-switch tab)
  useEffect(() => {
    if (currentEpisodeIndex >= 0) {
      const page = Math.floor(currentEpisodeIndex / EPISODES_PER_PAGE);
      setCurrentEpisodePage(page);
    }
  }, [currentEpisodeIndex]);

  const fetchInitial = useCallback(async () => {
       setLoading(true);
       try {
           const sections = await getHomeSections();
           setHomeSections(sections);
           const allItems = [ ...sections.movies, ...sections.series, ...sections.anime, ...sections.variety ];
           const finalItems = allItems.length > 0 ? allItems : sections.movies; 
           const shuffled = [...finalItems].sort(() => 0.5 - Math.random());
           setHeroItems(shuffled.slice(0, 10));
       } catch(e) { console.error(e); } 
       finally { setLoading(false); }
  }, []);

  useEffect(() => {
      fetchInitial();
  }, [fetchInitial]);

  useEffect(() => {
      const path = location.pathname.split('/')[1] || '';
      if (path === 'play') {
          const id = location.pathname.split('/')[2];
          if (id && (!currentMovie || String(currentMovie.vod_id) !== id)) {
              handleSelectMovie(id);
          }
      } else {
          const tab = URL_TO_TAB[path] || 'home';
          setActiveTab(tab);
          if (path !== 'play') {
              setCurrentMovie(null); 
          }
          setHasSearched(tab === 'search');
      }
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = () => setContextMenu({ ...contextMenu, visible: false });
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, item: VodItem) => {
      e.preventDefault();
      setContextMenu({
          visible: true,
          x: e.clientX,
          y: e.clientY,
          item: item
      });
  };

  const handleDeleteHistory = () => {
      if (contextMenu.item) {
          const updated = removeFromHistory(contextMenu.item.vod_id);
          setWatchHistory(updated);
      }
      setContextMenu({ ...contextMenu, visible: false });
  };

  const triggerSearch = async (query: string) => {
      if(!query.trim()) return;
      setSearchQuery(query);
      setLoading(true);
      setHasSearched(true);
      setPersonProfile(null); 

      if (activeTab !== 'search') {
          navigate(TAB_TO_URL['search']);
      }
      try {
          const results = await getAggregatedSearch(query);
          const celebrity = results.find(r => r.type_name === 'celebrity');
          
          if (celebrity) {
             const detail = await fetchPersonDetail(celebrity.vod_id);
             if (detail) {
                 setPersonProfile(detail);
                 if (detail.works && detail.works.length > 0) {
                     setSearchResults(detail.works);
                 } else {
                     setSearchResults(results.filter(r => r.type_name !== 'celebrity'));
                 }
             } else {
                 setSearchResults(results);
             }
          } else {
             const sortedResults = results.sort((a, b) => {
                  const lowerQuery = query.toLowerCase();
                  const aName = a.vod_name.toLowerCase();
                  const bName = b.vod_name.toLowerCase();
                  
                  if (aName === lowerQuery && bName !== lowerQuery) return -1;
                  if (bName === lowerQuery && aName !== lowerQuery) return 1;
                  return 0;
              });
              setSearchResults(sortedResults);
          }
      } catch (error) {
          console.error("Search error", error);
      } finally {
          setLoading(false);
      }
  };

  const handleSearch = (e: React.FormEvent) => {
      e.preventDefault();
      triggerSearch(searchQuery);
  };

  const handleItemClick = async (item: VodItem) => {
      if (item.type_name === 'celebrity') {
        setLoading(true);
        try {
            const detail = await fetchPersonDetail(item.vod_id);
            if (detail) {
                setPersonProfile(detail);
                if (detail.works && detail.works.length > 0) {
                    setSearchResults(detail.works);
                } else {
                    setSearchResults([]);
                }
                // Scroll to top of results container if available
                if (resultsRef.current) {
                    resultsRef.current.scrollIntoView({ behavior: 'smooth' });
                }
            }
        } catch (e) {
            console.error("Failed to fetch person detail", e);
        } finally {
            setLoading(false);
        }
        return;
      }

      if (item.api_url && item.source !== 'douban') {
          handleSelectMovie(item.vod_id, item.api_url);
          navigate(`/play/${item.vod_id}`);
          return;
      }

      setLoading(true);
      try {
          await fetchDoubanData(item.vod_name, item.vod_id);
          const cleanName = item.vod_name
              .replace(/[（\(]\d{4}[）\)]/g, '')
              .replace(/第.+?季|Season\s*\d+|S\d+/gi, '')
              .replace(/集/g, '')
              .trim();

          const queries = [item.vod_name, cleanName];
          let foundVideo: VodItem | null = null;
          
          for (const q of queries) {
              if(!q) continue;
              const res = await searchCms(q); 
              if (res.list && res.list.length > 0) {
                  const exact = res.list.find((v: any) => v.vod_name === item.vod_name);
                  foundVideo = (exact || res.list[0]) as VodItem;
                  break; 
              }
          }

          if (foundVideo) {
              handleSelectMovie(foundVideo.vod_id, foundVideo.api_url);
              navigate(`/play/${foundVideo.vod_id}`);
          } else {
             triggerSearch(cleanName || item.vod_name);
          }
      } catch (e) {
          console.error("Failed to find video source", e);
          triggerSearch(item.vod_name);
      } finally {
          setLoading(false);
      }
  };

  const handleSelectMovie = async (id: number | string, apiUrl?: string) => {
      setLoading(true);
      setShowSidePanel(true);
      setSidePanelTab('episodes');
      
      try {
          const result = await getAggregatedMovieDetail(id, apiUrl);
          
          if (result && result.main) {
              const { main, alternatives } = result;
              
              const allSources = parseAllSources([main, ...alternatives]);
              
              if (allSources.length > 0) {
                  const m3u8Index = allSources.findIndex(s => s.name.toLowerCase().includes('m3u8'));
                  const initialIndex = m3u8Index >= 0 ? m3u8Index : 0;
                  
                  setAvailableSources(allSources);
                  setCurrentSourceIndex(initialIndex);
                  setEpisodes(allSources[initialIndex].episodes);
                  setCurrentMovie(main);
                  
                  const savedIndex = parseInt(localStorage.getItem(`cine_last_episode_${main.vod_id}`) || '0');
                  if (!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < allSources[initialIndex].episodes.length) {
                      setCurrentEpisodeIndex(savedIndex);
                  } else {
                      setCurrentEpisodeIndex(0);
                  }
                  
                  window.scrollTo({ top: 0, behavior: 'smooth' });

                  enrichVodDetail(main).then(updates => {
                      if (updates) {
                          setCurrentMovie(prev => {
                              if (prev && String(prev.vod_id) === String(main.vod_id)) {
                                  return { ...prev, ...updates };
                              }
                              return prev;
                          });
                      }
                  });
              } else {
                 alert('未找到可播放的M3U8资源 (No playable M3U8 sources found)');
              }
          }
      } catch (error) {
          console.error(error);
      } finally {
          setLoading(false);
      }
  };

  const handleSourceChange = (index: number) => {
      setCurrentSourceIndex(index);
      const newEpisodes = availableSources[index].episodes;
      setEpisodes(newEpisodes);
      
      if (currentEpisodeIndex >= 0 && currentEpisodeIndex < newEpisodes.length) {
          setCurrentEpisodeIndex(currentEpisodeIndex);
      } else {
          setCurrentEpisodeIndex(0);
      }
      setSidePanelTab('episodes'); 
  };

  const currentEpUrl = useMemo(() => {
      if (currentEpisodeIndex >= 0 && episodes[currentEpisodeIndex]) {
          return episodes[currentEpisodeIndex].url;
      }
      return '';
  }, [currentEpisodeIndex, episodes]);

  const displayEpisodes = useMemo(() => {
      let list = [...episodes];
      if (isReverseOrder) list.reverse();
      
      const startIndex = currentEpisodePage * EPISODES_PER_PAGE;
      const endIndex = startIndex + EPISODES_PER_PAGE;
      return list.slice(startIndex, endIndex);
  }, [episodes, isReverseOrder, currentEpisodePage]);

  const totalEpisodePages = Math.ceil(episodes.length / EPISODES_PER_PAGE);

  const handleTabChange = (tab: string) => {
      const path = TAB_TO_URL[tab];
      if (path) {
          navigate(path);
      }
  };

  const handleEpisodeEnd = useCallback(() => {
    if(currentEpisodeIndex < episodes.length - 1) setCurrentEpisodeIndex(prev => prev + 1);
  }, [currentEpisodeIndex, episodes.length]);

  const handleNextEpisode = useCallback(() => {
    if(currentEpisodeIndex < episodes.length - 1) setCurrentEpisodeIndex(prev => prev + 1);
  }, [currentEpisodeIndex, episodes.length]);

  const isHomeEmpty = useMemo(() => {
      return !loading && activeTab === 'home' && (!homeSections.movies || homeSections.movies.length === 0);
  }, [loading, activeTab, homeSections]);

  const NavBar = ({ activeTab, onTabChange, onSettingsClick, installable, onInstall }: { activeTab: string, onTabChange: (tab: string) => void, onSettingsClick: () => void, installable: boolean, onInstall: () => void }) => {
    const navItems = [
        { id: 'home', label: '首页', icon: NavIcons.Home },
        { id: 'movies', label: '电影', icon: NavIcons.Movie },
        { id: 'series', label: '剧集', icon: NavIcons.Series },
        { id: 'anime', label: '动漫', icon: NavIcons.Anime },
        { id: 'variety', label: '综艺', icon: NavIcons.Variety },
        { id: 'search', label: '搜索', icon: NavIcons.Search },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
            <div className="container mx-auto max-w-[1400px]">
                <div className="hidden lg:flex items-center justify-between h-16 px-4 relative">
                    <div className="flex items-center gap-2 cursor-pointer z-20" onClick={() => onTabChange('home')}>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand to-cyan-400">
                            CineStream
                        </span>
                    </div>
                    <div className="flex items-center gap-1 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
                        {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                                    activeTab === item.id 
                                    ? 'bg-white/10 text-brand shadow-[0_0_10px_rgba(34,197,94,0.2)]' 
                                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {item.icon}
                                {item.label}
                            </button>
                        ))}
                    </div>
                    <div className="w-24 flex justify-end gap-2">
                         {installable && (
                             <button 
                                onClick={onInstall}
                                className="text-brand hover:text-white p-2 rounded-full hover:bg-brand/20 transition-colors animate-pulse"
                                title="安装应用"
                             >
                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                     <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 3v13.5M12 16.5l3.75-3.75M12 16.5L8.25 12" />
                                 </svg>
                             </button>
                         )}
                         <button 
                            onClick={onSettingsClick}
                            className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
                            title="资源管理"
                         >
                             {NavIcons.Settings}
                         </button>
                    </div> 
                </div>
                <div className="lg:hidden flex flex-col pb-0">
                    <div className="flex items-center justify-between h-14 px-4">
                         <div className="flex items-center gap-2 cursor-pointer" onClick={() => onTabChange('home')}>
                            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand to-cyan-400">
                                CineStream
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            {installable && (
                                <button 
                                    onClick={onInstall}
                                    className="text-brand hover:text-white p-2 rounded-full hover:bg-brand/20 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M12 3v13.5M12 16.5l3.75-3.75M12 16.5L8.25 12" />
                                    </svg>
                                </button>
                            )}
                            <button 
                                onClick={onSettingsClick}
                                className="text-gray-400 hover:text-white p-2 rounded-full active:bg-white/10"
                            >
                                 {NavIcons.Settings}
                            </button>
                        </div>
                    </div>
                    <div className="px-4 w-full overflow-x-auto visible-scrollbar mask-linear-fade pb-2">
                         <div className="flex items-center gap-3 min-w-max pb-1">
                             {navItems.map(item => (
                                <button
                                    key={item.id}
                                    onClick={() => onTabChange(item.id)}
                                    className={`flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap border ${
                                        activeTab === item.id 
                                        ? 'bg-brand text-black border-brand shadow-[0_0_8px_rgba(34,197,94,0.4)]' 
                                        : 'bg-white/5 text-gray-300 border-white/5'
                                    }`}
                                >
                                    {React.cloneElement(item.icon, { className: 'w-4 h-4' })}
                                    <span>{item.label}</span>
                                </button>
                            ))}
                         </div>
                    </div>
                </div>
            </div>
        </nav>
    );
  };

  return (
      <div className="relative min-h-screen pb-20 overflow-x-hidden font-sans pt-24 lg:pt-16">
          <NavBar 
            activeTab={activeTab} 
            onTabChange={handleTabChange} 
            onSettingsClick={() => setShowSettings(true)} 
            installable={!!installPrompt}
            onInstall={handleInstallApp}
          />

          <Suspense fallback={null}>
               <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
          </Suspense>

          {/* Context Menu */}
          {contextMenu.visible && (
              <div 
                  style={{ top: contextMenu.y, left: contextMenu.x }}
                  className="fixed z-[100] bg-[#1a1f2e] border border-white/10 rounded-lg shadow-2xl py-1 min-w-[120px] animate-fade-in"
              >
                  <button 
                      onClick={handleDeleteHistory}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 flex items-center gap-2"
                  >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      删除记录
                  </button>
              </div>
          )}

          {loading && currentMovie === null && !hasSearched && (
               <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                   <div className="animate-spin h-12 w-12 border-4 border-brand border-t-transparent rounded-full mb-4"></div>
                   <div className="text-brand font-bold tracking-widest text-lg">LOADING</div>
               </div>
          )}

          <div className="relative z-10 container mx-auto px-4 lg:px-6 py-6 max-w-[1400px]">
              
              {currentMovie && (
                  <section className="mb-12 animate-fade-in space-y-6 mt-4">
                      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                          返回
                      </button>
                      
                      <div className="flex flex-col lg:flex-row gap-6 items-start h-auto relative transition-all duration-300">
                          {/* Video Player Container */}
                          <div className={`flex-1 w-full bg-black rounded-xl overflow-hidden border border-white/5 shadow-2xl relative group transition-all duration-300 z-10 ${!showSidePanel ? 'lg:h-[650px]' : 'lg:h-[500px]'}`}>
                              <Suspense fallback={
                                  <div className="w-full h-full bg-black flex items-center justify-center">
                                      <div className="animate-spin h-10 w-10 border-4 border-brand border-t-transparent rounded-full"></div>
                                  </div>
                              }>
                                  <VideoPlayer 
                                      url={currentEpUrl} 
                                      poster={currentMovie.vod_pic}
                                      title={currentMovie.vod_name}
                                      episodeIndex={currentEpisodeIndex}
                                      doubanId={currentMovie.vod_douban_id}
                                      vodId={currentMovie.vod_id}
                                      onEnded={handleEpisodeEnd}
                                      onNext={handleNextEpisode}
                                  />
                              </Suspense>
                              {!showSidePanel && (
                                  <button onClick={() => setShowSidePanel(true)} className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md text-white/90 border border-white/10 rounded-full px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-brand/20 hover:border-brand/30 hover:text-brand transition-all shadow-lg opacity-0 group-hover:opacity-100">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
                                      显示选集
                                  </button>
                              )}
                          </div>

                          {/* Side Panel */}
                          {showSidePanel && (
                              <div className="w-full lg:w-[320px] flex flex-col gap-2 flex-shrink-0 animate-fade-in relative z-0">
                                  
                                  {/* Hide Button Container */}
                                  <div className="flex justify-end absolute -top-10 right-0 z-20">
                                      <button 
                                        onClick={() => setShowSidePanel(false)}
                                        className="bg-[#121620] hover:bg-[#1a202e] text-gray-300 hover:text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 border border-white/10 shadow-lg transition-all"
                                      >
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                                          隐藏
                                      </button>
                                  </div>

                                  <div className="bg-[#121620] border border-white/5 rounded-xl overflow-hidden shadow-xl flex flex-col h-[500px]">
                                      {/* Tabs */}
                                      <div className="flex border-b border-white/5">
                                          <button 
                                              onClick={() => setSidePanelTab('episodes')}
                                              className={`flex-1 py-3 text-sm font-bold transition-all relative ${sidePanelTab === 'episodes' ? 'text-white bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
                                          >
                                              选集
                                              {sidePanelTab === 'episodes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>}
                                          </button>
                                          <button 
                                              onClick={() => setSidePanelTab('sources')}
                                              className={`flex-1 py-3 text-sm font-bold transition-all relative ${sidePanelTab === 'sources' ? 'text-white bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}
                                          >
                                              换源
                                              {sidePanelTab === 'sources' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>}
                                          </button>
                                      </div>

                                      {/* Content Area */}
                                      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 relative bg-black/20">
                                          {sidePanelTab === 'episodes' ? (
                                              <>
                                                  <div className="flex justify-between items-center mb-3 px-1">
                                                      <span className="text-xs text-gray-400">
                                                          {episodes.length} Episodes
                                                      </span>
                                                      <button 
                                                        onClick={() => setIsReverseOrder(!isReverseOrder)}
                                                        className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                                                        title="Sort Order"
                                                      >
                                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /></svg>
                                                      </button>
                                                  </div>
                                                  
                                                  {/* Pagination Tabs */}
                                                  {totalEpisodePages > 1 && (
                                                      <div className="flex flex-wrap gap-2 mb-3">
                                                          {Array.from({ length: totalEpisodePages }).map((_, idx) => (
                                                              <button
                                                                  key={idx}
                                                                  onClick={() => setCurrentEpisodePage(idx)}
                                                                  className={`px-2 py-1 text-[10px] rounded border ${
                                                                      currentEpisodePage === idx 
                                                                      ? 'border-brand text-brand bg-brand/10' 
                                                                      : 'border-white/10 text-gray-400 hover:border-white/30'
                                                                  }`}
                                                              >
                                                                  {(idx * EPISODES_PER_PAGE) + 1}-{Math.min((idx + 1) * EPISODES_PER_PAGE, episodes.length)}
                                                              </button>
                                                          ))}
                                                      </div>
                                                  )}

                                                  <div className="grid grid-cols-4 gap-2">
                                                      {displayEpisodes.map((ep) => {
                                                          const originalIndex = isReverseOrder 
                                                              ? (episodes.length - 1) - ep.index 
                                                              : ep.index;
                                                            
                                                          let displayName = ep.title;
                                                          if (displayName.match(/^\d+$/)) {
                                                              displayName = displayName;
                                                          }

                                                          return (
                                                              <button
                                                                  key={ep.index}
                                                                  onClick={() => {
                                                                      setCurrentEpisodeIndex(ep.index);
                                                                  }}
                                                                  className={`h-9 rounded border text-xs font-medium transition-all truncate px-1 ${
                                                                      currentEpisodeIndex === ep.index
                                                                      ? 'bg-brand text-black border-brand shadow-[0_0_10px_rgba(34,197,94,0.3)] font-bold'
                                                                      : 'bg-[#1a1f2e] text-gray-300 border-white/5 hover:border-white/30 hover:bg-white/5'
                                                                  }`}
                                                                  title={ep.title}
                                                              >
                                                                  {displayName}
                                                              </button>
                                                          );
                                                      })}
                                                  </div>
                                              </>
                                          ) : (
                                              <div className="space-y-2">
                                                  {availableSources.map((source, idx) => (
                                                      <button
                                                          key={idx}
                                                          onClick={() => handleSourceChange(idx)}
                                                          className={`w-full text-left p-3 rounded-xl border transition-all flex justify-between items-center group ${
                                                              currentSourceIndex === idx
                                                              ? 'bg-brand/10 border-brand text-brand shadow-[0_0_15px_rgba(34,197,94,0.1)]'
                                                              : 'bg-[#1a1f2e] border-white/5 text-gray-300 hover:bg-white/5 hover:border-white/20'
                                                          }`}
                                                      >
                                                          <div>
                                                              <div className={`font-bold text-sm mb-0.5 ${currentSourceIndex === idx ? 'text-brand' : 'text-gray-200'}`}>
                                                                  {source.name}
                                                              </div>
                                                              <div className="text-[10px] text-gray-500 font-mono">
                                                                  {source.episodes.length} Episodes
                                                              </div>
                                                          </div>
                                                          {currentSourceIndex === idx && (
                                                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-brand">
                                                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                                              </svg>
                                                          )}
                                                      </button>
                                                  ))}
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          )}
                      </div>

                      <MovieInfoCard movie={currentMovie} onSearch={triggerSearch} />
                      <Suspense fallback={null}>
                          <GeminiChat currentMovie={currentMovie} />
                      </Suspense>
                  </section>
              )}

              {activeTab === 'home' && !currentMovie && (
                  <>
                      {heroItems.length > 0 && <HeroBanner items={heroItems} onPlay={handleItemClick} />}

                      {watchHistory.length > 0 && (
                          <HorizontalSection 
                            title="继续观看" 
                            items={watchHistory} 
                            id="history" 
                            onItemClick={handleItemClick}
                            onItemContextMenu={handleContextMenu}
                          />
                      )}

                      {isHomeEmpty ? (
                          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                              <p className="text-lg">暂无推荐数据</p>
                              <button onClick={() => window.location.reload()} className="mt-4 text-brand hover:underline">刷新重试</button>
                          </div>
                      ) : (
                          <>
                              <HorizontalSection title="热门电影" items={homeSections.movies} id="movies" onItemClick={handleItemClick} />
                              <HorizontalSection title="热播剧集" items={homeSections.series} id="series" onItemClick={handleItemClick} />
                              <HorizontalSection title="热门动漫" items={homeSections.anime} id="anime" onItemClick={handleItemClick} />
                              <HorizontalSection title="精选综艺" items={homeSections.variety} id="variety" onItemClick={handleItemClick} />
                          </>
                      )}
                  </>
              )}

              {(['movies', 'series', 'anime', 'variety'].includes(activeTab)) && !currentMovie && (
                  <CategoryGrid category={activeTab} onItemClick={handleItemClick} />
              )}

              {activeTab === 'search' && !currentMovie && (
                  <div className="animate-fade-in max-w-5xl mx-auto">
                      {/* Search Input */}
                      <div className="flex gap-2 md:gap-4 mb-8">
                          <div className="relative flex-1 group">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 group-focus-within:text-brand transition-colors"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>
                              </div>
                              <form onSubmit={handleSearch} className="w-full">
                                  <input 
                                      type="text" 
                                      value={searchQuery}
                                      onChange={(e) => setSearchQuery(e.target.value)}
                                      placeholder="搜索电影、剧集、综艺、动漫..." 
                                      className="w-full bg-[#121620] border border-white/10 rounded-xl py-3 md:py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 shadow-xl transition-all"
                                  />
                              </form>
                          </div>
                          <button 
                              onClick={() => triggerSearch(searchQuery)}
                              className="bg-brand hover:bg-brand-hover text-black font-bold px-6 md:px-8 rounded-xl transition-all hover:scale-105 shadow-[0_0_15px_rgba(34,197,94,0.3)] whitespace-nowrap"
                          >
                              搜索
                          </button>
                      </div>

                      <div ref={resultsRef}>
                          {loading ? (
                              <div className="flex justify-center py-20">
                                  <div className="animate-spin h-10 w-10 border-4 border-brand border-t-transparent rounded-full"></div>
                              </div>
                          ) : (
                              <>
                                  {personProfile && <PersonProfileCard person={personProfile} />}

                                  {searchResults.length > 0 ? (
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
                                          {searchResults.map((item) => (
                                              <div key={item.vod_id} onClick={() => handleItemClick(item)} className="group cursor-pointer bg-gray-900 rounded-xl overflow-hidden aspect-[2/3] relative border border-white/5 hover:border-brand/50 transition-all duration-300 hover:-translate-y-1 shadow-lg hover:shadow-brand/10">
                                                  <ImageWithFallback src={item.vod_pic || ''} alt={item.vod_name} searchKeyword={item.vod_name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-12">
                                                      <h4 className="text-sm font-bold text-white truncate group-hover:text-brand transition-colors">{item.vod_name}</h4>
                                                      <div className="flex justify-between items-center mt-1 text-xs text-gray-400">
                                                          <span>{item.vod_year || 'N/A'}</span>
                                                          <span className={`px-1.5 py-0.5 rounded text-[10px] ${item.type_name === 'celebrity' ? 'bg-brand/20 text-brand border border-brand/30' : 'bg-white/10'}`}>
                                                              {item.type_name === 'celebrity' ? '影人' : (item.type_name || '影视')}
                                                          </span>
                                                      </div>
                                                  </div>
                                                  
                                                  {/* Special Overlay for Celebrity Items */}
                                                  {item.type_name === 'celebrity' && (
                                                      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 z-20">
                                                          <button className="bg-brand hover:bg-brand-hover text-black font-bold px-5 py-2.5 rounded-full transform scale-90 group-hover:scale-100 transition-all shadow-[0_0_15px_rgba(34,197,94,0.4)] flex items-center gap-2">
                                                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                                                                  <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
                                                              </svg>
                                                              查看详情
                                                          </button>
                                                          <span className="text-white/80 text-xs mt-3 font-medium tracking-wide">点击查看影人作品</span>
                                                      </div>
                                                  )}
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                      hasSearched && (
                                          <div className="text-center py-20 text-gray-500 flex flex-col items-center">
                                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mb-4 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>
                                              <p>未找到相关内容，换个关键词试试？</p>
                                          </div>
                                      )
                                  )}
                              </>
                          )}
                      </div>
                  </div>
              )}
          </div>
          
          <footer className="absolute bottom-0 w-full py-6 text-center text-gray-600 text-xs border-t border-white/5 bg-black/20 backdrop-blur-sm">
              <p>&copy; 2025 CineStream AI. All rights reserved.</p>
          </footer>
      </div>
  );
};

export default App;