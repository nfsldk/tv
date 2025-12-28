import { Episode, VodDetail, ApiResponse, ActorItem, RecommendationItem, VodItem, VodSource, PlaySource, HistoryItem, PersonDetail } from '../types';
import { createClient } from '@supabase/supabase-js';

// --- SUPABASE SETUP ---
const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_KEY || process.env.VITE_SUPABASE_KEY || '';

let supabase: any = null;
if (SUPABASE_URL && SUPABASE_KEY) {
    try {
        supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    } catch (e) {}
}

const DEFAULT_SOURCE: VodSource = {
    id: 'default',
    name: '默认源 (官方)',
    api: 'https://caiji.dyttzyapi.com/api.php/provide/vod',
    active: true,
    canDelete: false
};

// 动态获取代理地址
export const getGlobalProxy = () => {
    return localStorage.getItem('cine_ai_proxy') || 'https://daili.laidd.de5.net/?url=';
};

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
    saveVodSources(sources.filter(s => s.id !== id));
    if (supabase && target) {
        try {
            await supabase.from('cine_sources').delete().eq('id', id);
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
      const proxyUrl = `${getGlobalProxy()}${encodeURIComponent(targetUrl)}`;
      const response = await fetchWithTimeout(proxyUrl, options, 8000);
      if (response.ok) {
          const text = await response.text();
          try { return JSON.parse(text); } catch(e) { return text; }
      }
  } catch (e) {
      // 如果代理也失败了，最后尝试一次直连（万一用户现在开了代理但没填地址）
      try {
          const res = await fetchWithTimeout(targetUrl, options, 3000);
          if (res.ok) return await res.json();
      } catch (e2) {}
  }
  return null;
};

const fetchCmsData = async (baseUrl: string, params: URLSearchParams): Promise<any> => {
    params.set('out', 'json');
    const url = `${baseUrl}?${params.toString()}`;
    try {
        // 先尝试直连（国内 CMS 源通常比较快）
        const res = await fetchWithTimeout(url, {}, 4000);
        if (res.ok) {
            const text = await res.text();
            try { return JSON.parse(text); } catch (e) {}
        }
    } catch (e) {}
    // 直连失败走代理
    return await fetchWithProxy(url);
};

