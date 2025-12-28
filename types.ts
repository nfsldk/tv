
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
  vod_score?: string;
  source?: 'douban' | 'cms';
  api_url?: string;
  vod_actor?: string;
  vod_director?: string;
}

export interface ReviewItem {
  user: string;
  rating?: string;
  content: string;
  time?: string;
}

export interface HistoryItem extends VodItem {
  episode_index: number;
  episode_name: string;
  last_updated: number;
  source_index?: number;
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

export interface PersonDetail {
    id: string;
    name: string;
    pic: string;
    gender?: string;
    constellation?: string;
    birthdate?: string;
    birthplace?: string;
    role?: string;
    intro?: string;
    works: VodItem[];
}

export interface VodDetail extends VodItem {
  vod_actor: string;
  vod_director: string;
  vod_writer?: string;
  vod_pubdate?: string;
  vod_episode_count?: string;
  vod_duration?: string;
  vod_alias?: string;
  vod_imdb?: string;
  vod_content: string;
  vod_area: string;
  vod_lang: string;
  vod_year: string;
  vod_play_url: string;
  vod_douban_score?: string;
  vod_douban_id?: string;
  vod_recs?: RecommendationItem[];
  vod_actors_extended?: ActorItem[];
  vod_reviews?: ReviewItem[];
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

export interface PlaySource {
  name: string;
  episodes: Episode[];
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export interface VodSource {
  id: string;
  name: string;
  api: string;
  active: boolean;
  canDelete?: boolean;
}
