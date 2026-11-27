// 十六型人格小人：纯 SVG 生成，风格统一、加载即刻可见
import { TYPES, FAMILIES } from './types.js';

const AVATARS = {
  INTJ: { skin: '#f3c9a8', hair: '#2b2b38', hairStyle: 'side', shirt: '#5b4bd6', prop: '♟️', glasses: true, bg: '#efeaff' },
  INTP: { skin: '#f0c6a4', hair: '#5b4436', hairStyle: 'messy', shirt: '#7c5cff', prop: '🔬', glasses: true, bg: '#f1eeff' },
  ENTJ: { skin: '#eec09a', hair: '#23232d', hairStyle: 'short', shirt: '#4736c9', prop: '👑', glasses: false, bg: '#ece8ff' },
  ENTP: { skin: '#f6cfae', hair: '#8a5a32', hairStyle: 'curly', shirt: '#8f6dff', prop: '💡', glasses: false, bg: '#f4efff' },
  INFJ: { skin: '#f4cbaa', hair: '#3b2c2a', hairStyle: 'bob', shirt: '#1fa97a', prop: '🌱', glasses: false, bg: '#e6f7f0' },
  INFP: { skin: '#f7d3b6', hair: '#7a5230', hairStyle: 'long', shirt: '#37c48f', prop: '📖', glasses: false, bg: '#e9faf3' },
  ENFJ: { skin: '#efc29c', hair: '#2f2622', hairStyle: 'bun', shirt: '#179c6d', prop: '🌟', glasses: false, bg: '#e6f8f0' },
  ENFP: { skin: '#f8d0ae', hair: '#b0702c', hairStyle: 'curly', shirt: '#45cf9a', prop: '🎈', glasses: false, bg: '#eafbf4' },
  ISTJ: { skin: '#eec4a0', hair: '#2d2d36', hairStyle: 'short', shirt: '#2f6fed', prop: '📋', glasses: true, bg: '#e9f0ff' },
  ISFJ: { skin: '#f6cfae', hair: '#6b4a35', hairStyle: 'bun', shirt: '#4a86f7', prop: '🧸', glasses: false, bg: '#edf3ff' },
  ESTJ: { skin: '#e9bd97', hair: '#22232b', hairStyle: 'short', shirt: '#1f5fd0', prop: '📊', glasses: false, bg: '#e8efff' },
  ESFJ: { skin: '#f5c9a6', hair: '#8a5a3b', hairStyle: 'pony', shirt: '#5b95ff', prop: '🎀', glasses: false, bg: '#eef4ff' },
  ISTP: { skin: '#e6b892', hair: '#33333c', hairStyle: 'buzz', shirt: '#e09a1a', prop: '🔧', glasses: true, bg: '#fff5e2' },
  ISFP: { skin: '#f3c8a6', hair: '#6b4a3a', hairStyle: 'bob', shirt: '#f0b23c', prop: '🎨', glasses: false, bg: '#fff7e8' },
  ESTP: { skin: '#e7b78f', hair: '#3b2a1e', hairStyle: 'short', shirt: '#ef8f1a', prop: '🏀', glasses: false, bg: '#fff4df' },
  ESFP: { skin: '#f7cdab', hair: '#c07a33', hairStyle: 'pony', shirt: '#ffb84d', prop: '🎤', glasses: false, bg: '#fff8e6' },
};

function hairBack(c) {
  if (c.hairStyle === 'long') {
    return `<path d="M56 84 C51 44 74 24 100 24 C126 24 149 44 144 84 L147 140 C147 149 136 152 130 145 L129 96 L71 96 L70 145 C64 152 53 149 53 140 Z" fill="${c.hair}"/>`;
  }
  if (c.hairStyle === 'bob') {
    return `<path d="M55 84 C51 44 74 24 100 24 C126 24 149 44 145 84 L147 120 C147 129 136 132 130 125 L129 92 L71 92 L70 125 C64 132 53 129 53 120 Z" fill="${c.hair}"/>`;
  }
  return '';
}

function hairFront(c) {
  const base = `<path d="M58 84 C58 48 76 29 100 29 C124 29 142 48 142 84 C141 72 135 64 122 60 C110 56 95 66 79 62 C67 60 59 71 58 84 Z" fill="${c.hair}"/>`;
  switch (c.hairStyle) {
    case 'bun':
      return base + `<circle cx="100" cy="24" r="13" fill="${c.hair}"/><path d="M88 26 Q100 32 112 26" stroke="#ffffff55" stroke-width="2" fill="none"/>`;
    case 'pony':
      return base + `<ellipse cx="143" cy="94" rx="11" ry="18" transform="rotate(18 143 94)" fill="${c.hair}"/><circle cx="141" cy="82" r="4" fill="${c.hair}"/>`;
    case 'curly':
      return base + [64, 76, 88, 100, 112, 124, 136].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 38 : 48}" r="${i % 2 ? 9 : 11}" fill="${c.hair}"/>`).join('');
    case 'messy':
      return base + `<path d="M66 46 L74 30 L82 45 L92 26 L102 44 L112 28 L122 46 L132 32 L136 52 Z" fill="${c.hair}"/>`;
    case 'buzz':
      return `<path d="M60 84 C60 54 78 36 100 36 C122 36 140 54 140 84 C138 72 132 66 120 63 C108 60 92 60 80 63 C68 66 62 72 60 84 Z" fill="${c.hair}"/>`;
    case 'side':
      return base + `<path d="M100 29 C122 29 140 47 142 80 C134 66 120 59 106 58 C118 48 110 33 96 32 Z" fill="${c.hair}"/>`;
    case 'bob':
    case 'long':
      return base + `<path d="M58 82 C60 66 68 58 80 56 C72 66 64 74 62 84 Z" fill="${c.hair}"/><path d="M142 82 C140 66 132 58 120 56 C128 66 136 74 138 84 Z" fill="${c.hair}"/>`;
    default:
      return base;
  }
}

