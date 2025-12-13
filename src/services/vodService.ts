import { Episode, VodDetail, ApiResponse, ActorItem, RecommendationItem, VodItem, VodSource, PlaySource, HistoryItem, PersonDetail } from '../types';
import { createClient } from '@supabase/supabase-js';

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

const DEFAULT_SOURCE: VodSource = {
    id: 'default',
    name: '默认源 (官方)',
    api: 'https://caiji.dyttzyapi.com/api.php/provide/vod',
    active: true,
    canDelete: false
};

const GLOBAL_PROXY = 'https://daili.laidd.de5.net/?url=';
const HOME_CACHE_KEY = 'cine_home_data_v2';
const CACHE_TTL = 30 * 60 * 1000;
const HISTORY_KEY = 'cine_watch_history';
const SOURCES_KEY = 'cine_vod_sources';

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
            const cloudSources = data.map((d: any) => ({
                id: d.id, name: d.name, api: d.api, active: d.active, canDelete: true
            }));
            const combined = [DEFAULT_SOURCE, ...cloudSources];
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
    const filtered = sources.filter(s => s.id !== id);
    saveVodSources(filtered);
    if (supabase && target) {
        try {
            await supabase.from('cine_sources').delete().eq('id', id);
            await supabase.from('cine_sources').delete().eq('api', target.api); // Fallback
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
            await supabase.from('cine_sources').update({ active: newActiveState }).eq('id', id);
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
    try { return await fetchWithProxy(url); } catch (e) { return null; }
};

const fetchDoubanJson = async (type: string, tag: string, limit = 12, sort = 'recommend'): Promise<VodItem[]> => {
    const start = sort === 'recommend' ? Math.floor(Math.random() * 5) : 0; 
    const doubanUrl = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=${sort}&page_limit=${limit}&page_start=${start}`;
    try {
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
    } catch (e) {}
    return [];
};

export const getHomeSections = async () => {
    try {
        const cached = localStorage.getItem(HOME_CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL && data.movies && data.movies.length > 0) return data;
        }
    } catch (e) {}

    const safeFetch = async (fn: Promise<VodItem[]>) => {
        try { const res = await fn; return Array.isArray(res) ? res : []; } catch (e) { return []; }
    };

    const [movies, series, shortDrama, anime, variety] = await Promise.all([
        safeFetch(fetchDoubanJson('movie', '热门', 18)),
        safeFetch(fetchDoubanJson('tv', '热门', 18)),
        safeFetch(fetchDoubanJson('tv', '短剧', 18)), 
        safeFetch(fetchDoubanJson('tv', '日本动画', 18)),
        safeFetch(fetchDoubanJson('tv', '综艺', 18))
    ]);
    
    if (movies.length > 0) {
        localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ data: { movies, series, shortDrama, anime, variety }, timestamp: Date.now() }));
    }
    return { movies, series, shortDrama, anime, variety };
};

export const fetchCategoryItems = async (category: string, options: { filter1?: string, filter2?: string } = {}): Promise<VodItem[]> => {
    const { filter1 = '全部', filter2 = '全部' } = options;
    let type = 'movie', tag = '热门', sort = 'recommend';
    if (category === 'movies') {
        if (filter1 === '最新电影') sort = 'time';
        else if (filter1 === '豆瓣高分') sort = 'rank';
        else if (filter1 === '冷门佳片') tag = '冷门佳片';
        if (filter2 !== '全部') tag = filter2;
    } else if (category === 'series') {
        type = 'tv';
        if (filter2 === '国产') tag = '国产剧';
        else if (filter2 === '欧美') tag = '美剧';
        else if (filter2 === '日本') tag = '日剧';
        else if (filter2 === '韩国') tag = '韩剧';
        else if (filter2 === '动漫') tag = '日本动画';
        else if (filter2 !== '全部') tag = filter2;
    } else if (category === 'anime') {
        type = 'tv'; tag = '日本动画';
        if (filter1 === '剧场版') { type = 'movie'; } 
        else if (filter2 !== '全部') tag = filter2;
    } else if (category === 'variety') {
        type = 'tv'; tag = '综艺';
        if (filter2 !== '全部') tag = filter2 + '综艺';
    }
    return await fetchDoubanJson(type, tag, 60, sort);
};

export const searchDouban = async (keyword: string): Promise<VodItem[]> => {
    const searchUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;
    try {
        const data = await fetchWithProxy(searchUrl);
        if (Array.isArray(data)) {
            return data.map((item: any) => ({
                vod_id: item.id,
                vod_name: item.title,
                vod_pic: item.img ? item.img.replace(/s_ratio_poster|m(?=\/public)/, 'l') : '',
                vod_score: item.year,
                type_name: item.type === 'celebrity' ? 'celebrity' : (item.type || '影视'),
                vod_year: item.year,
                source: 'douban'
            }));
        }
    } catch(e) {}
    return [];
};

const searchAllCmsResources = async (keyword: string): Promise<VodItem[]> => {
    const sources = getVodSources().filter(s => s.active);
    const params = new URLSearchParams({ ac: 'detail', wd: keyword });
    const promises = sources.map(async (source) => {
        try {
            const data = await fetchCmsData(source.api, params);
            if (data && (data.list || data.code === 1)) {
                return (data.list || []).map((item: any) => ({
                    vod_id: `cms_${item.vod_id}`,
                    vod_name: item.vod_name,
                    vod_pic: item.vod_pic,
                    vod_remarks: item.vod_remarks,
                    type_name: item.type_name,
                    vod_year: item.vod_year,
                    vod_score: item.vod_score,
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

export const getAggregatedSearch = async (keyword: string): Promise<VodItem[]> => {
    const [doubanResults, cmsResults] = await Promise.all([searchDouban(keyword), searchAllCmsResources(keyword)]);
    const finalResults = [...doubanResults];
    const existingNames = new Set(doubanResults.map(i => i.vod_name));
    cmsResults.forEach((item: VodItem) => {
        if (!existingNames.has(item.vod_name.trim())) {
             finalResults.push(item);
             existingNames.add(item.vod_name.trim());
        }
    });
    return finalResults;
};

export const fetchPersonDetail = async (id: string | number): Promise<PersonDetail | null> => {
    try {
        const url = `https://movie.douban.com/celebrity/${id}/`;
        const html = await fetchWithProxy(url);
        if (!html || typeof html !== 'string') return null;
        
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        const name = doc.querySelector('#content h1')?.textContent?.trim() || 'Unknown';
        const pic = (doc.querySelector('#headline .pic img')?.getAttribute('src') || '').replace(/s_ratio_poster|m(?=\/public)/, 'l');
        
        // --- IMPROVED INTRO PARSING ---
        let intro = '';
        const introBd = doc.querySelector('#intro .bd');
        if (introBd) {
            // Priority 1: Check for "all hidden" span (full text)
            const fullSpan = introBd.querySelector('span.all.hidden');
            if (fullSpan) {
                intro = fullSpan.textContent?.trim() || '';
            } 
            // Priority 2: Standard text content (stripping "expand" link if present)
            else {
                // Clone to safely remove child elements without affecting DOM logic if needed elsewhere
                const clone = introBd.cloneNode(true) as HTMLElement;
                const expandBtn = clone.querySelector('.pl');
                if (expandBtn) expandBtn.remove();
                intro = clone.textContent?.trim() || '';
            }
        }
        // Normalize intro: remove excess whitespace but keep paragraphs
        intro = intro.replace(/\n\s*\n/g, '\n').trim();

        const infoLi = doc.querySelectorAll('#headline .info ul li');
        let gender, constellation, birthdate, birthplace, role;
        
        infoLi.forEach(li => {
            const text = li.textContent || '';
            if (text.includes('性别')) gender = text.replace('性别:', '').trim();
            if (text.includes('星座')) constellation = text.replace('星座:', '').trim();
            if (text.includes('出生日期')) birthdate = text.replace('出生日期:', '').trim();
            if (text.includes('出生地')) birthplace = text.replace('出生地:', '').trim();
            if (text.includes('职业')) role = text.replace('职业:', '').trim();
        });
        
        const worksMap = new Map<string, VodItem>();
        doc.querySelectorAll('#best_works .bd ul li, #recent_movies .bd ul li').forEach(li => {
            const title = li.querySelector('.pic a')?.getAttribute('title') || '';
            if (!title) return;
            
            const subjectId = li.querySelector('.pic a')?.getAttribute('href')?.match(/subject\/(\d+)/)?.[1];
            const picUrl = (li.querySelector('.pic img')?.getAttribute('src') || '').replace(/s_ratio_poster|m(?=\/public)/, 'l');
            const rating = li.querySelector('.rating')?.textContent?.trim() || '';
            
            if (subjectId && !worksMap.has(title)) {
                worksMap.set(title, { 
                    vod_id: subjectId, 
                    vod_name: title, 
                    vod_pic: picUrl, 
                    vod_score: rating, 
                    source: 'douban',
                    type_name: '电影' // Default assumption
                } as VodItem);
            }
        });
        
        return { id: String(id), name, pic, gender, constellation, birthdate, birthplace, role, intro, works: Array.from(worksMap.values()) };
    } catch (e) { return null; }
};

