import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { startAlarm, stopAlarm } from '../core/alarm';
import { AuthService } from '../core/auth.service';
import { localStore } from '../core/local-store';
import { playSecretChime } from '../core/secret-chime';
import { IconComponent } from './icon/icon.component';
import { SidebarCalendarComponent } from './sidebar-calendar/sidebar-calendar.component';
import { EXPENSE_CATEGORIES, NavItem } from './models/expense.model';
import { BloomStateService, parseMoney, todayIso } from './state/bloom-state.service';
import { HEADER_BANNERS, imageBanner } from './state/theme';

const SIDEBAR_KEY = 'bloom:sidebar';
const SIDEBAR_DEFAULT_WIDTH = 248;
const SIDEBAR_MIN_WIDTH = 200;
/** Soltar a barra mais perto da borda do que isso fecha ela. */
const SIDEBAR_CLOSE_BELOW = 140;
/** A área do Bloom nunca fica mais estreita do que isso. */
const CONTENT_MIN_WIDTH = 400;

@Component({
  selector: 'app-bloom-dashboard',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, SidebarCalendarComponent],
  templateUrl: './bloom-dashboard.component.html',
  styleUrl: './bloom-dashboard.component.css',
})
export class BloomDashboardComponent {
  state = inject(BloomStateService);
  private auth = inject(AuthService);
  private router = inject(Router);

  readonly categories = EXPENSE_CATEGORIES;
  readonly today = todayIso();

  readonly NAV: NavItem[] = [
    { label: 'Início', icon: 'grid', path: '/' },
    { label: 'Finanças', icon: 'wallet', path: '/financas' },
    { label: 'Histórico', icon: 'history', path: '/historico' },
    { label: 'Parcelas', icon: 'card', path: '/parcelas' },
    { label: 'Dívidas', icon: 'trendDown', path: '/dividas' },
    { label: 'Sonhos', icon: 'sparkles', path: '/sonhos' },
    { label: 'Lembretes', icon: 'bell', path: '/lembretes' },
    { label: 'Conselho', icon: 'bulb', path: '/conselho' },
    { label: 'Emergência', icon: 'alertTriangle', path: '/emergencia' },
    { label: 'Suporte', icon: 'lifeBuoy', path: '/suporte' },
  ];

  /** Cores dos quadradinhos do menu no tema de ícones "Colorido". */
  readonly NAV_COLORS = ['#f34d7e', '#22a06b', '#7c5cff', '#3b82f6', '#ef4444', '#f59e0b', '#ec4899', '#14b8a6', '#eab308', '#f97316'];

  displayName = computed(() => this.state.preferences().displayName || this.auth.user()?.name || 'você');
  /** Banner escolhido em Temas; undefined = topo padrão. */
  banner = computed(() => {
    const { headerBanner, headerImage } = this.state.preferences();
    if (headerBanner === 'imagem') return headerImage ? imageBanner(headerImage) : undefined;
    return HEADER_BANNERS.find((b) => b.id === headerBanner);
  });
  /** No vermelho e com o Modo Emergência ainda desligado: a aba do menu fica piscando. */
  needsEmergency = computed(() => this.state.overBudget() && !this.state.emergencyMode());
  private negativeNoticeDismissed = signal(false);

  private savedSidebar = localStore.get<{ width: number; closed: boolean }>(SIDEBAR_KEY);
  sidebarWidth = signal(this.savedSidebar?.width ?? SIDEBAR_DEFAULT_WIDTH);
  sidebarClosed = signal(this.savedSidebar?.closed ?? false);
  sidebarColumns = computed(() =>
    this.sidebarClosed()
      ? 'minmax(0, 1fr)'
      : `minmax(${SIDEBAR_MIN_WIDTH}px, ${this.sidebarWidth()}px) minmax(${CONTENT_MIN_WIDTH}px, 1fr)`,
  );
  showNegativeNotice = computed(() => this.needsEmergency() && !this.negativeNoticeDismissed());
  initial = computed(() => this.displayName().charAt(0).toUpperCase());
  email = computed(() => this.auth.user()?.email ?? '');

