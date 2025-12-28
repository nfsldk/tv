import React, { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getHomeSections, getHomeSectionsCached, searchCms, getAggregatedSearch, getAggregatedMovieDetail, parseAllSources, enrichVodDetail, fetchDoubanData, fetchCategoryItems, getHistory, addToHistory, removeFromHistory, fetchPersonDetail, initVodSources } from './services/vodService';
import MovieInfoCard from './components/MovieInfoCard';
import ImageWithFallback from './components/ImageWithFallback';
import { VodItem, VodDetail, Episode, PlaySource, HistoryItem, PersonDetail } from './types';

const VideoPlayer = lazy(() => import('./components/VideoPlayer'));
const GeminiChat = lazy(() => import('./components/GeminiChat'));
const SettingsModal = lazy(() => import('./components/SettingsModal'));

const NavIcons = {
    Home: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" /></svg>,
    Search: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" /></svg>,
    Movie: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h1.5C5.496 19.5 6 18.996 6 18.375m-3.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125 1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-1.5A1.125 1.125 0 0118 18.375M20.625 4.5H3.375m17.25 0c.621 0 1.125.504 1.125 1.125M20.625 4.5h-1.5C18.504 4.5 18 5.004 18 5.625m3.75 0v1.5c0 .621-.504 1.125-1.125 1.125M3.375 4.5c-.621 0-1.125.504-1.125 1.125M3.375 4.5h1.5C5.496 4.5 6 5.004 6 5.625m-3.75 0v1.5c0 .621.504 1.125 1.125 1.125m0 0h1.5m-1.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m1.5-3.75C5.496 8.25 6 7.746 6 7.125v-1.5" /></svg>,
    Series: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125z" /></svg>,
    Anime: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" /></svg>,
    Variety: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>,
    Settings: <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 110-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 01-1.44-4.282m3.102.069a18.03 18.03 0 01-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 018.835 2.535M10.34 6.66a23.847 23.847 0 008.835-2.535m0 0A23.74 23.74 0 0018.795 3" /></svg>
};

const URL_TO_TAB: Record<string, string> = { '': 'home', 'dianying': 'movies', 'dianshiju': 'series', 'dongman': 'anime', 'zongyi': 'variety', 'sousuo': 'search' };
const TAB_TO_URL: Record<string, string> = { 'home': '/', 'movies': '/dianying', 'series': '/dianshiju', 'anime': '/dongman', 'variety': '/zongyi', 'search': '/sousuo' };

const HeroBanner = ({ items, onPlay }: { items: VodItem[], onPlay: (item: VodItem) => void }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [detail, setDetail] = useState<any>(null);
  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(() => setCurrentIndex(p => (p + 1) % items.length), 8000);
    return () => clearInterval(interval);
  }, [items.length]);
  useEffect(() => {
      if (items[currentIndex]) fetchDoubanData(items[currentIndex].vod_name, items[currentIndex].vod_id).then(res => setDetail(res));
  }, [currentIndex, items]);
  if (items.length === 0) return null;
  const activeItem = items[currentIndex];
  return (
    <div className="relative w-full h-[210px] md:h-[360px] rounded-2xl overflow-hidden mb-8 md:mb-12 shadow-2xl bg-[#0a0a0a] border border-white/5">
      <div className="absolute inset-0">
          <ImageWithFallback src={activeItem.vod_pic} alt={activeItem.vod_name} className="w-full h-full object-cover blur-md opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/80 to-transparent"></div>
      </div>
      <div className="absolute inset-0 z-10 flex items-center px-4 md:px-12">
        <div className="flex flex-row items-center gap-4 md:gap-10 w-full">
            <div className="flex-shrink-0 w-[90px] md:w-[160px] aspect-[2/3] rounded-lg overflow-hidden shadow-2xl border border-white/20">
                <ImageWithFallback src={activeItem.vod_pic} alt={activeItem.vod_name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 space-y-2">
                <h2 className="text-xl md:text-4xl font-black text-white">{activeItem.vod_name}</h2>
                <p className="text-gray-400 text-xs md:text-sm line-clamp-2">{detail?.content?.replace(/<[^>]+>/g, '') || activeItem.vod_remarks}</p>
                <button onClick={() => onPlay(activeItem)} className="bg-brand text-black font-bold px-6 py-2 rounded-full hover:scale-105 transition-all">播放</button>
            </div>
        </div>
      </div>
    </div>
  );
};