export const searchCms = async (keyword: string, page = 1): Promise<ApiResponse> => {
  const sources = getVodSources().filter(s => s.active);
  const params = new URLSearchParams({ ac: 'detail', wd: keyword, pg: page.toString() });
  const promises = sources.map(async (source) => {
      try {
          const data = await fetchCmsData(source.api, params);
          if (data && (data.code === 1 || (Array.isArray(data.list) && data.list.length > 0))) {
              return (data.list || []).map((item: any) => ({ ...item, api_url: source.api }));
          }
      } catch(e) {}
      return [];
  });
  const results = await Promise.all(promises);
  const allList = results.flat();
  return { code: 1, msg: "Success", page: page, pagecount: 1, limit: "20", total: allList.length, list: allList };
};

export const getMovieDetail = async (id: number | string, apiUrl?: string): Promise<VodDetail | null> => {
  const params = new URLSearchParams({ ac: 'detail', ids: id.toString() });
  const sourcesToTry = apiUrl ? [{ api: apiUrl, name: 'Target' }] : getVodSources().filter(s => s.active);
  for (const source of sourcesToTry) {
      try {
          const data = await fetchCmsData(source.api, params);
          if (data && data.list && data.list.length > 0) {
              const detail = data.list[0] as VodDetail;
              detail.api_url = source.api; 
              return detail;
          }
      } catch(e) {}
  }
  return null;
};

