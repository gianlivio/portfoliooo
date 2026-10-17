import * as THREE from "three";
import { lavori } from "@/content/lavori";
import { type Ospite, assi, cancella, casuale, finito, liberaTutto, primo, tela, tocca } from "./comuni";

/*
 * Di giorno, ogni tanto, un black metaller si affaccia da dietro una carta: trucco da cadavere, capelli neri
 * lunghissimi, cuoio, bracciali chiodati, cartucciera. Sbuca di lato, o da sopra aggrappato al bordo;
 * fa le corna, scuote la testa urlando, e torna giù. Un personaggio inventato, del genere, non una persona vera.
 */

const RAGGIO = 6; // l'anello delle carte (Scena.tsx)
const LARGO = 2.4;
const ALTO = 1.65;
const QUOTE = [0.3, -0.22, 0.42, -0.34, 0.12, -0.1];
const POSTI = lavori.length + 1;
const PAVIMENTO = -1.22; // PELO_ACQUA

/**
 * La faccia dipinta, cattiva: bianco gesso, le orbite nere che esplodono in lunghe punte su fronte e guance,
 * le sopracciglia aggrottate a V, il naso nero, le labbra nere cucite da righe verticali fino al mento,
 * le colature nere sotto gli occhi. Gli occhi piccoli, chiari, fissi.
 */
function faccia(urla: boolean) {
  // la texture fa il giro intero della testa: il viso sta nel terzo centrale, schiacciato in larghezza
  return tela(384, 256, (x) => {
    x.fillStyle = "#F2F1EE";
    x.fillRect(0, 0, 384, 256);
    // un'ombra grigia sotto gli zigomi: il viso scavato
    x.fillStyle = "rgba(120,118,125,0.35)";
    x.fillRect(0, 150, 384, 40);
    x.translate(128, 0);
    x.scale(0.5, 1);
    const nero = "#050506";
    x.fillStyle = nero;
    const punta = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
      x.beginPath();
      x.moveTo(ax, ay);
      x.lineTo(bx, by);
      x.lineTo(cx, cy);
      x.closePath();
      x.fill();
    };
    for (const s of [-1, 1]) {
      const cx = 128 + s * 44;
      // l'orbita
      x.beginPath();
      x.ellipse(cx, 112, 30, 24, 0, 0, Math.PI * 2);
      x.fill();
      // le punte: tre in su fino all'attaccatura, due in giù sulle guance, una verso la tempia
      punta(cx - 18, 96, cx - 8, 98, cx - 22, 6);
      punta(cx - 4, 92, cx + 8, 94, cx + 4, 0);
      punta(cx + 12, 96, cx + 24, 102, cx + 34, 18);
      punta(cx - 14, 128, cx - 2, 132, cx - 16, 214);
      punta(cx + 6, 132, cx + 18, 126, cx + 22, 200);
      punta(cx + s * 24, 104, cx + s * 26, 120, cx + s * 70, 100);
      // le colature
      x.fillRect(cx - 3, 132, 3, 50 + (s > 0 ? 14 : 0));
    }
    // le sopracciglia a V, aggrottate
    x.lineWidth = 9;
    x.strokeStyle = nero;
    x.beginPath();
    x.moveTo(70, 70);
    x.lineTo(124, 92);
    x.lineTo(132, 92);
    x.lineTo(186, 70);
    x.stroke();
    // gli occhi: piccoli, chiari, con la pupilla a punta di spillo
    for (const s of [-1, 1]) {
      x.fillStyle = "#DCE3E6";
      x.beginPath();
      x.ellipse(128 + s * 42, 114, 8, 5, 0, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = nero;
      x.beginPath();
      x.arc(128 + s * 42, 114, 2, 0, Math.PI * 2);
      x.fill();
    }
    // il naso annerito
    x.fillStyle = nero;
    x.beginPath();
    x.moveTo(116, 156);
    x.lineTo(140, 156);
    x.lineTo(128, 128);
    x.fill();
    if (urla) {
      // la bocca spalancata, nera, coi denti
      x.beginPath();
      x.ellipse(128, 200, 30, 36, 0, 0, Math.PI * 2);
      x.fill();
      x.fillStyle = "#D8D2C4";
      for (const dx of [-14, -5, 4, 13]) x.fillRect(124 + dx, 168, 5, 8);
      x.fillStyle = "#4A0C0C";
      x.beginPath();
      x.ellipse(128, 210, 16, 18, 0, 0, Math.PI * 2);
      x.fill();
    } else {
      // le labbra nere e le cuciture fino al mento
      x.fillRect(96, 186, 64, 12);
      for (let k = 0; k < 7; k++) x.fillRect(98 + k * 10, 172, 3, 50);
    }
  });
}

