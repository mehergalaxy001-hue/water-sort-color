/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class WaterSortAudio {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private pourInterval: any = null;
  private streamNoise: AudioWorkletNode | ScriptProcessorNode | null = null;
  private lowRumbleOsc: OscillatorNode | null = null;
  private lowRumbleGain: GainNode | null = null;

  constructor() {
    this.isMuted = localStorage.getItem("water_sort_muted") === "true";
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.ctx = new AudioCtxClass();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  isSoundMuted(): boolean {
    return this.isMuted;
  }

  setMute(mute: boolean) {
    this.isMuted = mute;
    localStorage.setItem("water_sort_muted", mute ? "true" : "false");
    if (mute) {
      this.stopPouringSound();
    }
  }

  /**
   * Play crisp 2D glass click/tap (liquid drop feeling)
   */
  playPop() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    // Sweet resonant liquid bubble "plop" with dual overlapping swept sine waves
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.type = "sine";
    osc2.type = "triangle";

    // Pleasant fast gurgle pitch sweep
    osc1.frequency.setValueAtTime(320, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.08);

    osc2.frequency.setValueAtTime(160, ctx.currentTime);
    osc2.frequency.exponentialRampToValueAtTime(390, ctx.currentTime + 0.08);

    gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.1);
  }

  /**
   * Alternate select feedback tap (glass chime ring)
   */
  playSelect() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    // Delicately sweet metallic-sounding crystal glass chime
    const osc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    subOsc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = "sine";
    subOsc.type = "sine";

    osc.frequency.setValueAtTime(880, ctx.currentTime); // High A chime
    subOsc.frequency.setValueAtTime(1320, ctx.currentTime); // Perfect fifth fifth harmonic

    gainNode.gain.setValueAtTime(0.05, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

    osc.start();
    subOsc.start();
    osc.stop(ctx.currentTime + 0.13);
    subOsc.stop(ctx.currentTime + 0.13);
  }

  /**
   * Safe acoustic mellow warning tone
   */
  playError() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    // Organic damp rubber mallet strike on low bar
    const osc = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.type = "triangle";
    osc2.type = "sine";

    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.25);

    osc2.frequency.setValueAtTime(270, ctx.currentTime);
    osc2.frequency.linearRampToValueAtTime(180, ctx.currentTime + 0.25);

    gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

    osc.start();
    osc2.start();
    osc.stop(ctx.currentTime + 0.26);
    osc2.stop(ctx.currentTime + 0.26);
  }

  /**
   * Physics-inspired realistic water pouring engine!
   * Pitch rises dynamically as the target bottle becomes full (realistic acoustic feature).
   * Combines rapid high-frequency bubble "ploops", a low frequency fluid rumble, and filtered splashes.
   */
  startPouringSound(targetFullness: number) {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    this.stopPouringSound();

    // 1. Gentle continuous fluid low-frequency bubbling rumble that sweeps up
    try {
      this.lowRumbleOsc = ctx.createOscillator();
      this.lowRumbleGain = ctx.createGain();
      
      this.lowRumbleOsc.type = "sine";
      const rumbleStart = 85 + targetFullness * 60;
      this.lowRumbleOsc.frequency.setValueAtTime(rumbleStart, ctx.currentTime);
      this.lowRumbleOsc.frequency.exponentialRampToValueAtTime(rumbleStart + 180, ctx.currentTime + 1.2);
      
      this.lowRumbleGain.gain.setValueAtTime(0.06, ctx.currentTime);
      this.lowRumbleGain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 1.2);
      
      this.lowRumbleOsc.connect(this.lowRumbleGain);
      this.lowRumbleGain.connect(ctx.destination);
      this.lowRumbleOsc.start();
    } catch (e) {
      console.error("Audio low rumble init error", e);
    }

    // 2. High density bubble scheduler representing fluid filling up a cylinder!
    // Frequencies start low/echoey (around 120Hz) and sweep up to high glug-glug-sploosh sounds (approx 1200Hz).
    let count = 0;
    this.pourInterval = setInterval(() => {
      const dropCtx = this.initCtx();
      if (!dropCtx || this.isMuted) return;

      try {
        const elapsedRatio = Math.min(1.0, count / 28);
        const currentFullness = Math.min(1.0, targetFullness + elapsedRatio * 0.35);

        // Cylinder resonance: empty column makes bubble pop sounds deep, filled column makes them high & bright!
        const baseFreq = 120 + (currentFullness * 720) + (elapsedRatio * 280) + Math.sin(count * 0.7) * 40 + Math.random() * 20;
        const endFreq = baseFreq * 1.6; // upward sweep for bubbly pops

        const oscA = dropCtx.createOscillator();
        const gainA = dropCtx.createGain();
        const bandpass = dropCtx.createBiquadFilter();

        oscA.connect(bandpass);
        bandpass.connect(gainA);
        gainA.connect(dropCtx.destination);

        oscA.type = "sine";
        oscA.frequency.setValueAtTime(baseFreq, dropCtx.currentTime);
        oscA.frequency.exponentialRampToValueAtTime(endFreq, dropCtx.currentTime + 0.09);

        // High-Q bandpass gives glass bottle acoustic hollow resonance
        bandpass.type = "bandpass";
        bandpass.Q.setValueAtTime(14, dropCtx.currentTime);
        bandpass.frequency.setValueAtTime(baseFreq * 1.1, dropCtx.currentTime);

        const fillVolume = count % 3 === 0 ? 0.16 : 0.08;
        gainA.gain.setValueAtTime(fillVolume, dropCtx.currentTime);
        gainA.gain.exponentialRampToValueAtTime(0.001, dropCtx.currentTime + 0.09);

        oscA.start();
        oscA.stop(dropCtx.currentTime + 0.10);

        // Crunchy splash clinks (high-frequency droplets bouncing in glass)
        if (count % 2 === 0) {
          const oscB = dropCtx.createOscillator();
          const gainB = dropCtx.createGain();
          oscB.connect(gainB);
          gainB.connect(dropCtx.destination);

          const splashFreq = 420 + (currentFullness * 650) + Math.random() * 100;
          oscB.type = "sine";
          oscB.frequency.setValueAtTime(splashFreq, dropCtx.currentTime);
          oscB.frequency.exponentialRampToValueAtTime(splashFreq * 1.25, dropCtx.currentTime + 0.04);

          gainB.gain.setValueAtTime(0.04, dropCtx.currentTime);
          gainB.gain.exponentialRampToValueAtTime(0.001, dropCtx.currentTime + 0.04);

          oscB.start();
          oscB.stop(dropCtx.currentTime + 0.05);
        }

        // Tiny crisp water spray clicks
        if (count % 4 === 0) {
          const oscClick = dropCtx.createOscillator();
          const gainClick = dropCtx.createGain();
          oscClick.connect(gainClick);
          gainClick.connect(dropCtx.destination);

          oscClick.type = "triangle";
          const clickFreq = 2200 + Math.random() * 900;
          oscClick.frequency.setValueAtTime(clickFreq, dropCtx.currentTime);
          gainClick.gain.setValueAtTime(0.015, dropCtx.currentTime);
          gainClick.gain.exponentialRampToValueAtTime(0.0001, dropCtx.currentTime + 0.01);

          oscClick.start();
          oscClick.stop(dropCtx.currentTime + 0.012);
        }
      } catch (err) {
        // Safe fallthrough
      }

      count++;
    }, 38); // highly dense droplets cascade
  }

  /**
   * Stop pouring loops cleanly
   */
  stopPouringSound() {
    if (this.pourInterval) {
      clearInterval(this.pourInterval);
      this.pourInterval = null;
    }

    if (this.lowRumbleOsc) {
      try {
        this.lowRumbleOsc.stop();
      } catch (e) {}
      this.lowRumbleOsc = null;
    }
    if (this.lowRumbleGain) {
      try {
        this.lowRumbleGain.disconnect();
      } catch (e) {}
      this.lowRumbleGain = null;
    }
  }

  /**
   * Glass jar full chime
   */
  playBottleComplete() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    // Sparkling 2D glass completed chime
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 arpeggio
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (this.isMuted) return;
        const noteCtx = this.initCtx();
        if (!noteCtx) return;

        const osc = noteCtx.createOscillator();
        const gainNode = noteCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(noteCtx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, noteCtx.currentTime);

        gainNode.gain.setValueAtTime(0.08, noteCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, noteCtx.currentTime + 0.4);

        osc.start();
        osc.stop(noteCtx.currentTime + 0.45);
      }, idx * 75);
    });
  }

  /**
   * Triumph celebration melody
   */
  playVictory() {
    if (this.isMuted) return;
    const ctx = this.initCtx();
    if (!ctx) return;

    // Sparkling upward 2D block blast style victory scale
    const notes = [261.63, 329.63, 392.00, 523.25, 587.33, 659.25, 783.99, 880.00, 1046.50]; // C4, E4, G4, C5, D5, E5, G5, A5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        if (this.isMuted) return;
        const stepCtx = this.initCtx();
        if (!stepCtx) return;

        const osc = stepCtx.createOscillator();
        const gainNode = stepCtx.createGain();

        osc.connect(gainNode);
        gainNode.connect(stepCtx.destination);

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, stepCtx.currentTime);
        
        // Slight high frequency sparkling shine to simulate premium feel
        gainNode.gain.setValueAtTime(0.12 - (idx * 0.005), stepCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, stepCtx.currentTime + 0.6);

        osc.start();
        osc.stop(stepCtx.currentTime + 0.65);
      }, idx * 60);
    });
  }
}

export const gameAudio = new WaterSortAudio();
export default gameAudio;
