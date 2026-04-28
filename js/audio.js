let ctx;
function getCtx() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function beep(freq, dur, type = 'square', vol = 0.1) {
  const c = getCtx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = vol;
  osc.connect(gain);
  gain.connect(c.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  osc.stop(c.currentTime + dur);
}

export const SFX = {
  hit:     () => beep(200, 0.1),
  kill:    () => beep(500, 0.15, 'sawtooth'),
  hurt:    () => beep(100, 0.15, 'sawtooth'),
  pickup:  () => beep(800, 0.08),
  heal:    () => beep(600, 0.2, 'sine'),
  stairs:  () => { beep(400, 0.1); setTimeout(() => beep(600, 0.15), 100); },
  levelup: () => { beep(500, 0.1); setTimeout(() => beep(700, 0.1), 100); setTimeout(() => beep(900, 0.15), 200); },
  death:   () => beep(80, 0.5, 'sawtooth', 0.15),
};