  constructor() {
    effect(() => localStore.set(SIDEBAR_KEY, { width: this.sidebarWidth(), closed: this.sidebarClosed() }));

    // Saiu do vermelho: o aviso volta a aparecer se a pessoa ficar negativa de novo.
    effect(() => {
      if (!this.state.overBudget()) this.negativeNoticeDismissed.set(false);
    });

    // A sirene toca sem parar enquanto a pessoa estiver no vermelho sem ativar o Modo Emergência.
    effect(() => {
      if (this.needsEmergency() && this.state.preferences().alarmSound === true) startAlarm();
      else stopAlarm();
    });
    inject(DestroyRef).onDestroy(stopAlarm);
  }

  openSidebar(): void {
    if (this.sidebarClosed() && matchMedia('(min-width: 1024px)').matches) this.sidebarClosed.set(false);
    else this.state.openMenu();
  }

  closeSidebar(): void {
    this.sidebarClosed.set(true);
  }

  resetSidebarWidth(): void {
    this.sidebarWidth.set(SIDEBAR_DEFAULT_WIDTH);
  }

  startSidebarResize(event: PointerEvent): void {
    event.preventDefault();
    const handle = event.currentTarget as HTMLElement;
    const widthBefore = this.sidebarWidth();
    handle.setPointerCapture(event.pointerId);

    const move = (e: PointerEvent) => this.setSidebarWidth(e.clientX);
    const stop = (e: PointerEvent) => {
      handle.removeEventListener('pointermove', move);
      handle.removeEventListener('pointerup', stop);
      handle.removeEventListener('pointercancel', stop);
      if (e.clientX < SIDEBAR_CLOSE_BELOW) {
        this.sidebarWidth.set(widthBefore);
        this.closeSidebar();
      }
    };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
  }

  onSidebarResizeKey(event: KeyboardEvent): void {
    const step = { ArrowLeft: -16, ArrowRight: 16 }[event.key];
    if (!step) return;
    event.preventDefault();
    this.setSidebarWidth(this.sidebarWidth() + step);
  }

  private setSidebarWidth(width: number): void {
    const max = Math.max(SIDEBAR_MIN_WIDTH, window.innerWidth - CONTENT_MIN_WIDTH);
    this.sidebarWidth.set(Math.round(Math.min(max, Math.max(SIDEBAR_MIN_WIDTH, width))));
  }

  dismissNegativeNotice(): void {
    this.negativeNoticeDismissed.set(true);
  }

  saveExpense(form: HTMLFormElement): void {
    const fd = new FormData(form);
    const description = String(fd.get('description') ?? '').trim();
    const amount = parseMoney(fd.get('amount'));
    const category = String(fd.get('category') ?? 'Outros');
    const date = String(fd.get('date') || this.today);
    if (!description || !isFinite(amount) || amount <= 0) return;

    const editing = this.state.editingExpense();
    if (editing) this.state.updateExpense({ ...editing, description, amount, category, date });
    else this.state.addExpense(description, amount, category, date);
    this.state.closeDialog();
  }

  /** Segredo: 20 cliques seguidos no logo do menu trocam o logo (e mais 20 voltam ao normal). */
  private logoStreak = 0;
  private lastLogoClick = 0;

  logoClicked(): void {
    const now = Date.now();
    this.logoStreak = now - this.lastLogoClick < 3000 ? this.logoStreak + 1 : 1;
    this.lastLogoClick = now;
    if (this.logoStreak % 20 === 0) {
      this.state.updatePreferences({ secretLogo: !this.state.preferences().secretLogo });
      playSecretChime();
    }
  }

  logout(): void {
    this.state.lockSecrets();
    this.auth.logout();
    this.router.navigateByUrl('/login');
  }
}
