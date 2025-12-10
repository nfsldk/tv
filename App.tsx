

import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Import Router hooks
import { getHomeSections, searchDouban, searchCms, getAggregatedMovieDetail, parseAllSources, enrichVodDetail, fetchDoubanData, fetchCategoryItems, getHistory, addToHistory, removeFromHistory, fetchPersonDetail } from './services/vodService';
import MovieInfoCard from './components/MovieInfoCard';
import ImageWithFallback from './components/ImageWithFallback';
import { VodItem, VodDetail, Episode, PlaySource, HistoryItem, PersonDetail } from './types';

// Lazy Load Heavy Components
const VideoPlayer = lazy(() => import('./components/VideoPlayer'));
const GeminiChat = lazy(() => import('./components/GeminiChat'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

// Icons
const NavIcons = {
    Home: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
    Search: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
    Movie: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 5.496 4.5 4.875 4.5M6 9.375c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125V8.625c0-.621-.504-1.125-1.125-1.125h-1.5M6 9.375v5.25m0-5.25C6 8.754 5.496 8.25 4.875 8.25M6 14.625c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125v-2.25c0-.621-.504-1.125-1.125-1.125h-1.5M6 14.625v3.75m0-3.75C6 14.004 5.496 13.5 4.875 13.5M6 18.375c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-1.5" /></svg>,
    Series: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" /></svg>,
    Anime: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>,
    Variety: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
    Settings: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>
};

// Helper to update SEO metadata
const updateSEO = (title: string, description: string, keywords: string, image?: string, jsonLd?: object) => {
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
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
         const meta = document.createElement('meta');
         meta.name = "viewport";
         meta.content = "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
         document.head.appendChild(meta);
    }
};

// --- URL Mapping Configurations ---
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

const NavBar = ({ activeTab, onTabChange, onSettingsClick }: { activeTab: string, onTabChange: (tab: string) => void, onSettingsClick: () => void }) => {
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
                    <div className="w-24 flex justify-end">
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
                        <button 
                            onClick={onSettingsClick}
                            className="text-gray-400 hover:text-white p-2 rounded-full active:bg-white/10"
                        >
                             {NavIcons.Settings}
                        </button>
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

// ... HeroBanner, HorizontalSection, FilterSection, CategoryGrid components ...
const HeroBanner = ({ items, onPlay }: { items: VodItem[], onPlay: (item: VodItem) => void }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [detail, setDetail] = useState<any>(null);
    const [isFading, setIsFading] = useState(false);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);

    useEffect(() => {
        if (!items || items.length === 0) return;
        if (currentIndex >= items.length) setCurrentIndex(0);
        const timer = setInterval(() => {
            setIsFading(true);
            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % items.length);
                setIsFading(false);
            }, 6000);
        }, 8000);
        return () => clearInterval(timer);
    }, [items.length]);

    const currentItem = items && items.length > 0 ? items[currentIndex] : null;

    useEffect(() => {
        if (!currentItem) return;
        let cancelled = false;
        setDetail(null);
        const loadDetail = async () => {
            try {
                const data = await fetchDoubanData(currentItem.vod_name, currentItem.vod_id);
                if (!cancelled) {
                    setDetail(data);
                }
            } catch (e) {}
        };
        loadDetail();
        return () => { cancelled = true; };
    }, [currentItem]); 

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
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
        if (isLeftSwipe || isRightSwipe) {
            setIsFading(true);
            setTimeout(() => {
                if (isLeftSwipe) {
                    setCurrentIndex((prev) => (prev + 1) % items.length);
                } else {
                    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
                }
                setIsFading(false);
            }, 300);
        }
    };

    if (!currentItem) return null;
    const displayPoster = detail?.wallpaper || detail?.pic || currentItem.vod_pic;
    const posterUrl = detail?.pic || currentItem.vod_pic;

    return (
        <div 
            className="relative w-full h-[45vh] md:h-[50vh] lg:h-[55vh] rounded-2xl md:rounded-3xl overflow-hidden mb-8 md:mb-12 shadow-2xl border border-white/5 group mt-4 md:mt-8 flex justify-center items-center select-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div className={`absolute inset-0 transition-opacity duration-700 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                <ImageWithFallback 
                    src={displayPoster}
                    searchKeyword={currentItem.vod_name}
                    className="w-full h-full object-cover object-top opacity-100 transition-transform duration-[10s] ease-linear group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/60 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/50 to-transparent"></div>
            </div>
            <div className={`absolute inset-0 z-10 flex items-end md:items-center justify-center p-4 md:p-12 lg:p-16 transition-opacity duration-700 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                <div className="flex items-center gap-8 lg:gap-12 w-full max-w-6xl mx-auto justify-center">
                    <div className="hidden md:block w-48 lg:w-60 flex-shrink-0 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 transform -rotate-2 hover:rotate-0 transition-all duration-500 z-20 bg-gray-900">
                         <ImageWithFallback 
                            src={posterUrl}
                            searchKeyword={currentItem.vod_name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 flex flex-col gap-3 md:gap-6 pb-6 md:pb-0 items-start">
                        <div className="flex items-center gap-2 md:gap-3">
                            <span className="bg-brand text-black text-[10px] md:text-xs font-bold px-2 py-0.5 rounded shadow-lg shadow-brand/20">Featured</span>
                            {currentItem.vod_year && <span className="text-gray-200 text-xs md:text-sm font-medium border border-white/20 px-2 rounded bg-black/40 backdrop-blur-sm">{currentItem.vod_year}</span>}
                            {(currentItem.vod_score || detail?.score) && <span className="text-yellow-400 text-xs md:text-sm font-bold flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded">★ {detail?.score || currentItem.vod_score}</span>}
                            <span className="bg-white/20 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] text-gray-200">{currentItem.type_name}</span>
                        </div>
                        <h1 className="text-3xl md:text-5xl lg:text-7xl font-bold text-white tracking-tight leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] line-clamp-2">
                            {currentItem.vod_name}
                        </h1>
                        <p className="text-gray-200 text-xs md:text-lg leading-relaxed line-clamp-2 md:line-clamp-4 max-w-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-medium">
                            {detail?.content || '暂无简介...'}
                        </p>
                        <div className="flex items-center gap-4 pt-2 md:pt-4">
                            <button 
                                onClick={() => onPlay(currentItem)}
                                className="bg-brand hover:bg-brand-hover text-black font-bold py-2 md:py-3 px-6 md:px-8 rounded-xl flex items-center gap-2 transition-all hover:scale-105 shadow-[0_0_20px_rgba(34,197,94,0.4)] text-sm md:text-base"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 md:w-6 md:h-6">
                                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                </svg>
                                立即播放
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-4 md:bottom-6 right-4 md:right-6 flex gap-1.5 md:gap-2 z-20">
                {items.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={(e) => {
                            e.stopPropagation();
                            setIsFading(true);
                            setTimeout(() => {
                                setCurrentIndex(idx);
                                setIsFading(false);
                            }, 600);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-4 md:w-6 bg-brand' : 'w-1.5 md:w-2 bg-white/50 hover:bg-white/80'}`}
                    />
                ))}
            </div>
        </div>
    );
};

