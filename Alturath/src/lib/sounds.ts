export const playTing = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.type = 'sine';
        
        // Two-tone chime
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1108.73, ctx.currentTime + 0.1); // C#6
        
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.5);
    } catch (e) {
        // Ignore if audio is blocked
    }
};

export const playNewOrderAlert = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        
        // Helper to play a short beep
        const beep = (freq: number, start: number) => {
            const osc = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
            
            gainNode.gain.setValueAtTime(0, ctx.currentTime + start);
            gainNode.gain.linearRampToValueAtTime(0.4, ctx.currentTime + start + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + 0.4);
            
            osc.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime + start + 0.5);
        };
        
        // Arpeggio for "New Order"
        beep(523.25, 0);       // C5
        beep(659.25, 0.15);    // E5
        beep(783.99, 0.3);     // G5
        beep(1046.50, 0.45);   // C6
    } catch (e) {
        // Ignore
    }
};

export const playSwoosh = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        
        const ctx = new AudioContext();
        const bufferSize = ctx.sampleRate * 0.5; // 0.5 seconds
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        // White noise
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = buffer;
        
        // Lowpass filter to make it sound like a swoosh
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(200, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + 0.2);
        filter.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.5);
        
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        
        noiseSource.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        noiseSource.start(ctx.currentTime);
    } catch (e) {
        // Ignore if audio is blocked
    }
};
