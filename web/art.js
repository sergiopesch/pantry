// Illustrations for products with no captured CDN image yet, plus Pantry's icons.
// House rule: round shapes only. No triangles, no arrowheads, no pointy map pins.

const shine = (cx, cy, rx, ry, o = 0.45) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${o}"/>`;
const dots = (pts, r, fill) => pts.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`).join('');

const ART = {
  egg: () => `
    <ellipse cx="38" cy="57" rx="18" ry="24" fill="#E3B98C"/>
    <ellipse cx="61" cy="59" rx="18" ry="24" fill="#EFD0A6"/>
    ${shine(55, 48, 5, 8)}${shine(32, 46, 4, 7, 0.35)}`,
  milk: () => `
    <rect x="40" y="14" width="20" height="20" rx="7" fill="#fff" stroke="#E2D8CC" stroke-width="2"/>
    <rect x="38" y="9" width="24" height="9" rx="4.5" fill="#3E9C8F"/>
    <rect x="31" y="28" width="38" height="60" rx="14" fill="#fff" stroke="#E2D8CC" stroke-width="2"/>
    <rect x="32" y="52" width="36" height="16" fill="#3E9C8F" opacity=".9"/>
    ${shine(41, 40, 4, 8, 0.8)}`,
  yoghurt: () => `
    <rect x="25" y="38" width="50" height="46" rx="13" fill="#fff" stroke="#E2D8CC" stroke-width="2"/>
    <rect x="26" y="54" width="48" height="14" fill="#F2A65A"/>
    <ellipse cx="50" cy="38" rx="26" ry="8" fill="#F4E4D4" stroke="#E2D8CC" stroke-width="2"/>
    ${shine(36, 46, 4, 5, 0.8)}`,
  cheese: () => `
    <circle cx="50" cy="54" r="30" fill="#F2C14E"/>
    <circle cx="50" cy="54" r="27" fill="none" stroke="#E2A93A" stroke-width="3"/>
    ${dots([[40, 46], [60, 60]], 5, '#E2A93A')}${dots([[57, 42], [42, 65], [64, 49]], 3, '#E2A93A')}
    ${shine(40, 38, 9, 4, 0.45)}`,
  bread: () => `
    <path d="M20 58a30 24 0 0 1 60 0v20a7 7 0 0 1-7 7H27a7 7 0 0 1-7-7z" fill="#D69A5E"/>
    <path d="M36 44q5 8 0 16M50 40q5 9 0 18M64 44q5 8 0 16" stroke="#B37840" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${shine(40, 42, 10, 4, 0.3)}`,
  pasta: () => `
    <g transform="rotate(-18 50 52)">
      ${[30, 47, 64].map((y, i) => `<rect x="20" y="${y}" width="60" height="13" rx="6.5" fill="${['#F0C66B', '#F3CF7E', '#ECBE5E'][i]}"/>
      <path d="M32 ${y + 1}q4 6 0 11M46 ${y + 1}q4 6 0 11M60 ${y + 1}q4 6 0 11M72 ${y + 2}q3 5 0 9" stroke="#D9A845" stroke-width="2.4" fill="none" stroke-linecap="round"/>`).join('')}
    </g>`,
  banana: () => `
    <path d="M22 38C28 70 62 82 82 60c2.5-3 0-6.5-3.5-5C61 67 40 60 31 37c-1.6-4.2-9.6-4-9 1z" fill="#F5D049"/>
    <path d="M26 42C33 64 58 74 76 61" stroke="#E5B92F" stroke-width="3" fill="none" stroke-linecap="round"/>
    ${dots([[79, 58]], 3, '#8A6A2A')}${dots([[26, 37]], 2.6, '#8A6A2A')}`,
  strawberry: () => `
    <path d="M50 85C30 77 21 57 25 45c4-11 16-13 25-9 9-4 21-2 25 9 4 12-5 32-25 40z" fill="#E2483D"/>
    <ellipse cx="41" cy="34" rx="9" ry="4.5" fill="#5E9E4A" transform="rotate(-25 41 34)"/>
    <ellipse cx="59" cy="34" rx="9" ry="4.5" fill="#5E9E4A" transform="rotate(25 59 34)"/>
    <circle cx="50" cy="32" r="5" fill="#4F8F3F"/>
    ${dots([[40, 50], [52, 47], [62, 53], [45, 61], [57, 63], [50, 74], [38, 58]], 1.8, '#F7D774')}
    ${shine(36, 48, 4, 6, 0.3)}`,
  blueberry: () => `
    ${[[36, 58, 15, '#4B5C9E'], [62, 60, 14, '#3F4F8C'], [50, 40, 14, '#5A6BB0'], [50, 70, 11, '#46558F']].map(([x, y, r, f]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/><circle cx="${x}" cy="${y - r * 0.55}" r="${r * 0.22}" fill="none" stroke="#2D3762" stroke-width="2"/>${shine(x - r * 0.4, y - r * 0.1, r * 0.22, r * 0.3, 0.3)}`).join('')}`,
  apple: () => `
    <rect x="48" y="18" width="4.5" height="16" rx="2.2" fill="#7A4A2A"/>
    <ellipse cx="61" cy="24" rx="10" ry="4.5" fill="#5E9E4A" transform="rotate(-22 61 24)"/>
    <path d="M50 35c-10-8-28-4-28 18 0 18 14 32 28 28 14 4 28-10 28-28 0-22-18-26-28-18z" fill="#D9483B"/>
    ${shine(35, 48, 6, 10, 0.35)}`,
  avocado: () => `
    <path d="M50 14c14 0 22 24 26 40 4 19-10 34-26 34S20 73 24 54c4-16 12-40 26-40z" fill="#4E7A3A"/>
    <path d="M50 23c11 0 17 20 20 33 3 14-8 25-20 25S27 70 30 56c3-13 9-33 20-33z" fill="#CFE08A"/>
    <circle cx="50" cy="60" r="12" fill="#8A5A32"/>${shine(46, 56, 4, 3, 0.35)}`,
  broccoli: () => `
    <rect x="44" y="54" width="12" height="32" rx="6" fill="#8DBF5F"/>
    ${[[34, 47, 14, '#4F8F3F'], [66, 47, 14, '#4F8F3F'], [50, 35, 16, '#5E9E4A'], [50, 52, 13, '#5E9E4A']].map(([x, y, r, f]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`).join('')}
    ${shine(44, 30, 6, 4, 0.25)}`,
  leaf: () => `
    <ellipse cx="40" cy="52" rx="16" ry="30" fill="#4F8F3F" transform="rotate(-25 40 52)"/>
    <ellipse cx="60" cy="54" rx="16" ry="30" fill="#5E9E4A" transform="rotate(22 60 54)"/>
    <path d="M30 72Q40 52 48 30M70 74Q60 54 54 32" stroke="#8DBF5F" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  sweetpotato: () => `
    <ellipse cx="50" cy="54" rx="34" ry="17" fill="#C8643B" transform="rotate(-18 50 54)"/>
    ${dots([[36, 58], [52, 50], [64, 46], [44, 64]], 1.8, '#9A4A2A')}${shine(42, 48, 10, 4, 0.25)}`,
  carrot: () => `
    <ellipse cx="44" cy="20" rx="5" ry="11" fill="#5E9E4A" transform="rotate(-20 44 20)"/>
    <ellipse cx="56" cy="20" rx="5" ry="11" fill="#4F8F3F" transform="rotate(20 56 20)"/>
    <rect x="38" y="28" width="24" height="58" rx="12" fill="#EE8A32"/>
    <path d="M42 44h6M52 56h6M43 68h6" stroke="#D16E1F" stroke-width="2.4" stroke-linecap="round"/>`,
  potato: () => `
    <path d="M24 54c0-15 14-24 28-23 16 1 26 10 25 24-1 15-14 22-28 21-15-1-25-8-25-22z" fill="#D8B07A"/>
    ${dots([[38, 48], [58, 44], [64, 60], [44, 64]], 2, '#B98C55')}${shine(40, 42, 9, 4, 0.3)}`,
  rice: () => `
    <ellipse cx="50" cy="50" rx="27" ry="11" fill="#fff"/>
    ${dots([[40, 46], [50, 44], [60, 47], [45, 52], [56, 52]], 2.2, '#EFE7DA')}
    <path d="M18 52h64a32 28 0 0 1-64 0z" fill="#E7C9A8"/>
    <path d="M24 60q26 12 52 0" stroke="#D2AE88" stroke-width="2.4" fill="none" stroke-linecap="round"/>`,
  oil: () => `
    <rect x="43" y="10" width="14" height="10" rx="4" fill="#5C6B2E"/>
    <rect x="41" y="18" width="18" height="18" rx="6" fill="#B9C46A"/>
    <rect x="30" y="32" width="40" height="56" rx="14" fill="#9DAF4A"/>
    <rect x="30" y="52" width="40" height="16" fill="#E9E2B8"/>${shine(39, 44, 4, 8, 0.4)}`,
  chicken: () => `
    <rect x="56" y="58" width="26" height="9" rx="4.5" fill="#F6EBDD" transform="rotate(38 56 58)"/>
    ${dots([[76, 78], [82, 72]], 5.5, '#F6EBDD')}
    <ellipse cx="44" cy="46" rx="25" ry="21" fill="#E3A25F" transform="rotate(-32 44 46)"/>
    ${shine(36, 38, 9, 5, 0.3)}`,
  mince: () => `
    <rect x="16" y="50" width="68" height="30" rx="12" fill="#F2ECE6"/>
    <ellipse cx="50" cy="52" rx="28" ry="15" fill="#B5473A"/>
    ${dots([[38, 50], [48, 46], [60, 50], [44, 56], [56, 57]], 2.4, '#953529')}`,
  fish: () => `
    <rect x="16" y="36" width="68" height="32" rx="16" fill="#F08A5D"/>
    <path d="M32 40q6 12 0 24M46 38q6 14 0 28M60 38q6 14 0 28M72 40q5 12 0 24" stroke="#FBD2BC" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    ${shine(30, 44, 6, 3, 0.35)}`,
  coffee: () => `
    ${[[36, 50, -30], [62, 46, 25], [50, 66, -8]].map(([x, y, r]) => `<g transform="rotate(${r} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="13" ry="17" fill="#6B4026"/><path d="M${x} ${y - 13}q-6 13 0 26" stroke="#3E2416" stroke-width="2.6" fill="none" stroke-linecap="round"/></g>`).join('')}`,
  chilli: () => `
    <path d="M28 34c10 4 16 12 20 24 6 18 22 26 30 22 3-1.5 2-5-1-6-13-5-16-18-20-30-4-10-14-17-25-15-5 1-8 3-4 5z" fill="#D63B2F"/>
    <rect x="18" y="28" width="16" height="6" rx="3" fill="#5E9E4A" transform="rotate(-20 18 28)"/>
    ${shine(44, 46, 3, 7, 0.3)}`,
  pizza: () => `
    <circle cx="50" cy="52" r="32" fill="#E8B04B"/><circle cx="50" cy="52" r="26" fill="#D9542F"/>
    ${dots([[40, 44], [60, 46], [50, 62], [36, 60], [64, 60]], 5, '#F6D58A')}
    ${dots([[48, 40], [62, 56], [40, 54], [54, 52]], 4.5, '#A8352B')}`,
  crisps: () => `
    <rect x="24" y="16" width="52" height="72" rx="14" fill="#F2C14E"/>
    <rect x="24" y="16" width="52" height="12" rx="6" fill="#E2A93A"/>
    <circle cx="50" cy="58" r="16" fill="#FBE7A6"/>
    ${dots([[45, 55], [55, 61]], 6, '#EDC264')}`,
  nugget: () => `
    ${[[34, 56, -12], [62, 50, 15], [52, 70, 4]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="17" ry="13" fill="#D99A4E" transform="rotate(${r} ${x} ${y})"/>${dots([[x - 6, y - 2], [x + 5, y + 3]], 1.8, '#B8783A')}`).join('')}`,
  bun: () => `
    <path d="M16 62a34 28 0 0 1 68 0 7 7 0 0 1-7 7H23a7 7 0 0 1-7-7z" fill="#D98E3A"/>
    ${shine(38, 44, 12, 6, 0.35)}${dots([[46, 40], [58, 44], [52, 36]], 1.6, '#F6E3B4')}`,
  biscuit: () => `
    <circle cx="50" cy="52" r="30" fill="#C58A4E"/>
    <path d="M20 54a30 30 0 0 0 60 0z" fill="#6B3B22"/>
    ${dots([[40, 40], [52, 36], [60, 44]], 1.8, '#9C6A3A')}`,
  lasagne: () => `
    <rect x="16" y="34" width="68" height="44" rx="12" fill="#F2ECE6"/>
    <rect x="22" y="40" width="56" height="10" rx="5" fill="#E07A45"/>
    <rect x="22" y="52" width="56" height="10" rx="5" fill="#F3D27A"/>
    <rect x="22" y="64" width="56" height="9" rx="4.5" fill="#C9542F"/>`,
  fishfinger: () => `
    ${[30, 47, 64].map(y => `<rect x="20" y="${y}" width="60" height="13" rx="6.5" fill="#E9A84E"/>`).join('')}
    ${dots([[30, 36], [56, 53], [42, 70]], 1.6, '#C9852E')}`,
};

const TINT = {
  egg: '#FBE4CC', milk: '#DCEFE8', yoghurt: '#F9DFD2', cheese: '#FCEDB8', bread: '#F6DDBF', pasta: '#FBE9B8',
  banana: '#FCEFB8', strawberry: '#FAD6D0', blueberry: '#E2DEF0', apple: '#FAD8CF', avocado: '#E3EECD',
  broccoli: '#DDEDD2', leaf: '#DDEDD2', sweetpotato: '#FBDDC6', carrot: '#FCDEC4', potato: '#F2E2CB',
  rice: '#EFE3D2', oil: '#ECEFCB', chicken: '#FBDFC4', mince: '#F7D6CE', fish: '#FCD8C5', coffee: '#EDDACB',
  chilli: '#FAD5CD', pizza: '#EFDCC8', crisps: '#EFDCC8', nugget: '#EFDCC8', bun: '#EFDCC8', biscuit: '#EFDCC8',
  lasagne: '#EFDCC8', fishfinger: '#EFDCC8',
};

export const tint = key => TINT[key] ?? '#F3E1CF';

export function art(key, cls = 'art') {
  const body = (ART[key] ?? ART.potato)();
  return `<svg viewBox="0 0 100 100" class="${cls}" aria-hidden="true">${body}</svg>`;
}

// A product "photo": the real CDN image when we have one, the illustration when we don't.
// If a CDN image fails to load (offline venue, hotlink refused), installPhotoFallback swaps the art in.
export function photo(item, cls = '') {
  const inner = item.image ? `<img class="cdn" src="${item.image}" alt="" loading="lazy" referrerpolicy="no-referrer">` : art(item.art);
  return `<div class="photo ${cls}" data-art="${item.art}" style="--tint:${tint(item.art)}">${inner}</div>`;
}

export function installPhotoFallback(root = document) {
  root.addEventListener('error', e => {
    const img = e.target;
    if (img?.tagName === 'IMG' && img.classList.contains('cdn')) {
      const holder = img.closest('.photo');
      if (holder) holder.innerHTML = art(holder.dataset.art);
    }
  }, true);
}

const stroke = (d, w = 6) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

export const icons = {
  check: `<svg viewBox="0 0 48 48" aria-hidden="true">${stroke('M14 25l7 7 13-15', 5)}</svg>`,
  cross: `<svg viewBox="0 0 48 48" aria-hidden="true">${stroke('M16 16l16 16M32 16L16 32', 5)}</svg>`,
  swap: `<svg viewBox="0 0 48 48" aria-hidden="true">${stroke('M13 19a12 12 0 0 1 22-3M35 29a12 12 0 0 1-22 3', 4.5)}<circle cx="35" cy="16" r="3.4" fill="currentColor"/><circle cx="13" cy="32" r="3.4" fill="currentColor"/></svg>`,
  fingerprint: `<svg viewBox="0 0 64 64" aria-hidden="true">${[
    'M20 20a17 17 0 0 1 24 0',
    'M14 32a18 18 0 0 1 36 0v4',
    'M20 46c-2-4-2-9-2-14a14 14 0 0 1 28 0c0 4 0 8-1 12',
    'M26 52c-2-6-3-12-3-20a9 9 0 0 1 18 0c0 6-1 12-3 17',
    'M32 32c0 8-1 16-4 22',
    'M37 38c0 5-1 9-2 13',
  ].map(d => stroke(d, 3.4)).join('')}</svg>`,
  key: `<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="17" cy="24" r="8" fill="none" stroke="currentColor" stroke-width="4.5"/>${stroke('M25 24h15M34 24v6M40 24v4', 4.5)}</svg>`,
  lock: `<svg viewBox="0 0 48 48" aria-hidden="true">${stroke('M16 21v-4a8 8 0 0 1 16 0v4', 4.5)}<rect x="11" y="21" width="26" height="19" rx="7" fill="currentColor"/><circle cx="24" cy="30" r="3" fill="#fff"/></svg>`,
  mail: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="8" y="12" width="32" height="24" rx="8" fill="none" stroke="currentColor" stroke-width="4"/>${stroke('M13 19q11 9 22 0', 4)}</svg>`,
  card: `<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="12" width="36" height="24" rx="7" fill="none" stroke="currentColor" stroke-width="4"/>${stroke('M6 21h36', 4)}${stroke('M13 29h7', 4)}</svg>`,
};

