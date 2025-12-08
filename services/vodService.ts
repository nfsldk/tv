import { Episode, VodDetail, ApiResponse, ActorItem, RecommendationItem, VodItem } from '../types';

// Use a more reliable CMS API Base if possible, or keep existing
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
 * Generic proxy fetcher for JSON APIs (CMS)
 */
const fetchWithProxy = async (params: URLSearchParams): Promise<ApiResponse> => {
  const targetUrl = `${API_BASE}?${params.toString()}`;
  
  // Enhanced Strategy: Prioritize proxies that might work better in restrictive regions
  // Note: Direct access to CMS usually supports CORS and might be faster if not blocked.
  const proxies = [
      // 1. Direct fetch (often best if CMS supports CORS)
      (url: string) => url,
      // 2. AllOrigins (Raw) - often stable
      (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      // 3. ThingProxy
      (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
      // 4. CorsProxy.io (Fast but sometimes blocked)
      (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      // 5. CodeTabs
      (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  ];

  let lastError;

  for (const proxyGen of proxies) {
      try {
          const proxyUrl = proxyGen(targetUrl);
          const response = await fetchWithTimeout(proxyUrl, {}, 5000); // 5s timeout per try

          if (response.ok) {
              const text = await response.text();
              try {
                  // Try parsing as JSON directly
                  const data = JSON.parse(text);
                  if (data && (data.code === 1 || Array.isArray(data.list))) {
                      return data;
                  }
              } catch (e) {
                  // console.warn(`Proxy parse error (${proxyUrl}):`, e);
              }
          }
      } catch (e) {
          lastError = e;
      }
  }

  console.error("All CMS proxies failed.", lastError);
  throw new Error('Network Error: Unable to fetch data from any proxy.');
};

/**
 * Generic proxy fetcher for HTML content (Scraping)
 */
const fetchHtmlWithProxy = async (url: string): Promise<string | null> => {
    // Randomized order for load balancing
    const strategies = [
        // AllOrigins (JSONP style is very robust for cross-origin text fetching)
        async () => {
            const res = await fetchWithTimeout(`https://api.allorigins.win/get?url=${encodeURIComponent(url)}`);
            if (!res.ok) throw new Error('Status ' + res.status);
            const data = await res.json();
            return data.contents; 
        },
        // ThingProxy
        async () => {
            const res = await fetchWithTimeout(`https://thingproxy.freeboard.io/fetch/${url}`);
            if (!res.ok) throw new Error('Status ' + res.status);
            return await res.text();
        },
        // CorsProxy
        async () => {
            const res = await fetchWithTimeout(`https://corsproxy.io/?${encodeURIComponent(url)}`);
            if (!res.ok) throw new Error('Status ' + res.status);
            return await res.text();
        }
    ];

    // Try strategies sequentially
    for (const strategy of strategies) {
        try {
            const html = await strategy();
            if (html && html.length > 500) { // Basic validation
                return html;
            }
        } catch (e) {
            // console.warn('HTML Proxy strategy failed', e);
        }
    }
    
    return null;
  };

/**
 * Fetch Douban JSON API via Proxy with Failover
 */
const fetchDoubanJson = async (type: string, tag: string, limit = 12, sort = 'recommend'): Promise<VodItem[]> => {
    const start = sort === 'recommend' ? Math.floor(Math.random() * 5) : 0; 
    const doubanUrl = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=${sort}&page_limit=${limit}&page_start=${start}`;
    
    const proxies = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(doubanUrl)}`,
        `https://thingproxy.freeboard.io/fetch/${doubanUrl}`,
        `https://corsproxy.io/?${encodeURIComponent(doubanUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(doubanUrl)}`
    ];

    for (const url of proxies) {
        try {
            const res = await fetchWithTimeout(url, {}, 6000);

            if (res.ok) {
                const data = await res.json();
                if (data.subjects && Array.isArray(data.subjects)) {
                    return data.subjects.map((item: any) => ({
                        vod_id: item.id, // Douban ID used for mapping
                        vod_name: item.title,
                        vod_pic: item.cover || '', 
                        vod_score: item.rate,
                        type_name: tag,
                        source: 'douban',
                        vod_year: '2024'
                    }));
                }
            }
        } catch (e) {
            // console.warn(`Douban fetch proxy failed: ${url}`, e);
        }
    }
    
    return [];
};

/**
 * Helper to get items based on category tab with filters
 */
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
            if (filter1 === '剧场版') {
                type = 'movie';
                tag = '日本动画'; 
                sort = 'recommend';
            } 
            else if (['周一', '周二', '周三', '周四', '周五', '周六', '周日'].includes(filter2)) {
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
            else if (filter2 !== '全部') tag = filter2 + '综艺'; // Attempt to suffix
            break;
            
        default:
            return [];
    }

    return await fetchDoubanJson(type, tag, 60, sort);
};

/**
 * Fetch High-Quality Backdrop from IMDb (via Proxy)
 */
const fetchImdbBackdrop = async (imdbId: string): Promise<string | null> => {
    try {
        const url = `https://www.imdb.com/title/${imdbId}/`;
        const html = await fetchHtmlWithProxy(url);
        if (!html) return null;

        // Try extracting high-res image from OG tags first (faster)
        const ogImage = html.match(/property="og:image" content="(.*?)"/);
        if (ogImage && !ogImage[1].includes('imdb_logo')) {
             return ogImage[1].replace(/_V1_.*(\.\w+)$/, '_V1_$1');
        }
    } catch (e) { /* ignore */ }
    return null;
};

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

    // 1. Search ID if not provided
    if (!targetId || targetId === '0' || Number(targetId) === 0) {
        // Try suggest API first
        const searchUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;
        try {
            // Using allorigins JSONP approach which is often more reliable for simple GETs
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;
            const searchRes = await fetch(proxyUrl);
            if (searchRes.ok) {
                const wrappedData = await searchRes.json();
                const searchData = JSON.parse(wrappedData.contents);
                if (Array.isArray(searchData) && searchData.length > 0) {
                    targetId = searchData[0].id;
                }
            }
        } catch(e) {}
    }

    if (!targetId) return null;

    // 2. Fetch Detail Page
    const pageUrl = `https://movie.douban.com/subject/${targetId}/`;
    const html = await fetchHtmlWithProxy(pageUrl);
    
    if (!html) return null;
    
    const result: DoubanData = { doubanId: String(targetId) };
    
    // Parse using Regex (more robust to layout changes than DOM parser in some cases)
    const scoreMatch = html.match(/property="v:average">([\d\.]+)<\/strong>/);
    if (scoreMatch) result.score = scoreMatch[1];

    const picMatch = html.match(/rel="v:image" src="([^"]+)"/);
    if (picMatch) {
        result.pic = picMatch[1].replace(/s_ratio_poster|m(?=\/public)/, 'l');
    }

    // Try to find a wallpaper from related photos
    const relatedPicsMatch = html.match(/<ul class="related-pic-bd">([\s\S]*?)<\/ul>/);
    if (relatedPicsMatch) {
        const imgs = [...relatedPicsMatch[1].matchAll(/<img src="([^"]+)"/g)];
        if (imgs.length > 0) {
            let wallpaperUrl = imgs[0][1];
            wallpaperUrl = wallpaperUrl.replace(/s_ratio_poster|m(?=\/public)/, 'l'); 
            result.wallpaper = wallpaperUrl;
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

    // Info Block Parsing (Area, Lang, etc.)
    const areaMatch = html.match(/<span class="pl">制片国家\/地区:<\/span>([\s\S]*?)<br/);
    if (areaMatch) result.area = areaMatch[1].replace(/<[^>]+>/g, '').trim();

    const imdbMatch = html.match(/<span class="pl">IMDb:?<\/span>([\s\S]*?)<br/);
    if (imdbMatch) {
        result.imdb = imdbMatch[1].replace(/<[^>]+>/g, '').trim();
        // Background fetch IMDb image if ID exists
        fetchImdbBackdrop(result.imdb).then(url => {
            if(url) result.wallpaper = url; 
        });
    }

    // Cast List
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

    // Recommendations
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
    console.warn('Douban fetch error:', e);
    return null;
  }
};

export const getDoubanPoster = async (keyword: string): Promise<string | null> => {
    const searchUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(searchUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
            const wrappedData = await res.json();
            const data = JSON.parse(wrappedData.contents);
            if (Array.isArray(data) && data.length > 0 && data[0].img) {
                return data[0].img.replace(/s_ratio_poster|m(?=\/public)/, 'l');
            }
        }
    } catch (e) { /* ignore */ }
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

export const searchMovies = async (keyword: string, page = 1): Promise<ApiResponse> => {
  const params = new URLSearchParams({
      ac: 'list',
      wd: keyword,
      pg: page.toString(),
      out: 'json'
  });
  return await fetchWithProxy(params);
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
    // Try to get Douban data using existing Douban ID or by name search
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
        console.warn('Background Douban fetch failed', e);
    }
    return null;
}

export const getHomeSections = async () => {
    // Parallel fetch with fail-safety
    // If one fails, it won't block others
    const fetchSafe = async (fn: Promise<VodItem[]>) => {
        try { return await fn; } catch (e) { return []; }
    };

    const [movies, series, shortDrama, anime, variety] = await Promise.all([
        fetchSafe(fetchDoubanJson('movie', '热门', 18)),
        fetchSafe(fetchDoubanJson('tv', '热门', 18)),
        fetchSafe(fetchDoubanJson('tv', '短剧', 18)),
        fetchSafe(fetchDoubanJson('tv', '日本动画', 18)),
        fetchSafe(fetchDoubanJson('tv', '综艺', 18))
    ]);
    return { movies, series, shortDrama, anime, variety };
};