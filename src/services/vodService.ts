
import { Episode, VodDetail, ApiResponse, ActorItem, RecommendationItem, VodItem, VodSource, PlaySource, HistoryItem, PersonDetail, ReviewItem } from '../types';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE SETUP ---
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '';

let supabase: any = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    try { supabase = createClient(SUPABASE_URL, SUPABASE_KEY); } catch (e) {}
}

const DEFAULT_SOURCE: VodSource = {
    id: 'default',
    name: '极速资源 (默认)',
    api: 'https://caiji.dyttzyapi.com/api.php/provide/vod',
    active: true,
    canDelete: false
};

const PROXIES = [
    'https://daili.laidd.de5.net/?url=',
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?'
];

const HISTORY_KEY = 'cine_watch_history';
const SOURCES_KEY = 'cine_vod_sources';
const HOME_CACHE_KEY = 'cine_home_data_v6';
const CAT_CACHE_PREFIX = 'cine_cat_cache_v2_';
const CACHE_TTL = 15 * 60 * 1000; 

// --- UTILS ---

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 7000) => {
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

const fetchWithProxy = async (targetUrl: string): Promise<any> => {
    for (const proxy of PROXIES) {
        try {
            const encodedUrl = proxy.includes('corsproxy.io') ? targetUrl : encodeURIComponent(targetUrl);
            const res = await fetchWithTimeout(`${proxy}${encodedUrl}`, {}, 9000);
            if (res.ok) {
                const text = await res.text();
                try { return JSON.parse(text); } catch(e) { return text; }
            }
        } catch (e) {}
    }
    return null;
};

const fetchCmsData = async (baseUrl: string, params: URLSearchParams): Promise<any> => {
    params.set('out', 'json');
    const url = `${baseUrl}?${params.toString()}`;
    try {
        const res = await fetchWithTimeout(url, {}, 5000);
        if (res.ok) {
            const data = await res.json();
            if (data?.list) return data;
        }
    } catch (e) {}
    return await fetchWithProxy(url);
};

// --- CORE LOGIC ---

export const getHomeSections = async () => {
    try {
        const cached = localStorage.getItem(HOME_CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) return data;
        }
    } catch (e) {}

    const [movies, series, anime, variety] = await Promise.all([
        fetchDoubanJson('movie', '热门', 18),
        fetchDoubanJson('tv', '热门', 18),
        fetchDoubanJson('tv', '日本动画', 18),
        fetchDoubanJson('tv', '综艺', 18)
    ]);

    const data = {
        movies,
        series,
        anime,
        variety,
        all: [...movies, ...series].sort(() => Math.random() - 0.5).slice(0, 15)
    };

    if (data.movies.length > 0) {
        localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    }
    return data;
};

