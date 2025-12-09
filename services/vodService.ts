
import { Episode, VodDetail, ApiResponse, ActorItem, RecommendationItem, VodItem, VodSource, PlaySource, HistoryItem } from '../types';

// DEFAULT SOURCE
const DEFAULT_SOURCE: VodSource = {
    id: 'default',
    name: '默认源 (官方)',
    api: 'https://caiji.dyttzyapi.com/api.php/provide/vod',
    active: true,
    canDelete: false
};

// GLOBAL CUSTOM PROXY
const GLOBAL_PROXY = 'https://daili.laidd.de5.net/?url=';

// CACHE CONFIG
const HOME_CACHE_KEY = 'cine_home_data_v2';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const HISTORY_KEY = 'cine_watch_history';

// --- HISTORY MANAGEMENT ---

export const getHistory = (): HistoryItem[] => {
    try {
        const stored = localStorage.getItem(HISTORY_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch(e) {}
    return [];
};

export const addToHistory = (item: HistoryItem) => {
    try {
        let history = getHistory();
        // Remove existing entry for same ID
        history = history.filter(h => String(h.vod_id) !== String(item.vod_id));
        // Add new to top
        history.unshift(item);
        // Cap at 20 items
        if (history.length > 20) history = history.slice(0, 20);
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        return history;
    } catch(e) { return []; }
};

export const removeFromHistory = (vod_id: number | string) => {
    try {
        let history = getHistory();
        history = history.filter(h => String(h.vod_id) !== String(vod_id));
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        return history;
    } catch(e) { return []; }
};

export const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
};

// --- SOURCE MANAGEMENT ---

export const getVodSources = (): VodSource[] => {
    try {
        const stored = localStorage.getItem('cine_vod_sources');
        if (stored) {
            return JSON.parse(stored);
        }
    } catch(e) {}
    return [DEFAULT_SOURCE];
};

export const saveVodSources = (sources: VodSource[]) => {
    localStorage.setItem('cine_vod_sources', JSON.stringify(sources));
};

export const addVodSource = (name: string, api: string) => {
    const sources = getVodSources();
    const newSource: VodSource = {
        id: Date.now().toString(),
        name: name.trim(),
        api: api.trim(),
        active: true,
        canDelete: true
    };
    saveVodSources([...sources, newSource]);
    return newSource;
};

export const deleteVodSource = (id: string) => {
    const sources = getVodSources();
    const filtered = sources.filter(s => s.id !== id);
    saveVodSources(filtered);
};

export const resetVodSources = () => {
    localStorage.removeItem('cine_vod_sources');
    return [DEFAULT_SOURCE];
};

// --- FALLBACK DATA ---
const FALLBACK_MOVIES: VodItem[] = [
    { vod_id: 1, vod_name: "沙丘2", vod_pic: "https://img9.doubanio.com/view/photo/l/public/p2905327559.webp", vod_score: "8.3", type_name: "科幻", vod_year: "2024", source: 'douban' },
    { vod_id: 2, vod_name: "周处除三害", vod_pic: "https://img9.doubanio.com/view/photo/l/public/p2904838662.webp", vod_score: "8.1", type_name: "动作", vod_year: "2024", source: 'douban' },
    { vod_id: 3, vod_name: "热辣滚烫", vod_pic: "https://img9.doubanio.com/view/photo/l/public/p2903273413.webp", vod_score: "7.8", type_name: "喜剧", vod_year: "2024", source: 'douban' },
    { vod_id: 4, vod_name: "第二十条", vod_pic: "https://img9.doubanio.com/view/photo/l/public/p2903636733.webp", vod_score: "7.7", type_name: "剧情", vod_year: "2024", source: 'douban' },
    { vod_id: 5, vod_name: "哥斯拉大战金刚2", vod_pic: "https://img1.doubanio.com/view/photo/l/public/p2905896429.webp", vod_score: "7.0", type_name: "动作", vod_year: "2024", source: 'douban' },
    { vod_id: 6, vod_name: "飞驰人生2", vod_pic: "https://img2.doubanio.com/view/photo/l/public/p2903144881.webp", vod_score: "7.7", type_name: "喜剧", vod_year: "2024", source: 'douban' },
    { vod_id: 7, vod_name: "功夫熊猫4", vod_pic: "https://img9.doubanio.com/view/photo/l/public/p2905319835.webp", vod_score: "6.5", type_name: "动画", vod_year: "2024", source: 'douban' },
    { vod_id: 8, vod_name: "银河护卫队3", vod_pic: "https://img9.doubanio.com/view/photo/l/public/p2890479996.webp", vod_score: "8.4", type_name: "科幻", vod_year: "2023", source: 'douban' },
];

const FALLBACK_SERIES: VodItem[] = [
    { vod_id: 11, vod_name: "繁花", vod_pic: "https://img9.doubanio.com/view/photo/l/public/p2902345475.webp", vod_score: "8.7", type_name: "剧情", vod_year: "2024", source: 'douban' },
    { vod_id: 12, vod_name: "三体", vod_pic: "https://img9.doubanio.com/view/photo/l/public/p2886360564.webp", vod_score: "8.7", type_name: "科幻", vod_year: "2023", source: 'douban' },
    { vod_id: 13, vod_name: "漫长的季节", vod_pic: "https://img1.doubanio.com/view/photo/l/public/p2891334968.webp", vod_score: "9.4", type_name: "悬疑", vod_year: "2023", source: 'douban' },
    { vod_id: 14, vod_name: "庆余年", vod_pic: "https://img9.doubanio.com/view/photo/l/public/p2574442575.webp", vod_score: "7.9", type_name: "古装", vod_year: "2019", source: 'douban' },
];

/**
 * Robust Fetch Utility with Timeout
 */
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 8000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
};

