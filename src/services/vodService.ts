
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
    name: '默认源 (官方)',
    api: 'https://caiji.dyttzyapi.com/api.php/provide/vod',
    active: true,
    canDelete: false
};

const GLOBAL_PROXY = 'https://daili.laibo123.dpdns.org/?url=';
const SOURCES_KEY = 'cine_vod_sources';

const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 10000) => {
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

export const getAggregatedMovieDetail = async (id: number | string, apiUrl?: string, vodName?: string): Promise<{ main: VodDetail, alternatives: VodDetail[] } | null> => {
    // 快速起播路径：如果已知来源 URL，直接从该站抓取，不走复杂的全网聚合
    if (apiUrl && String(id).startsWith('cms_')) {
        const realId = String(id).replace('cms_', '');
        try {
            const data = await fetchCmsData(apiUrl, new URLSearchParams({ ac: 'detail', ids: realId }));
            if (data?.list?.[0]) {
                const main = data.list[0];
                main.api_url = apiUrl;
                // 异步补全豆瓣评分等信息，不阻塞主流程
                fetchDoubanData(main.vod_name).then(db => {
                    if (db) {
                        main.vod_douban_score = db.score;
                        main.vod_content = db.content || main.vod_content;
                    }
                });
                return { main, alternatives: [] };
            }
        } catch (e) {}
    }

    // 聚合路径：尝试从所有可用源中匹配
    const realId = String(id).replace('cms_', '');
    let mainDetail = await getMovieDetail(realId, apiUrl);
    
    if (!mainDetail && vodName) {
        const sources = getVodSources().filter(s => s.active);
        for (const s of sources) {
            try {
                const data = await fetchCmsData(s.api, new URLSearchParams({ ac: 'detail', wd: vodName }));
                const exact = data?.list?.find((v: any) => v.vod_name === vodName);
                if (exact) { exact.api_url = s.api; mainDetail = exact; break; }
            } catch(e) {}
        }
    }
    
    if (!mainDetail) return null;
    return { main: mainDetail, alternatives: [] };
};

export const fetchCategoryItems = async (category: string, options: any = {}) => {
    const { filter1 = '全部', filter2 = '全部', page = 1 } = options;
    let type = category === 'movies' ? 'movie' : 'tv';
    let tag = '热门';
    
    if (filter1 !== '全部') tag = filter1;
    else if (category === 'anime') tag = '日本动画';
    else if (category === 'variety') tag = '综艺';

    const url = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=recommend&page_limit=18&page_start=${(page - 1) * 18}`;
    const data = await fetchWithProxy(url);
    return (data?.subjects || []).map((item: any) => ({
        vod_id: item.id,
        vod_name: item.title,
        vod_pic: item.cover || '', 
        vod_score: item.rate,
        vod_year: '2024'
    }));
};

export const getHomeSections = async () => {
    const [movies, series, anime, variety] = await Promise.all([
        fetchDoubanJson('movie', '热门', 12),
        fetchDoubanJson('tv', '热门', 12),
        fetchDoubanJson('tv', '日本动画', 12),
        fetchDoubanJson('tv', '综艺', 12)
    ]);
    return { movies, series, anime, variety };
};

const fetchDoubanJson = async (type: string, tag: string, limit = 12): Promise<VodItem[]> => {
    const url = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=recommend&page_limit=${limit}&page_start=0`;
    const data = await fetchWithProxy(url);
    return (data?.subjects || []).map((item: any) => ({
        vod_id: item.id,
        vod_name: item.title,
        vod_pic: item.cover || '', 
        vod_score: item.rate,
        vod_year: '2024'
    }));
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
        pic: doc.querySelector('#mainpic img')?.getAttribute('src')
    };
  } catch (e) { return null; }
};

export const getAggregatedSearch = async (keyword: string): Promise<VodItem[]> => {
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

export const getVodSources = (): VodSource[] => {
    try {
        const stored = localStorage.getItem(SOURCES_KEY);
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return [DEFAULT_SOURCE];
};

export const initVodSources = async () => {
    if (!supabase) return;
    try {
        const { data } = await supabase.from('cine_sources').select('*').order('created_at', { ascending: true });
        if (data) {
            const cloudSources = data.map((d: any) => ({ id: d.id, name: d.name, api: d.api, active: d.active, canDelete: true }));
            const combined = [DEFAULT_SOURCE, ...cloudSources.filter(cs => cs.api !== DEFAULT_SOURCE.api)];
            localStorage.setItem(SOURCES_KEY, JSON.stringify(combined));
        }
    } catch (e) {}
};

export const getHistory = (): HistoryItem[] => JSON.parse(localStorage.getItem('cine_watch_history') || '[]');
export const addToHistory = (item: HistoryItem) => {
    let h = getHistory().filter(x => String(x.vod_id) !== String(item.vod_id));
    h.unshift(item);
    localStorage.setItem('cine_watch_history', JSON.stringify(h.slice(0, 20)));
    return h;
};
export const removeFromHistory = (id: string | number) => {
    let h = getHistory().filter(x => String(x.vod_id) !== String(id));
    localStorage.setItem('cine_watch_history', JSON.stringify(h));
    return h;
};
export const getDoubanPoster = async (k: string) => null;
export const clearAppCache = () => { localStorage.clear(); window.location.reload(); };
export const fetchPersonDetail = async (id: any) => null;
export const saveVodSources = (s: any) => localStorage.setItem(SOURCES_KEY, JSON.stringify(s));
export const deleteVodSource = async (id: any) => {};
export const resetVodSources = async () => [DEFAULT_SOURCE];
