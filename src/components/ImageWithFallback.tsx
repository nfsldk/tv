import React, { useState, useEffect } from 'react';
import { getDoubanPoster } from '../services/vodService';

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450' style='background:%23111827'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23374151' font-family='sans-serif' font-size='24' font-weight='bold'%3ECineStream%3C/text%3E%3C/svg%3E";
const CACHE_PREFIX = 'poster_cache_v2_';
const PROXY_URL = 'https://daili.laidd.de5.net/?url=';
const BAD_IMAGE_PATTERNS = ['nopic', 'mac_default', 'no_pic', 'default.jpg'];

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  searchKeyword?: string;
}

const ImageWithFallback: React.FC<ImageProps> = ({ src, alt, className, searchKeyword, ...props }) => {
  const [imgSrc, setImgSrc] = useState<string>(FALLBACK_IMG);
  const [retryStage, setRetryStage] = useState(0); 

  useEffect(() => {
    let url = src?.trim();
    if (!url || BAD_IMAGE_PATTERNS.some(p => url.includes(p))) {
      if (searchKeyword) {
          setImgSrc(FALLBACK_IMG);
          setRetryStage(2); 
          getDoubanPoster(searchKeyword).then(newUrl => {
              if (newUrl) {
                  setImgSrc(newUrl.includes('doubanio.com') ? newUrl : `${PROXY_URL}${encodeURIComponent(newUrl)}`);
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
    if (url.startsWith('//')) url = 'https:' + url;
    const cached = localStorage.getItem(CACHE_PREFIX + url);
    if (cached) { setImgSrc(cached); return; }
    if (url.includes('doubanio.com')) {
        setImgSrc(url); setRetryStage(1); 
    } else {
        setImgSrc(`${PROXY_URL}${encodeURIComponent(url)}`); setRetryStage(1);
    }
  }, [src, searchKeyword]);

  const handleError = () => {
    if (retryStage === 1 && searchKeyword) {
        setRetryStage(2);
        getDoubanPoster(searchKeyword).then(newUrl => {
            if (newUrl) setImgSrc(`${PROXY_URL}${encodeURIComponent(newUrl)}`);
            else { setImgSrc(FALLBACK_IMG); setRetryStage(3); }
        });
    } else {
        if (imgSrc !== FALLBACK_IMG) setImgSrc(FALLBACK_IMG);
    }
  };

  const handleLoad = () => {
      if (imgSrc !== FALLBACK_IMG && src) {
          try { localStorage.setItem(CACHE_PREFIX + src, imgSrc); } catch (e) {}
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