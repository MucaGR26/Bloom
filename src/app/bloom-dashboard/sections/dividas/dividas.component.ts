import { Component, computed, inject, signal } from '@angular/core';
import { IconComponent } from '../../icon/icon.component';
import { Debt } from '../../models/expense.model';
import { BloomStateService, parseMoney } from '../../state/bloom-state.service';

@Component({
  selector: 'app-dividas',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './dividas.component.html',
})
export class DividasComponent {
  state = inject(BloomStateService);
  formOpen = signal(false);

  paidOff = computed(() => this.state.debts().filter((d) => d.paidAmount >= d.totalAmount));

  /** Sugestão de estratégia de quitação a partir do ranking. */
  strategy = computed(() => {
    const ranking = this.state.debtRanking();
    if (!ranking.length) return null;
    const first = ranking[0];
    const lines = [
      `Pague o mínimo de todas as dívidas e coloque qualquer dinheiro extra em "${first.creditor}", que tem os maiores juros (${first.interestRate.toLocaleString('pt-BR')}% a.m.).`,
    ];
    if (ranking.length > 1) {
      lines.push(`Quando ela acabar, some o valor que pagava nela à próxima da lista: "${ranking[1].creditor}".`);
    }
    if (this.state.debtsMonthlyTotal() > this.state.salary() * 0.3 && this.state.salary() > 0) {
      lines.push('Suas dívidas passam de 30% da renda: evite novas compras parceladas até reduzir esse valor.');
    }
    if (first.interestRate >= 8) {
      lines.push('Juros acima de 8% a.m. costumam ser de cartão ou cheque especial — vale tentar negociar ou trocar por um empréstimo mais barato.');
    }
    return lines;
  });

  progressOf(paid: number, total: number): number {
    return Math.min(100, Math.round((paid / total) * 100));
  }

  monthsLeft(d: Debt): number {
    return d.monthlyPayment > 0 ? Math.ceil((d.totalAmount - d.paidAmount) / d.monthlyPayment) : 0;
  }

  add(form: HTMLFormElement): void {
    const fd = new FormData(form);
    const creditor = String(fd.get('creditor') ?? '').trim();
    const totalAmount = parseMoney(fd.get('total'));
    const interestRate = parseMoney(fd.get('rate') || '0');
    const monthlyPayment = parseMoney(fd.get('monthly'));
    const dueDay = Number(fd.get('dueDay'));
    if (!creditor || !(totalAmount > 0) || !(interestRate >= 0) || !(monthlyPayment > 0)) return;
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) return;
    this.state.addDebt({ creditor, totalAmount, interestRate, monthlyPayment, dueDay });
    form.reset();
    this.formOpen.set(false);
  }

  pay(d: Debt): void {
    const raw = prompt(`Quanto você pagou de "${d.creditor}"?`, String(d.monthlyPayment).replace('.', ','));
    const amount = parseMoney(raw);
    if (isFinite(amount) && amount > 0) this.state.payDebt(d.id, amount);
  }

  remove(d: Debt): void {
    if (confirm(`Excluir a dívida "${d.creditor}"?`)) this.state.removeDebt(d.id);
  }
}
