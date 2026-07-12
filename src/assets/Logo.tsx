import React from 'react';
import logoImage from './gtascrub.png';

interface LogoProps {
  size?: number;
  showText?: boolean;
  variant?: 'full' | 'icon' | 'compact';
  light?: boolean;
}

export function Logo({ size = 40, showText = true, variant = 'full', light = false }: LogoProps) {
  if (variant === 'icon') {
    return <img src={logoImage} alt="GTA Scrub" width={size} height={size} style={{ objectFit: 'contain' }} />;
  }

  return (
    <div className="flex items-center gap-3">
      <img src={logoImage} alt="GTA Scrub" width={size} height={size} style={{ objectFit: 'contain' }} />

      {showText && (
        <div>
          <div style={{ fontSize: Math.max(size * 0.5, 14), fontWeight: 700, color: light ? '#ffffff' : '#1E3A5F', lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            GTA Scrub
          </div>
          <div style={{ fontSize: Math.max(size * 0.22, 8), color: light ? '#93C5FD' : '#0EA5E9', fontWeight: 600, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
            Commercial Cleaning
          </div>
        </div>
      )}
    </div>
  );
}