/**
 * Fetch Data via Global Proxy
 */
const fetchWithProxy = async (targetUrl: string, options: RequestInit = {}): Promise<any> => {
  try {
      const proxyUrl = `${GLOBAL_PROXY}${encodeURIComponent(targetUrl)}`;
      const response = await fetchWithTimeout(proxyUrl, options, 10000);

      if (response.ok) {
          const text = await response.text();
          try {
              return JSON.parse(text);
          } catch(e) {
              return text;
          }
      }
  } catch (e) {
      // console.warn(`Proxy fetch failed for ${targetUrl}`, e);
  }
  return null;
};

/**
 * FETCH DOUBAN JSON
 */
const fetchDoubanJson = async (type: string, tag: string, limit = 12, sort = 'recommend'): Promise<VodItem[]> => {
    const start = sort === 'recommend' ? Math.floor(Math.random() * 5) : 0; 
    const doubanUrl = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=${sort}&page_limit=${limit}&page_start=${start}`;
    
    try {
        const data = await fetchWithProxy(doubanUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
        });

        if (data && data.subjects && Array.isArray(data.subjects)) {
            return data.subjects.map((item: any) => ({
                vod_id: item.id,
                vod_name: item.title,
                vod_pic: item.cover || '', 
                vod_score: item.rate,
                type_name: tag,
                source: 'douban',
                vod_year: '2024'
            }));
        }
    } catch (e) {
        // console.error("Douban API fetch failed", e);
    }
    
    return [];
};

export const getHomeSections = async () => {
    // 1. Try Cache First
    try {
        const cached = localStorage.getItem(HOME_CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) {
                 if (data.movies && data.movies.length > 0) {
                     return data;
                 }
            }
        }
    } catch (e) {}

    // 2. Fetch if no cache
    const safeFetch = async (fn: Promise<VodItem[]>) => {
        try { 
            const res = await fn; 
            return Array.isArray(res) ? res : [];
        } catch (e) { return []; }
    };

    const [movies, series, shortDrama, anime, variety] = await Promise.all([
        safeFetch(fetchDoubanJson('movie', '热门', 18)),
        safeFetch(fetchDoubanJson('tv', '热门', 18)),
        safeFetch(fetchDoubanJson('tv', '短剧', 18)), 
        safeFetch(fetchDoubanJson('tv', '日本动画', 18)),
        safeFetch(fetchDoubanJson('tv', '综艺', 18))
    ]);
    
    const isCriticalEmpty = movies.length === 0 && series.length === 0;
    
    // 3. Save Cache (Only if we have real data)
    if (!isCriticalEmpty) {
        try {
            const cacheData = { movies, series, shortDrama, anime, variety };
            localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({
                data: cacheData,
                timestamp: Date.now()
            }));
        } catch (e) {}
    }
    
    if (isCriticalEmpty) {
        return {
            movies: FALLBACK_MOVIES,
            series: FALLBACK_SERIES, 
            shortDrama: FALLBACK_SERIES.map(i => ({...i, type_name: '短剧'})),
            anime: FALLBACK_MOVIES.map(i => ({...i, type_name: '动漫'})),
            variety: FALLBACK_SERIES.map(i => ({...i, type_name: '综艺'}))
        };
    }
    
    return { movies, series, shortDrama, anime, variety };
};

export const fetchCategoryItems = async (
    category: string, 
    options: { filter1?: string, filter2?: string } = {}
): Promise<VodItem[]> => {
    
    const { filter1 = '全部', filter2 = '全部' } = options;
    let type = 'movie';
    let tag = '热门';
    let sort = 'recommend';

    switch (category) {
        case 'movies':
            type = 'movie';
            if (filter1 === '最新电影') sort = 'time';
            else if (filter1 === '豆瓣高分') sort = 'rank';
            else if (filter1 === '冷门佳片') tag = '冷门佳片';
            else tag = '热门';
            if (filter2 !== '全部') tag = filter2;
            break;
        case 'series':
            type = 'tv';
            tag = '热门';
            if (filter1 === '最近热门') sort = 'recommend';
            if (filter2 === '国产') tag = '国产剧';
            else if (filter2 === '欧美') tag = '美剧';
            else if (filter2 === '日本') tag = '日剧';
            else if (filter2 === '韩国') tag = '韩剧';
            else if (filter2 === '动漫') tag = '日本动画';
            else if (filter2 !== '全部') tag = filter2;
            break;
        case 'anime':
            type = 'tv';
            tag = '日本动画';
            if (filter1 === '剧场版') { type = 'movie'; tag = '日本动画'; sort = 'recommend'; } 
            else if (['周一', '周二', '周三', '周四', '周五', '周六', '周日'].includes(filter2)) { tag = '日本动画'; sort = 'time'; } 
            else if (filter2 !== '全部') { tag = filter2; }
            break;
        case 'variety':
            type = 'tv';
            tag = '综艺';
            if (filter2 === '国内' || filter2 === '大陆') tag = '大陆综艺';
            else if (filter2 !== '全部') tag = filter2 + '综艺'; 
            break;
        default:
            return [];
    }

    const items = await fetchDoubanJson(type, tag, 60, sort);
    if (items.length === 0 && category === 'movies') return FALLBACK_MOVIES;
    if (items.length === 0 && category === 'series') return FALLBACK_SERIES;
    
    return items;
};

// --- SEARCH LOGIC ---

/**
 * Search directly from Douban (for UI Display)
 */
export const searchDouban = async (keyword: string): Promise<VodItem[]> => {
    const searchUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;
    try {
        const data = await fetchWithProxy(searchUrl);
        if (Array.isArray(data)) {
            return data.map((item: any) => ({
                vod_id: item.id,
                vod_name: item.title,
                vod_pic: item.img ? item.img.replace(/s_ratio_poster|m(?=\/public)/, 'l') : '',
                vod_score: item.year, // Douban suggest uses year usually, no score
                type_name: item.type || '影视',
                vod_year: item.year,
                source: 'douban'
            }));
        }
    } catch(e) {
        console.warn('Douban search failed', e);
    }
    return [];
};

/**
 * Search from CMS Resource Sites (for Playback Sources)
 */
export const searchCms = async (keyword: string, page = 1): Promise<ApiResponse> => {
  const sources = getVodSources().filter(s => s.active);
  const params = new URLSearchParams({
      ac: 'detail',
      wd: keyword,
      pg: page.toString(),
  });

  for (const source of sources) {
      const targetUrl = `${source.api}?${params.toString()}`;
      try {
          const data = await fetchWithProxy(targetUrl);
          if (typeof data === 'object' && (data.code === 1 || (Array.isArray(data.list) && data.list.length > 0))) {
              const list = (data.list || []).map((item: any) => ({
                  ...item,
                  api_url: source.api 
              }));
              return { ...data, list };
          }
      } catch(e) {
          console.warn(`Search failed on source ${source.name}`, e);
      }
  }
  
  return { code: 0, msg: "Error", page: 1, pagecount: 0, limit: "20", total: 0, list: [] };
};

export const getMovieDetail = async (id: number | string, apiUrl?: string): Promise<VodDetail | null> => {
  const params = new URLSearchParams({
      ac: 'detail',
      ids: id.toString(),
      out: 'json'
  });
  
  const sourcesToTry = apiUrl 
      ? [{ api: apiUrl, name: 'Target' }] 
      : getVodSources().filter(s => s.active);

  for (const source of sourcesToTry) {
      const targetUrl = `${source.api}?${params.toString()}`;
      try {
          const data = await fetchWithProxy(targetUrl);
          if (data && data.list && data.list.length > 0) {
              const detail = data.list[0] as VodDetail;
              // Ensure we carry over the API URL to match the source later
              detail.api_url = source.api; 
              return detail;
          }
      } catch(e) {}
  }
  return null;
};

export const getDoubanPoster = async (keyword: string): Promise<string | null> => {
    const searchUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;
    const data = await fetchWithProxy(searchUrl);
    if (Array.isArray(data) && data.length > 0 && data[0].img) {
        return data[0].img.replace(/s_ratio_poster|m(?=\/public)/, 'l');
    }
    return null; 
};

export const parseAllSources = (detail: VodDetail): PlaySource[] => {
    if (!detail.vod_play_url || !detail.vod_play_from) return [];
    
    const fromArray = detail.vod_play_from.split('$$$');
    const urlArray = detail.vod_play_url.split('$$$');
    
    // Resolve Source Name from Settings configuration
    let sourceName = '默认源';
    let isCustomSource = false;

    if (detail.api_url) {
        const sources = getVodSources();
        const matched = sources.find(s => s.api === detail.api_url);
        if (matched) {
            sourceName = matched.name;
            // Identify if this is a custom source (not default)
            isCustomSource = matched.id !== 'default';
        }
    } else if (detail.source === 'douban') {
        sourceName = '豆瓣推荐';
    }

    const sources: PlaySource[] = [];
    
    fromArray.forEach((code, idx) => {
        const urlStr = urlArray[idx];
        if (!urlStr) return;

        // FILTER LOGIC:
        // 1. If it's a Custom Source (user added), we TRUST it. Show everything.
        // 2. If it's the Default Source, we enforce strict M3U8 filtering.
        const isM3u8Code = code.toLowerCase().includes('m3u8');
        const isM3u8Content = urlStr.includes('.m3u8');
        
        // Relaxing the filter: If it's custom source, allow it. If default, must be m3u8.
        if (!isCustomSource && !isM3u8Code && !isM3u8Content) {
            return; // Skip non-m3u8 on default source
        }
        
        const episodes: Episode[] = [];
        const lines = urlStr.split('#');
        lines.forEach((line, epIdx) => {
            const parts = line.split('$');
            let title = parts.length > 1 ? parts[0] : `第 ${epIdx + 1} 集`;
            const url = parts.length > 1 ? parts[1] : parts[0];
            
            // Clean up title if it matches the code or is generic junk
            if (
                title === code || 
                title.toLowerCase() === 'm3u8' || 
                title.toLowerCase() === 'mp4' || 
                title === sourceName ||
                title.startsWith('http') ||
                title.startsWith('//')
            ) {
                title = `第 ${epIdx + 1} 集`;
            }

             if (url && (url.startsWith('http') || url.startsWith('//'))) {
                  const finalUrl = url.startsWith('//') ? `https:${url}` : url;
                  episodes.push({ title, url: finalUrl, index: epIdx });
             }
        });
        
        if (episodes.length > 0) {
            // Naming Strategy:
            // If the source name already exists in our list (e.g. "Ruyi" already added from a previous player code),
            // append the code to differentiate: "Ruyi (ruyim3u8)"
            let finalName = sourceName;
            if (sources.some(s => s.name === sourceName)) {
                 finalName = `${sourceName} (${code})`;
            }

            sources.push({ name: finalName, episodes });
        }
    });

    return sources;
}

export const parseEpisodes = (urlStr: string, fromStr: string): Episode[] => {
  const dummyDetail = { vod_play_url: urlStr, vod_play_from: fromStr } as VodDetail;
  const sources = parseAllSources(dummyDetail);
  return sources[0]?.episodes || [];
};

export const enrichVodDetail = async (detail: VodDetail): Promise<Partial<VodDetail> | null> => {
    try {
        const doubanData = await fetchDoubanData(detail.vod_name, detail.vod_douban_id);
        if (doubanData) {
            const updates: Partial<VodDetail> = {};
            // Basic Info
            if (doubanData.score) updates.vod_score = doubanData.score;
            if (doubanData.pic) updates.vod_pic = doubanData.pic;
            if (doubanData.content) updates.vod_content = doubanData.content;
            
            // Comprehensive Details - All fields requested
            if (doubanData.director) updates.vod_director = doubanData.director;
            if (doubanData.actor) updates.vod_actor = doubanData.actor;
            if (doubanData.writer) updates.vod_writer = doubanData.writer;
            if (doubanData.pubdate) updates.vod_pubdate = doubanData.pubdate;
            if (doubanData.episodeCount) updates.vod_episode_count = doubanData.episodeCount;
            if (doubanData.duration) updates.vod_duration = doubanData.duration;
            if (doubanData.alias) updates.vod_alias = doubanData.alias;
            if (doubanData.imdb) updates.vod_imdb = doubanData.imdb;
            if (doubanData.area) updates.vod_area = doubanData.area;
            if (doubanData.lang) updates.vod_lang = doubanData.lang;
            if (doubanData.tag) updates.type_name = doubanData.tag;
            
            // Extended Data
            if (doubanData.recs) updates.vod_recs = doubanData.recs;
            if (doubanData.actorsExtended) updates.vod_actors_extended = doubanData.actorsExtended;
            
            return updates;
        }
    } catch (e) { }
    return null;
}

export const fetchDoubanData = async (keyword: string, doubanId?: string | number): Promise<any | null> => {
  try {
    let targetId = doubanId;
    if (!targetId || targetId === '0' || targetId === 0) {
        const searchUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;
        const data = await fetchWithProxy(searchUrl);
        if (Array.isArray(data) && data.length > 0) targetId = data[0].id;
    }
    
    if (!targetId) return null;

    const pageUrl = `https://movie.douban.com/subject/${targetId}/`;
    const html = await fetchWithProxy(pageUrl);
    if (!html || typeof html !== 'string') return null;
    
    // Robust Parsing using DOMParser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const result: any = { doubanId: String(targetId) };

    // Helper to get text from #info
    const getInfoField = (label: string): string => {
         const plSpan = Array.from(doc.querySelectorAll('#info span.pl')).find(el => el.textContent?.includes(label));
         if (!plSpan) return '';
         
         let next = plSpan.nextElementSibling;
         if (next && next.classList.contains('attrs')) {
             return next.textContent?.trim() || '';
         }

         let content = '';
         let curr = plSpan.nextSibling;
         while(curr) {
             if (curr.nodeName === 'BR') break;
             if (curr.nodeType === 1 && (curr as Element).classList.contains('pl')) break; // Next label
             content += curr.textContent;
             curr = curr.nextSibling;
         }
         return content.replace(/:/g, '').trim();
    };

    result.director = getInfoField('导演');
    result.writer = getInfoField('编剧');
    result.actor = getInfoField('主演');
    result.type_name = getInfoField('类型');
    result.area = getInfoField('制片国家/地区');
    result.lang = getInfoField('语言');
    result.pubdate = getInfoField('首播') || getInfoField('上映日期');
    result.episodeCount = getInfoField('集数');
    result.duration = getInfoField('单集片长') || getInfoField('片长');
    result.alias = getInfoField('又名');
    result.imdb = getInfoField('IMDb');

    // Synopsis
    const summary = doc.querySelector('span[property="v:summary"]');
    const hiddenSummary = doc.querySelector('span.all.hidden');
    if (hiddenSummary) {
         result.content = hiddenSummary.textContent?.trim().replace(/<br\s*\/?>/gi, '\n').replace(/\s+/g, ' ');
    } else if (summary) {
        result.content = summary.textContent?.trim().replace(/<br\s*\/?>/gi, '\n').replace(/\s+/g, ' ');
    }

    // Score
    const rating = doc.querySelector('strong[property="v:average"]');
    if (rating) result.score = rating.textContent?.trim();

    // Picture
    const img = doc.querySelector('#mainpic img');
    if (img) result.pic = img.getAttribute('src');

    // Visual Cast List (#celebrities)
    const celebrityItems = doc.querySelectorAll('#celebrities .celebrity');
    if (celebrityItems.length > 0) {
        result.actorsExtended = Array.from(celebrityItems).slice(0, 10).map(el => {
            const name = el.querySelector('.name')?.textContent?.trim() || '';
            const role = el.querySelector('.role')?.textContent?.trim() || '';
            let pic = el.querySelector('.avatar')?.getAttribute('style')?.match(/url\((.*?)\)/)?.[1] || '';
            if (!pic) pic = el.querySelector('img')?.getAttribute('src') || '';
            
            if (pic && !pic.startsWith('http')) {
                if (pic.startsWith('//')) pic = 'https:' + pic;
            }
            
            return { name, role, pic: pic.replace(/s_ratio_poster|m(?=\/public)/, 'l') };
        }).filter(a => a.name);
    }

    // Recommendations
    const recItems = doc.querySelectorAll('#recommendations dl, .recommendations-bd dl');
    if (recItems.length > 0) {
        result.recs = Array.from(recItems).slice(0, 10).map(el => {
            const img = el.querySelector('img');
            const a = el.querySelector('dd a');
            return {
                name: img?.getAttribute('alt') || a?.textContent?.trim() || '',
                pic: img?.getAttribute('src') || '',
                doubanId: el.querySelector('dd a')?.getAttribute('href')?.match(/subject\/(\d+)/)?.[1]
            };
        }).filter(r => r.name);
    }

    return result;
  } catch (e) { return null; }
};
