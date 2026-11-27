// 16 型可爱 SVG 小人：统一造型 + 家族配色 + 类型专属小道具
// 纯代码生成，无外部图片资源。

const SKIN = '#ffd9c0';
const OUTLINE = '#3a3340';

// 家族配色（衣服主色 / 腮红点缀）
const FAMILY_COLORS = {
  analyst: { shirt: '#7c5cff', cheek: '#c9b8ff' },
  diplomat: { shirt: '#1fa97a', cheek: '#a8e6cf' },
  sentinel: { shirt: '#2f6fed', cheek: '#b3ccff' },
  explorer: { shirt: '#e09a1a', cheek: '#ffe0a3' },
};

// 每型的小道具（SVG 片段，画在小人身旁或手上）
const PROPS = {
  INTJ: `<rect x="66" y="46" width="20" height="15" rx="2" fill="#fff" stroke="${OUTLINE}" stroke-width="2"/><path d="M70 51h12M70 55h8" stroke="#7c5cff" stroke-width="2" stroke-linecap="round"/>`,
  INTP: `<circle cx="74" cy="50" r="9" fill="#fff" stroke="${OUTLINE}" stroke-width="2"/><path d="M81 57l6 6" stroke="${OUTLINE}" stroke-width="3" stroke-linecap="round"/><path d="M70 48l3 3 5-6" stroke="#7c5cff" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  ENTJ: `<path d="M64 60V40l10 4-10 4" fill="#7c5cff" stroke="${OUTLINE}" stroke-width="2" stroke-linejoin="round"/>`,
  ENTP: `<path d="M66 44h18v12H74l-5 5v-5h-3z" fill="#fff" stroke="${OUTLINE}" stroke-width="2" stroke-linejoin="round"/><text x="75" y="54" font-size="10" text-anchor="middle" fill="#7c5cff" font-weight="bold">?</text>`,
  INFJ: `<path d="M64 58c0-8 5-14 11-14s11 6 11 14" fill="none" stroke="#1fa97a" stroke-width="2" stroke-linecap="round"/><circle cx="75" cy="42" r="3" fill="#1fa97a"/><path d="M75 58V48" stroke="#1fa97a" stroke-width="2" stroke-linecap="round"/>`,
  INFP: `<path d="M64 46h20v14H64z" fill="#fff" stroke="${OUTLINE}" stroke-width="2"/><path d="M74 46v14" stroke="${OUTLINE}" stroke-width="2"/><path d="M67 50h4M67 54h4M77 50h4M77 54h4" stroke="#1fa97a" stroke-width="1.6" stroke-linecap="round"/>`,
  ENFJ: `<circle cx="70" cy="46" r="4" fill="#1fa97a"/><circle cx="80" cy="46" r="4" fill="#1fa97a" opacity=".6"/><path d="M63 60c1-5 4-8 7-8s6 3 7 8M73 60c1-5 4-8 7-8" fill="none" stroke="${OUTLINE}" stroke-width="2" stroke-linecap="round"/>`,
  ENFP: `<path d="M75 40l2.5 6 6 .8-4.5 4.2 1.2 6.2-5.2-3-5.2 3 1.2-6.2-4.5-4.2 6-.8z" fill="#ffd94a" stroke="${OUTLINE}" stroke-width="1.8" stroke-linejoin="round"/>`,
  ISTJ: `<rect x="64" y="42" width="22" height="18" rx="2" fill="#fff" stroke="${OUTLINE}" stroke-width="2"/><path d="M68 42v-3h14v3M68 48h14M68 53h10" stroke="#2f6fed" stroke-width="2" fill="none" stroke-linecap="round"/>`,
  ISFJ: `<path d="M75 58s-9-5.5-9-11a4.5 4.5 0 019-2 4.5 4.5 0 019 2c0 5.5-9 11-9 11z" fill="#ff8fa3" stroke="${OUTLINE}" stroke-width="1.8" stroke-linejoin="round"/>`,
  ESTJ: `<rect x="64" y="46" width="22" height="6" rx="1.5" fill="#2f6fed"/><rect x="64" y="55" width="16" height="6" rx="1.5" fill="#2f6fed" opacity=".55"/><path d="M60 46v15" stroke="${OUTLINE}" stroke-width="2.5" stroke-linecap="round"/>`,
  ESFJ: `<path d="M63 48h18v10H70l-4 4v-4h-3z" fill="#fff" stroke="${OUTLINE}" stroke-width="2" stroke-linejoin="round"/><path d="M85 44h8v8h-4l-3 3v-3h-1z" fill="#ff8fa3" stroke="${OUTLINE}" stroke-width="1.6" stroke-linejoin="round"/>`,
  ISTP: `<path d="M84 44a7 7 0 00-9 9l-9 9 4 4 9-9a7 7 0 009-9l-5 5-4-4z" fill="#cfd6e4" stroke="${OUTLINE}" stroke-width="1.8" stroke-linejoin="round"/>`,
  ISFP: `<path d="M64 44h20v14H64z" fill="#fff" stroke="${OUTLINE}" stroke-width="2"/><circle cx="70" cy="49" r="2" fill="#e09a1a"/><path d="M64 56l6-6 5 5 4-4 5 5v2H64z" fill="#7ec8a9"/>`,
  ESTP: `<path d="M64 50l6-8 4 5 4-5 6 8-4 8h-12z" fill="#ffd94a" stroke="${OUTLINE}" stroke-width="1.8" stroke-linejoin="round"/>`,
  ESFP: `<circle cx="76" cy="44" r="5" fill="#fff" stroke="${OUTLINE}" stroke-width="2"/><path d="M76 49v12M76 53c-4 0-7-2-7-5M76 55c4 0 7 2 7 5" stroke="${OUTLINE}" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M84 38v8m-3-5 3 2 3-2" stroke="#e09a1a" stroke-width="2" fill="none" stroke-linecap="round"/>`,
};

