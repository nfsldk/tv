import React, { useState, useEffect } from 'react';
import { getDoubanPoster } from '../services/vodService';

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450' style='background:%23111827'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23374151' font-family='sans-serif' font-size='24' font-weight='bold'%3ECineStream%3C/text%3E%3C/svg%3E";

const CACHE_PREFIX = 'poster_cache_v2_';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  searchKeyword?: string;
}

const ImageWithFallback: React.FC<ImageProps> = ({ src, alt, className, searchKeyword, ...props }) => {
  const [imgSrc, setImgSrc] = useState<string>(FALLBACK_IMG);
  const [retryStage, setRetryStage] = useState(0); // 0: Direct/Cached, 1: Proxy, 2: Smart Search, 3: Fallback

  useEffect(() => {
    let url = src?.trim();
    
    // Case 0: No URL provided
    if (!url) {
      if (searchKeyword) {
          // No source, but we have a keyword. Try searching immediately.
          setImgSrc(FALLBACK_IMG);
          setRetryStage(2);
          getDoubanPoster(searchKeyword).then(newUrl => {
              if (newUrl) {
                  const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(newUrl)}&output=webp`;
                  setImgSrc(proxyUrl);
              } else {
                  setRetryStage(3);
              }
          });
          return;
      }
      setImgSrc(FALLBACK_IMG);
      setRetryStage(3);
      return;
    }
    
    // Normalize protocol-relative URLs
    if (url.startsWith('//')) {
      url = 'https:' + url;
    }

    // 1. Check Cache
    const cached = localStorage.getItem(CACHE_PREFIX + url);
    if (cached) {
        setImgSrc(cached);
        // Determine stage based on cached URL content to handle errors correctly if cache is now stale
        if (cached.includes('wsrv.nl')) {
            setRetryStage(1);
        } else {
            setRetryStage(0);
        }
        return;
    }

    // 2. Strategy Determination
    
    // Case A: Douban Images (Anti-hotlink + Performance)
    // Directly use wsrv.nl proxy. This is often faster than failing a direct load or relying on referrer hacks.
    if (url.includes('doubanio.com')) {
        const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp`;
        setImgSrc(proxyUrl);
        setRetryStage(1); // Skip stage 0
        return;
    }

    // Case B: HTTP content on HTTPS site (Mixed Content) -> PROXY IMMEDIATELY
    if (url.startsWith('http:')) {
        const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=webp`;
        setImgSrc(proxyUrl);
        setRetryStage(1);
        return;
    }

    // Case C: Standard HTTPS -> Try Direct First
    setImgSrc(url);
    setRetryStage(0);

  }, [src, searchKeyword]);

  const handleError = () => {
    let originalUrl = src?.trim() || '';
    if (originalUrl.startsWith('//')) originalUrl = 'https:' + originalUrl;

    // Clear potentially bad cache
    if (originalUrl) {
        localStorage.removeItem(CACHE_PREFIX + originalUrl);
    }

    if (retryStage === 0 && originalUrl) {
      // Stage 0 (Direct) failed -> Try Proxy
      const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(originalUrl)}&output=webp`;
      setImgSrc(proxyUrl);
      setRetryStage(1);
    } else if (retryStage === 1) {
      // Stage 1 (Proxy) failed -> Try Smart Search (Douban API)
      if (searchKeyword) {
          setRetryStage(2);
          getDoubanPoster(searchKeyword).then(newUrl => {
              if (newUrl) {
                  // We found a new image from Douban, proxy it and display
                  const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(newUrl)}&output=webp`;
                  setImgSrc(proxyUrl);
              } else {
                  setImgSrc(FALLBACK_IMG);
                  setRetryStage(3);
              }
          });
      } else {
          setImgSrc(FALLBACK_IMG);
          setRetryStage(3);
      }
    } else {
      // Stage 2 (Smart Search) failed -> Fallback
      if (retryStage !== 3) {
          setImgSrc(FALLBACK_IMG);
          setRetryStage(3);
      }
    }
  };

  const handleLoad = () => {
      // Successful load. Cache the result if it's not the fallback.
      if (imgSrc !== FALLBACK_IMG && src) {
          let originalUrl = src.trim();
          if (originalUrl.startsWith('//')) originalUrl = 'https:' + originalUrl;
          
          try {
              localStorage.setItem(CACHE_PREFIX + originalUrl, imgSrc);
          } catch (e) {
              console.warn('Poster cache full');
          }
      }
  };

  return (
    <img 
      src={imgSrc} 
      alt={alt || "Poster"} 
      className={`${className} ${imgSrc === FALLBACK_IMG ? 'opacity-50 grayscale p-4 bg-gray-900' : 'bg-gray-800'}`}
      onError={handleError}
      onLoad={handleLoad}
      referrerPolicy="no-referrer" 
      loading="lazy"
      {...props} 
    />
  );
};

export default ImageWithFallback;