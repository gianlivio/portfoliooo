"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PELO_ACQUA, scia } from "./condivisi";

/**
 * Ciò che ogni tanto passa per la stanza, sempre davanti a dove si sta guardando.
 * Notte: stelle cadenti nel cielo; un coccodrillo che affiora appena nell'acqua, una volta al minuto.
 * Giorno: uno stormo che attraversa il cielo dietro le carte; una formica che corre sul marmo.
 * Con "riduci movimento" non passa niente.
 */

const casuale = (a: number, b: number) => a + Math.random() * (b - a);

/** Direzione orizzontale verso cui guarda la camera, come angolo (0 = −z). */
function yawCamera(camera: THREE.Camera) {
  const d = camera.getWorldDirection(new THREE.Vector3());
  return Math.atan2(d.x, -d.z);
}

/* ------------------------------------------------------------ stelle cadenti */

const PUNTI_SCIA = 28;

function StelleCadenti() {
  const linea = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(PUNTI_SCIA * 3), 3));
    const col = new Float32Array(PUNTI_SCIA * 3);
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    const l = new THREE.Line(
      g,
      new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, toneMapped: false })
    );
    l.frustumCulled = false;
    l.raycast = () => undefined;
    l.visible = false;
    return l;
  }, []);
  useEffect(
    () => () => {
      linea.geometry.dispose();
      (linea.material as THREE.Material).dispose();
    },
    [linea]
  );

  const rifLinea = useRef<THREE.Line>(null);
  const stato = useRef({ prossima: 10, inizio: -1, da: new THREE.Vector3(), verso: new THREE.Vector3(), durata: 0.9 });

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    const s = stato.current;
    const linea = rifLinea.current;
    if (!linea) return;
    if (s.inizio < 0 && t > s.prossima) {
      // parte in alto davanti a chi guarda e scende di traverso
      const az = yawCamera(camera) + casuale(-0.7, 0.7);
      const alt = casuale(0.45, 0.85);
      const R = 38;
      s.da.set(Math.sin(az) * Math.cos(alt) * R, Math.sin(alt) * R, -Math.cos(az) * Math.cos(alt) * R);
      const lato = new THREE.Vector3(Math.cos(az), 0, Math.sin(az)).multiplyScalar(Math.random() < 0.5 ? -1 : 1);
      s.verso.copy(lato).multiplyScalar(casuale(0.7, 1)).add(new THREE.Vector3(0, -casuale(0.35, 0.7), 0)).normalize();
      s.durata = casuale(0.7, 1.1);
      s.inizio = t;
      linea.visible = true;
    }
    if (s.inizio < 0) return;
    const a = (t - s.inizio) / s.durata;
    if (a >= 1) {
      s.inizio = -1;
      s.prossima = t + casuale(14, 32);
      linea.visible = false;
      return;
    }
    const percorso = 11;
    const coda = 4.5 * Math.sin(Math.min(a, 1) * Math.PI) + 0.2;
    const testa = s.da.clone().addScaledVector(s.verso, percorso * a);
    const pos = linea.geometry.attributes.position.array as Float32Array;
    const col = linea.geometry.attributes.color.array as Float32Array;
    const luce = Math.sin(a * Math.PI);
    for (let k = 0; k < PUNTI_SCIA; k++) {
      const f = k / (PUNTI_SCIA - 1);
      const p = testa.clone().addScaledVector(s.verso, -coda * f);
      pos.set([p.x, p.y, p.z], k * 3);
      const v = Math.pow(1 - f, 2) * luce;
      col.set([v, v, v * 1.05], k * 3);
    }
    linea.geometry.attributes.position.needsUpdate = true;
    linea.geometry.attributes.color.needsUpdate = true;
  });

  return <primitive ref={rifLinea} object={linea} />;
}

/* --------------------------------------------------------------------- stormo */

const UCCELLI = 150;

function texturaUccello() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  if (x) {
    x.strokeStyle = "#FFFFFF";
    x.lineWidth = 6;
    x.lineCap = "round";
    x.lineJoin = "round";
    x.beginPath();
    x.moveTo(6, 26);
    x.quadraticCurveTo(20, 18, 32, 34);
    x.quadraticCurveTo(44, 18, 58, 26);
    x.stroke();
  }
  return new THREE.CanvasTexture(c);
}

