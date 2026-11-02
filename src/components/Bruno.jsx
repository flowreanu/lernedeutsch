import React from 'react';

// Bruno, ursulețul cu pălărie bavareză. Animat permanent (respiră, clipește, mișcă urechile).
// mood: hello | happy | sad | cheer | think | idle ; talking: gura se mișcă
export default function Bruno({ mood = 'idle', size = 90, talking = false, className = '' }) {
  const fur = '#b0703f';
  const muzzle = '#f4dcbc';
  const ink = '#2a1d14';
  const happyEyes = mood === 'happy' || mood === 'cheer';
  const armL = mood === 'cheer' ? 'M30 92 Q14 70 18 54' : mood === 'sad' ? 'M32 96 Q24 108 30 116' : 'M32 96 Q20 104 24 114';
  const armR =
    mood === 'cheer' || mood === 'hello'
      ? 'M90 92 Q108 74 104 54'
      : mood === 'think'
      ? 'M88 96 Q86 84 70 78'
      : mood === 'sad'
      ? 'M88 96 Q96 108 90 116'
      : 'M88 96 Q100 104 96 114';
  return (
    <svg
      className={`bruno bruno-${mood}${talking ? ' talking' : ''} ${className}`}
      width={size}
      height={size}
      viewBox="-4 -8 128 140"
      aria-hidden="true"
    >
      <ellipse cx="60" cy="129" rx="28" ry="4" fill="rgba(0,0,0,.12)" className="b-shadow" />
      <g className="b-all">
        <g className="b-body">
          <ellipse cx="60" cy="108" rx="30" ry="22" fill={fur} />
          <ellipse cx="60" cy="112" rx="18" ry="13" fill={muzzle} opacity="0.85" />
          <path d={armL} stroke={fur} strokeWidth="13" strokeLinecap="round" fill="none" />
          <g className={mood === 'hello' ? 'b-wave' : ''}>
            <path d={armR} stroke={fur} strokeWidth="13" strokeLinecap="round" fill="none" />
          </g>
        </g>
        <g className="b-head">
          <g className="b-ear-l">
            <circle cx="30" cy="34" r="13" fill={fur} />
            <circle cx="30" cy="34" r="7" fill={muzzle} />
          </g>
          <g className="b-ear-r">
            <circle cx="90" cy="34" r="13" fill={fur} />
            <circle cx="90" cy="34" r="7" fill={muzzle} />
          </g>
          <circle cx="60" cy="58" r="34" fill={fur} />
          <ellipse cx="60" cy="70" rx="17" ry="13" fill={muzzle} />
          {happyEyes ? (
            <g>
              <path d="M43 54 Q48 48 53 54" stroke={ink} strokeWidth="3.5" fill="none" strokeLinecap="round" />
              <path d="M67 54 Q72 48 77 54" stroke={ink} strokeWidth="3.5" fill="none" strokeLinecap="round" />
            </g>
          ) : (
            <g className="b-eyes">
              <ellipse cx="48" cy="54" rx="4.2" ry="4.8" fill={ink} />
              <ellipse cx="72" cy={mood === 'think' ? 52 : 54} rx="4.2" ry="4.8" fill={ink} />
              <circle cx="49.6" cy="52.4" r="1.4" fill="#fff" />
              <circle cx="73.6" cy={mood === 'think' ? 50.4 : 52.4} r="1.4" fill="#fff" />
            </g>
          )}
          {mood === 'sad' && (
            <g stroke={ink} strokeWidth="2.5" strokeLinecap="round">
              <path d="M41 48 L52 44" />
              <path d="M79 48 L68 44" />
            </g>
          )}
          <ellipse cx="60" cy="64" rx="6" ry="4.5" fill={ink} />
          {talking ? (
            <ellipse cx="60" cy="75" rx="5" ry="4" fill="#9c3b30" className="b-mouth" />
          ) : mood === 'sad' ? (
            <path d="M52 77 Q60 71 68 77" stroke={ink} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          ) : mood === 'think' ? (
            <path d="M54 75 L66 74" stroke={ink} strokeWidth="2.5" strokeLinecap="round" />
          ) : (
            <path d="M51 72 Q60 82 69 72" stroke={ink} strokeWidth="2.5" fill={mood === 'cheer' || mood === 'happy' ? '#c4574a' : 'none'} strokeLinecap="round" />
          )}
          <circle cx="38" cy="66" r="5" fill="#f08f80" opacity={mood === 'sad' ? 0.2 : 0.55} />
          <circle cx="82" cy="66" r="5" fill="#f08f80" opacity={mood === 'sad' ? 0.2 : 0.55} />
          {mood === 'sad' && <path d="M77 60 Q79 66 77 68 Q74 66 77 60" fill="#8ccaf5" className="b-tear" />}
          <g className="b-hat">
            <ellipse cx="60" cy="28" rx="30" ry="6" fill="#2f2e33" />
            <path d="M40 28 Q42 8 60 7 Q78 8 80 28 Z" fill="#3d3c42" />
            <rect x="40" y="21" width="40" height="3.2" fill="#e0645a" />
            <rect x="40" y="24.2" width="40" height="3.2" fill="#f2bf3c" />
            <path d="M78 22 Q92 4 86 -2 Q82 10 76 20 Z" fill="#f4e3c1" stroke="#a88a52" strokeWidth="0.8" />
          </g>
        </g>
        {mood === 'think' && (
          <g fill="#fff" stroke="#2e2d31" strokeWidth="1.5" className="b-think">
            <circle cx="102" cy="30" r="3" />
            <circle cx="110" cy="16" r="6" />
            <text x="110" y="20" fontSize="9" textAnchor="middle" fill="#2e2d31" stroke="none" fontWeight="800">?</text>
          </g>
        )}
      </g>
    </svg>
  );
}
