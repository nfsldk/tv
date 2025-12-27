import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense, useTransition } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getHomeSections, getAggregatedSearch, getAggregatedMovieDetail, parseAllSources, fetchDoubanData, fetchCategoryItems, getHistory, addToHistory, initVodSources } from './services/vodService';
import MovieInfoCard from './components/MovieInfoCard';
import ImageWithFallback from './components/ImageWithFallback';
import { VodItem, VodDetail, Episode, PlaySource, HistoryItem } from './types';

const VideoPlayer = lazy(() => import('./components/VideoPlayer'));
const GeminiChat = lazy(() => import('./components/GeminiChat'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

const NavIcons = {
    home: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
    movies: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" /></svg>,
    series: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z" /></svg>,
    anime: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75s.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg>,
    variety: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" /></svg>,
    search: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" /></svg>,
    settings: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3m.38 1.125a23.91 23.91 0 011.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 001.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 010 3.46" /></svg>
};

const URL_TO_TAB: Record<string, string> = { '': 'home', 'dianying': 'movies', 'dianshiju': 'series', 'dongman': 'anime', 'zongyi': 'variety', 'sousuo': 'search' };
const TAB_TO_URL: Record<string, string> = { 'home': '/', 'movies': '/dianying', 'series': '/dianshiju', 'anime': '/dongman', 'variety': '/zongyi', 'search': '/sousuo' };
const TAB_NAME: Record<string, string> = { 'home': '首页', 'movies': '电影', 'series': '剧集', 'anime': '动漫', 'variety': '综艺', 'search': '搜索' };

const CATEGORY_CONFIG = {
    movies: {
        title: '电影', subtitle: '来自豆瓣的精选内容',
        filter1: { label: '分类', options: ['全部', '热门电影', '最新电影', '豆瓣高分', '冷门佳片'] },
        filter2: { label: '地区', options: ['全部', '华语', '欧美', '韩国', '日本'] }
    },
    series: {
        title: '剧集', subtitle: '来自豆瓣的精选内容',
        filter1: { label: '分类', options: ['全部', '最近热门'] },
        filter2: { label: '类型', options: ['全部', '国产', '欧美', '日本', '韩国', '动漫', '纪录片'] }
    },
    anime: {
        title: '动漫', subtitle: '精选热门番组',
        filter1: { label: '分类', options: ['全部', '每日放送', '番剧', '剧场版'] },
        filter2: { label: '星期', options: ['全部', '周一', '周二', '周三', '周四', '周五', '周六', '周日'] }
    },
    variety: {
        title: '综艺', subtitle: '来自豆瓣的精选内容',
        filter1: { label: '分类', options: ['全部', '最近热门'] },
        filter2: { label: '类型', options: ['全部', '国内', '国外'] }
    }
};

const HeroBanner = React.memo(({ items, onPlay }: { items: VodItem[], onPlay: (item: VodItem) => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [detailsCache, setDetailsCache] = useState<Record<string, any>>({});
  const timerRef = useRef<number | null>(null);

  const activeItem = items[currentIndex];

  const prefetchDetails = useCallback(async (index: number) => {
    const item = items[index];
    if (!item || detailsCache[item.vod_id]) return;
    try {
        const res = await fetchDoubanData(item.vod_name, item.vod_id);
        if (res) setDetailsCache(prev => ({ ...prev, [item.vod_id]: res }));
    } catch (e) {}
  }, [items, detailsCache]);

  useEffect(() => {
    if (items.length <= 1) return;
    const handleNext = () => { startTransition(() => { setCurrentIndex((prev) => (prev + 1) % items.length); }); };
    timerRef.current = window.setInterval(handleNext, 12000);
    return () => { if(timerRef.current) clearInterval(timerRef.current); };
  }, [items.length]);

  useEffect(() => {
      prefetchDetails(currentIndex);
      prefetchDetails((currentIndex + 1) % items.length);
  }, [currentIndex, items.length, prefetchDetails]);

  if (!activeItem) return null;

  const currentDetail = detailsCache[activeItem.vod_id] || { 
      vod_name: activeItem.vod_name, 
      content: activeItem.vod_remarks || "精彩内容同步中...", 
      score: activeItem.vod_score || "8.5",
      director: "加载中",
      actor: "加载中"
  };

  return (
    <div className="relative w-full h-[300px] md:h-[460px] rounded-[2.5rem] md:rounded-[4rem] overflow-hidden mb-12 md:mb-20 bg-[#020617] border border-white/5 shadow-4xl group isolate transition-all">
      <div key={activeItem.vod_id + '_bg'} className={`absolute inset-0 transition-all duration-1000 ease-in-out z-0 ${isPending ? 'opacity-0 scale-110' : 'opacity-100 scale-100'}`}>
          <ImageWithFallback src={activeItem.vod_pic} alt={activeItem.vod_name} priority={true} size="s" className="w-full h-full object-cover blur-[80px] opacity-25" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/70 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/40 to-transparent"></div>
      </div>
      <div className="absolute inset-0 z-10 flex items-center px-10 md:px-24">
        <div key={activeItem.vod_id + '_content'} className={`flex flex-row items-center gap-12 md:gap-24 w-full transition-all duration-700 ${isPending ? 'opacity-0 translate-y-8 blur-md' : 'opacity-100 translate-y-0 blur-0'}`}>
            <div className="hidden sm:block flex-shrink-0 w-[140px] md:w-[260px] aspect-[2/3] rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.9)] border border-white/10 z-20 hover:scale-105 transition-all duration-700 bg-gray-900 group/poster rotate-[-1deg] hover:rotate-0 ring-1 ring-white/10">
                <ImageWithFallback src={activeItem.vod_pic} alt={activeItem.vod_name} priority={true} size="m" className="w-full h-full object-cover transition-transform duration-[1.5s] group-hover/poster:scale-110" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover/poster:opacity-100 transition-opacity flex items-end justify-center pb-10">
                    <span className="text-brand font-black text-4xl drop-shadow-[0_0_15px_#22c55e]">★ {currentDetail?.score}</span>
                </div>
            </div>
            <div className="flex-1 space-y-4 md:space-y-8 min-w-0">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="bg-brand text-black text-xs font-black px-4 py-1 rounded-full shadow-[0_0_20px_rgba(34,197,94,0.3)] tracking-[0.1em] uppercase">{currentDetail?.score || '热门'}</div>
                    <div className="bg-white/5 backdrop-blur-3xl text-gray-300 text-xs font-bold px-4 py-1 rounded-full border border-white/10">{activeItem.vod_year || '2025'}</div>
                </div>
                <h2 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tighter truncate drop-shadow-[0_15px_35px_rgba(0,0,0,1)]">{activeItem.vod_name}</h2>
                <div className="flex flex-row items-center gap-4 text-gray-300 text-xs md:text-xl font-bold opacity-90 tracking-tight flex-wrap">
                    <div className="flex items-center gap-2">
                        <span className="text-brand/70 bg-brand/5 px-2 py-0.5 rounded-md text-[10px] md:text-xs font-black tracking-widest uppercase border border-brand/10">导演</span>
                        <span className="text-gray-100">{currentDetail?.director || '未知'}</span>
                    </div>
                    <div className="w-px h-4 bg-white/20 hidden md:block" />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-brand/70 bg-brand/5 px-2 py-0.5 rounded-md text-[10px] md:text-xs font-black tracking-widest uppercase border border-brand/10">主演</span>
                        <span className="text-gray-100 truncate">{currentDetail?.actor || '未知'}</span>
                    </div>
                </div>
                <p className="text-gray-400 text-sm md:text-xl leading-relaxed line-clamp-2 md:line-clamp-3 max-w-3xl font-medium opacity-70 border-l-2 border-brand/30 pl-8 italic">{currentDetail?.content || "正在为您深度同步精彩内容..."}</p>
                <div className="pt-6 md:pt-10 flex gap-6">
                    <button onClick={() => onPlay(activeItem)} className="bg-brand text-black hover:bg-brand-hover hover:scale-105 transition-all text-sm md:text-2xl font-black px-12 py-4 md:px-20 md:py-6 rounded-[1.8rem] md:rounded-[2.5rem] flex items-center gap-4 shadow-[0_25px_60px_rgba(34,197,94,0.4)] group/btn active:scale-95 ring-4 ring-brand/10">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 md:w-10 md:h-10 transition-transform group-hover/btn:translate-x-1"><path d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" /></svg>
                        <span>立即观影</span>
                    </button>
                </div>
            </div>
        </div>
      </div>
      <div className="absolute bottom-10 right-24 z-20 flex gap-2">
          {items.map((_, i) => ( 
              <button key={i} onClick={() => startTransition(() => setCurrentIndex(i))} className={`h-1.5 rounded-full transition-all duration-700 ${i === currentIndex ? 'w-12 bg-brand shadow-[0_0_20px_#22c55e]' : 'w-1.5 bg-white/10 hover:bg-white/30'}`} /> 
          ))}
      </div>
    </div>
  );
});

const HorizontalSection = React.memo(({ title, items, id, onItemClick }: { title: string, items: (VodItem | HistoryItem)[], id: string, onItemClick: (item: VodItem) => void }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    if (!items || items.length === 0) return null;
    const displayItems = items.slice(0, 30);
    return (
        <div className="mb-14 animate-fade-in group/section relative cv-auto" id={id}>
            <div className="flex items-center justify-between mb-8 px-1">
                <h3 className="text-2xl md:text-3xl font-black text-white flex items-center gap-5 border-l-[8px] border-brand pl-8 tracking-tighter uppercase">{title}</h3>
                <div className="hidden md:flex gap-4">
                    <button onClick={() => scrollRef.current?.scrollBy({ left: -600, behavior: 'smooth' })} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-brand hover:text-black transition-all"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
                    <button onClick={() => scrollRef.current?.scrollBy({ left: 600, behavior: 'smooth' })} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white hover:bg-brand hover:text-black transition-all"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>
                </div>
            </div>
            <div className="relative">
                <div ref={scrollRef} className="flex gap-6 md:gap-10 overflow-x-auto pb-10 no-scrollbar snap-x scroll-smooth">
                    {displayItems.map((item) => (
                        <div key={`${item.vod_id}-${(item as any).last_updated || ''}`} className="flex-shrink-0 w-[140px] md:w-[210px] snap-start cursor-pointer group/card" onClick={() => onItemClick(item)}>
                            <div className="aspect-[2/3] rounded-[2rem] md:rounded-[3rem] overflow-hidden relative shadow-3xl bg-gray-900 border border-white/5 group-hover/card:border-brand/60 transition-all duration-700 group-hover/card:-translate-y-4 ring-1 ring-white/10">
                                <ImageWithFallback src={item.vod_pic} alt={item.vod_name} searchKeyword={item.vod_name} size="m" className="w-full h-full object-cover transition-transform duration-1000 group-hover/card:scale-110" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity"></div>
                                {(item as HistoryItem).episode_name && <div className="absolute bottom-0 inset-x-0 bg-brand/95 text-black text-[10px] md:text-xs font-black py-4 text-center truncate px-4 tracking-tighter">正在播放: {(item as HistoryItem).episode_name}</div>}
                                {(item as any).vod_remarks && <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-2xl text-[10px] font-black text-white px-3 py-1 rounded-full border border-white/10">{(item as any).vod_remarks}</div>}
                            </div>
                            <h4 className="mt-6 text-base md:text-lg text-gray-200 font-bold truncate group-hover/card:text-brand transition-colors px-2 text-center tracking-tight">{item.vod_name}</h4>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
});

const CategoryPage = ({ category, onPlay }: { category: 'movies' | 'series' | 'anime' | 'variety', onPlay: (item: VodItem) => void }) => {
    const config = CATEGORY_CONFIG[category];
    const [filter1, setFilter1] = useState('全部');
    const [filter2, setFilter2] = useState('全部');
    const [items, setItems] = useState<VodItem[]>([]);
    const [loading, setLoading] = useState(false);
    const loadData = async () => {
        setLoading(true);
        const results = await fetchCategoryItems(category, { filter1, filter2 });
        setItems(results);
        setLoading(false);
    };
    useEffect(() => { loadData(); }, [category, filter1, filter2]);
    const FilterRow = ({ label, options, active, onChange }: any) => (
        <div className="flex items-center gap-6 md:gap-10">
            <span className="text-gray-500 text-sm md:text-base font-black tracking-widest min-w-[3em] text-center">{label}</span>
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {options.map((opt: string) => (
                    <button 
                        key={opt} 
                        onClick={() => onChange(opt)}
                        className={`flex-shrink-0 px-5 md:px-8 py-2 md:py-2.5 rounded-full text-xs md:text-sm font-black transition-all ${active === opt ? 'bg-brand text-black shadow-lg shadow-brand/20 scale-105' : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'}`}
                    >
                        {opt}
                    </button>
                ))}
            </div>
        </div>
    );
    return (
        <div className="space-y-12 pb-20 animate-fade-in">
            <header className="space-y-4">
                <h1 className="text-4xl md:text-7xl font-black text-white tracking-tighter">{config.title}</h1>
                <p className="text-gray-500 font-bold text-sm md:text-xl tracking-tight">{config.subtitle}</p>
            </header>
            <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] md:rounded-[3.5rem] p-6 md:p-10 space-y-6 md:space-y-10 backdrop-blur-3xl shadow-4xl ring-1 ring-white/5">
                <FilterRow label={config.filter1.label} options={config.filter1.options} active={filter1} onChange={setFilter1} />
                <FilterRow label={config.filter2.label} options={config.filter2.options} active={filter2} onChange={setFilter2} />
            </div>
            {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-10">
                    {Array.from({ length: 15 }).map((_, i) => (
                        <div key={i} className="aspect-[2/3] rounded-[2rem] bg-white/5 animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 md:gap-10">
                    {items.map((item) => (
                        <div key={item.vod_id} onClick={() => onPlay(item)} className="group cursor-pointer">
                            <div className="aspect-[2/3] rounded-[2rem] md:rounded-[3rem] overflow-hidden relative shadow-3xl bg-gray-900 border border-white/5 group-hover:border-brand/60 transition-all duration-700 group-hover:-translate-y-4 ring-1 ring-white/10">
                                <ImageWithFallback src={item.vod_pic} alt={item.vod_name} searchKeyword={item.vod_name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-20">
                                    <h4 className="text-sm md:text-lg font-black text-white truncate group-hover:text-brand transition-colors">{item.vod_name}</h4>
                                    <div className="flex justify-between items-center mt-3 text-[10px] md:text-xs font-black text-gray-500 tracking-widest">
                                        <span>{item.vod_year || '2024'}</span>
                                        <span className="text-brand">★ {item.vod_score || '8.5'}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [currentMovie, setCurrentMovie] = useState<VodDetail | null>(null);
  const [availableSources, setAvailableSources] = useState<PlaySource[]>([]);
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(-1);
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [sidePanelTab, setSidePanelTab] = useState<'episodes' | 'sources'>('episodes');
  const [activeTab, setActiveTab] = useState('home');
  const [showSettings, setShowSettings] = useState(false);
  const [homeSections, setHomeSections] = useState<any>({ movies: [], series: [], anime: [], variety: [] });
  const [heroItems, setHeroItems] = useState<VodItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<VodItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [epPage, setEpPage] = useState(0);
  const EP_PER_PAGE = 32;

  useEffect(() => { initVodSources(); setWatchHistory(getHistory()); }, []);
  useEffect(() => { if (currentEpisodeIndex !== -1) setEpPage(Math.floor(currentEpisodeIndex / EP_PER_PAGE)); }, [currentEpisodeIndex]);

  useEffect(() => {
      if (currentMovie && currentSourceIndex !== -1 && currentEpisodeIndex !== -1) {
          const vodId = currentMovie.vod_id;
          localStorage.setItem(`cine_last_source_${vodId}`, String(currentSourceIndex));
          localStorage.setItem(`cine_last_episode_${vodId}`, String(currentEpisodeIndex));
          const episodeName = episodes[currentEpisodeIndex]?.title || '未知集数';
          const updated = addToHistory({ ...currentMovie, episode_index: currentEpisodeIndex, episode_name: episodeName, source_index: currentSourceIndex, last_updated: Date.now() } as HistoryItem);
          setWatchHistory(updated);
      }
  }, [currentSourceIndex, currentEpisodeIndex, currentMovie, episodes]);

  useEffect(() => {
       setLoading(true);
       getHomeSections().then(data => {
           if (data) {
               setHomeSections(data);
               setHeroItems([...data.movies.slice(0, 4), ...data.series.slice(0, 3), ...data.anime.slice(0, 3)]);
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
      }
  }, [location.pathname]);

  const handleSelectMovie = async (id: number | string, apiUrl?: string, vodName?: string) => {
      setLoading(true);
      try {
          const result = await getAggregatedMovieDetail(id, apiUrl, vodName);
          if (result && result.main) {
              const allSources = parseAllSources([result.main, ...result.alternatives]);
              if (allSources.length > 0) {
                  setAvailableSources(allSources);
                  const savedSIdx = parseInt(localStorage.getItem(`cine_last_source_${result.main.vod_id}`) || '0');
                  const sIdx = (savedSIdx >= 0 && savedSIdx < allSources.length) ? savedSIdx : 0;
                  setCurrentSourceIndex(sIdx);
                  setEpisodes(allSources[sIdx].episodes);
                  setCurrentMovie(result.main);
                  const savedEIdx = parseInt(localStorage.getItem(`cine_last_episode_${result.main.vod_id}`) || '0');
                  setCurrentEpisodeIndex((savedEIdx >= 0 && savedEIdx < allSources[sIdx].episodes.length) ? savedEIdx : 0);
              }
          }
      } catch (e) {} finally { setLoading(false); }
  };

  const handleItemClick = (item: VodItem) => {
      handleSelectMovie(item.vod_id, item.api_url, item.vod_name);
      navigate(`/play/${item.vod_id}`);
  };

  const triggerSearch = async (query: string) => {
      if(!query.trim()) return;
      setSearchQuery(query);
      setLoading(true);
      setHasSearched(true);
      try {
          const results = await getAggregatedSearch(query);
          setSearchResults(results);
      } catch (error) {} finally { setLoading(false); }
  };

  const MobileNav = () => (
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-[60] bg-[#020617]/95 backdrop-blur-2xl border-t border-white/5 safe-area-bottom">
          <div className="grid grid-cols-6 h-16">
              {[ { id: 'home', label: '首页', icon: NavIcons.home }, { id: 'movies', label: '电影', icon: NavIcons.movies }, { id: 'series', label: '剧集', icon: NavIcons.series }, { id: 'anime', label: '动漫', icon: NavIcons.anime }, { id: 'variety', label: '综艺', icon: NavIcons.variety }, { id: 'search', label: '搜索', icon: NavIcons.search } ].map(item => (
                  <button key={item.id} onClick={() => navigate(TAB_TO_URL[item.id])} className={`flex flex-col items-center justify-center gap-1 transition-all duration-300 ${activeTab === item.id ? 'text-brand' : 'text-gray-500'}`}>
                      <div className={`transition-transform duration-300 ${activeTab === item.id ? 'scale-110 text-brand' : 'scale-100'}`}>{(NavIcons as any)[item.id]}</div>
                      <span className="text-[10px] font-black">{item.label}</span>
                  </button>
              ))}
          </div>
      </div>
  );

  return (
      <div className="relative min-h-screen pb-24 lg:pb-16 pt-16 lg:pt-20 bg-[#020617]">
          <nav className="fixed top-0 inset-x-0 z-50 bg-[#020617]/90 backdrop-blur-3xl border-b border-white/5 hidden lg:block h-20">
                <div className="container mx-auto max-w-[1600px] h-full flex items-center justify-between px-12">
                    <div className="flex items-center gap-4 cursor-pointer group" onClick={() => navigate('/')}>
                        <div className="w-10 h-10 bg-brand rounded-2xl flex items-center justify-center text-black font-black text-xl shadow-[0_0_25px_rgba(34,197,94,0.4)] group-hover:scale-110 transition-all border border-brand/20">C</div>
                        <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand to-cyan-400 tracking-tighter uppercase">CineStream</span>
                    </div>
                    <div className="flex gap-2">
                        {['home', 'movies', 'series', 'anime', 'variety', 'search'].map(id => (
                            <button key={id} onClick={() => navigate(TAB_TO_URL[id])} className={`px-8 py-3 rounded-[1.5rem] text-base font-black transition-all flex items-center gap-3 ${activeTab === id ? 'bg-brand text-black shadow-2xl scale-105' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>
                                <span className={activeTab === id ? 'text-black' : 'text-brand'}>{(NavIcons as any)[id]}</span>
                                {TAB_NAME[id]}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white p-3 rounded-2xl hover:bg-white/10 transition-all border border-transparent hover:border-white/10">{NavIcons.settings}</button>
                </div>
          </nav>

          <div className="container mx-auto px-6 lg:px-12 max-w-[1700px]">
              {currentMovie && (
                  <section className="mb-14 space-y-10 animate-fade-in">
                      <div className="flex flex-col lg:flex-row bg-[#0f111a] rounded-[2.5rem] lg:rounded-[4rem] overflow-hidden border border-white/5 shadow-[0_50px_100px_rgba(0,0,0,0.8)] relative ring-1 ring-white/10">
                          <div className={`flex-1 bg-black relative transition-all duration-700 shadow-inner ${!showSidePanel ? 'lg:h-[820px]' : 'lg:h-[620px] aspect-video'}`}>
                              <Suspense fallback={<div className="w-full h-full bg-black flex items-center justify-center animate-pulse"><div className="w-16 h-16 border-[6px] border-brand border-t-transparent rounded-full animate-spin" /></div>}>
                                  <VideoPlayer url={availableSources[currentSourceIndex]?.episodes[currentEpisodeIndex]?.url || ''} poster={currentMovie.vod_pic} title={currentMovie.vod_name} episodeIndex={currentEpisodeIndex} vodId={currentMovie.vod_id} onNext={() => currentEpisodeIndex < episodes.length - 1 && setCurrentEpisodeIndex(prev => prev + 1)} />
                              </Suspense>
                              {!showSidePanel && (
                                  <button onClick={() => setShowSidePanel(true)} className="absolute top-10 right-10 z-30 px-12 py-5 rounded-[2rem] bg-black/60 backdrop-blur-3xl text-white font-black shadow-4xl border border-white/20 hover:bg-brand hover:text-black transition-all text-sm tracking-[0.2em] uppercase ring-1 ring-white/10">展开控制面板</button>
                              )}
                          </div>
                          {showSidePanel && (
                              <div className="w-full lg:w-[440px] flex flex-col border-l border-white/10 bg-[#0f111a]/95 backdrop-blur-[50px] h-[500px] lg:h-auto shadow-inner relative z-20">
                                  <div className="flex items-center justify-between p-8 border-b border-white/10 bg-black/40">
                                      <div className="flex items-center gap-4"><div className="w-3 h-3 rounded-full bg-brand animate-pulse shadow-[0_0_15px_#22c55e]"></div><h3 className="text-base font-black text-white tracking-[0.2em] uppercase opacity-80">播放控制</h3></div>
                                      <button onClick={() => setShowSidePanel(false)} className="px-6 py-2 rounded-full text-[10px] font-black text-gray-400 border border-white/10 hover:text-white transition-all uppercase hover:bg-white/5 tracking-widest">隐藏</button>
                                  </div>
                                  <div className="flex bg-black/40 border-b border-white/5">
                                      <button onClick={() => setSidePanelTab('episodes')} className={`flex-1 py-6 text-[11px] font-black tracking-[0.2em] uppercase transition-all relative ${sidePanelTab === 'episodes' ? 'text-brand bg-white/5' : 'text-gray-500'}`}>选集{sidePanelTab === 'episodes' && <div className="absolute bottom-0 inset-x-12 h-1 bg-brand shadow-[0_0_20px_#22c55e]" />}</button>
                                      <button onClick={() => setSidePanelTab('sources')} className={`flex-1 py-6 text-[11px] font-black tracking-[0.2em] uppercase transition-all relative ${sidePanelTab === 'sources' ? 'text-brand bg-white/5' : 'text-gray-500'}`}>源站{sidePanelTab === 'sources' && <div className="absolute bottom-0 inset-x-12 h-1 bg-brand shadow-[0_0_20px_#22c55e]" />}</button>
                                  </div>
                                  <div className="flex-1 overflow-y-auto custom-scrollbar p-8 bg-black/20">
                                      {sidePanelTab === 'episodes' ? (
                                          <div className="flex flex-col gap-8">
                                              {episodes.length > EP_PER_PAGE && (
                                                  <div className="flex gap-3 overflow-x-auto no-scrollbar pb-3">
                                                      {Array.from({ length: Math.ceil(episodes.length / EP_PER_PAGE) }).map((_, i) => (
                                                          <button key={i} onClick={() => setEpPage(i)} className={`flex-shrink-0 px-6 py-3 rounded-2xl text-[10px] font-black border transition-all ${epPage === i ? 'bg-brand border-brand text-black shadow-lg shadow-brand/20' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'}`}>{i * EP_PER_PAGE + 1} - {Math.min((i + 1) * EP_PER_PAGE, episodes.length)}</button>
                                                      ))}
                                                  </div>
                                              )}
                                              <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-4 gap-4">
                                                  {episodes.slice(epPage * EP_PER_PAGE, (epPage + 1) * EP_PER_PAGE).map((ep) => (
                                                      <button key={ep.index} onClick={() => setCurrentEpisodeIndex(ep.index)} className={`h-12 rounded-2xl border text-[11px] font-black transition-all flex items-center justify-center shadow-lg group/ep ${currentEpisodeIndex === ep.index ? 'bg-brand text-black border-brand shadow-[0_10px_30px_rgba(34,197,94,0.4)] scale-110 z-10' : 'bg-white/5 text-gray-400 border-white/5 hover:text-brand hover:border-brand/40'}`}>{ep.index + 1}</button>
                                                  ))}
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="space-y-5">
                                              {availableSources.map((source, idx) => (
                                                  <button key={idx} onClick={() => { setCurrentSourceIndex(idx); setEpisodes(source.episodes); setSidePanelTab('episodes'); }} className={`w-full text-left p-6 rounded-[2rem] border transition-all flex justify-between items-center group/src ${currentSourceIndex === idx ? 'bg-brand/10 border-brand/50 text-brand shadow-2xl' : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10 hover:border-white/20'}`}>
                                                      <div className="min-w-0">
                                                          <div className={`font-black text-lg mb-1 truncate ${currentSourceIndex === idx ? 'text-brand' : 'text-gray-300'}`}>{source.name}</div>
                                                          <div className="text-[10px] font-bold opacity-50 uppercase tracking-widest">{source.episodes.length} 集内容</div>
                                                      </div>
                                                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${currentSourceIndex === idx ? 'bg-brand text-black shadow-brand/40' : 'bg-white/5 text-gray-700'}`}><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg></div>
                                                  </button>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                                  <div className="p-4 bg-black/40 text-center border-t border-white/5"><span className="text-[9px] font-black text-brand/40 uppercase tracking-[0.3em] animate-pulse">P2P 加速已开启</span></div>
                              </div>
                          )}
                      </div>
                      <MovieInfoCard movie={currentMovie} onSearch={triggerSearch} />
                  </section>
              )}

              {activeTab === 'home' && !currentMovie && (
                  <div className="animate-fade-in">
                      <HeroBanner items={heroItems} onPlay={handleItemClick} />
                      {watchHistory.length > 0 && <HorizontalSection title="继续观看" items={watchHistory} id="history" onItemClick={handleItemClick} />}
                      <HorizontalSection title="热门电影" items={homeSections.movies} id="movies" onItemClick={handleItemClick} />
                      <HorizontalSection title="热播剧集" items={homeSections.series} id="series" onItemClick={handleItemClick} />
                      <HorizontalSection title="人气动漫" items={homeSections.anime} id="anime" onItemClick={handleItemClick} />
                      <HorizontalSection title="综艺大咖" items={homeSections.variety} id="variety" onItemClick={handleItemClick} />
                  </div>
              )}

              {activeTab === 'search' && !currentMovie && (
                  <div className="animate-fade-in max-w-6xl mx-auto py-6 lg:py-10">
                      <div className="flex gap-4 mb-12">
                          <form onSubmit={(e) => { e.preventDefault(); triggerSearch(searchQuery); }} className="relative flex-1 group">
                              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 text-gray-500 group-focus-within:text-brand transition-colors"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg></div>
                              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索影片、导演、演员..." className="w-full bg-[#0f111a] border border-white/10 rounded-[1.5rem] py-5 pl-16 pr-8 text-white text-lg focus:outline-none focus:border-brand/60 focus:ring-4 focus:ring-brand/5 shadow-2xl transition-all font-bold placeholder:text-gray-600" />
                          </form>
                          <button onClick={() => triggerSearch(searchQuery)} className="bg-brand hover:bg-brand-hover text-black font-black px-12 rounded-[1.5rem] transition-all active:scale-95 shadow-[0_20px_40px_rgba(34,197,94,0.3)] text-lg">搜索</button>
                      </div>
                      <div className="min-h-[400px]">
                          {loading ? (
                              <div className="flex flex-col items-center justify-center py-40 gap-6">
                                  <div className="animate-spin h-16 w-16 border-[6px] border-brand border-t-transparent rounded-full shadow-[0_0_30px_rgba(34,197,94,0.2)]"></div>
                                  <p className="text-brand font-black tracking-widest animate-pulse">正在穿透资源库...</p>
                              </div>
                          ) : (
                              <>
                                  {searchResults.length > 0 ? (
                                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 lg:gap-8">
                                          {searchResults.map((item) => (
                                              <div key={`${item.vod_id}-${item.source}`} onClick={() => handleItemClick(item)} className="group cursor-pointer bg-[#0f111a] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden aspect-[2/3] relative border border-white/5 hover:border-brand/60 transition-all duration-500 shadow-3xl hover:-translate-y-3 ring-1 ring-white/10">
                                                  <ImageWithFallback src={item.vod_pic || ''} alt={item.vod_name} searchKeyword={item.vod_name} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/85 to-transparent p-4 lg:p-6 pt-20">
                                                      <h4 className="text-sm lg:text-lg font-black text-white truncate group-hover:text-brand transition-colors mb-2">{item.vod_name}</h4>
                                                      <div className="flex justify-between items-center text-[10px] lg:text-xs font-black text-gray-500 uppercase tracking-tighter">
                                                          <span className="flex items-center gap-1"><span className="text-brand">●</span> {item.vod_year || '2025'}</span>
                                                          <span className="bg-white/10 px-2 py-0.5 rounded-md border border-white/5">{item.type_name || '影片'}</span>
                                                      </div>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                      hasSearched && (
                                          <div className="flex flex-col items-center justify-center py-40 text-center space-y-4">
                                              <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-gray-700 mb-4"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 0 1-6.364 0M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75s.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75Zm-.375 0h.008v.015h-.008V9.75Z" /></svg></div>
                                              <p className="text-gray-400 font-black text-2xl tracking-tight">未能在次元中捕获相关内容</p>
                                              <p className="text-gray-600 font-bold">试试换个关键词，或者去主页逛逛</p>
                                          </div>
                                      )
                                  )}
                              </>
                          )}
                      </div>
                  </div>
              )}

              {['movies', 'series', 'anime', 'variety'].includes(activeTab) && !currentMovie && (
                  <CategoryPage category={activeTab as any} onPlay={handleItemClick} />
              )}
          </div>
          <MobileNav />
          <Suspense fallback={null}><GeminiChat currentMovie={currentMovie} /></Suspense>
          <Suspense fallback={null}><SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} /></Suspense>
      </div>
  );
};

export default App;