const HorizontalSection = ({ title, items, id, onItemClick }: { title: string, items: any[], id: string, onItemClick: (item: VodItem) => void }) => (
    <div className="mb-8" id={id}>
        <h3 className="text-xl font-bold text-white mb-4 border-l-4 border-brand pl-3">{title}</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
            {items.map((item, idx) => (
                <div key={idx} className="flex-shrink-0 w-[140px] md:w-[180px] cursor-pointer" onClick={() => onItemClick(item)}>
                    <div className="aspect-[2/3] rounded-lg overflow-hidden border border-white/5 bg-gray-900">
                        <ImageWithFallback src={item.vod_pic} alt={item.vod_name} className="w-full h-full object-cover" />
                    </div>
                    <h4 className="mt-2 text-sm text-gray-200 truncate">{item.vod_name}</h4>
                </div>
            ))}
        </div>
    </div>
);

const App: React.FC = () => {
  const navigate = useNavigate(), location = useLocation();
  const [loading, setLoading] = useState(false), [searchResults, setSearchResults] = useState<VodItem[]>([]), [currentMovie, setCurrentMovie] = useState<VodDetail | null>(null);
  const [availableSources, setAvailableSources] = useState<PlaySource[]>([]), [currentSourceIndex, setCurrentSourceIndex] = useState(0), [episodes, setEpisodes] = useState<Episode[]>([]), [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState(''), [activeTab, setActiveTab] = useState('home'), [showSettings, setShowSettings] = useState(false);
  const [homeSections, setHomeSections] = useState<any>({ movies: [], series: [], shortDrama: [], anime: [], variety: [] }), [heroItems, setHeroItems] = useState<VodItem[]>([]), [watchHistory, setWatchHistory] = useState<HistoryItem[]>([]);

  useEffect(() => { 
      initVodSources(); 
      setWatchHistory(getHistory());
      // 监听来自 index.html 的紧急设置打开请求
      const handleEmergency = () => setShowSettings(true);
      window.addEventListener('open-emergency-settings', handleEmergency);
      return () => window.removeEventListener('open-emergency-settings', handleEmergency);
  }, []);

  const fetchInitial = useCallback(async () => {
       const cached = getHomeSectionsCached();
       if (cached) {
           setHomeSections(cached);
           setHeroItems([...cached.movies, ...cached.series].sort(() => 0.5 - Math.random()).slice(0, 10));
       }
       setLoading(true);
       try {
           const sections = await getHomeSections(true);
           setHomeSections(sections);
           setHeroItems([...sections.movies, ...sections.series].sort(() => 0.5 - Math.random()).slice(0, 10));
       } catch(e) { 
           console.error("Initial fetch error:", e);
       } finally { 
           setLoading(false); 
           // 成功进入应用后，隐藏紧急图层
           const overlay = document.getElementById('fail-safe-overlay');
           if (overlay) overlay.style.display = 'none';
       }
  }, []);

  useEffect(() => { fetchInitial(); }, [fetchInitial]);

  useEffect(() => {
      const path = location.pathname.split('/')[1] || '';
      if (path === 'play') {
          const id = location.pathname.split('/')[2];
          if (id) handleSelectMovie(id);
      } else {
          setActiveTab(URL_TO_TAB[path] || 'home');
      }
  }, [location.pathname]);

  const handleSelectMovie = async (id: number | string, apiUrl?: string) => {
      setLoading(true);
      try {
          const res = await getAggregatedMovieDetail(id, apiUrl);
          if (res?.main) {
              const all = parseAllSources([res.main, ...res.alternatives]);
              if (all.length > 0) {
                  setAvailableSources(all); setCurrentSourceIndex(0); setEpisodes(all[0].episodes); setCurrentMovie(res.main);
                  setCurrentEpisodeIndex(0);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
              }
          }
      } catch (e) {} finally { setLoading(false); }
  };

  const handleItemClick = (item: VodItem) => {
      handleSelectMovie(item.vod_id, item.api_url);
      navigate(`/play/${item.vod_id}`);
  };

  const triggerSearch = async (q: string) => {
      if (!q.trim()) return;
      setSearchQuery(q); setLoading(true); setActiveTab('search'); navigate('/sousuo');
      try {
          const res = await getAggregatedSearch(q);
          setSearchResults(res);
      } catch (e) {} finally { setLoading(false); }
  };

  return (
      <div className="relative min-h-screen pb-20 pt-16">
          <nav className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-xl border-b border-white/5 h-16 flex items-center px-4">
              <div className="container mx-auto flex justify-between items-center max-w-[1400px]">
                  <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand to-cyan-400 cursor-pointer" onClick={() => navigate('/')}>CineStream</h1>
                  <div className="hidden md:flex gap-1">{[ {id: 'home', label: '首页'}, {id: 'movies', label: '电影'}, {id: 'series', label: '剧集'}, {id: 'anime', label: '动漫'}, {id: 'variety', label: '综艺'}, {id: 'search', label: '搜索'} ].map(i => <button key={i.id} onClick={() => navigate(TAB_TO_URL[i.id])} className={`px-4 py-2 rounded-full text-sm font-medium ${activeTab === i.id ? 'bg-white/10 text-brand' : 'text-gray-400'}`}>{i.label}</button>)}</div>
                  <button onClick={() => setShowSettings(true)} className="text-gray-400 hover:text-white">{NavIcons.Settings}</button>
              </div>
          </nav>

          <Suspense fallback={null}><SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} /></Suspense>

          {loading && !currentMovie && homeSections.movies.length === 0 && (
               <div className="fixed inset-0 z-40 bg-black flex flex-col items-center justify-center">
                   <div className="animate-spin h-10 w-10 border-4 border-brand border-t-transparent rounded-full mb-4"></div>
                   <p className="text-gray-500 text-sm">正在连接服务器...</p>
               </div>
          )}

          <div className="container mx-auto px-4 lg:px-6 max-w-[1400px]">
              {currentMovie && (
                  <section className="mt-4 animate-fade-in space-y-6">
                      <div className="bg-black rounded-xl overflow-hidden border border-white/5 h-[400px] md:h-[600px]">
                          <Suspense fallback={null}><VideoPlayer url={episodes[currentEpisodeIndex]?.url || ''} poster={currentMovie.vod_pic} onNext={() => setCurrentEpisodeIndex(p => p + 1)} /></Suspense>
                      </div>
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 overflow-y-auto max-h-40 p-2 bg-white/5 rounded-xl">
                          {episodes.map(ep => <button key={ep.index} onClick={() => setCurrentEpisodeIndex(ep.index)} className={`py-2 rounded text-xs ${currentEpisodeIndex === ep.index ? 'bg-brand text-black' : 'bg-white/5'}`}>{ep.title}</button>)}
                      </div>
                      <MovieInfoCard movie={currentMovie} onSearch={triggerSearch} />
                      <Suspense fallback={null}><GeminiChat currentMovie={currentMovie} /></Suspense>
                  </section>
              )}

              {activeTab === 'home' && !currentMovie && (
                  <>
                      {heroItems.length > 0 && <HeroBanner items={heroItems} onPlay={handleItemClick} />}
                      {watchHistory.length > 0 && <HorizontalSection title="继续观看" items={watchHistory} id="history" onItemClick={handleItemClick} />}
                      <HorizontalSection title="热门电影" items={homeSections.movies} id="movies" onItemClick={handleItemClick} />
                      <HorizontalSection title="热播剧集" items={homeSections.series} id="series" onItemClick={handleItemClick} />
                  </>
              )}

              {activeTab === 'search' && !currentMovie && (
                  <div className="mt-4">
                      <form onSubmit={(e) => { e.preventDefault(); triggerSearch(searchQuery); }} className="flex gap-2 mb-8">
                          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索你想看的内容..." className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white" />
                          <button type="submit" className="bg-brand text-black font-bold px-8 rounded-xl">搜索</button>
                      </form>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                          {searchResults.map(item => <div key={item.vod_id} onClick={() => handleItemClick(item)} className="bg-gray-900 rounded-lg overflow-hidden border border-white/5 group cursor-pointer"><div className="aspect-[2/3] overflow-hidden"><ImageWithFallback src={item.vod_pic} alt={item.vod_name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" /></div><p className="p-2 text-sm truncate">{item.vod_name}</p></div>)}
                      </div>
                  </div>
              )}
          </div>
      </div>
  );
};

export default App;