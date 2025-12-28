import React from 'react';

// Using React.FC to properly handle React internal props like 'key' in mapped collections
export const SkeletonBase: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`bg-gray-800/50 animate-pulse rounded-lg ${className}`} />
);

export const PlayerSkeleton = () => (
  <div className="w-full aspect-video lg:aspect-auto lg:h-full bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
    <div className="flex flex-col items-center gap-4">
      <div className="w-16 h-16 rounded-full border-4 border-white/5 border-t-brand animate-spin" />
      <span className="text-gray-500 text-xs font-medium tracking-widest uppercase">Initializing Stream</span>
    </div>
    <style>{`
      @keyframes shimmer {
        100% { transform: translateX(100%); }
      }
    `}</style>
  </div>
);

export const EpisodeListSkeleton = () => (
  <div className="space-y-4">
    <div className="flex justify-between items-center px-1">
      <SkeletonBase className="w-20 h-4" />
      <SkeletonBase className="w-8 h-8 rounded" />
    </div>
    <div className="grid grid-cols-4 gap-2">
      {Array.from({ length: 24 }).map((_, i) => (
        <SkeletonBase key={i} className="h-9" />
      ))}
    </div>
  </div>
);

export const MovieInfoSkeleton = () => (
  <div className="relative w-full rounded-xl md:rounded-2xl overflow-hidden bg-[#121212] border border-white/5 p-4 md:p-8 mt-4 md:mt-6 mb-8 md:mb-12">
    <div className="flex flex-col md:flex-row gap-6 md:gap-8">
      <SkeletonBase className="w-[140px] h-[210px] md:w-[200px] md:h-[300px] flex-shrink-0 mx-auto md:mx-0" />
      <div className="flex-1 space-y-4">
        <SkeletonBase className="w-3/4 h-8 md:h-10" />
        <div className="flex gap-2">
          <SkeletonBase className="w-16 h-6 rounded-full" />
          <SkeletonBase className="w-16 h-6 rounded-full" />
          <SkeletonBase className="w-16 h-6 rounded-full" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white/5 p-4 rounded-xl border border-white/5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <SkeletonBase className="w-12 h-3" />
              <SkeletonBase className="w-full h-4" />
            </div>
          ))}
        </div>
        <div className="space-y-2">
          <SkeletonBase className="w-20 h-4" />
          <SkeletonBase className="w-full h-20" />
        </div>
      </div>
    </div>
  </div>
);

export const PlayingPageSkeleton = () => (
  <section className="mb-12 animate-fade-in space-y-6 mt-4">
    <div className="flex items-center gap-2 mb-4 opacity-50">
      <div className="w-5 h-5 bg-gray-800 rounded-full" />
      <SkeletonBase className="w-12 h-4" />
    </div>
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      <div className="flex-1 w-full bg-black rounded-xl overflow-hidden border border-white/5 shadow-2xl relative lg:h-[500px] h-[211px] md:h-[360px]">
        <PlayerSkeleton />
      </div>
      <div className="w-full lg:w-[320px] bg-[#121620] border border-white/5 rounded-xl p-3 h-[500px]">
        <EpisodeListSkeleton />
      </div>
    </div>
    <MovieInfoSkeleton />
  </section>
);