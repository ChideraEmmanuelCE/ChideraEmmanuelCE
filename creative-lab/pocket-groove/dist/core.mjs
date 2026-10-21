export const STEPS = 16;
export const TRACKS = ['Kick', 'Snare', 'Hi-hat', 'Clap'];
export const emptyPattern = () => TRACKS.map(() => Array(STEPS).fill(false));
const row = positions => Array.from({length: STEPS}, (_, i) => positions.includes(i));
export const PRESETS = [
  {name: 'Soft start', description: 'An easy pocket. A little room to breathe.', tempo: 96, swing: 12, pattern: [[0,6,8,14],[4,12],[0,2,4,6,8,10,12,14],[12]].map(row)},
  {name: 'Night bus', description: 'Offbeat hats for the journey home.', tempo: 112, swing: 24, pattern: [[0,3,8,10],[4,12],[0,2,3,6,8,10,11,14,15],[4,12]].map(row)},
  {name: 'Sunroom', description: 'Four on the floor. Windows wide open.', tempo: 124, swing: 0, pattern: [[0,4,8,12],[4,12],[2,6,10,14],[4,12,15]].map(row)}
];
export function validateLoop(value) {
  if (!value || value.version !== 1 || !Number.isFinite(value.tempo) || value.tempo < 60 || value.tempo > 160 || !Number.isFinite(value.swing) || value.swing < 0 || value.swing > 40) throw new Error('Invalid loop settings');
  if (!Array.isArray(value.pattern) || value.pattern.length !== TRACKS.length || value.pattern.some(r => !Array.isArray(r) || r.length !== STEPS || r.some(v => typeof v !== 'boolean'))) throw new Error('Invalid beat pattern');
  if (!Array.isArray(value.muted) || value.muted.length !== TRACKS.length || value.muted.some(v => typeof v !== 'boolean')) throw new Error('Invalid mute settings');
  return {version: 1, tempo: value.tempo, swing: value.swing, pattern: value.pattern.map(r => [...r]), muted: [...value.muted]};
}
// Swing moves each offbeat later without changing the length of a two-step pair.
export function stepDuration(step, tempo, swing) {
  const base = 60 / tempo / 4;
  return base * (1 + (step % 2 === 0 ? 1 : -1) * swing / 100);
}
export function randomPattern(random = Math.random) {
  const pattern = emptyPattern();
  for (let s=0; s<STEPS; s++) {
    pattern[0][s] = s === 0 || s === 8 || random() < (s % 2 ? .1 : .23);
    pattern[1][s] = s === 4 || s === 12 || (s === 15 && random() < .3);
    pattern[2][s] = s % 2 === 0 || random() < .28;
    pattern[3][s] = (s === 4 || s === 12) && random() < .55;
  }
  return pattern;
}