const fetchDetailFromSourceByKeyword = async (source: VodSource, keyword: string): Promise<VodDetail | null> => {
    try {
        const params = new URLSearchParams({ ac: 'detail', wd: keyword });
        let data = await fetchCmsData(source.api, params);
        if (data && data.list && data.list.length > 0) {
             const exact = data.list.find((v: any) => v.vod_name === keyword);
             if (exact) { exact.api_url = source.api; return exact; }
        }
        params.set('ac', 'list');
        data = await fetchCmsData(source.api, params);
        if (data && data.list && data.list.length > 0) {
            const exact = data.list.find((v: any) => v.vod_name === keyword);
            if (exact) {
                 const detailParams = new URLSearchParams({ ac: 'detail', ids: exact.vod_id });
                 const detailData = await fetchCmsData(source.api, detailParams);
                 if (detailData && detailData.list && detailData.list.length > 0) {
                     const detail = detailData.list[0]; detail.api_url = source.api; return detail;
                 }
            }
        }
    } catch(e) {}
    return null;
}

export const getAggregatedMovieDetail = async (id: number | string, apiUrl?: string): Promise<{ main: VodDetail, alternatives: VodDetail[] } | null> => {
    const realId = String(id).replace('cms_', '');
    const mainDetail = await getMovieDetail(realId, apiUrl);
    if (!mainDetail) return null;
    const sources = getVodSources().filter(s => s.active);
    const otherSources = sources.filter(s => s.api !== mainDetail.api_url);
    const promises = otherSources.map(s => fetchDetailFromSourceByKeyword(s, mainDetail.vod_name));
    const results = await Promise.all(promises);
    return { main: mainDetail, alternatives: results.filter((r): r is VodDetail => r !== null) };
};

export const getAlternativeVodDetails = async (mainDetail: VodDetail): Promise<VodDetail[]> => {
    const sources = getVodSources().filter(s => s.active);
    const otherSources = sources.filter(s => s.api !== mainDetail.api_url);
    const promises = otherSources.map(s => fetchDetailFromSourceByKeyword(s, mainDetail.vod_name));
    const results = await Promise.all(promises);
    return results.filter((r): r is VodDetail => r !== null);
};

