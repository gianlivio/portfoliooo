"use client";

import { BPM } from "./condivisi";

/**
 * Il suono del sito, tutto sintetizzato con la Web Audio API: nessun file.
 * Sempre spento di default; si accende solo dopo un gesto di chi visita (il pulsante in alto
 * o la drum machine sulla scrivania). La scelta resta in localStorage, chiave "audio":
 *   "spento" · "ambiente" (solo il fondo) · "loop" (fondo più il loop della drum machine).
 * Il fondo cambia fra giorno (arioso, luminoso) e notte (profondo, col respiro del mare),
 * con una dissolvenza al cambio di tema. Il loop a 130 BPM ha anch'esso una variante per tema.
 * Sopra, effetti discreti agganciati a eventi che esistono già (gocce, remi, carte, cassetto, tema)
 * e le note delle carte: passando da una carta all'altra con le frecce si suona un arpeggio.
 */

export type Modo = "spento" | "ambiente" | "loop";

/**
 * Punto d'inserimento per un sottofondo registrato: un file in public/ (per esempio "/audio/sottofondo.mp3").
 * Se c'è, suona in loop sotto il fondo sintetizzato, col suo volume; se è null non si carica niente.
 */
export const SOTTOFONDO: { url: string | null; volume: number } = { url: null, volume: 0.5 };

const CHIAVE = "audio";
const VOLUME = 0.16; // volume generale, basso
const SEDICESIMO = 60 / BPM / 4;

/** La scala delle carte: la minore pentatonica di la, su due ottave abbondanti. */
const SCALA = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

type Ascoltatore = (m: Modo) => void;

function leggiScelta(): Modo {
  try {
    const v = localStorage.getItem(CHIAVE);
    return v === "ambiente" || v === "loop" ? v : "spento";
  } catch {
    return "spento";
  }
}

function salvaScelta(m: Modo) {
  try {
    localStorage.setItem(CHIAVE, m);
  } catch {
    /* archivio non disponibile: la scelta vale per questa visita */
  }
}

class Suono {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private giorno!: GainNode;
  private notte!: GainNode;
  private loopBus!: GainNode;
  private effetti!: GainNode;
  private eco!: DelayNode;
  private riverbero!: ConvolverNode;
  private rumore!: AudioBuffer;
  private scheduler: ReturnType<typeof setInterval> | null = null;
  private passo = 0;
  private prossimo = 0;
  private inizioLoop = 0;
  private campanelle: ReturnType<typeof setTimeout> | null = null;
  private eNotte = true;
  private ascoltatori = new Set<Ascoltatore>();
  modo: Modo = "spento";
  /** la scelta salvata, in attesa del primo gesto per diventare suono */
  voluto: Modo = "spento";

  /* ------------------------------------------------------------------ stato */

  /** Legge la scelta salvata. Con "riduci movimento" non si riattiva da sola: solo a mano. */
  prepara(ridotto: boolean) {
    this.voluto = ridotto ? "spento" : leggiScelta();
    this.avvisa();
  }

  ascolta(f: Ascoltatore) {
    this.ascoltatori.add(f);
    return () => {
      this.ascoltatori.delete(f);
    };
  }

  private avvisa() {
    this.ascoltatori.forEach((f) => f(this.voluto));
  }

  /** Da chiamare dentro un gesto (click, tasto): crea il contesto audio e applica la scelta. */
  imposta(m: Modo) {
    this.voluto = m;
    salvaScelta(m);
    if (m !== "spento") this.avvia();
    this.applica();
    this.avvisa();
  }

  /** Al primo gesto, se la scelta salvata era "acceso", si accende davvero. */
  gesto() {
    if (this.voluto !== "spento" && this.modo === "spento") {
      this.avvia();
      this.applica();
    }
  }

  /** Il pulsante dell'interfaccia: acceso/spento. */
  interruttore() {
    this.imposta(this.voluto === "spento" ? "ambiente" : "spento");
  }

  /** La drum machine: accende il loop (e il fondo), o lo spegne lasciando il fondo. */
  drum() {
    this.imposta(this.voluto === "loop" ? "ambiente" : "loop");
  }

  setNotte(notte: boolean) {
    this.eNotte = notte;
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime;
    this.giorno.gain.cancelScheduledValues(t);
    this.notte.gain.cancelScheduledValues(t);
    this.giorno.gain.setTargetAtTime(notte ? 0 : 1, t, 0.9);
    this.notte.gain.setTargetAtTime(notte ? 1 : 0, t, 0.9);
  }

