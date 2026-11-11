import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { resizeImage } from '../../../core/image';
import { IconComponent } from '../../icon/icon.component';
import { BloomStateService, parseMoney } from '../../state/bloom-state.service';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [RouterLink, IconComponent],
  templateUrl: './overview.component.html',
})
export class OverviewComponent {
  state = inject(BloomStateService);

  /** Com imagem: escurece por cima para o texto branco continuar legível. Sem imagem: fundo padrão do CSS. */
  balanceBackground = computed(() => {
    const image = this.state.preferences().balanceImage;
    return image ? `linear-gradient(120deg, rgb(0 0 0 / 0.7), rgb(0 0 0 / 0.25)), url("${image}") center / cover` : null;
  });

  async onBackgroundSelected(input: HTMLInputElement): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    try {
      this.state.updatePreferences({ balanceImage: await resizeImage(file, 1200) });
    } catch (e) {
      alert((e as Error).message);
    }
  }

  saveSalary(input: HTMLInputElement): void {
    const value = parseMoney(input.value);
    if (!isFinite(value) || value < 0) return;
    this.state.setSalary(value);
    input.value = '';
  }
}
