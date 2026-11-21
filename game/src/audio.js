// Procedural sound: every effect is a short WebAudio oscillator or noise burst, so the game
// ships no audio files. The first user gesture creates the context (browsers block sound
// before one); M toggles mute. Nothing here is needed for play: a muted or blocked context
// simply stays silent.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(frequency, duration, type, volume, slideTo) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx || ctx.state === 'suspended') return;
    try {
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
      if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + duration);
    } catch {
      // Sound is garnish: a failed note never breaks the game.
    }
  }

  function noiseBurst(duration, volume) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx || ctx.state === 'suspended') return;
    try {
      const length = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
      const source = ctx.createBufferSource();
      const gain = ctx.createGain();
      gain.gain.value = volume;
      source.buffer = buffer;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    } catch {
      // See tone(): sound never breaks the game.
    }
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      return muted;
    },
    get muted() {
      return muted;
    },
    footstep() {
      noiseBurst(0.05, 0.05);
    },
    petal() {
      tone(880, 0.18, 'sine', 0.12, 1320);
      tone(1320, 0.22, 'sine', 0.07, 1760);
    },
    spotted() {
      tone(196, 0.28, 'sawtooth', 0.14, 98);
      tone(147, 0.34, 'sawtooth', 0.1, 73);
    },
    caught() {
      tone(220, 0.5, 'square', 0.12, 55);
    },
    pebble() {
      tone(1400, 0.06, 'triangle', 0.1, 900);
    },
    clatter() {
      noiseBurst(0.12, 0.16);
      tone(700, 0.08, 'triangle', 0.08, 350);
    },
    gate() {
      tone(523, 0.16, 'sine', 0.12);
      tone(659, 0.16, 'sine', 0.12);
      tone(784, 0.3, 'sine', 0.14);
    },
    win() {
      [523, 659, 784, 1047].forEach((frequency, i) => {
        window.setTimeout(() => tone(frequency, 0.35, 'sine', 0.13), i * 130);
      });
    },
  };
}