  /** Il battito del loop: fase dentro il quarto (0–1) e numero del quarto. Null a loop spento. */
  battito(): { fase: number; n: number } | null {
    const c = this.ctx;
    if (!c || this.modo !== "loop") return null;
    const q = (c.currentTime - this.inizioLoop) / (60 / BPM);
    if (q < 0) return null;
    return { fase: q - Math.floor(q), n: Math.floor(q) };
  }

  /* ---------------------------------------------------------------- grafo */

  private avvia() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => undefined);
      return;
    }
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const c = new AC();
    this.ctx = c;
    this.master = c.createGain();
    this.master.gain.value = 0;
    const limita = c.createDynamicsCompressor();
    limita.threshold.value = -14;
    limita.ratio.value = 4;
    this.master.connect(limita).connect(c.destination);

    // un riverbero fatto in casa: rumore che decade, uno per canale
    this.riverbero = c.createConvolver();
    const lungo = c.sampleRate * 3.2;
    const ir = c.createBuffer(2, lungo, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < lungo; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / lungo, 2.6);
    }
    this.riverbero.buffer = ir;
    const umido = c.createGain();
    umido.gain.value = 0.35;
    this.riverbero.connect(umido).connect(this.master);

    // eco a tempo (un ottavo puntato), per il loop e qualche effetto
    this.eco = c.createDelay(1.5);
    this.eco.delayTime.value = (60 / BPM) * 0.75;
    const ritorno = c.createGain();
    ritorno.gain.value = 0.32;
    const filtroEco = c.createBiquadFilter();
    filtroEco.type = "lowpass";
    filtroEco.frequency.value = 2400;
    this.eco.connect(filtroEco).connect(ritorno).connect(this.eco);
    filtroEco.connect(this.master);
    filtroEco.connect(this.riverbero);

    this.giorno = c.createGain();
    this.notte = c.createGain();
    this.giorno.gain.value = this.eNotte ? 0 : 1;
    this.notte.gain.value = this.eNotte ? 1 : 0;
    this.giorno.connect(this.master);
    this.notte.connect(this.master);
    this.giorno.connect(this.riverbero);
    this.notte.connect(this.riverbero);

    this.loopBus = c.createGain();
    this.loopBus.gain.value = 0;
    this.loopBus.connect(this.master);

    this.effetti = c.createGain();
    this.effetti.gain.value = 0.7;
    this.effetti.connect(this.master);
    this.effetti.connect(this.riverbero);

    // rumore bianco riusato da tutti
    this.rumore = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const r = this.rumore.getChannelData(0);
    for (let i = 0; i < r.length; i++) r[i] = Math.random() * 2 - 1;

    this.fondoGiorno();
    this.fondoNotte();
    this.sottofondo();
  }

  private applica() {
    const c = this.ctx;
    if (!c) return;
    const t = c.currentTime;
    const m = this.voluto;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(m === "spento" ? 0 : VOLUME, t, 0.4);
    this.loopBus.gain.cancelScheduledValues(t);
    this.loopBus.gain.setTargetAtTime(m === "loop" ? 1 : 0, t, 0.25);
    if (m === "loop" && !this.scheduler) {
      this.passo = 0;
      this.prossimo = t + 0.08;
      this.inizioLoop = this.prossimo;
      this.scheduler = setInterval(() => this.programma(), 25);
    }
    if (m !== "loop" && this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }
    if (m !== "spento" && !this.campanelle) this.campanella();
    this.modo = m;
    if (m === "spento") {
      // a volume zero il contesto si sospende: niente calcolo inutile
      setTimeout(() => {
        if (this.voluto === "spento") this.ctx?.suspend().catch(() => undefined);
      }, 1500);
      if (this.campanelle) {
        clearTimeout(this.campanelle);
        this.campanelle = null;
      }
    } else if (c.state === "suspended") c.resume().catch(() => undefined);
  }

  /* ---------------------------------------------------------------- il fondo */

  private sorgenteRumore(dest: AudioNode, tipo: BiquadFilterType, f: number, q: number, guadagno: number) {
    const c = this.ctx as AudioContext;
    const s = c.createBufferSource();
    s.buffer = this.rumore;
    s.loop = true;
    const fl = c.createBiquadFilter();
    fl.type = tipo;
    fl.frequency.value = f;
    fl.Q.value = q;
    const g = c.createGain();
    g.gain.value = guadagno;
    s.connect(fl).connect(g).connect(dest);
    s.start();
    return { fl, g };
  }

  private lfo(param: AudioParam, freq: number, ampiezza: number) {
    const c = this.ctx as AudioContext;
    const o = c.createOscillator();
    o.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = ampiezza;
    o.connect(g).connect(param);
    o.start();
  }

  /** Accordo tenuto: triangoli appena scordati, un filtro che respira piano. */
  private tappeto(dest: AudioNode, note: number[], taglio: number, guadagno: number, tipo: OscillatorType = "triangle") {
    const c = this.ctx as AudioContext;
    const fl = c.createBiquadFilter();
    fl.type = "lowpass";
    fl.frequency.value = taglio;
    fl.Q.value = 0.4;
    const g = c.createGain();
    g.gain.value = guadagno;
    fl.connect(g).connect(dest);
    note.forEach((f, i) => {
      for (const sc of [-4, 4]) {
        const o = c.createOscillator();
        o.type = tipo;
        o.frequency.value = f;
        o.detune.value = sc + i;
        o.connect(fl);
        o.start();
      }
    });
    this.lfo(fl.frequency, 0.05, taglio * 0.35);
    this.lfo(g.gain, 0.07, guadagno * 0.3);
  }

  /** Giorno: un accordo largo e chiaro, e aria. */
  private fondoGiorno() {
    this.tappeto(this.giorno, [130.81, 196, 246.94, 293.66, 329.63], 1900, 0.05);
    const aria = this.sorgenteRumore(this.giorno, "highpass", 5200, 0.5, 0.025);
    this.lfo(aria.g.gain, 0.09, 0.012);
  }

  /** Notte: un fondo basso e scuro, e il mare che respira (onde lunghe, otto secondi l'una). */
  private fondoNotte() {
    const c = this.ctx as AudioContext;
    this.tappeto(this.notte, [55, 82.41, 110, 130.81, 164.81], 520, 0.075, "sawtooth");
    const mare = this.sorgenteRumore(this.notte, "lowpass", 420, 0.6, 0.0);
    // il respiro: sale e scende ogni otto secondi, un'onda più forte ogni tanto
    const respiro = c.createOscillator();
    respiro.frequency.value = 0.125;
    const ampiezza = c.createGain();
    ampiezza.gain.value = 0.11;
    const base = c.createConstantSource();
    base.offset.value = 0.13;
    respiro.connect(ampiezza).connect(mare.g.gain);
    base.connect(mare.g.gain);
    respiro.start();
    base.start();
    this.lfo(mare.fl.frequency, 0.125, 260);
    const risacca = this.sorgenteRumore(this.notte, "bandpass", 1800, 0.7, 0.012);
    this.lfo(risacca.g.gain, 0.125, 0.012);
  }

  /** Il punto d'inserimento del sottofondo registrato. */
  private async sottofondo() {
    const c = this.ctx;
    if (!c || !SOTTOFONDO.url) return;
    try {
      const r = await fetch(SOTTOFONDO.url);
      const buf = await c.decodeAudioData(await r.arrayBuffer());
      const s = c.createBufferSource();
      s.buffer = buf;
      s.loop = true;
      const g = c.createGain();
      g.gain.value = SOTTOFONDO.volume;
      s.connect(g).connect(this.master);
      s.start();
    } catch {
      /* file assente o non decodificabile: resta il fondo sintetizzato */
    }
  }

  /** Di tanto in tanto una campanella lontana (giorno) o una goccia di sonar (notte). */
  private campanella() {
    const c = this.ctx;
    if (!c) return;
    const f = SCALA[5 + Math.floor(Math.random() * 7)];
    this.nota(this.eNotte ? this.notte : this.giorno, f * (this.eNotte ? 0.5 : 1), c.currentTime + 0.05, 2.8, 0.03, "sine");
    this.campanelle = setTimeout(() => this.campanella(), 4000 + Math.random() * 6000);
  }

  /* ------------------------------------------------------------------ il loop */

  private programma() {
    const c = this.ctx;
    if (!c) return;
    while (this.prossimo < c.currentTime + 0.12) {
      this.colpo(this.passo % 16, Math.floor(this.passo / 16), this.prossimo);
      this.prossimo += SEDICESIMO;
      this.passo++;
    }
  }

  /** Un sedicesimo del loop. Notte: la minore, cupa e piena d'eco. Giorno: aperto, in re dorico. */
  private colpo(s: number, battuta: number, t: number) {
    const n = this.eNotte;
    const d = this.loopBus;
    // cassa in quattro
    if (s % 4 === 0) this.cassa(t, n ? 0.95 : 0.85);
    // charleston: chiuso sui levare, aperto sul levare del quarto (di giorno)
    if (s % 4 === 2) this.charleston(t, n ? 0.05 : 0.09, n ? 0.05 : 0.18);
    else if (s % 2 === 1) this.charleston(t, n ? 0.022 : 0.03, 0.03);
    // battito di mani, morbido, sul due e sul quattro
    if (s === 4 || s === 12) this.mani(t, n ? 0.12 : 0.16);
    // basso che rotola
    const radice = n ? 55 : 73.42;
    const giro = n ? [0, 0, 3, 0, 7, 0, 5, 3] : [0, 0, 5, 0, 7, 0, 10, 7];
    if (s % 4 !== 0) {
      const semi = giro[(battuta % 2) * 4 + Math.floor(s / 4)];
      this.basso(t, radice * Math.pow(2, semi / 12), n ? 0.22 : 0.17, n ? 380 : 620);
    }
    // arpeggio pizzicato, nell'eco
    const arp = n ? [0, 3, 7, 10, 12, 10, 7, 3] : [0, 5, 7, 12, 14, 12, 9, 7];
    if (s % 2 === 0 && (battuta % 4 !== 3 || s < 8)) {
      const semi = arp[(s / 2 + battuta) % arp.length];
      const f = (n ? 220 : 293.66) * Math.pow(2, semi / 12);
      this.pizzico(t, f, n ? 0.045 : 0.05);
    }
    // ogni quattro battute un accordo lungo che apre
    if (s === 0 && battuta % 4 === 0) {
      const acc = n ? [220, 261.63, 329.63, 392] : [293.66, 369.99, 440, 554.37];
      acc.forEach((f) => this.nota(d, f, t, (60 / BPM) * 6, 0.018, "sawtooth", 900));
    }
  }

  private inviluppo(g: GainNode, t: number, picco: number, attacco: number, durata: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(picco, t + attacco);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
  }

  private cassa(t: number, forza: number) {
    const c = this.ctx as AudioContext;
    const o = c.createOscillator();
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(44, t + 0.12);
    const g = c.createGain();
    this.inviluppo(g, t, forza, 0.003, 0.42);
    o.connect(g).connect(this.loopBus);
    o.start(t);
    o.stop(t + 0.45);
  }

  private charleston(t: number, forza: number, durata: number) {
    const c = this.ctx as AudioContext;
    const s = c.createBufferSource();
    s.buffer = this.rumore;
    const f = c.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 7800;
    const g = c.createGain();
    this.inviluppo(g, t, forza, 0.002, durata);
    s.connect(f).connect(g).connect(this.loopBus);
    s.start(t, Math.random() * 1.5, durata + 0.02);
  }

  private mani(t: number, forza: number) {
    const c = this.ctx as AudioContext;
    for (let k = 0; k < 3; k++) {
      const tt = t + k * 0.011;
      const s = c.createBufferSource();
      s.buffer = this.rumore;
      const f = c.createBiquadFilter();
      f.type = "bandpass";
      f.frequency.value = 1350;
      f.Q.value = 1.1;
      const g = c.createGain();
      this.inviluppo(g, tt, forza * (k === 2 ? 1 : 0.6), 0.002, k === 2 ? 0.18 : 0.03);
      s.connect(f).connect(g).connect(this.loopBus);
      g.connect(this.riverbero);
      s.start(tt, Math.random(), 0.2);
    }
  }

  private basso(t: number, f: number, forza: number, taglio: number) {
    const c = this.ctx as AudioContext;
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = f;
    const fl = c.createBiquadFilter();
    fl.type = "lowpass";
    fl.Q.value = 6;
    fl.frequency.setValueAtTime(taglio * 2.2, t);
    fl.frequency.exponentialRampToValueAtTime(taglio * 0.5, t + 0.1);
    const g = c.createGain();
    this.inviluppo(g, t, forza, 0.004, 0.13);
    o.connect(fl).connect(g).connect(this.loopBus);
    o.start(t);
    o.stop(t + 0.16);
  }

  private pizzico(t: number, f: number, forza: number) {
    const c = this.ctx as AudioContext;
    const o = c.createOscillator();
    o.type = "square";
    o.frequency.value = f;
    const fl = c.createBiquadFilter();
    fl.type = "lowpass";
    fl.frequency.setValueAtTime(2600, t);
    fl.frequency.exponentialRampToValueAtTime(500, t + 0.18);
    const g = c.createGain();
    this.inviluppo(g, t, forza, 0.003, 0.22);
    o.connect(fl).connect(g);
    g.connect(this.loopBus);
    g.connect(this.eco);
    o.start(t);
    o.stop(t + 0.25);
  }

  /** Una nota semplice, con un inviluppo morbido. */
  private nota(dest: AudioNode, f: number, t: number, durata: number, forza: number, tipo: OscillatorType = "sine", taglio = 0) {
    const c = this.ctx as AudioContext;
    const o = c.createOscillator();
    o.type = tipo;
    o.frequency.value = f;
    const g = c.createGain();
    this.inviluppo(g, t, forza, Math.min(0.08, durata * 0.2), durata);
    if (taglio) {
      const fl = c.createBiquadFilter();
      fl.type = "lowpass";
      fl.frequency.value = taglio;
      o.connect(fl).connect(g);
    } else o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + durata + 0.05);
  }

  /* --------------------------------------------------------------- effetti */

  private pronto() {
    return this.ctx && this.modo !== "spento" && this.ctx.state === "running";
  }

  /** La nota della carta i-esima: le carte una dopo l'altra fanno un arpeggio. */
  notaCarta(i: number) {
    if (!this.pronto()) return;
    const c = this.ctx as AudioContext;
    const f = SCALA[i % SCALA.length];
    this.nota(this.effetti, f, c.currentTime + 0.01, 0.9, 0.06, "triangle");
    this.nota(this.eco, f * 2, c.currentTime + 0.01, 0.4, 0.015, "sine");
  }

  effetto(nome: "goccia" | "remo" | "sfiora" | "apri" | "cassetto" | "tema", forza = 1) {
    if (!this.pronto()) return;
    const c = this.ctx as AudioContext;
    const t = c.currentTime + 0.01;
    const e = this.effetti;
    switch (nome) {
      case "goccia": {
        const o = c.createOscillator();
        o.frequency.setValueAtTime(1400 + Math.random() * 500, t);
        o.frequency.exponentialRampToValueAtTime(520, t + 0.07);
        const g = c.createGain();
        this.inviluppo(g, t, 0.05 * forza, 0.002, 0.16);
        o.connect(g).connect(e);
        o.start(t);
        o.stop(t + 0.2);
        break;
      }
      case "remo": {
        const s = c.createBufferSource();
        s.buffer = this.rumore;
        const f = c.createBiquadFilter();
        f.type = "bandpass";
        f.Q.value = 0.8;
        f.frequency.setValueAtTime(500, t);
        f.frequency.exponentialRampToValueAtTime(1600, t + 0.25);
        const g = c.createGain();
        this.inviluppo(g, t, 0.035 * forza, 0.05, 0.4);
        s.connect(f).connect(g).connect(e);
        s.start(t, Math.random(), 0.45);
        break;
      }
      case "sfiora":
        this.nota(e, 2093, t, 0.12, 0.012, "sine");
        break;
      case "apri":
        this.nota(e, 659.25, t, 1.2, 0.04, "sine");
        this.nota(e, 987.77, t + 0.06, 1.4, 0.03, "sine");
        break;
      case "cassetto": {
        const s = c.createBufferSource();
        s.buffer = this.rumore;
        const f = c.createBiquadFilter();
        f.type = "bandpass";
        f.Q.value = 2.5;
        f.frequency.setValueAtTime(260, t);
        f.frequency.linearRampToValueAtTime(420, t + 0.35);
        const g = c.createGain();
        this.inviluppo(g, t, 0.07, 0.04, 0.42);
        s.connect(f).connect(g).connect(e);
        s.start(t, Math.random(), 0.5);
        [523.25, 659.25, 783.99, 1046.5, 1318.51].forEach((fr, k) => this.nota(e, fr, t + 0.25 + k * 0.07, 1.6, 0.025, "sine"));
        break;
      }
      case "tema": {
        const s = c.createBufferSource();
        s.buffer = this.rumore;
        const f = c.createBiquadFilter();
        f.type = "bandpass";
        f.Q.value = 1.5;
        f.frequency.setValueAtTime(this.eNotte ? 3000 : 300, t);
        f.frequency.exponentialRampToValueAtTime(this.eNotte ? 300 : 3000, t + 1.1);
        const g = c.createGain();
        this.inviluppo(g, t, 0.05, 0.3, 1.3);
        s.connect(f).connect(g).connect(e);
        s.start(t, 0, 1.4);
        break;
      }
    }
  }
}

/** Unico in tutta la pagina. */
export const suono = new Suono();