const fetchDoubanJson = async (type: string, tag: string, limit = 12, sort = 'recommend', startOffset = 0): Promise<VodItem[]> => {
    const doubanUrl = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=${sort}&page_limit=${limit}&page_start=${startOffset}`;
    try {
        // 豆瓣搜索必须走代理或伪造 UA
        const data = await fetchWithProxy(doubanUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
        });
        if (data && data.subjects && Array.isArray(data.subjects)) {
            return data.subjects.map((item: any) => ({
                vod_id: item.id, vod_name: item.title, vod_pic: item.cover || '', vod_score: item.rate, type_name: tag, source: 'douban', vod_year: '2024'
            }));
        }
    } catch (e) {}
    return [];
};

export const getHomeSectionsCached = () => {
    try {
        const cached = localStorage.getItem(HOME_CACHE_KEY);
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            if (Date.now() - timestamp < CACHE_TTL) {
                if (data.movies && data.movies.length > 0) return data;
            }
        }
    } catch (e) {}
    return null;
};

export const getHomeSections = async (forceRefresh = false) => {
    if (!forceRefresh) {
        const cachedData = getHomeSectionsCached();
        if (cachedData) return cachedData;
    }

    const safeFetch = async (fn: Promise<VodItem[]>) => { 
        try { 
            const res = await fn; 
            return Array.isArray(res) ? res : []; 
        } catch (e) { 
            return []; 
        } 
    };

    const results = await Promise.all([
        safeFetch(fetchDoubanJson('movie', '热门', 18)),
        safeFetch(fetchDoubanJson('tv', '热门', 18)),
        safeFetch(fetchDoubanJson('tv', '短剧', 18)),
        safeFetch(fetchDoubanJson('tv', '日本动画', 18)),
        safeFetch(fetchDoubanJson('tv', '综艺', 18))
    ]);

    const finalResult = { 
        movies: results[0], 
        series: results[1], 
        shortDrama: results[2], 
        anime: results[3], 
        variety: results[4] 
    };

    // 只要有任何数据，就存入缓存
    if (finalResult.movies.length > 0 || finalResult.series.length > 0) {
        try { 
            localStorage.setItem(HOME_CACHE_KEY, JSON.stringify({ data: finalResult, timestamp: Date.now() })); 
        } catch (e) {}
    }
    return finalResult;
};

export const fetchCategoryItems = async (
    category: string, 
    options: { filter1?: string, filter2?: string, page?: number } = {}
): Promise<VodItem[]> => {
    const { filter1 = '全部', filter2 = '全部', page = 1 } = options;
    const limit = 20;
    const start = (page - 1) * limit;
    let type = 'movie', tag = '热门', sort = 'recommend';
    switch (category) {
        case 'movies':
            if (filter1 === '最新电影') sort = 'time'; else if (filter1 === '豆瓣高分') sort = 'rank'; else if (filter1 === '冷门佳片') tag = '冷门佳片';
            if (filter2 !== '全部') tag = filter2; break;
        case 'series':
            type = 'tv'; if (filter2 === '国产') tag = '国产剧'; else if (filter2 === '欧美') tag = '美剧'; else if (filter2 === '日本') tag = '日剧'; else if (filter2 === '韩国') tag = '韩剧'; else if (filter2 === '动漫') tag = '日本动画'; else if (filter2 !== '全部') tag = filter2; break;
        case 'anime':
            type = 'tv'; tag = '日本动画'; if (filter1 === '剧场版') { type = 'movie'; } else if (filter2 !== '全部') tag = filter2; break;
        case 'variety':
            type = 'tv'; tag = '综艺'; if (filter2 === '国内' || filter2 === '大陆') tag = '大陆综艺'; else if (filter2 !== '全部') tag = filter2 + '综艺'; break;
    }
    return fetchDoubanJson(type, tag, limit, sort, start);
};

export const searchDouban = async (keyword: string): Promise<VodItem[]> => {
    const searchUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;
    try {
        const data = await fetchWithProxy(searchUrl);
        if (Array.isArray(data)) return data.map((item: any) => ({
            vod_id: item.id, vod_name: item.title, vod_pic: item.img?.replace(/s_ratio_poster|m(?=\/public)/, 'l') || '', vod_score: item.year, type_name: item.type === 'celebrity' ? 'celebrity' : (item.type || '影视'), vod_year: item.year, source: 'douban'
        }));
    } catch(e) {}
    return [];
};

const searchAllCmsResources = async (keyword: string): Promise<VodItem[]> => {
    const sources = getVodSources().filter(s => s.active);
    const params = new URLSearchParams({ ac: 'detail', wd: keyword });
    const promises = sources.map(async (source) => {
        try {
            const data = await fetchCmsData(source.api, params);
            if (data?.list) return data.list.map((item: any) => ({
                vod_id: `cms_${item.vod_id}`, vod_name: item.vod_name, vod_pic: (item.vod_pic?.includes('mac_default') ? '' : item.vod_pic) || '', vod_remarks: item.vod_remarks, type_name: item.type_name, vod_year: item.vod_year, vod_score: item.vod_score, source: 'cms', api_url: source.api, vod_actor: item.vod_actor, vod_director: item.vod_director
            }));
        } catch(e) {}
        return [];
    });
    const results = await Promise.all(promises);
    return results.flat();
};

export const getAggregatedSearch = async (keyword: string): Promise<VodItem[]> => {
    const [doubanResults, cmsResults] = await Promise.all([searchDouban(keyword), searchAllCmsResources(keyword)]);
    const finalResults = [...doubanResults];
    const seen = new Set(doubanResults.map(i => i.vod_name));
    cmsResults.forEach(item => { if (!seen.has(item.vod_name.trim())) { finalResults.push(item); seen.add(item.vod_name.trim()); } });
    return finalResults;
};

export const fetchPersonDetail = async (id: string | number): Promise<PersonDetail | null> => {
    try {
        const html = await fetchWithProxy(`https://movie.douban.com/celebrity/${id}/`);
        if (!html || typeof html !== 'string') return null;
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const works: VodItem[] = [];
        doc.querySelectorAll('#best_works .bd ul li, #recent_movies .bd ul li').forEach(li => { 
            const a = li.querySelector('.pic a'), img = li.querySelector('.pic img'), link = a?.getAttribute('href') || '';
            const subjectId = link.match(/subject\/(\d+)/)?.[1];
            if (subjectId) works.push({ vod_id: subjectId, vod_name: img?.getAttribute('alt') || '', vod_pic: (img?.getAttribute('src') || '').replace(/s_ratio_poster|m(?=\/public)/, 'l'), vod_score: '', type_name: '影视', source: 'douban', vod_year: '' });
        });
        return { id: String(id), name: doc.querySelector('#content h1')?.textContent?.trim() || 'Unknown', pic: (doc.querySelector('#headline .pic img')?.getAttribute('src') || '').replace(/s_ratio_poster|m(?=\/public)/, 'l'), intro: doc.querySelector('#intro .bd')?.textContent?.trim() || '', works };
    } catch (e) { return null; }
};

