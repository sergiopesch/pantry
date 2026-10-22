// Pantry's identity. The character is a small round bowl with two eyes under the rim: its spine is
// noticing what you didn't. No mouth, no triangles, nothing pointy. The wordmark is a custom monoline
// drawn on the same round geometry, so it renders the same everywhere (no font dependency).

export const COLORS = {
  saffron: '#F5A03A',
  paprika: '#E8782A',
  rim: '#FFD79A',
  ink: '#22160E',
};

let uid = 0;

const TONES = {
  saffron: { a: '#FFB650', b: '#EE7E2C', rim: '#FFD99E', foot: '#D96A22', eye: COLORS.ink, glint: '#fff', steam: '#F5A03A' },
  white: { a: '#FFFFFF', b: '#FFF1E2', rim: '#FFE4BF', foot: '#F2D2AC', eye: COLORS.ink, glint: '#fff', steam: '#FFE4BF' },
};

// mood: idle | notice | think | happy | blink. The bowl is centred in a square box so it works as an avatar.
export function mark({ mood = 'idle', tone = 'saffron', title = 'Pantry', shadow = true } = {}) {
  const id = `pm${++uid}`;
  const c = TONES[tone] ?? TONES.saffron;
  const look = mood === 'notice' ? 3 : mood === 'think' ? -2.5 : 1.5;
  const up = mood === 'notice' || mood === 'think' ? -2.5 : 0;
  const eyes = {
    open: `<ellipse cx="${46 + look}" cy="${62 + up}" rx="5.6" ry="7.2"/><ellipse cx="${74 + look}" cy="${62 + up}" rx="5.6" ry="7.2"/>
           <circle cx="${48 + look}" cy="${59 + up}" r="1.8" fill="${c.glint}"/><circle cx="${76 + look}" cy="${59 + up}" r="1.8" fill="${c.glint}"/>`,
    happy: `<path d="M39.5 64q6.5-8.5 13 0M67.5 64q6.5-8.5 13 0" fill="none" stroke="${c.eye}" stroke-width="4.6" stroke-linecap="round"/>`,
    blink: `<path d="M40.5 63h11M68.5 63h11" fill="none" stroke="${c.eye}" stroke-width="4.6" stroke-linecap="round"/>`,
  };
  const face = mood === 'happy' ? eyes.happy : mood === 'blink' ? eyes.blink : eyes.open;
  const steam = mood === 'notice' || mood === 'think'
    ? `<path class="pm-steam" d="M86 30c-7-6 7-11 0-19" fill="none" stroke="${c.steam}" stroke-width="5" stroke-linecap="round"/>`
    : '';
  return `<svg viewBox="0 0 120 120" class="pantry-mark mood-${mood}" role="img" aria-label="${title}">
    <defs>
      <linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.a}"/><stop offset="1" stop-color="${c.b}"/></linearGradient>
      <radialGradient id="${id}s"><stop offset="0" stop-color="#3a1a00" stop-opacity=".22"/><stop offset="1" stop-color="#3a1a00" stop-opacity="0"/></radialGradient>
    </defs>
    ${shadow ? `<ellipse cx="60" cy="91" rx="33" ry="4.5" fill="url(#${id}s)"/>` : ''}
    ${steam}
    <rect x="47" y="78" width="26" height="9" rx="4.5" fill="${c.foot}"/>
    <path d="M18 45h84a42 37 0 0 1-84 0z" fill="url(#${id}b)"/>
    <rect x="12" y="38" width="96" height="13" rx="6.5" fill="${c.rim}"/>
    <path d="M27 57a33 28 0 0 0 15 19" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".3"/>
    <g fill="${c.eye}" class="pm-face">${face}</g>
  </svg>`;
}

// iOS-style app icon: continuous corners (22.4% radius), golden-hour gradient, white bowl filling the tile.
export function appIcon({ size = 120, mood = 'idle' } = {}) {
  const id = `pi${++uid}`;
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" class="pantry-icon" role="img" aria-label="Pantry">
    <defs>
      <linearGradient id="${id}g" x1=".1" y1="0" x2=".9" y2="1"><stop offset="0" stop-color="#FFBD57"/><stop offset=".55" stop-color="#F7963A"/><stop offset="1" stop-color="#EC6E2D"/></linearGradient>
      <linearGradient id="${id}l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".16"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/></linearGradient>
    </defs>
    <rect width="120" height="120" rx="26.9" fill="url(#${id}g)"/>
    <rect width="120" height="120" rx="26.9" fill="url(#${id}l)"/>
    <g transform="translate(60 60) scale(1.02) translate(-60 -62)">${mark({ tone: 'white', mood, shadow: false }).replace(/<svg[^>]*>|<\/svg>/g, '')}</g>
  </svg>`;
}

// Custom monoline wordmark on an 8.6-unit stroke: cap top 10.3, x-height 28.3, baseline 45.7.
export function wordmark({ color = 'currentColor' } = {}) {
  return `<svg viewBox="0 0 194 66" class="pantry-wordmark" role="img" aria-label="Pantry">
    <g fill="none" stroke="${color}" stroke-width="8.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M8 45.7V10.3h10.2a12.6 12.6 0 0 1 0 25.2H8"/>
      <circle cx="50.5" cy="37" r="8.7"/><path d="M59.2 28.3v17.4"/>
      <path d="M73.5 45.7V37a8.7 8.7 0 0 1 17.4 0v8.7"/>
      <path d="M104.5 15v24.3a6.4 6.4 0 0 0 6.4 6.4h2.4M98.4 28.3h13.2"/>
      <path d="M125 45.7V37a8.7 8.7 0 0 1 8.7-8.7h2.1"/>
      <path d="M146.6 28.3V37a8.7 8.7 0 0 0 17.4 0v-8.7V51a9 9 0 0 1-9 9h-5"/>
    </g>
  </svg>`;
}

export function lockup({ mood = 'idle', tone = 'saffron', color = 'currentColor' } = {}) {
  return `<span class="pantry-lockup">${mark({ mood, tone, shadow: false })}${wordmark({ color })}</span>`;
}
