import { Episode, VodDetail, ApiResponse, ActorItem, RecommendationItem, VodItem } from '../types';

// Use a more reliable CMS API Base
// Note: This specific CMS API usually supports CORS and is accessible in CN
const API_BASE = 'https://caiji.dyttzyapi.com/api.php/provide/vod';

/**
 * Robust Fetch Utility with Timeout and Retries
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
 * Generic fetcher for JSON APIs (CMS)
 * Optimized for CN Network: Try Direct First
 */
const fetchWithProxy = async (params: URLSearchParams): Promise<ApiResponse> => {
  const targetUrl = `${API_BASE}?${params.toString()}`;
  
  // Strategy: Direct fetch is the most reliable for this CMS in CN.
  // Proxies are only fallbacks.
  try {
      const response = await fetchWithTimeout(targetUrl, {}, 8000);
      if (response.ok) {
          const data = await response.json();
          // CMS sometimes returns { code: 1, list: [...] } or just { list: [...] }
          if (data && (data.code === 1 || Array.isArray(data.list))) {
              return data;
          }
      }
  } catch (e) {
      console.warn("Direct CMS fetch failed, trying proxy...", e);
  }

  // Fallback Proxies (Only if direct fails)
  const proxies = [
      (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
      (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  for (const proxyGen of proxies) {
      try {
          const proxyUrl = proxyGen(targetUrl);
          const response = await fetchWithTimeout(proxyUrl, {}, 6000);
          if (response.ok) {
              const text = await response.text();
              const data = JSON.parse(text);
              if (data && (data.code === 1 || Array.isArray(data.list))) {
                  return data;
              }
          }
      } catch (e) { /* ignore */ }
  }

  throw new Error('Network Error: Unable to fetch data from CMS.');
};

/**
 * Helper to fetch HTML content (for Douban scraping)
 */
const fetchHtmlWithProxy = async (url: string): Promise<string | null> => {
    const strategies = [
        async () => {
            const res = await fetchWithTimeout(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, {}, 4000);
            if (!res.ok) throw new Error('Err');
            const data = await res.json();
            return data.contents; 
        },
        async () => {
            const res = await fetchWithTimeout(`https://thingproxy.freeboard.io/fetch/${url}`, {}, 4000);
            if (!res.ok) throw new Error('Err');
            return await res.text();
        }
    ];

    for (const strategy of strategies) {
        try {
            const html = await strategy();
            if (html && html.length > 500) return html;
        } catch (e) { /* ignore */ }
    }
    return null;
};

/**
 * Fetch List from CMS directly (Stable)
 */
const fetchCMSList = async (typeId: number, limit = 12, page = 1): Promise<VodItem[]> => {
    const params = new URLSearchParams({
        ac: 'detail', 
        t: typeId.toString(),
        pg: page.toString(),
        pagesize: limit.toString(),
    });

    try {
        const res = await fetchWithProxy(params);
        if (res.list && Array.isArray(res.list)) {
            return res.list.map((item: any) => ({
                vod_id: item.vod_id,
                vod_name: item.vod_name,
                vod_pic: item.vod_pic,
                vod_score: item.vod_score || 'N/A',
                type_name: item.type_name,
                vod_year: item.vod_year,
                vod_remarks: item.vod_remarks,
                source: 'cms' as const
            }));
        }
    } catch (e) {
        console.error(`CMS Fetch type ${typeId} failed`, e);
    }
    return [];
};

/**
 * Updated Home Sections: Use CMS Data primarily
 * Type IDs: 1=Movie, 2=Series, 3=Variety, 4=Anime (Standard CMS mapping)
 */
export const getHomeSections = async () => {
    // Helper to catch errors so one failure doesn't break the whole page
    const safeFetch = async (tid: number, limit: number) => {
        try { return await fetchCMSList(tid, limit); } 
        catch (e) { return []; }
    };

    const [movies, series, shortDrama, anime, variety] = await Promise.all([
        safeFetch(1, 12), // Movies
        safeFetch(2, 12), // Series
        safeFetch(24, 12), // Short Drama
        safeFetch(4, 12), // Anime
        safeFetch(3, 12)  // Variety
    ]);
    
    return { 
        movies, 
        series, 
        shortDrama: shortDrama.length > 0 ? shortDrama : series.slice(0, 6), 
        anime, 
        variety 
    };
};

// Map Sub-Categories to CMS Type IDs
// 1: Movie (Action:6, Comedy:7, Romance:8, SciFi:9, Horror:10, Drama:11, War:12)
// 2: Series (Domestic:13, HK/TW:14, Japan/Korea:15, Euro/US:16)
// 3: Variety
// 4: Anime
const TYPE_ID_MAP: Record<string, number> = {
    // Movies
    '动作': 6, '喜剧': 7, '爱情': 8, '科幻': 9, '恐怖': 10, '剧情': 11, '战争': 12,
    // Series
    '国产': 13, '港台': 14, '日韩': 15, '欧美': 16,
    // Main Categories (Fallback)
    'movies': 1, 'series': 2, 'variety': 3, 'anime': 4
};

export const fetchCategoryItems = async (
    category: string, 
    options: { filter1?: string, filter2?: string } = {}
): Promise<VodItem[]> => {
    
    const { filter2 = '全部' } = options;
    
    let typeId = TYPE_ID_MAP[category] || 1; // Default to Movie

    // Try to find specific type ID from filter2 (Genre/Region)
    if (filter2 !== '全部') {
        if (category === 'series') {
             if (filter2 === '国产') typeId = 13;
             else if (filter2 === '港台' || filter2 === '香港' || filter2 === '台湾') typeId = 14;
             else if (filter2 === '日本' || filter2 === '韩国' || filter2 === '日韩') typeId = 15;
             else if (filter2 === '欧美') typeId = 16;
        } else if (category === 'movies') {
             if (TYPE_ID_MAP[filter2]) typeId = TYPE_ID_MAP[filter2];
        }
    }

    // Always fetch page 1 with larger limit for category view
    return await fetchCMSList(typeId, 24);
};

export const searchMovies = async (keyword: string, page = 1): Promise<ApiResponse> => {
  const params = new URLSearchParams({
      ac: 'detail', // Use detail for search to get full info including pictures
      wd: keyword,
      pg: page.toString(),
      // pagesize: '20' // Optional, API default is usually 20
  });
  return await fetchWithProxy(params);
};

// ... [Keep existing fetchDoubanData, getDoubanPoster, parseEpisodes logic as is] ...

export interface DoubanData {
    doubanId?: string;
    score?: string;
    pic?: string;
    wallpaper?: string; 
    year?: string;
    content?: string;
    director?: string;
    actor?: string;
    area?: string;
    lang?: string;
    tag?: string; 
    writer?: string;
    pubdate?: string;
    episodeCount?: string;
    duration?: string;
    alias?: string;
    imdb?: string;
    recs?: RecommendationItem[];
    actorsExtended?: ActorItem[];
}

export const fetchDoubanData = async (keyword: string, doubanId?: string | number): Promise<DoubanData | null> => {
  try {
    let targetId = doubanId;

    if (!targetId || targetId === '0' || Number(targetId) === 0) {
        const searchUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;
        try {
            const res = await fetchWithTimeout(`https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`, {}, 3000);
            if (res.ok) {
                const wrapped = await res.json();
                const searchData = JSON.parse(wrapped.contents);
                if (Array.isArray(searchData) && searchData.length > 0) {
                    targetId = searchData[0].id;
                }
            }
        } catch(e) {}
    }

    if (!targetId) return null;

    const pageUrl = `https://movie.douban.com/subject/${targetId}/`;
    const html = await fetchHtmlWithProxy(pageUrl);
    
    if (!html) return null;
    
    const result: DoubanData = { doubanId: String(targetId) };
    
    const scoreMatch = html.match(/property="v:average">([\d\.]+)<\/strong>/);
    if (scoreMatch) result.score = scoreMatch[1];

    const picMatch = html.match(/rel="v:image" src="([^"]+)"/);
    if (picMatch) {
        result.pic = picMatch[1].replace(/s_ratio_poster|m(?=\/public)/, 'l');
    }

    const relatedPicsMatch = html.match(/<ul class="related-pic-bd">([\s\S]*?)<\/ul>/);
    if (relatedPicsMatch) {
        const imgs = [...relatedPicsMatch[1].matchAll(/<img src="([^"]+)"/g)];
        if (imgs.length > 0) {
            result.wallpaper = imgs[0][1].replace(/s_ratio_poster|m(?=\/public)/, 'l');
        }
    }

    const summaryMatch = html.match(/property="v:summary"[^>]*>([\s\S]*?)<\/span>/);
    if (summaryMatch) {
        result.content = summaryMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();
    }

    const directors = [...html.matchAll(/rel="v:directedBy">([^<]+)</g)].map(m => m[1]).join(' / ');
    if (directors) result.director = directors;

    const actorsText = [...html.matchAll(/rel="v:starring">([^<]+)</g)].slice(0, 8).map(m => m[1]).join(' / ');
    if (actorsText) result.actor = actorsText;

    const yearMatch = html.match(/property="v:initialReleaseDate" content="(\d{4})/);
    if (yearMatch) result.year = yearMatch[1];

    const areaMatch = html.match(/<span class="pl">制片国家\/地区:<\/span>([\s\S]*?)<br/);
    if (areaMatch) result.area = areaMatch[1].replace(/<[^>]+>/g, '').trim();

    const actorsExtended: ActorItem[] = [];
    const celebrityBlockMatch = html.match(/<ul class="celebrities-list[^>]*>([\s\S]*?)<\/ul>/) || html.match(/id="celebrities"[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/);
    
    if (celebrityBlockMatch) {
        const block = celebrityBlockMatch[1];
        const items = block.split('</li>');
        items.forEach(item => {
            const nameMatch = item.match(/title="([^"]+)" class="name"/) || item.match(/class="name"[^>]*>([^<]+)</);
            const roleMatch = item.match(/class="role"[^>]*>([^<]+)</);
            const picMatch = item.match(/background-image:\s*url\(([^)]+)\)/) || item.match(/<img[^>]+src="([^"]+)"/);
            
            if (nameMatch && picMatch) {
                let picUrl = picMatch[1].replace(/['"]/g, '');
                if (picUrl.includes('default')) return; 
                actorsExtended.push({
                    name: nameMatch[1].trim(),
                    pic: picUrl,
                    role: roleMatch ? roleMatch[1].trim() : '演员'
                });
            }
        });
    }
    if (actorsExtended.length > 0) result.actorsExtended = actorsExtended;

    const recommendations: RecommendationItem[] = [];
    let recBlockMatch = html.match(/<div class="recommendations-bd"[\s\S]*?>([\s\S]*?)<\/div>/);
    if (!recBlockMatch) recBlockMatch = html.match(/id="recommendations"[\s\S]*?<div class="bd">([\s\S]*?)<\/div>/);
    
    if (recBlockMatch) {
        const block = recBlockMatch[1];
        const dlRegex = /<dl>([\s\S]*?)<\/dl>/g;
        let dlMatch;
        while ((dlMatch = dlRegex.exec(block)) !== null) {
            const inner = dlMatch[1];
            const nameMatch = inner.match(/<dd>\s*<a[^>]*>([^<]+)<\/a>/) || inner.match(/title="([^"]+)"/);
            const imgMatch = inner.match(/<img[^>]+src="([^"]+)"/);
            
            if (nameMatch && imgMatch) {
                recommendations.push({
                    name: nameMatch[1].trim(),
                    pic: imgMatch[1],
                });
            }
        }
    }
    if (recommendations.length > 0) result.recs = recommendations;

    return result;

  } catch (e) {
    return null;
  }
};

export const getDoubanPoster = async (keyword: string): Promise<string | null> => {
    return null; 
};

export const parseEpisodes = (urlStr: string, fromStr: string): Episode[] => {
  if (!urlStr || !fromStr) return [];
  const fromArray = fromStr.split('$$$');
  const urlArray = urlStr.split('$$$');
  const sources = fromArray.map((code, idx) => ({
      code: code.toLowerCase(),
      url: urlArray[idx] || '',
      index: idx
  })).filter(s => s.url);
  const m3u8Sources = sources.filter(s => s.code.includes('m3u8') || s.url.includes('.m3u8'));
  const selectedSource = m3u8Sources.length > 0 ? m3u8Sources[0] : sources[0];
  if (!selectedSource) return [];
  const episodes: Episode[] = [];
  const lines = selectedSource.url.split('#');
  lines.forEach((line, idx) => {
      const parts = line.split('$');
      let title = parts.length > 1 ? parts[0] : `第 ${idx + 1} 集`;
      const url = parts.length > 1 ? parts[1] : parts[0];
      if (url && (url.startsWith('http') || url.startsWith('//'))) {
          const finalUrl = url.startsWith('//') ? `https:${url}` : url;
          if (!title || title === finalUrl) title = `EP ${idx + 1}`;
          episodes.push({ title, url: finalUrl, index: idx });
      }
  });
  return episodes;
};

export const getMovieDetail = async (id: number): Promise<VodDetail | null> => {
  const params = new URLSearchParams({
      ac: 'detail',
      ids: id.toString(),
      out: 'json'
  });
  const data = await fetchWithProxy(params);
  if (data.list && data.list.length > 0) {
      return data.list[0] as VodDetail;
  }
  return null;
};

export const enrichVodDetail = async (detail: VodDetail): Promise<Partial<VodDetail> | null> => {
    const potentialId = (detail as any).vod_douban_id;
    try {
        const doubanData = await fetchDoubanData(detail.vod_name, potentialId);
        if (doubanData) {
            const updates: Partial<VodDetail> = {};
            if (doubanData.doubanId) updates.vod_douban_id = doubanData.doubanId;
            if (doubanData.score) {
                updates.vod_douban_score = doubanData.score;
                updates.vod_score = doubanData.score;
            }
            if (doubanData.pic) updates.vod_pic = doubanData.pic;
            if (doubanData.content) updates.vod_content = doubanData.content;
            if (doubanData.year) updates.vod_year = doubanData.year;
            if (doubanData.director) updates.vod_director = doubanData.director;
            if (doubanData.actor) updates.vod_actor = doubanData.actor;
            if (doubanData.area) updates.vod_area = doubanData.area;
            if (doubanData.lang) updates.vod_lang = doubanData.lang;
            if (doubanData.tag) updates.type_name = doubanData.tag;
            if (doubanData.recs && doubanData.recs.length > 0) {
                updates.vod_recs = doubanData.recs;
            }
            if (doubanData.actorsExtended && doubanData.actorsExtended.length > 0) {
                updates.vod_actors_extended = doubanData.actorsExtended;
            }
            return Object.keys(updates).length > 0 ? updates : null;
        }
    } catch (e) {
        // console.warn('Background Douban fetch failed', e);
    }
    return null;
}