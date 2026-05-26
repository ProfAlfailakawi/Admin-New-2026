export const playTink = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
};

export const triggerHaptic = () => {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(40);
    }
  } catch (e) {}
};

export const playMetallicSettlementChime = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    
    // Pure silver/bronze bell resonant frequency (calming G#5)
    const fundamental = 830.61;
    
    // Physical modeling of clamped metal bar inharmonic acoustic partials 
    // Higher frequencies decay faster to replicate the material's damping properties correctly.
    const partials = [
      { ratio: 1.00, gain: 0.30, decay: 1.2 },
      { ratio: 1.50, gain: 0.18, decay: 0.8 },
      { ratio: 2.76, gain: 0.22, decay: 0.5 },
      { ratio: 4.10, gain: 0.12, decay: 0.3 },
      { ratio: 5.40, gain: 0.08, decay: 0.2 },
      { ratio: 8.93, gain: 0.04, decay: 0.1 }
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, ctx.currentTime);
    masterGain.gain.linearRampToValueAtTime(0.32, ctx.currentTime + 0.01);
    masterGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.6);
    
    // Low-pass sweetening filter to control brightness organically over time
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, ctx.currentTime);
    filter.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 1.2);
    
    // High-pass filter to block any background floor rumble
    const hpFilter = ctx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.setValueAtTime(150, ctx.currentTime);

    partials.forEach((p, idx) => {
      const osc = ctx.createOscillator();
      const pGain = ctx.createGain();
      
      osc.type = 'sine';
      // Detune each oscillating wave slightly to induce premium spacious chorus beats
      const detune = idx === 0 ? 0 : (Math.random() * 3 - 1.5);
      osc.frequency.setValueAtTime(fundamental * p.ratio + detune, ctx.currentTime);
      
      pGain.gain.setValueAtTime(0, ctx.currentTime);
      pGain.gain.linearRampToValueAtTime(p.gain, ctx.currentTime + 0.005);
      pGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + p.decay);
      
      osc.connect(pGain);
      pGain.connect(masterGain);
      
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + p.decay + 0.1);
    });

    masterGain.connect(filter);
    filter.connect(hpFilter);
    hpFilter.connect(ctx.destination);
    
    // Haptic confirmation
    triggerHaptic();
  } catch (e) {
    // blocked or not supported
  }
};

export const playSuccessAction = () => {
    playMetallicSettlementChime();
};