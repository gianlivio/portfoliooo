"use client";

/**
 * I suoni della campagna, per la pagina dell'olio: tutti sintetizzati con la Web Audio API, nessun file.
 * Spenti finché chi visita non li accende. Di giorno vento fra le foglie, cicale e passeri;
 * di notte vento più quieto, grilli e l'assiolo, la piccola civetta delle campagne siciliane.
 */

const VOLUME = 0.22;

export class Campagna {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private giorno!: GainNode;
  private notte!: GainNode;
  private rumore!: AudioBuffer;
  private timer: ReturnType<typeof setTimeout>[] = [];
  private eNotte = false;
  acceso = false;

  setNotte(n: boolean) {
    this.eNotte = n;
    const c = this.ctx;
    if (!c) return;
    this.giorno.gain.setTargetAtTime(n ? 0 : 1, c.currentTime, 0.8);
    this.notte.gain.setTargetAtTime(n ? 1 : 0, c.currentTime, 0.8);
  }

  /** Da chiamare dentro un gesto: accende o spegne. */
  alterna() {
    if (!this.ctx) this.crea();
    const c = this.ctx;
    if (!c) return false;
    this.acceso = !this.acceso;
    if (this.acceso) c.resume().catch(() => undefined);
    this.master.gain.setTargetAtTime(this.acceso ? VOLUME : 0, c.currentTime, 0.5);
    if (!this.acceso)
      setTimeout(() => {
        if (!this.acceso) c.suspend().catch(() => undefined);
      }, 2000);
    return this.acceso;
  }

  chiudi() {
    this.timer.forEach(clearTimeout);
    this.ctx?.close().catch(() => undefined);
    this.ctx = null;
  }

  private crea() {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const c = new AC();
    this.ctx = c;
    this.master = c.createGain();
    this.master.gain.value = 0;
    this.master.connect(c.destination);
    this.giorno = c.createGain();
    this.notte = c.createGain();
    this.giorno.gain.value = this.eNotte ? 0 : 1;
    this.notte.gain.value = this.eNotte ? 1 : 0;
    this.giorno.connect(this.master);
    this.notte.connect(this.master);
    this.rumore = c.createBuffer(1, c.sampleRate * 3, c.sampleRate);
    const r = this.rumore.getChannelData(0);
    for (let i = 0; i < r.length; i++) r[i] = Math.random() * 2 - 1;

    this.vento(this.giorno, 1);
    this.vento(this.notte, 0.55);
    this.cicala(-0.6, 4600, 0);
    this.cicala(0.5, 5300, 3.5);
    this.passeri();
    this.grilli();
    this.assiolo();
  }

  private rumoreFiltrato(dest: AudioNode, tipo: BiquadFilterType, f: number, q: number) {
    const c = this.ctx as AudioContext;
    const s = c.createBufferSource();
    s.buffer = this.rumore;
    s.loop = true;
    s.loopStart = Math.random();
    const fl = c.createBiquadFilter();
    fl.type = tipo;
    fl.frequency.value = f;
    fl.Q.value = q;
    const g = c.createGain();
    g.gain.value = 0;
    s.connect(fl).connect(g).connect(dest);
    s.start();
    return { fl, g };
  }

  /** Il vento fra le foglie: un soffio basso che va e viene a raffiche, e il fruscio fine sopra. */
  private vento(dest: AudioNode, forza: number) {
    const c = this.ctx as AudioContext;
    const soffio = this.rumoreFiltrato(dest, "bandpass", 700, 0.6);
    const fruscio = this.rumoreFiltrato(dest, "highpass", 3200, 0.4);
    const raffica = () => {
      const t = c.currentTime;
      const picco = (0.05 + Math.random() * 0.07) * forza;
      const durata = 3 + Math.random() * 6;
      soffio.g.gain.setTargetAtTime(picco, t, durata * 0.3);
      soffio.g.gain.setTargetAtTime(picco * 0.25, t + durata * 0.6, durata * 0.35);
      fruscio.g.gain.setTargetAtTime(picco * 0.22, t, durata * 0.25);
      fruscio.g.gain.setTargetAtTime(picco * 0.04, t + durata * 0.55, durata * 0.3);
      soffio.fl.frequency.setTargetAtTime(500 + Math.random() * 500, t, durata * 0.4);
      this.timer.push(setTimeout(raffica, durata * 1000));
    };
    raffica();
  }

