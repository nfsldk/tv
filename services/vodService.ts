
// @ts-nocheck
import { Episode, VodDetail, ApiResponse, ActorItem, RecommendationItem, VodItem, VodSource, PlaySource, HistoryItem, PersonDetail, ReviewItem } from '../types';
import { createClient } from '@supabase/supabase-js';

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
const HISTORY_KEY = 'cine_watch_history';
const SOURCES_KEY = 'cine_vod_sources';

// --- 增强缓存配置 ---
const CACHE_KEYS = {
    HOME: 'cine_cache_home',
    SEARCH: 'cine_cache_search',
    DETAIL: 'cine_cache_detail',
    CATEGORY: 'cine_cache_cat'
};

const TTL = {
    HOME: 30 * 60 * 1000,    // 30分钟
    SEARCH: 10 * 60 * 1000,  // 10分钟
    DETAIL: 24 * 60 * 60 * 1000,  // 详情缓存提升至 24小时，减少重复解析
    CATEGORY: 20 * 60 * 1000 // 20分钟
};

// 缓存助手函数
const setCache = (key: string, data: any) => {
    try {
        localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            localStorage.clear(); 
        }
    }
};

const getCache = (key: string, ttl: number) => {
    try {
        const stored = localStorage.getItem(key);
        if (!stored) return null;
        const { data, timestamp } = JSON.parse(stored);
        if (Date.now() - timestamp < ttl) return data;
    } catch (e) {}
    return null;
};

export const clearAppCache = () => {
    Object.values(CACHE_KEYS).forEach(k => localStorage.removeItem(k));
    if ('caches' in window) {
        caches.keys().then(names => names.forEach(n => caches.delete(n)));
    }
};

// --- 业务函数 ---

