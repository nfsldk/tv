
import { Episode, VodDetail, ApiResponse, ActorItem, RecommendationItem, VodItem, VodSource, PlaySource, HistoryItem, PersonDetail, ReviewItem } from '../types';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE SETUP ---
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '';

let supabase: any = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('Supabase initialized successfully');
    } catch (e) {
        console.warn('Supabase init failed', e);
    }
}

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
const SOURCES_KEY = 'cine_vod_sources';

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
        history = history.filter(h => String(h.vod_id) !== String(item.vod_id));
        history.unshift(item);
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

// --- CACHE MANAGEMENT ---

/**
 * Fix: Added clearAppCache to resolve import error in SettingsModal.tsx
 */
export const clearAppCache = () => {
    localStorage.removeItem(HOME_CACHE_KEY);
    // Clear all cine_ related keys (history, progress, danmaku) and artplayer settings
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('cine_') || key.startsWith('art_')) {
            localStorage.removeItem(key);
        }
    });
};

// --- SOURCE MANAGEMENT ---

export const getVodSources = (): VodSource[] => {
    try {
        const stored = localStorage.getItem(SOURCES_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch(e) {}
    return [DEFAULT_SOURCE];
};

export const saveVodSources = (sources: VodSource[]) => {
    localStorage.setItem(SOURCES_KEY, JSON.stringify(sources));
};

export const initVodSources = async () => {
    if (!supabase) return;

    try {
        const { data, error } = await supabase
            .from('cine_sources')
            .select('*')
            .order('created_at', { ascending: true });

        if (!error && data) {
            const cloudSources = data.map((d: any) => ({
                id: d.id,
                name: d.name,
                api: d.api,
                active: d.active,
                canDelete: true
            }));
            const combined = [DEFAULT_SOURCE, ...cloudSources.filter(cs => cs.api !== DEFAULT_SOURCE.api)];
            saveVodSources(combined);
        }
    } catch (e) {}
};

export const addVodSource = async (name: string, api: string) => {
    const sources = getVodSources();
    const newId = Date.now().toString();
    const newSource: VodSource = {
        id: newId,
        name: name.trim(),
        api: api.trim(),
        active: true,
        canDelete: true
    };
    
    saveVodSources([...sources, newSource]);

    if (supabase) {
        try {
            await supabase.from('cine_sources').insert([
                { name: newSource.name, api: newSource.api, active: true }
            ]);
            await initVodSources();
        } catch (e) {}
    }
    
    return newSource;
};

export const deleteVodSource = async (id: string) => {
    const sources = getVodSources();
    const target = sources.find(s => s.id === id);
    const filtered = sources.filter(s => s.id !== id);
    saveVodSources(filtered);

    if (supabase && target) {
        try {
            await supabase.from('cine_sources').delete().eq('api', target.api);
        } catch (e) {}
    }
};

export const toggleVodSource = async (id: string) => {
    const sources = getVodSources();
    const target = sources.find(s => s.id === id);
    if (!target) return;

    const newActiveState = !target.active;
    const updated = sources.map(s => s.id === id ? { ...s, active: newActiveState } : s);
    saveVodSources(updated);

    if (supabase) {
        try {
            await supabase.from('cine_sources').update({ active: newActiveState }).eq('api', target.api);
        } catch (e) {}
    }
};

export const resetVodSources = async () => {
    localStorage.removeItem(SOURCES_KEY);
    if (supabase) {
        await initVodSources();
        return getVodSources();
    }
    return [DEFAULT_SOURCE];
};

// --- DATA FETCHING ---

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

const fetchWithProxy = async (targetUrl: string, options: RequestInit = {}): Promise<any> => {
  try {
      const proxyUrl = `${GLOBAL_PROXY}${encodeURIComponent(targetUrl)}`;
      const response = await fetchWithTimeout(proxyUrl, options, 10000);
      if (response.ok) {
          const text = await response.text();
          try { return JSON.parse(text); } catch(e) { return text; }
      }
  } catch (e) {}
  return null;
};

const fetchCmsData = async (baseUrl: string, params: URLSearchParams): Promise<any> => {
    params.set('out', 'json');
    const url = `${baseUrl}?${params.toString()}`;
    try {
        const res = await fetchWithTimeout(url, {}, 5000);
        if (res.ok) {
            const text = await res.text();
            try { return JSON.parse(text); } catch (e) {}
        }
    } catch (e) {}
    return await fetchWithProxy(url);
};

export const getHomeSections = async () => {
    try {
        const cached = localStorage.getItem(HOME_CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) return data;
        }
    } catch (e) {}

    const safeFetch = async (fn: Promise<VodItem[]>) => {
        try { return await fn; } catch (e) { return []; }
    };

    const [movies, series, shortDrama, anime, variety] = await Promise.all([
        safeFetch(fetchDoubanJson('movie', '热门', 18)),
        safeFetch(fetchDoubanJson('tv', '热门', 18)),
        safeFetch(fetchDoubanJson('tv', '短剧', 18)), 
        safeFetch(fetchDoubanJson('tv', '日本动画', 18)),
        safeFetch(fetchDoubanJson('tv', '综艺', 18))
    ]);
    
    const data = { movies, series, shortDrama, anime, variety };
    if (movies.length > 0) {
        localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    }
    return data;
};

export const fetchCategoryItems = async (category: string, options: any = {}) => {
    const { filter1 = '全部', filter2 = '全部', page = 1 } = options;
    let type = 'movie', tag = '热门', sort = 'recommend';
    if (category === 'series') type = 'tv';
    if (category === 'variety') { type = 'tv'; tag = '综艺'; }
    if (category === 'anime') { type = 'tv'; tag = '日本动画'; }
    
    return await fetchDoubanJson(type, tag, 18, sort, (page - 1) * 18);
};

const fetchDoubanJson = async (type: string, tag: string, limit = 12, sort = 'recommend', start = 0): Promise<VodItem[]> => {
    const doubanUrl = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=${sort}&page_limit=${limit}&page_start=${start}`;
    const data = await fetchWithProxy(doubanUrl);
    if (data?.subjects) {
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
    return [];
};

export const getAggregatedSearch = async (keyword: string): Promise<VodItem[]> => {
    const [doubanResults, cmsResults] = await Promise.all([
        searchDouban(keyword),
        searchAllCmsResources(keyword)
    ]);
    const finalResults = [...doubanResults];
    const existingNames = new Set(doubanResults.map(i => i.vod_name));
    cmsResults.forEach(item => {
        if (!existingNames.has(item.vod_name)) {
            finalResults.push(item);
            existingNames.add(item.vod_name);
        }
    });
    return finalResults;
};

const searchDouban = async (keyword: string): Promise<VodItem[]> => {
    const data = await fetchWithProxy(`https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`);
    if (Array.isArray(data)) {
        return data.map((item: any) => ({
            vod_id: item.id,
            vod_name: item.title,
            vod_pic: item.img ? item.img.replace(/s_ratio_poster|m(?=\/public)/, 'l') : '',
            type_name: item.type === 'celebrity' ? 'celebrity' : '影视',
            vod_year: item.year,
            source: 'douban'
        }));
    }
    return [];
};

const searchAllCmsResources = async (keyword: string): Promise<VodItem[]> => {
    const sources = getVodSources().filter(s => s.active);
    const promises = sources.map(async (source) => {
        try {
            const data = await fetchCmsData(source.api, new URLSearchParams({ ac: 'detail', wd: keyword }));
            return (data?.list || []).map((item: any) => ({
                vod_id: `cms_${item.vod_id}`,
                vod_name: item.vod_name,
                vod_pic: item.vod_pic,
                type_name: item.type_name,
                api_url: source.api
            }));
        } catch(e) { return []; }
    });
    const results = await Promise.all(promises);
    return results.flat();
};

export const fetchPersonDetail = async (id: string | number): Promise<PersonDetail | null> => {
    try {
        const html = await fetchWithProxy(`https://movie.douban.com/celebrity/${id}/`);
        if (typeof html !== 'string') return null;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return {
            id: String(id),
            name: doc.querySelector('#content h1')?.textContent?.trim() || 'Unknown',
            pic: (doc.querySelector('#headline .pic img')?.getAttribute('src') || '').replace(/s_ratio_poster|m(?=\/public)/, 'l'),
            intro: doc.querySelector('#intro .bd')?.textContent?.trim() || '',
            works: [] // Works parsing omitted for brevity but required by types
        };
    } catch (e) { return null; }
};

