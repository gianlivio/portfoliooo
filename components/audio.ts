"use client";

import { BPM } from "./condivisi";

/**
 * Il suono del sito: il fondo e gli effetti sintetizzati con la Web Audio API, la musica da file.
 * Sempre spento di default; si accende solo dopo un gesto di chi visita (il pulsante in alto
 * o la drum machine sulla scrivania). La scelta resta in localStorage, chiave "audio":
 *   "spento" · "ambiente" (solo il fondo) · "loop" (fondo più la musica della drum machine).
 * Il fondo cambia fra giorno (arioso, luminoso) e notte (profondo, col respiro del mare),
 * con una dissolvenza al cambio di tema. La musica sono brani registrati, due per il giorno
 * (bossa nova, flamenco) e due per la notte (flamenco), che si susseguono; al cambio di tema si passa
 * dall'una all'altra coppia in dissolvenza.
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
/**
 * I brani della drum machine, in public/audio/ (da Pixabay, licenza d'uso libera). bpm serve solo
 * a far battere le luci della drum machine, all'incirca; guadagno pareggia il volume dei brani.
 */
const BRANI: Record<"giorno" | "notte", { src: string; bpm: number; guadagno: number }[]> = {
  giorno: [
    { src: "/audio/bossa-nova.m4a", bpm: 76, guadagno: 1.05 },
    { src: "/audio/flamenco-cortile.m4a", bpm: 99, guadagno: 0.65 },
  ],
  notte: [
    { src: "/audio/flamenco-buleria.m4a", bpm: 89, guadagno: 0.66 },
    { src: "/audio/flamenco-legna.m4a", bpm: 72, guadagno: 0.62 },
  ],
};
/** Il volume della musica rispetto al fondo. */
const MUSICA = 2.4;
const VOLUME = 0.16; // volume generale, basso
/** Le campanelle del giorno: note della scala hijaz su re. */
const CAMPANE_GIORNO = [440, 466.16, 587.33, 622.25, 739.99, 783.99, 880];
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
  /** un lettore per tema: l'elemento audio, il suo volume, quale brano sta suonando */
  private lettori: Record<"giorno" | "notte", { a: HTMLAudioElement; g: GainNode; i: number } | null> = { giorno: null, notte: null };
  private campanelle: ReturnType<typeof setTimeout> | null = null;
  private eNotte = true;
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
    // il contesto si ferma subito: i brani si fermano a mano, la dissolvenza non arriverebbe
    Object.values(this.lettori).forEach((l) => {
      if (!l) return;
      l.a.pause();
      l.g.gain.value = 0;
    });
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
    const cambia = notte !== this.eNotte;
    this.eNotte = notte;
    if (cambia && this.modo === "loop") this.musica();
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
    if (!this.ctx || this.modo !== "loop") return null;
    const l = this.lettori[this.eNotte ? "notte" : "giorno"];
    if (!l || l.a.paused) return null;
    const q = l.a.currentTime / (60 / BRANI[this.eNotte ? "notte" : "giorno"][l.i].bpm);
    return { fase: q - Math.floor(q), n: Math.floor(q) };
  }

  /* ---------------------------------------------------------------- la musica */

  /** Il lettore di un tema: un elemento audio collegato al grafo, che a fine brano passa al successivo. */
  private lettore(tema: "giorno" | "notte") {
    const c = this.ctx as AudioContext;
    let l = this.lettori[tema];
    if (l) return l;
    const a = new Audio();
    a.preload = "none";
    const g = c.createGain();
    g.gain.value = 0;
    c.createMediaElementSource(a).connect(g).connect(this.loopBus);
    l = { a, g, i: 0 };
    const nuovo = l;
    a.src = BRANI[tema][0].src;
    a.addEventListener("ended", () => {
      nuovo.i = (nuovo.i + 1) % BRANI[tema].length;
      a.src = BRANI[tema][nuovo.i].src;
      g.gain.setTargetAtTime(BRANI[tema][nuovo.i].guadagno * MUSICA, c.currentTime, 0.05);
      a.play().catch(() => undefined);
    });
    this.lettori[tema] = l;
    return l;
  }

  /** Accende la musica del tema in corso e spegne in dissolvenza quella dell'altro. */
  private musica() {
    const c = this.ctx;
    if (!c) return;
    const qui = this.eNotte ? "notte" : "giorno";
    const altro = this.eNotte ? "giorno" : "notte";
    const l = this.lettore(qui);
    l.g.gain.cancelScheduledValues(c.currentTime);
    l.g.gain.setTargetAtTime(BRANI[qui][l.i].guadagno * MUSICA, c.currentTime, 0.6);
    l.a.play().catch(() => undefined);
    this.zittisci(altro);
  }

  private zittisci(tema: "giorno" | "notte") {
    const c = this.ctx;
    const l = this.lettori[tema];
    if (!c || !l) return;
    l.g.gain.cancelScheduledValues(c.currentTime);
    l.g.gain.setTargetAtTime(0, c.currentTime, 0.5);
    const a = l.a;
    setTimeout(() => {
      if (l.g.gain.value < 0.02) a.pause();
    }, 2500);
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
    // la musica va dritta al volume generale: brani registrati, niente saturazione né riverbero
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
    if (m === "loop") this.musica();
    else {
      this.zittisci("giorno");
      this.zittisci("notte");
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

  private inviluppo(g: GainNode, t: number, picco: number, attacco: number, durata: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(picco, t + attacco);
    g.gain.exponentialRampToValueAtTime(0.0001, t + durata);
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
