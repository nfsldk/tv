import React, { useState, useEffect } from 'react';
import { getDoubanPoster } from '../services/vodService';

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450' style='background:%23111827'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23374151' font-family='sans-serif' font-size='24' font-weight='bold'%3ECineStream%3C/text%3E%3C/svg%3E";

const CACHE_PREFIX = 'poster_cache_v2_';
// User Custom Proxy
const PROXY_URL = 'https://daili.laidd.de5.net/?url=';

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  searchKeyword?: string;
}

const ImageWithFallback: React.FC<ImageProps> = ({ src, alt, className, searchKeyword, ...props }) => {
  const [imgSrc, setImgSrc] = useState<string>(FALLBACK_IMG);
  const [retryStage, setRetryStage] = useState(0); 

  useEffect(() => {
    let url = src?.trim();
    
    if (!url) {
      if (searchKeyword) {
          setImgSrc(FALLBACK_IMG);
          setRetryStage(2);
          getDoubanPoster(searchKeyword).then(newUrl => {
              if (newUrl) {
                  const proxyUrl = `${PROXY_URL}${encodeURIComponent(newUrl)}`;
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
    
    // Normalize URL
    if (url.startsWith('//')) {
      url = 'https:' + url;
    } else if (!url.startsWith('http')) {
        url = 'http://' + url;
    }

    // Check cache
    const cached = localStorage.getItem(CACHE_PREFIX + url);
    if (cached) {
        setImgSrc(cached);
        return;
    }

    // STRATEGY: Use your custom proxy for everything to be safe
    // Direct requests often fail in restricted environments or due to mixed content/CORS.
    const proxyUrl = `${PROXY_URL}${encodeURIComponent(url)}`;
    setImgSrc(proxyUrl);
    setRetryStage(1);

  }, [src, searchKeyword]);

  const handleError = () => {
    let originalUrl = src?.trim() || '';
    if (originalUrl.startsWith('//')) originalUrl = 'https:' + originalUrl;
    else if (originalUrl && !originalUrl.startsWith('http')) originalUrl = 'http://' + originalUrl;

    if (!originalUrl) return;

    localStorage.removeItem(CACHE_PREFIX + originalUrl);

    // If initial load via proxy failed, it's likely a bad URL or timeout.
    // Try smart search as fallback.
    if (retryStage === 1 && searchKeyword) {
        setRetryStage(2);
        getDoubanPoster(searchKeyword).then(newUrl => {
            if (newUrl) {
                const proxyUrl = `${PROXY_URL}${encodeURIComponent(newUrl)}`;
                setImgSrc(proxyUrl);
            } else {
                setImgSrc(FALLBACK_IMG);
                setRetryStage(3);
            }
        });
    } else {
        if (imgSrc !== FALLBACK_IMG) {
            setImgSrc(FALLBACK_IMG);
        }
    }
  };

  const handleLoad = () => {
      if (imgSrc !== FALLBACK_IMG && src) {
          let originalUrl = src.trim();
          if (originalUrl.startsWith('//')) originalUrl = 'https:' + originalUrl;
          try {
              localStorage.setItem(CACHE_PREFIX + originalUrl, imgSrc);
          } catch (e) {}
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