import { Episode, VodDetail, ApiResponse, ActorItem, RecommendationItem, VodItem } from '../types';

// CMS API Base (For Playback Links ONLY)
const API_BASE = 'https://caiji.dyttzyapi.com/api.php/provide/vod';

// GLOBAL CUSTOM PROXY (The only way to access Douban reliably)
const GLOBAL_PROXY = 'https://daili.laidd.de5.net/?url=';

/**
 * Robust Fetch Utility with Timeout
 */
const fetchWithTimeout = async (url: string, options: RequestInit = {}, timeout = 15000) => {
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
      const response = await fetchWithTimeout(proxyUrl, options, 15000);

      if (response.ok) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
              return await response.json();
          }
          return await response.text();
      }
  } catch (e) {
      console.warn(`Proxy fetch failed for ${targetUrl}`, e);
  }
  return null;
};

/**
 * FETCH DOUBAN JSON (Home & Category Data Source)
 */
const fetchDoubanJson = async (type: string, tag: string, limit = 12, sort = 'recommend'): Promise<VodItem[]> => {
    // Douban internal API format
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
                vod_id: item.id, // Using Douban ID
                vod_name: item.title,
                vod_pic: item.cover || '', 
                vod_score: item.rate,
                type_name: tag,
                source: 'douban', // Mark as Douban source
                vod_year: '2024' // Douban list api doesn't always return year, placeholder
            }));
        }
    } catch (e) {
        console.error("Douban API fetch failed", e);
    }
    
    return [];
};

/**
 * Home Sections - POWERED BY DOUBAN
 */
export const getHomeSections = async () => {
    const safeFetch = async (fn: Promise<VodItem[]>) => {
        try { return await fn; } catch (e) { return []; }
    };

    const [movies, series, shortDrama, anime, variety] = await Promise.all([
        safeFetch(fetchDoubanJson('movie', '热门', 18)),
        safeFetch(fetchDoubanJson('tv', '热门', 18)),
        safeFetch(fetchDoubanJson('tv', '短剧', 18)), // Douban tag for short drama
        safeFetch(fetchDoubanJson('tv', '日本动画', 18)),
        safeFetch(fetchDoubanJson('tv', '综艺', 18))
    ]);
    
    return { movies, series, shortDrama, anime, variety };
};

// ... [Category Filter Logic, mapped to Douban Tags] ...

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
            
            // Douban specific tag mapping
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
            if (filter1 === '剧场版') {
                type = 'movie';
                tag = '日本动画'; 
                sort = 'recommend';
            } 
            else if (['周一', '周二', '周三', '周四', '周五', '周六', '周日'].includes(filter2)) {
                 // Douban doesn't support day filter easily via this API, keep generic
                 tag = '日本动画';
                 sort = 'time'; 
            } else if (filter2 !== '全部') {
                tag = filter2;
            }
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

    return await fetchDoubanJson(type, tag, 60, sort);
};

// ... [CMS Logic for Search & Detail Playback] ...

export const searchMovies = async (keyword: string, page = 1): Promise<ApiResponse> => {
  // Search still goes to CMS to find PLAYABLE content
  const params = new URLSearchParams({
      ac: 'detail',
      wd: keyword,
      pg: page.toString(),
  });
  
  // Use fetchWithProxy but for CMS params
  const targetUrl = `${API_BASE}?${params.toString()}`;
  try {
      const data = await fetchWithProxy(targetUrl);
      if (typeof data === 'object' && (data.code === 1 || Array.isArray(data.list))) {
          return data as ApiResponse;
      }
  } catch(e) {}
  
  return { code: 0, msg: "Error", page: 1, pagecount: 0, limit: "20", total: 0, list: [] };
};

export const getMovieDetail = async (id: number): Promise<VodDetail | null> => {
  const params = new URLSearchParams({
      ac: 'detail',
      ids: id.toString(),
      out: 'json'
  });
  const targetUrl = `${API_BASE}?${params.toString()}`;
  try {
      const data = await fetchWithProxy(targetUrl);
      if (data && data.list && data.list.length > 0) {
          return data.list[0] as VodDetail;
      }
  } catch(e) {}
  return null;
};

// ... [Metadata Helpers] ...

export const getDoubanPoster = async (keyword: string): Promise<string | null> => {
    const searchUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;
    const data = await fetchWithProxy(searchUrl);
    if (Array.isArray(data) && data.length > 0 && data[0].img) {
        return data[0].img.replace(/s_ratio_poster|m(?=\/public)/, 'l');
    }
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

export const enrichVodDetail = async (detail: VodDetail): Promise<Partial<VodDetail> | null> => {
    try {
        const doubanData = await fetchDoubanData(detail.vod_name);
        if (doubanData) {
            const updates: Partial<VodDetail> = {};
            if (doubanData.score) updates.vod_score = doubanData.score;
            if (doubanData.pic) updates.vod_pic = doubanData.pic;
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
    if (!targetId || targetId === '0') {
        const searchUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;
        const data = await fetchWithProxy(searchUrl);
        if (Array.isArray(data) && data.length > 0) targetId = data[0].id;
    }
    if (!targetId) return null;

    const pageUrl = `https://movie.douban.com/subject/${targetId}/`;
    const html = await fetchWithProxy(pageUrl); // This returns text HTML
    if (!html || typeof html !== 'string') return null;
    
    const result: any = { doubanId: String(targetId) };
    const scoreMatch = html.match(/property="v:average">([\d\.]+)<\/strong>/);
    if(scoreMatch) result.score = scoreMatch[1];
    
    const picMatch = html.match(/rel="v:image" src="([^"]+)"/);
    if (picMatch) result.pic = picMatch[1].replace(/s_ratio_poster|m(?=\/public)/, 'l');

    // Extract Recommendations
    const recommendations: RecommendationItem[] = [];
    const recBlockMatch = html.match(/<div class="recommendations-bd"[\s\S]*?>([\s\S]*?)<\/div>/) || html.match(/id="recommendations"[\s\S]*?<div class="bd">([\s\S]*?)<\/div>/);
    if (recBlockMatch) {
        const block = recBlockMatch[1];
        const dlRegex = /<dl>([\s\S]*?)<\/dl>/g;
        let dlMatch;
        while ((dlMatch = dlRegex.exec(block)) !== null) {
            const inner = dlMatch[1];
            const nameMatch = inner.match(/<dd>\s*<a[^>]*>([^<]+)<\/a>/) || inner.match(/title="([^"]+)"/);
            const imgMatch = inner.match(/<img[^>]+src="([^"]+)"/);
            if (nameMatch && imgMatch) {
                recommendations.push({ name: nameMatch[1].trim(), pic: imgMatch[1] });
            }
        }
    }
    if (recommendations.length > 0) result.recs = recommendations;

    return result;
  } catch (e) { return null; }
};