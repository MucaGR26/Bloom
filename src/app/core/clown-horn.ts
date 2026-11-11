const HORN_URL = 'sounds/buzina-palhaco.mp3';
let horn: HTMLAudioElement | null = null;
let ctx: AudioContext | null = null;

/** Toca o áudio da buzina de palhaço (public/sounds). Se o arquivo não tocar, usa o som gerado. */
export function playClownHorn(): void {
  try {
    horn ??= new Audio(HORN_URL);
    horn.currentTime = 0;
    horn.play().catch(playSynthHorn);
  } catch {
    playSynthHorn();
  }
}

/**
 * Plano B: "fom-fom" gerado na hora com Web Audio (sem arquivo de som),
 * duas buzinadas curtas com o tom caindo no final.
 */
function playSynthHorn(): void {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') ctx.resume();
    const start = ctx.currentTime + 0.02;
    honk(ctx, start, 0.16);
    honk(ctx, start + 0.24, 0.32);
  } catch {
    // navegador sem Web Audio: fica em silêncio
  }
}

function honk(ctx: AudioContext, at: number, duration: number): void {
  // som "de borracha": onda dente-de-serra filtrada, com um leve tremor
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(520, at);
  osc.frequency.linearRampToValueAtTime(470, at + duration * 0.7);
  osc.frequency.exponentialRampToValueAtTime(330, at + duration);

  const wobble = ctx.createOscillator();
  wobble.frequency.value = 28;
  const wobbleDepth = ctx.createGain();
  wobbleDepth.gain.value = 18;
  wobble.connect(wobbleDepth).connect(osc.frequency);

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 1100;
  filter.Q.value = 2.5;

  const volume = ctx.createGain();
  volume.gain.setValueAtTime(0, at);
  volume.gain.linearRampToValueAtTime(0.35, at + 0.02);
  volume.gain.setValueAtTime(0.35, at + duration * 0.75);
  volume.gain.exponentialRampToValueAtTime(0.001, at + duration);

  osc.connect(filter).connect(volume).connect(ctx.destination);
  osc.start(at);
  wobble.start(at);
  osc.stop(at + duration + 0.02);
  wobble.stop(at + duration + 0.02);
}