const HorizontalSection = ({ title, items, id, onItemClick, onItemContextMenu }: { title: string, items: (VodItem | HistoryItem)[], id: string, onItemClick: (item: VodItem) => void, onItemContextMenu?: (e: React.MouseEvent, item: VodItem) => void }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { current } = scrollRef;
            const scrollAmount = direction === 'left' ? -current.clientWidth * 0.75 : current.clientWidth * 0.75;
            current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
    };
    if (!items || items.length === 0) return null;
    return (
      <div className="mb-8 md:mb-10 relative group">
          <h3 className="text-lg md:text-xl font-bold text-white mb-4 pl-2 border-l-4 border-brand flex items-center gap-2">
              {title} <span className="text-xs text-gray-500 font-normal ml-2">HOT</span>
          </h3>
          <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 z-20 bg-black/60 hover:bg-brand text-white w-10 h-10 rounded-full backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl hidden md:flex items-center justify-center -ml-5 hover:scale-110 translate-y-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 z-20 bg-black/60 hover:bg-brand text-white w-10 h-10 rounded-full backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl hidden md:flex items-center justify-center -mr-5 hover:scale-110 translate-y-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
          <div className="-mx-4 md:mx-0 px-4 md:px-0">
              <div ref={scrollRef} className="flex gap-3 md:gap-4 overflow-x-auto pb-4 visible-scrollbar scroll-smooth">
                  {items.map((item) => {
                      const historyItem = item as HistoryItem;
                      const hasHistory = 'episode_index' in item;
                      
                      return (
                      <div 
                        key={item.vod_id} 
                        onClick={() => onItemClick(item)} 
                        onContextMenu={(e) => onItemContextMenu && onItemContextMenu(e, item)}
                        className="flex-shrink-0 w-28 sm:w-36 md:w-44 cursor-pointer group relative"
                      >
                          <div className="aspect-[2/3] rounded-lg md:rounded-xl overflow-hidden bg-gray-900 border border-white/10 relative shadow-lg group-hover:shadow-brand/20 transition-all duration-300 group-hover:-translate-y-1">
                               <ImageWithFallback src={item.vod_pic || ''} alt={item.vod_name || 'Poster'} searchKeyword={item.vod_name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                              {item.vod_score && (
                                  <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur text-yellow-400 text-[10px] md:text-xs font-bold px-1.5 py-0.5 rounded border border-white/10">{item.vod_score}</div>
                              )}
                              
                              {/* Continue Watching Overlay */}
                              {hasHistory && (
                                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-8 h-8 text-brand drop-shadow-lg"><path d="M8 5v14l11-7z"/></svg>
                                  </div>
                              )}

                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-2 md:p-3 pt-8 md:pt-10">
                                  <h4 className="text-xs md:text-sm font-bold text-white truncate group-hover:text-brand transition-colors">{item.vod_name}</h4>
                                  {hasHistory ? (
                                      <div className="text-[10px] text-brand font-medium mt-0.5 truncate">
                                          {historyItem.episode_name || `第${historyItem.episode_index + 1}集`}
                                      </div>
                                  ) : null}
                              </div>
                          </div>
                      </div>
                  )})}
              </div>
          </div>
      </div>
    );
};

