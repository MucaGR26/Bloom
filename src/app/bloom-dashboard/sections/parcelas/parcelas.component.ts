import { Component, computed, inject, signal } from '@angular/core';
import { IconComponent } from '../../icon/icon.component';
import { BloomStateService, parseMoney } from '../../state/bloom-state.service';

@Component({
  selector: 'app-parcelas',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './parcelas.component.html',
})
export class ParcelasComponent {
  state = inject(BloomStateService);

  description = signal('');
  total = signal('');
  count = signal('');
  rate = signal('');
  dueDay = signal('');
  dueDayError = signal(false);

  /** Simulação pela Tabela Price: parcela = P · i / (1 − (1 + i)^−n). */
  result = computed(() => {
    const principal = parseMoney(this.total());
    const n = Math.floor(Number(this.count()));
    const i = (parseMoney(this.rate() || '0') || 0) / 100;
    if (!isFinite(principal) || principal <= 0 || !(n >= 1) || i < 0) return null;
    const installment = i === 0 ? principal / n : (principal * i) / (1 - Math.pow(1 + i, -n));
    const totalPaid = installment * n;
    return {
      installment,
      totalPaid,
      interest: totalPaid - principal,
      salaryPercent: this.state.salary() > 0 ? (installment / this.state.salary()) * 100 : null,
      count: n,
    };
  });

  /** Quanto sobraria livre no mês se essa parcela entrasse. */
  availableAfter = computed(() => {
    const r = this.result();
    return r ? this.state.available() - r.installment : null;
  });

  saveInstallment(): void {
    const r = this.result();
    if (!r) return;
    const dueDay = parseDueDay(this.dueDay());
    if (dueDay === undefined) {
      this.dueDayError.set(true);
      return;
    }
    this.dueDayError.set(false);
    this.state.addInstallment(this.description().trim() || 'Compra parcelada', round2(r.installment), r.count, dueDay);
    this.description.set('');
    this.total.set('');
    this.count.set('');
    this.rate.set('');
    this.dueDay.set('');
  }

  /** Muda o dia de uma parcela já registrada; valor inválido volta ao que estava. */
  changeDueDay(id: number, input: HTMLInputElement, current: number | null | undefined): void {
    const dueDay = parseDueDay(input.value);
    if (dueDay === undefined) {
      input.value = current ? String(current) : '';
      return;
    }
    this.state.setInstallmentDueDay(id, dueDay);
  }

  progressOf(paid: number, total: number): number {
    return Math.round((paid / total) * 100);
  }

  remove(id: number, name: string): void {
    if (confirm(`Excluir a parcela "${name}"?`)) this.state.removeInstallment(id);
  }
}

/** Vazio vira null (sem dia); fora de 1 a 31 vira undefined (inválido). */
function parseDueDay(raw: string): number | null | undefined {
  if (!raw.trim()) return null;
  const day = Number(raw);
  return Number.isInteger(day) && day >= 1 && day <= 31 ? day : undefined;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
