// Accent palette → colour tokens. The background tints slightly toward the accent,
// in both light and dark mode.

export const PALETTE = [
  { name: 'Green', hex: '#3B7A63' },
  { name: 'Violet', hex: '#5E52B0' },
  { name: 'Terracotta', hex: '#B0532E' },
  { name: 'Berry', hex: '#A8466E' },
];
export const DEFAULT_ACCENT = PALETTE[0].hex;

// t = weight of a (0 → all b, 1 → all a)
export function mix(a, b, t) {
  const p = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
  const x = p(a), y = p(b);
  return '#' + x.map((v, i) => Math.round(y[i] * (1 - t) + v * t).toString(16).padStart(2, '0')).join('');
}

export function isDark(pref) {
  if (pref === 'dark') return true;
  if (pref === 'light') return false;
  const viewer = document.documentElement.getAttribute('data-theme');
  if (viewer === 'dark' || viewer === 'light') return viewer === 'dark';
  return matchMedia('(prefers-color-scheme: dark)').matches;
}

export function tokens(accent, dark) {
  if (!/^#[0-9a-fA-F]{6}$/.test(accent || '')) accent = DEFAULT_ACCENT;
  if (dark) {
    const a = mix(accent, '#FFFFFF', 0.68);
    return {
      '--bg': mix(accent, '#121315', 0.07),
      '--surface': mix(accent, '#1C1D20', 0.07),
      '--soft': mix(accent, '#26272B', 0.16),
      '--line': mix(accent, '#2E2F33', 0.08),
      '--fg': '#ECECEE',
      '--muted': '#9D9DA4',
      '--accent': a,
      '--accent-strong': mix(accent, '#FFFFFF', 0.45),
      '--on-accent': '#121315',
      '--mark': mix(accent, '#121315', 0.42),
      '--danger': '#F2B8B5',
      'color-scheme': 'dark',
    };
  }
  return {
    '--bg': mix(accent, '#F4F4F6', 0.07),
    '--surface': '#FFFFFF',
    '--soft': mix(accent, '#F4F4F6', 0.1),
    '--line': mix(accent, '#E5E5EA', 0.06),
    '--fg': '#1C1C1E',
    '--muted': '#6B6B70',
    '--accent': accent,
    '--accent-strong': mix(accent, '#000000', 0.78),
    '--on-accent': '#FFFFFF',
    '--mark': mix(accent, '#FFFFFF', 0.28),
    '--danger': '#B3261E',
    'color-scheme': 'light',
  };
}

export function applyTheme({ accent, theme }) {
  const t = tokens(accent, isDark(theme));
  const root = document.documentElement;
  for (const [k, v] of Object.entries(t)) root.style.setProperty(k, v);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t['--bg']);
}
