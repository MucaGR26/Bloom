import { Component, Input, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconTheme } from '../models/expense.model';
import { BloomStateService } from '../state/bloom-state.service';

const ICON_PATHS: Record<string, string> = {
  sparkles: '<path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z"/>',
  grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
  history: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/>',
  trendDown: '<path d="M3 7l7 7 4-4 7 7"/><path d="M15 17h6v-6"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 21a2 2 0 0 0 4 0"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a6 6 0 0 0-4 10.5c.6.6 1 1.6 1 2.5h6c0-.9.4-1.9 1-2.5A6 6 0 0 0 12 2z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  receipt: '<path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  wallet: '<rect x="2" y="6" width="20" height="14" rx="2"/><path d="M16 12h.01"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  trendUp: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M9 9h4a2 2 0 0 1 0 4H9m0-4v4m0 0h4"/>',
  more: '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>',
  percent: '<path d="M19 5L5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  gift: '<rect x="3" y="8" width="18" height="13" rx="1"/><path d="M12 8v13M3 12h18"/><path d="M12 8c-2-3-6-3-6 0s4 0 6 0zm0 0c2-3 6-3 6 0s-4 0-6 0z"/>',
  flag: '<path d="M4 22V3"/><path d="M4 4h13l-3 4 3 4H4"/>',
  check: '<path d="M20 6L9 17l-5-5"/>',
  alertTriangle: '<path d="M12 3l9 17H3l9-17z"/><path d="M12 10v4"/><path d="M12 17h.01"/>',
  calendar: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  filter: '<path d="M4 5h16M7 12h10M10 19h4"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/>',
  bag: '<path d="M5 8h14l-1 13H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  phone: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
  bus: '<rect x="4" y="3" width="16" height="15" rx="2"/><path d="M4 11h16"/><path d="M7 21v-3M17 21v-3"/><path d="M8 15h.01M16 15h.01"/>',
  play: '<path d="M6 4l14 8-14 8V4z"/>',
  food: '<path d="M4 3v8a3 3 0 0 0 6 0V3"/><path d="M7 3v18"/><path d="M17 3c-2 0-3 3-3 7h3v11"/>',
  car: '<path d="M5 17h14v-5l-2-5H7l-2 5v5z"/><path d="M5 12h14"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/>',
  gamepad: '<rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3"/><path d="M16 12h.01M18 14h.01"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  tv: '<rect x="2" y="5" width="20" height="13" rx="2"/><path d="M8 22h8M12 18v4"/>',
  lifeBuoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="M21 17l-5-5-9 8"/>',
  trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 15h10l1-15"/>',
  pencil: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13 7l4 4"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z"/>',
  calculator: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h8"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/>',
};

/** Versão emoji de cada ícone (tema de ícones "Emoji"). */
const ICON_EMOJI: Record<string, string> = {
  sparkles: '✨', grid: '🏠', history: '🕒', card: '💳', trendDown: '📉', bell: '🔔', bulb: '💡', settings: '⚙️',
  menu: '☰', x: '✖️', chevronDown: '🔽', plus: '➕', receipt: '🧾', wallet: '👛', target: '🎯', trendUp: '📈',
  coin: '🪙', more: '⋯', percent: '💯', gift: '🎁', flag: '🚩', check: '✔️', alertTriangle: '⚠️', calendar: '📅',
  filter: '🔍', lifeBuoy: '🛟', image: '🖼️', trash: '🗑️', pencil: '✏️', send: '📨', shield: '🛡️', calculator: '🧮', logout: '🚪',
  bag: '🛍️', phone: '📱', bus: '🚌', play: '▶️', food: '🍔', car: '🚗', gamepad: '🎮', music: '🎵', tv: '📺',
};

/**
 * Tema secreto "Aventura": ícones em imagem (public/icons/aventura/<nome>.png).
 * As imagens são máscaras: o desenho é pintado com a cor do texto, então funciona no claro e no escuro.
 * Ícones que não estão na lista usam o desenho normal.
 */
const ADVENTURE_SPRITES = new Set([
  'alertTriangle', 'bag', 'bell', 'bulb', 'calculator', 'calendar', 'card', 'check', 'coin', 'filter', 'flag',
  'gamepad', 'gift', 'grid', 'history', 'image', 'music', 'pencil', 'percent', 'phone', 'plus', 'receipt', 'send',
  'settings', 'shield', 'sparkles', 'target', 'trash', 'trendDown', 'trendUp', 'wallet',
]);

const STROKE: Record<IconTheme, number> = { padrao: 2, fino: 1.25, negrito: 2.75, colorido: 2, emoji: 2, aventura: 2 };

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    @if (sprite(); as url) {
      <span
        [class]="class"
        class="inline-block shrink-0 bg-current"
        [style.mask]="'url(' + url + ') center / contain no-repeat'"
        [style.-webkit-mask]="'url(' + url + ') center / contain no-repeat'"
      ></span>
    } @else {
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      [attr.stroke-width]="stroke()"
      stroke-linecap="round"
      stroke-linejoin="round"
      [class]="class"
      [innerHTML]="content()"
    ></svg>
    }
  `,
})
export class IconComponent {
  private sanitizer = inject(DomSanitizer);
  private state = inject(BloomStateService);

  @Input({ required: true }) name!: string;
  @Input() class = '';
  /** Força um tema de ícone (usado nas prévias da tela Temas). Sem isso, segue a preferência do usuário. */
  @Input() theme?: IconTheme;

  private cacheKey = '';
  private cached: SafeHtml = '';

  private currentTheme(): IconTheme {
    return this.theme ?? this.state.preferences().iconTheme ?? 'padrao';
  }

  stroke(): number {
    return STROKE[this.currentTheme()];
  }

  /** Caminho da imagem do tema Aventura, se este ícone tiver uma. */
  sprite(): string | null {
    return this.currentTheme() === 'aventura' && ADVENTURE_SPRITES.has(this.name) ? `icons/aventura/${this.name}.png` : null;
  }

  content(): SafeHtml {
    const emoji = this.currentTheme() === 'emoji' ? ICON_EMOJI[this.name] : undefined;
    const key = `${this.name}|${emoji ?? ''}`;
    if (key !== this.cacheKey) {
      this.cacheKey = key;
      const html = emoji
        ? `<text x="12" y="13" font-size="20" text-anchor="middle" dominant-baseline="central" stroke="none" fill="currentColor">${emoji}</text>`
        : (ICON_PATHS[this.name] ?? '');
      this.cached = this.sanitizer.bypassSecurityTrustHtml(html);
    }
    return this.cached;
  }
}
