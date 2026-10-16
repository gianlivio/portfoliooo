import * as THREE from "three";
import { PELO_ACQUA } from "../condivisi";
import { ANGOLO_ZONA } from "../zona";
import { alone, generatore, liberaTutto, tela } from "./comuni";

/**
 * L'orizzonte a sinistra dello sviluppatore, fino alla città: tutto in lontananza.
 * Di notte un porto industriale con le gru di banchina, i fari arancio sui piazzali, e più in qua
 * un faro su uno scoglio col fascio che gira. Di giorno colline siciliane d'erba secca,
 * pale eoliche sulla cresta e una fila di radiotelescopi sull'altopiano.
 */

const DA = ANGOLO_ZONA - 2.5; // verso la città
const A = ANGOLO_ZONA - 0.55; // verso lo sviluppatore
const SU = PELO_ACQUA - 0.3;

const suAnello = (a: number, d: number, y = 0) => new THREE.Vector3(Math.sin(a) * d, y, -Math.cos(a) * d);

/** Orienta un oggetto sull'anello: −z locale verso il centro, cioè verso chi guarda. */
function rivolgi(o: THREE.Object3D, a: number) {
  o.rotation.y = Math.PI - a;
}

export class Lontano {
  gruppo = new THREE.Group();
  private notte = new THREE.Group();
  private giorno = new THREE.Group();
  private texture: THREE.Texture[] = [];
  private fasci = new THREE.Group();
  private rosse: THREE.SpriteMaterial[] = [];
  private rotori: THREE.Object3D[] = [];
  private parabole: { az: THREE.Object3D; el: THREE.Object3D; fase: number }[] = [];

  constructor(eNotte: boolean) {
    const r = generatore(77);
    this.porto(r);
    this.faro();
    this.colline(r);
    this.gruppo.add(this.notte, this.giorno);
    this.gruppo.traverse((o) => {
      o.raycast = () => undefined;
      o.frustumCulled = false;
      o.renderOrder = -0.8;
    });
    this.setNotte(eNotte);
  }

  /* ------------------------------------------------------------------ notte */

