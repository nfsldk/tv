

import { Episode, VodDetail, ApiResponse, ActorItem, RecommendationItem, VodItem } from '../types';

const API_BASE = 'https://caiji.dyttzyapi.com/api.php/provide/vod';

/**
 * Generic proxy fetcher for JSON APIs (CMS)
 */
const fetchWithProxy = async (params: URLSearchParams): Promise<ApiResponse> => {
  const targetUrl = `${API_BASE}?${params.toString()}`;
  
  // Strategy: Try primary proxy (corsproxy.io), fallback to others
  const proxies = [
      (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
      (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  ];

  for (const proxyGen of proxies) {
      try {
          const proxyUrl = proxyGen(targetUrl);
          const response = await fetch(proxyUrl);
          if (response.ok) {
              const data = await response.json();
              if (data && (data.code === 1 || Array.isArray(data.list))) {
                  return data;
              }
          }
      } catch (e) {
          console.warn(`Proxy failed for CMS: ${proxyGen(targetUrl)}`, e);
      }
  }

  throw new Error('Network Error: Unable to fetch data from any proxy.');
};

/**
 * Generic proxy fetcher for HTML content (Scraping)
 */
const fetchHtmlWithProxy = async (url: string): Promise<string | null> => {
    // 1. Try corsproxy.io (Direct HTML)
    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) return await response.text();
    } catch (e) { 
        console.warn('HTML Proxy 1 failed', e); 
    }
  
    // 2. Try codetabs (Good for China sometimes)
    try {
        const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) return await response.text();
    } catch (e) {
        console.warn('HTML Proxy 2 failed', e);
    }
    
    // 3. Try allorigins (JSON wrapped HTML) - Last resort as it can be slow
    try {
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const response = await fetch(proxyUrl);
        if (response.ok) {
            const data = await response.json();
            return data.contents;
        }
    } catch (e) { 
        console.warn('HTML Proxy 3 failed', e); 
    }
    
    return null;
  };

/**
 * Fetch Douban JSON API via Proxy with Failover
 * sort options: 'recommend' (hot), 'time' (new), 'rank' (score)
 */
const fetchDoubanJson = async (type: string, tag: string, limit = 12, sort = 'recommend'): Promise<VodItem[]> => {
    // Randomize start slightly to vary content on refresh if not sorting by time/rank
    const start = sort === 'recommend' ? Math.floor(Math.random() * 5) : 0; 
    const doubanUrl = `https://movie.douban.com/j/search_subjects?type=${type}&tag=${encodeURIComponent(tag)}&sort=${sort}&page_limit=${limit}&page_start=${start}`;
    
    // Failover proxies for Douban API
    const proxies = [
        `https://corsproxy.io/?${encodeURIComponent(doubanUrl)}`,
        `https://api.allorigins.win/raw?url=${encodeURIComponent(doubanUrl)}`,
        `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(doubanUrl)}`
    ];

    for (const url of proxies) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                if (data.subjects && Array.isArray(data.subjects)) {
                    return data.subjects.map((item: any) => ({
                        vod_id: item.id, // Douban ID
                        vod_name: item.title,
                        // Use original cover for list view for speed. Hero banner upgrades it later via details fetch.
                        vod_pic: item.cover || '', 
                        vod_score: item.rate,
                        type_name: tag, // Use the tag as category
                        source: 'douban',
                        vod_year: '2024' // Placeholder
                    }));
                }
            }
        } catch (e) {
            console.warn(`Douban fetch proxy failed: ${url}`, e);
        }
    }
    
    console.warn(`All proxies failed for Douban tag: ${tag}`);
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
            // Logic for Filter 1 (Sort/Type)
            if (filter1 === '最新电影') sort = 'time';
            else if (filter1 === '豆瓣高分') sort = 'rank';
            else if (filter1 === '冷门佳片') tag = '冷门佳片';
            else tag = '热门';

            // Logic for Filter 2 (Region)
            if (filter2 === '华语') tag = '华语';
            else if (filter2 === '欧美') tag = '欧美';
            else if (filter2 === '韩国') tag = '韩国';
            else if (filter2 === '日本') tag = '日本';
            else if (filter2 !== '全部') tag = filter2;
            break;

        case 'series':
            type = 'tv';
            tag = '热门';
            if (filter1 === '最近热门') sort = 'recommend';
            
            // Map UI regions to correct Douban TV Tags
            if (filter2 === '国产') tag = '国产剧';
            else if (filter2 === '欧美') tag = '美剧'; // Douban uses '美剧' primarily
            else if (filter2 === '日本') tag = '日剧';
            else if (filter2 === '韩国') tag = '韩剧';
            else if (filter2 === '动漫') tag = '日本动画';
            else if (filter2 === '纪录片') tag = '纪录片';
            else if (filter2 !== '全部') tag = filter2;
            break;

        case 'anime':
            type = 'tv';
            tag = '日本动画';
            if (filter1 === '剧场版') tag = '剧场版';
            else if (filter1 === '番剧') tag = '日本动画';
            
            // Weekday filter handling:
            // Since Douban doesn't have explicit "Monday" tags in public API, 
            // we map specific days to '日本动画' sorted by time to show latest updates.
            if (['周一', '周二', '周三', '周四', '周五', '周六', '周日'].includes(filter2)) {
                 tag = '日本动画';
                 sort = 'time';
            }
            break;

        case 'variety':
            type = 'tv';
            tag = '综艺';
            if (filter2 === '国内') tag = '大陆综艺';
            else if (filter2 === '国外') tag = '欧美综艺'; // '国外' is ambiguous, map to '欧美综艺' as fallback
            break;
            
        default:
            return [];
    }

    // Set limit to 60 to display approximately 10 rows
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

        // Extract JSON-LD
        const jsonMatch = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/);
        if (jsonMatch) {
            const data = JSON.parse(jsonMatch[1]);
            if (data.trailer && data.trailer.thumbnailUrl) {
                 return data.trailer.thumbnailUrl.replace(/_V1_.*(\.\w+)$/, '_V1_$1');
            }
        }
        
        const ogImage = html.match(/property="og:image" content="(.*?)"/);
        if (ogImage) {
            if (!ogImage[1].includes('imdb_logo')) {
                 return ogImage[1].replace(/_V1_.*(\.\w+)$/, '_V1_$1');
            }
        }
    } catch (e) {
        console.warn('IMDb fetch failed', e);
    }
    return null;
};