const FILTER_CONFIG: any = {
    movies: {
        title: '电影',
        row1: { label: '分类', options: ['全部', '热门电影', '最新电影', '豆瓣高分', '冷门佳片'] },
        row2: { label: '类型', options: ['全部', '动作', '喜剧', '爱情', '科幻', '悬疑', '恐怖', '犯罪', '奇幻', '冒险', '灾难', '武侠', '战争', '华语', '欧美', '韩国', '日本'] }
    },
    series: {
        title: '电视剧',
        desc: '来自豆瓣的精选内容',
        row1: { label: '分类', options: ['全部', '最近热门'] },
        row2: { label: '类型', options: ['全部', '国产', '欧美', '日本', '韩国', '动漫', '纪录片', '古装', '武侠', '爱情', '剧情', '悬疑', '喜剧', '家庭', '历史'] }
    },
    anime: {
        title: '动漫',
        desc: '来自 Bangumi 番组计划的精选内容',
        row1: { label: '分类', options: ['每日放送', '番剧', '剧场版'] },
        row2: { label: '类型', options: ['全部', '热血', '恋爱', '搞笑', '校园', '治愈', '机战', '悬疑', '周一', '周二', '周三', '周四', '周五', '周六', '周日'] }
    },
    variety: {
        title: '综艺',
        desc: '来自豆瓣的精选内容',
        row1: { label: '分类', options: ['全部', '最近热门'] },
        row2: { label: '类型', options: ['全部', '大陆', '日本', '韩国', '欧美', '港台'] }
    }
};