// 发型按功能栈主导风格简单区分（感知主导偏蓬松，判断主导偏整齐）
function hair(code, color) {
  const fluffy = ['Ne', 'Se'].includes(dominantOf(code));
  return fluffy
    ? `<path d="M28 34c-3-12 5-22 22-22s25 10 22 22c-2-6-6-9-8-8 1 3-1 4-2 3 0-5-5-8-12-8s-12 3-12 8c-1 1-3 0-2-3-2-1-6 2-8 8z" fill="${color}"/>`
    : `<path d="M30 32c-2-11 6-20 20-20s22 9 20 20l-3-2c1-7-6-12-17-12S31 23 33 30z" fill="${color}"/>`;
}

const STACKS = {
  INTJ: 'Ni', INTP: 'Ti', ENTJ: 'Te', ENTP: 'Ne',
  INFJ: 'Ni', INFP: 'Fi', ENFJ: 'Fe', ENFP: 'Ne',
  ISTJ: 'Si', ISFJ: 'Si', ESTJ: 'Te', ESFJ: 'Fe',
  ISTP: 'Ti', ISFP: 'Fi', ESTP: 'Se', ESFP: 'Se',
};
function dominantOf(code) { return STACKS[code] || 'Ne'; }

export function avatarSVG(code, familyKey, size = 120) {
  const fam = FAMILY_COLORS[familyKey] || FAMILY_COLORS.diplomat;
  const hairColor = '#4a3b52';
  const prop = PROPS[code] || '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="${size}" height="${size}" role="img" aria-label="${code} 小人">
  <circle cx="50" cy="52" r="44" fill="${fam.cheek}" opacity=".35"/>
  <path d="M32 84c0-12 8-18 18-18s18 6 18 18" fill="${fam.shirt}" stroke="${OUTLINE}" stroke-width="2" stroke-linejoin="round"/>
  <circle cx="50" cy="38" r="22" fill="${SKIN}" stroke="${OUTLINE}" stroke-width="2"/>
  ${hair(code, hairColor)}
  <circle cx="42" cy="40" r="2.6" fill="${OUTLINE}"/>
  <circle cx="58" cy="40" r="2.6" fill="${OUTLINE}"/>
  <circle cx="35" cy="47" r="3.4" fill="${fam.cheek}"/>
  <circle cx="65" cy="47" r="3.4" fill="${fam.cheek}"/>
  <path d="M44 49q6 5 12 0" fill="none" stroke="${OUTLINE}" stroke-width="2.4" stroke-linecap="round"/>
  ${prop}
</svg>`;
}