/** Posizioni di partenza degli uccelli: un ellissoide schiacciato, più largo che alto. */
function semiStormo(n: number) {
  let seme = 41;
  const rnd = () => {
    seme = (seme * 16807) % 2147483647;
    return seme / 2147483647;
  };
  return Array.from({ length: n }, () => {
    const u = rnd() * Math.PI * 2;
    const v = Math.acos(2 * rnd() - 1);
    const r = Math.cbrt(rnd());
    return new THREE.Vector3(Math.sin(v) * Math.cos(u) * r * 2.2, Math.cos(v) * r * 0.7, Math.sin(v) * Math.sin(u) * r * 1.4);
  });
}

function Stormo({ stretto }: { stretto: boolean }) {
  const n = stretto ? 90 : UCCELLI;
  const tx = useMemo(() => texturaUccello(), []);
  const punti = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(n * 3), 3));
    const p = new THREE.Points(
      g,
      new THREE.PointsMaterial({ map: tx, color: "#16171A", size: 0.32, sizeAttenuation: true, transparent: true, opacity: 0, depthWrite: false, alphaTest: 0.05 })
    );
    p.frustumCulled = false;
    p.raycast = () => undefined;
    p.visible = false;
    return p;
  }, [n, tx]);
  const semi = useMemo(() => semiStormo(n), [n]);
  useEffect(
    () => () => {
      punti.geometry.dispose();
      (punti.material as THREE.Material).dispose();
      tx.dispose();
    },
    [punti, tx]
  );

  const rifPunti = useRef<THREE.Points>(null);
  const stato = useRef({ prossima: 12, inizio: -1, az: 0, verso: 1, durata: 16 });
  const tmp = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    const s = stato.current;
    const punti = rifPunti.current;
    if (!punti) return;
    if (s.inizio < 0 && t > s.prossima) {
      s.az = yawCamera(camera);
      s.verso = Math.random() < 0.5 ? -1 : 1;
      s.durata = casuale(14, 19);
      s.inizio = t;
      punti.visible = true;
    }
    if (s.inizio < 0) return;
    const a = (t - s.inizio) / s.durata;
    if (a >= 1) {
      s.inizio = -1;
      s.prossima = t + casuale(30, 55);
      punti.visible = false;
      return;
    }
    // il centro dello stormo attraversa il cielo da un lato all'altro, dietro le carte
    const ang = s.az + s.verso * (a * 2 - 1) * 1.15;
    const R = 15;
    const cx = Math.sin(ang) * R;
    const cz = -Math.cos(ang) * R;
    const cy = 3.4 + Math.sin(a * Math.PI * 2) * 0.8;
    const pos = punti.geometry.attributes.position.array as Float32Array;
    const respiro = 1 + 0.45 * Math.sin(t * 0.9);
    const torsione = t * 0.35;
    semi.forEach((o, i) => {
      // lo stormo si stringe, si allarga e si avvolge su se stesso
      const onda = 1 + 0.5 * Math.sin(t * 1.4 + o.x * 1.7 + o.z);
      tmp.set(o.x * respiro * onda, o.y * (2 - respiro) + Math.sin(t * 2 + o.x * 3) * 0.12, o.z * respiro);
      tmp.applyAxisAngle(new THREE.Vector3(0, 1, 0), torsione + o.y * 0.6);
      pos.set([cx + tmp.x, cy + tmp.y, cz + tmp.z], i * 3);
    });
    punti.geometry.attributes.position.needsUpdate = true;
    (punti.material as THREE.PointsMaterial).opacity = Math.min(1, Math.sin(a * Math.PI) * 2.2) * 0.75;
  });

  return <primitive ref={rifPunti} object={punti} />;
}

/* ----------------------------------------------------------------- coccodrillo */

const COCCO_L = 2.3;
const COCCO_A = 0.5;

/** Mezza larghezza del corpo lungo l'asse (0 = punta del muso, 1 = punta della coda), in frazione dell'altezza. */
function sagoma(x: number) {
  if (x < 0.035) return 0.08 + x * 3;
  if (x < 0.17) return 0.18 + (x - 0.035) * 1.1; // muso che si allarga
  if (x < 0.21) return 0.33 - (x - 0.17) * 0.8; // collo
  if (x < 0.3) return 0.3 + (x - 0.21) * 2.0;
  if (x < 0.48) return 0.48;
  return 0.48 * Math.pow(1 - (x - 0.48) / 0.52, 1.25) + 0.012; // coda che si assottiglia
}

