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

/**
 * I pezzi che partono dai synth dello studietto: l'album Semeiosis di Juan Lee (Livio), 2021, nell'ordine del disco.
 * Di ciascuno non tutto il pezzo: un giro dei momenti migliori, montato a battuta, che ricomincia senza tagli.
 * Ogni giro comincia nel break prima del drop più bello, va fino alla fine della parte piena, poi una battuta di
 * dissolvenza torna all'inizio del giro e corre fino al break: il file finisce dove comincia. Signification, per
 * esempio, parte da 3:26 dell'originale, arriva al picco (5:20), torna a 1:36 e corre fino a 3:26.
 * quarti: i quarti di un giro (per il battito delle luci); bpm: quello che dice il display della macchina.
 * Le frecce accanto alla scritta passano al pezzo dopo o a quello prima. Se un file non si carica,
 * al suo posto suona il loop sintetizzato.
 */
export type Brano = { url: string; titolo: string; quarti: number; bpm: number; volume: number };
export const ARTISTA = "Juan Lee";
/** volume: per pareggiare i pezzi a orecchio (i master hanno livelli medi diversi, fino a 4 dB) */
export const BRANI: Brano[] = [
  { url: "/audio/juan-lee-signification.mp3", titolo: "Signification", quarti: 448, bpm: 120, volume: 0.85 },
  { url: "/audio/juan-lee-the-platipus-paradox.mp3", titolo: "The Platipus Paradox", quarti: 384, bpm: 120, volume: 0.68 },
  { url: "/audio/juan-lee-ecology-of-mind.mp3", titolo: "Ecology of Mind", quarti: 512, bpm: 150, volume: 0.81 },
  { url: "/audio/juan-lee-probabilistic-regime.mp3", titolo: "Probabilistic Regime", quarti: 544, bpm: 150, volume: 0.69 },
  { url: "/audio/juan-lee-epigenetica.mp3", titolo: "Epigenetica", quarti: 448, bpm: 120, volume: 0.77 },
  { url: "/audio/juan-lee-rizoma.mp3", titolo: "Rizoma", quarti: 448, bpm: 120, volume: 0.85 },
  { url: "/audio/juan-lee-semiosi-illimitata.mp3", titolo: "Semiosi Illimitata", quarti: 480, bpm: 150, volume: 0.56 },
];

const CHIAVE = "audio";
const VOLUME = 0.16; // volume generale, basso
/** Le campanelle del giorno: note della scala hijaz su re. */
const CAMPANE_GIORNO = [440, 466.16, 587.33, 622.25, 739.99, 783.99, 880];
/** La linea acida della notte: sedici passi per giro, [semitoni da la, accento, legato] o null per la pausa. */
type Passo = [number, 0 | 1, 0 | 1] | null;
const ACIDO: Passo[][] = [
  // il giro della prima comparsa: scuro e insistente, la tonica che martella, il fa e il sol che tirano giù
  [[0, 1, 0], [0, 0, 0], [12, 0, 1], [0, 0, 0], [3, 1, 0], [0, 0, 0], [8, 0, 1], [7, 0, 0], [0, 1, 0], [0, 0, 0], [12, 0, 1], [10, 0, 0], [8, 1, 0], [7, 0, 1], [3, 0, 1], [0, 0, 0]],
  [[0, 1, 0], null, [0, 0, 0], [3, 0, 1], [0, 0, 0], [12, 1, 0], [10, 0, 1], [8, 0, 0], [0, 1, 0], [0, 0, 0], [15, 0, 1], [12, 0, 0], [0, 1, 0], [3, 0, 0], [5, 0, 1], [3, 0, 0]],
  [[0, 1, 0], [12, 0, 1], [0, 0, 0], [0, 0, 0], [8, 1, 0], [7, 0, 1], [0, 0, 0], [3, 0, 0], [0, 1, 0], null, [10, 0, 1], [12, 0, 0], [0, 1, 0], [8, 0, 1], [7, 0, 1], [5, 0, 0]],
  [[0, 1, 0], [0, 0, 1], [-2, 0, 1], [0, 0, 0], [12, 1, 0], [12, 0, 1], [15, 0, 1], [12, 0, 0], [0, 1, 0], [3, 0, 1], [0, 0, 0], null, [7, 1, 0], [8, 0, 1], [7, 0, 1], [3, 0, 0]],
];
/** Gli accordi del tappeto di notte: la minore nona e la minore undicesima, cinque voci, in la come il fondo. */
const ACCORDI_NOTTE = [
  [220, 261.63, 329.63, 392, 493.88],
  [220, 293.66, 329.63, 392, 523.25],
];
/** Il cancello del tappeto, due battute di sedicesimi: 1 aperto, 0 chiuso. */
const CANCELLO = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0];
/** La scala hijaz (frigia dominante), in semitoni dalla tonica. */
const HIJAZ = [0, 1, 4, 5, 7, 8, 10];
/** Le frasi dell'oud: quattro battute, sei colpi per battuta (gradi della scala; null = pausa). */
const FRASI: (number | null)[][][] = [
  [[0, 1, 2, null, 1, 0], [2, 3, 4, 3, 2, 1], [4, 5, 4, null, 3, 2], [1, 2, 1, 0, null, 0]],
  [[4, null, 4, 5, 4, 2], [3, 2, 1, null, 2, 3], [4, 6, 5, 4, 3, 2], [2, 1, 1, 0, null, null]],
];
/** La cadenza andalusa in re: sol minore, fa, mi bemolle, re. Le corde dal basso. */
const CADENZA = [
  [98, 146.83, 196, 233.08, 293.66],
  [87.31, 130.81, 174.61, 220, 261.63],
  [77.78, 116.54, 155.56, 196, 233.08],
  [73.42, 110, 146.83, 185, 220, 293.66],
];