const fetchDoubanJson = async (type: string, tag: string, limit = 18, sort = 'recommend', start = 0): Promise<VodItem[]> => {
    const url = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=${sort}&page_limit=${limit}&page_start=${start}`;
    const data = await fetchWithProxy(url);
    if (data?.subjects && Array.isArray(data.subjects)) {
        return data.subjects.map((item: any) => ({
            vod_id: item.id,
            vod_name: item.title,
            vod_pic: item.cover || '', 
            vod_score: item.rate || 'HOT',
            vod_year: '2024',
            source: 'douban' as const,
            type_name: tag
        }));
    }
    return [];
};

export const fetchCategoryItems = async (category: string, options: any = {}): Promise<VodItem[]> => {
    const { filter1 = '全部', page = 1 } = options;
    const limit = 20;
    const start = (page - 1) * limit;
    
    let dbType = 'movie';
    let dbTag = filter1;

    if (category === 'series' || category === 'anime' || category === 'variety') {
        dbType = 'tv';
    }

    if (filter1 === '全部') {
        if (category === 'anime') dbTag = '日本动画';
        else if (category === 'variety') dbTag = '综艺';
        else dbTag = '热门';
    }

    return await fetchDoubanJson(dbType, dbTag, limit, 'recommend', start);
};

export const searchAllCmsResources = async (keyword: string): Promise<VodItem[]> => {
    const sources = getVodSources().filter(s => s.active);
    const results = await Promise.all(sources.map(async (source) => {
        try {
            const data = await fetchCmsData(source.api, new URLSearchParams({ ac: 'detail', wd: keyword }));
            return (data?.list || []).map((item: any) => ({
                vod_id: `cms_${item.vod_id}`,
                vod_name: item.vod_name,
                vod_pic: item.vod_pic,
                vod_remarks: item.vod_remarks,
                type_name: item.type_name,
                vod_year: item.vod_year,
                api_url: source.api,
                source: 'cms' as const
            }));
        } catch(e) { return []; }
    }));
    const flattened = results.flat();
    const seen = new Set();
    return flattened.filter(item => {
        if (seen.has(item.vod_name)) return false;
        seen.add(item.vod_name);
        return true;
    });
};

export const getAggregatedSearch = async (keyword: string): Promise<VodItem[]> => {
    const [dbSuggest, cmsResults] = await Promise.all([
        fetchWithProxy(`https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`),
        searchAllCmsResources(keyword)
    ]);
    const dbItems: VodItem[] = Array.isArray(dbSuggest) ? dbSuggest.map((item: any) => ({
        vod_id: item.id,
        vod_name: item.title,
        vod_pic: item.img || '',
        type_name: item.type || '影视',
        vod_year: item.year,
        source: 'douban' as const
    })) : [];
    
    return [...dbItems, ...cmsResults];
};

export const getAggregatedMovieDetail = async (id: number | string, apiUrl?: string, vodName?: string): Promise<{ main: VodDetail, alternatives: VodDetail[] } | null> => {
    const isCmsId = String(id).startsWith('cms_');
    const realId = String(id).replace('cms_', '');
    
    // 优先使用提供的 API 直接查询
    if (apiUrl) {
        const data = await fetchCmsData(apiUrl, new URLSearchParams({ ac: 'detail', ids: realId }));
        if (data?.list?.[0]) {
            data.list[0].api_url = apiUrl;
            return { main: data.list[0], alternatives: [] };
        }
    }

    // 如果是豆瓣 ID，尝试获取名称并搜索 CMS
    let nameToSearch = vodName;
    if (!isCmsId && !nameToSearch) {
        const dbData = await fetchDoubanData('', id);
        nameToSearch = dbData?.name;
    }

    if (nameToSearch) {
        const cmsResults = await searchAllCmsResources(nameToSearch);
        const match = cmsResults.find(i => i.vod_name === nameToSearch) || cmsResults[0];
        if (match && match.api_url) {
            const data = await fetchCmsData(match.api_url, new URLSearchParams({ ac: 'detail', ids: String(match.vod_id).replace('cms_', '') }));
            if (data?.list?.[0]) {
                data.list[0].api_url = match.api_url;
                return { main: data.list[0], alternatives: [] };
            }
        }
    }

    // 最后的兜底：遍历所有启用的 CMS 源按 ID 匹配
    const sources = getVodSources().filter(s => s.active);
    for (const source of sources) {
        try {
            const data = await fetchCmsData(source.api, new URLSearchParams({ ac: 'detail', ids: realId }));
            if (data?.list?.[0]) {
                data.list[0].api_url = source.api;
                return { main: data.list[0], alternatives: [] };
            }
        } catch (e) {}
    }
    
    return null;
};

export const parseAllSources = (input: VodDetail | VodDetail[]): PlaySource[] => {
    const details = Array.isArray(input) ? input : [input];
    const all: PlaySource[] = [];
    details.forEach(d => {
        if (!d.vod_play_url || !d.vod_play_from) return;
        const froms = d.vod_play_from.split('$$$');
        const urls = d.vod_play_url.split('$$$');
        froms.forEach((f, i) => {
            if (!f.toLowerCase().includes('m3u8')) return;
            const segments = urls[i].split('#');
            const episodes = segments.map((seg, idx) => {
                const parts = seg.split('$');
                return {
                    title: parts.length > 1 ? parts[0] : `第${idx + 1}集`,
                    url: parts.length > 1 ? parts[1] : parts[0],
                    index: idx
                };
            }).filter(e => e.url && (e.url.startsWith('http') || e.url.startsWith('//')));
            if (episodes.length > 0) all.push({ name: f, episodes });
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
        name: doc.querySelector('span[property="v:itemreviewed"]')?.textContent?.trim(),
        score: doc.querySelector('.ll.rating_num')?.textContent?.trim(),
        content: doc.querySelector('span[property="v:summary"]')?.textContent?.trim(),
        pic: doc.querySelector('#mainpic img')?.getAttribute('src'),
        director: doc.querySelector('a[rel="v:directedBy"]')?.textContent?.trim(),
        actor: Array.from(doc.querySelectorAll('a[rel="v:starring"]')).slice(0, 5).map(a => a.textContent).join(' / ')
    };
  } catch (e) { return null; }
};

export const getVodSources = (): VodSource[] => {
    try {
        const stored = localStorage.getItem(SOURCES_KEY);
        return stored ? JSON.parse(stored) : [DEFAULT_SOURCE];
    } catch(e) { return [DEFAULT_SOURCE]; }
};

export const initVodSources = async () => {
    if (!supabase) return;
    try {
        const { data } = await supabase.from('cine_sources').select('*').order('created_at', { ascending: true });
        if (data && data.length > 0) {
            const cloudSources = data.map((d: any) => ({ id: d.id, name: d.name, api: d.api, active: d.active, canDelete: true }));
            const combined = [DEFAULT_SOURCE, ...cloudSources.filter(cs => cs.api !== DEFAULT_SOURCE.api)];
            localStorage.setItem(SOURCES_KEY, JSON.stringify(combined));
        }
    } catch (e) {}
};

export const saveVodSources = (s: VodSource[]) => localStorage.setItem(SOURCES_KEY, JSON.stringify(s));
export const getHistory = (): HistoryItem[] => JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
export const addToHistory = (item: HistoryItem) => {
    let h = getHistory().filter(x => String(x.vod_id) !== String(item.vod_id));
    h.unshift(item);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(0, 20)));
    return h;
};
export const removeFromHistory = (id: string | number) => {
    let h = getHistory().filter(x => String(x.vod_id) !== String(id));
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    return h;
};
export const clearAppCache = () => { localStorage.clear(); window.location.reload(); };
export const getDoubanPoster = async (k: string) => null;
export const fetchPersonDetail = async (id: any) => null;
export const addVodSource = async (n: string, a: string) => null;
export const deleteVodSource = async (id: any) => {};
export const resetVodSources = async () => [DEFAULT_SOURCE];