export const getAggregatedMovieDetail = async (id: number | string, apiUrl?: string, vodName?: string): Promise<{ main: VodDetail, alternatives: VodDetail[] } | null> => {
    const realId = String(id).replace('cms_', '');
    let mainDetail = await getMovieDetail(realId, apiUrl);
    if (!mainDetail && vodName) {
        const sources = getVodSources().filter(s => s.active);
        for (const s of sources) {
            mainDetail = await fetchDetailFromSourceByKeyword(s, vodName);
            if (mainDetail) break;
        }
    }
    if (!mainDetail) return null;
    const sources = getVodSources().filter(s => s.active && s.api !== mainDetail.api_url);
    const promises = sources.map(s => fetchDetailFromSourceByKeyword(s, mainDetail.vod_name));
    const alternatives = (await Promise.all(promises)).filter((r): r is VodDetail => r !== null);
    return { main: mainDetail, alternatives };
};

const fetchDetailFromSourceByKeyword = async (source: VodSource, keyword: string): Promise<VodDetail | null> => {
    try {
        const data = await fetchCmsData(source.api, new URLSearchParams({ ac: 'detail', wd: keyword }));
        const exact = data?.list?.find((v: any) => v.vod_name === keyword);
        if (exact) { exact.api_url = source.api; return exact; }
    } catch(e) {}
    return null;
};