export interface DoubanData {
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

    if (!targetId || targetId === '0') {
        const searchUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;
        try {
            const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`;
            const searchRes = await fetch(proxyUrl);
            if (searchRes.ok) {
                const searchData = await searchRes.json();
                if (Array.isArray(searchData) && searchData.length > 0) {
                    targetId = searchData[0].id;
                }
            }
        } catch(e) { console.warn('Douban search failed', e); }
    }

    if (!targetId) return null;

    const pageUrl = `https://movie.douban.com/subject/${targetId}/`;
    const html = await fetchHtmlWithProxy(pageUrl);
    
    if (!html) return null;
    
    const result: DoubanData = {};
    
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

    const genres = [...html.matchAll(/property="v:genre">([^<]+)</g)].map(m => m[1]).join(' / ');
    if (genres) result.tag = genres;

    const yearMatch = html.match(/property="v:initialReleaseDate" content="(\d{4})/);
    if (yearMatch) result.year = yearMatch[1];

    const areaMatch = html.match(/<span class="pl">制片国家\/地区:<\/span>([\s\S]*?)<br/);
    if (areaMatch) result.area = areaMatch[1].replace(/<[^>]+>/g, '').trim();

    const langMatch = html.match(/<span class="pl">语言:<\/span>([\s\S]*?)<br/);
    if (langMatch) result.lang = langMatch[1].replace(/<[^>]+>/g, '').trim();
    
    const writerMatch = html.match(/<span class="pl">编剧:?<\/span>([\s\S]*?)<br/);
    if (writerMatch) {
        result.writer = writerMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    const pubdateMatch = html.match(/<span class="pl">首播:?<\/span>([\s\S]*?)<br/);
    if (pubdateMatch) {
        result.pubdate = pubdateMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    const epsMatch = html.match(/<span class="pl">集数:?<\/span>([\s\S]*?)<br/);
    if (epsMatch) {
        result.episodeCount = epsMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    const durationMatch = html.match(/<span class="pl">单集片长:?<\/span>([\s\S]*?)<br/);
    if (durationMatch) {
        result.duration = durationMatch[1].replace(/<[^>]+>/g, '').trim();
    } else {
        const runtimeMatch = html.match(/property="v:runtime" content="([^"]+)"/);
        if (runtimeMatch) result.duration = runtimeMatch[1] + '分钟';
    }

    const aliasMatch = html.match(/<span class="pl">又名:?<\/span>([\s\S]*?)<br/);
    if (aliasMatch) {
        result.alias = aliasMatch[1].replace(/<[^>]+>/g, '').trim();
    }

    const imdbMatch = html.match(/<span class="pl">IMDb:?<\/span>([\s\S]*?)<br/);
    if (imdbMatch) {
        result.imdb = imdbMatch[1].replace(/<[^>]+>/g, '').trim();
    }
    
    if (result.imdb) {
        const imdbWallpaper = await fetchImdbBackdrop(result.imdb);
        if (imdbWallpaper) {
            result.wallpaper = imdbWallpaper;
        }
    }

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
    console.warn('Douban fetch error:', e);
    return null;
  }
};

export const getDoubanPoster = async (keyword: string): Promise<string | null> => {
    const searchUrl = `https://movie.douban.com/j/subject_suggest?q=${encodeURIComponent(keyword)}`;
    try {
        const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(searchUrl)}`;
        const res = await fetch(proxyUrl);
        if (res.ok) {
            const data = await res.json();
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
    const potentialId = (detail as any).vod_douban_id;
    try {
        const doubanData = await fetchDoubanData(detail.vod_name, potentialId);
        if (doubanData) {
            const updates: Partial<VodDetail> = {};
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
            if (doubanData.writer) updates.vod_writer = doubanData.writer;
            if (doubanData.pubdate) updates.vod_pubdate = doubanData.pubdate;
            if (doubanData.episodeCount) updates.vod_episode_count = doubanData.episodeCount;
            if (doubanData.duration) updates.vod_duration = doubanData.duration;
            if (doubanData.alias) updates.vod_alias = doubanData.alias;
            if (doubanData.imdb) updates.vod_imdb = doubanData.imdb;
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
    const [movies, series, shortDrama, anime, variety] = await Promise.all([
        fetchDoubanJson('movie', '热门', 18),
        fetchDoubanJson('tv', '热门', 18),
        fetchDoubanJson('tv', '短剧', 18),
        fetchDoubanJson('tv', '日本动画', 18),
        fetchDoubanJson('tv', '综艺', 18)
    ]);
    return { movies, series, shortDrama, anime, variety };
};
