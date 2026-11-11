import { Component, inject } from '@angular/core';
import { IconComponent } from '../../icon/icon.component';
import { BloomStateService, parseMoney } from '../../state/bloom-state.service';

@Component({
  selector: 'app-financas',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './financas.component.html',
})
export class FinancasComponent {
  state = inject(BloomStateService);

  saveValues(form: HTMLFormElement): void {
    const fd = new FormData(form);
    const salary = parseMoney(fd.get('salary'));
    const goal = parseMoney(fd.get('goal'));
    if (isFinite(salary) && salary >= 0) this.state.setSalary(salary);
    if (isFinite(goal) && goal >= 0) this.state.setSavingsGoal(goal);
    form.reset();
  }

  addFixed(form: HTMLFormElement): void {
    const fd = new FormData(form);
    const name = String(fd.get('name') ?? '').trim();
    const amount = parseMoney(fd.get('amount'));
    if (!name || !isFinite(amount) || amount <= 0) return;
    this.state.addFixedExpense(name, amount);
    form.reset();
  }
}
