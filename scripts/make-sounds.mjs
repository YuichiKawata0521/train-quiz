import { writeFileSync, mkdirSync } from 'node:fs';

const RATE = 22050;

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE((Math.max(-1, Math.min(1, s)) * 32767) | 0, i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

function tone(freqs, dur, { gain = 0.5, decay = 4 } = {}) {
  const n = Math.floor(RATE * dur);
  return Array.from({ length: n }, (_, i) => {
    const t = i / RATE;
    const env = Math.exp(-decay * t) * Math.min(1, i / 200);
    return (freqs.reduce((sum, f) => sum + Math.sin(2 * Math.PI * f * t), 0) / freqs.length) * gain * env;
  });
}

const silence = (dur) => new Array(Math.floor(RATE * dur)).fill(0);

const sounds = {
  tap: tone([880], 0.08, { decay: 20 }),
  horn: tone([311, 415], 0.8, { decay: 1.2, gain: 0.6 }),
  wrong: [...tone([220], 0.15, { decay: 6 }), ...silence(0.05), ...tone([180], 0.3, { decay: 6 })],
  depart: [...tone([660], 0.12, { decay: 8 }), ...tone([784], 0.12, { decay: 8 }), ...tone([880], 0.3, { decay: 4 })],
  arrive: [...tone([880], 0.15, { decay: 6 }), ...tone([660], 0.35, { decay: 4 })],
  fanfare: [
    ...tone([523], 0.15, { decay: 5 }),
    ...tone([659], 0.15, { decay: 5 }),
    ...tone([784], 0.15, { decay: 5 }),
    ...tone([1047, 784], 0.5, { decay: 3 }),
  ],
};

mkdirSync('public/sounds', { recursive: true });
for (const [name, samples] of Object.entries(sounds)) {
  writeFileSync(`public/sounds/${name}.wav`, wav(samples));
}
console.log('generated:', Object.keys(sounds).join(', '));
