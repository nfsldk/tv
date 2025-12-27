import React, { useState } from 'react';
import { VodDetail } from '../types';
import ImageWithFallback from './ImageWithFallback';

interface MovieInfoCardProps {
  movie: VodDetail;
  onSearch?: (keyword: string) => void;
}

const MovieInfoCard: React.FC<MovieInfoCardProps> = ({ movie, onSearch }) => {
  const [expanded, setExpanded] = useState(false);
  const score = movie.vod_score || movie.vod_douban_score || 'N/A';
  const rawContent = movie.vod_content ? movie.vod_content.replace(/<[^>]+>/g, '') : '暂无简介';
  const isLongContent = rawContent.length > 200;
  const displayContent = expanded ? rawContent : rawContent.slice(0, 200) + (isLongContent ? '...' : '');

  const MetaItem = ({ label, value, fullWidth = false }: { label: string, value?: string, fullWidth?: boolean }) => {
      if (!value) return null;
      return (
          <div className={`flex items-start gap-4 ${fullWidth ? 'col-span-full' : ''}`}>
              <span className="text-gray-500 text-[11px] md:text-xs font-black uppercase tracking-widest min-w-[6.5em] text-right mt-0.5">{label}:</span>
              <span className="text-gray-100 text-xs md:text-sm font-bold leading-relaxed flex-1">{value}</span>
          </div>
      );
  };

  return (
      <article className="relative w-full rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden bg-[#0a0a0a] border border-white/5 shadow-3xl mt-8 md:mt-12 font-sans mb-16 ring-1 ring-white/10 isolate">
          {/* 背景氛围 */}
          <div className="absolute inset-0 z-0 overflow-hidden">
              <ImageWithFallback src={movie.vod_pic || ''} searchKeyword={movie.vod_name} className="w-full h-full object-cover opacity-20 blur-[100px] scale-150 transition-all duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/80 to-[#0a0a0a]"></div>
          </div>

          <div className="relative z-10 p-6 md:p-14 flex flex-col gap-12 md:gap-20">
              {/* 核心头部 */}
              <header className="flex flex-col md:flex-row gap-10 md:gap-20 items-start">
                  <div className="flex-shrink-0 mx-auto md:mx-0 group">
                      <div className="w-[200px] h-[300px] md:w-[320px] md:h-[480px] rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/20 relative transition-all duration-700 group-hover:scale-[1.03] group-hover:-rotate-1 ring-2 ring-white/5 bg-gray-900">
                          <ImageWithFallback src={movie.vod_pic || ''} searchKeyword={movie.vod_name} priority={true} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end justify-center pb-12">
                             <div className="text-brand font-black text-6xl drop-shadow-[0_0_20px_#22c55e]">★ {score}</div>
                          </div>
                      </div>
                  </div>

                  <div className="flex-1 text-gray-200 w-full">
                      <div className="flex flex-wrap items-center gap-4 mb-8">
                          {movie.vod_remarks && (
                              <span className="text-[10px] md:text-xs font-black px-5 py-2 rounded-full border border-brand/40 text-brand bg-brand/10 tracking-[0.2em] uppercase shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                                  {movie.vod_remarks}
                              </span>
                          )}
                          <span className="bg-white/10 border border-white/10 text-gray-400 text-[10px] md:text-xs font-black px-5 py-2 rounded-full backdrop-blur-3xl uppercase tracking-widest">{movie.vod_year || '2024'}</span>
                          <span className="text-brand font-black text-2xl md:text-3xl ml-auto drop-shadow-[0_0_15px_#22c55e]">★ {score}</span>
                      </div>

                      <h1 className="text-5xl md:text-7xl font-black text-white mb-14 tracking-tighter leading-[1] drop-shadow-3xl">
                          {movie.vod_name}
                      </h1>

                      {/* 聚合元数据 */}
                      <div className="bg-white/[0.03] p-10 md:p-14 rounded-[3rem] border border-white/10 backdrop-blur-3xl shadow-inner ring-1 ring-white/5 mb-14">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-7">
                              <MetaItem label="导演" value={movie.vod_director} />
                              <MetaItem label="编剧" value={movie.vod_writer} />
                              <MetaItem label="主演" value={movie.vod_actor} fullWidth />
                              <MetaItem label="类型" value={movie.type_name} />
                              <MetaItem label="制片国家/地区" value={movie.vod_area} />
                              <MetaItem label="语言" value={movie.vod_lang} />
                              <MetaItem label="首播" value={movie.vod_pubdate} />
                              <MetaItem label="集数" value={movie.vod_episode_count} />
                              <MetaItem label="单集片长" value={movie.vod_duration} />
                              <MetaItem label="又名" value={movie.vod_alias} fullWidth />
                              <MetaItem label="IMDb" value={movie.vod_imdb} />
                          </div>
                      </div>

                      <div className="text-lg md:text-2xl leading-relaxed text-gray-400 font-medium">
                          <h2 className="text-white font-black mb-8 text-2xl md:text-3xl tracking-tight flex items-center gap-5 uppercase">
                              剧情简介
                              <div className="h-[2px] flex-1 bg-gradient-to-r from-white/20 to-transparent"></div>
                          </h2>
                          <p className={`whitespace-pre-line break-words transition-all duration-700 ${expanded ? '' : 'line-clamp-4 md:line-clamp-6 opacity-80'}`}>
                              {displayContent}
                          </p>
                          {isLongContent && (
                              <button onClick={() => setExpanded(!expanded)} className="text-brand hover:text-brand-hover text-sm mt-10 font-black tracking-widest uppercase transition-all flex items-center gap-4 group px-10 py-4 rounded-full border border-brand/20 bg-brand/5 hover:bg-brand/10 hover:scale-105 active:scale-95 shadow-xl">
                                  {expanded ? '收起详情' : '展开全景'}
                                  <div className={`transition-transform duration-500 ${expanded ? 'rotate-180' : ''}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                                  </div>
                              </button>
                          )}
                      </div>
                  </div>
              </header>

              {/* 带头像的演职人员 */}
              {movie.vod_actors_extended && movie.vod_actors_extended.length > 0 && (
                <section className="relative border-t border-white/5 pt-20">
                    <h3 className="text-3xl font-black text-white mb-10 flex items-center gap-6 uppercase tracking-tighter">
                        演职人员
                        <span className="text-xs font-black text-gray-500 tracking-[0.3em] opacity-40">Visual Cast</span>
                    </h3>
                    <div className="flex gap-10 overflow-x-auto pb-10 no-scrollbar">
                        {movie.vod_actors_extended.map((actor, idx) => (
                            <div key={idx} className="flex-shrink-0 w-32 md:w-40 flex flex-col items-center group/actor">
                                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white/5 group-hover/actor:border-brand transition-all duration-500 shadow-2xl relative mb-4 ring-1 ring-white/10">
                                    <ImageWithFallback src={actor.pic} alt={actor.name} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-sm md:text-base font-black text-white text-center truncate w-full">{actor.name}</span>
                                <span className="text-[10px] md:text-xs text-gray-500 font-bold uppercase tracking-widest">{actor.role || '演员'}</span>
                            </div>
                        ))}
                    </div>
                </section>
              )}

              {/* 豆瓣精选影评 */}
              {movie.vod_reviews && movie.vod_reviews.length > 0 && (
                <section className="relative border-t border-white/5 pt-20">
                    <h3 className="text-3xl font-black text-white mb-10 flex items-center gap-6 uppercase tracking-tighter">
                        豆瓣短评
                        <span className="bg-brand/10 text-brand text-[10px] px-3 py-1 rounded-md border border-brand/20 font-black tracking-[0.2em] uppercase">Best Reviews</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {movie.vod_reviews.map((review, idx) => (
                            <div key={idx} className="bg-white/[0.02] border border-white/5 rounded-[3rem] p-10 flex flex-col gap-6 backdrop-blur-2xl ring-1 ring-white/5 transition-all hover:bg-white/[0.04] group/review">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white/10 flex-shrink-0">
                                        <ImageWithFallback src={review.avatar} alt={review.user} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-lg font-black text-white truncate">{review.user}</span>
                                            <span className="text-yellow-500 font-black text-sm">{review.rating}</span>
                                        </div>
                                        <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest opacity-60">{review.time}</div>
                                    </div>
                                </div>
                                <p className="text-gray-300 text-base leading-relaxed line-clamp-4 font-medium italic">"{review.content}"</p>
                                <div className="flex items-center gap-2 text-brand/40 text-[10px] font-black uppercase tracking-widest pt-4 border-t border-white/5 group-hover/review:text-brand transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0.322-1.672V3a.75.75 0 0 1.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.527c-1.351 0-2.451-1.1-2.451-2.45V12.75c0-1.35 1.1-2.45 2.45-2.45h.527c.445 0 .72.498.523.898-.097.197-.187.397-.27.602" /></svg>
                                    <span>{review.useful_count} 觉得有用</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
              )}
          </div>
      </article>
  );
};

export default MovieInfoCard;