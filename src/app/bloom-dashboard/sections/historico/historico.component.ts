import { Component, computed, inject, signal } from '@angular/core';
import { IconComponent } from '../../icon/icon.component';
import { Expense } from '../../models/expense.model';
import { BloomStateService } from '../../state/bloom-state.service';

@Component({
  selector: 'app-historico',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './historico.component.html',
})
export class HistoricoComponent {
  state = inject(BloomStateService);

  categoryFilter = signal('Todas');

  categories = computed(() => ['Todas', ...new Set(this.state.expenses().map((e) => e.category))]);

  filteredExpenses = computed(() => {
    const filter = this.categoryFilter();
    const list = this.state.sortedExpenses();
    return filter === 'Todas' ? list : list.filter((e) => e.category === filter);
  });

  filteredTotal = computed(() => this.filteredExpenses().reduce((s, e) => s + e.amount, 0));

  setFilter(category: string): void {
    this.categoryFilter.set(category);
  }

  formatDate(iso: string): string {
    return iso.split('-').reverse().join('/');
  }

  remove(expense: Expense): void {
    if (confirm(`Excluir "${expense.description}"?`)) this.state.removeExpense(expense.id);
  }
}
