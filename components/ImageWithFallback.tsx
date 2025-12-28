import React, { useState, useEffect, useRef } from 'react';
import { getDoubanPoster } from '../services/vodService';

const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450' style='background:%23111827'%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23374151' font-family='sans-serif' font-size='24' font-weight='bold'%3ECineStream%3C/text%3E%3C/svg%3E";

// 使用 Weserv 时，添加 n=-1 禁用其内部缓存干扰，并设置错误重定向
const PROXY_BASE = 'https://images.weserv.nl/?url=';
const BAD_IMAGE_PATTERNS = ['nopic', 'mac_default', 'no_pic', 'default.jpg', 'error.png', 'placeholder', 'error.jpg', 'static/img/'];

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  searchKeyword?: string;
  priority?: boolean;
  size?: 's' | 'm' | 'l';
}

const ImageWithFallback: React.FC<ImageProps> = ({ 
  src, 
  alt, 
  className, 
  searchKeyword, 
  priority = false, 
  size = 'l', 
  ...props 
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [inView, setInView] = useState(priority);
  
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. 视口观察器
  useEffect(() => {
    if (priority || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' } 
    );
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [priority]);

  // 2. URL 深度清洗逻辑
  const processUrl = (url: string, useProxy: boolean) => {
    if (!url) return FALLBACK_IMG;
    let finalUrl = url.trim();
    if (finalUrl.startsWith('//')) finalUrl = 'https:' + finalUrl;

    // 如果是豆瓣资源
    if (finalUrl.includes('doubanio.com')) {
        // A. 海报处理：仅对 /public/ 路径进行规格替换
        if (finalUrl.includes('/public/')) {
            finalUrl = finalUrl.replace(/s_ratio_poster|m(?=\/public)|s(?=\/public)|l(?=\/public)/, size);
        }
        // B. 头像处理：/icon/ 路径禁止替换规格，否则必报 404
        
        // C. 如果需要走代理，构造 Weserv 链接
        if (useProxy) {
            // 添加 output=webp 优化体积，n=-1 确保不被 Weserv 的旧缓存坑
            return `${PROXY_BASE}${encodeURIComponent(finalUrl)}&output=webp&q=85&n=-1`;
        }
    }

    return finalUrl;
  };

  useEffect(() => {
    if (!inView || !src) {
        if (!src && inView) {
            if (searchKeyword) handleSearch();
            else { setImgSrc(FALLBACK_IMG); setLoading(false); }
        }
        return;
    }

    // 检查坏图
    const isBad = BAD_IMAGE_PATTERNS.some(p => src.toLowerCase().includes(p));
    if (isBad) {
        if (searchKeyword) handleSearch();
        else { setImgSrc(FALLBACK_IMG); setLoading(false); }
        return;
    }

    // 根据重试次数决定策略
    // retryCount 0: 原链尝试
    // retryCount 1: 代理尝试
    // retryCount 2: 搜索尝试（如果有关键字）
    if (retryCount === 0) {
        setImgSrc(processUrl(src, false));
    } else if (retryCount === 1) {
        setImgSrc(processUrl(src, true));
    } else {
        if (searchKeyword && retryCount === 2) handleSearch();
        else { setImgSrc(FALLBACK_IMG); setLoading(false); }
    }
  }, [src, inView, retryCount, size]);

  const handleSearch = async () => {
    if (!searchKeyword) {
        setImgSrc(FALLBACK_IMG);
        setLoading(false);
        return;
    }
    try {
        const newUrl = await getDoubanPoster(searchKeyword);
        if (newUrl) {
            // 搜索到的新图，重新从 retryCount 0 开始
            setRetryCount(0);
            setImgSrc(processUrl(newUrl, false));
        } else {
            setImgSrc(FALLBACK_IMG);
            setLoading(false);
        }
    } catch (e) {
        setImgSrc(FALLBACK_IMG);
        setLoading(false);
    }
  };

  const onError = () => {
    setRetryCount(prev => prev + 1);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden bg-gray-900/40 ${className}`}
      style={{ aspectRatio: props.style?.aspectRatio || '2/3' }}
    >
      {loading && (
        <div className="absolute inset-0 z-0 flex items-center justify-center">
            <div className="w-full h-full skeleton-shimmer animate-shimmer" />
        </div>
      )}
      {inView && imgSrc && (
        <img 
          src={imgSrc} 
          alt={alt || ""} 
          className={`w-full h-full object-cover transition-opacity duration-300 ${loading ? 'opacity-0' : 'opacity-100'}`}
          onError={onError}
          onLoad={() => setLoading(false)}
          referrerPolicy="no-referrer" 
          loading={priority ? "eager" : "lazy"}
          {...props} 
        />
      )}
    </div>
  );
};

export default ImageWithFallback;