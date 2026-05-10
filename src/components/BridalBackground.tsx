import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { useUIStore } from '../store/uiStore';

export function BridalBackground() {
  const { theme } = useUIStore();
  const isDark = theme === 'dark';
  const assetVersion = '2026-05-05-1';

  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const imgSrc = isDark ? `/dunkel mode.png?v=${assetVersion}` : `/hell mode .png?v=${assetVersion}`;
  const bgUrl = isDark
    ? `url('/dunkel%20mode.png?v=${assetVersion}')`
    : `url('/hell%20mode%20.png?v=${assetVersion}')`;

  const content = (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isDark
            ? 'linear-gradient(135deg, #090a0d 0%, #0e1014 52%, #0a0c10 100%)'
            : '#ffffff',
          transition: 'background 0.5s ease',
        }}
      />

      {!isDark && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: loaded && !error ? bgUrl : 'none',
            backgroundSize: 'cover',
            backgroundPosition: 'left center',
            backgroundRepeat: 'no-repeat',
            opacity: loaded && !error ? 0.86 : 0,
            transition: 'opacity 1.2s ease',
            transform: 'scale(1.005)',
            filter: 'blur(20px) brightness(0.82) saturate(0.24)',
            maskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.98) 16%, rgba(0,0,0,0.88) 30%, rgba(0,0,0,0.64) 44%, rgba(0,0,0,0.28) 58%, rgba(0,0,0,0.08) 70%, transparent 82%)',
            WebkitMaskImage: 'linear-gradient(to right, rgba(0,0,0,1) 0%, rgba(0,0,0,0.98) 16%, rgba(0,0,0,0.88) 30%, rgba(0,0,0,0.64) 44%, rgba(0,0,0,0.28) 58%, rgba(0,0,0,0.08) 70%, transparent 82%)',
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: loaded && !error ? bgUrl : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'left center',
          backgroundRepeat: 'no-repeat',
          opacity: loaded && !error ? 1 : 0,
          transition: 'opacity 1.2s ease',
          transform: isDark ? 'scale(1.02)' : 'scale(1.005)',
          filter: isDark
            ? 'brightness(0.84) contrast(1.03)'
            : 'brightness(0.82) saturate(0.24)',
        }}
      />

      <img
        key={imgSrc}
        src={imgSrc}
        alt=""
        style={{ position: 'absolute', width: 0, height: 0, opacity: 0, pointerEvents: 'none' }}
        onLoad={() => setLoaded(true)}
        onError={() => {
          setError(true);
          setLoaded(true);
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: isDark
            ? 'linear-gradient(to right, rgba(8,9,11,0.28) 0%, rgba(10,12,15,0.18) 18%, rgba(12,14,18,0.24) 36%, rgba(13,15,19,0.40) 62%, rgba(10,12,16,0.56) 100%)'
            : 'rgba(255,255,255,0.06)',
          transition: 'background 0.5s ease',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          width: '24%',
          background: isDark
            ? 'linear-gradient(to right, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.015) 44%, transparent 100%)'
            : 'transparent',
        }}
      />

      <motion.div
        animate={{ opacity: [0.22, 0.38, 0.22] }}
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        style={{
          position: 'absolute',
          top: '-8%',
          left: '-2%',
          width: '56%',
          height: '78%',
          background: isDark
            ? 'radial-gradient(ellipse at 28% 36%, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.04) 24%, transparent 62%)'
            : 'transparent',
          filter: 'blur(84px)',
        }}
      />

      {!isDark && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '22%',
            background: 'transparent',
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: isDark ? 0.025 : 0.010,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundSize: '180px',
        }}
      />
    </div>
  );

  return createPortal(content, document.body);
}
