

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getHomeSections, searchMovies, getMovieDetail, parseEpisodes, enrichVodDetail, fetchDoubanData, fetchCategoryItems } from './services/vodService';
import VideoPlayer from './components/VideoPlayer';
import MovieInfoCard from './components/MovieInfoCard';
import GeminiChat from './components/GeminiChat';
import ImageWithFallback from './components/ImageWithFallback';
import { VodItem, VodDetail, Episode } from './types';

// Icons
const NavIcons = {
    Home: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
    Search: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
    Movie: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5M4.875 8.25C5.496 8.25 6 8.754 6 9.375v1.5m0-5.25v5.25m0-5.25C6 5.004 5.496 4.5 4.875 4.5M6 9.375c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125V8.625c0-.621-.504-1.125-1.125-1.125h-1.5M6 9.375v5.25m0-5.25C6 8.754 5.496 8.25 4.875 8.25M6 14.625c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125v-2.25c0-.621-.504-1.125-1.125-1.125h-1.5M6 14.625v3.75m0-3.75C6 14.004 5.496 13.5 4.875 13.5M6 18.375c0 .621.504 1.125 1.125 1.125h1.5c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125h-1.5" /></svg>,
    Series: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" /></svg>,
    Anime: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>,
    Variety: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
};

// React Declaration at top level to avoid TDZ issues in some bundlers/environments
const ReactRef = React;

// Helper to remove spaces and punctuation for comparison
const normalizeTitle = (str: string) => {
    return str.replace(/\s+/g, '').replace(/[：:,.，。!！?？]/g, '').toLowerCase();
};

