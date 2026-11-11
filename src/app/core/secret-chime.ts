const SECRET_URL = 'sounds/segredo-zelda.mp3';
let secret: HTMLAudioElement | null = null;

/** Som de "segredo encontrado" (public/sounds). Se o arquivo não tocar, usa o arpejo gerado. */
export function playSecretChime(): void {
  try {
    secret ??= new Audio(SECRET_URL);
    secret.currentTime = 0;
    secret.play().catch(playSynthChime);
  } catch {
    playSynthChime();
  }
}

/** Plano B: arpejo curto subindo, gerado com Web Audio. */
function playSynthChime(): void {
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.5]; // dó, mi, sol, dó, mi
    notes.forEach((freq, i) => {
      const at = ctx.currentTime + i * 0.09;
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(0.25, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.45);
      osc.connect(gain).connect(ctx.destination);
      osc.start(at);
      osc.stop(at + 0.5);
    });
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // sem Web Audio: segue sem som
  }
}
