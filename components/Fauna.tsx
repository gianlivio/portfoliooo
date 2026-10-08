"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PELO_ACQUA, gocce, MAX_GOCCE } from "./condivisi";

/**
 * Ciò che ogni tanto passa per la stanza, davanti a dove si sta guardando.
 * Notte: stelle cadenti; gocce che cadono sull'acqua e la increspano in cerchi.
 * Giorno: una palla di fieno che rotola sul marmo; di rado un'aquila che perlustra,
 * gira in tondo e si getta in picchiata.
 * Con "riduci movimento" non passa niente. Con ?ospiti nell'indirizzo passano subito e spesso.
 */

const casuale = (a: number, b: number) => a + Math.random() * (b - a);

function prova() {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has("ospiti");
}
/** Attesa prima del prossimo passaggio: normale, oppure breve in modalità prova. */
const attesa = (a: number, b: number) => (prova() ? casuale(5, 9) : casuale(a, b));

/** Direzione orizzontale verso cui guarda la camera, come angolo (0 = −z). */
function yawCamera(camera: THREE.Camera) {
  const d = camera.getWorldDirection(new THREE.Vector3());
  return Math.atan2(d.x, -d.z);
}
/** Versori "avanti" e "di lato" sul piano xz, rispetto a dove guarda la camera. */
function assi(camera: THREE.Camera) {
  const y = yawCamera(camera);
  const avanti = new THREE.Vector3(Math.sin(y), 0, -Math.cos(y));
  const lato = new THREE.Vector3(Math.cos(y), 0, Math.sin(y));
  return { avanti, lato };
}

function sferetta(colore = "#FFFFFF") {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  if (x) {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, colore);
    g.addColorStop(0.35, colore + "99");
    g.addColorStop(1, colore + "00");
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(c);
}

/* ------------------------------------------------------------ stelle cadenti */

/** La scia: trasparente in coda, piena e luminosa in testa, con un alone. */
function texturaScia() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 64;
  const x = c.getContext("2d");
  if (x) {
    for (let px = 0; px < 512; px++) {
      const f = px / 511;
      const g = x.createLinearGradient(0, 0, 0, 64);
      const a = Math.pow(f, 2.2);
      const larg = 0.08 + f * 0.1;
      g.addColorStop(0.5 - larg, "rgba(255,255,255,0)");
      g.addColorStop(0.5, `rgba(255,255,255,${a})`);
      g.addColorStop(0.5 + larg, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(px, 0, 1, 64);
    }
    const alone = x.createRadialGradient(490, 32, 0, 490, 32, 30);
    alone.addColorStop(0, "rgba(255,255,255,1)");
    alone.addColorStop(0.25, "rgba(220,232,255,0.7)");
    alone.addColorStop(1, "rgba(200,220,255,0)");
    x.fillStyle = alone;
    x.fillRect(440, 0, 72, 64);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function StelleCadenti() {
  const tx = useMemo(() => texturaScia(), []);
  const nastro = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(12), 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute([0, 0, 0, 1, 1, 1, 1, 0], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const m = new THREE.Mesh(
      g,
      new THREE.MeshBasicMaterial({
        map: tx, transparent: true, opacity: 0, blending: THREE.AdditiveBlending,
        depthWrite: false, fog: false, toneMapped: false, side: THREE.DoubleSide,
      })
    );
    m.frustumCulled = false;
    m.raycast = () => undefined;
    m.visible = false;
    return m;
  }, [tx]);
  useEffect(
    () => () => {
      nastro.geometry.dispose();
      (nastro.material as THREE.Material).dispose();
      tx.dispose();
    },
    [nastro, tx]
  );

  const rif = useRef<THREE.Mesh>(null);
  const stato = useRef({ prossima: 6, inizio: -1, da: new THREE.Vector3(), verso: new THREE.Vector3(), durata: 1.2 });
  const testa = useMemo(() => new THREE.Vector3(), []);
  const coda = useMemo(() => new THREE.Vector3(), []);
  const lato = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    const s = stato.current;
    const m = rif.current;
    if (!m) return;
    if (s.inizio < 0 && t > s.prossima) {
      const az = yawCamera(camera) + casuale(-0.45, 0.45);
      const alt = casuale(0.3, 0.6);
      const R = 34;
      s.da.set(Math.sin(az) * Math.cos(alt) * R, Math.sin(alt) * R, -Math.cos(az) * Math.cos(alt) * R);
      const l = new THREE.Vector3(Math.cos(az), 0, Math.sin(az)).multiplyScalar(Math.random() < 0.5 ? -1 : 1);
      s.verso.copy(l).add(new THREE.Vector3(0, -casuale(0.35, 0.6), 0)).normalize();
      s.durata = casuale(1.0, 1.4);
      s.inizio = t;
      m.visible = true;
    }
    if (s.inizio < 0) return;
    const a = (t - s.inizio) / s.durata;
    if (a >= 1) {
      s.inizio = -1;
      s.prossima = t + attesa(22, 45);
      m.visible = false;
      return;
    }
    testa.copy(s.da).addScaledVector(s.verso, 16 * a);
    coda.copy(testa).addScaledVector(s.verso, -(1.5 + 7 * Math.sin(a * Math.PI)));
    lato.copy(s.verso).cross(testa.clone().sub(camera.position)).normalize().multiplyScalar(0.28);
    const pos = m.geometry.attributes.position.array as Float32Array;
    pos.set([
      coda.x - lato.x, coda.y - lato.y, coda.z - lato.z,
      coda.x + lato.x, coda.y + lato.y, coda.z + lato.z,
      testa.x + lato.x, testa.y + lato.y, testa.z + lato.z,
      testa.x - lato.x, testa.y - lato.y, testa.z - lato.z,
    ]);
    m.geometry.attributes.position.needsUpdate = true;
    (m.material as THREE.MeshBasicMaterial).opacity = Math.min(1, Math.sin(a * Math.PI) * 1.6);
  });

  return <primitive ref={rif} object={nastro} />;
}

