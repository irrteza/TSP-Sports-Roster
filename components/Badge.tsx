import React from 'react';

interface BadgeProps {
  label: string;
}

const Badge: React.FC<BadgeProps> = ({ label }) => {
  return (
    <span className="bg-white/80 backdrop-blur-md text-slate-800 text-[10px] font-bold px-3 py-1.5 rounded-full shadow-sm tracking-widest uppercase border border-white/40 hover:bg-white hover:scale-105 transition-all duration-300 cursor-default">
      {label}
    </span>
  );
};

export default Badge;