import React from 'react';

// Fundal de amurg: cer, lună, munți, un castel pe deal și pădure.
export default function SceneBg() {
  const birds = [[120, 140, 1], [170, 120, 0.8], [880, 170, 1.1], [930, 140, 0.8], [990, 190, 0.7], [640, 90, 0.6]];
  const trees = [];
  for (let i = 0; i < 46; i++) {
    const x = i * 24 + (i % 3) * 5 - 10;
    const h = 40 + ((i * 37) % 30);
    trees.push(`M${x} 760 L${x + 11} ${760 - h} L${x + 22} 760 Z`);
  }
  return (
    <svg className="scene" viewBox="0 0 1100 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#111113" />
          <stop offset="40%" stopColor="#1f1d1c" />
          <stop offset="70%" stopColor="#3d2f22" />
          <stop offset="88%" stopColor="#9c6a2a" />
          <stop offset="100%" stopColor="#d9a043" />
        </linearGradient>
        <radialGradient id="moon" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff0c4" />
          <stop offset="70%" stopColor="#f2c75c" />
          <stop offset="100%" stopColor="#f2c75c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="moonglow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f5c95a" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#f5c95a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b0a0a" stopOpacity="0" />
          <stop offset="100%" stopColor="#0b0a0a" stopOpacity="0.95" />
        </linearGradient>
      </defs>
      <rect width="1100" height="800" fill="url(#sky)" />
      <circle cx="860" cy="430" r="260" fill="url(#moonglow)" />
      <circle cx="860" cy="430" r="120" fill="url(#moon)" opacity="0.9" />
      {/* munți îndepărtați */}
      <path d="M0 560 L90 470 L170 520 L260 430 L360 520 L450 460 L560 540 L660 450 L760 520 L860 470 L960 540 L1100 460 L1100 800 L0 800 Z" fill="#2b2724" opacity="0.85" />
      <path d="M0 620 L120 540 L230 600 L330 550 L470 630 L600 560 L720 630 L860 570 L990 640 L1100 590 L1100 800 L0 800 Z" fill="#1d1b19" />
      {/* castel pe deal */}
      <g fill="#0e0d0c">
        <path d="M60 640 Q170 520 300 640 Z" />
        <rect x="140" y="470" width="70" height="120" />
        <rect x="128" y="430" width="22" height="160" />
        <path d="M124 430 L139 380 L154 430 Z" />
        <rect x="200" y="450" width="20" height="140" />
        <path d="M196 450 L210 405 L224 450 Z" />
        <rect x="160" y="410" width="26" height="70" />
        <path d="M156 410 L173 350 L190 410 Z" />
        <rect x="110" y="500" width="120" height="90" />
      </g>
      <g fill="#ffd36b" opacity="0.8">
        <rect x="168" y="430" width="5" height="9" />
        <rect x="136" y="460" width="4" height="8" />
        <rect x="150" y="520" width="5" height="9" />
        <rect x="190" y="530" width="5" height="9" />
      </g>
      {/* pădure */}
      <path d={trees.join(' ')} fill="#0b0a09" />
      <rect y="740" width="1100" height="60" fill="#0b0a09" />
      {/* păsări */}
      {birds.map(([x, y, s], i) => (
        <path key={i} d="M0 0 Q6 -6 12 0 Q18 -6 24 0" transform={`translate(${x},${y}) scale(${s})`} fill="none" stroke="#0b0a09" strokeWidth="2.5" className="bird" style={{ animationDelay: `${i * 0.7}s` }} />
      ))}
      <rect width="1100" height="800" fill="url(#fade)" opacity="0.55" />
    </svg>
  );
}
