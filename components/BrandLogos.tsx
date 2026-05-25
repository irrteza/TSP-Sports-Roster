
import React from 'react';

export const GymsharkLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M12.7 8.8L10.5 12.5L2 14.5L9 19L5.5 24L18.5 17.5L24 16L12.7 8.8ZM16.5 14L15 15.5L12 10.5L16.5 14Z" />
    <path d="M17 6.5L9 2L7.5 5.5L13.5 10L17 6.5Z" />
  </svg>
);

export const NoccoLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 30" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
    <path d="M10 5 L15 5 L20 20 L20 5 L25 5 L25 25 L20 25 L15 10 L15 25 L10 25 Z" />
    <path d="M30 15 A5 5 0 1 1 40 15 A5 5 0 1 1 30 15 M35 25 A10 10 0 1 0 35 5 A10 10 0 1 0 35 25" />
    <path d="M50 25 L45 25 L45 5 L60 5 L60 10 L50 10 L50 25" /> 
    <path d="M70 25 L65 25 L65 5 L80 5 L80 10 L70 10 L70 25" />
    <path d="M85 15 A5 5 0 1 1 95 15 A5 5 0 1 1 85 15 M90 25 A10 10 0 1 0 90 5 A10 10 0 1 0 90 25" />
  </svg>
);

export const C4Logo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 100 40" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
     <path d="M20 35 C 5 35, 5 5, 20 5 L 30 5 L 30 12 L 20 12 C 15 12, 15 28, 20 28 L 30 28 L 30 35 L 20 35" />
     <path d="M60 5 L 60 25 L 70 25 L 70 35 L 60 35 L 60 28 L 45 28 L 45 20 L 60 5 M 52 20 L 52 12 L 52 20" />
  </svg>
);

export const ManscapedLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 20" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
     <text x="0" y="15" fontFamily="sans-serif" fontWeight="900" fontSize="16" letterSpacing="1">MANSCAPED</text>
  </svg>
);

export const BuckedUpLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
     <path d="M2 4 L 6 10 L 12 2 L 18 10 L 22 4 L 20 12 L 12 22 L 4 12 Z" />
  </svg>
);

export const RealGoodLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 120 30" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
     <text x="0" y="20" fontFamily="cursive" fontWeight="bold" fontSize="18">RealGood</text>
  </svg>
);

export const ELogo = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
        <path d="M16 12 H 8 C 8 15 10 16 12 16 C 14 16 15 15 15.5 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M16 11 C 16 8 13 8 12 8 C 10 8 8 9 8 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </svg>
);

export const GetBrandLogo = (brandName: string, className: string = "w-full h-full") => {
  const name = brandName.toLowerCase();
  if (name.includes('gymshark')) return <GymsharkLogo className={className} />;
  if (name.includes('nocco')) return <NoccoLogo className={className} />;
  if (name.includes('c4') || name.includes('cellucor')) return <C4Logo className={className} />;
  if (name.includes('manscaped')) return <ManscapedLogo className={className} />;
  if (name.includes('bucked')) return <BuckedUpLogo className={className} />;
  if (name.includes('real')) return <RealGoodLogo className={className} />;
  if (name.includes('element') || name === 'e') return <ELogo className={className} />;
  
  // Fallback text
  return <span className={`font-bold uppercase flex items-center justify-center text-[10px] ${className}`}>{brandName}</span>;
}