function texturaCoccodrillo() {
  const W = 1024;
  const H = 224;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  if (!x) return new THREE.CanvasTexture(c);
  const cy = H / 2;

  // la sagoma, sfumata ai bordi: il resto è sott'acqua
  const forma = new Path2D();
  forma.moveTo(0, cy);
  for (let i = 0; i <= 200; i++) {
    const f = i / 200;
    forma.lineTo(f * W, cy - sagoma(f) * H);
  }
  for (let i = 200; i >= 0; i--) {
    const f = i / 200;
    forma.lineTo(f * W, cy + sagoma(f) * H);
  }
  forma.closePath();

  x.save();
  x.filter = "blur(7px)";
  x.fillStyle = "#232B21";
  x.fill(forma);
  x.restore();

  x.save();
  x.clip(forma);
  // grana della pelle
  for (let k = 0; k < 2600; k++) {
    const px = Math.random() * W;
    const py = Math.random() * H;
    x.fillStyle = Math.random() < 0.5 ? "rgba(70,78,58,0.18)" : "rgba(5,7,5,0.25)";
    x.fillRect(px, py, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
  // osteodermi: file di placche rialzate lungo il dorso, con il bordo bagnato che prende luce
  const file = [-0.3, -0.18, -0.06, 0.06, 0.18, 0.3];
  for (let f = 0.22; f < 0.98; f += 0.024) {
    const larg = sagoma(f) * H;
    const corpo = f < 0.5;
    file.forEach((r, j) => {
      if (!corpo && Math.abs(r) > 0.07) return; // sulla coda resta la doppia cresta
      const yy = cy + r * larg * 1.6;
      if (Math.abs(yy - cy) > larg * 0.86) return;
      const w = (corpo ? 16 : 13) * (1 - (f - 0.22) * 0.5);
      const h = corpo ? 12 + (2 - Math.abs(j - 2.5)) * 2 : 10;
      x.fillStyle = "#121611";
      x.beginPath();
      x.roundRect(f * W - w / 2, yy - h / 2, w, h, 4);
      x.fill();
      x.strokeStyle = "rgba(150,162,128,0.6)";
      x.lineWidth = 1.6;
      x.beginPath();
      x.moveTo(f * W - w / 2 + 2, yy - h / 2 + 1);
      x.lineTo(f * W + w / 2 - 2, yy - h / 2 + 1);
      x.stroke();
    });
  }
  // la testa: placche più piccole e le due gobbe degli occhi
  for (let f = 0.04; f < 0.17; f += 0.016) {
    for (let r = -0.5; r <= 0.5; r += 0.25) {
      const yy = cy + r * sagoma(f) * H * 1.4;
      x.strokeStyle = "rgba(100,112,88,0.35)";
      x.lineWidth = 1;
      x.strokeRect(f * W - 4, yy - 3, 8, 6);
    }
  }
  for (const s of [-1, 1]) {
    const ex = 0.155 * W;
    const ey = cy + s * 0.2 * H;
    x.fillStyle = "#0B0E0A";
    x.beginPath();
    x.ellipse(ex, ey, 13, 9, 0, 0, Math.PI * 2);
    x.fill();
    x.fillStyle = "rgba(190,200,160,0.7)";
    x.beginPath();
    x.ellipse(ex + 4, ey - 3, 3, 1.6, 0, 0, Math.PI * 2);
    x.fill();
  }
  // narici sulla punta del muso
  x.fillStyle = "#0B0E0A";
  x.beginPath();
  x.arc(0.022 * W, cy - 6, 3.5, 0, Math.PI * 2);
  x.arc(0.022 * W, cy + 6, 3.5, 0, Math.PI * 2);
  x.fill();
  x.restore();

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

const COCCO_VERT = `
uniform float uTempo;
varying vec2 vUv;
void main(){
  vUv = uv;
  vec3 p = position;
  // x va dal muso (−) alla coda (+): la coda ondeggia, il muso resta quasi fermo
  float f = uv.x;
  p.y += sin(f * 7.0 - uTempo * 4.2) * pow(f, 1.6) * 0.16;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}`;

const COCCO_FRAG = `
uniform sampler2D uMappa;
uniform float uOpacita;
uniform float uTempo;
varying vec2 vUv;
void main(){
  vec4 c = texture2D(uMappa, vUv);
  // lucido bagnato che scorre lungo il dorso
  float lucido = pow(max(0.0, sin(vUv.x * 40.0 - uTempo * 2.0)), 18.0) * 0.08;
  gl_FragColor = vec4(c.rgb + lucido, c.a * uOpacita);
  #include <colorspace_fragment>
}`;

function Coccodrillo() {
  const mappa = useMemo(() => texturaCoccodrillo(), []);
  const materiale = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: COCCO_VERT,
        fragmentShader: COCCO_FRAG,
        uniforms: { uMappa: { value: mappa }, uOpacita: { value: 0 }, uTempo: { value: 0 } },
        transparent: true,
        depthWrite: false,
      }),
    [mappa]
  );
  const corpo = useRef<THREE.Mesh>(null);
  useEffect(
    () => () => {
      mappa.dispose();
      materiale.dispose();
      scia.forza = 0;
    },
    [mappa, materiale]
  );

  const stato = useRef({
    prossima: 16, inizio: -1, durata: 20,
    da: new THREE.Vector2(), a: new THREE.Vector2(), curva: new THREE.Vector2(),
  });
  const p = useMemo(() => new THREE.Vector2(), []);
  const q = useMemo(() => new THREE.Vector2(), []);

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    const s = stato.current;
    const m = corpo.current;
    if (!m) return;
    if (s.inizio < 0 && t > s.prossima) {
      // attraversa lo specchio d'acqua davanti a chi guarda, fra lui e le carte
      const yaw = yawCamera(camera);
      const avanti = new THREE.Vector2(Math.sin(yaw), -Math.cos(yaw));
      const lato = new THREE.Vector2(-avanti.y, avanti.x).multiplyScalar(Math.random() < 0.5 ? -1 : 1);
      const dist = casuale(3.0, 4.2);
      s.da.copy(avanti).multiplyScalar(dist).addScaledVector(lato, -6.5);
      s.a.copy(avanti).multiplyScalar(dist + casuale(-0.6, 0.8)).addScaledVector(lato, 6.5);
      s.curva.copy(avanti).multiplyScalar(dist + casuale(-1, 0.6));
      s.durata = casuale(17, 22);
      s.inizio = t;
    }
    if (s.inizio < 0) {
      m.visible = false;
      scia.forza = 0;
      return;
    }
    const a = (t - s.inizio) / s.durata;
    if (a >= 1) {
      s.inizio = -1;
      s.prossima = t + casuale(45, 65);
      m.visible = false;
      scia.forza = 0;
      return;
    }
    m.visible = true;
    // traiettoria curva (Bézier quadratica) con un serpeggiare lento
    const b = (k: number, out: THREE.Vector2) => {
      const u = 1 - k;
      out.set(
        u * u * s.da.x + 2 * u * k * s.curva.x + k * k * s.a.x,
        u * u * s.da.y + 2 * u * k * s.curva.y + k * k * s.a.y
      );
      return out;
    };
    b(a, p);
    b(Math.min(1, a + 0.01), q);
    const dir = q.sub(p).normalize();
    const serpe = Math.sin(t * 1.3) * 0.25;
    const ang = Math.atan2(dir.y, dir.x) + serpe * 0.3;
    m.position.set(p.x, PELO_ACQUA + 0.006, p.y);
    m.rotation.set(-Math.PI / 2, 0, -ang + Math.PI);
    // affiora e si immerge ai due capi del percorso
    const affiora = Math.min(1, a * 6) * Math.min(1, (1 - a) * 6);
    (m.material as THREE.ShaderMaterial).uniforms.uOpacita.value = affiora * 0.92;
    (m.material as THREE.ShaderMaterial).uniforms.uTempo.value = t;
    // la testa (muso) è il capo −x del piano: la scia parte da lì
    scia.pos.set(p.x + dir.x * COCCO_L * 0.5, p.y + dir.y * COCCO_L * 0.5);
    scia.dir.set(Math.cos(ang), Math.sin(ang));
    scia.forza = affiora;
  });

  return (
    <mesh ref={corpo} material={materiale} raycast={() => null} visible={false} renderOrder={1}>
      <planeGeometry args={[COCCO_L, COCCO_A, 48, 1]} />
    </mesh>
  );
}