export const getDoubanPoster = async (keyword: string): Promise<string | null> => {
    try {
        const suggestUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;
        const data = await fetchWithProxy(suggestUrl);
        if (Array.isArray(data) && data.length > 0 && data[0].img) return data[0].img.replace(/s_ratio_poster|m(?=\/public)/, 'l');
    } catch(e) {}
    return null; 
};

export const parseAllSources = (input: VodDetail | VodDetail[]): PlaySource[] => {
    const details = Array.isArray(input) ? input : [input];
    const allSources: PlaySource[] = [];
    details.forEach(detail => {
        if (!detail.vod_play_url || !detail.vod_play_from) return;
        const fromArray = detail.vod_play_from.split('$$$');
        const urlArray = detail.vod_play_url.split('$$$');
        let sourceName = '默认源';
        if (detail.api_url) {
            const matched = getVodSources().find(s => s.api === detail.api_url);
            if (matched) sourceName = matched.name;
        } else if (detail.source === 'douban') sourceName = '豆瓣推荐';

        fromArray.forEach((code, idx) => {
            const urlStr = urlArray[idx];
            if (!urlStr || (!code.toLowerCase().includes('m3u8') && !urlStr.includes('.m3u8'))) return;
            const episodes: Episode[] = [];
            const lines = urlStr.split('#');
            lines.forEach((line, epIdx) => {
                const parts = line.split('$');
                let title = parts.length > 1 ? parts[0] : `第 ${epIdx + 1} 集`;
                const url = parts.length > 1 ? parts[1] : parts[0];
                if (title === code || title.includes('m3u8') || title.startsWith('http')) title = `第 ${epIdx + 1} 集`;
                if (url && (url.startsWith('http') || url.startsWith('//'))) episodes.push({ title, url: url.startsWith('//') ? `https:${url}` : url, index: epIdx });
            });
            if (episodes.length > 0) {
                let finalName = sourceName;
                if (allSources.some(s => s.name === finalName)) finalName = `${sourceName} (${code})`;
                allSources.push({ name: finalName, episodes });
            }
        });
    });
    return allSources;
}

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
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const result: any = { doubanId: String(targetId) };
    const getInfoField = (label: string): string => {
         const plSpan = Array.from(doc.querySelectorAll('#info span.pl')).find(el => el.textContent?.includes(label));
         if (!plSpan) return '';
         let next = plSpan.nextElementSibling;
         if (next && next.classList.contains('attrs')) return next.textContent?.trim() || '';
         let content = ''; let curr = plSpan.nextSibling;
         while(curr) { if (curr.nodeName === 'BR') break; content += curr.textContent; curr = curr.nextSibling; }
         return content.replace(/:/g, '').trim();
    };
    result.director = getInfoField('导演'); result.actor = getInfoField('主演');
    result.content = doc.querySelector('span[property="v:summary"]')?.textContent?.trim().replace(/\s+/g, ' ');
    result.score = doc.querySelector('strong[property="v:average"]')?.textContent?.trim();
    result.pic = doc.querySelector('#mainpic img')?.getAttribute('src');
    const celebrityItems = doc.querySelectorAll('#celebrities .celebrity');
    if (celebrityItems.length > 0) {
        result.actorsExtended = Array.from(celebrityItems).slice(0, 10).map(el => {
            const name = el.querySelector('.name')?.textContent?.trim() || '';
            const role = el.querySelector('.role')?.textContent?.trim() || '';
            let pic = (el.querySelector('img')?.getAttribute('src') || '').replace(/s_ratio_poster|m(?=\/public)/, 'l');
            return { name, role, pic };
        }).filter(a => a.name);
    }
    const recItems = doc.querySelectorAll('#recommendations dl, .recommendations-bd dl');
    if (recItems.length > 0) {
        result.recs = Array.from(recItems).slice(0, 10).map(el => ({
            name: el.querySelector('img')?.getAttribute('alt') || '',
            pic: el.querySelector('img')?.getAttribute('src') || '',
            doubanId: el.querySelector('dd a')?.getAttribute('href')?.match(/subject\/(\d+)/)?.[1]
        })).filter(r => r.name);
    }
    return result;
  } catch (e) { return null; }
};