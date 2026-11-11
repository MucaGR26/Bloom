import { Component, computed, inject, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';
import { BloomStateService } from '../state/bloom-state.service';
import { hexToOklch } from '../state/theme';

const MONTH_FORMAT = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const TOOLTIP_WIDTH = 220;

interface Payment {
  day: number;
  description: string;
  amount: number;
  color: string | null;
}

/** Calendário do menu lateral: marca os dias de pagamento das parcelas em andamento. */
@Component({
  selector: 'app-sidebar-calendar',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="flex items-center justify-between">
      <button (click)="changeMonth(-1)" class="rounded-md px-2 py-0.5 text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent" aria-label="Mês anterior">‹</button>
      <p class="text-xs font-bold">{{ title() }}</p>
      <button (click)="changeMonth(1)" class="rounded-md px-2 py-0.5 text-sm text-sidebar-foreground/65 hover:bg-sidebar-accent" aria-label="Próximo mês">›</button>
    </div>

    <div class="mt-2 grid grid-cols-7 text-center text-[10px] font-bold text-sidebar-foreground/50">
      @for (letter of WEEKDAYS; track $index) { <span>{{ letter }}</span> }
    </div>

    <div class="mt-1 grid grid-cols-7 gap-y-0.5 text-center text-[11px]">
      @for (cell of cells(); track $index) {
        @if (cell) {
          <button
            (click)="selectedDay.set(selectedDay() === cell.day ? null : cell.day)"
            class="mx-auto grid size-6 place-items-center rounded-full"
            [class.bg-sidebar-primary]="cell.payments.length > 0"
            [class.text-sidebar-primary-foreground]="cell.payments.length > 0"
            [class.font-bold]="cell.payments.length > 0 || cell.today"
            [class.text-sidebar-foreground/70]="cell.payments.length === 0 && !cell.today"
            [class.hover:bg-sidebar-accent]="cell.payments.length === 0"
            [class.ring-1]="cell.today"
            [class.ring-sidebar-foreground]="cell.today"
            [style.background]="background(cell.payments)"
            [style.color]="textColor(cell.payments)"
            (mouseenter)="showTooltip($event, cell.payments)"
            (mouseleave)="tooltip.set(null)"
            (focus)="showTooltip($event, cell.payments)"
            (blur)="tooltip.set(null)"
            [attr.aria-label]="'Dia ' + cell.day + (cell.payments.length ? ': ' + names(cell.payments) : '')"
          >{{ cell.day }}</button>
        } @else {
          <span></span>
        }
      }
    </div>

    @if (selectedPayments().length) {
      <div class="mt-2 space-y-1 rounded-md bg-sidebar-accent px-2 py-1.5 text-[11px]">
        @for (p of selectedPayments(); track p.description) {
          <p class="flex items-center gap-1.5">
            <app-icon name="card" class="size-3 shrink-0" />
            <span class="min-w-0 flex-1 truncate">{{ p.description }}</span>
            <span class="font-bold">{{ state.formatMoney(p.amount) }}</span>
          </p>
        }
      </div>
    }

    @if (tooltip(); as t) {
      <div class="fixed z-50 rounded-md border border-border bg-card p-2 text-xs text-card-foreground bloom-shadow" role="tooltip" [style.left.px]="t.left" [style.top.px]="t.top" [style.width.px]="width">
        <p class="font-bold">Pagar no dia {{ t.payments[0].day }}</p>
        @for (p of t.payments; track p.description) {
          <p class="mt-1 flex items-center gap-1.5">
            <span class="size-2.5 shrink-0 rounded-full" [style.background]="p.color ?? 'var(--primary)'"></span>
            <span class="min-w-0 flex-1 truncate">{{ p.description }}</span>
            <span class="font-bold">{{ state.formatMoney(p.amount) }}</span>
          </p>
        }
        @if (t.payments.length > 1) {
          <p class="mt-1 border-t border-border pt-1 text-right font-bold">Total: {{ state.formatMoney(total(t.payments)) }}</p>
        }
      </div>
    }
  `,
})
export class SidebarCalendarComponent {
  state = inject(BloomStateService);

  readonly WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
  private today = new Date();

  shown = signal({ year: this.today.getFullYear(), month: this.today.getMonth() });
  selectedDay = signal<number | null>(null);
  tooltip = signal<{ left: number; top: number; payments: Payment[] } | null>(null);
  readonly width = TOOLTIP_WIDTH;

  title = computed(() => {
    const text = MONTH_FORMAT.format(new Date(this.shown().year, this.shown().month, 1));
    return text.charAt(0).toUpperCase() + text.slice(1);
  });

  private payments = computed(() => this.state.installmentsDueIn(this.shown().year, this.shown().month));

  /** Um item por casa do calendário; null são as casas vazias antes do dia 1. */
  cells = computed(() => {
    const { year, month } = this.shown();
    const blanks = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const isThisMonth = year === this.today.getFullYear() && month === this.today.getMonth();
    return [
      ...Array.from({ length: blanks }, () => null),
      ...Array.from({ length: days }, (_, i) => ({
        day: i + 1,
        today: isThisMonth && i + 1 === this.today.getDate(),
        payments: this.payments().filter((p) => p.day === i + 1),
      })),
    ];
  });

  selectedPayments = computed(() => this.payments().filter((p) => p.day === this.selectedDay()));

  changeMonth(delta: number): void {
    const next = new Date(this.shown().year, this.shown().month + delta, 1);
    this.shown.set({ year: next.getFullYear(), month: next.getMonth() });
    this.selectedDay.set(null);
    this.tooltip.set(null);
  }

  /** Uma cor preenche o dia; várias dividem o círculo em partes iguais. Sem cor própria, usa a do tema. */
  background(payments: Payment[]): string | null {
    if (!payments.some((p) => p.color)) return null;
    const colors = payments.map((p) => p.color ?? 'var(--sidebar-primary)');
    if (colors.length === 1) return colors[0];
    const size = 100 / colors.length;
    return `linear-gradient(135deg, ${colors.map((c, i) => `${c} ${i * size}% ${(i + 1) * size}%`).join(', ')})`;
  }

  /** Texto escuro em cores claras, para o número do dia continuar legível. */
  textColor(payments: Payment[]): string | null {
    const color = payments.find((p) => p.color)?.color;
    if (!color) return null;
    return hexToOklch(color).l > 0.72 ? '#18161d' : '#ffffff';
  }

  showTooltip(event: Event, payments: Payment[]): void {
    if (!payments.length) return;
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.tooltip.set({
      left: Math.max(8, Math.min(rect.right + 8, window.innerWidth - TOOLTIP_WIDTH - 8)),
      top: rect.top,
      payments,
    });
  }

  total(payments: Payment[]): number {
    return payments.reduce((sum, p) => sum + p.amount, 0);
  }

  names(payments: { description: string }[]): string {
    return payments.map((p) => p.description).join(', ');
  }
}
