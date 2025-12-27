
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
          {/* 背景氛围图 */}
          <div className="absolute inset-0 z-0 overflow-hidden">
              <ImageWithFallback src={movie.vod_pic || ''} searchKeyword={movie.vod_name} className="w-full h-full object-cover opacity-20 blur-[100px] scale-150 transition-all duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0a0a0a]/80 to-[#0a0a0a]"></div>
          </div>

          <div className="relative z-10 p-6 md:p-14 flex flex-col gap-12 md:gap-20">
              {/* 头部信息 */}
              <header className="flex flex-col md:flex-row gap-10 md:gap-20 items-start">
                  <div className="flex-shrink-0 mx-auto md:mx-0 group">
                      <div className="w-[200px] h-[300px] md:w-[320px] md:h-[480px] rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/20 relative transition-all duration-700 group-hover:scale-[1.03] group-hover:-rotate-1 ring-2 ring-white/5">
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

                      {/* 截图同步的元数据列表 */}
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

              {/* 核心演职人员 - 显著位置 */}
              {movie.vod_actors_extended && movie.vod_actors_extended.length > 0 && (
                  <section className="relative border-t border-white/5 pt-20 md:pt-28">
                      <div className="flex items-center justify-between mb-16">
                          <h3 className="text-3xl md:text-5xl font-black text-white flex items-center gap-6 tracking-tighter uppercase">
                            演职人员
                            <span className="text-xs md:text-base font-black text-gray-500 tracking-widest uppercase opacity-40">VISUAL CAST</span>
                          </h3>
                      </div>
                      <div className="flex gap-10 md:gap-14 overflow-x-auto pb-12 no-scrollbar scroll-smooth">
                          {movie.vod_actors_extended.map((actor, idx) => (
                              <div key={idx} className="flex-shrink-0 w-36 md:w-48 flex flex-col items-center group/actor cursor-pointer">
                                  <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-[5px] border-white/5 mb-8 group-hover/actor:border-brand group-hover/actor:shadow-[0_0_50px_#22c55e66] transition-all duration-700 group-hover/actor:scale-110 shadow-3xl relative ring-1 ring-white/10 bg-gray-900">
                                      <ImageWithFallback src={actor.pic} alt={actor.name} className="w-full h-full object-cover transition-all duration-700" />
                                      <div className="absolute inset-0 bg-brand/10 opacity-0 group-hover/actor:opacity-100 transition-opacity"></div>
                                  </div>
                                  <div className="text-base md:text-xl font-black text-white text-center truncate w-full mb-2 group-hover/actor:text-brand transition-colors tracking-tight">{actor.name}</div>
                                  <div className="text-[10px] md:text-xs font-black text-gray-500 text-center truncate w-full uppercase tracking-widest opacity-60 italic">{actor.role || '演员'}</div>
                              </div>
                          ))}
                      </div>
                  </section>
              )}

              {/* 为您推荐 */}
              {movie.vod_recs && movie.vod_recs.length > 0 && (
                  <section className="relative border-t border-white/5 pt-20 md:pt-28">
                      <h3 className="text-3xl md:text-5xl font-black text-white mb-16 flex items-center gap-6 tracking-tighter uppercase">
                          为您推荐
                          <span className="text-xs md:text-base font-black text-gray-500 tracking-widest uppercase opacity-40">RECOMMENDATIONS</span>
                      </h3>
                      <div className="-mx-6 md:mx-0 px-6 md:px-0">
                          <div className="flex gap-10 md:gap-14 overflow-x-auto pb-14 custom-scrollbar w-full">
                              {movie.vod_recs.map((rec, idx) => (
                                  <div key={idx} className="flex-shrink-0 w-[180px] md:w-[280px] cursor-pointer group" onClick={() => onSearch && onSearch(rec.name)}>
                                      <div className="aspect-[2/3] w-full rounded-[3rem] md:rounded-[4rem] overflow-hidden border border-white/10 mb-8 relative shadow-3xl transition-all duration-1000 group-hover:scale-[1.03] group-hover:-translate-y-5 ring-1 ring-white/10 bg-gray-900 group-hover:shadow-brand/20">
                                          <ImageWithFallback src={rec.pic} alt={rec.name} searchKeyword={rec.name} size="m" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all duration-500 flex items-center justify-center">
                                              <div className="w-24 h-24 rounded-full bg-brand/90 flex items-center justify-center text-black scale-0 group-hover:scale-100 transition-all duration-500 shadow-[0_0_60px_#22c55e] rotate-[-45deg] group-hover:rotate-0">
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="text-lg md:text-2xl font-black text-white truncate group-hover:text-brand transition-colors text-center px-4 tracking-tighter">{rec.name}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </section>
              )}

              {/* 豆瓣精选影评区块 - 底部压轴 */}
              {movie.vod_reviews && movie.vod_reviews.length > 0 && (
                  <section className="relative border-t border-white/5 pt-20 md:pt-28 pb-10">
                      <div className="flex items-center justify-between mb-16">
                          <h3 className="text-3xl md:text-5xl font-black text-white flex items-center gap-6 tracking-tighter uppercase">
                              豆瓣短评
                              <span className="text-xs md:text-base font-black text-brand tracking-widest uppercase px-5 py-2 bg-brand/10 rounded-2xl border border-brand/20">DOUBAN BEST</span>
                          </h3>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14">
                          {movie.vod_reviews.map((review: any, idx) => (
                              <article key={idx} className="bg-white/[0.02] border border-white/5 rounded-[3.5rem] p-12 md:p-16 transition-all hover:bg-white/[0.04] hover:border-white/20 animate-fade-in shadow-4xl backdrop-blur-[80px] ring-1 ring-white/5 flex flex-col gap-10 relative group/review">
                                  <div className="flex items-center gap-8 md:gap-10">
                                      <div className="w-20 h-20 md:w-24 md:h-24 flex-shrink-0 rounded-full overflow-hidden border-[4px] border-white/10 bg-gray-800 shadow-3xl transition-transform duration-500 group-hover/review:scale-110">
                                          <ImageWithFallback src={review.avatar} alt={review.user} className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center justify-between gap-5 mb-3">
                                              <span className="text-white text-2xl md:text-3xl font-black truncate tracking-tighter">{review.user}</span>
                                              <div className="flex items-center gap-2 text-yellow-500 font-black text-base md:text-lg bg-yellow-500/10 px-5 py-2 rounded-full border border-yellow-500/20 shadow-2xl">
                                                  <span>★</span>
                                                  <span className="tracking-tighter">{review.rating}</span>
                                              </div>
                                          </div>
                                          <div className="text-gray-500 text-xs md:text-sm font-black uppercase tracking-[0.25em] flex items-center gap-4 opacity-60">
                                              <span>{review.time}</span>
                                              {review.location && <span>• {review.location}</span>}
                                          </div>
                                      </div>
                                  </div>
                                  
                                  <div className="flex-1 relative">
                                      <svg className="absolute -top-10 -left-10 w-20 h-20 text-white/[0.03] -z-10" fill="currentColor" viewBox="0 0 32 32"><path d="M10 8v8H6c0 2.2 1.8 4 4 4v4c-4.4 0-8-3.6-8-8V8h8zm16 0v8h-4c0 2.2 1.8 4 4 4v4c-4.4 0-8-3.6-8-8V8h8z"></path></svg>
                                      <p className="text-gray-200 text-xl md:text-2xl leading-[1.6] font-bold line-clamp-8 italic relative z-10 tracking-tight">
                                          "{review.content}"
                                      </p>
                                  </div>

                                  <div className="flex items-center justify-start gap-6 pt-10 border-t border-white/5">
                                      <div className="flex items-center gap-3 px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs md:text-base font-black text-gray-400 group-hover/review:text-brand group-hover/review:border-brand/40 transition-all shadow-2xl">
                                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0.322-1.672V3a.75.75 0 0 1.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.527c-1.351 0-2.451-1.1-2.451-2.45V12.75c0-1.35 1.1-2.45 2.45-2.45h.527c.445 0 .72.498.523.898-.097.197-.187.397-.27.602" /></svg>
                                          <span>{review.useful_count || 0}</span>
                                          <span className="opacity-40 ml-1">HELPFUL</span>
                                      </div>
                                  </div>
                              </article>
                          ))}
                      </div>
                  </section>
              )}
          </div>
      </article>
  );
};

export default MovieInfoCard;
