
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
  const isLongContent = rawContent.length > 150;
  const displayContent = expanded ? rawContent : rawContent.slice(0, 150) + (isLongContent ? '...' : '');

  // Helper for metadata grid items
  const MetaItem = ({ label, value, fullWidth = false }: { label: string, value?: string, fullWidth?: boolean }) => {
      if (!value) return null;
      return (
          <div className={`flex flex-col gap-1 ${fullWidth ? 'col-span-2 md:col-span-2' : ''}`}>
              <span className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-wider">{label}</span>
              <span className="text-gray-200 text-xs md:text-sm font-medium leading-relaxed">{value}</span>
          </div>
      );
  };

  return (
      <div className="relative w-full rounded-xl md:rounded-2xl overflow-hidden bg-[#121212] border border-white/5 shadow-2xl mt-4 md:mt-6 font-sans mb-8 md:mb-12">
          {/* Background blurred poster */}
          <div className="absolute inset-0 z-0">
              <ImageWithFallback 
                  src={movie.vod_pic || ''} 
                  searchKeyword={movie.vod_name}
                  className="w-full h-full object-cover opacity-20 blur-3xl scale-110" 
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#0f0f0f] via-[#0f0f0f]/95 to-[#0f0f0f]/80"></div>
          </div>

          <div className="relative z-10 p-4 md:p-8 flex flex-col gap-6 md:gap-8">
              
              <div className="flex flex-col md:flex-row gap-6 md:gap-8">
                  {/* Poster Image */}
                  <div className="flex-shrink-0 mx-auto md:mx-0">
                      <div className="w-[140px] h-[210px] md:w-[200px] md:h-[300px] rounded-lg overflow-hidden shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/10 group bg-gray-800">
                          <ImageWithFallback 
                              src={movie.vod_pic || ''} 
                              searchKeyword={movie.vod_name}
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                      </div>
                  </div>

                  {/* Info Content */}
                  <div className="flex-1 text-gray-200">
                      <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 md:mb-4 flex items-center gap-4 flex-wrap">
                          {movie.vod_name}
                          {movie.vod_remarks && (
                              <span className="text-xs md:text-sm font-normal px-2 py-0.5 rounded border border-white/20 text-gray-400 bg-black/30">
                                  {movie.vod_remarks}
                              </span>
                          )}
                      </h2>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-2 mb-4 md:mb-6">
                          {movie.vod_area && <span className="bg-blue-600/20 border border-blue-500/30 text-blue-300 text-[10px] md:text-xs font-medium px-2.5 py-1 rounded-full">{movie.vod_area}</span>}
                          {movie.vod_lang && <span className="bg-purple-600/20 border border-purple-500/30 text-purple-300 text-[10px] md:text-xs font-medium px-2.5 py-1 rounded-full">{movie.vod_lang}</span>}
                          {movie.type_name && <span className="bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 text-[10px] md:text-xs font-medium px-2.5 py-1 rounded-full">{movie.type_name}</span>}
                          {movie.vod_year && <span className="bg-orange-600/20 border border-orange-500/30 text-orange-300 text-[10px] md:text-xs font-medium px-2.5 py-1 rounded-full">{movie.vod_year}</span>}
                          {score !== 'N/A' && (
                               <span className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] md:text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                   ★ {score}
                               </span>
                          )}
                      </div>

                      {/* Detailed Metadata Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 md:gap-x-8 gap-y-4 mb-4 md:mb-6 bg-white/5 p-4 rounded-xl border border-white/5">
                          {/* Row 1 */}
                          <MetaItem label="导演" value={movie.vod_director} />
                          <MetaItem label="编剧" value={movie.vod_writer} />
                          
                          {/* Main Actor takes full width or 2 cols on desktop */}
                          <div className="col-span-2 md:col-span-2 row-span-2">
                             <MetaItem label="主演" value={movie.vod_actor} />
                          </div>

                          {/* Row 2 */}
                          <MetaItem label="类型" value={movie.type_name} />
                          <MetaItem label="制片国家/地区" value={movie.vod_area} />

                          {/* Row 3 */}
                          <MetaItem label="语言" value={movie.vod_lang} />
                          <MetaItem label="首播" value={movie.vod_pubdate} />
                          <MetaItem label="集数" value={movie.vod_episode_count} />
                          <MetaItem label="单集片长" value={movie.vod_duration} />
                          
                          {/* Row 4 */}
                          <div className="col-span-2 md:col-span-2">
                             <MetaItem label="又名" value={movie.vod_alias} />
                          </div>
                          <MetaItem label="IMDb" value={movie.vod_imdb} />
                      </div>

                      {/* Content Description */}
                      <div className="text-xs md:text-sm leading-relaxed text-gray-300">
                          <h3 className="text-white font-bold mb-2 text-sm md:text-base">剧情简介</h3>
                          <p className={`whitespace-pre-line break-words ${expanded ? '' : 'line-clamp-4'}`}>
                              {displayContent}
                          </p>
                          {isLongContent && (
                              <button 
                                  onClick={() => setExpanded(!expanded)}
                                  className="text-brand hover:text-brand-hover text-xs mt-2 font-medium focus:outline-none transition-colors"
                              >
                                  {expanded ? '收起详情' : '展开更多'}
                              </button>
                          )}
                      </div>
                  </div>
              </div>

              {/* Extended Section: Cast - Mobile Optimized Scrolling */}
              {movie.vod_actors_extended && movie.vod_actors_extended.length > 0 && (
                  <div className="border-t border-white/10 pt-4 md:pt-6">
                      <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4">主演阵容 (Visual)</h3>
                      <div className="-mx-4 md:mx-0 px-4 md:px-0">
                          <div className="flex gap-4 md:gap-6 overflow-x-auto pb-4 no-scrollbar w-full">
                              {movie.vod_actors_extended.map((actor, idx) => (
                                  <div key={idx} className="flex-shrink-0 w-24 md:w-36 text-center">
                                      <div className="w-20 h-20 md:w-32 md:h-32 mx-auto mb-2 md:mb-3 rounded-full overflow-hidden border-2 border-white/10 shadow-lg bg-gray-800">
                                          <ImageWithFallback 
                                              src={actor.pic} 
                                              alt={actor.name}
                                              className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                          />
                                      </div>
                                      <div className="text-xs md:text-sm text-white font-medium truncate">{actor.name}</div>
                                      <div className="text-[10px] md:text-xs text-gray-500 truncate mt-0.5">{actor.role}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              {/* Extended Section: Recommendations - Mobile Optimized Scrolling */}
              {movie.vod_recs && movie.vod_recs.length > 0 && (
                  <div className="border-t border-white/10 pt-4 md:pt-6">
                      <h3 className="text-base md:text-lg font-bold text-white mb-3 md:mb-4 flex items-center gap-2">
                          <span className="text-brand">♥</span> 猜你喜欢
                      </h3>
                      <div className="-mx-4 md:mx-0 px-4 md:px-0">
                          <div className="flex gap-3 md:gap-4 overflow-x-auto pb-4 custom-scrollbar w-full">
                              {movie.vod_recs.map((rec, idx) => (
                                  <div 
                                    key={idx} 
                                    className="flex-shrink-0 w-28 md:w-40 cursor-pointer group"
                                    onClick={() => onSearch && onSearch(rec.name)}
                                  >
                                      <div className="w-28 h-42 md:w-40 md:h-60 rounded-lg overflow-hidden border border-white/10 mb-2 relative shadow-lg">
                                          <ImageWithFallback 
                                              src={rec.pic} 
                                              alt={rec.name}
                                              searchKeyword={rec.name}
                                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                          />
                                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                                              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 md:h-10 md:w-10 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                              </svg>
                                          </div>
                                      </div>
                                      <div className="text-xs md:text-sm font-bold text-white truncate group-hover:text-brand transition-colors text-center">{rec.name}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  </div>
              )}

          </div>
      </div>
  );
};

export default MovieInfoCard;
