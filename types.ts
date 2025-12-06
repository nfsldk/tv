export interface VodItem {
  vod_id: number | string;
  vod_name: string;
  type_name?: string;
  vod_en?: string;
  vod_time?: string;
  vod_remarks?: string;
  vod_play_from?: string;
  vod_pic: string;
  vod_year?: string;
  vod_score?: string; // Unified score field
  source?: 'douban' | 'cms';
}

export interface ActorItem {
  name: string;
  pic: string;
  role?: string;
}

export interface RecommendationItem {
  name: string;
  pic: string;
  year?: string;
  doubanId?: string;
}

export interface VodDetail extends VodItem {
  vod_actor: string;
  vod_director: string;
  vod_writer?: string;      // 编剧
  vod_pubdate?: string;     // 首播
  vod_episode_count?: string; // 总集数
  vod_duration?: string;    // 单集片长
  vod_alias?: string;       // 又名
  vod_imdb?: string;        // IMDb
  vod_content: string;
  vod_area: string;
  vod_lang: string;
  vod_year: string;
  vod_play_url: string;
  vod_douban_score?: string;
  vod_recs?: RecommendationItem[];
  vod_actors_extended?: ActorItem[];
}

export interface ApiResponse {
  code: number;
  msg: string;
  page: number | string;
  pagecount: number;
  limit: string;
  total: number;
  list: VodItem[] | VodDetail[];
}

export interface Episode {
  title: string;
  url: string;
  index: number;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}