/* --------------------------------------------------------------------- formica */

function fotogrammiFormica() {
  // due fotogrammi dell'andatura a treppiede: tre zampe avanti, tre indietro
  return [0, 1].map((fase) => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d");
    if (x) {
      x.translate(64, 64);
      x.fillStyle = x.strokeStyle = "#1A1210";
      x.lineCap = "round";
      x.lineWidth = 2.6;
      // zampe: tre per lato, dal torace
      const zampe = [-10, 0, 10];
      zampe.forEach((yy, k) => {
        for (const lato of [-1, 1]) {
          const avanti = (k + (lato > 0 ? 1 : 0) + fase) % 2 === 0 ? -1 : 1;
          x.beginPath();
          x.moveTo(yy * 0.4, 0);
          x.lineTo(yy + avanti * 8, lato * 16);
          x.lineTo(yy + avanti * 14, lato * 30);
          x.stroke();
        }
      });
      // antenne
      x.lineWidth = 1.8;
      for (const lato of [-1, 1]) {
        x.beginPath();
        x.moveTo(-30, lato * 3);
        x.lineTo(-40, lato * 9);
        x.lineTo(-50, lato * (14 + fase * 3));
        x.stroke();
      }
      // capo, torace, addome
      x.beginPath();
      x.ellipse(-26, 0, 8, 7, 0, 0, Math.PI * 2);
      x.fill();
      x.beginPath();
      x.ellipse(-6, 0, 11, 5, 0, 0, Math.PI * 2);
      x.fill();
      x.beginPath();
      x.ellipse(22, 0, 17, 11, 0, 0, Math.PI * 2);
      x.fill();
      // lucido sull'addome
      x.fillStyle = "rgba(255,255,255,0.18)";
      x.beginPath();
      x.ellipse(18, -4, 7, 3, -0.2, 0, Math.PI * 2);
      x.fill();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  });
}

