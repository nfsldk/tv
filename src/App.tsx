import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { getHomeSections, searchCms, getAggregatedSearch, getAggregatedMovieDetail, parseAllSources, enrichVodDetail, fetchDoubanData, fetchCategoryItems, getHistory, addToHistory, removeFromHistory, fetchPersonDetail, initVodSources } from './services/vodService';
import MovieInfoCard from './components/MovieInfoCard';
import ImageWithFallback from './components/ImageWithFallback';
import { VodItem, VodDetail, Episode, PlaySource, HistoryItem, PersonDetail } from './types';

const VideoPlayer = lazy(() => import('./components/VideoPlayer'));
const GeminiChat = lazy(() => import('./components/GeminiChat'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

// --- Icons ---
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
    'sousuo': 'search',
    'play': 'play_page' 
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
        className="relative w-full h-[210px] md:h-[360px] rounded-2xl overflow-hidden mb-8 md:mb-12 group shadow-2xl bg-[#0a0a0a] touch-pan-y border border-white/5"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
      <div key={activeItem.vod_id + '_bg'} className="absolute inset-0 animate-fade-in transition-all duration-700">
          <ImageWithFallback 
              src={activeItem.vod_pic} 
              alt={activeItem.vod_name} 
              className="w-full h-full object-cover blur-md opacity-40 scale-105" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/60 to-transparent z-0"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617]/80 via-transparent to-transparent z-0 hidden md:block"></div>
      </div>

      <div key={activeItem.vod_id + '_content'} className="absolute inset-0 z-10 flex items-center justify-center">
        <div className="container mx-auto px-6 md:px-12 w-full h-full flex items-center justify-center md:justify-start">
            <div className="flex flex-col md:flex-row items-center md:items-center gap-6 md:gap-10 w-full animate-slide-up max-w-4xl md:max-w-none pt-4 md:pt-0">
                <div className="flex-shrink-0 w-[180px] md:w-[220px] aspect-[2/3] rounded-xl overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-2 border-white/20 relative z-20 hover:scale-105 transition-transform duration-500 bg-black">
                    <ImageWithFallback 
                        src={activeItem.vod_pic} 
                        alt={activeItem.vod_name} 
                        className="w-full h-full object-cover" 
                    />
                </div>

                <div className="flex-1 text-center md:text-left space-y-3 md:space-y-4 flex flex-col items-center md:items-start justify-center min-w-0">
                    <h2 className="text-2xl md:text-5xl font-black text-white leading-tight drop-shadow-xl tracking-tight line-clamp-2">
                        {activeItem.vod_name}
                    </h2>

                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                        <span className="bg-[#ffb400] text-black text-xs font-black px-2 py-0.5 rounded uppercase tracking-wider shadow-lg shadow-brand/20">
                            {detail?.score || activeItem.vod_score || 'HOT'}
                        </span>
                        <span className="bg-white/10 border border-white/10 text-gray-200 text-xs font-medium px-2 py-0.5 rounded backdrop-blur-md">
                            {activeItem.vod_year || '2025'}
                        </span>
                        <span className="bg-white/10 border border-white/10 text-gray-200 text-xs font-medium px-2 py-0.5 rounded backdrop-blur-md">
                            {activeItem.type_name || detail?.type_name || '精选'}
                        </span>
                    </div>

                    <div className="text-gray-300 text-xs md:text-base font-medium line-clamp-1 opacity-90">
                        {detail?.director && <span className="mr-3">导演: {detail.director}</span>}
                        {detail?.actor && <span>主演: {detail.actor}</span>}
                    </div>

                    <p className="text-gray-400 text-xs md:text-sm leading-relaxed line-clamp-3 drop-shadow-md max-w-2xl">
                        {detail?.content ? detail.content.replace(/<[^>]+>/g, '') : (activeItem.vod_remarks || "暂无简介...")}
                    </p>

                    <div className="pt-2 md:pt-4 flex flex-row gap-4">
                        <button 
                            onClick={() => onPlay(activeItem)}
                            className="bg-white text-black hover:bg-gray-200 text-sm md:text-base font-bold px-6 py-2 md:px-8 md:py-3 rounded-full flex items-center gap-2 transition-all hover:scale-105 shadow-lg whitespace-nowrap"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                            </svg>
                            <span>播放</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {items.map((_, idx) => (
              <button 
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx); }}
                  className={`h-1 md:h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'bg-brand w-6 md:w-8' : 'bg-white/20 w-1.5 md:w-2 hover:bg-white/50'}`}
              />
          ))}
      </div>
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
                                {(item as any).vod_score && <div className="absolute bottom-1 right-1 text-[#ffb400] font-bold text-xs drop-shadow-md">{(item as any).vod_score}</div>}
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
                                 {item.vod_score && <div className="absolute top-1 right-1 bg-[#ffb400] text-black text-[10px] font-bold px-1.5 py-0.5 rounded">{item.vod_score}</div>}
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
    const [expanded, setExpanded] = useState(false);
    const introText = person.intro || '暂无简介';
    const isLong = introText.length > 200;
    const displayIntro = expanded ? introText : (isLong ? introText.slice(0, 200) + '...' : introText);

    return (
        <div className="bg-gray-900 border border-white/10 rounded-xl p-6 mb-8 flex flex-col md:flex-row gap-6 animate-fade-in">
             <div className="w-32 h-44 md:w-40 md:h-56 flex-shrink-0 rounded-lg overflow-hidden shadow-xl mx-auto md:mx-0 bg-gray-800">
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
                 <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line text-left md:text-left">
                     {displayIntro}
                 </p>
                 {isLong && (
                    <button 
                        onClick={() => setExpanded(!expanded)}
                        className="text-brand text-xs mt-2 hover:underline focus:outline-none font-bold"
                    >
                        {expanded ? '收起' : '展开全部'}
                    </button>
                 )}
             </div>
        </div>
    );
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

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<VodItem[]>([]);
  const [personProfile, setPersonProfile] = useState<PersonDetail | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentMovie, setCurrentMovie] = useState<VodDetail | null>(null);
  
  // Ref to hold the current VOD ID from the URL to prevent stale closures and unnecessary re-fetches
  const currentVodIdRef = useRef<string | null>(null);
  
  const [availableSources, setAvailableSources] = useState<PlaySource[]>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(-1);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [sidePanelTab, setSidePanelTab] = useState<'episodes' | 'sources'>('episodes');
  const [isReverseOrder, setIsReverseOrder] = useState(false);
  const [currentEpisodePage, setCurrentEpisodePage] = useState(0);
  const EPISODES_PER_PAGE = 36;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Track mount status to prevent updates on unmounted component
  const isMounted = useRef(true);

  // Request ID for data fetching race conditions
  const requestRef = useRef<number>(0);

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
      isMounted.current = true;
      initVodSources();
      return () => { isMounted.current = false; };
  }, []);

  // --- Routing Logic (Separated from Data Fetching) ---
  useEffect(() => {
      // Use startsWith for stricter/safer check for play pages
      const isPlayPage = location.pathname.startsWith('/play');
      
      if (isPlayPage) {
          setActiveTab('play_page');
          // DO NOT clear currentMovie here.
      } else {
          const pathParts = location.pathname.split('/');
          const path = pathParts[1] || '';
          const tab = URL_TO_TAB[path] || 'home';
          setActiveTab(tab);
          
          // Only clear movie if we are DEFINITELY not on the play page
          // and we have a movie loaded.
          if (currentMovie || currentVodIdRef.current) {
               setCurrentMovie(null);
               currentVodIdRef.current = null;
          }
          setHasSearched(tab === 'search');
      }
  }, [location.pathname]);

  // --- Data Fetching Logic (Triggered by ID change) ---
  useEffect(() => {
      const pathParts = location.pathname.split('/');
      if (pathParts[1] === 'play' && pathParts[2]) {
          const idParam = pathParts[2];
          const state = location.state as any;
          
          // Clean up ID (remove prefixes for comparison)
          // const rawId = idParam.replace(/^db_|^cms_/, '');
          
          // Check against the EXACT param in URL first to prevent reloading on same URL
          if (currentVodIdRef.current === idParam) {
              return; 
          }
          
          // LOCK THE REF TO THE URL PARAM IMMEDIATELY
          // This prevents infinite loops if resolving takes time or causes rerenders
          currentVodIdRef.current = idParam; 

          if (idParam.startsWith('db_')) {
              const doubanId = idParam.replace('db_', '');
              handleResolveDoubanMovie(doubanId, state?.name, state?.year);
          } else {
              handleSelectMovie(idParam, state?.apiUrl, state?.doubanId);
          }
      }
  }, [location.pathname, location.state]);

  // --- SEO Logic ---
  useEffect(() => {
      const path = location.pathname;
      const setMeta = (name: string, content: string) => {
          let element = document.querySelector(`meta[name="${name}"]`);
          if (!element) {
              element = document.createElement('meta');
              element.setAttribute('name', name);
              document.head.appendChild(element);
          }
          element.setAttribute('content', content);
      };
      
      let title = '';
      let desc = '';
      let keywords = '';

      if (path === '/') {
          title = 'CineStream AI - 免费高清电影电视剧在线观看_2025最新好看的影视大全';
          desc = 'CineStream AI为您提供最新最热的电影、电视剧、动漫、综艺高清在线观看。海量资源，秒播不卡，支持智能AI互动，致力于为您提供极致的观影体验。';
          keywords = '电影,电视剧,综艺,动漫,视频,在线观看,CineStream AI,美剧,韩剧,4K,高清,免费视频,影视大全';
      } else if (path === '/dianying') {
          title = '电影频道-2025最新好看的电影排行榜-高清电影在线观看-CineStream AI';
          desc = 'CineStream AI电影频道汇集了全球最新最热的大片，涵盖动作、喜剧、科幻、恐怖、爱情等多种类型，提供高清流畅的在线观看体验。';
      } else if (path === '/dianshiju') {
          title = '电视剧频道-2025最新好看的电视剧大全-高清电视剧在线观看-CineStream AI';
          desc = 'CineStream AI电视剧频道为您提供最新热播的国产剧、美剧、韩剧、日剧、港台剧等，同步更新，高清免费在线观看。';
      } else if (path === '/dongman') {
          title = '动漫频道-2025最新好看的动漫大全-高清动漫在线观看-CineStream AI';
      } else if (path === '/zongyi') {
          title = '综艺频道-2025最新好看的综艺大全-高清综艺在线观看-CineStream AI';
      } else if (path.startsWith('/play/') && currentMovie) {
          const type = currentMovie.type_name || '影视';
          const name = currentMovie.vod_name;
          const isMovie = type.includes('电影') || type.includes('片') || episodes.length <= 1;
          const displayEp = episodes[currentEpisodeIndex] ? episodes[currentEpisodeIndex].title : '';
          const epSuffix = isMovie ? '' : (displayEp ? ` ${displayEp}` : '');

          title = `${name}${epSuffix} - 在线观看 - CineStream AI`;
          const rawContent = currentMovie.vod_content ? currentMovie.vod_content.replace(/<[^>]+>/g, '').slice(0, 150) : '';
          desc = `《${name}》免费高清在线观看。${rawContent}...`;
          keywords = `${name},${name}在线观看,${name}全集,CineStream AI`;
      } else if (path.startsWith('/sousuo')) {
           title = searchQuery ? `${searchQuery} - 视频搜索 - CineStream AI` : '搜索中心 - CineStream AI';
      }

      if (title) {
          document.title = title;
          setMeta('description', desc);
          setMeta('keywords', keywords);
      }

  }, [location.pathname, currentMovie, searchQuery, currentEpisodeIndex, episodes]);

  useEffect(() => {
      setWatchHistory(getHistory());
  }, []);

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
           if(isMounted.current) {
               setHomeSections(sections);
               const allItems = [ ...sections.movies, ...sections.series, ...sections.anime, ...sections.variety ];
               const finalItems = allItems.length > 0 ? allItems : sections.movies; 
               const shuffled = [...finalItems].sort(() => 0.5 - Math.random());
               setHeroItems(shuffled.slice(0, 10));
           }
       } catch(e) { console.error(e); } 
       finally { if(isMounted.current) setLoading(false); }
  }, []);

  useEffect(() => {
      fetchInitial();
  }, [fetchInitial]);

  const handleResolveDoubanMovie = async (doubanId: string, name?: string, year?: string) => {
        const requestId = Date.now();
        requestRef.current = requestId;
        setLoading(true);
        setError('');
        
        try {
            let searchName = name;
            if (!searchName) {
                 const data = await fetchDoubanData('', doubanId);
                 if (data) searchName = data.title || ''; 
            }

            if (!searchName) {
                 const hist = getHistory().find(h => String(h.vod_id) === doubanId);
                 if(hist) searchName = hist.vod_name;
            }

            if (!searchName) throw new Error('Cannot resolve movie name');
            if (requestRef.current !== requestId) return;

            // --- Multi-Strategy Search ---
            const cleanName = searchName
                .replace(/[（\(]\d{4}[）\)]/g, '')
                .replace(/第.+?季|Season\s*\d+|S\d+/gi, '')
                .replace(/集/g, '')
                .trim();
            
            const nameParts = searchName.split(' ');
            const firstPart = nameParts[0]; // Often the main Chinese title
            const nameWithoutSeason = searchName.replace(/第.+?季|Season\s*\d+/gi, '').trim();

            // Prioritize strategies: Exact -> Clean -> First Part (Chinese) -> No Season
            const strategies = [searchName, cleanName, firstPart, nameWithoutSeason];
            const uniqueStrategies = [...new Set(strategies)].filter(s => s && s.length > 1);

            // PARALLEL SEARCH for speed
            const searchPromises = uniqueStrategies.map(term => searchCms(term).then(res => ({ term, list: res.list || [] })));
            const results = await Promise.all(searchPromises);

            let candidates: VodItem[] = [];
            // Merge results respecting strategy order
            for (const term of uniqueStrategies) {
                const result = results.find(r => r.term === term);
                if (result && result.list.length > 0) {
                    // Filter duplicates
                    const newItems = (result.list as VodItem[]).filter(newItem => !candidates.some(c => c.vod_id === newItem.vod_id));
                    candidates = [...candidates, ...newItems];
                }
            }

            let foundVideo: VodItem | null = null;
            if (candidates.length > 0) {
                 const normalize = (str: string) => str.replace(/[\s\.\-_:：，,]+/g, '').toLowerCase();
                 const targetFingerprint = normalize(searchName);
                 const cleanFingerprint = normalize(cleanName);

                 // 1. Exact Match
                 foundVideo = candidates.find(v => normalize(v.vod_name) === targetFingerprint) || null;
                 // 2. Clean Match
                 if (!foundVideo) foundVideo = candidates.find(v => normalize(v.vod_name) === cleanFingerprint) || null;
                 // 3. Year Match
                 if (!foundVideo && year) {
                     foundVideo = candidates.find(v => normalize(v.vod_name).includes(cleanFingerprint) && v.vod_year === year) || null;
                 }
                 // 4. Fuzzy Match / First Candidate (Aggressive fallback to ensure playback)
                 if (!foundVideo) {
                      foundVideo = candidates.find(v => normalize(v.vod_name).includes(cleanFingerprint)) || candidates[0];
                 }
            }

            if (requestRef.current !== requestId) return;

            if (foundVideo) {
                await handleSelectMovie(foundVideo.vod_id, foundVideo.api_url, doubanId);
            } else {
                setError(`未自动匹配到影片 "${searchName}" 的播放源`);
                setSearchQuery(searchName);
                setLoading(false);
                setCurrentMovie(null); // Clear only on error
            }

        } catch (e) {
            console.error(e);
            if (requestRef.current === requestId) {
                setError('资源解析失败，请检查网络');
                setLoading(false);
                setCurrentMovie(null);
            }
        }
  }

  const handleSelectMovie = async (id: number | string, apiUrl?: string, doubanId?: string) => {
      const requestId = Date.now();
      requestRef.current = requestId;
      
      setLoading(true);
      setError('');
      setShowSidePanel(true);
      setSidePanelTab('episodes');
      
      try {
          const result = await getAggregatedMovieDetail(id, apiUrl);
          
          if (requestRef.current !== requestId) return;

          if (result && result.main) {
              const { main, alternatives } = result;
              const allSources = parseAllSources([main, ...alternatives]);
              
              if (allSources.length > 0) {
                  const m3u8Index = allSources.findIndex(s => s.name.toLowerCase().includes('m3u8'));
                  const initialIndex = m3u8Index >= 0 ? m3u8Index : 0;
                  
                  if (doubanId) main.vod_douban_id = doubanId;
                  
                  // Batch updates to avoid render thrashing
                  setAvailableSources(allSources);
                  setCurrentSourceIndex(initialIndex);
                  setEpisodes(allSources[initialIndex].episodes);
                  setCurrentMovie(main);
                  
                  const savedIndex = parseInt(localStorage.getItem(`cine_last_episode_${main.vod_id}`) || '0');
                  const validIndex = (!isNaN(savedIndex) && savedIndex >= 0 && savedIndex < allSources[initialIndex].episodes.length) ? savedIndex : 0;
                  setCurrentEpisodeIndex(validIndex);
                  
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  setLoading(false); // Stop loading immediately after basic data is ready

                  // Lazy load rich data (score, actors, etc)
                  enrichVodDetail(main).then(updates => {
                      // Safety check: is component mounted? is request still valid? are there updates?
                      if (isMounted.current && requestRef.current === requestId && updates && Object.keys(updates).length > 0) {
                          setCurrentMovie(prev => {
                              // CRITICAL: Ensure we are still looking at the same movie before updating
                              // This prevents "disappearing" content if ID changed rapidly or state reset
                              if (!prev || String(prev.vod_id) !== String(main.vod_id)) return prev;
                              return { ...prev, ...updates };
                          });
                      }
                  }).catch(err => {
                      console.warn("Enrichment failed silently:", err);
                      // Don't break UI, just keep existing movie data
                  });
              } else {
                 setError('未找到可播放的M3U8资源');
                 setLoading(false);
              }
          } else {
              setError('无法加载影片详情');
              setLoading(false);
          }
      } catch (error) {
          console.error(error);
          if (requestRef.current === requestId) {
              setError('影片加载失败');
              setLoading(false);
          }
      }
  };

  const handleSourceChange = (index: number) => {
      setCurrentSourceIndex(index);
      const newEpisodes = availableSources[index].episodes;
      setEpisodes(newEpisodes);
      setCurrentEpisodeIndex(prev => (prev >= 0 && prev < newEpisodes.length) ? prev : 0);
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
      return list.slice(startIndex, startIndex + EPISODES_PER_PAGE);
  }, [episodes, isReverseOrder, currentEpisodePage]);

  const totalEpisodePages = Math.ceil(episodes.length / EPISODES_PER_PAGE);

  const handleTabChange = (tab: string) => {
      const path = TAB_TO_URL[tab];
      if (path) navigate(path);
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

  useEffect(() => {
    const handleClickOutside = () => setContextMenu({ ...contextMenu, visible: false });
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent, item: VodItem) => {
      e.preventDefault();
      setContextMenu({ visible: true, x: e.clientX, y: e.clientY, item: item });
  };

  const handleDeleteHistory = () => {
      if (contextMenu.item) {
          setWatchHistory(removeFromHistory(contextMenu.item.vod_id));
      }
      setContextMenu({ ...contextMenu, visible: false });
  };

  const triggerSearch = async (query: string) => {
      if(!query.trim()) return;
      setSearchQuery(query);
      setLoading(true);
      setHasSearched(true);
      setPersonProfile(null); 
      setError('');

      if (activeTab !== 'search') navigate(TAB_TO_URL['search']);
      
      try {
          const results = await getAggregatedSearch(query);
          const celebrity = results.find(r => r.type_name === 'celebrity');
          
          if (celebrity) {
             const detail = await fetchPersonDetail(celebrity.vod_id);
             if (detail) {
                 setPersonProfile(detail);
                 const doubanWorks = detail.works || [];
                 const cmsResults = results.filter(r => r.type_name !== 'celebrity');
                 const mergedMap = new Map();
                 doubanWorks.forEach(work => mergedMap.set(work.vod_name, work));
                 cmsResults.forEach(item => {
                     if (!mergedMap.has(item.vod_name)) mergedMap.set(item.vod_name, item);
                     else {
                         const existing = mergedMap.get(item.vod_name);
                         if (item.api_url) { existing.api_url = item.api_url; existing.vod_id = item.vod_id; }
                     }
                 });
                 setSearchResults(Array.from(mergedMap.values()));
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
        setError('');
        try {
            const detail = await fetchPersonDetail(item.vod_id);
            if (detail) {
                setPersonProfile(detail);
                setSearchResults(detail.works || []);
                if (resultsRef.current) resultsRef.current.scrollIntoView({ behavior: 'smooth' });
            }
        } catch (e) {} finally {
            setLoading(false);
        }
        return;
      }

      if (item.api_url) {
          navigate(`/play/${item.vod_id}`, { state: { doubanId: item.vod_douban_id, apiUrl: item.api_url } });
          return;
      }

      if (item.source === 'douban') {
          navigate(`/play/db_${item.vod_id}`, { state: { name: item.vod_name, pic: item.vod_pic, year: item.vod_year } });
          return;
      }
      navigate(`/play/${item.vod_id}`);
  };

  // Safe check for play page rendering
  const isPlayPage = location.pathname.startsWith('/play');

  return (
      <div className="relative min-h-screen pb-20 overflow-x-hidden font-sans pt-24 lg:pt-16">
          <NavBar activeTab={activeTab} onTabChange={handleTabChange} onSettingsClick={() => setShowSettings(true)} />

          <Suspense fallback={null}>
               <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
          </Suspense>

          {contextMenu.visible && (
              <div style={{ top: contextMenu.y, left: contextMenu.x }} className="fixed z-[100] bg-[#1a1f2e] border border-white/10 rounded-lg shadow-2xl py-1 min-w-[120px] animate-fade-in">
                  <button onClick={handleDeleteHistory} className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                      删除记录
                  </button>
              </div>
          )}

          {loading && !hasSearched && (
               <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                   <div className="animate-spin h-12 w-12 border-4 border-brand border-t-transparent rounded-full mb-4"></div>
                   <div className="text-brand font-bold tracking-widest text-lg">LOADING</div>
               </div>
          )}

          <div className="relative z-10 container mx-auto px-4 lg:px-6 py-6 max-w-[1400px]">
              
              {/* Error Display for Playback Page */}
              {error && isPlayPage && !loading && (
                  <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                      <div className="bg-red-500/10 p-6 rounded-2xl border border-red-500/20 max-w-md">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-red-400 mx-auto mb-4"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>
                          <p className="text-gray-200 mb-6 font-medium">{error}</p>
                          <div className="flex gap-4 justify-center">
                              <button onClick={() => navigate(-1)} className="px-6 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-sm text-gray-300">返回</button>
                              <button onClick={() => window.location.reload()} className="px-6 py-2 rounded-full bg-brand text-black font-bold hover:bg-brand-hover transition-colors text-sm">刷新重试</button>
                          </div>
                      </div>
                      <div className="mt-8 max-w-lg w-full">
                          <p className="text-gray-400 mb-4 text-sm">若长时间未播放，可尝试手动搜索：</p>
                           <div className="flex gap-2">
                              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="输入影片名称..." className="flex-1 bg-[#121620] border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-brand/50" />
                              <button onClick={() => triggerSearch(searchQuery)} className="bg-brand text-black font-bold px-6 rounded-xl hover:bg-brand-hover transition-colors">搜索</button>
                           </div>
                      </div>
                  </div>
              )}

              {/* Fallback for Empty Play Page (No Error, No Loading, No Movie) */}
              {isPlayPage && !currentMovie && !loading && !error && (
                  <div className="flex flex-col items-center justify-center py-32 text-center animate-fade-in min-h-[50vh]">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-20 h-20 text-gray-600 mb-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                      <h2 className="text-2xl font-bold text-white mb-2">未找到播放资源</h2>
                      <p className="text-gray-400 mb-8 max-w-md">抱歉，自动匹配失败。您可以尝试使用不同的关键词搜索。</p>
                      <div className="w-full max-w-md">
                           <div className="flex gap-2">
                              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="输入影片名称搜索..." className="flex-1 bg-[#121620] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand/50" />
                              <button onClick={() => triggerSearch(searchQuery)} className="bg-brand text-black font-bold px-6 rounded-xl hover:bg-brand-hover transition-colors">搜索</button>
                           </div>
                      </div>
                  </div>
              )}

              {currentMovie && isPlayPage && (
                  <section className="mb-12 animate-fade-in space-y-6 mt-4 min-h-[500px]">
                      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                          返回
                      </button>
                      
                      <div className="flex flex-col lg:flex-row gap-6 items-start h-auto relative transition-all duration-300">
                          <div className={`flex-1 w-full min-h-[300px] bg-black rounded-xl overflow-hidden border border-white/5 shadow-2xl relative group transition-all duration-300 z-10 ${!showSidePanel ? 'lg:h-[650px]' : 'lg:h-[500px]'}`}>
                              <Suspense fallback={<div className="w-full h-full bg-black flex items-center justify-center"><div className="animate-spin h-10 w-10 border-4 border-brand border-t-transparent rounded-full"></div></div>}>
                                  <VideoPlayer 
                                      key={currentMovie.vod_id} // Force remount if ID changes to prevent stale player state
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

                          {showSidePanel && (
                              <div className="w-full lg:w-[320px] flex flex-col gap-2 flex-shrink-0 animate-fade-in relative z-0">
                                  <div className="flex justify-end absolute -top-10 right-0 z-20">
                                      <button onClick={() => setShowSidePanel(false)} className="bg-[#121620] hover:bg-[#1a202e] text-gray-300 hover:text-white px-3 py-1.5 rounded-full text-xs flex items-center gap-1.5 border border-white/10 shadow-lg transition-all">
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3.5 h-3.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                                          隐藏
                                      </button>
                                  </div>

                                  <div className="bg-[#121620] border border-white/5 rounded-xl overflow-hidden shadow-xl flex flex-col h-[500px]">
                                      <div className="flex border-b border-white/5">
                                          <button onClick={() => setSidePanelTab('episodes')} className={`flex-1 py-3 text-sm font-bold transition-all relative ${sidePanelTab === 'episodes' ? 'text-white bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}>
                                              选集
                                              {sidePanelTab === 'episodes' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>}
                                          </button>
                                          <button onClick={() => setSidePanelTab('sources')} className={`flex-1 py-3 text-sm font-bold transition-all relative ${sidePanelTab === 'sources' ? 'text-white bg-white/5' : 'text-gray-500 hover:text-gray-300'}`}>
                                              换源
                                              {sidePanelTab === 'sources' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>}
                                          </button>
                                      </div>

                                      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 relative bg-black/20">
                                          {sidePanelTab === 'episodes' ? (
                                              <>
                                                  <div className="flex justify-between items-center mb-3 px-1">
                                                      <span className="text-xs text-gray-400">{episodes.length} Episodes</span>
                                                      <button onClick={() => setIsReverseOrder(!isReverseOrder)} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors" title="Sort Order">
                                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" /></svg>
                                                      </button>
                                                  </div>
                                                  {totalEpisodePages > 1 && (
                                                      <div className="flex flex-wrap gap-2 mb-3">
                                                          {Array.from({ length: totalEpisodePages }).map((_, idx) => (
                                                              <button key={idx} onClick={() => setCurrentEpisodePage(idx)} className={`px-2 py-1 text-[10px] rounded border ${currentEpisodePage === idx ? 'border-brand text-brand bg-brand/10' : 'border-white/10 text-gray-400 hover:border-white/30'}`}>{(idx * EPISODES_PER_PAGE) + 1}-{Math.min((idx + 1) * EPISODES_PER_PAGE, episodes.length)}</button>
                                                          ))}
                                                      </div>
                                                  )}
                                                  <div className="grid grid-cols-4 gap-2">
                                                      {displayEpisodes.map((ep) => (
                                                          <button key={ep.index} onClick={() => setCurrentEpisodeIndex(ep.index)} className={`h-9 rounded border text-xs font-medium transition-all truncate px-1 ${currentEpisodeIndex === ep.index ? 'bg-brand text-black border-brand shadow-[0_0_10px_rgba(34,197,94,0.3)] font-bold' : 'bg-[#1a1f2e] text-gray-300 border-white/5 hover:border-white/30 hover:bg-white/5'}`} title={ep.title}>{ep.title}</button>
                                                      ))}
                                                  </div>
                                              </>
                                          ) : (
                                              <div className="space-y-2">
                                                  {availableSources.map((source, idx) => (
                                                      <button key={idx} onClick={() => handleSourceChange(idx)} className={`w-full text-left p-3 rounded-xl border transition-all flex justify-between items-center group ${currentSourceIndex === idx ? 'bg-brand/10 border-brand text-brand shadow-[0_0_15px_rgba(34,197,94,0.1)]' : 'bg-[#1a1f2e] border-white/5 text-gray-300 hover:bg-white/5 hover:border-white/20'}`}>
                                                          <div><div className={`font-bold text-sm mb-0.5 ${currentSourceIndex === idx ? 'text-brand' : 'text-gray-200'}`}>{source.name}</div><div className="text-[10px] text-gray-500 font-mono">{source.episodes.length} Episodes</div></div>
                                                          {currentSourceIndex === idx && <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-brand"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
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
                      <Suspense fallback={null}><GeminiChat currentMovie={currentMovie} /></Suspense>
                  </section>
              )}

              {activeTab === 'home' && !currentMovie && (
                  <>
                      {heroItems.length > 0 && <HeroBanner items={heroItems} onPlay={handleItemClick} />}
                      {watchHistory.length > 0 && <HorizontalSection title="继续观看" items={watchHistory} id="history" onItemClick={handleItemClick} onItemContextMenu={handleContextMenu} />}
                      {isHomeEmpty ? (
                          <div className="flex flex-col items-center justify-center py-20 text-gray-500"><p className="text-lg">暂无推荐数据</p><button onClick={() => window.location.reload()} className="mt-4 text-brand hover:underline">刷新重试</button></div>
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

              {(['movies', 'series', 'anime', 'variety'].includes(activeTab)) && !currentMovie && <CategoryGrid category={activeTab} onItemClick={handleItemClick} />}

              {activeTab === 'search' && !currentMovie && (
                  <div className="animate-fade-in max-w-5xl mx-auto">
                      <div className="flex gap-2 md:gap-4 mb-8">
                          <div className="relative flex-1 group">
                              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 group-focus-within:text-brand transition-colors"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg></div>
                              <form onSubmit={handleSearch} className="w-full"><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索电影、剧集、综艺、动漫..." className="w-full bg-[#121620] border border-white/10 rounded-xl py-3 md:py-4 pl-12 pr-4 text-white focus:outline-none focus:border-brand/50 focus:ring-1 focus:ring-brand/50 shadow-xl transition-all" /></form>
                          </div>
                          <button onClick={() => triggerSearch(searchQuery)} className="bg-brand hover:bg-brand-hover text-black font-bold px-6 md:px-8 rounded-xl transition-all hover:scale-105 shadow-[0_0_15px_rgba(34,197,94,0.3)] whitespace-nowrap">搜索</button>
                      </div>

                      <div ref={resultsRef}>
                          {loading ? (
                              <div className="flex justify-center py-20"><div className="animate-spin h-10 w-10 border-4 border-brand border-t-transparent rounded-full"></div></div>
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
                                                      <div className="flex justify-between items-center mt-1 text-xs text-gray-400"><span>{item.vod_year || 'N/A'}</span><span className="bg-white/10 px-1.5 py-0.5 rounded text-[10px]">{item.type_name || '影视'}</span></div>
                                                  </div>
                                                  {item.type_name === 'celebrity' && <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"><button className="bg-brand text-black font-bold px-4 py-2 rounded-full transform scale-90 group-hover:scale-100 transition-transform">查看资料</button></div>}
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                      hasSearched && <div className="text-center py-20 text-gray-500 flex flex-col items-center"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16 mb-4 opacity-50"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg><p>未找到相关内容，换个关键词试试？</p></div>
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
