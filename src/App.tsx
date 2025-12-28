
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

const CategoryPage = ({ category, onPlay }: { category: string, onPlay: (item: VodItem) => void }) => {
    const [items, setItems] = useState<VodItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [filter1, setFilter1] = useState('全部');
    const [filter2, setFilter2] = useState('全部');
    const [hasMore, setHasMore] = useState(true);
    const sentinelRef = useRef<HTMLDivElement>(null);

    const config = useMemo(() => {
        switch(category) {
            case 'movies': return { title: '电影', sub: '来自豆瓣的精选内容', f1: ['全部', '热门电影', '最新电影', '豆瓣高分', '冷门佳片'], f2Label: '地区', f2: ['全部', '华语', '欧美', '韩国', '日本'] };
            case 'series': return { title: '电视剧', sub: '来自豆瓣的精选内容', f1: ['全部', '最近热门'], f2Label: '类型', f2: ['全部', '国产', '欧美', '日本', '韩国', '动漫', '纪录片'] };
            case 'anime': return { title: '动漫', sub: '来自 Bangumi 番组计划的精选内容', f1: ['全部', '每日放送', '番剧', '剧场版'], f2Label: '星期', f2: ['全部', '周一', '周二', '周三', '周四', '周五', '周六', '周日'] };
            case 'variety': return { title: '综艺', sub: '来自豆瓣的精选内容', f1: ['全部', '最近热门'], f2Label: '类型', f2: ['全部', '国内', '国外'] };
            default: return { title: '频道', sub: '', f1: [], f2Label: '', f2: [] };
        }
    }, [category]);

    useEffect(() => {
        setItems([]); setPage(1); setHasMore(true); loadData(true, 1);
    }, [category, filter1, filter2]);

    const loadData = useCallback(async (reset = false, targetPage?: number) => {
        if (loading) return;
        setLoading(true);
        const curPage = targetPage || page;
        try {
            const res = await fetchCategoryItems(category, { filter1, filter2, page: curPage });
            if (reset) { setItems(res); setPage(2); } else { setItems(prev => [...prev, ...res]); setPage(prev => prev + 1); }
            setHasMore(res.length > 0 && res.length >= 18);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    }, [category, filter1, filter2, page, loading]);

    useEffect(() => {
        if (!hasMore || loading) return;
        const observer = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadData(); }, { threshold: 0.1, rootMargin: '400px' });
        if (sentinelRef.current) observer.observe(sentinelRef.current);
        return () => observer.disconnect();
    }, [hasMore, loading, loadData, items.length]);

    return (
        <div className="animate-fade-in space-y-8">
            <header className="px-1"><h1 className="text-3xl md:text-4xl font-black text-white mb-2">{config.title}</h1><p className="text-gray-500 font-bold">{config.sub}</p></header>
            <section className="bg-white/5 backdrop-blur-3xl border border-white/5 rounded-3xl p-6 md:p-8 space-y-6 ring-1 ring-white/10 shadow-3xl">
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar pb-1">
                    <span className="text-gray-500 font-bold text-sm flex-shrink-0">排序</span>
                    <div className="flex gap-2">{config.f1.map(f => (<button key={f} onClick={() => setFilter1(f)} className={`px-5 py-2 rounded-2xl text-sm font-black transition-all whitespace-nowrap ${filter1 === f ? 'bg-white/10 text-brand ring-1 ring-brand/40' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>{f}</button>))}</div>
                </div>
                <div className="flex items-center gap-6 overflow-x-auto no-scrollbar">
                    <span className="text-gray-500 font-bold text-sm flex-shrink-0">{config.f2Label}</span>
                    <div className="flex gap-2">{config.f2.map(f => (<button key={f} onClick={() => setFilter2(f)} className={`px-5 py-2 rounded-2xl text-sm font-black transition-all whitespace-nowrap ${filter2 === f ? 'bg-white/10 text-brand ring-1 ring-brand/40' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}>{f}</button>))}</div>
                </div>
            </section>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {items.map((item, idx) => (
                    <div key={`${item.vod_id}-${idx}`} onClick={() => onPlay(item)} className="group cursor-pointer bg-[#0f111a] rounded-2xl overflow-hidden aspect-[2/3] relative border border-white/5 hover:border-brand/60 transition-all duration-500 shadow-2xl hover:-translate-y-2 ring-1 ring-white/10 flex flex-col">
                        <ImageWithFallback src={item.vod_pic} alt={item.vod_name} searchKeyword={item.vod_name} size="m" className="w-full aspect-[2/3] object-cover transition-transform duration-1000 group-hover:scale-110" />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent p-4 pt-16 mt-auto">
                            <h4 className="text-sm font-black text-white line-clamp-1 group-hover:text-brand transition-colors">{item.vod_name}</h4>
                            <div className="flex justify-between items-center mt-2 text-[10px] font-black text-gray-500"><span>{item.vod_year || '2025'}</span><span className="text-brand">{item.vod_score || ''}</span></div>
                        </div>
                    </div>
                ))}
            </div>
            <div ref={sentinelRef} className="flex justify-center py-10 min-h-[100px]">
                {loading && <div className="animate-spin h-10 w-10 border-4 border-brand border-t-transparent rounded-full shadow-2xl"></div>}
            </div>
        </div>
    );
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<VodItem[]>([]);
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
  const [homeSections, setHomeSections] = useState<any>({});
  const [heroItems, setHeroItems] = useState<VodItem[]>([]);
  const [watchHistory, setWatchHistory] = useState<HistoryItem[]>([]);
  
  useEffect(() => { initVodSources(); setWatchHistory(getHistory()); }, []);
  useEffect(() => {
       getHomeSections().then(initialData => {
           if (initialData) {
               setHomeSections(initialData);
               const allItems = [ ...(initialData.movies || []), ...(initialData.series || []), ...(initialData.anime || []) ];
               setHeroItems(allItems.slice(0, 15));
           }
       });
  }, []);

  // 检测是否处于播放视图
  const isPlayView = location.pathname.startsWith('/play/');

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
                  setCurrentEpisodeIndex(savedIndex >= 0 && savedIndex < allSources[initialIndex].episodes.length ? savedIndex : 0);
                  addToHistory({ ...main, episode_index: currentEpisodeIndex, episode_name: episodes[currentEpisodeIndex]?.title || '', last_updated: Date.now() });
              }
          }
      } catch (error) {
          console.error("Load failed", error);
      } finally { setLoading(false); }
  };

  const handleItemClick = (item: VodItem) => {
      // 1. 立即设置 loading
      setLoading(true);
      // 2. 立即跳转，不等待接口
      navigate(`/play/${item.vod_id}`, { state: { apiUrl: item.api_url, vodName: item.vod_name } });
  };

  return (
      <div className="relative min-h-screen pb-24 lg:pb-16 overflow-x-hidden pt-14 lg:pt-20">
          <nav className="fixed top-0 left-0 right-0 z-50 bg-[#020617]/90 backdrop-blur-3xl border-b border-white/5 hidden lg:block">
                <div className="container mx-auto max-w-[1400px] flex items-center justify-between h-16 px-6">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}><span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-brand to-cyan-400">CineStream</span></div>
                    <div className="flex items-center gap-1">
                        {['home', 'movies', 'series', 'anime', 'variety', 'search'].map(id => (
                            <button key={id} onClick={() => navigate(TAB_TO_URL[id] || '/')} className={`px-5 py-2.5 rounded-full text-sm font-black transition-all ${activeTab === id ? 'bg-brand text-black shadow-2xl shadow-brand/20' : 'text-gray-400 hover:text-white'}`}>
                                {id.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-all">设置</button>
                </div>
          </nav>
          <Suspense fallback={null}><SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} /></Suspense>
          
          <div className="relative z-10 container mx-auto px-4 lg:px-10 py-4 max-w-[1600px]">
              {isPlayView && (
                  <section className="mb-12 animate-fade-in space-y-6">
                      <div className="flex flex-col lg:flex-row bg-[#0f111a] rounded-[1.5rem] lg:rounded-[2.5rem] overflow-hidden border border-white/5 shadow-3xl">
                          <div className={`flex-1 min-w-0 bg-black relative transition-all duration-700 z-10 ${!showSidePanel ? 'lg:h-[720px]' : 'lg:h-[500px] h-auto aspect-video'}`}>
                              {loading && !currentMovie ? (
                                  <div className="w-full h-full bg-slate-900 flex flex-col items-center justify-center gap-4 animate-pulse">
                                      <div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div>
                                      <span className="text-gray-500 font-black text-xs tracking-widest uppercase">资源深度检索中...</span>
                                  </div>
                              ) : (
                                  <Suspense fallback={<div className="w-full h-full bg-black flex items-center justify-center animate-pulse"><div className="w-12 h-12 border-4 border-brand border-t-transparent rounded-full animate-spin"></div></div>}>
                                      <VideoPlayer 
                                        url={currentMovie ? availableSources[currentSourceIndex]?.episodes[currentEpisodeIndex]?.url : ''} 
                                        poster={currentMovie?.vod_pic} 
                                        title={currentMovie?.vod_name} 
                                        episodeIndex={currentEpisodeIndex} 
                                        vodId={currentMovie?.vod_id} 
                                        onNext={() => currentEpisodeIndex < episodes.length - 1 && setCurrentEpisodeIndex(prev => prev + 1)} 
                                      />
                                  </Suspense>
                              )}
                          </div>
                          {showSidePanel && currentMovie && (
                              <div className="w-full lg:w-[380px] flex flex-col border-l border-white/10 bg-[#0f111a]/80 backdrop-blur-3xl h-[450px] lg:h-auto animate-fade-in">
                                  <div className="flex bg-black/20">
                                      <button onClick={() => setSidePanelTab('episodes')} className={`flex-1 py-4 text-xs font-black transition-all ${sidePanelTab === 'episodes' ? 'text-brand border-b-2 border-brand' : 'text-gray-500'}`}>选集</button>
                                      <button onClick={() => setSidePanelTab('sources')} className={`flex-1 py-4 text-xs font-black transition-all ${sidePanelTab === 'sources' ? 'text-brand border-b-2 border-brand' : 'text-gray-500'}`}>播放源</button>
                                  </div>
                                  <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                                      {sidePanelTab === 'episodes' ? ( 
                                          <div className="grid grid-cols-4 lg:grid-cols-4 gap-3">{episodes.map((ep) => ( 
                                              <button key={ep.index} onClick={() => setCurrentEpisodeIndex(ep.index)} className={`h-11 rounded-xl border text-[11px] font-black transition-all ${currentEpisodeIndex === ep.index ? 'bg-brand text-black border-brand' : 'bg-white/5 text-gray-400 border-white/5 hover:text-brand'}`}>{ep.title.replace('第', '').replace('集', '')}</button> ))}
                                          </div> 
                                      ) : ( 
                                          <div className="space-y-3">{availableSources.map((source, idx) => ( 
                                              <button key={idx} onClick={() => { setCurrentSourceIndex(idx); setEpisodes(source.episodes); setSidePanelTab('episodes'); }} className={`w-full text-left p-4 rounded-2xl border transition-all ${currentSourceIndex === idx ? 'bg-brand/10 border-brand/40 text-brand' : 'bg-white/5 border-white/5 text-gray-400'}`}>
                                                  <div className="font-black text-xs truncate">{source.name}</div>
                                              </button> ))}
                                          </div> 
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>
                      {currentMovie && <MovieInfoCard movie={currentMovie} />}
                      <Suspense fallback={null}><GeminiChat currentMovie={currentMovie} /></Suspense>
                  </section>
              )}

              {activeTab === 'home' && !isPlayView && (
                  <div className="space-y-4">
                      {['movies', 'series', 'variety', 'anime'].map(cat => (
                        <div key={cat} className="mb-10">
                            <h3 className="text-2xl font-black text-white mb-5 border-l-4 border-brand pl-4 tracking-tight uppercase">{cat}</h3>
                            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 no-scrollbar snap-x">
                                {(homeSections[cat] || []).map((item: any, i: number) => (
                                    <div key={i} onClick={() => handleItemClick(item)} className="flex-shrink-0 w-[140px] md:w-[190px] cursor-pointer snap-start group">
                                        <div className="aspect-[2/3] rounded-xl overflow-hidden relative border border-white/5 group-hover:border-brand/50 transition-all">
                                            <ImageWithFallback src={item.vod_pic} alt={item.vod_name} size="m" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                            <div className="absolute top-2 right-2 bg-black/60 px-2 py-0.5 rounded text-[10px] font-bold">{item.vod_remarks}</div>
                                        </div>
                                        <h4 className="mt-3 text-sm font-bold truncate group-hover:text-brand">{item.vod_name}</h4>
                                    </div>
                                ))}
                            </div>
                        </div>
                      ))}
                  </div>
              )}

              {['movies', 'series', 'anime', 'variety'].includes(activeTab) && !isPlayView && <CategoryPage category={activeTab} onPlay={handleItemClick} />}
          </div>
      </div>
  );
};

export default App;
