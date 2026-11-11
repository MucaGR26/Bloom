import { Component, computed, inject } from '@angular/core';
import { IconComponent } from '../../icon/icon.component';
import { PlanItem, BloomStateService } from '../../state/bloom-state.service';

@Component({
  selector: 'app-emergencia',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './emergencia.component.html',
})
export class EmergenciaComponent {
  state = inject(BloomStateService);

  groups = computed(() => {
    const plan = this.state.emergencyPlan();
    return [
      { title: 'Cortar agora', icon: 'x', items: plan.cut, empty: 'Nada para cortar de imediato.' },
      { title: 'Reduzir', icon: 'trendDown', items: plan.reduce, empty: 'Nenhum gasto essencial avulso no mês.' },
      { title: 'Manter', icon: 'shield', items: plan.keep, empty: 'Nenhuma conta fixa cadastrada.' },
    ];
  });

  cutTotal = computed(() => this.state.emergencyPlan().cut.reduce((s, i) => s + i.amount, 0));

  total(items: PlanItem[]): number {
    return items.reduce((s, i) => s + i.amount, 0);
  }
}