/** Di notte 130 BPM; di giorno più lento e più pesante. */
const BPM_GIORNO = 108;

/** La scala delle carte: la minore pentatonica di la, su due ottave abbondanti. */
const SCALA = [220, 261.63, 293.66, 329.63, 392, 440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

type Ascoltatore = (m: Modo) => void;

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
  /** il pezzo di Juan Lee: un elemento audio dentro il grafo, col suo volume */
  private brano: HTMLAudioElement | null = null;
  private branoGain: GainNode | null = null;
  private branoRotto = false;
  /** quale pezzo dell'album suona (o suonerà al prossimo clic) */
  private indice = 0;
  private passo = 0;
  private prossimo = 0;
  private inizioLoop = 0;
  private campanelle: ReturnType<typeof setTimeout> | null = null;
  private eNotte = true;
  /** Il tempo del loop, e da dove contare i quarti dopo l'ultimo cambio di tempo. */
  private bpm = BPM;
  private ancora = { t: 0, q: 0 };
  private ascoltatori = new Set<Ascoltatore>();
  modo: Modo = "spento";
  /** la scelta salvata, in attesa del primo gesto per diventare suono */
  voluto: Modo = "spento";

  /* ------------------------------------------------------------------ stato */

  /** Legge la scelta salvata. Con "riduci movimento" non si riattiva da sola: solo a mano. */
  prepara(ridotto: boolean) {
    // a ogni arrivo il fondo è acceso (solo il fondo); si spegne col bottone, per quella visita
    this.voluto = ridotto ? "spento" : "ambiente";
    // prova a partire subito: se il browser lo consente (sito già frequentato, permessi dati) si sente all'arrivo;
    // altrimenti il contesto resta sospeso e parte al primo tocco, clic o tasto, ovunque sulla pagina
    if (this.voluto !== "spento") {
      this.avvia();
      this.applica();
    }
    this.avvisa();
  }

  ascolta(f: Ascoltatore) {
    this.ascoltatori.add(f);
    return () => {
      this.ascoltatori.delete(f);
    };
  }

  /** Quello che si sente davvero: finché il browser tiene sospeso l'audio, per il bottone è spento. */
  private avvisa() {
    const vero: Modo = this.ctx && this.ctx.state === "running" ? this.voluto : "spento";
    this.ascoltatori.forEach((f) => f(vero));
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
    if (this.voluto !== "spento" && !this.suona()) {
      this.avvia();
      this.applica();
    }
  }

  /** Suona davvero? Il contesto resta sospeso finché il browser non riconosce un gesto valido. */
  private suona() {
    return !!this.ctx && this.ctx.state === "running" && this.modo !== "spento";
  }

  /** Il pulsante dell'interfaccia: acceso/spento. */
  interruttore() {
    // acceso ma ancora muto (il browser aspettava un gesto): il primo clic lo fa partire, non lo spegne
    if (this.voluto !== "spento" && !this.suona()) {
      this.avvia();
      this.applica();
      return;
    }
    this.imposta(this.voluto === "spento" ? "ambiente" : "spento");
  }

  /** Uscendo dalla stanza (verso la pagina dell'olio): tutto tace, la scelta resta; al ritorno prepara() riprende. */
  sospendi() {
    this.brano?.pause();
    if (this.campanelle) {
      clearTimeout(this.campanelle);
      this.campanelle = null;
    }
    this.ctx?.suspend().catch(() => undefined);
  }

  /** La drum machine: accende il loop (e il fondo), o lo spegne lasciando il fondo. */
  drum() {
    this.imposta(this.voluto === "loop" ? "ambiente" : "loop");
  }

  setNotte(notte: boolean) {
    this.eNotte = notte;
    this.cambiaTempo();
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
    // col pezzo vero il battito lo dà il pezzo: i quarti sono distribuiti uguali sulla sua durata
    const b = this.brano;
    if (b && !this.branoRotto) {
      if (b.paused || !b.duration) return null;
      const q = (b.currentTime / b.duration) * BRANI[this.indice].quarti;
      return { fase: q - Math.floor(q), n: Math.floor(q) };
    }
    const q = this.ancora.q + (c.currentTime - this.ancora.t) / (60 / this.bpm);
    if (c.currentTime < this.inizioLoop) return null;
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
    // quando il browser sblocca o sospende l'audio, il bottone si aggiorna
    c.onstatechange = () => this.avvisa();
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
    this.eco.delayTime.value = (60 / this.bpm) * 0.75;
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
    // il loop passa da una saturazione: più sporco, più industriale
    const sporco = c.createWaveShaper();
    const curva = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) {
      const x = (i / 1023) * 2 - 1;
      curva[i] = Math.tanh(x * 2.6);
    }
    sporco.curve = curva;
    sporco.oversample = "2x";
    const dopo = c.createGain();
    dopo.gain.value = 0.7;
    this.loopBus.connect(sporco).connect(dopo).connect(this.master);

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
    // col pezzo vero il fondo si ritira quasi del tutto, e il loop sintetizzato tace
    const pezzo = m === "loop" && this.suonaBrano();
    if (m !== "loop") this.fermaBrano();
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(m === "spento" ? 0 : pezzo ? VOLUME * 0.15 : VOLUME, t, 0.4);
    this.loopBus.gain.cancelScheduledValues(t);
    this.loopBus.gain.setTargetAtTime(m === "loop" && !pezzo ? 1 : 0, t, 0.25);
    if (m === "loop" && !pezzo && !this.scheduler) {
      this.passo = 0;
      this.prossimo = t + 0.08;
      this.inizioLoop = this.prossimo;
      this.ancora = { t: this.prossimo, q: 0 };
      this.scheduler = setInterval(() => this.programma(), 25);
    }
    if ((m !== "loop" || pezzo) && this.scheduler) {
      clearInterval(this.scheduler);
      this.scheduler = null;
    }
    if (m !== "spento" && !this.campanelle) this.campanella();
    this.modo = m;
    this.avvisa();
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

  /* ----------------------------------------------------------- il pezzo vero */

  /** Fa partire il pezzo di Juan Lee, dall'inizio del giro. Falso se non c'è modo (allora suona il loop sintetizzato). */
  private suonaBrano() {
    const c = this.ctx;
    if (!c || this.branoRotto) return false;
    if (!this.brano) {
      const a = new Audio();
      a.src = BRANI[this.indice].url;
      a.loop = true;
      a.preload = "auto";
      a.crossOrigin = "anonymous";
      a.addEventListener("error", () => {
        // il file non c'è o non si legge: si torna al loop sintetizzato
        this.branoRotto = true;
        if (this.modo === "loop") this.applica();
      });
      const g = c.createGain();
      g.gain.value = 0;
      c.createMediaElementSource(a).connect(g).connect(c.destination);
      this.brano = a;
      this.branoGain = g;
    }
    const a = this.brano, g = this.branoGain as GainNode, t = c.currentTime;
    if (a.paused) {
      a.currentTime = 0;
      a.play().catch(() => undefined);
    }
    g.gain.cancelScheduledValues(t);
    g.gain.setTargetAtTime(BRANI[this.indice].volume, t, 0.15);
    return true;
  }

  /** Spegne il pezzo sfumando, e lo ferma quando è muto. */
  private fermaBrano() {
    const c = this.ctx, a = this.brano, g = this.branoGain;
    if (!c || !a || !g || a.paused) return;
    g.gain.cancelScheduledValues(c.currentTime);
    g.gain.setTargetAtTime(0, c.currentTime, 0.25);
    setTimeout(() => {
      if (this.modo !== "loop") a.pause();
    }, 1500);
  }

  /**
   * Il pezzo dopo (verso 1) o quello prima (−1), in giro sull'album. Da chiamare dentro un gesto.
   * Il pezzo che suona sfuma in un attimo, il nuovo parte dall'inizio del suo giro; a musica spenta la accende.
   */
  cambiaBrano(verso: 1 | -1) {
    const n = BRANI.length;
    if (n < 2) return;
    this.indice = (this.indice + verso + n) % n;
    this.branoRotto = false;
    const a = this.brano, g = this.branoGain, c = this.ctx;
    if (a && g && c) {
      const t = c.currentTime;
      g.gain.cancelScheduledValues(t);
      g.gain.setValueAtTime(g.gain.value, t);
      g.gain.linearRampToValueAtTime(0, t + 0.12);
      a.pause();
      a.src = BRANI[this.indice].url;
    }
    if (this.voluto !== "loop") this.imposta("loop");
    else {
      this.applica();
      this.avvisa();
    }
  }

  /** Che cosa suona: per la scritta sopra lo studietto. Null se non suona il pezzo vero. */
  pezzo(): { artista: string; titolo: string; bpm: number; indice: number; quanti: number } | null {
    if (this.modo !== "loop" || !this.brano || this.branoRotto) return null;
    const b = BRANI[this.indice];
    return { artista: ARTISTA, titolo: b.titolo, bpm: b.bpm, indice: this.indice, quanti: BRANI.length };
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

  /** Giorno: una quinta vuota su re, bassa, che sta sotto la scala hijaz delle melodie; e aria. */
  private fondoGiorno() {
    this.tappeto(this.giorno, [73.42, 110, 146.83, 220, 293.66], 1300, 0.055);
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
    const f = this.eNotte ? SCALA[5 + Math.floor(Math.random() * 7)] : CAMPANE_GIORNO[Math.floor(Math.random() * CAMPANE_GIORNO.length)];
    this.nota(this.eNotte ? this.notte : this.giorno, f * (this.eNotte ? 0.5 : 1), c.currentTime + 0.05, 2.8, 0.03, "sine");
    this.campanelle = setTimeout(() => this.campanella(), 4000 + Math.random() * 6000);
  }

  /* ------------------------------------------------------------------ il loop */

  /** Al cambio di tema il tempo cambia dal prossimo sedicesimo, e i quarti continuano a contare da lì. */
  private cambiaTempo() {
    const bpm = this.eNotte ? BPM : BPM_GIORNO;
    if (bpm === this.bpm) return;
    const c = this.ctx;
    if (c && this.modo === "loop" && this.prossimo > 0) {
      const q = this.ancora.q + (this.prossimo - this.ancora.t) / (60 / this.bpm);
      this.ancora = { t: this.prossimo, q };
    }
    this.bpm = bpm;
    if (this.eco && c) this.eco.delayTime.setTargetAtTime((60 / bpm) * 0.75, c.currentTime, 0.2);
  }

  private programma() {
    const c = this.ctx;
    if (!c) return;
    while (this.prossimo < c.currentTime + 0.12) {
      this.colpo(this.passo % 16, Math.floor(this.passo / 16), this.prossimo);
      this.prossimo += 60 / this.bpm / 4;
      this.passo++;
    }
  }

  /**
   * Un sedicesimo del loop: techno industriale. Cassa saturata in quattro, metallo battuto sui levare,
   * rumore stretto al posto del charleston, basso a dente di sega che rotola.
   * Notte: in la minore, cupa e piena d'eco. Giorno: in re, più aperta.
   */
  private colpo(s: number, battuta: number, t: number) {
    const n = this.eNotte;
    const d = this.loopBus;
    // cassa in quattro, e un colpo fantasma prima del quattro
    if (s % 4 === 0) this.cassa(t, 1);
    if (s === 14 && battuta % 2 === 1) this.cassa(t, 0.45);
    // metallo: lamiera battuta sui levare, ogni tanto doppia
    if (s % 4 === 2 || (s === 7 && battuta % 2 === 0)) this.metallo(t, n ? 0.05 : 0.075, n ? 1.5 : 2); // rapporti intonati: mi sopra il la di notte, la all'ottava di giorno
    // di giorno lamiera anche in controtempo: una fabbrica che lavora piano
    if (!n && (s === 3 || s === 11 || (s === 13 && battuta % 2 === 1))) this.metallo(t, 0.05, 1.3348); // il re
    // charleston: chiuso sui levare, aperto sul levare del quarto (di giorno)
    if (s % 4 === 2) this.charleston(t, n ? 0.05 : 0.07, n ? 0.05 : 0.09);
    else if (s % 2 === 1) this.charleston(t, n ? 0.022 : 0.035, 0.03);
    // battito di mani, morbido, sul due e sul quattro
    if (s === 4 || s === 12) this.mani(t, n ? 0.12 : 0.16);
    if (n) {
      const b16 = battuta % 16;
      // nella seconda metà della strofa il charleston aperto sui levare spinge
      if (b16 >= 8 && s % 4 === 2) this.charleston(t, 0.045, 0.14);
      // l'ultima battuta: rullata di mani che cresce verso la strofa nuova
      if (b16 === 15 && s >= 8) this.mani(t, 0.04 + (s - 8) * 0.014);
      // all'attacco della strofa un piatto lungo
      if (b16 === 0 && s === 0 && battuta > 0) this.charleston(t, 0.07, 1.4);
    }
    // basso che rotola
    const radice = n ? 55 : 36.71;
    const giro = n ? [0, 0, 3, 0, 7, 0, 5, 3] : [0, 0, 0, 0, 1, 0, 0, 0];
    if (s % 4 !== 0) {
      const semi = giro[(battuta % 2) * 4 + Math.floor(s / 4)];
      this.basso(t, radice * Math.pow(2, semi / 12), n ? 0.22 : 0.24, n ? 380 : 300);
    }
    // di notte, al posto dell'arpeggio: la linea acida e gli stab sporchi
    if (n) {
      this.cancello(s, battuta, t);
      // la strofa è di sedici battute: l'acido entra a metà e la porta fino in fondo; gli stab chiudono la strofa
      if (battuta % 16 >= 8) this.acida(s, battuta, t);
      else if (this.acido) this.acido.g.gain.setTargetAtTime(0, t, 0.01);
      if (battuta % 16 === 15 && (s === 10 || s === 14)) this.stab(t, s === 14 ? 1 : 0.7);
    }
    // ogni quattro battute un accordo lungo che apre
    if (!n) this.andaluso(s, battuta, t);
    // passando al giorno l'acido tace: la sua voce resta accesa, il cancello si chiude
    if (!n && this.acido) this.acido.g.gain.setTargetAtTime(0, t, 0.01);
    if (!n && this.tappetoNotte) this.tappetoNotte.g.gain.setTargetAtTime(0, t, 0.01);
    if (!n && s === 0 && battuta % 4 === 0) {
      // di giorno una quinta vuota, bassa e sporca
      [73.42, 110].forEach((f) => this.nota(d, f, t, (60 / this.bpm) * 6, 0.03, "sawtooth", 420));
    }
  }

  /**
   * Il giorno, sopra la fabbrica: un'altra riva del Mediterraneo. Scala hijaz su re (frigia dominante).
   * Ogni otto battute: quattro di oud a due voci (la seconda una terza sotto, nella scala),
   * quattro di rasgueado flamenco sulla cadenza andalusa (sol minore, fa, mi bemolle, re).
   * Ogni sedici, sopra l'oud, una voce lunga che sale per melismi.
   */
  private andaluso(s: number, battuta: number, t: number) {
    const b8 = battuta % 8;
    const re = 146.83;
    const grado = (k: number) => re * Math.pow(2, (Math.floor(k / 7) * 12 + HIJAZ[((k % 7) + 7) % 7]) / 12);
    if (b8 < 4) {
      // l'oud: 3+3+2, come un tresillo
      const posti = [0, 3, 6, 8, 11, 14];
      const k = posti.indexOf(s);
      if (k >= 0) {
        const frase = FRASI[(Math.floor(battuta / 8) % FRASI.length)][b8];
        const g = frase[k];
        if (g !== null) {
          this.corda(t, grado(g), 0.055, 0.7);
          this.corda(t + 0.004, grado(g - 2), 0.03, 0.6);
        }
      }
    } else {
      // il rasgueado: colpo pieno sull'uno, accenti sul sei e sul dieci
      const acc = CADENZA[b8 - 4];
      if (s === 0 || s === 6 || s === 10) {
        const giu = s !== 6;
        const corde = giu ? acc : [...acc].reverse();
        corde.forEach((f, i) => this.corda(t + i * 0.013, f, s === 0 ? 0.03 : 0.02, s === 0 ? 0.9 : 0.4));
      }
    }
    // la voce, ogni sedici battute, sulle battute 8–11: una nota lunga per battuta
    if (battuta % 16 >= 8 && battuta % 16 < 12 && s === 0) {
      const g = [4, 5, 4, 1][battuta % 16 - 8];
      this.canto(t, grado(g + 7), (60 / this.bpm) * 3.7, 0.03);
    }
  }

  /** Una corda pizzicata: oud o chitarra. L'attacco cala appena di intonazione, il timbro si chiude in fretta. */
  private corda(t: number, f: number, forza: number, durata: number) {
    const c = this.ctx as AudioContext;
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f * 1.012, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
    const fl = c.createBiquadFilter();
    fl.type = "lowpass";
    fl.Q.value = 3;
    fl.frequency.setValueAtTime(3800, t);
    fl.frequency.exponentialRampToValueAtTime(650, t + durata * 0.5);
    const g = c.createGain();
    this.inviluppo(g, t, forza, 0.002, durata);
    o.connect(fl).connect(g);
    g.connect(this.loopBus);
    g.connect(this.eco);
    o.start(t);
    o.stop(t + durata + 0.05);
  }

  /** Una voce lunga, nasale come un ney: entra scivolando da sotto, poi vibrato. */
  private canto(t: number, f: number, durata: number, forza: number) {
    const c = this.ctx as AudioContext;
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(f * 0.94, t);
    o.frequency.exponentialRampToValueAtTime(f * 1.02, t + 0.18);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.32);
    // a metà nota un abbellimento: un semitono su e giù
    o.frequency.setValueAtTime(f, t + durata * 0.55);
    o.frequency.exponentialRampToValueAtTime(f * 1.059, t + durata * 0.6);
    o.frequency.exponentialRampToValueAtTime(f, t + durata * 0.68);
    const lfo = c.createOscillator();
    lfo.frequency.value = 5.3;
    const prof = c.createGain();
    prof.gain.setValueAtTime(0, t);
    prof.gain.linearRampToValueAtTime(f * 0.012, t + 0.6);
    lfo.connect(prof).connect(o.frequency);
    const fl = c.createBiquadFilter();
    fl.type = "bandpass";
    fl.frequency.value = 1150;
    fl.Q.value = 1.6;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(forza, t + 0.25);
    g.gain.setValueAtTime(forza, t + durata * 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
    o.connect(fl).connect(g);
    g.connect(this.loopBus);
    g.connect(this.eco);
    o.start(t);
    lfo.start(t);
    o.stop(t + durata + 0.05);
    lfo.stop(t + durata + 0.05);
  }

  /* -------------------------------------------------- la notte: acido e stab */

  /** Una distorsione dura, per l'acido e gli stab: più cattiva della saturazione del loop. */
  private distorsione(quanto: number) {
    const c = this.ctx as AudioContext;
    const w = c.createWaveShaper();
    const curva = new Float32Array(2048);
    for (let i = 0; i < 2048; i++) {
      const x = (i / 2047) * 2 - 1;
      curva[i] = ((1 + quanto) * x) / (1 + quanto * Math.abs(x));
    }
    w.curve = curva;
    w.oversample = "4x";
    return w;
  }

  private acido: { o: OscillatorNode; f: BiquadFilterNode; g: GainNode; secco: GainNode; sporco: GainNode } | null = null;

  /**
   * La voce acida: un solo oscillatore sempre acceso, come la 303, così le note possono scivolare l'una nell'altra.
   * Il segnale si divide: pulito e distorto, e la miscela si sposta verso lo sporco col passare delle strofe.
   */
  private voceAcida() {
    if (this.acido) return this.acido;
    const c = this.ctx as AudioContext;
    const o = c.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = 110;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.Q.value = 6;
    f.frequency.value = 300;
    const secco = c.createGain(), sporco = c.createGain();
    secco.gain.value = 1;
    sporco.gain.value = 0;
    const g = c.createGain();
    g.gain.value = 0;
    const dopo = c.createGain();
    dopo.gain.value = 0.42;
    o.connect(f);
    f.connect(secco).connect(g);
    f.connect(this.distorsione(9)).connect(sporco).connect(g);
    g.connect(dopo);
    dopo.connect(this.loopBus);
    dopo.connect(this.eco);
    o.start();
    this.acido = { o, f, g, secco, sporco };
    return this.acido;
  }

  private tappetoNotte: { o: OscillatorNode[]; f: BiquadFilterNode; g: GainNode } | null = null;

  /** Il tappeto della notte: un accordo di seghe scordate, sempre acceso dietro un cancello che si apre a sedicesimi. */
  private voceTappeto() {
    if (this.tappetoNotte) return this.tappetoNotte;
    const c = this.ctx as AudioContext;
    const f = c.createBiquadFilter();
    f.type = "lowpass";
    f.Q.value = 2;
    f.frequency.value = 900;
    const g = c.createGain();
    g.gain.value = 0;
    f.connect(g);
    g.connect(this.loopBus);
    g.connect(this.eco);
    const o: OscillatorNode[] = [];
    for (let i = 0; i < 5; i++) {
      for (const sc of [-9, 9]) {
        const x = c.createOscillator();
        x.type = "sawtooth";
        x.frequency.value = ACCORDI_NOTTE[0][i];
        x.detune.value = sc;
        x.connect(f);
        x.start();
        o.push(x);
      }
    }
    this.tappetoNotte = { o, f, g };
    return this.tappetoNotte;
  }

  /**
   * Il cancello: il tappeto si apre a sedicesimi secondo uno schema; l'accordo cambia ogni quattro battute
   * (la minore nona, la minore undicesima), il filtro respira sulla strofa.
   */
  private cancello(s: number, battuta: number, t: number) {
    const v = this.voceTappeto();
    const dur = 60 / this.bpm / 4;
    if (s === 0 && battuta % 4 === 0) {
      const acc = ACCORDI_NOTTE[Math.floor(battuta / 4) % ACCORDI_NOTTE.length];
      v.o.forEach((x, i) => x.frequency.setValueAtTime(acc[Math.floor(i / 2)], t));
    }
    const fase = (battuta % 16) / 16;
    v.f.frequency.setTargetAtTime(600 + 1400 * Math.sin(fase * Math.PI), t, 0.2);
    if (CANCELLO[(battuta % 2) * 16 + s]) {
      v.g.gain.setTargetAtTime(0.022, t, 0.004);
      v.g.gain.setTargetAtTime(0, t + dur * 0.55, 0.02);
    }
  }

  /**
   * La linea acida: sedici passi in la, frigia (il si bemolle accanto alla tonica), con accenti e legati.
   * Il filtro si apre e si chiude lento sulle battute, come una manopola girata a mano; sugli accenti strilla.
   */
  private acida(s: number, battuta: number, t: number) {
    const v = this.voceAcida();
    // quanto è sporco: zero alla prima comparsa, cresce battuta dopo battuta e strofa dopo strofa
    const strofa = Math.floor(battuta / 16);
    const sporco = Math.min(1, (strofa * 8 + (battuta % 16) - 8) / 24);
    if (s === 0) {
      v.secco.gain.setTargetAtTime(1 - sporco * 0.75, t, 0.05);
      v.sporco.gain.setTargetAtTime(sporco * 0.55, t, 0.05);
      v.f.Q.setTargetAtTime(6 + sporco * 12, t, 0.05);
    }
    // la prima strofa ha il giro melodico, quello che resta in testa; poi i giri più storti
    const giro = strofa === 0 ? ACIDO[0] : ACIDO[(strofa + Math.floor(battuta / 2)) % ACIDO.length];
    const passo = giro[s];
    const dur = 60 / this.bpm / 4;
    if (!passo) return;
    const [semi, accento, legato] = passo;
    const fr = 110 * Math.pow(2, semi / 12);
    if (legato) v.o.frequency.setTargetAtTime(fr, t, 0.035);
    else v.o.frequency.setValueAtTime(fr, t);
    const manopola = 0.5 - 0.5 * Math.cos((battuta % 16) / 16 * Math.PI * 2);
    const base = 220 + 1100 * manopola;
    v.f.frequency.cancelScheduledValues(t);
    v.f.frequency.setValueAtTime(base + (accento ? 1400 + 2200 * sporco : 700 + 800 * sporco) * (0.6 + manopola * 0.4), t);
    v.f.frequency.setTargetAtTime(base, t + 0.004, accento ? 0.09 : 0.06);
    v.g.gain.setTargetAtTime(accento ? 0.15 : 0.1, t, 0.003);
    const prossimo = giro[(s + 1) % 16];
    if (!(prossimo && prossimo[2])) v.g.gain.setTargetAtTime(0, t + dur * 0.62, 0.012);
  }

  /** Uno stab cattivo: la minore di seghe scordate, distorto, il filtro che si chiude di colpo. */
  private stab(t: number, forza: number) {
    const c = this.ctx as AudioContext;
    const fl = c.createBiquadFilter();
    fl.type = "bandpass";
    fl.Q.value = 1.4;
    fl.frequency.setValueAtTime(2800, t);
    fl.frequency.exponentialRampToValueAtTime(380, t + 0.35);
    const g = c.createGain();
    this.inviluppo(g, t, 0.035 * forza, 0.004, 0.42);
    fl.connect(this.distorsione(14)).connect(g);
    g.connect(this.loopBus);
    g.connect(this.eco);
    for (const f of [110, 164.81, 220, 261.63, 329.63]) {
      for (const sc of [-12, 12]) {
        const o = c.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f;
        o.detune.value = sc;
        o.connect(fl);
        o.start(t);
        o.stop(t + 0.45);
      }
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
    // la coda della cassa sulla tonica: la di notte, re di giorno
    o.frequency.setValueAtTime(this.eNotte ? 190 : 165, t);
    o.frequency.exponentialRampToValueAtTime(this.eNotte ? 55 : 36.71, t + 0.09);
    const g = c.createGain();
    this.inviluppo(g, t, forza, 0.003, 0.42);
    o.connect(g).connect(this.loopBus);
    o.start(t);
    o.stop(t + 0.45);
  }

  /** Metallo battuto: due onde quadre stonate fra loro, moltiplicate e filtrate stretto. */
  private metallo(t: number, forza: number, rapporto: number) {
    const c = this.ctx as AudioContext;
    const a = c.createOscillator();
    const b = c.createOscillator();
    a.type = b.type = "square";
    a.frequency.value = 440; // il la: la lamiera suona nella tonalità, di notte e di giorno (quinta del re)
    b.frequency.value = 440 * rapporto;
    const anello = c.createGain();
    anello.gain.value = 0;
    b.connect(anello.gain);
    a.connect(anello);
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 3200;
    f.Q.value = 3;
    const g = c.createGain();
    this.inviluppo(g, t, forza, 0.001, 0.16);
    anello.connect(f).connect(g);
    g.connect(this.loopBus);
    g.connect(this.riverbero);
    a.start(t);
    b.start(t);
    a.stop(t + 0.2);
    b.stop(t + 0.2);
  }

  private charleston(t: number, forza: number, durata: number) {
    const c = this.ctx as AudioContext;
    const s = c.createBufferSource();
    s.buffer = this.rumore;
    const f = c.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 9000;
    f.Q.value = 2.5;
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
    fl.Q.value = 9;
    fl.frequency.setValueAtTime(taglio * 3, t);
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

  /**
   * Un colpo di basso industriale: una sinusoide che cade di tono, saturata, con un clic di rumore in testa.
   * È il suono delle carte; f è la nota d'arrivo.
   */
  private colpoBasso(t: number, f: number, forza: number, durata = 0.32) {
    const c = this.ctx as AudioContext;
    const o = c.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(f * 2.4, t);
    o.frequency.exponentialRampToValueAtTime(f, t + 0.06);
    const sat = c.createWaveShaper();
    const k = new Float32Array(512);
    for (let i = 0; i < 512; i++) k[i] = Math.tanh(((i / 511) * 2 - 1) * 4);
    sat.curve = k;
    const fl = c.createBiquadFilter();
    fl.type = "lowpass";
    fl.frequency.value = 900;
    const g = c.createGain();
    this.inviluppo(g, t, forza, 0.002, durata);
    o.connect(sat).connect(fl).connect(g).connect(this.effetti);
    o.start(t);
    o.stop(t + durata + 0.05);
    const s = c.createBufferSource();
    s.buffer = this.rumore;
    const h = c.createBiquadFilter();
    h.type = "bandpass";
    h.frequency.value = 2500;
    const gc = c.createGain();
    this.inviluppo(gc, t, forza * 0.35, 0.001, 0.03);
    s.connect(h).connect(gc).connect(this.effetti);
    s.start(t, Math.random(), 0.05);
  }

  /** La nota della carta i-esima: colpi di basso sulla scala, che uno dopo l'altro fanno un arpeggio. */
  notaCarta(i: number) {
    if (!this.pronto()) return;
    const c = this.ctx as AudioContext;
    this.colpoBasso(c.currentTime + 0.01, SCALA[i % SCALA.length] / 4, 0.16);
  }

  /**
   * La voce di una nave mentre passa: ognuna la sua. Restituisce un regolatore (volume 0–1, che segue
   * quanto la nave è visibile) e uno stop. A suono spento non fa niente.
   *  nave: il canto delle sirene, due voci senza parole che salgono e scendono.
   *  feluca: i remi che battono a tempo e un coro basso di rematori.
   *  galeone: la festa a bordo, attutita dalla distanza: cassa a 130 BPM e il brusio della folla.
   */
  voce(tipo: "nave" | "feluca" | "galeone") {
    const nulla = { volume: (_v: number) => undefined, ferma: () => undefined };
    if (!this.pronto()) return nulla;
    const c = this.ctx as AudioContext;
    const t = c.currentTime;
    const uscita = c.createGain();
    uscita.gain.value = 0;
    uscita.connect(this.effetti);
    const fonti: AudioScheduledSourceNode[] = [];
    const parti = (n: AudioScheduledSourceNode) => {
      n.start(t);
      fonti.push(n);
      return n;
    };
    if (tipo === "nave") {
      [440, 523.25].forEach((f, i) => { // la e do: la minore, come il resto della notte
        const o = parti(c.createOscillator()) as OscillatorNode;
        o.type = "sine";
        o.frequency.value = f;
        const vib = parti(c.createOscillator()) as OscillatorNode;
        vib.frequency.value = 5 + i;
        const vg = c.createGain();
        vg.gain.value = 6;
        vib.connect(vg).connect(o.frequency);
        const melodia = parti(c.createOscillator()) as OscillatorNode;
        melodia.frequency.value = 0.11 + i * 0.04;
        const mg = c.createGain();
        mg.gain.value = 120;
        melodia.connect(mg).connect(o.frequency);
        const g = c.createGain();
        g.gain.value = 0.05;
        o.connect(g).connect(uscita);
      });
    } else if (tipo === "feluca") {
      const remi = parti(c.createBufferSource()) as AudioBufferSourceNode;
      remi.buffer = this.rumore;
      remi.loop = true;
      const bf = c.createBiquadFilter();
      bf.type = "bandpass";
      bf.frequency.value = 700;
      const battito = parti(c.createOscillator()) as OscillatorNode;
      battito.frequency.value = 0.9;
      const bg = c.createGain();
      bg.gain.value = 0;
      const ampiezza = c.createGain();
      ampiezza.gain.value = 0.09;
      battito.connect(ampiezza).connect(bg.gain);
      remi.connect(bf).connect(bg).connect(uscita);
      const coro = parti(c.createOscillator()) as OscillatorNode;
      coro.type = "sawtooth";
      coro.frequency.value = 98;
      const lf = c.createBiquadFilter();
      lf.type = "lowpass";
      lf.frequency.value = 420;
      const cg = c.createGain();
      cg.gain.value = 0.035;
      coro.connect(lf).connect(cg).connect(uscita);
    } else {
      const cassa = parti(c.createOscillator()) as OscillatorNode;
      cassa.frequency.value = 55;
      const colpi = parti(c.createOscillator()) as OscillatorNode;
      colpi.type = "sawtooth";
      colpi.frequency.value = BPM / 60;
      const forma = c.createWaveShaper();
      const k = new Float32Array(256);
      for (let i = 0; i < 256; i++) k[i] = Math.pow(1 - i / 255, 6) * 0.8;
      forma.curve = k;
      const cg = c.createGain();
      cg.gain.value = 0;
      colpi.connect(forma).connect(cg.gain);
      cassa.connect(cg).connect(uscita);
      const folla = parti(c.createBufferSource()) as AudioBufferSourceNode;
      folla.buffer = this.rumore;
      folla.loop = true;
      const ff = c.createBiquadFilter();
      ff.type = "bandpass";
      ff.frequency.value = 650;
      ff.Q.value = 0.8;
      const fg = c.createGain();
      fg.gain.value = 0.03;
      folla.connect(ff).connect(fg).connect(uscita);
    }
    return {
      volume: (v: number) => uscita.gain.setTargetAtTime(Math.max(0, Math.min(1, v)), c.currentTime, 0.2),
      ferma: () => {
        uscita.gain.setTargetAtTime(0, c.currentTime, 0.3);
        fonti.forEach((f) => f.stop(c.currentTime + 1.5));
      },
    };
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
        this.colpoBasso(t, 55, 0.07, 0.18);
        break;
      case "apri":
        this.colpoBasso(t, 41.2, 0.2, 0.6);
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
