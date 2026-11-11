import { Component, computed, inject, signal } from '@angular/core';
import { playClownHorn } from '../../../core/clown-horn';
import { resizeImage } from '../../../core/image';
import { playSecretChime } from '../../../core/secret-chime';
import { IconComponent } from '../../icon/icon.component';
import { IconTheme } from '../../models/expense.model';
import { BloomStateService } from '../../state/bloom-state.service';
import { HEADER_BANNERS, THEME_COLORS, imageBanner } from '../../state/theme';

@Component({
  selector: 'app-temas',
  standalone: true,
  imports: [IconComponent],
  templateUrl: './temas.component.html',
})
export class TemasComponent {
  state = inject(BloomStateService);
  saved = signal(false);

  alarmOn = computed(() => this.state.preferences().alarmSound === true);

  readonly COLORS = THEME_COLORS;
  readonly BANNERS = HEADER_BANNERS;
  readonly imageBanner = imageBanner;

  readonly ICON_THEMES: { id: IconTheme; label: string; description: string }[] = [
    { id: 'padrao', label: 'Padrão', description: 'Linhas médias' },
    { id: 'fino', label: 'Fino', description: 'Linhas delicadas' },
    { id: 'negrito', label: 'Negrito', description: 'Linhas grossas' },
    { id: 'colorido', label: 'Colorido', description: 'Menu com quadradinhos coloridos' },
    { id: 'emoji', label: 'Emoji', description: 'Ícones viram emojis' },
  ];

  /** Os temas visíveis: o "Zelda" (id aventura) só aparece depois de desbloqueado. */
  iconThemes = computed(() =>
    this.state.preferences().secretAdventure
      ? [...this.ICON_THEMES, { id: 'aventura' as IconTheme, label: 'Zelda', description: 'Tema secreto' }]
      : this.ICON_THEMES,
  );
  secretMessage = signal('');

  /** Segredo: clicar 20 vezes seguidas em "Emoji" desbloqueia o tema "Zelda". */
  private emojiStreak = 0;
  private lastEmojiClick = 0;

  setIconTheme(id: IconTheme): void {
    this.state.updatePreferences({ iconTheme: id });
    if (id !== 'emoji') {
      this.emojiStreak = 0;
      return;
    }
    const now = Date.now();
    this.emojiStreak = now - this.lastEmojiClick < 3000 ? this.emojiStreak + 1 : 1;
    this.lastEmojiClick = now;
    if (this.emojiStreak >= 20 && !this.state.preferences().secretAdventure) {
      this.state.updatePreferences({ secretAdventure: true, iconTheme: 'aventura' });
      this.secretMessage.set('Você encontrou um segredo! Tema de ícones "Zelda" desbloqueado.');
      playSecretChime();
      setTimeout(() => this.secretMessage.set(''), 6000);
    }
  }
  readonly PREVIEW_ICONS = ['grid', 'wallet', 'bell', 'sparkles'];
  readonly PREVIEW_COLORS = ['#f34d7e', '#22a06b', '#f59e0b', '#7c5cff', '#14b8a6'];

  /**
   * Brincadeira: apertar o botão "Verde" 20 vezes seguidas toca uma buzina de palhaço
   * (na 20ª, 40ª, 60ª…). Apertar outro botão ou ficar 3 segundos parado zera a contagem.
   */
  private greenStreak = 0;
  private lastGreenClick = 0;

  setTheme(theme: string): void {
    this.state.updatePreferences({ theme });
    if (theme === 'verde') this.countGreenClick();
    else this.greenStreak = 0;
  }

  setMode(mode: 'claro' | 'escuro'): void {
    this.state.updatePreferences({ mode });
    this.greenStreak = 0;
  }

  private countGreenClick(): void {
    const now = Date.now();
    this.greenStreak = now - this.lastGreenClick < 3000 ? this.greenStreak + 1 : 1;
    this.lastGreenClick = now;
    if (this.greenStreak % 20 === 0) playClownHorn();
  }

  setCustomColor(hex: string): void {
    this.state.updatePreferences({ theme: 'personalizada', customColor: hex });
  }

  saveNames(form: HTMLFormElement): void {
    const fd = new FormData(form);
    const displayName = String(fd.get('displayName') ?? '').trim();
    const appName = String(fd.get('appName') ?? '').trim();
    this.state.updatePreferences({
      ...(displayName && { displayName }),
      ...(appName && { appName }),
    });
    form.reset();
    this.saved.set(true);
    setTimeout(() => this.saved.set(false), 2000);
  }

  photoError = signal('');

  bannerError = signal('');

  /** Foto de perfil: recortada em quadrado 160×160. Fundos (card de saldo, banner do topo): até 1600 px. */
  async onImageSelected(input: HTMLInputElement, field: 'photo' | 'balanceImage' | 'headerImage'): Promise<void> {
    const file = input.files?.[0];
    input.value = '';
    const error = field === 'headerImage' ? this.bannerError : this.photoError;
    error.set('');
    if (!file) return;
    try {
      const image = field === 'photo' ? await resizeImage(file, 160, true) : await resizeImage(file, 1600);
      // ao enviar a imagem do topo, ela já passa a ser o banner escolhido
      this.state.updatePreferences(field === 'headerImage' ? { headerImage: image, headerBanner: 'imagem' } : { [field]: image });
    } catch (e) {
      error.set((e as Error).message);
    }
  }

  removeImage(field: 'photo' | 'balanceImage' | 'headerImage'): void {
    const prefs = this.state.preferences();
    this.state.updatePreferences(
      field === 'headerImage' && prefs.headerBanner === 'imagem' ? { headerImage: '', headerBanner: '' } : { [field]: '' },
    );
  }

  loadSample(): void {
    if (confirm('Isso substitui seus dados atuais por dados de exemplo. Continuar?')) this.state.loadSampleData();
  }
}
