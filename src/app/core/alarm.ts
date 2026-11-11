const ALARM_URL = 'sounds/alarme-sirene.mp3';

let audio: HTMLAudioElement | null = null;
let wanted = false;

/** Toca a sirene em loop até stopAlarm(). */
export function startAlarm(): void {
  wanted = true;
  audio ??= Object.assign(new Audio(ALARM_URL), { loop: true });
  audio.play().catch(retryOnFirstInteraction);
}

export function stopAlarm(): void {
  wanted = false;
  if (audio) {
    audio.pause();
    audio.currentTime = 0;
  }
}

/** O navegador bloqueia som antes de a pessoa interagir (ex.: ao recarregar a página). */
function retryOnFirstInteraction(): void {
  const retry = () => {
    document.removeEventListener('pointerdown', retry);
    document.removeEventListener('keydown', retry);
    if (wanted) startAlarm();
  };
  document.addEventListener('pointerdown', retry);
  document.addEventListener('keydown', retry);
}
