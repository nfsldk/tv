
import React, { useState, useEffect, useRef } from 'react';
import { getDoubanPoster } from '../services/vodService';

// 高质量品牌占位符 (带有品牌色渐变)
const FALLBACK_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 450' style='background:%230f172a'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%231e293b'/%3E%3Cstop offset='100%25' stop-color='%230f172a'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2322c55e' font-family='system-ui' font-size='20' font-weight='900' style='letter-spacing:2px;opacity:0.3'%3ECINESTREAM%3C/text%3E%3C/svg%3E";

const PROXY_NODES = [
    'https://wsrv.nl/?url=',        // 第一优先级：高性能全球 CDN 镜像 (Cloudflare 节点)
    'https://images.weserv.nl/?url=', // 第二优先级：经典高稳定性节点
    'https://daili.laibo123.dpdns.org/?url=' // 第三优先级：特定线路优化节点
];

const BAD_IMAGE_PATTERNS = ['nopic', 'mac_default', 'no_pic', 'default.jpg', 'error.png', 'placeholder', 'error.jpg', 'static/img/'];

interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src?: string;
  searchKeyword?: string;
  priority?: boolean;
  size?: 's' | 'm' | 'l'; // s: 120px, m: 300px, l: 600px+
}

const ImageWithFallback: React.FC<ImageProps> = ({ 
  src, 
  alt, 
  className, 
  searchKeyword, 
  priority = false, 
  size = 'm', 
  ...props 
}) => {
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [retryStage, setRetryStage] = useState(0); 
  const [inView, setInView] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. 视口观察逻辑 (Lazy Loading)
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
  }, [priority, inView]);

  // 2. 核心 URL 构造与优化逻辑
  const constructUrl = (base: string, stage: number) => {
    if (!base) return null;
    let url = base.trim();
    if (url.startsWith('//')) url = 'https:' + url;

    // 过滤已知坏链
    if (BAD_IMAGE_PATTERNS.some(p => url.toLowerCase().includes(p))) return null;

    // 清理豆瓣 URL 以免干扰代理，并统一使用高质量原图后再由代理进行裁剪
    if (url.includes('doubanio.com')) {
        url = url.replace(/s_ratio_poster|m(?=\/public)|s(?=\/public)|l(?=\/public)/, 'l');
    }

    // 策略分发
    if (stage === 0) return url; // 尝试原链
    
    // CDN 代理阶段 (0 < stage <= PROXY_NODES.length)
    if (stage <= PROXY_NODES.length) {
        const proxy = PROXY_NODES[stage - 1];
        
        // 根据 size 动态计算目标宽度，节省流量并加快加载
        const width = size === 's' ? 120 : (size === 'm' ? 320 : 720);
        const quality = priority ? 90 : 80;
        
        // 关键优化：开启 WebP 压缩，禁用 Weserv 的内部坏缓存(n=-1)，指定尺寸裁剪
        return `${proxy}${encodeURIComponent(url)}&output=webp&q=${quality}&w=${width}&n=-1&we`;
    }

    return null;
  };

  useEffect(() => {
    if (!inView) return;

    const currentUrl = constructUrl(src || '', retryStage);

    if (currentUrl === null) {
        if (searchKeyword && retryStage < 10) {
            handleSearch();
        } else {
            setImgSrc(FALLBACK_IMG);
            setLoading(false);
        }
        return;
    }

    setImgSrc(currentUrl);
  }, [src, inView, retryStage, size]);

  const handleSearch = async () => {
    try {
        const newUrl = await getDoubanPoster(searchKeyword || alt || '');
        if (newUrl) {
            setRetryStage(0); 
            setImgSrc(newUrl);
        } else {
            setImgSrc(FALLBACK_IMG);
            setLoading(false);
        }
    } catch (e) {
        setImgSrc(FALLBACK_IMG);
        setLoading(false);
    }
  };

  const handleError = () => {
    // 自动重试下一个代理节点
    if (retryStage < PROXY_NODES.length) {
        setRetryStage(prev => prev + 1);
    } else if (searchKeyword && retryStage < 10) {
        setRetryStage(10); 
        handleSearch();
    } else {
        setImgSrc(FALLBACK_IMG);
        setLoading(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden bg-slate-900 border border-white/5 transition-all duration-300 ${className}`}
      style={{ aspectRatio: props.style?.aspectRatio || '2/3', ...props.style }}
    >
      {loading && (
        <div className="absolute inset-0 z-0 flex items-center justify-center bg-gray-900">
            <div className="w-full h-full skeleton-shimmer animate-shimmer opacity-25" />
        </div>
      )}
      {inView && imgSrc && (
        <img 
          src={imgSrc} 
          alt={alt || ""} 
          className={`w-full h-full object-cover transition-all duration-700 ${loading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'}`}
          onError={handleError}
          onLoad={() => setLoading(false)}
          referrerPolicy="no-referrer" 
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          {...props} 
        />
      )}
    </div>
  );
};

export default ImageWithFallback;