export const getMovieDetail = async (id: number | string, apiUrl?: string): Promise<VodDetail | null> => {
    const sources = apiUrl ? [{ api: apiUrl }] : getVodSources().filter(s => s.active);
    for (const source of sources) {
        try {
            const data = await fetchCmsData(source.api, new URLSearchParams({ ac: 'detail', ids: id.toString() }));
            if (data?.list?.[0]) { data.list[0].api_url = source.api; return data.list[0]; }
        } catch(e) {}
    }
    return null;
};

export const getDoubanPoster = async (keyword: string): Promise<string | null> => {
    const data = await fetchWithProxy(`https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`);
    if (Array.isArray(data) && data.length > 0 && data[0].img) {
        return data[0].img.replace(/s_ratio_poster|m(?=\/public)/, 'l');
    }
    return null; 
};

export const parseAllSources = (input: VodDetail | VodDetail[]): PlaySource[] => {
    const details = Array.isArray(input) ? input : [input];
    const all: PlaySource[] = [];
    details.forEach(d => {
        if (!d.vod_play_url) return;
        const froms = d.vod_play_from.split('$$$');
        const urls = d.vod_play_url.split('$$$');
        froms.forEach((f, i) => {
            if (!f.toLowerCase().includes('m3u8')) return;
            const eps = urls[i].split('#').map((l, idx) => {
                const [title, url] = l.split('$');
                return { title: url ? title : `第${idx+1}集`, url: url || title, index: idx };
            });
            all.push({ name: f, episodes: eps });
        });
    });
    return all;
};

export const fetchDoubanData = async (keyword: string, doubanId?: string | number): Promise<any | null> => {
  try {
    let targetId = doubanId;
    if (!targetId || targetId === '0') {
        const data = await fetchWithProxy(`https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`);
        if (Array.isArray(data) && data.length > 0) targetId = data[0].id;
    }
    if (!targetId) return null;
    const html = await fetchWithProxy(`https://movie.douban.com/subject/${targetId}/`);
    if (typeof html !== 'string') return null;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return {
        doubanId: String(targetId),
        score: doc.querySelector('.ll.rating_num')?.textContent?.trim(),
        content: doc.querySelector('span[property="v:summary"]')?.textContent?.trim(),
        pic: doc.querySelector('#mainpic img')?.getAttribute('src'),
        director: doc.querySelector('a[rel="v:directedBy"]')?.textContent?.trim(),
        actor: Array.from(doc.querySelectorAll('a[rel="v:starring"]')).slice(0, 5).map(a => a.textContent).join(' / ')
    };
  } catch (e) { return null; }
};