export function avatarSVG(code, { size = 160, className = '' } = {}) {
  const type = TYPES[code];
  const c = AVATARS[code] || AVATARS.INTJ;
  const gid = `av-${code}`;
  const glasses = c.glasses
    ? `<g fill="none" stroke="#2b2f3a" stroke-width="2.4">
         <circle cx="86" cy="86" r="10.5"/><circle cx="114" cy="86" r="10.5"/>
         <path d="M96.5 86 H103.5"/><path d="M75.5 84 L70 82"/><path d="M124.5 84 L130 82"/>
       </g>`
    : '';
  return `<svg class="avatar-svg ${className}" viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="${type.code} ${type.name} 卡通形象">
    <defs>
      <linearGradient id="${gid}" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${c.bg}"/><stop offset="1" stop-color="#ffffff"/>
      </linearGradient>
      <filter id="${gid}-s" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="4" stdDeviation="5" flood-color="#1c2430" flood-opacity="0.08"/>
      </filter>
    </defs>
    <rect x="4" y="4" width="192" height="192" rx="46" fill="url(#${gid})"/>
    <circle cx="40" cy="44" r="5" fill="${FAMILIES[type.family].color}" opacity="0.18"/>
    <circle cx="164" cy="38" r="8" fill="${FAMILIES[type.family].color}" opacity="0.12"/>
    <circle cx="154" cy="60" r="3" fill="${FAMILIES[type.family].color}" opacity="0.3"/>
    <ellipse cx="100" cy="186" rx="42" ry="7" fill="#1c2430" opacity="0.07"/>
    <g filter="url(#${gid}-s)">
      <g>
        <rect x="92" y="112" width="16" height="14" rx="6" fill="${c.skin}"/>
        ${hairBack(c)}
        <path d="M66 130 Q66 120 80 117 L120 117 Q134 120 134 130 L139 168 Q139 177 129 177 L71 177 Q61 177 61 168 Z" fill="${c.shirt}"/>
        <path d="M80 117 Q100 128 120 117" fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="3"/>
        <path d="M70 133 C61 139 57 150 59 162" fill="none" stroke="${c.shirt}" stroke-width="11" stroke-linecap="round"/>
        <path d="M130 133 C139 139 143 150 141 162" fill="none" stroke="${c.shirt}" stroke-width="11" stroke-linecap="round"/>
        <circle cx="58" cy="164" r="5.5" fill="${c.skin}"/>
        <circle cx="142" cy="164" r="5.5" fill="${c.skin}"/>
        <ellipse cx="86" cy="183" rx="11" ry="6" fill="#3a3f52"/>
        <ellipse cx="114" cy="183" rx="11" ry="6" fill="#3a3f52"/>
        <circle cx="61" cy="88" r="6" fill="${c.skin}"/>
        <circle cx="139" cy="88" r="6" fill="${c.skin}"/>
        <circle cx="100" cy="84" r="38" fill="${c.skin}"/>
        ${hairFront(c)}
        <ellipse cx="76" cy="99" rx="7" ry="3.6" fill="#f09b8d" opacity="0.5"/>
        <ellipse cx="124" cy="99" rx="7" ry="3.6" fill="#f09b8d" opacity="0.5"/>
        <circle cx="86" cy="86" r="3.7" fill="#2a2d3a"/>
        <circle cx="114" cy="86" r="3.7" fill="#2a2d3a"/>
        <circle cx="87.2" cy="84.8" r="1.2" fill="#ffffff" opacity="0.9"/>
        <circle cx="115.2" cy="84.8" r="1.2" fill="#ffffff" opacity="0.9"/>
        ${glasses}
        <path d="M93 101 Q100 107 107 101" fill="none" stroke="#8b4a3f" stroke-width="2.6" stroke-linecap="round"/>
        <circle cx="154" cy="154" r="23" fill="#ffffff" stroke="#e6e9f0" stroke-width="1.5"/>
        <text x="154" y="162" text-anchor="middle" font-size="21">${c.prop}</text>
      </g>
    </g>
  </svg>`;
}

export function avatarConfig(code) {
  return AVATARS[code];
}
