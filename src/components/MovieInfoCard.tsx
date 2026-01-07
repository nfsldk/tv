
import React, { useState } from 'react';
import { VodDetail, VodItem } from '../types';
import ImageWithFallback from './ImageWithFallback';

interface MovieInfoCardProps {
  movie: VodDetail;
  onItemClick?: (item: VodItem) => void;
  onSearch?: (keyword: string) => void;
}

const MovieInfoCard: React.FC<MovieInfoCardProps> = ({ movie, onItemClick, onSearch }) => {
  const [expanded, setExpanded] = useState(false);
  const score = movie.vod_score || movie.vod_douban_score || 'N/A';
  const rawContent = movie.vod_content ? movie.vod_content.replace(/<[^>]+>/g, '') : '暂无简介';
  const isLongContent = rawContent.length > 200;
  const displayContent = expanded ? rawContent : rawContent.slice(0, 200) + (isLongContent ? '...' : '');

  const MetaItem = ({ label, value, fullWidth = false }: { label: string, value?: string, fullWidth?: boolean }) => {
      if (!value) return null;
      return (
          <div className={`flex flex-col gap-1.5 ${fullWidth ? 'col-span-2' : ''}`}>
              <span className="text-gray-500 text-[10px] md:text-xs font-black uppercase tracking-widest">{label}</span>
              <span className="text-gray-200 text-xs md:text-sm font-bold leading-relaxed">{value}</span>
          </div>
      );
  };

  return (
      <article className="relative w-full rounded-[2rem] md:rounded-[3rem] overflow-hidden bg-[#0a0a0a] border border-white/5 shadow-3xl mt-8 md:mt-12 font-sans mb-16 ring-1 ring-white/10">
          <div className="absolute inset-0 z-0 overflow-hidden">
              <ImageWithFallback src={movie.vod_pic || ''} searchKeyword={movie.vod_name} size="l" className="w-full h-full object-cover opacity-15 blur-[100px] scale-150 transition-all duration-1000" />
              <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/40 via-[#0a0a0a] to-[#0a0a0a]"></div>
          </div>

          <div className="relative z-10 p-6 md:p-14 flex flex-col gap-10 md:gap-16">
              <header className="flex flex-col md:flex-row gap-10 md:gap-20 items-start">
                  <div className="flex-shrink-0 mx-auto md:mx-0 group">
                      <div className="w-[160px] h-[240px] md:w-[260px] md:h-[390px] rounded-2xl md:rounded-[2.5rem] overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)] border border-white/20 relative transition-all duration-700 group-hover:scale-105 group-hover:-rotate-1">
                          <ImageWithFallback src={movie.vod_pic || ''} searchKeyword={movie.vod_name} priority={true} size="l" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex items-end justify-center pb-10">
                             <div className="text-brand font-black text-3xl drop-shadow-2xl">★ {score}</div>
                          </div>
                      </div>
                  </div>

                  <div className="flex-1 text-gray-200">
                      <h1 className="text-4xl md:text-7xl font-black text-white mb-8 flex items-center gap-6 flex-wrap tracking-tighter leading-[1.1]">
                          {movie.vod_name}
                          {movie.vod_remarks && (
                              <span className="text-xs md:text-base font-black px-5 py-2 rounded-full border border-brand/30 text-brand bg-brand/10 tracking-widest uppercase">
                                  {movie.vod_remarks}
                              </span>
                          )}
                      </h1>

                      <div className="flex flex-wrap gap-3 mb-10">
                          {movie.vod_area && <span className="bg-white/5 border border-white/10 text-white text-xs font-black px-5 py-2 rounded-full backdrop-blur-md tracking-widest">{movie.vod_area}</span>}
                          {movie.vod_year && <span className="bg-white/5 border border-white/10 text-white text-xs font-black px-5 py-2 rounded-full backdrop-blur-md">{movie.vod_year}</span>}
                          {movie.type_name && <span className="bg-brand/10 border border-brand/30 text-brand text-xs font-black px-5 py-2 rounded-full tracking-widest uppercase">{movie.type_name}</span>}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-12 bg-white/[0.02] p-8 md:p-10 rounded-[2.5rem] border border-white/5 backdrop-blur-3xl shadow-inner">
                          <MetaItem label="导演" value={movie.vod_director} />
                          <MetaItem label="编剧" value={movie.vod_writer} />
                          <div className="col-span-2"><MetaItem label="主演" value={movie.vod_actor} /></div>
                          <MetaItem label="制片" value={movie.vod_area} />
                          <MetaItem label="发布" value={movie.vod_pubdate} />
                          <MetaItem label="时长" value={movie.vod_duration} />
                          <MetaItem label="语言" value={movie.vod_lang} />
                      </div>

                      <div className="text-base md:text-xl leading-relaxed text-gray-400 font-medium">
                          <h2 className="text-white font-black mb-6 text-xl md:text-2xl tracking-tighter uppercase">剧情蓝图 / SYNOPSIS</h2>
                          <p className={`whitespace-pre-line break-words transition-all duration-700 ${expanded ? '' : 'line-clamp-4 md:line-clamp-6 opacity-80'}`}>
                              {displayContent}
                          </p>
                          {isLongContent && (
                              <button onClick={() => setExpanded(!expanded)} className="text-brand hover:text-brand-hover text-sm mt-8 font-black tracking-widest uppercase transition-all flex items-center gap-3 group">
                                  {expanded ? '收起详情 (COLLAPSE)' : '展开更多 (EXPAND)'}
                                  <div className={`transition-transform duration-500 ${expanded ? 'rotate-180' : ''}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                                  </div>
                              </button>
                          )}
                      </div>
                  </div>
              </header>

              {movie.vod_recs && movie.vod_recs.length > 0 && (
                  <section className="border-t border-white/10 pt-12 md:pt-20">
                      <h3 className="text-2xl md:text-3xl font-black text-white mb-10 flex items-center gap-5 tracking-tighter uppercase">
                          <div className="w-2 h-8 bg-brand rounded-full shadow-[0_0_15px_#22c55e]"></div>
                          猜你喜欢 / Recommended
                      </h3>
                      <div className="-mx-6 md:mx-0 px-6 md:px-0">
                          <div className="flex gap-8 md:gap-12 overflow-x-auto pb-10 custom-scrollbar w-full">
                              {movie.vod_recs.map((rec, idx) => (
                                  <div key={idx} className="flex-shrink-0 w-[160px] md:w-[220px] cursor-pointer group" onClick={() => onItemClick && onItemClick({ vod_id: rec.doubanId || 0, vod_name: rec.name, vod_pic: rec.pic })}>
                                      <div className="aspect-[2/3] w-full rounded-2xl md:rounded-[2.5rem] overflow-hidden border border-white/10 mb-5 relative shadow-2xl transition-all duration-1000 group-hover:scale-105 group-hover:-translate-y-3 ring-1 ring-white/10 bg-gray-900">
                                          <ImageWithFallback src={rec.pic} alt={rec.name} searchKeyword={rec.name} size="m" className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-500 flex items-center justify-center">
                                              <div className="w-16 h-16 rounded-full bg-brand/90 flex items-center justify-center text-black scale-0 group-hover:scale-100 transition-transform duration-500 shadow-[0_0_30px_#22c55e]">
                                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                                              </div>
                                          </div>
                                      </div>
                                      <div className="text-sm md:text-lg font-black text-white truncate group-hover:text-brand transition-colors text-center px-2 tracking-tight">{rec.name}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </section>
              )}

              {movie.vod_reviews && movie.vod_reviews.length > 0 && (
                  <section className="border-t border-white/10 pt-12 md:pt-20">
                      <h3 className="text-2xl md:text-3xl font-black text-white mb-10 md:mb-14 flex items-center gap-5 tracking-tighter uppercase">
                          <div className="w-2 h-8 bg-brand rounded-full shadow-[0_0_15px_#22c55e]"></div>
                          豆瓣短评 / FAN REVIEWS
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                          {movie.vod_reviews.map((review: any, idx) => (
                              <article key={idx} className="bg-white/[0.03] border border-white/5 rounded-[2rem] p-8 md:p-12 transition-all hover:bg-white/[0.06] hover:border-white/20 animate-fade-in shadow-2xl backdrop-blur-3xl ring-1 ring-white/5">
                                  <div className="flex items-start gap-5 md:gap-8">
                                      <div className="w-14 h-14 md:w-20 md:h-20 flex-shrink-0 rounded-full overflow-hidden border-2 border-white/20 bg-gray-800 shadow-2xl">
                                          <ImageWithFallback src={review.avatar} alt={review.user} size="s" className="w-full h-full object-cover" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                                              <span className="text-white text-lg md:text-xl font-black truncate tracking-tight">{review.user}</span>
                                              <span className="text-yellow-500 font-black text-sm md:text-base tracking-tighter">{review.rating}</span>
                                          </div>
                                          <p className="text-gray-400 text-base md:text-lg leading-relaxed font-medium line-clamp-6">{review.content}</p>
                                          <div className="mt-8 flex items-center justify-between text-gray-600 text-[10px] md:text-xs font-black uppercase tracking-[0.2em]">
                                              <span>{review.useful_count} HELPFUL</span>
                                              <span>{review.time}</span>
                                          </div>
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