export const bowl = (cls = 'bowl') => `<svg viewBox="0 0 64 64" class="${cls}" aria-hidden="true">
  <circle cx="32" cy="32" r="31" fill="#F6C27A"/>
  <path d="M14 33h36a18 15 0 0 1-36 0z" fill="#fff"/>
  <path d="M18 38q14 8 28 0" stroke="#F2A65A" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M26 26q-3-4 0-8M32 25q-3-5 0-10M38 26q-3-4 0-8" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" opacity=".9"/>
</svg>`;

export function avatar(member, cls = '') {
  const colours = { adult: '#E8902E', child: '#3E9C8F' };
  return `<span class="avatar ${cls}" title="${member.name}" style="--c:${colours[member.role] ?? '#B96A3A'}">${member.name.charAt(0)}</span>`;
}

// Kitchen counter props. Kept soft so they never compete with the cards.
export const props = {
  onion: `<svg viewBox="0 0 200 160" class="prop prop-onion" aria-hidden="true">
    <ellipse cx="100" cy="128" rx="88" ry="18" fill="#000" opacity=".12"/>
    <rect x="18" y="96" width="164" height="40" rx="20" fill="#C98A52"/>
    <rect x="18" y="92" width="164" height="36" rx="18" fill="#DDA26A"/>
    <circle cx="86" cy="80" r="34" fill="#E9D3E6"/>
    <circle cx="86" cy="80" r="26" fill="none" stroke="#D4B0CF" stroke-width="3"/>
    <circle cx="86" cy="80" r="17" fill="none" stroke="#D4B0CF" stroke-width="3"/>
    <circle cx="86" cy="80" r="8" fill="none" stroke="#D4B0CF" stroke-width="3"/>
    ${[0, 1, 2, 3].map(i => `<rect x="${126 + i * 11}" y="${70 + (i % 2) * 4}" width="7" height="22" rx="3.5" fill="#EBD8E8"/>`).join('')}
  </svg>`,
  book: `<svg viewBox="0 0 260 180" class="prop prop-book" aria-hidden="true">
    <ellipse cx="130" cy="164" rx="120" ry="12" fill="#000" opacity=".12"/>
    <path d="M10 30q60-14 118 6v130q-58-20-118-6z" fill="#FBF5EC"/>
    <path d="M250 30q-60-14-118 6v130q58-20 118-6z" fill="#F6EEE2"/>
    ${[52, 66, 80, 94, 108].map(y => `<path d="M26 ${y}q42-8 86 4" stroke="#D9C9B4" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('')}
    ${[52, 66, 80].map(y => `<path d="M148 ${y + 4}q42-12 86-4" stroke="#D9C9B4" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('')}
    <circle cx="190" cy="118" r="20" fill="#F2B880" opacity=".55"/>
  </svg>`,
  spoon: `<svg viewBox="0 0 220 60" class="prop prop-spoon" aria-hidden="true">
    <rect x="70" y="26" width="140" height="10" rx="5" fill="#B9844F"/>
    <ellipse cx="44" cy="31" rx="34" ry="20" fill="#C8955F"/>
    <ellipse cx="40" cy="27" rx="18" ry="8" fill="#fff" opacity=".18"/>
  </svg>`,
};
