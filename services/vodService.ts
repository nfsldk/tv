import { Episode, VodDetail, ApiResponse, ActorItem, RecommendationItem, VodItem } from '../types';

// CMS API Base (For Playback Links ONLY)
const API_BASE = 'https://caiji.dyttzyapi.com/api.php/provide/vod';

// GLOBAL CUSTOM PROXY
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
          const text = await response.text();
          try {
              // Force JSON parse
              return JSON.parse(text);
          } catch(e) {
              return text;
          }
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
        console.error("Douban API fetch failed", e);
    }
    
    return [];
};

export const getHomeSections = async () => {
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

    return await fetchDoubanJson(type, tag, 60, sort);
};

export const searchMovies = async (keyword: string, page = 1): Promise<ApiResponse> => {
  const params = new URLSearchParams({
      ac: 'detail',
      wd: keyword,
      pg: page.toString(),
  });
  
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
            // Always overwrite detail fields if douban has them
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
    const html = await fetchWithProxy(pageUrl);
    if (!html || typeof html !== 'string') return null;
    
    const result: any = { doubanId: String(targetId) };
    const scoreMatch = html.match(/property="v:average">([\d\.]+)<\/strong>/);
    if(scoreMatch) result.score = scoreMatch[1];
    
    const picMatch = html.match(/rel="v:image" src="([^"]+)"/);
    if (picMatch) result.pic = picMatch[1].replace(/s_ratio_poster|m(?=\/public)/, 'l');

    const summaryMatch = html.match(/property="v:summary"[^>]*>([\s\S]*?)<\/span>/);
    if (summaryMatch) result.content = summaryMatch[1].replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').trim();

    // Basic Metadata
    const directors = [...html.matchAll(/rel="v:directedBy">([^<]+)</g)].map(m => m[1]).join(' / ');
    if (directors) result.director = directors;

    const actorsText = [...html.matchAll(/rel="v:starring">([^<]+)</g)].slice(0, 10).map(m => m[1]).join(' / ');
    if (actorsText) result.actor = actorsText;
    
    const yearMatch = html.match(/property="v:initialReleaseDate" content="(\d{4})/);
    if (yearMatch) result.year = yearMatch[1];

    const areaMatch = html.match(/<span class="pl">制片国家\/地区:<\/span>([\s\S]*?)<br/);
    if (areaMatch) result.area = areaMatch[1].replace(/<[^>]+>/g, '').trim();

    const langMatch = html.match(/<span class="pl">语言:<\/span>([\s\S]*?)<br/);
    if (langMatch) result.lang = langMatch[1].replace(/<[^>]+>/g, '').trim();

    const writerMatch = html.match(/<span class="pl">编剧:<\/span>([\s\S]*?)<br/);
    if (writerMatch) result.writer = writerMatch[1].replace(/<a[^>]+>|<\/a>/g, '').trim();

    const pubdateMatch = html.match(/property="v:initialReleaseDate" content="([^"]+)"/);
    if (pubdateMatch) result.pubdate = pubdateMatch[1];

    const epMatch = html.match(/<span class="pl">集数:<\/span>(\d+)/);
    if (epMatch) result.episodeCount = epMatch[1];

    const durMatch = html.match(/property="v:runtime" content="(\d+)"/) || html.match(/<span class="pl">单集片长:<\/span>([\s\S]*?)<br/);
    if (durMatch) result.duration = durMatch[1].trim();

    const aliasMatch = html.match(/<span class="pl">又名:<\/span>([\s\S]*?)<br/);
    if (aliasMatch) result.alias = aliasMatch[1].trim();

    const imdbMatch = html.match(/<span class="pl">IMDb:?<\/span>([\s\S]*?)<br/);
    if (imdbMatch) result.imdb = imdbMatch[1].trim();

    // Extract Actors Extended (Images)
    const actorsExtended: ActorItem[] = [];
    const celebrityBlockMatch = html.match(/<ul class="celebrities-list[^>]*>([\s\S]*?)<\/ul>/) || html.match(/id="celebrities"[\s\S]*?<ul[^>]*>([\s\S]*?)<\/ul>/);
    if (celebrityBlockMatch) {
        const block = celebrityBlockMatch[1];
        const items = block.split('</li>');
        items.forEach(item => {
            const nameMatch = item.match(/title="([^"]+)" class="name"/) || item.match(/class="name"[^>]*>([^<]+)</);
            const roleMatch = item.match(/class="role"[^>]*>([^<]+)</);
            const imgMatch = item.match(/background-image:\s*url\(([^)]+)\)/) || item.match(/<img[^>]+src="([^"]+)"/);
            
            if (nameMatch && imgMatch) {
                let picUrl = imgMatch[1].replace(/['"]/g, '');
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