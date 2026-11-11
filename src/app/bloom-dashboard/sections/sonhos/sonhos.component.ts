import { Component, inject, signal } from '@angular/core';
import { resizeImage } from '../../../core/image';
import { IconComponent } from '../../icon/icon.component';
import { Dream } from '../../models/expense.model';
import { BloomStateService, parseMoney } from '../../state/bloom-state.service';

@Component({
  selector: 'app-sonhos',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './sonhos.component.html',
})
export class SonhosComponent {
  state = inject(BloomStateService);
  formOpen = signal(false);

  progressOf(saved: number, target: number): number {
    return Math.max(0, Math.min(100, Math.round((saved / target) * 100)));
  }

  submit(form: HTMLFormElement): void {
    const fd = new FormData(form);
    const name = String(fd.get('name') ?? '').trim();
    const target = parseMoney(fd.get('target'));
    const date = String(fd.get('date') ?? '').trim();
    if (!name || !isFinite(target) || target <= 0) return;
    this.state.addDream(name, target, date);
    form.reset();
    this.formOpen.set(false);
  }

  /** Guarda (valor positivo) ou retira (negativo) dinheiro do sonho. */
  deposit(dream: Dream, input: HTMLInputElement, sign: 1 | -1): void {
    const amount = parseMoney(input.value);
    if (!isFinite(amount) || amount <= 0) return;
    this.state.depositDream(dream.id, sign * amount);
    input.value = '';
  }

  async onImageSelected(dream: Dream, input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      this.state.setDreamImage(dream.id, await resizeImage(file, 640));
    } catch (e) {
      alert((e as Error).message);
    }
  }

  remove(dream: Dream): void {
    if (confirm(`Excluir o sonho "${dream.name}"?`)) this.state.removeDream(dream.id);
  }
}