/* --------------------------------------------------------------------- gocce */

const SCHIZZI = 10;

function Gocce() {
  const tx = useMemo(() => sferetta("#EAF0FF"), []);
  const goccia = useRef<THREE.Sprite>(null);
  const schizzi = useRef<(THREE.Sprite | null)[]>([]);
  const stato = useRef({
    prossima: 5, caduta: -1, impatto: -100, pos: new THREE.Vector3(), slot: 0,
    vel: Array.from({ length: SCHIZZI }, () => new THREE.Vector3()),
  });
  useEffect(
    () => () => {
      tx.dispose();
      gocce.forEach((g) => g.set(0, 0, -100, 0));
    },
    [tx]
  );

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    const s = stato.current;
    const gm = goccia.current;
    if (!gm) return;
    // nuova goccia davanti a chi guarda, fra lui e le carte
    if (s.caduta < 0 && t > s.prossima) {
      const { avanti, lato } = assi(camera);
      s.pos.copy(avanti).multiplyScalar(casuale(2.6, 4.6)).addScaledVector(lato, casuale(-1.8, 1.8));
      s.caduta = t;
    }
    const CADUTA = 0.55;
    if (s.caduta >= 0) {
      const a = (t - s.caduta) / CADUTA;
      if (a < 1) {
        // cade accelerando, sottile e allungata
        gm.visible = true;
        gm.position.set(s.pos.x, PELO_ACQUA + 2.6 * (1 - a * a), s.pos.z);
        gm.scale.set(0.025, 0.09 + a * 0.06, 1);
        (gm.material as THREE.SpriteMaterial).opacity = 0.55 + a * 0.4;
      } else {
        // impatto: l'acqua comincia a fare cerchi, una piccola corona di schizzi salta su
        gm.visible = false;
        gocce[s.slot].set(s.pos.x, s.pos.z, t, casuale(0.8, 1.15));
        s.slot = (s.slot + 1) % MAX_GOCCE;
        s.impatto = t;
        s.vel.forEach((v, k) => {
          const ang = (k / SCHIZZI) * Math.PI * 2 + casuale(-0.2, 0.2);
          const o = casuale(0.25, 0.55);
          v.set(Math.cos(ang) * o, casuale(1.0, 1.7), Math.sin(ang) * o);
        });
        s.caduta = -1;
        // a volte una seconda goccia segue a breve, quasi nello stesso punto
        if (Math.random() < 0.3) {
          s.prossima = t + casuale(0.6, 1.4);
        } else {
          s.prossima = t + attesa(9, 20);
        }
      }
    }
    const e = t - s.impatto;
    schizzi.current.forEach((sp, k) => {
      if (!sp) return;
      if (e < 0 || e > 0.45) {
        sp.visible = false;
        return;
      }
      const v = s.vel[k];
      sp.visible = true;
      sp.position.set(s.pos.x + v.x * e, PELO_ACQUA + v.y * e - 4.9 * e * e, s.pos.z + v.z * e);
      if (sp.position.y < PELO_ACQUA) sp.visible = false;
      (sp.material as THREE.SpriteMaterial).opacity = 0.7 * (1 - e / 0.45);
    });
  });

  return (
    <group>
      <sprite ref={goccia} visible={false} raycast={() => null}>
        <spriteMaterial map={tx} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </sprite>
      {Array.from({ length: SCHIZZI }, (_, k) => (
        <sprite
          key={k}
          ref={(sp) => {
            schizzi.current[k] = sp;
          }}
          visible={false}
          scale={[0.02, 0.02, 1]}
          raycast={() => null}
        >
          <spriteMaterial map={tx} transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}

/* ------------------------------------------------------------ palla di fieno */

const R_FIENO = 0.36;

/** Centinaia di rametti secchi intrecciati dentro una sfera irregolare. */
function geometriaFieno() {
  let seme = 7;
  const rnd = () => {
    seme = (seme * 16807) % 2147483647;
    return seme / 2147483647;
  };
  const pos: number[] = [];
  const col: number[] = [];
  const toni = [
    new THREE.Color("#8A6A3C"), new THREE.Color("#A8865A"), new THREE.Color("#6C5232"),
    new THREE.Color("#C4A574"), new THREE.Color("#5A4329"),
  ];
  const p = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const q = new THREE.Vector3();
  for (let r = 0; r < 420; r++) {
    // più rametti sul guscio, qualcuno all'interno
    const guscio = rnd() < 0.75;
    const raggio = R_FIENO * (guscio ? 0.7 + rnd() * 0.3 : rnd() * 0.65);
    p.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize().multiplyScalar(raggio);
    dir.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
    const tono = toni[Math.floor(rnd() * toni.length)];
    const passi = 4 + Math.floor(rnd() * 6);
    const passo = 0.035 + rnd() * 0.05;
    for (let k = 0; k < passi; k++) {
      // il rametto si piega un po' a ogni tratto e resta dentro la sfera
      dir.add(q.set(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).multiplyScalar(0.9)).normalize();
      const n = p.clone().addScaledVector(dir, passo);
      if (n.length() > R_FIENO * (0.92 + rnd() * 0.12)) {
        dir.reflect(n.clone().normalize());
        continue;
      }
      pos.push(p.x, p.y, p.z, n.x, n.y, n.z);
      const luce = 0.85 + rnd() * 0.3;
      col.push(tono.r * luce, tono.g * luce, tono.b * luce, tono.r * luce, tono.g * luce, tono.b * luce);
      p.copy(n);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  return g;
}

function texturaOmbra() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const x = c.getContext("2d");
  if (x) {
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(0.5, "rgba(0,0,0,0.25)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g;
    x.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(c);
}

type StatoFieno = {
  prossima: number; inizio: number;
  da: THREE.Vector3; a: THREE.Vector3; curva: THREE.Vector3; prima: THREE.Vector3;
  k: number; vBase: number; fase: number; sosta: number;
  salto: number; saltoAlt: number; saltoLungo: number;
};

/** Punto della curva (Bézier quadratica) a parametro k. */
function puntoFieno(s: StatoFieno, k: number, out: THREE.Vector3) {
  const u = 1 - k;
  return out.set(
    u * u * s.da.x + 2 * u * k * s.curva.x + k * k * s.a.x,
    0,
    u * u * s.da.z + 2 * u * k * s.curva.z + k * k * s.a.z
  );
}

function PallaDiFieno() {
  const geometria = useMemo(() => geometriaFieno(), []);
  const ombraTx = useMemo(() => texturaOmbra(), []);
  useEffect(
    () => () => {
      geometria.dispose();
      ombraTx.dispose();
    },
    [geometria, ombraTx]
  );
  const palla = useRef<THREE.Group>(null);
  const corpo = useRef<THREE.LineSegments>(null);
  const ombra = useRef<THREE.Mesh>(null);
  const stato = useRef<StatoFieno>({
    prossima: 4, inizio: -1, da: new THREE.Vector3(), a: new THREE.Vector3(), curva: new THREE.Vector3(),
    prima: new THREE.Vector3(), k: 0, vBase: 1.8, fase: 0, sosta: 0, salto: 0, saltoAlt: 0, saltoLungo: 1,
  });
  const q = useMemo(() => new THREE.Quaternion(), []);
  const asse = useMemo(() => new THREE.Vector3(), []);
  const ora = useMemo(() => new THREE.Vector3(), []);
  const avanzo = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime;
    const s = stato.current;
    const g = palla.current;
    const c = corpo.current;
    const om = ombra.current;
    if (!g || !c || !om) return;
    if (s.inizio < 0 && t > s.prossima) {
      // ogni volta un percorso diverso: lato d'ingresso, distanza, curva, velocità
      const { avanti, lato } = assi(camera);
      const verso = Math.random() < 0.5 ? -1 : 1;
      const d1 = casuale(3.4, 5.0);
      const d2 = casuale(3.0, 5.2);
      s.da.copy(avanti).multiplyScalar(d1).addScaledVector(lato, -6.5 * verso);
      s.a.copy(avanti).multiplyScalar(d2).addScaledVector(lato, 6.5 * verso);
      s.curva.copy(avanti).multiplyScalar((d1 + d2) / 2 + casuale(-1.6, 1.6)).addScaledVector(lato, casuale(-2, 2));
      s.vBase = casuale(1.3, 2.4);
      s.k = 0;
      s.salto = 0;
      s.saltoAlt = casuale(0.05, 0.22);
      s.saltoLungo = casuale(0.7, 1.4);
      s.sosta = 0;
      s.fase = Math.random() * 10;
      s.inizio = t;
      puntoFieno(s, 0, s.prima);
      g.position.set(s.prima.x, PELO_ACQUA + R_FIENO, s.prima.z);
      g.visible = true;
      om.visible = true;
    }
    if (s.inizio < 0) return;

    // il vento: raffiche irregolari, e ogni tanto quasi si ferma
    let raffica = 0.65 + 0.35 * Math.sin(t * 0.9 + s.fase) + 0.25 * Math.sin(t * 2.3 + s.fase * 2);
    if (s.sosta > 0) {
      s.sosta -= dt;
      raffica *= 0.15;
    } else if (Math.random() < dt * 0.12) {
      s.sosta = casuale(0.4, 1.0);
    }
    const v = s.vBase * Math.max(0.1, raffica);
    // avanza sulla curva di quanto ha percorso davvero
    puntoFieno(s, Math.min(1, s.k + 0.01), avanzo);
    const tratto = Math.max(avanzo.distanceTo(s.prima), 0.0001) / 0.01;
    s.k = Math.min(1, s.k + (v * dt) / tratto);
    puntoFieno(s, s.k, ora);
    const mosso = ora.distanceTo(s.prima);

    // saltelli: archi bassi di altezza e lunghezza sempre diverse
    s.salto += mosso / s.saltoLungo;
    if (s.salto >= 1) {
      s.salto -= 1;
      s.saltoAlt = Math.random() < 0.25 ? casuale(0.15, 0.32) : casuale(0.02, 0.12);
      s.saltoLungo = casuale(0.6, 1.5);
    }
    const alto = Math.sin(s.salto * Math.PI) * s.saltoAlt;
    g.position.set(ora.x, PELO_ACQUA + R_FIENO * 0.95 + alto, ora.z);

    // rotola: asse perpendicolare al moto, angolo pari alla strada fatta diviso il raggio
    if (mosso > 1e-5) {
      asse.set(ora.z - s.prima.z, 0, -(ora.x - s.prima.x)).normalize();
      q.setFromAxisAngle(asse, mosso / R_FIENO);
      c.quaternion.premultiply(q);
    }
    s.prima.copy(ora);
    om.position.set(ora.x, PELO_ACQUA + 0.003, ora.z);
    const sc = 0.95 - alto * 1.2;
    om.scale.set(sc, sc, 1);

    // entra e esce sfumando
    const luce = Math.min(1, s.k * 8, (1 - s.k) * 8);
    (c.material as THREE.LineBasicMaterial).opacity = luce;
    (om.material as THREE.MeshBasicMaterial).opacity = luce * (0.75 - alto * 1.5);
    if (s.k >= 1) {
      s.inizio = -1;
      s.prossima = t + attesa(35, 70);
      g.visible = false;
      om.visible = false;
    }
  });

  return (
    <>
      <group ref={palla} visible={false}>
        <lineSegments ref={corpo} geometry={geometria} raycast={() => null}>
          <lineBasicMaterial vertexColors transparent opacity={0} />
        </lineSegments>
      </group>
      <mesh ref={ombra} rotation={[-Math.PI / 2, 0, 0]} visible={false} raycast={() => null}>
        <planeGeometry args={[R_FIENO * 2.4, R_FIENO * 2.4]} />
        <meshBasicMaterial map={ombraTx} transparent depthWrite={false} opacity={0} />
      </mesh>
    </>
  );
}

/* ---------------------------------------------------------------------- aquila */

/** Ala destra vista da sotto: bordo d'attacco, polso, cinque remiganti aperte a dita, bordo d'uscita. */
const ALA: [number, number][] = [
  [0.0, 0.1], [0.39, 0.16], [0.79, 0.1], [0.94, 0.06],
  [1.16, 0.02], [0.96, -0.02], [1.18, -0.06], [0.97, -0.09], [1.15, -0.14],
  [0.94, -0.15], [1.09, -0.21], [0.89, -0.2], [1.0, -0.26],
  [0.84, -0.27], [0.54, -0.3], [0.24, -0.28], [0.0, -0.18],
];

function forma(punti: [number, number][], specchio = 1) {
  const s = new THREE.Shape();
  punti.forEach(([x, y], i) => (i ? s.lineTo(x * specchio, y) : s.moveTo(x * specchio, y)));
  s.closePath();
  const g = new THREE.ShapeGeometry(s);
  g.rotateX(Math.PI / 2); // la forma giace sul piano xz, con +z in avanti
  return g;
}

type StatoAquila = {
  prossima: number; inizio: number; verso: number; R: number; giri: number;
  centro: THREE.Vector3; da: THREE.Vector3; ingresso: THREE.Vector3; raggio0: THREE.Vector3;
  tangente: THREE.Vector3; meta: THREE.Vector3; uscita: THREE.Vector3; prima: THREE.Vector3;
};

const T_ISPEZIONE = 9;
const T_GIRI = 13;
const T_PICCHIATA = 2.2;

function Aquila() {
  const geo = useMemo(() => {
    const corpo = new THREE.Shape();
    corpo.absellipse(0, -0.02, 0.075, 0.36, 0, Math.PI * 2, false, 0);
    const gCorpo = new THREE.ShapeGeometry(corpo);
    gCorpo.rotateX(Math.PI / 2);
    const testa = forma([[-0.045, 0.32], [-0.035, 0.44], [0, 0.5], [0.035, 0.44], [0.045, 0.32]]);
    const coda = forma([[-0.06, -0.3], [-0.16, -0.62], [-0.08, -0.67], [0, -0.68], [0.08, -0.67], [0.16, -0.62], [0.06, -0.3]]);
    return { corpo: gCorpo, testa, coda, destra: forma(ALA, 1), sinistra: forma(ALA, -1) };
  }, []);
  const materiale = useMemo(
    () => new THREE.MeshBasicMaterial({ color: "#2B231C", side: THREE.DoubleSide, transparent: true, opacity: 0 }),
    []
  );
  const rifCorpo = useRef<THREE.Mesh>(null);
  useEffect(
    () => () => {
      Object.values(geo).forEach((g) => g.dispose());
      materiale.dispose();
    },
    [geo, materiale]
  );

  const uccello = useRef<THREE.Group>(null);
  const alaD = useRef<THREE.Group>(null);
  const alaS = useRef<THREE.Group>(null);
  const stato = useRef<StatoAquila>({
    prossima: 7, inizio: -1, verso: 1, R: 3.2, giri: 2,
    centro: new THREE.Vector3(), da: new THREE.Vector3(), ingresso: new THREE.Vector3(), raggio0: new THREE.Vector3(),
    tangente: new THREE.Vector3(), meta: new THREE.Vector3(), uscita: new THREE.Vector3(), prima: new THREE.Vector3(),
  });
  const vettori = useRef({ pos: new THREE.Vector3(), guarda: new THREE.Vector3() });

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    const s = stato.current;
    const { pos, guarda } = vettori.current;
    const u = uccello.current;
    const d = alaD.current;
    const sx = alaS.current;
    if (!u || !d || !sx) return;
    if (s.inizio < 0 && t > s.prossima) {
      const { avanti, lato } = assi(camera);
      s.verso = Math.random() < 0.5 ? -1 : 1;
      s.R = casuale(2.6, 3.6);
      s.giri = Math.random() < 0.5 ? 2 : 3;
      s.centro.copy(avanti).multiplyScalar(casuale(13, 16)).addScaledVector(lato, casuale(-2, 2));
      s.centro.y = casuale(3.0, 4.0);
      // arriva da lontano, di lato, planando, e si porta sul bordo del cerchio
      s.raggio0.copy(lato).multiplyScalar(-s.verso);
      s.tangente.copy(avanti);
      s.ingresso.copy(s.centro).addScaledVector(s.raggio0, s.R);
      s.da.copy(s.centro).addScaledVector(lato, -16 * s.verso).addScaledVector(avanti, 6);
      s.da.y = s.centro.y + 0.9;
      s.meta.copy(s.centro).addScaledVector(avanti, casuale(8, 12)).addScaledVector(lato, casuale(-3, 3));
      s.meta.y = PELO_ACQUA - 3;
      s.prima.copy(s.da);
      s.inizio = t;
      u.visible = true;
    }
    if (s.inizio < 0) return;
    const e = t - s.inizio;
    let diedro = 0.12;
    let battito = 0;
    let piega = 0;
    let bank = 0;

    if (e < T_ISPEZIONE) {
      // volo di ispezione: plana, con due o tre colpi d'ala lenti
      const k = e / T_ISPEZIONE;
      const kk = k * k * (3 - 2 * k);
      pos.lerpVectors(s.da, s.ingresso, kk);
      pos.y += Math.sin(k * Math.PI) * 0.6;
      const ciclo = e % 4.5;
      battito = ciclo < 1.1 ? Math.sin((ciclo / 1.1) * Math.PI * 2) * 0.55 : 0;
    } else if (e < T_ISPEZIONE + T_GIRI) {
      // ha visto qualcosa: gira in tondo, inclinato verso il centro
      const k = (e - T_ISPEZIONE) / T_GIRI;
      const ang = k * s.giri * Math.PI * 2;
      pos.copy(s.centro)
        .addScaledVector(s.raggio0, Math.cos(ang) * s.R)
        .addScaledVector(s.tangente, Math.sin(ang) * s.R);
      pos.y = s.centro.y - k * 0.6;
      bank = 0.42;
      diedro = 0.18;
      s.uscita.copy(pos);
    } else if (e < T_ISPEZIONE + T_GIRI + T_PICCHIATA) {
      // picchiata: ali chiuse all'indietro, accelera verso il basso e sparisce oltre l'orizzonte
      const k = (e - T_ISPEZIONE - T_GIRI) / T_PICCHIATA;
      pos.lerpVectors(s.uscita, s.meta, k * k * k);
      piega = Math.min(1, k * 3);
    } else {
      s.inizio = -1;
      s.prossima = t + attesa(80, 140);
      u.visible = false;
      return;
    }

    // orientamento lungo la direzione di volo, con l'inclinazione in virata
    guarda.subVectors(pos, s.prima);
    u.position.copy(pos);
    if (guarda.lengthSq() > 1e-8) {
      u.lookAt(guarda.add(pos));
      u.rotateZ(bank * (guarda.x * s.raggio0.z - guarda.z * s.raggio0.x >= 0 ? 1 : -1));
    }
    s.prima.copy(pos);

    // ali: diedro, battito, e chiusura in picchiata
    const ang = diedro + battito;
    d.rotation.set(0, piega * 0.9, ang);
    sx.rotation.set(0, -piega * 0.9, -ang);
    d.scale.set(1 - piega * 0.45, 1, 1);
    sx.scale.set(1 - piega * 0.45, 1, 1);
    const mat = rifCorpo.current?.material as THREE.MeshBasicMaterial | undefined;
    if (mat) mat.opacity = Math.min(1, e / 1.5);
  });

  return (
    <group ref={uccello} visible={false} scale={1.1}>
      <mesh ref={rifCorpo} geometry={geo.corpo} material={materiale} raycast={() => null} />
      <mesh geometry={geo.testa} material={materiale} raycast={() => null} />
      <mesh geometry={geo.coda} material={materiale} raycast={() => null} />
      <group ref={alaD} position={[0.06, 0, 0]}>
        <mesh geometry={geo.destra} material={materiale} raycast={() => null} />
      </group>
      <group ref={alaS} position={[-0.06, 0, 0]}>
        <mesh geometry={geo.sinistra} material={materiale} raycast={() => null} />
      </group>
    </group>
  );
}

/* --------------------------------------------------------------------- insieme */

export default function Fauna({ notte, ridotto }: { notte: boolean; ridotto: boolean; stretto?: boolean }) {
  if (ridotto) return null;
  return notte ? (
    <>
      <StelleCadenti />
      <Gocce />
    </>
  ) : (
    <>
      <PallaDiFieno />
      <Aquila />
    </>
  );
}
