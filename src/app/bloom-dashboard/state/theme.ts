import { Preferences } from '../models/expense.model';

export interface ThemeColor {
  name: string;
  label: string;
  /** Matiz OKLCH usado para tingir fundo, bordas e destaques. */
  hue: number;
  primary: string;
  secondary: string;
}

export const THEME_COLORS: ThemeColor[] = [
  { name: 'rosa', label: 'Rosa', hue: 354, primary: 'oklch(0.62 0.245 354)', secondary: 'oklch(0.62 0.105 180)' },
  { name: 'roxo', label: 'Roxo', hue: 295, primary: 'oklch(0.55 0.22 295)', secondary: 'oklch(0.62 0.12 200)' },
  { name: 'lilas', label: 'Lilás', hue: 315, primary: 'oklch(0.6 0.17 315)', secondary: 'oklch(0.62 0.11 170)' },
  { name: 'azul', label: 'Azul', hue: 255, primary: 'oklch(0.56 0.19 255)', secondary: 'oklch(0.62 0.13 175)' },
  { name: 'turquesa', label: 'Turquesa', hue: 200, primary: 'oklch(0.58 0.12 200)', secondary: 'oklch(0.62 0.16 30)' },
  { name: 'verde', label: 'Verde', hue: 155, primary: 'oklch(0.55 0.14 155)', secondary: 'oklch(0.6 0.12 230)' },
  { name: 'dourado', label: 'Dourado', hue: 75, primary: 'oklch(0.6 0.13 70)', secondary: 'oklch(0.55 0.1 30)' },
  { name: 'laranja', label: 'Laranja', hue: 45, primary: 'oklch(0.63 0.17 45)', secondary: 'oklch(0.58 0.1 220)' },
  { name: 'vermelho', label: 'Vermelho', hue: 25, primary: 'oklch(0.57 0.21 25)', secondary: 'oklch(0.6 0.1 200)' },
  { name: 'grafite', label: 'Grafite', hue: 270, primary: 'oklch(0.42 0.03 270)', secondary: 'oklch(0.62 0.105 180)' },
];

/** Aplica cor e modo (claro/escuro) no <html>. As variáveis derivadas ficam em styles.css. */
export function applyTheme(prefs: Preferences): void {
  const root = document.documentElement;
  const color = resolveColor(prefs);
  root.style.setProperty('--h', String(color.hue));
  root.style.setProperty('--primary', color.primary);
  root.style.setProperty('--secondary', color.secondary);
  root.style.setProperty('--primary-foreground', color.foreground);
  root.dataset['mode'] = prefs.mode === 'escuro' ? 'escuro' : 'claro';
}

function resolveColor(prefs: Preferences): ThemeColor & { foreground: string } {
  const white = 'oklch(0.99 0 0)';
  if (prefs.theme === 'personalizada' && /^#[0-9a-f]{6}$/i.test(prefs.customColor)) {
    const { l, h } = hexToOklch(prefs.customColor);
    return {
      name: 'personalizada',
      label: 'Personalizada',
      hue: Math.round(h),
      primary: prefs.customColor,
      secondary: `oklch(0.62 0.11 ${Math.round((h + 180) % 360)})`,
      // cor muito clara → texto escuro por cima para continuar legível
      foreground: l > 0.72 ? 'oklch(0.18 0.02 285)' : white,
    };
  }
  const color = THEME_COLORS.find((c) => c.name === prefs.theme) ?? THEME_COLORS[0];
  return { ...color, foreground: white };
}

/** Converte #rrggbb para OKLCH (luminosidade 0–1 e matiz em graus). */
export function hexToOklch(hex: string): { l: number; h: number } {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return { l: L, h: ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360 };
}

export interface HeaderBanner {
  id: string;
  label: string;
  background: string;
}

/** Escurece o lado esquerdo do banner para o "Olá, …" continuar legível. */
export const READABLE = 'linear-gradient(90deg, rgb(0 0 0 / 0.35), transparent 65%)';

/** Banner com a imagem enviada pelo usuário. */
export function imageBanner(image: string): HeaderBanner {
  return { id: 'imagem', label: 'Minha imagem', background: `${READABLE}, url("${image}") center / cover` };
}

export const HEADER_BANNERS: HeaderBanner[] = [
  { id: 'tema', label: 'Cor do tema', background: `${READABLE}, linear-gradient(100deg, var(--primary), color-mix(in oklab, var(--primary) 45%, black))` },
  { id: 'por-do-sol', label: 'Pôr do sol', background: `${READABLE}, linear-gradient(100deg, #ff6a5c, #feb47b 45%, #ff5e8a)` },
  { id: 'oceano', label: 'Oceano', background: `${READABLE}, linear-gradient(100deg, #0f2027, #203a43 40%, #2c7da0)` },
  { id: 'floresta', label: 'Floresta', background: `${READABLE}, linear-gradient(100deg, #10402a, #2f7d4f 55%, #a8c66c)` },
  { id: 'aurora', label: 'Aurora', background: `${READABLE}, linear-gradient(100deg, #00a896, #845ec2 55%, #d65db1)` },
  {
    id: 'galaxia',
    label: 'Galáxia',
    background: `${READABLE}, radial-gradient(rgb(255 255 255 / 0.7) 1px, transparent 1.6px) 0 0 / 23px 23px, radial-gradient(rgb(255 255 255 / 0.35) 1px, transparent 1.6px) 11px 13px / 31px 31px, linear-gradient(100deg, #0b0b2b, #3a1c71 55%, #d76d77)`,
  },
  {
    id: 'flores',
    label: 'Flores',
    background: `${READABLE}, radial-gradient(circle at 14px 14px, rgb(255 255 255 / 0.28) 0 5px, transparent 6px) 0 0 / 40px 40px, radial-gradient(circle at 34px 32px, rgb(255 255 255 / 0.18) 0 3px, transparent 4px) 0 0 / 40px 40px, linear-gradient(100deg, #f34d7e, #ff9a9e)`,
  },
  {
    id: 'listras',
    label: 'Listras',
    background: `${READABLE}, repeating-linear-gradient(135deg, rgb(255 255 255 / 0.08) 0 14px, transparent 14px 28px), linear-gradient(100deg, #232526, #414345)`,
  },
];