export const getHistory = (): HistoryItem[] => {
    try {
        const stored = localStorage.getItem(HISTORY_KEY);
        if (stored) return JSON.parse(stored);
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

export const getVodSources = (): VodSource[] => {
    try {
        const stored = localStorage.getItem(SOURCES_KEY);
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return [DEFAULT_SOURCE];
};

export const saveVodSources = (sources: VodSource[]) => {
    localStorage.setItem(SOURCES_KEY, JSON.stringify(sources));
};

export const initVodSources = async () => {
    if (!supabase) return;
    try {
        const { data, error } = await supabase.from('cine_sources').select('*').order('created_at', { ascending: true });
        if (!error && data) {
            const cloudSources = data.map((d: any) => ({ id: d.id, name: d.name, api: d.api, active: d.active, canDelete: true }));
            const combined = [DEFAULT_SOURCE, ...cloudSources.filter(cs => cs.api !== DEFAULT_SOURCE.api)];
            saveVodSources(combined);
        }
    } catch (e) {}
};

export const addVodSource = async (name: string, api: string) => {
    const sources = getVodSources();
    const newId = Date.now().toString();
    const newSource: VodSource = { id: newId, name: name.trim(), api: api.trim(), active: true, canDelete: true };
    saveVodSources([...sources, newSource]);
    if (supabase) {
        try {
            await supabase.from('cine_sources').insert([{ name: newSource.name, api: newSource.api, active: true }]);
            await initVodSources();
        } catch (e) {}
    }
    return newSource;
};

export const deleteVodSource = async (id: string) => {
    const sources = getVodSources();
    const target = sources.find(s => s.id === id);
    if (!target) return;
    saveVodSources(sources.filter(s => s.id !== id));
    if (supabase) {
        try { await supabase.from('cine_sources').delete().eq('api', target.api); } catch (e) {}
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
        try { await supabase.from('cine_sources').update({ active: newActiveState }).eq('api', target.api); } catch (e) {}
    }
};

export const resetVodSources = async () => {
    localStorage.removeItem(SOURCES_KEY);
    if (supabase) { await initVodSources(); return getVodSources(); }
    return [DEFAULT_SOURCE];
};

const fetchWithProxy = async (targetUrl: string, options: RequestInit = {}): Promise<any> => {
  try {
      const proxyUrl = `${GLOBAL_PROXY}${encodeURIComponent(targetUrl)}`;
      const response = await fetch(proxyUrl, { ...options, signal: AbortSignal.timeout(12000) });
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
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
        if (res.ok) {
            const text = await res.text();
            try { return JSON.parse(text); } catch (e) {}
        }
    } catch (e) {}
    return await fetchWithProxy(url);
};

const fetchDoubanJson = async (type: string, tag: string, limit = 18, sort = 'recommend', startOffset = 0): Promise<VodItem[]> => {
    const start = startOffset; 
    const doubanUrl = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=${sort}&page_limit=${limit}&page_start=${start}`;
    const data = await fetchWithProxy(doubanUrl);
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
    return [];
};

export const getHomeSections = async () => {
    const cached = getCache(CACHE_KEYS.HOME, TTL.HOME);
    if (cached) return cached;

    const safeFetch = async (fn: Promise<VodItem[]>) => { try { return await fn; } catch (e) { return []; } };
    const [movies, series, shortDrama, anime, variety] = await Promise.all([
        safeFetch(fetchDoubanJson('movie', '热门', 18)),
        safeFetch(fetchDoubanJson('tv', '热门', 18)),
        safeFetch(fetchDoubanJson('tv', '短剧', 18)), 
        safeFetch(fetchDoubanJson('tv', '日本动画', 18)),
        safeFetch(fetchDoubanJson('tv', '综艺', 18))
    ]);
    
    const results = { movies, series, shortDrama, anime, variety };
    if (movies.length > 0) {
        setCache(CACHE_KEYS.HOME, results);
    }
    return results;
};

export const fetchCategoryItems = async (category: string, options: any = {}): Promise<VodItem[]> => {
    const { filter1 = '全部', filter2 = '全部', page = 1 } = options;
    const cacheKey = `${CACHE_KEYS.CATEGORY}_${category}_${filter1}_${filter2}_${page}`;
    const cached = getCache(cacheKey, TTL.CATEGORY);
    if (cached) return cached;

    const limit = 20;
    const start = (page - 1) * limit;
    let type = 'movie', tag = '热门', sort = 'recommend';
    if (category === 'movies') {
        if (filter1 === '最新电影') sort = 'time'; else if (filter1 === '豆瓣高分') sort = 'rank'; else if (filter1 === '冷门佳片') tag = '冷门佳片';
        if (filter2 !== '全部') tag = filter2;
    } else if (category === 'series') {
        type = 'tv'; if (filter2 !== '全部') tag = filter2;
    } else if (category === 'anime') {
        type = 'tv'; tag = '日本动画'; if (filter1 === '剧场版') type = 'movie'; if (filter2 !== '全部') tag = filter2;
    } else if (category === 'variety') {
        type = 'tv'; tag = '综艺'; if (filter2 !== '全部') tag = filter2;
    }
    const results = await fetchDoubanJson(type, tag, limit, sort, start);
    setCache(cacheKey, results);
    return results;
};

const searchAllCmsResources = async (keyword: string): Promise<VodItem[]> => {
    const sources = getVodSources().filter(s => s.active);
    const params = new URLSearchParams({ ac: 'detail', wd: keyword });
    const promises = sources.map(async (source) => {
        try {
            const data = await fetchCmsData(source.api, params);
            if (data && data.list) {
                return data.list.map((item: any) => ({
                    vod_id: `cms_${item.vod_id}`,
                    vod_name: item.vod_name,
                    vod_pic: item.vod_pic || '', 
                    vod_remarks: item.vod_remarks,
                    type_name: item.type_name,
                    vod_year: item.vod_year,
                    source: 'cms',
                    api_url: source.api
                }));
            }
        } catch(e) {}
        return [];
    });
    const results = await Promise.all(promises);
    return results.flat();
};

export const searchCms = async (keyword: string, page = 1): Promise<ApiResponse> => {
    const cmsResults = await searchAllCmsResources(keyword);
    return { 
        code: 1, 
        msg: "Success", 
        page: page, 
        pagecount: 1, 
        limit: "20", 
        total: cmsResults.length, 
        list: cmsResults 
    };
};

export const getAggregatedSearch = async (keyword: string): Promise<VodItem[]> => {
    const cacheKey = `${CACHE_KEYS.SEARCH}_${keyword}`;
    const cached = getCache(cacheKey, TTL.SEARCH);
    if (cached) return cached;

    const [doubanResults, cmsResults] = await Promise.all([searchDouban(keyword), searchAllCmsResources(keyword)]);
    const finalResults = [...doubanResults];
    const existingNames = new Set(doubanResults.map(i => i.vod_name.trim()));
    cmsResults.forEach(item => {
        if (!existingNames.has(item.vod_name.trim())) {
            finalResults.push(item);
            existingNames.add(item.vod_name.trim());
        }
    });
    setCache(cacheKey, finalResults);
    return finalResults;
};

export const searchDouban = async (keyword: string): Promise<VodItem[]> => {
    const searchUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;
    const data = await fetchWithProxy(searchUrl);
    if (Array.isArray(data)) {
        return data.map((item: any) => ({
            vod_id: item.id,
            vod_name: item.title,
            vod_pic: item.img || '',
            vod_score: '', 
            type_name: item.type === 'celebrity' ? 'celebrity' : (item.type || '影视'),
            vod_year: item.year,
            source: 'douban'
        }));
    }
    return [];
};

/**
 * 核心修复逻辑：聚合详情页处理
 * 支持刷新时的恢复逻辑
 */
export const getAggregatedMovieDetail = async (id: number | string, apiUrl?: string, vodName?: string): Promise<{ main: VodDetail, alternatives: VodDetail[] } | null> => {
    const cacheKey = `${CACHE_KEYS.DETAIL}_${id}`;
    const cached = getCache(cacheKey, TTL.DETAIL);
    if (cached) return cached;

    let doubanMetadata = null;
    let movieName = vodName || '';

    // 1. 如果有 vodName 或 id 不是以 cms_ 开头（说明是豆瓣 ID）
    if (movieName || !String(id).startsWith('cms_')) {
        doubanMetadata = await fetchDoubanData(movieName, String(id).startsWith('cms_') ? undefined : id);
        if (doubanMetadata) movieName = doubanMetadata.title;
    }

    // 2. 如果没能从豆瓣拿到数据（可能是刷新，且是 cms_ ID），先从 CMS 获取基础信息以拿取电影名
    if (!doubanMetadata && String(id).startsWith('cms_')) {
        const rawCms = await getMovieDetail(id, apiUrl);
        if (rawCms) {
            movieName = rawCms.vod_name;
            doubanMetadata = await fetchDoubanData(movieName);
        } else if (!rawCms) {
            return null; // 彻底找不到源
        }
    }

    // 如果最终都没拿到元数据，尝试使用基础 CMS 数据返回
    if (!doubanMetadata) {
        const fallback = await getMovieDetail(id, apiUrl);
        if (!fallback) return null;
        const res = { main: fallback, alternatives: [] };
        setCache(cacheKey, res);
        return res;
    }

    const mainDetail: VodDetail = {
        vod_id: doubanMetadata.doubanId || id,
        vod_name: movieName || doubanMetadata.title || '未知影片',
        vod_pic: doubanMetadata.pic || '',
        vod_content: doubanMetadata.content || '',
        vod_score: doubanMetadata.score || '',
        vod_actor: doubanMetadata.actor || '',
        vod_director: doubanMetadata.director || '',
        vod_area: doubanMetadata.area || '',
        vod_lang: doubanMetadata.lang || '',
        vod_year: doubanMetadata.year || '',
        vod_remarks: '',
        vod_play_url: '',
        vod_play_from: '',
        vod_writer: doubanMetadata.writer,
        vod_pubdate: doubanMetadata.pubdate,
        vod_reviews: doubanMetadata.reviews,
        vod_recs: doubanMetadata.recs,
        vod_actors_extended: doubanMetadata.actorsExtended,
        type_name: doubanMetadata.type_name
    };

    const sources = getVodSources().filter(s => s.active);
    const searchPromises = sources.map(async (s) => {
        try {
            const params = new URLSearchParams({ ac: 'detail', wd: mainDetail.vod_name });
            const data = await fetchCmsData(s.api, params);
            // 模糊匹配：移除常见冗余字符后再比较
            const clean = (s: string) => s.replace(/\s+/g, '').toLowerCase();
            const target = clean(mainDetail.vod_name);
            const exact = data?.list?.find((v: any) => clean(v.vod_name).includes(target) || target.includes(clean(v.vod_name)));
            if (exact) { exact.api_url = s.api; return exact; }
        } catch(e) {}
        return null;
    });

    const results = (await Promise.all(searchPromises)).filter((r): r is VodDetail => r !== null);
    
    if (results.length > 0) {
        // 合并播放源
        mainDetail.vod_play_url = results[0].vod_play_url;
        mainDetail.vod_play_from = results[0].vod_play_from;
        mainDetail.api_url = results[0].api_url;
        mainDetail.vod_remarks = results[0].vod_remarks;
        const res = { main: mainDetail, alternatives: results.slice(1) };
        setCache(cacheKey, res);
        return res;
    }

    const finalRes = { main: mainDetail, alternatives: [] };
    setCache(cacheKey, finalRes);
    return finalRes;
};

export const enrichVodDetail = async (detail: VodDetail): Promise<Partial<VodDetail> | null> => {
    try {
        const doubanData = await fetchDoubanData(detail.vod_name, detail.vod_douban_id);
        if (doubanData) {
            const updates: Partial<VodDetail> = {};
            if (doubanData.score) updates.vod_score = doubanData.score;
            if (doubanData.pic) updates.vod_pic = doubanData.pic;
            if (doubanData.content) updates.vod_content = doubanData.content;
            if (doubanData.director) updates.vod_director = doubanData.director;
            if (doubanData.actor) updates.vod_actor = doubanData.actor;
            if (doubanData.writer) updates.vod_writer = doubanData.writer;
            if (doubanData.pubdate) updates.vod_pubdate = doubanData.pubdate;
            if (doubanData.type_name) updates.type_name = doubanData.type_name;
            if (doubanData.recs) updates.vod_recs = doubanData.recs;
            if (doubanData.actorsExtended) updates.vod_actors_extended = doubanData.actorsExtended;
            if (doubanData.reviews) updates.vod_reviews = doubanData.reviews;
            return updates;
        }
    } catch (e) {}
    return null;
};

export const getMovieDetail = async (id: number | string, apiUrl?: string): Promise<VodDetail | null> => {
    const realId = String(id).replace('cms_', '');
    // 如果没有指定 API URL，则遍历所有活跃源寻找此 ID（可能稍慢，但能保证刷新成功）
    const sources = apiUrl ? [{ api: apiUrl }] : getVodSources().filter(s => s.active);
    const params = new URLSearchParams({ ac: 'detail', ids: realId });
    for (const source of sources) {
        try {
            const data = await fetchCmsData(source.api, params);
            if (data?.list?.length > 0) {
                const detail = data.list[0] as VodDetail;
                detail.api_url = source.api;
                return detail;
            }
        } catch(e) {}
    }
    return null;
};

export const fetchPersonDetail = async (id: string | number): Promise<PersonDetail | null> => {
    try {
        const url = `https://movie.douban.com/celebrity/${id}/`;
        const html = await fetchWithProxy(url);
        if (!html || typeof html !== 'string') return null;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const name = doc.querySelector('#content h1')?.textContent?.trim() || 'Unknown';
        const pic = (doc.querySelector('#headline .pic img')?.getAttribute('src') || '');
        const intro = doc.querySelector('#intro .bd')?.textContent?.trim() || '';
        return { id: String(id), name, pic, intro, works: [] };
    } catch (e) { return null; }
};

export const getDoubanPoster = async (keyword: string): Promise<string | null> => {
    try {
        const suggestUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;
        const data = await fetchWithProxy(suggestUrl);
        if (Array.isArray(data) && data.length > 0 && data[0].img) {
            return data[0].img;
        }
    } catch(e) {}
    return null; 
};

export const parseAllSources = (input: VodDetail | VodDetail[]): PlaySource[] => {
    const details = Array.isArray(input) ? input : [input];
    const allSources: PlaySource[] = [];
    const sourceConfigs = getVodSources();

    details.forEach(detail => {
        if (!detail.vod_play_url || !detail.vod_play_from) return;
        const fromArray = detail.vod_play_from.split('$$$');
        const urlArray = detail.vod_play_url.split('$$$');
        
        let rawSourceName = sourceConfigs.find(s => s.api === detail.api_url)?.name || '采集站';
        const baseSourceName = rawSourceName.split('-')[0].trim().replace(/m3u8/gi, '').trim();

        fromArray.forEach((code, idx) => {
            const urlStr = urlArray[idx];
            if (!urlStr || (!code.toLowerCase().includes('m3u8') && !urlStr.includes('.m3u8'))) return;
            const episodes: Episode[] = [];
            urlStr.split('#').forEach((line, epIdx) => {
                const parts = line.split('$');
                const url = parts.length > 1 ? parts[1] : parts[0];
                if (url && (url.startsWith('http') || url.startsWith('//'))) {
                    episodes.push({ title: parts.length > 1 ? parts[0] : `第${epIdx+1}集`, url: url.startsWith('//') ? `https:${url}` : url, index: epIdx });
                }
            });
            if (episodes.length > 0) {
                allSources.push({ name: baseSourceName, episodes });
            }
        });
    });
    return allSources;
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
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const result: any = { doubanId: String(targetId) };

    const getInfoField = (label: string): string => {
         const plSpan = Array.from(doc.querySelectorAll('#info span.pl')).find(el => el.textContent?.includes(label));
         if (!plSpan) return '';
         const attrsSpan = plSpan.nextElementSibling;
         if (attrsSpan && attrsSpan.classList.contains('attrs')) {
             return attrsSpan.textContent?.trim() || '';
         }
         let curr = plSpan.nextSibling;
         let content = '';
         while(curr && curr.nodeName !== 'BR') { content += curr.textContent; curr = curr.nextSibling; }
         return content.replace(/:/g, '').trim();
    };

    result.title = doc.querySelector('h1 span[property="v:itemreviewed"]')?.textContent?.trim() || keyword;
    result.director = getInfoField('导演');
    result.actor = getInfoField('主演');
    result.area = getInfoField('制片国家/地区');
    result.lang = getInfoField('语言');
    result.year = doc.querySelector('h1 span.year')?.textContent?.replace(/[\(\)]/g, '') || '';
    result.score = doc.querySelector('strong[property="v:average"]')?.textContent?.trim();
    result.content = doc.querySelector('span[property="v:summary"]')?.textContent?.trim();
    result.writer = getInfoField('编剧');
    result.pubdate = getInfoField('首播') || getInfoField('上映日期');
    result.type_name = getInfoField('类型');

    const reviewItems = doc.querySelectorAll('.comment-item');
    if (reviewItems.length > 0) {
        result.reviews = Array.from(reviewItems).slice(0, 10).map(el => {
            let avatar = el.querySelector('.avatar img')?.getAttribute('src') || '';
            if (avatar.includes('?')) avatar = avatar.split('?')[0];
            const user = el.querySelector('.comment-info a')?.textContent?.trim() || '匿名用户';
            const ratingClass = el.querySelector('.rating')?.className || '';
            const ratingNum = ratingClass.match(/allstar(\d+)/)?.[1] || '0';
            const stars = '★'.repeat(parseInt(ratingNum)/10) + '☆'.repeat(5 - parseInt(ratingNum)/10);
            const time = el.querySelector('.comment-time')?.textContent?.trim() || '';
            const content = el.querySelector('.short')?.textContent?.trim() || '';
            const votes = el.querySelector('.votes')?.textContent?.trim() || '0';
            const location = el.querySelector('.comment-location')?.textContent?.trim() || '';
            return { user, avatar, rating: stars, content, time: location ? `${time} · ${location}` : time, useful_count: votes };
        });
    }

    const celebrityItems = doc.querySelectorAll('#celebrities .celebrity');
    if (celebrityItems.length > 0) {
        result.actorsExtended = Array.from(celebrityItems).slice(0, 10).map(el => {
            const name = el.querySelector('.name')?.textContent?.trim() || '';
            const role = el.querySelector('.role')?.textContent?.trim() || '';
            let pic = el.querySelector('.avatar')?.getAttribute('style')?.match(/url\((.*?)\)/)?.[1] || el.querySelector('img')?.getAttribute('src') || '';
            if (pic.includes('?')) pic = pic.split('?')[0];
            return { name, role, pic };
        });
    }

    const recItems = doc.querySelectorAll('#recommendations dl');
    if (recItems.length > 0) {
        result.recs = Array.from(recItems).slice(0, 10).map(el => {
            let pic = el.querySelector('img')?.getAttribute('src') || '';
            if (pic.includes('?')) pic = pic.split('?')[0];
            return {
                name: el.querySelector('img')?.getAttribute('alt') || '',
                pic: pic,
                doubanId: el.querySelector('dd a')?.getAttribute('href')?.match(/subject\/(\d+)/)?.[1]
            };
        });
    }
    result.pic = doc.querySelector('#mainpic img')?.getAttribute('src');
    if (result.pic && result.pic.includes('?')) result.pic = result.pic.split('?')[0];
    
    return result;
  } catch (e) { return null; }
};
