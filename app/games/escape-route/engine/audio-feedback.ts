type Tone = {
  frequency: number;
  start: number;
  duration: number;
  volume: number;
  type?: OscillatorType;
  endFrequency?: number;
};

let audioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined" || !window.AudioContext) return null;
  try {
    audioContext ??= new window.AudioContext();
    if (audioContext.state === "suspended") {
      void audioContext.resume().catch((error: unknown) => {
        console.error("ESCAPE ROUTE audio could not be resumed.", error);
      });
    }
    return audioContext;
  } catch (error) {
    console.error("ESCAPE ROUTE audio could not be initialized.", error);
    return null;
  }
}

function playTones(tones: Tone[]) {
  const context = getAudioContext();
  if (!context) return;

  try {
    const now = context.currentTime;
    for (const tone of tones) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = now + tone.start;
      const end = start + tone.duration;

      oscillator.type = tone.type ?? "sine";
      oscillator.frequency.setValueAtTime(tone.frequency, start);
      if (tone.endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(
          tone.endFrequency,
          end,
        );
      }
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(tone.volume, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(start);
      oscillator.stop(end + 0.01);
    }
  } catch (error) {
    console.error("ESCAPE ROUTE audio feedback could not be played.", error);
  }
}

export function playSwitchSound() {
  playTones([
    { frequency: 520, start: 0, duration: 0.16, volume: 0.035 },
    { frequency: 760, start: 0.1, duration: 0.22, volume: 0.03 },
  ]);
}

export function playBarrierSound() {
  playTones([
    {
      frequency: 118,
      endFrequency: 57,
      start: 0,
      duration: 0.42,
      volume: 0.055,
      type: "triangle",
    },
    {
      frequency: 245,
      endFrequency: 130,
      start: 0.08,
      duration: 0.26,
      volume: 0.018,
      type: "square",
    },
  ]);
}

export function playBridgeRepairSound() {
  playTones([
    {
      frequency: 92,
      endFrequency: 154,
      start: 0,
      duration: 0.8,
      volume: 0.045,
      type: "triangle",
    },
    {
      frequency: 248,
      endFrequency: 440,
      start: 0.28,
      duration: 0.58,
      volume: 0.025,
      type: "sine",
    },
  ]);
}

export function playRockfallWarningSound() {
  playTones([
    {
      frequency: 660,
      start: 0,
      duration: 0.18,
      volume: 0.035,
      type: "square",
    },
    {
      frequency: 660,
      start: 0.32,
      duration: 0.18,
      volume: 0.035,
      type: "square",
    },
  ]);
}

export function playRockImpactSound() {
  playTones([
    {
      frequency: 105,
      endFrequency: 42,
      start: 0,
      duration: 0.58,
      volume: 0.055,
      type: "triangle",
    },
    {
      frequency: 71,
      endFrequency: 36,
      start: 0.08,
      duration: 0.48,
      volume: 0.035,
      type: "sawtooth",
    },
  ]);
}

export function playArrivalSound() {
  playTones([
    { frequency: 523.25, start: 0, duration: 0.2, volume: 0.035 },
    { frequency: 659.25, start: 0.14, duration: 0.24, volume: 0.032 },
    { frequency: 783.99, start: 0.3, duration: 0.34, volume: 0.028 },
  ]);
}