  private porto(r: () => number) {
    const ferro = new THREE.MeshBasicMaterial({ color: "#2B313C", fog: false });
    const D = 40;
    const txR = alone("#FF3A2A"), txG = alone("#FFB45A"), txB = alone("#FFFFFF");
    this.texture.push(txR, txG, txB);
    const lucine: number[] = [];
    // le gru di banchina: due portali a A, la trave, il braccio sul mare; due col braccio alzato
    const posti = [-2.38, -2.24, -2.1, -1.95, -1.8];
    posti.forEach((da, i) => {
      const a = ANGOLO_ZONA + da;
      const g = new THREE.Group();
      g.position.copy(suAnello(a, D + r() * 2, SU));
      rivolgi(g, a);
      g.rotation.y += 0.55 + (r() - 0.5) * 0.2; // di sbieco: il braccio si legge di profilo
      g.scale.setScalar(0.8); // lontane: i tralicci vicini restano più grandi
      const H = 8.5;
      for (const x of [-1.1, 1.1]) for (const z of [-1.2, 1.2]) {
        const gamba = new THREE.Mesh(new THREE.BoxGeometry(0.16, H, 0.16).translate(0, H / 2, 0), ferro);
        gamba.position.set(x, 0, z);
        g.add(gamba);
      }
      const trave = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.5, 2.6).translate(0, H, 0), ferro);
      g.add(trave);
      const cabina = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.4, 1.2).translate(0, H + 1.1, 0.6), ferro);
      g.add(cabina);
      const alzato = i === 1 || i === 3;
      const braccio = new THREE.Group();
      braccio.position.set(0, H + 0.3, 0);
      braccio.rotation.x = alzato ? -1.25 : 0;
      braccio.add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.45, 12).translate(0, 0, -4.5), ferro));
      g.add(braccio);
      // tiranti verso l'alto
      const pilone = new THREE.Mesh(new THREE.BoxGeometry(0.2, 3, 0.2).translate(0, H + 1.5, 0), ferro);
      g.add(pilone);
      // luce rossa in cima e lucine bianche lungo il braccio
      const cima = new THREE.Sprite(new THREE.SpriteMaterial({ map: txR, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      cima.position.set(0, H + 3.1, 0);
      cima.scale.setScalar(1.1);
      this.rosse.push(cima.material);
      g.add(cima);
      g.updateMatrixWorld(true);
      const v = new THREE.Vector3();
      for (let k = 0; k < 9; k++) {
        v.set(0, 0.35, 1 - k * 1.25);
        braccio.localToWorld(v);
        lucine.push(v.x, v.y, v.z);
      }
      this.notte.add(g);
    });
    const pts = new THREE.BufferGeometry();
    pts.setAttribute("position", new THREE.Float32BufferAttribute(lucine, 3));
    this.notte.add(new THREE.Points(pts, new THREE.PointsMaterial({ map: txB, color: "#FFF4DA", size: 0.5, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false })));
    // i fari dei piazzali: pali alti, una corona arancio
    for (let k = 0; k < 7; k++) {
      const a = ANGOLO_ZONA - 2.42 + k * 0.1 + r() * 0.03;
      const p = suAnello(a, D - 1.5 + r() * 2, SU);
      const palo = new THREE.Mesh(new THREE.BoxGeometry(0.12, 6, 0.12).translate(0, 3, 0), ferro);
      palo.position.copy(p);
      this.notte.add(palo);
      const l = new THREE.Sprite(new THREE.SpriteMaterial({ map: txG, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      l.position.copy(p).setY(SU + 6.1);
      l.scale.setScalar(1.5);
      this.notte.add(l);
    }
    // il bagliore arancio sopra il porto
    const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: txG, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    b.position.copy(suAnello(ANGOLO_ZONA - 2.1, D + 2, 2.5));
    b.scale.set(26, 9, 1);
    this.notte.add(b);
  }

  private faro() {
    const a = ANGOLO_ZONA - 1.05;
    const g = new THREE.Group();
    g.position.copy(suAnello(a, 38, SU));
    rivolgi(g, a);
    // lo scoglio
    const scoglio = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 1).scale(3.2, 3.6, 2.4), new THREE.MeshBasicMaterial({ color: "#14161B", fog: false }));
    scoglio.position.y = 0.2;
    g.add(scoglio);
    // la torre a fasce bianche e rosse, appena rischiarata dalla lanterna
    const fasce = tela(16, 128, (x) => {
      for (let i = 0; i < 4; i++) {
        x.fillStyle = i % 2 ? "#5A1C1C" : "#8C8C90";
        x.fillRect(0, i * 32, 16, 32);
      }
    });
    this.texture.push(fasce);
    const torre = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.62, 4.2, 16).translate(0, 5.6, 0), new THREE.MeshBasicMaterial({ map: fasce, fog: false }));
    g.add(torre);
    const lanterna = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.5, 12).translate(0, 7.95, 0), new THREE.MeshBasicMaterial({ color: "#FFF1C2", fog: false, toneMapped: false }));
    g.add(lanterna);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.5, 12).translate(0, 8.45, 0), new THREE.MeshBasicMaterial({ color: "#20242B", fog: false }));
    g.add(cap);
    const txL = alone("#FFF0C0");
    this.texture.push(txL);
    const alo = new THREE.Sprite(new THREE.SpriteMaterial({ map: txL, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
    alo.position.set(0, 7.95, 0);
    alo.scale.setScalar(3.2);
    g.add(alo);
    // il fascio: due coni di luce opposti che girano, più chiari vicino alla lanterna
    const sfuma = tela(4, 128, (x) => {
      const v = x.createLinearGradient(0, 0, 0, 128);
      v.addColorStop(0, "rgba(255,255,255,1)");
      v.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = v;
      x.fillRect(0, 0, 4, 128);
    });
    this.texture.push(sfuma);
    const L = 26;
    const cono = new THREE.ConeGeometry(2.4, L, 20, 1, true).translate(0, -L / 2, 0).rotateX(Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({ map: sfuma, color: "#FFF2C8", transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.fasci.position.set(0, 7.95, 0);
    this.fasci.add(new THREE.Mesh(cono, mat));
    const altro = new THREE.Mesh(cono, mat);
    altro.rotation.y = Math.PI;
    this.fasci.add(altro);
    g.add(this.fasci);
    this.notte.add(g);
  }

  /* ------------------------------------------------------------------ giorno */

  private colline(r: () => number) {
    // due crinali: quello dietro più alto e più velato, quello davanti con l'altopiano dei radiotelescopi
    const cielo = new THREE.Color("#BFD6EA");
    const crinale = (d: number, alto: number, velo: number, piano: [number, number] | null, seme: number) => {
      const N = 140, M = 8;
      const pos: number[] = [], col: number[] = [], idx: number[] = [];
      const toni = ["#C8A85E", "#B99A58", "#D2B670", "#9C9456", "#A88E55"].map((c) => new THREE.Color(c));
      const quota = (u: number) => {
        let h = 0.55 + 0.25 * Math.sin(u * 9 + seme) + 0.15 * Math.sin(u * 23 + seme * 2) + 0.06 * Math.sin(u * 61);
        if (piano && u > piano[0] && u < piano[1]) h = 0.78; // l'altopiano
        const bordo = Math.min(1, u / 0.08, (1 - u) / 0.08);
        return Math.max(0, h) * alto * bordo;
      };
      for (let i = 0; i <= N; i++) {
        const u = i / N;
        const a = DA + (A - DA) * u;
        const h = quota(u);
        for (let j = 0; j <= M; j++) {
          const v = j / M; // 0 davanti, 1 dietro
          const k = Math.sin(v * Math.PI); // la cresta a metà
          const p = suAnello(a, d - 3 + v * 6, SU - 1 + (h + 1) * Math.pow(k, 0.7));
          pos.push(p.x, p.y, p.z);
          const c = toni[Math.floor(r() * toni.length)].clone().lerp(cielo, velo);
          col.push(c.r, c.g, c.b);
        }
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < M; j++) {
        const q = i * (M + 1) + j;
        idx.push(q, q + M + 1, q + 1, q + 1, q + M + 1, q + M + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeVertexNormals();
      this.giorno.add(new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide, fog: false })));
      return (u: number) => SU - 1 + quota(u) + 1;
    };
    const dietro = crinale(41, 9.5, 0.35, null, 1.3);
    const davanti = crinale(36.5, 6.5, 0.12, [0.52, 0.72], 4.1);

    // le pale eoliche sulla cresta di dietro
    const bianco = new THREE.MeshLambertMaterial({ color: "#F4F5F7", fog: false });
    for (let k = 0; k < 11; k++) {
      const u = 0.12 + k * 0.075 + (r() - 0.5) * 0.02;
      const a = DA + (A - DA) * u;
      const t = new THREE.Group();
      t.position.copy(suAnello(a, 41, dietro(u) - 0.2));
      rivolgi(t, a);
      t.add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 3.6, 8).translate(0, 1.8, 0), bianco));
      t.add(new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.55).translate(0, 3.65, 0.08), bianco));
      const rotore = new THREE.Group();
      rotore.position.set(0, 3.65, -0.22);
      for (let p = 0; p < 3; p++) {
        const pala = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.7, 0.03).translate(0, 0.85, 0), bianco);
        pala.rotation.z = (p / 3) * Math.PI * 2;
        rotore.add(pala);
      }
      rotore.userData.v = 0.9 + r() * 0.5;
      rotore.rotation.z = r() * 6;
      this.rotori.push(rotore);
      t.add(rotore);
      t.rotation.y += (r() - 0.5) * 0.3;
      this.giorno.add(t);
    }

    // i radiotelescopi sull'altopiano di quello davanti
    const piatto = new THREE.LatheGeometry(
      Array.from({ length: 9 }, (_, i) => new THREE.Vector2((i / 8) * 1.15, ((i / 8) * 1.15) ** 2 * 0.3)),
      28
    );
    const grigio = new THREE.MeshLambertMaterial({ color: "#C9CCD2", fog: false });
    const piattoM = new THREE.MeshLambertMaterial({ color: "#F7F7F5", side: THREE.DoubleSide, fog: false });
    for (let k = 0; k < 4; k++) {
      const u = 0.55 + k * 0.045;
      const a = DA + (A - DA) * u;
      const base = new THREE.Group();
      base.position.copy(suAnello(a, 36.5, davanti(u) - 0.1));
      rivolgi(base, a);
      base.add(new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1.1, 10).translate(0, 0.55, 0), grigio));
      const az = new THREE.Group();
      az.position.y = 1.15;
      const forcella = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, 0.2), grigio);
      az.add(forcella);
      const el = new THREE.Group();
      el.position.y = 0.35;
      const disco = new THREE.Mesh(piatto, piattoM);
      disco.rotation.x = -Math.PI / 2; // la concavità guarda verso chi guarda (−z), poi l'elevazione la alza
      el.add(disco);
      const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.75, 6).rotateX(Math.PI / 2).translate(0, 0, -0.55), grigio);
      el.add(asta);
      az.add(el);
      base.add(az);
      this.parabole.push({ az, el, fase: k * 0.9 });
      this.giorno.add(base);
    }
  }

  setNotte(notte: boolean) {
    this.notte.visible = notte;
    this.giorno.visible = !notte;
  }

  aggiorna(t: number) {
    if (this.notte.visible) {
      this.fasci.rotation.y = t * 0.55;
      const lampo = Math.sin(t * 2.2) > 0.55 ? 1 : 0.12;
      this.rosse.forEach((m) => (m.opacity = lampo));
      return;
    }
    this.rotori.forEach((ro) => (ro.rotation.z = t * ro.userData.v));
    // le parabole si muovono insieme, lente, come se seguissero la stessa sorgente
    this.parabole.forEach(({ az, el, fase }) => {
      az.rotation.y = Math.sin(t * 0.05 + fase * 0.1) * 0.9;
      el.rotation.x = 0.7 + 0.3 * Math.sin(t * 0.07 + fase * 0.1);
    });
  }

  libera() {
    liberaTutto(this.gruppo, this.texture);
  }
}
