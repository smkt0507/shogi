let context: AudioContext | null = null;

// Call from a user gesture so browsers can enable the optional sound.
export function prepareFormationSound() {
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume().catch(() => {});
  } catch {
    // Sound is optional, including in browsers without Web Audio.
  }
}

export function playFormationSound(castle: boolean) {
  if (!context || context.state !== "running") return;
  try {
    const start = context.currentTime;
    const notes = castle ? [392, 523.25, 783.99] : [440, 659.25, 880];
    notes.forEach((frequency, index) => {
      const oscillator = context!.createOscillator();
      const gain = context!.createGain();
      const at = start + index * 0.07;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, at);
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(0.055, at + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.38);
      oscillator.connect(gain);
      gain.connect(context!.destination);
      oscillator.start(at);
      oscillator.stop(at + 0.4);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    });
  } catch {
    // An unavailable audio device must not interrupt play.
  }
}
