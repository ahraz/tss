import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
  variant?: 'full' | 'icon' | 'compact';
  light?: boolean;
}

export function Logo({ size = 40, showText = true, variant = 'full', light = false }: LogoProps) {
  const iconSize = variant === 'compact' ? size * 0.5 : size;

  const BrushIcon = (
    <svg width={iconSize} height={iconSize} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Bristles */}
      <rect x="28" y="48" width="8" height="28" rx="2" fill="#0EA5E9" />
      <rect x="40" y="44" width="8" height="32" rx="2" fill="#0EA5E9" />
      <rect x="52" y="44" width="8" height="32" rx="2" fill="#0EA5E9" />
      <rect x="64" y="48" width="8" height="28" rx="2" fill="#0EA5E9" />
      {/* Brush head */}
      <rect x="22" y="42" width="56" height="12" rx="4" fill="#1E3A5F" />
      {/* Handle */}
      <rect x="44" y="8" width="12" height="38" rx="6" fill="#F59E0B" />
      <rect x="42" y="6" width="16" height="6" rx="3" fill="#F59E0B" />
      {/* Sparkle */}
      <circle cx="78" cy="18" r="5" fill="#0EA5E9" />
      <path d="M78 8 V12 M78 24 V28 M68 18 H72 M84 18 H88" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );

  if (variant === 'icon') return <>{BrushIcon}</>;

  return (
    <div className="flex items-center gap-3" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Shield Badge */}
      <div className="relative flex items-center justify-center"
        style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0">
          {/* Shield shape */}
          <path d="M50 4 L88 22 L88 50 C88 72 72 88 50 96 C28 88 12 72 12 50 L12 22 Z"
            fill="white" stroke="#1E3A5F" strokeWidth="3" />
          <path d="M50 10 L82 25 L82 50 C82 69 68 83 50 90 C32 83 18 69 18 50 L18 25 Z"
            fill="#1E3A5F" />
          {/* Inner circle */}
          <circle cx="50" cy="50" r="18" fill="white" />
          {/* TSS initials */}
          <text x="50" y="56" textAnchor="middle" fill="#1E3A5F"
            fontSize="16" fontWeight="800" fontFamily="Inter, system-ui, sans-serif">TSS</text>
        </svg>
      </div>

      {/* Company Name */}
      {showText && (
        <div>
          <div style={{ fontSize: Math.max(size * 0.5, 14), fontWeight: 700, color: light ? '#ffffff' : '#1E3A5F', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            THE SCRUB SQUAD
          </div>
          <div style={{ fontSize: Math.max(size * 0.22, 8), color: light ? '#93C5FD' : '#0EA5E9', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Professional Cleaning
          </div>
        </div>
      )}
    </div>
  );
}