function Formica() {
  const fotogrammi = useMemo(() => fotogrammiFormica(), []);
  const materiale = useMemo(
    () => new THREE.MeshBasicMaterial({ map: fotogrammi[0], transparent: true, depthWrite: false, toneMapped: false }),
    [fotogrammi]
  );
  useEffect(
    () => () => {
      fotogrammi.forEach((f) => f.dispose());
      materiale.dispose();
    },
    [fotogrammi, materiale]
  );
  const corpo = useRef<THREE.Mesh>(null);
  const stato = useRef({
    prossima: 9, inizio: -1, pos: new THREE.Vector2(), rotta: 0, meta: new THREE.Vector2(),
    pausa: 0, passo: 0, fotogramma: 0,
  });

  useFrame(({ clock, camera }, dt) => {
    const t = clock.elapsedTime;
    const s = stato.current;
    const m = corpo.current;
    if (!m) return;
    if (s.inizio < 0 && t > s.prossima) {
      // entra da un lato del campo visivo, a qualche passo da chi guarda, e corre verso l'altro
      const yaw = yawCamera(camera);
      const avanti = new THREE.Vector2(Math.sin(yaw), -Math.cos(yaw));
      const lato = new THREE.Vector2(-avanti.y, avanti.x).multiplyScalar(Math.random() < 0.5 ? -1 : 1);
      const dist = casuale(2.2, 3.2);
      s.pos.copy(avanti).multiplyScalar(dist).addScaledVector(lato, -3.2);
      s.meta.copy(avanti).multiplyScalar(dist + casuale(-0.8, 1.2)).addScaledVector(lato, 3.6);
      s.rotta = Math.atan2(s.meta.y - s.pos.y, s.meta.x - s.pos.x);
      s.inizio = t;
      s.pausa = 0;
      m.visible = true;
    }
    if (s.inizio < 0) return;
    // corre a scatti, cambiando un po' direzione, e ogni tanto si ferma
    if (s.pausa > 0) {
      s.pausa -= dt;
    } else {
      const verso = Math.atan2(s.meta.y - s.pos.y, s.meta.x - s.pos.x);
      let diff = verso - s.rotta;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      s.rotta += diff * Math.min(1, dt * 3) + Math.sin(t * 9) * dt * 2.2;
      const v = 0.95;
      s.pos.x += Math.cos(s.rotta) * v * dt;
      s.pos.y += Math.sin(s.rotta) * v * dt;
      s.passo += dt;
      if (s.passo > 0.045) {
        s.passo = 0;
        s.fotogramma = 1 - s.fotogramma;
        (m.material as THREE.MeshBasicMaterial).map = fotogrammi[s.fotogramma];
      }
      if (Math.random() < dt * 0.6) s.pausa = casuale(0.15, 0.5);
    }
    m.position.set(s.pos.x, PELO_ACQUA + 0.004, s.pos.y);
    m.rotation.set(-Math.PI / 2, 0, -s.rotta + Math.PI);
    if (s.pos.distanceTo(s.meta) < 0.15 || t - s.inizio > 12) {
      s.inizio = -1;
      s.prossima = t + casuale(30, 50);
      m.visible = false;
    }
  });

  return (
    <mesh ref={corpo} material={materiale} raycast={() => null} visible={false}>
      <planeGeometry args={[0.16, 0.16]} />
    </mesh>
  );
}

/* --------------------------------------------------------------------- insieme */

export default function Fauna({ notte, ridotto, stretto }: { notte: boolean; ridotto: boolean; stretto: boolean }) {
  if (ridotto) return null;
  return notte ? (
    <>
      <StelleCadenti />
      <Coccodrillo />
    </>
  ) : (
    <>
      <Stormo stretto={stretto} />
      <Formica />
    </>
  );
}
