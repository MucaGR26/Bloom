import { Component, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IconComponent } from '../../icon/icon.component';
import { EXPENSE_CATEGORIES, Reminder } from '../../models/expense.model';
import { BloomStateService, parseMoney } from '../../state/bloom-state.service';
import { FICTIONAL_NEWS } from './news';

type ReminderTab = 'importante' | 'futuros' | 'noticias';

/** Conta que vence em até esta quantidade de dias entra em "Importante". */
const IMPORTANT_DAYS = 7;

@Component({
  selector: 'app-lembretes',
  standalone: true,
  imports: [NgTemplateOutlet, IconComponent],
  templateUrl: './lembretes.component.html',
})
export class LembretesComponent {
  state = inject(BloomStateService);
  formOpen = signal(false);
  readonly categories = [...EXPENSE_CATEGORIES, 'Dívida'];

  tab = signal<ReminderTab>('importante');

  paid = computed(() => this.state.reminders().filter((r) => r.paid));
  important = computed(() => this.state.upcomingReminders().filter((r) => this.state.daysUntil(r.dueDay) <= IMPORTANT_DAYS));
  future = computed(() => this.state.upcomingReminders().filter((r) => this.state.daysUntil(r.dueDay) > IMPORTANT_DAYS));

  readonly news = FICTIONAL_NEWS;

  submit(form: HTMLFormElement): void {
    const fd = new FormData(form);
    const name = String(fd.get('name') ?? '').trim();
    const amount = parseMoney(fd.get('amount'));
    const dueDay = Number(fd.get('dueDay'));
    const category = String(fd.get('category') ?? 'Outros');
    if (!name || !isFinite(amount) || amount <= 0) return;
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) return;
    this.state.addReminder(name, amount, dueDay, category);
    form.reset();
    this.formOpen.set(false);
  }

  dueLabel(r: Reminder): string {
    const days = this.state.daysUntil(r.dueDay);
    return days === 0 ? 'Vence hoje' : days === 1 ? 'Vence amanhã' : `Vence em ${days} dias`;
  }

  remove(r: Reminder): void {
    if (confirm(`Excluir o lembrete "${r.name}"?`)) this.state.removeReminder(r.id);
  }
}