const NavBar = ({ activeTab, onTabChange }: { activeTab: string, onTabChange: (tab: string) => void }) => {
    const navItems = [
        { id: 'home', label: '首页', icon: NavIcons.Home },
        { id: 'movies', label: '电影', icon: NavIcons.Movie },
        { id: 'series', label: '剧集', icon: NavIcons.Series },
        { id: 'anime', label: '动漫', icon: NavIcons.Anime },
        { id: 'variety', label: '综艺', icon: NavIcons.Variety },
        { id: 'search', label: '搜索', icon: NavIcons.Search },
    ];

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
            <div className="container mx-auto px-4 max-w-[1400px]">
                <div className="flex items-center justify-between h-16 relative">
                    <div className="flex items-center gap-2 cursor-pointer z-20" onClick={() => onTabChange('home')}>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand to-cyan-400">
                            CineStream
                        </span>
                    </div>

                    <div className="hidden lg:flex items-center gap-1 absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2">
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

                    <div className="lg:hidden flex items-center gap-4 overflow-x-auto no-scrollbar w-full ml-4 mask-linear-fade">
                         {navItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => onTabChange(item.id)}
                                className={`flex flex-col items-center justify-center min-w-[3rem] gap-1 text-[10px] font-medium transition-colors ${
                                    activeTab === item.id ? 'text-brand' : 'text-gray-400'
                                }`}
                            >
                                <div className={`${activeTab === item.id ? 'bg-brand/10 p-1.5 rounded-lg' : 'p-1.5'}`}>
                                    {React.cloneElement(item.icon, { className: 'w-5 h-5' })}
                                </div>
                                <span className="whitespace-nowrap">{item.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
};

const HeroBanner = ({ items, onPlay }: { items: VodItem[], onPlay: (item: VodItem) => void }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [detail, setDetail] = useState<any>(null);
    const [isFading, setIsFading] = useState(false);

    const currentItem = items[currentIndex];

    useEffect(() => {
        if (items.length === 0) return;
        const timer = setInterval(() => {
            setIsFading(true);
            setTimeout(() => {
                setCurrentIndex((prev) => (prev + 1) % items.length);
                setIsFading(false);
            }, 600);
        }, 8000);
        return () => clearInterval(timer);
    }, [items.length]);

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

    if (!currentItem) return null;

    const displayPoster = detail?.wallpaper || detail?.pic || currentItem.vod_pic;
    const posterUrl = detail?.pic || currentItem.vod_pic;

    return (
        <div className="relative w-full h-[40vh] md:h-[50vh] lg:h-[55vh] rounded-3xl overflow-hidden mb-12 shadow-2xl border border-white/5 group mt-8 flex justify-center items-center">
            <div className={`absolute inset-0 transition-opacity duration-700 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                <ImageWithFallback 
                    src={displayPoster}
                    searchKeyword={currentItem.vod_name}
                    className="w-full h-full object-cover object-top opacity-100 transition-transform duration-[10s] ease-linear group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/50 to-transparent"></div>
                <div className="absolute inset-0 bg-gradient-to-r from-[#020617] via-[#020617]/70 to-transparent"></div>
            </div>

            <div className={`absolute inset-0 z-10 flex items-end md:items-center justify-center p-6 md:p-12 lg:p-16 transition-opacity duration-700 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                <div className="flex items-center gap-8 lg:gap-12 w-full max-w-6xl mx-auto justify-center">
                    
                    <div className="hidden md:block w-48 lg:w-60 flex-shrink-0 aspect-[2/3] rounded-xl overflow-hidden shadow-2xl border-2 border-white/10 transform -rotate-2 hover:rotate-0 transition-all duration-500 z-20 bg-gray-900">
                         <ImageWithFallback 
                            src={posterUrl}
                            searchKeyword={currentItem.vod_name}
                            className="w-full h-full object-cover"
                        />
                    </div>

                    <div className="flex-1 flex flex-col gap-4 md:gap-6 pb-8 md:pb-0 items-start">
                        <div className="flex items-center gap-3">
                            <span className="bg-brand text-black text-xs font-bold px-2 py-0.5 rounded shadow-lg shadow-brand/20">Featured</span>
                            {currentItem.vod_year && <span className="text-gray-200 text-sm font-medium border border-white/20 px-2 rounded bg-black/40 backdrop-blur-sm">{currentItem.vod_year}</span>}
                            {(currentItem.vod_score || detail?.score) && <span className="text-yellow-400 text-sm font-bold flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded">★ {detail?.score || currentItem.vod_score}</span>}
                            <span className="bg-white/20 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] text-gray-200">{currentItem.type_name}</span>
                        </div>

                        <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white tracking-tight leading-none drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                            {currentItem.vod_name}
                        </h1>

                        <p className="text-gray-100 text-sm md:text-lg leading-relaxed line-clamp-3 md:line-clamp-4 max-w-2xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-medium">
                            {detail?.content || '暂无简介...'}
                        </p>

                        <div className="flex items-center gap-4 pt-4">
                            <button 
                                onClick={() => onPlay(currentItem)}
                                className="bg-brand hover:bg-brand-hover text-black font-bold py-3 px-8 rounded-xl flex items-center gap-2 transition-all hover:scale-105 shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                                    <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
                                </svg>
                                立即播放
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="absolute bottom-6 right-6 flex gap-2 z-20">
                {items.map((_, idx) => (
                    <button
                        key={idx}
                        onClick={() => {
                            setIsFading(true);
                            setTimeout(() => {
                                setCurrentIndex(idx);
                                setIsFading(false);
                            }, 600);
                        }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentIndex ? 'w-6 bg-brand' : 'w-2 bg-white/50 hover:bg-white/80'}`}
                    />
                ))}
            </div>
        </div>
    );
};

const HorizontalSection = ({ title, items, id, onItemClick }: { 
    title: string, 
    items: VodItem[], 
    id: string, 
    onItemClick: (item: VodItem) => void
}) => {
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
      <div className="mb-10 relative group">
          <h3 className="text-xl font-bold text-white mb-4 pl-2 border-l-4 border-brand flex items-center gap-2">
              {title} <span className="text-xs text-gray-500 font-normal ml-2">HOT</span>
          </h3>
          
          <button onClick={() => scroll('left')} className="absolute left-0 top-1/2 z-20 bg-black/60 hover:bg-brand text-white w-10 h-10 rounded-full backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl hidden md:flex items-center justify-center -ml-5 hover:scale-110 translate-y-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>
          <button onClick={() => scroll('right')} className="absolute right-0 top-1/2 z-20 bg-black/60 hover:bg-brand text-white w-10 h-10 rounded-full backdrop-blur-md border border-white/10 opacity-0 group-hover:opacity-100 transition-all duration-300 shadow-xl hidden md:flex items-center justify-center -mr-5 hover:scale-110 translate-y-2">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>

          <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-4 no-scrollbar scroll-smooth px-1">
              {items.map((item) => (
                  <div key={item.vod_id} onClick={() => onItemClick(item)} className="flex-shrink-0 w-36 md:w-44 cursor-pointer group relative">
                      <div className="aspect-[2/3] rounded-xl overflow-hidden bg-gray-900 border border-white/10 relative shadow-lg group-hover:shadow-brand/20 transition-all duration-300 group-hover:-translate-y-1">
                           <ImageWithFallback src={item.vod_pic || ''} alt={item.vod_name || 'Poster'} searchKeyword={item.vod_name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                          {item.vod_score && (
                              <div className="absolute top-1.5 right-1.5 bg-black/70 backdrop-blur text-yellow-400 text-xs font-bold px-1.5 py-0.5 rounded border border-white/10">{item.vod_score}</div>
                          )}
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent p-3 pt-10">
                              <h4 className="text-sm font-bold text-white truncate group-hover:text-brand transition-colors">{item.vod_name}</h4>
                          </div>
                      </div>
                  </div>
              ))}
          </div>
      </div>
    );
};

// Filter Configuration
const FILTER_CONFIG: any = {
    movies: {
        title: '电影',
        row1: { label: '分类', options: ['全部', '热门电影', '最新电影', '豆瓣高分', '冷门佳片'] },
        row2: { label: '地区', options: ['全部', '华语', '欧美', '韩国', '日本'] }
    },
    series: {
        title: '电视剧',
        desc: '来自豆瓣的精选内容',
        row1: { label: '分类', options: ['全部', '最近热门'] },
        row2: { label: '类型', options: ['全部', '国产', '欧美', '日本', '韩国', '动漫', '纪录片'] }
    },
    anime: {
        title: '动漫',
        desc: '来自 Bangumi 番组计划的精选内容',
        row1: { label: '分类', options: ['每日放送', '番剧', '剧场版'] },
        row2: { label: '星期', options: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] }
    },
    variety: {
        title: '综艺',
        desc: '来自豆瓣的精选内容',
        row1: { label: '分类', options: ['全部', '最近热门'] },
        row2: { label: '类型', options: ['全部', '大陆', '日本', '韩国', '欧美', '港台'] }
    }
};

const FilterSection = ({ 
    config, 
    filter1, 
    filter2, 
    onFilter1Change, 
    onFilter2Change 
}: { 
    config: any, 
    filter1: string, 
    filter2: string, 
    onFilter1Change: (val: string) => void, 
    onFilter2Change: (val: string) => void 
}) => {
    if (!config) return null;

    return (
        <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">{config.title}</h2>
            {config.desc && <p className="text-gray-400 text-sm mb-6">{config.desc}</p>}
            
            <div className="bg-[#121620] border border-white/5 rounded-2xl p-4 md:p-6 shadow-xl backdrop-blur-sm">
                {/* Row 1 */}
                <div className="flex items-center gap-4 mb-4 overflow-x-auto no-scrollbar pb-1">
                    <span className="text-gray-400 text-sm font-medium whitespace-nowrap min-w-[3rem]">{config.row1.label}</span>
                    <div className="flex gap-2">
                        {config.row1.options.map((opt: string) => (
                            <button
                                key={opt}
                                onClick={() => onFilter1Change(opt)}
                                className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
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

                {/* Row 2 */}
                <div className="flex items-center gap-4 overflow-x-auto no-scrollbar pb-1">
                    <span className="text-gray-400 text-sm font-medium whitespace-nowrap min-w-[3rem]">{config.row2.label}</span>
                    <div className="flex gap-2">
                        {config.row2.options.map((opt: string) => (
                            <button
                                key={opt}
                                onClick={() => onFilter2Change(opt)}
                                className={`px-4 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
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

// Helper to get current weekday in string format
const getCurrentWeekday = () => {
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[new Date().getDay()];
};

// New Component for Category Pages
const CategoryGrid = ({ category, onItemClick }: { category: string, onItemClick: (item: VodItem) => void }) => {
    const [items, setItems] = useState<VodItem[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Filter States
    const config = FILTER_CONFIG[category];
    const [filter1, setFilter1] = useState(config?.row1.options[0] || '全部');
    
    // Auto-set Weekday for Anime category
    const [filter2, setFilter2] = useState(() => {
        if (category === 'anime' && config?.row2.label === '星期') {
            return getCurrentWeekday();
        }
        return config?.row2.options[0] || '全部';
    });

    // Reset filters when category changes
    useEffect(() => {
        if (config) {
            setFilter1(config.row1.options[0]);
            
            if (category === 'anime' && config.row2.label === '星期') {
                setFilter2(getCurrentWeekday());
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                    {items.map((item) => (
                        <div key={item.vod_id} onClick={() => onItemClick(item)} className="group cursor-pointer relative bg-gray-900 rounded-lg overflow-hidden aspect-[2/3] ring-1 ring-white/5 hover:ring-brand hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all duration-300 hover:-translate-y-1">
                            <ImageWithFallback src={item.vod_pic || ''} alt={item.vod_name || 'Poster'} searchKeyword={item.vod_name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute top-0 right-0 p-1.5 z-10">
                                {item.vod_score && <span className="bg-black/60 backdrop-blur-md text-[10px] text-yellow-400 px-1.5 py-0.5 rounded border border-white/10 shadow-lg font-bold">★ {item.vod_score}</span>}
                            </div>
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-12">
                                <h4 className="text-sm font-bold text-white truncate group-hover:text-brand transition-colors">{item.vod_name}</h4>
                                <div className="flex justify-between items-center mt-1.5 text-[10px] text-gray-400 font-medium">
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

const App: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<VodItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [currentMovie, setCurrentMovie] = useState<VodDetail | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSidePanel, setShowSidePanel] = useState(true);
  const [activeTab, setActiveTab] = useState('home');
  const resultsRef = useRef<HTMLDivElement>(null);
  
  // Home Page Sections State
  const [homeSections, setHomeSections] = useState<{
      movies: VodItem[];
      series: VodItem[];
      shortDrama: VodItem[];
      anime: VodItem[];
      variety: VodItem[];
  }>({ movies: [], series: [], shortDrama: [], anime: [], variety: [] });

  const [heroItems, setHeroItems] = useState<VodItem[]>([]);

  // Initial load
  useEffect(() => {
      const fetchInitial = async () => {
           setLoading(true);
           try {
               const sections = await getHomeSections();
               setHomeSections(sections);
               const allItems = [ ...sections.movies, ...sections.series, ...sections.anime, ...sections.variety ];
               const shuffled = allItems.sort(() => 0.5 - Math.random());
               setHeroItems(shuffled.slice(0, 10));
           } catch(e) { console.error(e); } 
           finally { setLoading(false); }
      };
      fetchInitial();
  }, []);

  const triggerSearch = async (query: string) => {
      if(!query.trim()) return;
      setSearchQuery(query);
      setLoading(true);
      setHasSearched(true);
      setCurrentMovie(null);
      setActiveTab('search');
      
      try {
          const data = await searchMovies(query);
          setSearchResults((data.list || []) as VodItem[]);
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
      if (item.source === 'douban') {
          setLoading(true);
          try {
              const doubanDetail = await fetchDoubanData(item.vod_name, item.vod_id);
              
              // Smart Search Strategy:
              // 1. Original Name
              // 2. Name without spaces (e.g. "绝命毒师 第五季" -> "绝命毒师第五季")
              // 3. Name stripped of season info to find broad matches (e.g. "绝命毒师")
              const searchQueries = new Set<string>();
              searchQueries.add(item.vod_name);
              searchQueries.add(item.vod_name.replace(/\s+/g, ''));
              
              // Remove "第N季", "Season N", etc. for broad search fallback
              const cleanName = item.vod_name.split(/第|Season/)[0].trim();
              if (cleanName && cleanName.length > 1 && cleanName !== item.vod_name) {
                  searchQueries.add(cleanName);
              }

              let bestMatch: VodItem | null = null;
              let list: VodItem[] = [];

              // Execute searches sequentially until we find something
              for (const query of Array.from(searchQueries)) {
                  const searchRes = await searchMovies(query);
                  if (searchRes.list && searchRes.list.length > 0) {
                      list = searchRes.list as VodItem[];
                      break;
                  }
              }
              
              if (list.length > 0) {
                  const targetNameNorm = normalizeTitle(item.vod_name);
                  
                  // Scoring system to find the best match in the list
                  let maxScore = -1;
                  
                  for (const cand of list) {
                      let score = 0;
                      const candNameNorm = normalizeTitle(cand.vod_name);

                      // Exact normalized match (ignoring spaces/punctuation)
                      if (candNameNorm === targetNameNorm) score += 100;
                      // Substring match
                      else if (candNameNorm.includes(targetNameNorm) || targetNameNorm.includes(candNameNorm)) score += 50;

                      // Year match (Douban year vs CMS year)
                      if (doubanDetail?.year && cand.vod_year) {
                          const y1 = parseInt(doubanDetail.year);
                          const y2 = parseInt(cand.vod_year);
                          if (!isNaN(y1) && !isNaN(y2) && Math.abs(y1 - y2) <= 1) {
                              score += 20;
                          }
                      }
                      
                      // Prefer items with "Season" info if original had it
                      if (item.vod_name.match(/第.+季|Season/)) {
                           // If candidate also has number/season info that matches
                           // Simple heuristic: If original ends in "5", candidate should contain "5"
                           const seasonNum = item.vod_name.match(/(\d+|[一二三四五六七八九十]+)/g)?.pop();
                           if (seasonNum && cand.vod_name.includes(seasonNum)) {
                               score += 10;
                           }
                      }

                      if (score > maxScore) {
                          maxScore = score;
                          bestMatch = cand;
                      }
                  }

                  if (bestMatch) {
                      await handleSelectMovie(bestMatch.vod_id as number);
                      
                      // Merge Douban metadata into the CMS item for display
                      setCurrentMovie(prev => {
                          if (prev) {
                              return {
                                  ...prev,
                                  vod_pic: doubanDetail?.pic || item.vod_pic || prev.vod_pic,
                                  vod_score: doubanDetail?.score || item.vod_score || prev.vod_score,
                                  vod_year: doubanDetail?.year || item.vod_year || prev.vod_year,
                                  vod_director: doubanDetail?.director || prev.vod_director,
                                  vod_actor: doubanDetail?.actor || prev.vod_actor,
                              };
                          }
                          return prev;
                      });
                  } else {
                      // Fallback: If we found a list but no good match, just show search results
                      triggerSearch(item.vod_name);
                  }

              } else {
                  // No results found in CMS for any variation
                  triggerSearch(item.vod_name);
              }
          } catch (e) {
              triggerSearch(item.vod_name);
          } finally {
              setLoading(false);
          }
      } else {
          handleSelectMovie(item.vod_id as number);
      }
  };

  const handleSelectMovie = async (id: number) => {
      setLoading(true);
      setShowSidePanel(true);
      try {
          const detail = await getMovieDetail(id);
          if (detail) {
              const parsedEps = parseEpisodes(detail.vod_play_url, detail.vod_play_from);
              if (parsedEps.length > 0) {
                  setCurrentMovie(detail);
                  setEpisodes(parsedEps);
                  setCurrentEpisodeIndex(0);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  enrichVodDetail(detail).then(updates => {
                      if (updates) {
                          setCurrentMovie(prev => {
                              if (prev && prev.vod_id === detail.vod_id) return { ...prev, ...updates };
                              return prev;
                          });
                      }
                  });
              } else {
                  alert("暂无有效的播放源 (M3U8)");
              }
          }
      } catch (error) {
          alert("获取详情失败");
      } finally {
          setLoading(false);
      }
  };

  const currentEpUrl = useMemo(() => {
      if (currentEpisodeIndex >= 0 && episodes[currentEpisodeIndex]) {
          return episodes[currentEpisodeIndex].url;
      }
      return '';
  }, [currentEpisodeIndex, episodes]);

  const handleTabChange = (tab: string) => {
      setActiveTab(tab);
      setCurrentMovie(null);
      setHasSearched(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleEpisodeEnd = useCallback(() => {
    if(currentEpisodeIndex < episodes.length - 1) setCurrentEpisodeIndex(prev => prev + 1);
  }, [currentEpisodeIndex, episodes.length]);

  const handleNextEpisode = useCallback(() => {
    if(currentEpisodeIndex < episodes.length - 1) setCurrentEpisodeIndex(prev => prev + 1);
  }, [currentEpisodeIndex, episodes.length]);

  return (
      <div className="relative min-h-screen pb-20 overflow-x-hidden font-sans pt-16">
          <NavBar activeTab={activeTab} onTabChange={handleTabChange} />

          {/* Global Loading Overlay */}
          {loading && currentMovie === null && !hasSearched && (
               <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
                   <div className="animate-spin h-12 w-12 border-4 border-brand border-t-transparent rounded-full mb-4"></div>
                   <div className="text-brand font-bold tracking-widest text-lg">LOADING</div>
               </div>
          )}

          <div className="relative z-10 container mx-auto px-4 lg:px-6 py-6 max-w-[1400px]">
              
              {currentMovie && (
                  <section className="mb-12 animate-fade-in space-y-6 mt-4">
                      <button onClick={() => setCurrentMovie(null)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-4">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" /></svg>
                          返回
                      </button>
                      
                      <div className="flex flex-col lg:flex-row gap-6 items-start h-auto relative transition-all duration-300">
                          <div className={`flex-1 w-full bg-black rounded-xl overflow-hidden border border-white/5 shadow-2xl lg:h-[500px] relative group transition-all duration-300`}>
                              <VideoPlayer 
                                  url={currentEpUrl} 
                                  poster={currentMovie.vod_pic}
                                  onEnded={handleEpisodeEnd}
                                  onNext={handleNextEpisode}
                              />
                              {!showSidePanel && (
                                  <button onClick={() => setShowSidePanel(true)} className="absolute top-4 right-4 z-20 bg-black/60 backdrop-blur-md text-white/90 border border-white/10 rounded-lg px-3 py-1.5 text-xs flex items-center gap-2 hover:bg-brand/20 hover:border-brand/30 hover:text-brand transition-all shadow-lg opacity-0 group-hover:opacity-100">
                                      显示选集
                                  </button>
                              )}
                          </div>

                          {showSidePanel && (
                              <div className="w-full lg:w-[350px] bg-[#121212] border border-white/5 rounded-xl overflow-hidden flex flex-col h-[400px] lg:h-[500px] animate-fade-in flex-shrink-0">
                                  <div className="p-4 border-b border-white/5 bg-gray-800/50 flex justify-between items-center">
                                      <h3 className="font-bold text-white">选集 ({episodes.length})</h3>
                                      <button onClick={() => setShowSidePanel(false)} className="text-gray-400 hover:text-white p-1 hover:bg-white/10 rounded transition-colors">
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M11.25 4.5l7.5 7.5-7.5 7.5m-6-15l7.5 7.5-7.5 7.5" /></svg>
                                      </button>
                                  </div>
                                  <div className="p-3 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                                      <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2">
                                          {episodes.map((ep) => (
                                              <button key={ep.index} onClick={() => setCurrentEpisodeIndex(ep.index)} className={`h-9 text-xs rounded transition-all duration-200 border truncate font-medium ${currentEpisodeIndex === ep.index ? 'bg-brand text-black border-brand shadow-[0_0_10px_rgba(34,197,94,0.3)]' : 'bg-gray-800 text-gray-400 border-transparent hover:bg-gray-700 hover:text-white'}`}>
                                                  {ep.title.replace(/第|集/g, '')}
                                              </button>
                                          ))}
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
                             {/* Search Bar only visible in Search Tab */}
                            <div className="w-full max-w-3xl mx-auto mb-8 mt-2">
                                    <form onSubmit={handleSearch} className="relative group">
                                        <div className="absolute -inset-0.5 bg-gradient-to-r from-brand to-cyan-500 rounded-full blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                                        <div className="relative flex items-center bg-gray-900 rounded-full p-1 ring-1 ring-white/10 shadow-2xl">
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="搜索电影、电视剧、动漫..."
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
                                <h3 className="text-xl font-bold text-white tracking-wide">搜索结果</h3>
                            </div>

                            {loading && searchResults.length === 0 ? (
                                <div className="flex justify-center py-20">
                                    <div className="animate-spin h-10 w-10 border-4 border-brand border-t-transparent rounded-full"></div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6">
                                    {searchResults.map((item) => (
                                        <div key={item.vod_id} onClick={() => handleItemClick(item)} className="group cursor-pointer relative bg-gray-900 rounded-lg overflow-hidden aspect-[2/3] ring-1 ring-white/5 hover:ring-brand hover:shadow-[0_0_20px_rgba(34,197,94,0.15)] transition-all duration-300 hover:-translate-y-1">
                                            <ImageWithFallback src={item.vod_pic || ''} alt={item.vod_name || 'Poster'} searchKeyword={item.vod_name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                            <div className="absolute top-0 right-0 p-1.5 z-10">
                                                <span className="bg-black/60 backdrop-blur-md text-[10px] text-white px-1.5 py-0.5 rounded border border-white/10 shadow-lg">{item.vod_remarks || '高清'}</span>
                                            </div>
                                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-3 pt-12">
                                                <h4 className="text-sm font-bold text-white truncate group-hover:text-brand transition-colors">{item.vod_name}</h4>
                                                <div className="flex justify-between items-center mt-1.5 text-[10px] text-gray-400 font-medium">
                                                    <span className="bg-white/10 px-1.5 py-0.5 rounded">{item.type_name || '影视'}</span>
                                                    <span>{item.vod_year}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                      ) : activeTab === 'home' ? (
                          <div className="space-y-4 animate-fade-in">
                               <HeroBanner items={heroItems} onPlay={handleItemClick} />
                              
                              {loading && heroItems.length === 0 && (
                                <div className="flex justify-center py-20">
                                    <div className="animate-spin h-10 w-10 border-4 border-brand border-t-transparent rounded-full"></div>
                                </div>
                              )}
                              
                              {!loading && (
                                <>
                                    <HorizontalSection id="movies" title="热门电影" items={homeSections.movies} onItemClick={handleItemClick} />
                                    <HorizontalSection id="series" title="热门剧集" items={homeSections.series} onItemClick={handleItemClick} />
                                    <HorizontalSection id="short" title="爆款短剧" items={homeSections.shortDrama} onItemClick={handleItemClick} />
                                    <HorizontalSection id="anime" title="新番放送" items={homeSections.anime} onItemClick={handleItemClick} />
                                    <HorizontalSection id="variety" title="热门综艺" items={homeSections.variety} onItemClick={handleItemClick} />
                                </>
                              )}
                          </div>
                      ) : (
                          // Render specific category page
                          <CategoryGrid category={activeTab} onItemClick={handleItemClick} />
                      )}
                  </div>
              )}
          </div>

          <GeminiChat currentMovie={currentMovie} />
      </div>
  );
};

export default App;