const FilterSection = ({ config, filter1, filter2, onFilter1Change, onFilter2Change }: { config: any, filter1: string, filter2: string, onFilter1Change: (val: string) => void, onFilter2Change: (val: string) => void }) => {
    if (!config) return null;
    return (
        <div className="mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{config.title}</h2>
            {config.desc && <p className="text-gray-400 text-xs md:text-sm mb-4 md:mb-6">{config.desc}</p>}
            <div className="bg-[#121620] border border-white/5 rounded-2xl p-4 md:p-6 shadow-xl backdrop-blur-sm">
                <div className="flex items-center gap-3 md:gap-4 mb-4 overflow-x-auto no-scrollbar pb-1">
                    <span className="text-gray-400 text-xs md:text-sm font-medium whitespace-nowrap min-w-[3rem]">{config.row1.label}</span>
                    <div className="flex gap-2">
                        {config.row1.options.map((opt: string) => (
                            <button
                                key={opt}
                                onClick={() => onFilter1Change(opt)}
                                className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                                    filter1 === opt 
                                    ? 'bg-gray-600/80 text-white shadow-lg' 
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="flex items-center gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-1">
                    <span className="text-gray-400 text-xs md:text-sm font-medium whitespace-nowrap min-w-[3rem]">{config.row2.label}</span>
                    <div className="flex gap-2">
                        {config.row2.options.map((opt: string) => (
                            <button
                                key={opt}
                                onClick={() => onFilter2Change(opt)}
                                className={`px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                                    filter2 === opt 
                                    ? 'bg-gray-600/80 text-white shadow-lg' 
                                    : 'text-gray-400 hover:text-gray-200 hover:bg-white/5'
                                }`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const getCurrentWeekday = () => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[new Date().getDay()];
};

const CategoryGrid = ({ category, onItemClick }: { category: string, onItemClick: (item: VodItem) => void }) => {
    const [items, setItems] = useState<VodItem[]>([]);
    const [loading, setLoading] = useState(true);
    const config = FILTER_CONFIG[category];
    const [filter1, setFilter1] = useState(config?.row1.options[0] || '全部');
    const [filter2, setFilter2] = useState(() => {
        if (category === 'anime' && config?.row2.label === '类型') {
             const today = getCurrentWeekday();
             if (config?.row2.options.includes(today)) {
                 return today;
             }
        }
        return config?.row2.options[0] || '全部';
    });

    useEffect(() => {
        if (config) {
            setFilter1(config.row1.options[0]);
            if (category === 'anime') {
                const today = getCurrentWeekday();
                if (config.row2.options.includes(today)) {
                     setFilter2(today);
                } else {
                     setFilter2('全部');
                }
            } else {
                setFilter2(config.row2.options[0]);
            }
        }
    }, [category]);

    useEffect(() => {
        const fetchItems = async () => {
            setLoading(true);
            const data = await fetchCategoryItems(category, { filter1, filter2 });
            setItems(data);
            setLoading(false);
        };
        fetchItems();
    }, [category, filter1, filter2]);

    if (!config) return null;

    return (
        <div className="animate-fade-in mt-4">
            <FilterSection 
                config={config} 
                filter1={filter1} 
                filter2={filter2} 
                onFilter1Change={setFilter1} 
                onFilter2Change={setFilter2}
            />
            {loading ? (
                <div className="flex justify-center py-20 min-h-[50vh]">
                    <div className="animate-spin h-10 w-10 border-4 border-brand border-t-transparent rounded-full"></div>
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                    {items.map((item) => (
                        <div key={item.vod_id} onClick={() => onItemClick(item)} className="group cursor-pointer relative bg-gray-900 rounded-lg overflow-hidden aspect-[2/3] ring-1 ring-white/5 hover:ring-brand hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all duration-300 hover:-translate-y-1">
                            <ImageWithFallback src={item.vod_pic || ''} alt={item.vod_name || 'Poster'} searchKeyword={item.vod_name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute top-0 right-0 p-1.5 z-10">
                                {item.vod_score && <span className="bg-black/60 backdrop-blur-md text-[10px] text-yellow-400 px-1.5 py-0.5 rounded border border-white/10 shadow-lg font-bold">★ {item.vod_score}</span>}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 md:p-3 pt-10">
                                <h4 className="text-xs md:text-sm font-bold text-white truncate group-hover:text-brand transition-colors">{item.vod_name}</h4>
                                <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400 font-medium">
                                    <span className="bg-white/10 px-1.5 py-0.5 rounded">{item.type_name || '影视'}</span>
                                    <span>{item.vod_year}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const PersonProfileCard = ({ person }: { person: PersonDetail }) => {
    const [expanded, setExpanded] = useState(false);
    return (
        <div className="w-full bg-[#161b26] border border-white/5 rounded-2xl p-4 md:p-6 mb-8 flex flex-col md:flex-row gap-6 md:gap-8 shadow-xl animate-fade-in relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-[100px] rounded-full pointer-events-none"></div>
            
            <div className="w-32 h-44 md:w-40 md:h-56 flex-shrink-0 mx-auto md:mx-0 rounded-xl overflow-hidden shadow-2xl border border-white/10">
                <ImageWithFallback src={person.pic} className="w-full h-full object-cover" />
            </div>
            
            <div className="flex-1 text-gray-200">
                <h2 className="text-3xl font-bold text-white mb-4">{person.name}</h2>
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4 text-sm">
                    {person.gender && <p><span className="text-gray-500 mr-2">性别:</span>{person.gender}</p>}
                    {person.constellation && <p><span className="text-gray-500 mr-2">星座:</span>{person.constellation}</p>}
                    {person.birthdate && <p><span className="text-gray-500 mr-2">出生日期:</span>{person.birthdate}</p>}
                    {person.birthplace && <p><span className="text-gray-500 mr-2">出生地:</span>{person.birthplace}</p>}
                    {person.role && <p className="col-span-2"><span className="text-gray-500 mr-2">职业:</span>{person.role}</p>}
                </div>

                {person.intro && (
                    <div className="text-sm leading-relaxed text-gray-400">
                        <span className="text-white font-bold block mb-1">简介</span>
                        <p className={expanded ? '' : 'line-clamp-3'}>{person.intro}</p>
                        {person.intro.length > 150 && (
                             <button onClick={() => setExpanded(!expanded)} className="text-brand text-xs mt-1 hover:underline">
                                 {expanded ? '收起' : '展开更多'}
                             </button>
                        )}
                    </div>
                )}
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

  useEffect(() => {
      const path = location.pathname;

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
          
          // Enhanced SEO Logic
          let titleSuffix = '';
          const isMovie = type === '电影' || episodes.length <= 1;

          if (isMovie) {
              // For movies, try to get the playback name (often "HD" or similar from the source/title logic)
              const epTitle = episodes[currentEpisodeIndex]?.title || 'HD';
              const cleanEpTitle = epTitle.replace(/第|集/g, '').replace(/^0+/, ''); 
              // Usually movie sources have just 1 episode often named 'HD' or the movie name.
              // If the episode title is just "1" or "第1集", maybe omit it or use "HD"
              titleSuffix = ` ${isNaN(Number(cleanEpTitle)) ? cleanEpTitle : 'HD'}`; 
          } else {
              // For Series/Anime/Variety, append episode name
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
          // 1. Save standard progress
          localStorage.setItem(`cine_last_episode_${currentMovie.vod_id}`, String(currentEpisodeIndex));
          
          // 2. Add to History List
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

  // Handle Context Menu Actions
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
      setPersonProfile(null); // Reset profile

      if (activeTab !== 'search') {
          navigate(TAB_TO_URL['search']);
      }
      try {
          // SEARCH DOUBAN FOR RESULTS LIST
          const results = await searchDouban(query);
          
          // Check if search returned a celebrity
          const celebrity = results.find(r => r.type_name === 'celebrity');
          
          if (celebrity) {
             const detail = await fetchPersonDetail(celebrity.vod_id);
             if (detail) {
                 setPersonProfile(detail);
                 // If the person has works, prioritize them in the list
                 if (detail.works && detail.works.length > 0) {
                     setSearchResults(detail.works);
                 } else {
                     setSearchResults(results.filter(r => r.type_name !== 'celebrity'));
                 }
             } else {
                 setSearchResults(results);
             }
          } else {
             // Sort results prioritizing Exact Matches
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
      // If item has a direct API URL (from History or direct source), play it
      if (item.api_url && item.source !== 'douban') {
          handleSelectMovie(item.vod_id, item.api_url);
          navigate(`/play/${item.vod_id}`);
          return;
      }

      // If item is from Douban (Search Result or Category), find it in CMS
      setLoading(true);
      try {
          // 1. Fetch Douban details to get cleaner title/year if possible
          await fetchDoubanData(item.vod_name, item.vod_id);
          
          const cleanName = item.vod_name
              .replace(/[（\(]\d{4}[）\)]/g, '')
              .replace(/第.+?季|Season\s*\d+|S\d+/gi, '')
              .replace(/集/g, '')
              .trim();

          // 2. Search CMS for playback source
          // Try exact name first, then cleaned name
          const queries = [item.vod_name, cleanName];
          let foundVideo: VodItem | null = null;
          
          for (const q of queries) {
              if(!q) continue;
              const res = await searchCms(q); // Use searchCms to find playable source
              if (res.list && res.list.length > 0) {
                  // Try to find exact match if multiple results
                  const exact = res.list.find((v: any) => v.vod_name === item.vod_name);
                  foundVideo = (exact || res.list[0]) as VodItem;
                  break; 
              }
          }

          if (foundVideo) {
              handleSelectMovie(foundVideo.vod_id, foundVideo.api_url);
              navigate(`/play/${foundVideo.vod_id}`);
          } else {
              // Fallback: Just try to trigger search again or show not found
              // Ideally, we should show a toast, but for now just navigate to search
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
          // FETCH AGGREGATED DETAILS (Main Source + All Custom Sources)
          const result = await getAggregatedMovieDetail(id, apiUrl);
          
          if (result && result.main) {
              const { main, alternatives } = result;
              
              // PARSE ALL SOURCES: Merge main + alternatives
              const allSources = parseAllSources([main, ...alternatives]);
              
              if (allSources.length > 0) {
                  // Prefer m3u8 source if available
                  const m3u8Index = allSources.findIndex(s => s.name.toLowerCase().includes('m3u8'));
                  const initialIndex = m3u8Index >= 0 ? m3u8Index : 0;
                  
                  setAvailableSources(allSources);
                  setCurrentSourceIndex(initialIndex);
                  setEpisodes(allSources[initialIndex].episodes);
                  setCurrentMovie(main);
                  
                  // Restore episode index from localStorage
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
                 // No sources
              }
          }
      } catch (error) {
          console.error(error);
      } finally {
          setLoading(false);
      }
  };

  // Switch source handler
  const handleSourceChange = (index: number) => {
      setCurrentSourceIndex(index);
      const newEpisodes = availableSources[index].episodes;
      setEpisodes(newEpisodes);
      
      // Try to keep current episode index if within bounds of new source
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
      
      // Pagination Logic
      const startIndex = currentEpisodePage * EPISODES_PER_PAGE;
      const endIndex = startIndex + EPISODES_PER_PAGE;
      return list.slice(startIndex, endIndex);
  }, [episodes, isReverseOrder, currentEpisodePage]);

  // Calculate total pages
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

  return (
      <div className="relative min-h-screen pb-20 overflow-x-hidden font-sans pt-24 lg:pt-16">
          <NavBar activeTab={activeTab} onTabChange={handleTabChange} onSettingsClick={() => setShowSettings(true)} />

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

                          {/* Side Panel - Redesigned */}
                          {showSidePanel && (
                              <div className="w-full lg:w-[320px] flex flex-col gap-2 flex-shrink-0 animate-fade-in relative z-0">
                                  
                                  {/* Hide Button Container - Positioned ABOVE the panel as requested */}
                                  <div className="flex justify-end absolute -top-10 right-0 z-20">
                                      <button 
                                        onClick={() => setShowSidePanel(false)}
                                        className="bg-[#1a1f2e]/80 hover:bg-brand hover:text-black text-gray-300 text-xs px-4 py-1.5 rounded-full flex items-center gap-1.5 border border-white/10 shadow-lg transition-all duration-300 backdrop-blur-md"
                                      >
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                                          隐藏
                                      </button>
                                  </div>

                                  <div className="w-full bg-[#1a1f2e] border border-white/5 rounded-xl overflow-hidden flex flex-col min-h-[300px] lg:h-[500px] shadow-2xl mt-0">
                                      {/* Tabs Header */}
                                      <div className="flex items-center border-b border-white/5 bg-[#141824]">
                                          <button 
                                            onClick={() => setSidePanelTab('episodes')}
                                            className={`flex-1 py-3 text-sm font-bold transition-colors relative ${sidePanelTab === 'episodes' ? 'text-brand' : 'text-gray-400 hover:text-gray-200'}`}
                                          >
                                              选集
                                              {sidePanelTab === 'episodes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full mx-8"></div>}
                                          </button>
                                          <div className="w-px h-4 bg-white/10"></div>
                                          <button 
                                            onClick={() => setSidePanelTab('sources')}
                                            className={`flex-1 py-3 text-sm font-bold transition-colors relative ${sidePanelTab === 'sources' ? 'text-brand' : 'text-gray-400 hover:text-gray-200'}`}
                                          >
                                              换源
                                              {sidePanelTab === 'sources' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand rounded-t-full mx-8"></div>}
                                          </button>
                                      </div>

                                      {/* Content Area */}
                                      <div className="flex-1 overflow-hidden flex flex-col bg-[#11141d]">
                                          {sidePanelTab === 'episodes' ? (
                                              <>
                                                  {/* Episode Range / Sort Bar */}
                                                  <div className="flex justify-between items-center px-4 py-2 border-b border-white/5 bg-[#161b26]">
                                                      <span className="text-xs text-gray-400 font-mono">
                                                          {episodes.length > 0 ? `Total: ${episodes.length}` : '暂无剧集'}
                                                      </span>
                                                      <button onClick={() => setIsReverseOrder(!isReverseOrder)} className="text-gray-400 hover:text-white p-1 rounded hover:bg-white/5" title="Sort Order">
                                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 transform rotate-90"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /></svg>
                                                      </button>
                                                  </div>
                                                  
                                                  {/* Tabs for Pagination (Groups of 36) */}
                                                  {totalEpisodePages > 1 && (
                                                      <div className="flex gap-2 overflow-x-auto no-scrollbar p-2 border-b border-white/5 bg-[#161b26]">
                                                          {Array.from({ length: totalEpisodePages }).map((_, idx) => (
                                                              <button
                                                                  key={idx}
                                                                  onClick={() => setCurrentEpisodePage(idx)}
                                                                  className={`flex-shrink-0 px-3 py-1 text-xs rounded-full border transition-all whitespace-nowrap ${
                                                                      currentEpisodePage === idx 
                                                                      ? 'bg-brand/20 text-brand border-brand/50 font-bold' 
                                                                      : 'bg-[#1e2330] text-gray-400 border-transparent hover:text-white hover:bg-white/10'
                                                                  }`}
                                                              >
                                                                  {idx * EPISODES_PER_PAGE + 1}-{Math.min((idx + 1) * EPISODES_PER_PAGE, episodes.length)}
                                                              </button>
                                                          ))}
                                                      </div>
                                                  )}

                                                  {/* Grid */}
                                                  <div className="p-3 overflow-y-auto custom-scrollbar flex-1">
                                                      <div className="grid grid-cols-4 gap-2">
                                                          {displayEpisodes.map((ep) => {
                                                              const rawTitle = ep.title.replace(/第|集/g, '').replace(/^0+/, '');
                                                              // Determine display text: if it looks like a number, add prefix/suffix, otherwise keep raw
                                                              const displayText = !isNaN(Number(rawTitle)) ? `第${rawTitle}集` : (ep.title || `第${ep.index + 1}集`);

                                                              return (
                                                              <button 
                                                                key={ep.index} 
                                                                onClick={() => setCurrentEpisodeIndex(ep.index)} 
                                                                className={`h-9 text-xs rounded transition-all duration-200 border truncate font-medium relative group ${currentEpisodeIndex === ep.index ? 'bg-brand text-black border-brand shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-[#1e2330] text-gray-400 border-transparent hover:bg-[#252b3b] hover:text-white'}`}
                                                                title={ep.title}
                                                              >
                                                                  {displayText}
                                                                  {currentEpisodeIndex === ep.index && <span className="absolute bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-black rounded-full opacity-50"></span>}
                                                              </button>
                                                          )})}
                                                      </div>
                                                  </div>
                                              </>
                                          ) : (
                                              <div className="p-3 overflow-y-auto custom-scrollbar flex-1 space-y-2">
                                                  {availableSources.map((source, idx) => (
                                                      <button
                                                          key={idx}
                                                          onClick={() => handleSourceChange(idx)}
                                                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                                                              currentSourceIndex === idx 
                                                              ? 'bg-brand/10 border-brand text-brand' 
                                                              : 'bg-[#1e2330] border-transparent text-gray-400 hover:bg-[#252b3b] hover:text-white'
                                                          }`}
                                                      >
                                                          <div className="flex flex-col items-start">
                                                              <span className="text-sm font-bold">{source.name}</span>
                                                              <span className="text-[10px] opacity-70">{source.episodes.length} Episodes</span>
                                                          </div>
                                                          {currentSourceIndex === idx && (
                                                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>
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
                      <MovieInfoCard movie={currentMovie} onSearch={(keyword) => triggerSearch(keyword)} />
                  </section>
              )}

              {!currentMovie && (
                  <div ref={resultsRef}>
                      {(hasSearched || activeTab === 'search') ? (
                        <>
                            <div className="w-full max-w-3xl mx-auto mb-8 mt-2">
                                    <form onSubmit={handleSearch} className="relative group">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand to-cyan-500 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                                        <div className="relative flex items-center bg-gray-900 rounded-full p-1 ring-1 ring-white/10 shadow-2xl">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="搜索电影、电视剧、演员..."
                                                className="flex-1 bg-transparent px-6 py-3 text-sm md:text-base text-gray-100 placeholder-gray-500 focus:outline-none"
                                            />
                                            <button type="submit" disabled={loading} className="bg-brand hover:bg-brand-hover text-black font-bold py-2.5 px-6 rounded-full transition-all duration-300 flex items-center gap-2 shadow-lg disabled:opacity-70">
                                                {loading ? '搜索中...' : '搜索'}
                                            </button>
                                        </div>
                                    </form>
                            </div>

                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-6 w-1 bg-brand rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
                                <h3 className="text-xl font-bold text-white tracking-wide">搜索结果 (Douban)</h3>
                            </div>
                            
                            {personProfile && <PersonProfileCard person={personProfile} />}

                            {loading && searchResults.length === 0 ? (
                                <div className="flex justify-center py-20">
                                    <div className="animate-spin h-10 w-10 border-4 border-brand border-t-transparent rounded-full"></div>
                                </div>
                            ) : (
                                <>
                                    {personProfile && (
                                         <h4 className="text-lg font-bold text-gray-300 mb-4 pl-1 border-l-2 border-brand/50 flex items-center gap-2">
                                            {personProfile.name} 的影视作品
                                         </h4>
                                    )}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-6">
                                        {searchResults.map((item) => (
                                            <div key={item.vod_id} onClick={() => handleItemClick(item)} className="group cursor-pointer relative bg-gray-900 rounded-lg overflow-hidden aspect-[2/3] ring-1 ring-white/5 hover:ring-brand hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all duration-300 hover:-translate-y-1">
                                                <ImageWithFallback src={item.vod_pic || ''} alt={item.vod_name || 'Poster'} searchKeyword={item.vod_name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                                <div className="absolute top-0 right-0 p-1.5 z-10">
                                                    {item.vod_score && <span className="bg-black/60 backdrop-blur-md text-[10px] text-white px-1.5 py-0.5 rounded border border-white/10 shadow-lg">{item.vod_score}</span>}
                                                </div>
                                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 md:p-3 pt-12">
                                                    <h4 className="text-xs md:text-sm font-bold text-white truncate group-hover:text-brand transition-colors">{item.vod_name}</h4>
                                                    <div className="flex justify-between items-center mt-1 text-[10px] text-gray-400 font-medium">
                                                        <span className="bg-white/10 px-1.5 py-0.5 rounded">{item.type_name || '影视'}</span>
                                                        <span>{item.vod_year}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </>
                      ) : activeTab === 'home' ? (
                          <div className="space-y-4 animate-fade-in">
                              {isHomeEmpty ? (
                                  <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
                                      <div className="text-gray-500 text-lg">暂无推荐数据，请检查网络或刷新重试</div>
                                      <button 
                                        onClick={fetchInitial}
                                        className="bg-brand text-black font-bold py-2 px-6 rounded-full hover:bg-brand-hover transition-colors"
                                      >
                                          刷新首页
                                      </button>
                                  </div>
                              ) : (
                                <>
                                    <HeroBanner items={heroItems} onPlay={handleItemClick} />
                                    
                                    {!loading && (
                                        <>
                                            <HorizontalSection id="history" title="继续观看" items={watchHistory} onItemClick={handleItemClick} onItemContextMenu={handleContextMenu} />

                                            <HorizontalSection id="movies" title="热门电影" items={homeSections.movies} onItemClick={handleItemClick} />
                                            <HorizontalSection id="series" title="热门剧集" items={homeSections.series} onItemClick={handleItemClick} />
                                            <HorizontalSection id="short" title="爆款短剧" items={homeSections.shortDrama} onItemClick={handleItemClick} />
                                            <HorizontalSection id="anime" title="新番放送" items={homeSections.anime} onItemClick={handleItemClick} />
                                            <HorizontalSection id="variety" title="热门综艺" items={homeSections.variety} onItemClick={handleItemClick} />
                                        </>
                                    )}
                                </>
                              )}
                          </div>
                      ) : (
                          <CategoryGrid category={activeTab} onItemClick={handleItemClick} />
                      )}
                  </div>
              )}
          </div>

          <Suspense fallback={null}>
               <GeminiChat currentMovie={currentMovie} />
          </Suspense>
      </div>
  );
};

export default App;