export class Metallaro implements Ospite {
  gruppo = new THREE.Group();
  private corpo = new THREE.Group();
  private testa = new THREE.Group();
  private capelli: THREE.Mesh[] = [];
  private braccio = new THREE.Group();
  private altro = new THREE.Group();
  private viso: THREE.MeshStandardMaterial;
  private visi: THREE.Texture[];
  private s = { prossima: primo(10, 2), inizio: -1, durata: 5.2, modo: "lato" as "lato" | "sopra", verso: 1, carta: 0 };

  constructor() {
    const cuoio = new THREE.MeshStandardMaterial({ color: "#141316", roughness: 0.42, metalness: 0.15 });
    const pelle = new THREE.MeshStandardMaterial({ color: "#E6E2DC", roughness: 0.7 });
    const acciaio = new THREE.MeshStandardMaterial({ color: "#C9CDD3", roughness: 0.25, metalness: 0.85 });
    const ottone = new THREE.MeshStandardMaterial({ color: "#B8913E", roughness: 0.35, metalness: 0.8 });
    const nero = new THREE.MeshStandardMaterial({ color: "#060607", roughness: 0.6 });
    this.visi = [faccia(false), faccia(true)];
    this.viso = new THREE.MeshStandardMaterial({ map: this.visi[0], roughness: 0.75 });

    // le gambe: pantaloni neri, anfibi
    // le gambe restano dritte: si piega solo il busto, dai fianchi
    const gambe = new THREE.Group();
    gambe.position.y = 0.74;
    for (const sx of [-0.1, 0.1]) {
      gambe.add(new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.04, 0.78, 8).translate(sx * 0.7, -0.39 + 0.1, 0), nero));
      gambe.add(new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.2).translate(sx * 0.7, -0.68, -0.04), cuoio));
    }
    this.gruppo.add(gambe);
    // il busto: giubbotto di cuoio, la cartucciera a tracolla
    const busto = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.11, 0.56, 10).scale(1, 1, 0.62).translate(0, 0.28, 0), cuoio);
    this.corpo.add(busto);
    const tracolla = new THREE.Group();
    tracolla.rotation.z = 0.7;
    tracolla.position.set(0, 0.3, -0.095);
    for (let i = 0; i < 9; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.06, 6), ottone);
      p.position.set(-0.2 + i * 0.05, 0, 0);
      tracolla.add(p);
    }
    this.corpo.add(tracolla);
    // le spalle chiodate
    for (const s of [-1, 1]) {
      const spalla = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), cuoio);
      spalla.position.set(s * 0.17, 0.53, 0);
      this.corpo.add(spalla);
      for (let k = 0; k < 3; k++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.07, 6), acciaio);
        c.position.set(s * (0.14 + k * 0.03), 0.58 + (k === 1 ? 0.03 : 0), 0);
        this.corpo.add(c);
      }
    }
    // la testa: il viso dipinto, i capelli neri lunghissimi che scendono davanti e dietro le spalle
    this.testa.position.set(0, 0.7, 0);
    const cranio = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16).scale(0.86, 1.14, 0.92), this.viso);
    cranio.rotation.y = Math.PI / 2; // il centro della texture (la faccia) verso −z, verso chi guarda
    this.testa.add(cranio);
    const calotta = new THREE.Mesh(new THREE.SphereGeometry(0.136, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(0.9, 1.15, 0.97), nero);
    calotta.rotation.x = 0.7; // tirata indietro: la fronte dipinta resta scoperta
    this.testa.add(calotta);
    for (let i = 0; i < 18; i++) {
      const a = -1.35 + (i / 17) * 2.7;
      const ciocca = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.7, 0.03).translate(0, -0.35, 0), nero);
      ciocca.position.set(Math.sin(a) * 0.125, 0.08, Math.cos(a) * 0.11);
      ciocca.rotation.y = a;
      this.testa.add(ciocca);
      this.capelli.push(ciocca);
    }
    this.corpo.add(this.testa);
    // le braccia: avambracci col bracciale chiodato, il pugno; il destro fa le corna
    const braccio = (g: THREE.Group, corna: boolean) => {
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.033, 0.038, 0.32, 8).translate(0, 0.16, 0), cuoio));
      const avambraccio = new THREE.Group();
      avambraccio.position.y = 0.32;
      avambraccio.add(new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.18, 10).translate(0, 0.13, 0), cuoio));
      for (let k = 0; k < 8; k++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 5), acciaio);
        const an = (k / 8) * Math.PI * 2;
        c.position.set(Math.cos(an) * 0.05, 0.1 + (k % 2) * 0.06, Math.sin(an) * 0.05);
        c.rotation.set(Math.sin(an) * Math.PI / 2, 0, -Math.cos(an) * Math.PI / 2);
        avambraccio.add(c);
      }
      const pugno = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8).scale(1, 1.1, 0.9).translate(0, 0.27, 0), pelle);
      avambraccio.add(pugno);
      if (corna) {
        for (const dx of [-0.03, 0.03]) {
          const dito = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.1, 6).translate(0, 0.05, 0), pelle);
          dito.position.set(dx, 0.31, 0);
          dito.rotation.z = -dx * 4;
          avambraccio.add(dito);
        }
      }
      g.add(avambraccio);
    };
    braccio(this.braccio, true);
    braccio(this.altro, false);
    this.braccio.position.set(0.18, 0.5, 0);
    this.altro.position.set(-0.18, 0.5, 0);
    this.corpo.add(this.braccio, this.altro);
    // l'origine ai piedi
    this.corpo.position.y = 0.74;
    this.gruppo.add(this.corpo);
    this.gruppo.visible = false;
    this.gruppo.traverse((o) => (o.raycast = () => undefined));
  }

  aggiorna(t: number, _dt: number, camera: THREE.Camera) {
    const s = this.s;
    if (s.inizio < 0) {
      if (t < s.prossima || !tocca("giornoCarte", "metallaro", t)) return;
      // una carta fra le tre più vicine allo sguardo
      const { avanti } = assi(camera);
      const yaw = Math.atan2(avanti.x, -avanti.z);
      const vicine = lavori
        .map((_, i) => {
          const a = (i / POSTI) * Math.PI * 2;
          const d = Math.abs(Math.atan2(Math.sin(a - yaw), Math.cos(a - yaw)));
          return { i, d };
        })
        .sort((x, y) => x.d - y.d)
        .slice(0, 3);
      s.carta = vicine[Math.floor(Math.random() * vicine.length)].i;
      s.modo = "lato";
      s.verso = Math.random() < 0.5 ? -1 : 1;
      s.durata = casuale(4.6, 6);
      s.inizio = t;
      this.gruppo.visible = true;
    }
    const e = t - s.inizio;
    if (e > s.durata) {
      s.inizio = -1;
      s.prossima = t + casuale(16, 30);
      this.gruppo.visible = false;
      finito("giornoCarte", "metallaro", t);
      return;
    }
    // esce, resta, rientra
    const fuori = Math.min(1, e / 0.7, (s.durata - e) / 0.6);
    const k = fuori * fuori * (3 - 2 * fuori);
    const a = (s.carta / POSTI) * Math.PI * 2;
    const dir = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
    const lato = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const y0 = QUOTE[s.carta % QUOTE.length];
    const g = this.gruppo;
    g.rotation.set(0, Math.PI - a, 0);
    const dietro = dir.clone().multiplyScalar(RAGGIO + 0.28);
    const scuoti = e > 1 && e < s.durata - 0.8;
    if (s.modo === "lato") {
      // di lato: nascosto dietro il bordo, si sporge piegandosi
      // in piedi sul pavimento dietro la carta, alto quanto basta perché la testa arrivi verso il bordo di sopra
      const scala = Math.min(1.0, Math.max(0.78, (y0 + 0.1 - PAVIMENTO) / 1.75));
      g.scale.setScalar(scala);
      const off = LARGO / 2 - 0.25 + k * 0.38;
      g.position.copy(dietro).addScaledVector(lato, off * s.verso).setY(PAVIMENTO);
      // specchiato secondo il lato, così il braccio delle corna è sempre quello che sporge
      this.corpo.scale.x = s.verso > 0 ? -1 : 1;
      this.corpo.rotation.set(0, 0, s.verso * k * 0.38);
      this.braccio.rotation.set(0, 0, scuoti ? -0.35 - 0.15 * Math.sin(e * 9) : -0.6);
      this.altro.rotation.set(0, 0, 0.35);
    } else {
      // da sopra: sale da dietro il bordo, le mani aggrappate sopra la carta
      g.position.copy(dietro).addScaledVector(lato, 0.35 * s.verso).setY(y0 + ALTO / 2 - 0.95 + k * 0.42);
      this.corpo.scale.x = 1;
      this.corpo.rotation.set(0, 0, 0);
      this.altro.rotation.set(-0.9 * k, 0, 0.5);
      this.braccio.rotation.set(scuoti ? -0.2 : -0.9 * k, 0, scuoti ? -0.25 - 0.12 * Math.sin(e * 9) : -0.5);
    }
    // l'headbanging: la testa batte veloce, i capelli frustano; la bocca si apre
    const colpo = scuoti ? Math.max(0, Math.sin(e * 11)) : 0;
    this.testa.rotation.set(colpo * 0.55 - 0.1, 0, scuoti ? Math.sin(e * 5.5) * 0.12 : 0);
    this.capelli.forEach((c, i) => (c.rotation.x = -colpo * 0.9 + Math.sin(e * 6 + i) * 0.06));
    const urla = scuoti && Math.sin(e * 1.7) > -0.3;
    const map = this.visi[urla ? 1 : 0];
    if (this.viso.map !== map) {
      this.viso.map = map;
      this.viso.needsUpdate = true;
    }
  }

  libera() {
    cancella("giornoCarte", "metallaro");
    liberaTutto(this.gruppo, this.visi);
  }
}