export const searchCms = async (keyword: string, page = 1): Promise<ApiResponse> => {
  const sources = getVodSources().filter(s => s.active);
  const params = new URLSearchParams({ ac: 'detail', wd: keyword, pg: page.toString() });
  const promises = sources.map(async (source) => {
      try {
          const data = await fetchCmsData(source.api, params);
          if (data?.list) return data.list.map((item: any) => ({ ...item, api_url: source.api }));
      } catch(e) {}
      return [];
  });
  const results = await Promise.all(promises);
  const allList = results.flat();
  return { code: 1, msg: "Success", page, pagecount: 1, limit: "20", total: allList.length, list: allList };
};

export const getMovieDetail = async (id: number | string, apiUrl?: string): Promise<VodDetail | null> => {
  const params = new URLSearchParams({ ac: 'detail', ids: id.toString() });
  const sourcesToTry = apiUrl ? [{ api: apiUrl, name: 'Target' }] : getVodSources().filter(s => s.active);
  for (const source of sourcesToTry) {
      try {
          const data = await fetchCmsData(source.api, params);
          if (data?.list?.[0]) {
              const detail = data.list[0] as VodDetail;
              detail.api_url = source.api;
              return detail;
          }
      } catch(e) {}
  }
  return null;
};

export const getAggregatedMovieDetail = async (id: number | string, apiUrl?: string): Promise<{ main: VodDetail, alternatives: VodDetail[] } | null> => {
    const mainDetail = await getMovieDetail(String(id).replace('cms_', ''), apiUrl);
    if (!mainDetail) return null;
    const otherSources = getVodSources().filter(s => s.active && s.api !== mainDetail.api_url);
    const promises = otherSources.map(async s => {
        try {
            const data = await fetchCmsData(s.api, new URLSearchParams({ ac: 'detail', wd: mainDetail.vod_name }));
            const exact = data?.list?.find((v: any) => v.vod_name === mainDetail.vod_name);
            if (exact) { exact.api_url = s.api; return exact; }
        } catch(e) {}
        return null;
    });
    const results = await Promise.all(promises);
    return { main: mainDetail, alternatives: results.filter((r): r is VodDetail => r !== null) };
};

export const getDoubanPoster = async (keyword: string): Promise<string | null> => {
    try {
        const data = await fetchWithProxy(`https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`);
        if (data?.[0]?.img) return data[0].img.replace(/s_ratio_poster|m(?=\/public)/, 'l');
    } catch(e) {}
    return null; 
};