  /** Una cicala: rumore stretto sui quattro-cinquemila hertz, battuto veloce, a frasi lunghe che crescono e calano. */
  private cicala(lato: number, f: number, ritardo: number) {
    const c = this.ctx as AudioContext;
    const pan = c.createStereoPanner();
    pan.pan.value = lato;
    pan.connect(this.giorno);
    const voce = this.rumoreFiltrato(pan, "bandpass", f, 9);
    // il battito: un'onda quadra che apre e chiude il suono centinaia di volte al secondo
    const battito = c.createOscillator();
    battito.type = "square";
    battito.frequency.value = 160 + Math.random() * 60;
    const prof = c.createGain();
    prof.gain.value = 0;
    battito.connect(prof).connect(voce.g.gain);
    battito.start();
    const frase = () => {
      const t = c.currentTime;
      const durata = 4 + Math.random() * 7;
      const forte = 0.05 + Math.random() * 0.04;
      prof.gain.cancelScheduledValues(t);
      prof.gain.setValueAtTime(0, t);
      prof.gain.linearRampToValueAtTime(forte, t + durata * 0.35);
      prof.gain.linearRampToValueAtTime(forte * 0.8, t + durata * 0.85);
      prof.gain.linearRampToValueAtTime(0, t + durata);
      voce.fl.frequency.setValueAtTime(f * 0.97, t);
      voce.fl.frequency.linearRampToValueAtTime(f * 1.03, t + durata);
      this.timer.push(setTimeout(frase, (durata + 1 + Math.random() * 5) * 1000));
    };
    this.timer.push(setTimeout(frase, ritardo * 1000));
  }

  /** Un cinguettio: due o cinque note brevi che scivolano verso l'alto. */
  private passeri() {
    const c = this.ctx as AudioContext;
    const verso = () => {
      const t0 = c.currentTime + 0.05;
      const n = 2 + Math.floor(Math.random() * 4);
      const base = 2600 + Math.random() * 1400;
      const pan = c.createStereoPanner();
      pan.pan.value = Math.random() * 1.6 - 0.8;
      pan.connect(this.giorno);
      for (let i = 0; i < n; i++) {
        const t = t0 + i * (0.09 + Math.random() * 0.05);
        const o = c.createOscillator();
        o.frequency.setValueAtTime(base, t);
        o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), t + 0.05);
        const g = c.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.025, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0005, t + 0.07);
        o.connect(g).connect(pan);
        o.start(t);
        o.stop(t + 0.09);
      }
      this.timer.push(setTimeout(verso, 2500 + Math.random() * 7000));
    };
    this.timer.push(setTimeout(verso, 1500));
  }

  /** I grilli: un trillo acuto a gruppi di tre, regolare, da due posti diversi. */
  private grilli() {
    const c = this.ctx as AudioContext;
    [-0.5, 0.45].forEach((lato, k) => {
      const pan = c.createStereoPanner();
      pan.pan.value = lato;
      pan.connect(this.notte);
      const f = 4300 + k * 350;
      const canta = () => {
        const t0 = c.currentTime + 0.05;
        for (let i = 0; i < 3; i++) {
          const t = t0 + i * 0.045;
          const o = c.createOscillator();
          o.frequency.value = f;
          const g = c.createGain();
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.012, t + 0.008);
          g.gain.linearRampToValueAtTime(0, t + 0.03);
          o.connect(g).connect(pan);
          o.start(t);
          o.stop(t + 0.035);
        }
        this.timer.push(setTimeout(canta, 380 + k * 70 + Math.random() * 40));
      };
      this.timer.push(setTimeout(canta, 300 + k * 900));
    });
  }

  /** L'assiolo: una sola nota morbida, "chiù", ogni due secondi e mezzo, a serie. */
  private assiolo() {
    const c = this.ctx as AudioContext;
    const serie = () => {
      const n = 4 + Math.floor(Math.random() * 6);
      const t0 = c.currentTime + 0.1;
      for (let i = 0; i < n; i++) {
        const t = t0 + i * 2.6;
        const o = c.createOscillator();
        o.frequency.setValueAtTime(1180, t);
        o.frequency.linearRampToValueAtTime(1230, t + 0.12);
        const g = c.createGain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.03, t + 0.05);
        g.gain.linearRampToValueAtTime(0, t + 0.24);
        o.connect(g).connect(this.notte);
        o.start(t);
        o.stop(t + 0.26);
      }
      this.timer.push(setTimeout(serie, (n * 2.6 + 8 + Math.random() * 14) * 1000));
    };
    this.timer.push(setTimeout(serie, 4000));
  }
}
