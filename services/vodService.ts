
import { Episode, VodDetail, ApiResponse, ActorItem, RecommendationItem, VodItem, VodSource, PlaySource, HistoryItem, ReviewItem, PersonDetail } from '../types';
import { createClient } from '@supabase/supabase-js';

// --- 配置与初始化 ---
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '';
const GLOBAL_PROXY = 'https://daili.laibo123.dpdns.org/?url=';
const HOME_CACHE_KEY = 'cine_home_data_v4';
const CACHE_TTL = 30 * 60 * 1000;

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

// --- 通用工具 ---
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
        const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
        if (res.ok) {
            const text = await res.text();
            try { return JSON.parse(text); } catch (e) {}
        }
    } catch (e) {}
    return await fetchWithProxy(url);
};

// --- 豆瓣深度数据采集 ---
export const fetchDoubanData = async (keyword: string, doubanId?: string | number): Promise<any | null> => {
  try {
    let targetId = doubanId;
    if (!targetId || targetId === '0' || targetId === 0) {
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
         if (attrsSpan && attrsSpan.classList.contains('attrs')) return attrsSpan.textContent?.trim() || '';
         let curr = plSpan.nextSibling;
         let content = '';
         while(curr && curr.nodeName !== 'BR') {
             if (curr.nodeType === Node.ELEMENT_NODE && (curr as Element).classList.contains('pl')) break;
             content += curr.textContent;
             curr = curr.nextSibling;
         }
         return content.replace(/:/g, '').trim();
    };

    result.title = doc.querySelector('h1 span[property="v:itemreviewed"]')?.textContent?.trim() || keyword;
    result.director = getInfoField('导演');
    result.actor = getInfoField('主演');
    result.area = getInfoField('制片国家/地区');
    result.lang = getInfoField('语言');
    result.year = doc.querySelector('h1 span.year')?.textContent?.replace(/[\(\)]/g, '') || '';
    result.score = doc.querySelector('strong[property="v:average"]')?.textContent?.trim();
    result.content = doc.querySelector('span[property="v:summary"]')?.textContent?.trim() || doc.querySelector('.all.hidden')?.textContent?.trim();
    result.writer = getInfoField('编剧');
    result.pubdate = getInfoField('首播') || getInfoField('上映日期');
    result.type_name = getInfoField('类型');
    result.episodeCount = getInfoField('集数');
    result.duration = getInfoField('单集片长') || getInfoField('片长');
    result.alias = getInfoField('又名');
    result.imdb = getInfoField('IMDb');

    // 短评抓取
    const reviewItems = doc.querySelectorAll('.comment-item');
    if (reviewItems.length > 0) {
        result.reviews = Array.from(reviewItems).slice(0, 10).map(el => {
            const avatar = el.querySelector('.avatar img')?.getAttribute('src') || '';
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

    // 带头像的演职人员
    const celebrityItems = doc.querySelectorAll('#celebrities .celebrity');
    if (celebrityItems.length > 0) {
        result.actorsExtended = Array.from(celebrityItems).slice(0, 15).map(el => {
            const name = el.querySelector('.name')?.textContent?.trim() || '';
            const role = el.querySelector('.role')?.textContent?.trim() || '';
            let pic = el.querySelector('.avatar')?.getAttribute('style')?.match(/url\((.*?)\)/)?.[1] || el.querySelector('img')?.getAttribute('src') || '';
            if (pic && pic.startsWith('//')) pic = 'https:' + pic;
            return { name, role, pic: pic.replace(/s_ratio_poster|m(?=\/public)/, 'l') };
        });
    }

    // 相关推荐
    const recItems = doc.querySelectorAll('#recommendations dl');
    if (recItems.length > 0) {
        result.recs = Array.from(recItems).slice(0, 12).map(el => ({
            name: el.querySelector('img')?.getAttribute('alt') || '',
            pic: el.querySelector('img')?.getAttribute('src') || '',
            doubanId: el.querySelector('dd a')?.getAttribute('href')?.match(/subject\/(\d+)/)?.[1]
        }));
    }

    result.pic = doc.querySelector('#mainpic img')?.getAttribute('src');
    return result;
  } catch (e) { return null; }
};

// --- 详情与搜索逻辑 ---
export const getAggregatedMovieDetail = async (id: number | string, apiUrl?: string, vodName?: string): Promise<{ main: VodDetail, alternatives: VodDetail[] } | null> => {
    let movieName = vodName || '';
    let doubanMetadata = await fetchDoubanData(movieName, String(id).startsWith('cms_') ? undefined : id);
    if (doubanMetadata) movieName = doubanMetadata.title;

    if (!doubanMetadata && String(id).startsWith('cms_')) {
        const rawCms = await getMovieDetail(id, apiUrl);
        if (rawCms) {
            movieName = rawCms.vod_name;
            doubanMetadata = await fetchDoubanData(movieName);
        }
    }

    if (!doubanMetadata) {
        const fallback = await getMovieDetail(id, apiUrl);
        return fallback ? { main: fallback, alternatives: [] } : null;
    }

    const mainDetail: VodDetail = {
        vod_id: doubanMetadata.doubanId || id,
        vod_name: movieName,
        vod_pic: doubanMetadata.pic || '',
        vod_content: doubanMetadata.content || '',
        vod_score: doubanMetadata.score || '',
        vod_actor: doubanMetadata.actor || '',
        vod_director: doubanMetadata.director || '',
        vod_area: doubanMetadata.area || '',
        vod_lang: doubanMetadata.lang || '',
        vod_year: doubanMetadata.year || '',
        vod_writer: doubanMetadata.writer,
        vod_pubdate: doubanMetadata.pubdate,
        vod_episode_count: doubanMetadata.episodeCount,
        vod_duration: doubanMetadata.duration,
        vod_alias: doubanMetadata.alias,
        vod_imdb: doubanMetadata.imdb,
        vod_reviews: doubanMetadata.reviews,
        vod_recs: doubanMetadata.recs,
        vod_actors_extended: doubanMetadata.actorsExtended,
        type_name: doubanMetadata.type_name,
        vod_play_url: '',
        vod_play_from: ''
    };

    const sources = getVodSources().filter(s => s.active);
    const searchPromises = sources.map(async (s) => {
        try {
            const params = new URLSearchParams({ ac: 'detail', wd: mainDetail.vod_name });
            const data = await fetchCmsData(s.api, params);
            const exact = data?.list?.find((v: any) => v.vod_name === mainDetail.vod_name || v.vod_name.includes(mainDetail.vod_name));
            if (exact) { exact.api_url = s.api; return exact; }
        } catch(e) {}
        return null;
    });

    const results = (await Promise.all(searchPromises)).filter((r): r is VodDetail => r !== null);
    if (results.length > 0) {
        mainDetail.vod_play_url = results[0].vod_play_url;
        mainDetail.vod_play_from = results[0].vod_play_from;
        mainDetail.api_url = results[0].api_url;
        mainDetail.vod_remarks = results[0].vod_remarks;
    }
    return { main: mainDetail, alternatives: results.slice(1) };
};

export const getMovieDetail = async (id: number | string, apiUrl?: string): Promise<VodDetail | null> => {
    const realId = String(id).replace('cms_', '');
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

export const getHomeSections = async () => {
    try {
        const cached = localStorage.getItem(HOME_CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) return data;
        }
    } catch (e) {}

    const fetchDoubanJson = async (type: string, tag: string, limit: number): Promise<VodItem[]> => {
        const data = await fetchWithProxy(`https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&page_limit=${limit}&page_start=0`);
        if (data && data.subjects) {
            return data.subjects.map((item: any) => ({
                vod_id: item.id,
                vod_name: item.title,
                vod_pic: item.cover,
                vod_score: item.rate,
                // Fix: Cast 'douban' to literal type to satisfy VodItem interface
                source: 'douban' as const,
                type_name: tag
            }));
        }
        return [];
    };

    const [movies, series, anime, variety] = await Promise.all([
        fetchDoubanJson('movie', '热门', 18),
        fetchDoubanJson('tv', '热门', 18),
        fetchDoubanJson('tv', '日本动画', 18),
        fetchDoubanJson('tv', '综艺', 18)
    ]);

    const data = { movies, series, anime, variety };
    localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    return data;
};

export const getAggregatedSearch = async (keyword: string): Promise<VodItem[]> => {
    const suggest = await fetchWithProxy(`https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`);
    const doubanResults = Array.isArray(suggest) ? suggest.map((item: any) => ({
        vod_id: item.id,
        vod_name: item.title,
        vod_pic: item.img,
        // Fix: Cast 'douban' to literal type 'douban' to satisfy VodItem interface requirement.
        source: 'douban' as const,
        type_name: item.type === 'celebrity' ? 'celebrity' : (item.type || '影视')
    })) : [];

    const sources = getVodSources().filter(s => s.active);
    const params = new URLSearchParams({ ac: 'detail', wd: keyword });
    const cmsPromises = sources.map(async (source) => {
        try {
            const data = await fetchCmsData(source.api, params);
            if (data && data.list) {
                return data.list.map((item: any) => ({
                    vod_id: `cms_${item.vod_id}`,
                    vod_name: item.vod_name,
                    vod_pic: item.vod_pic,
                    vod_remarks: item.vod_remarks,
                    type_name: item.type_name,
                    vod_year: item.vod_year,
                    // Fix: Cast 'cms' to literal type 'cms' to satisfy VodItem interface requirement.
                    source: 'cms' as const,
                    api_url: source.api
                }));
            }
        } catch(e) {}
        return [];
    });
    const cmsResults = (await Promise.all(cmsPromises)).flat();
    
    const resultMap = new Map<string, VodItem>();
    doubanResults.forEach(item => resultMap.set(item.vod_name, item as VodItem));
    cmsResults.forEach(item => { if (!resultMap.has(item.vod_name)) resultMap.set(item.vod_name, item as VodItem); });
    return Array.from(resultMap.values());
};

export const fetchCategoryItems = async (category: string, options: any) => {
    const type = category === 'movies' ? 'movie' : 'tv';
    const tag = options.filter2 === '全部' ? '热门' : options.filter2;
    const data = await fetchWithProxy(`https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&page_limit=60&page_start=0`);
    if (data && data.subjects) {
        return data.subjects.map((item: any) => ({
            vod_id: item.id,
            vod_name: item.title,
            vod_pic: item.cover,
            vod_score: item.rate,
            // Fix: Cast 'douban' to literal type 'douban' to satisfy VodItem interface requirement.
            source: 'douban' as const
        }));
    }
    return [];
};

export const getVodSources = (): VodSource[] => {
    try {
        const stored = localStorage.getItem('cine_vod_sources');
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return [DEFAULT_SOURCE];
};

export const saveVodSources = (sources: VodSource[]) => {
    localStorage.setItem('cine_vod_sources', JSON.stringify(sources));
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
    const newSource: VodSource = {
        id: Date.now().toString(),
        name: name.trim(),
        api: api.trim(),
        active: true,
        canDelete: true
    };
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
    const filtered = sources.filter(s => s.id !== id);
    saveVodSources(filtered);
    if (supabase && target) {
        try {
            await supabase.from('cine_sources').delete().eq('api', target.api);
        } catch (e) {}
    }
};

export const resetVodSources = async () => {
    localStorage.removeItem('cine_vod_sources');
    if (supabase) {
        await initVodSources();
        return getVodSources();
    }
    return [DEFAULT_SOURCE];
};

export const parseAllSources = (input: VodDetail | VodDetail[]): PlaySource[] => {
    const details = Array.isArray(input) ? input : [input];
    const allSources: PlaySource[] = [];
    details.forEach(detail => {
        if (!detail.vod_play_url || !detail.vod_play_from) return;
        const fromArray = detail.vod_play_from.split('$$$');
        const urlArray = detail.vod_play_url.split('$$$');
        fromArray.forEach((code, idx) => {
            const urlStr = urlArray[idx];
            if (!urlStr || !urlStr.includes('.m3u8')) return;
            const episodes: Episode[] = [];
            urlStr.split('#').forEach((line, epIdx) => {
                const parts = line.split('$');
                const url = parts.length > 1 ? parts[1] : parts[0];
                if (url) episodes.push({ title: parts.length > 1 ? parts[0] : `第${epIdx+1}集`, url, index: epIdx });
            });
            if (episodes.length > 0) allSources.push({ name: code.includes('m3u8') ? '官方线路' : code, episodes });
        });
    });
    return allSources;
};

export const getHistory = (): HistoryItem[] => {
    try {
        const stored = localStorage.getItem('cine_watch_history');
        if (stored) return JSON.parse(stored);
    } catch(e) {}
    return [];
};

export const addToHistory = (item: HistoryItem) => {
    let history = getHistory();
    history = history.filter(h => String(h.vod_id) !== String(item.vod_id));
    history.unshift(item);
    if (history.length > 20) history = history.slice(0, 20);
    localStorage.setItem('cine_watch_history', JSON.stringify(history));
    return history;
};

export const clearAppCache = () => {
    localStorage.removeItem(HOME_CACHE_KEY);
    localStorage.removeItem('cine_cache_home');
};

export const getDoubanPoster = async (keyword: string) => {
    const data = await fetchWithProxy(`https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`);
    if (Array.isArray(data) && data.length > 0) return data[0].img;
    return null;
};

export const fetchPersonDetail = async (id: string | number): Promise<PersonDetail | null> => {
    try {
        const html = await fetchWithProxy(`https://movie.douban.com/celebrity/${id}/`);
        if (!html || typeof html !== 'string') return null;
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const name = doc.querySelector('#content h1')?.textContent?.trim() || 'Unknown';
        const pic = (doc.querySelector('#headline .pic img')?.getAttribute('src') || '').replace(/s_ratio_poster|m(?=\/public)/, 'l');
        return { id: String(id), name, pic, works: [] };
    } catch (e) { return null; }
};

export const fetchDanmaku = async (keyword: string, ep: number): Promise<any[]> => [];