export const parseAllSources = (input: VodDetail | VodDetail[]): PlaySource[] => {
    const details = Array.isArray(input) ? input : [input];
    const allSources: PlaySource[] = [];
    details.forEach(detail => {
        if (!detail.vod_play_url || !detail.vod_play_from) return;
        const fromArray = detail.vod_play_from.split('$$$'), urlArray = detail.vod_play_url.split('$$$');
        fromArray.forEach((code, idx) => {
            const urlStr = urlArray[idx];
            if (!urlStr || !urlStr.includes('.m3u8')) return;
            const episodes: Episode[] = [], lines = urlStr.split('#');
            lines.forEach((line, epIdx) => {
                const parts = line.split('$'), title = parts.length > 1 ? parts[0] : `第 ${epIdx + 1} 集`, url = parts.length > 1 ? parts[1] : parts[0];
                if (url?.includes('http')) episodes.push({ title: title.includes('http') ? `第 ${epIdx + 1} 集` : title, url: url, index: epIdx });
            });
            if (episodes.length > 0) allSources.push({ name: code, episodes });
        });
    });
    return allSources;
};

export const enrichVodDetail = async (detail: VodDetail): Promise<Partial<VodDetail> | null> => {
    try {
        const d = await fetchDoubanData(detail.vod_name, detail.vod_douban_id);
        if (d) return { vod_score: d.score, vod_pic: d.pic, vod_content: d.content, vod_director: d.director, vod_actor: d.actor, vod_writer: d.writer, vod_pubdate: d.pubdate, vod_episode_count: d.episodeCount, vod_duration: d.duration, vod_alias: d.alias, vod_imdb: d.imdb, vod_area: d.area, vod_lang: d.lang, type_name: d.tag, vod_recs: d.recs, vod_actors_extended: d.actorsExtended };
    } catch (e) { }
    return null;
};

export const fetchDoubanData = async (keyword: string, doubanId?: string | number): Promise<any | null> => {
  try {
    let targetId = doubanId;
    if (!targetId || targetId === '0') {
        const data = await fetchWithProxy(`https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`);
        if (data?.[0]) targetId = data[0].id;
    }
    if (!targetId) return null;
    const html = await fetchWithProxy(`https://movie.douban.com/subject/${targetId}/`);
    if (!html || typeof html !== 'string') return null;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const getField = (label: string) => {
         const pl = Array.from(doc.querySelectorAll('#info span.pl')).find(el => el.textContent?.includes(label));
         if (!pl) return '';
         let next = pl.nextElementSibling;
         if (next?.classList.contains('attrs')) return next.textContent?.trim() || '';
         let content = '', curr = pl.nextSibling;
         while(curr) { if (curr.nodeName === 'BR' || (curr.nodeType === 1 && (curr as Element).classList.contains('pl'))) break; content += curr.textContent; curr = curr.nextSibling; }
         return content.replace(/:/g, '').trim();
    };
    return {
        doubanId: String(targetId), director: getField('导演'), writer: getField('编剧'), actor: getField('主演'), type_name: getField('类型'), area: getField('制片国家/地区'), lang: getField('语言'), pubdate: getField('首播') || getField('上映日期'), episodeCount: getField('集数'), duration: getField('单集片长') || getField('片长'), alias: getField('又名'), imdb: getField('IMDb'),
        content: doc.querySelector('span.all.hidden')?.textContent?.trim() || doc.querySelector('span[property="v:summary"]')?.textContent?.trim() || '',
        score: doc.querySelector('strong[property="v:average"]')?.textContent?.trim(), pic: doc.querySelector('#mainpic img')?.getAttribute('src'),
        actorsExtended: Array.from(doc.querySelectorAll('#celebrities .celebrity')).slice(0, 10).map(el => ({ name: el.querySelector('.name')?.textContent?.trim() || '', role: el.querySelector('.role')?.textContent?.trim() || '', pic: (el.querySelector('.avatar')?.getAttribute('style')?.match(/url\((.*?)\)/)?.[1] || el.querySelector('img')?.getAttribute('src') || '').replace(/s_ratio_poster|m(?=\/public)/, 'l') })),
        recs: Array.from(doc.querySelectorAll('#recommendations dl')).slice(0, 10).map(el => ({ name: el.querySelector('img')?.getAttribute('alt') || '', pic: el.querySelector('img')?.getAttribute('src') || '', doubanId: el.querySelector('dd a')?.getAttribute('href')?.match(/subject\/(\d+)/)?.[1] }))
    };
  } catch (e) { return null; }
};