// UI icons on a 24-unit grid, one stroke weight, round caps and joins. House rule: nothing pointy.
// No chevrons, no arrowheads, no triangles; navigation uses words and round shapes instead.
const svg = (body, { fill = false } = {}) =>
  `<svg viewBox="0 0 24 24" class="ic" aria-hidden="true" fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;

export const icon = {
  today: svg('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.8v1.6M12 19.6v1.6M2.8 12h1.6M19.6 12h1.6M5.5 5.5l1.1 1.1M17.4 17.4l1.1 1.1M5.5 18.5l1.1-1.1M17.4 6.6l1.1-1.1"/>'),
  chat: svg('<rect x="3.2" y="4.2" width="17.6" height="13.2" rx="5.2"/><path d="M8 19.2c1.2 1 2.8 1.6 4.5 1.6"/><path d="M8.5 10.8h7M8.5 13.6h4.2"/>'),
  cart: svg('<path d="M5.2 8.6h13.6l-.9 10a2.4 2.4 0 0 1-2.4 2.2H8.5a2.4 2.4 0 0 1-2.4-2.2z"/><path d="M8.8 8.6V7.4a3.2 3.2 0 0 1 6.4 0v1.2"/>'),
  inbox: svg('<rect x="3.4" y="4.4" width="17.2" height="15.2" rx="4.4"/><path d="M3.6 13.4h4.2a1.6 1.6 0 0 1 1.5 1.1 2.9 2.9 0 0 0 5.4 0 1.6 1.6 0 0 1 1.5-1.1h4.2"/>'),
  home: svg('<circle cx="8" cy="8.6" r="2.7"/><circle cx="16.4" cy="8.6" r="2.7"/><circle cx="12.2" cy="13.4" r="2.2"/><path d="M3.2 19.6a4.9 4.9 0 0 1 9.6 0M11.6 19.6a4.9 4.9 0 0 1 9.4 0"/>'),
  plus: svg('<path d="M12 6v12M6 12h12"/>'),
  minus: svg('<path d="M6 12h12"/>'),
  check: svg('<path d="M6.2 12.6l3.8 3.8 7.8-8.6"/>'),
  close: svg('<path d="M7 7l10 10M17 7L7 17"/>'),
  swap: svg('<path d="M6 10.2a6.4 6.4 0 0 1 11.4-2.5M18 13.8a6.4 6.4 0 0 1-11.4 2.5"/><circle cx="17.6" cy="7.6" r="1.3" fill="currentColor" stroke="none"/><circle cx="6.4" cy="16.4" r="1.3" fill="currentColor" stroke="none"/>'),
  faceid: svg('<path d="M4 8.4V7a3 3 0 0 1 3-3h1.4M15.6 4H17a3 3 0 0 1 3 3v1.4M20 15.6V17a3 3 0 0 1-3 3h-1.4M8.4 20H7a3 3 0 0 1-3-3v-1.4"/><path d="M9 9.4v1.2M15 9.4v1.2M12 9.4v3.4h-.9M9.4 15.6a4.2 4.2 0 0 0 5.2 0"/>'),
  key: svg('<circle cx="8.4" cy="12" r="4.2"/><path d="M12.6 12h8M17.6 12v3M20.6 12v2"/>'),
  lock: svg('<rect x="5" y="10.4" width="14" height="10" rx="3.4"/><path d="M8.2 10.4V8a3.8 3.8 0 0 1 7.6 0v2.4"/><circle cx="12" cy="15.4" r="1.2" fill="currentColor" stroke="none"/>'),
  store: svg('<path d="M4.4 9.6h15.2v8.6a2.4 2.4 0 0 1-2.4 2.4H6.8a2.4 2.4 0 0 1-2.4-2.4z"/><path d="M3.6 9.6l1.6-4.2a1.6 1.6 0 0 1 1.5-1h10.6a1.6 1.6 0 0 1 1.5 1l1.6 4.2"/><path d="M9.6 20.6v-4.4a2.4 2.4 0 0 1 4.8 0v4.4"/>'),
  mail: svg('<rect x="3.4" y="5.4" width="17.2" height="13.2" rx="4"/><path d="M6.4 9.4c3.4 3 7.8 3 11.2 0"/>'),
  van: svg('<rect x="2.8" y="6.4" width="11.6" height="10" rx="2.6"/><path d="M14.4 9.6h3.2l2.6 3.2v3.6h-5.8"/><circle cx="7.4" cy="17.6" r="1.9" fill="var(--paper, #fff)"/><circle cx="16.6" cy="17.6" r="1.9" fill="var(--paper, #fff)"/>'),
  pin: svg('<circle cx="12" cy="12" r="7.4"/><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/>'),
  clock: svg('<circle cx="12" cy="12" r="8.4"/><path d="M12 7.6V12l3 1.8"/>'),
  leaf: svg('<path d="M5.4 18.6C5 11 9.6 5.6 19 5.2c.4 9.2-4.8 14-12.4 13.4z"/><path d="M5.6 18.4c2.4-3.4 5.2-6 8.6-7.8"/>'),
  info: svg('<circle cx="12" cy="12" r="8.6"/><path d="M12 11v5.2"/><circle cx="12" cy="7.9" r="1.1" fill="currentColor" stroke="none"/>'),
  dot: svg('<circle cx="12" cy="12" r="3.4" fill="currentColor" stroke="none"/>'),
  signal: '<svg viewBox="0 0 18 12" class="sb" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx="1" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx="1" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx="1" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx="1" fill="currentColor"/></svg>',
  wifi: '<svg viewBox="0 0 16 12" class="sb" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M1.5 4.6a9.4 9.4 0 0 1 13 0M4 7.4a5.8 5.8 0 0 1 8 0"/><circle cx="8" cy="10.2" r="1.3" fill="currentColor" stroke="none"/></svg>',
  battery: '<svg viewBox="0 0 27 12" class="sb sb-bat" aria-hidden="true"><rect x=".6" y=".6" width="22.8" height="10.8" rx="3.4" fill="none" stroke="currentColor" stroke-opacity=".4" stroke-width="1.2"/><rect x="2.4" y="2.4" width="17.6" height="7.2" rx="1.9" fill="currentColor"/><rect x="24.6" y="3.8" width="1.8" height="4.4" rx=".9" fill="currentColor" fill-opacity=".45"/></svg>',
};
