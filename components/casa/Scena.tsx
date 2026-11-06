"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { ZONE, ZONE_LONTANE, zona, type ZonaId } from "@/content/casa";
import type { Lingua } from "@/dictionaries";
import { pillola } from "./mondo/base";
import Terreno from "./mondo/Terreno";
import CasaInCampagna from "./mondo/Casa";
import Uliveto from "./mondo/Uliveto";
import Frantoio from "./mondo/Frantoio";
import Persone from "./mondo/Persone";
import Oggetti from "./mondo/Oggetti";
import Quadri from "./mondo/Quadri";
import Furgone, { Cartello, Cassone } from "./mondo/Furgone";
import Percorsi from "./mondo/Percorsi";
import { ALTROVE, CARTELLO_CASA, CASSONE, CORPI, CORTILE, PISCINA, POLLAIO, TRATTORE_CASA, altrove } from "@/content/casaLuoghi";

export type Modo = "guida" | "cammina";
export type Movimento = { x: number; y: number };

type Props = {
  modo: Modo;
  zonaId: ZonaId;
  fasi: Record<ZonaId, number>;
  lingua: Lingua;
  parlante: string | null;
  /** apre una foto o un video a schermo intero */
  onApri: (id: string) => void;
  stretto: boolean;
  ridotto: boolean;
  movimento: React.MutableRefObject<Movimento>;
  onVai: (id: ZonaId) => void;
  onVicina: (id: ZonaId) => void;
  onParla: (id: string) => void;
  onPronta: () => void;
  onMosso: () => void;
  /** chi è in visita guidata e preme un tasto di movimento torna a camminare */
  onCammina: () => void;
  /** il velo nero del viaggio in trattore (opacità da 0 a 1) e la sua scritta */
  onVelo: (o: number) => void;
  onScritta: (testo: string) => void;
};

/**
 * Gli ostacoli per chi cammina: i corpi della casa e il muro del cortile non si attraversano (nel cortile si entra
 * dal varco verso l'aia), la vasca della piscina nemmeno; nel recinto delle galline si entra dal varco, nel frantoio
 * solo dal davanti. Restituisce true se il passo da (px, pz) a (x, z) non è permesso.
 */
function bloccato(px: number, pz: number, x: number, z: number) {
  for (const c of Object.values(CORPI)) if (Math.abs(x - c.x) < c.l / 2 + 0.3 && Math.abs(z - c.z) < c.p / 2 + 0.3) return true;
  // il cortile: si entra solo dal varco nel muro basso
  const nelCortile = (u: number, v: number) => Math.abs(u - CORTILE.x) < CORTILE.l / 2 && Math.abs(v - CORTILE.z) < CORTILE.p / 2;
  if (nelCortile(px, pz) !== nelCortile(x, z) && Math.abs(x - 10.2) > 1) return true;
  // la vasca
  const ex = (x - PISCINA.x) / (PISCINA.l / 2 + 0.2), ez = (z - PISCINA.z) / (PISCINA.p / 2 + 0.2);
  if (ex * ex + ez * ez < 1) return true;
  // il recinto delle galline: il varco sul lato verso la casa
  const nelRecinto = (u: number, v: number) => Math.abs(u - POLLAIO.x) < POLLAIO.l / 2 && Math.abs(v - POLLAIO.z) < POLLAIO.p / 2;
  if (nelRecinto(px, pz) !== nelRecinto(x, z) && !(Math.abs(z - POLLAIO.z) < 0.7 && x > POLLAIO.x)) return true;
  // il frantoio: muri dietro e ai lati, aperto davanti (verso +z)
  const fz = (q: number) => q - ALTROVE[2];
  const nelFrantoio = (u: number, v: number) => u > -19.3 && u < -8.7 && fz(v) > -49.8 && fz(v) < -42.4;
  if (nelFrantoio(px, pz) !== nelFrantoio(x, z)) {
    const davanti = fz(pz) > -43 && fz(z) > -43 && x > -18.4 && x < -9.6;
    if (!davanti) return true;
  }
  return false;
}

/** In quale area sta un punto: la fattoria o l'area lontana degli uliveti. */
const lontano = (z: number) => z < ALTROVE[2] / 2;

/** Il sole basso del tramonto, dalla stessa parte del sole del cielo (a +x, +z). */
const SOLE = new THREE.Vector3(0.81, 0.36, 0.59).normalize();
const OCCHI = 1.7;

function Cielo() {
  const get = useThree((s) => s.get);
  useEffect(() => {
    const scene = get().scene;
    const t = new THREE.TextureLoader().load("/olio/scena/cielo-tramonto.jpg");
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    scene.background = t;
    scene.backgroundIntensity = 1.05;
    scene.environment = t;
    scene.environmentIntensity = 0.45;
    scene.fog = new THREE.Fog("#B9A894", 80, 290);
    return () => {
      scene.background = null;
      scene.environment = null;
      t.dispose();
    };
  }, [get]);
  return null;
}

function Luci({ ombre }: { ombre: boolean }) {
  const sole = useRef<THREE.DirectionalLight>(null);
  const { scene } = useThree();
  useEffect(() => {
    const l = sole.current;
    if (!l) return;
    l.target.position.set(0, 0, -20);
    scene.add(l.target);
    const c = l.shadow.camera as THREE.OrthographicCamera;
    c.left = -75;
    c.right = 75;
    c.top = 75;
    c.bottom = -75;
    c.near = 1;
    c.far = 260;
    c.updateProjectionMatrix();
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.04;
    return () => {
      scene.remove(l.target);
    };
  }, [scene]);
  const p = SOLE.clone().multiplyScalar(120).add(new THREE.Vector3(0, 0, -20));
  // le ombre seguono l'area in cui si è: la fattoria o gli uliveti lontani
  useFrame(({ camera }) => {
    const l = sole.current;
    if (!l) return;
    const cz = lontano(camera.position.z) ? ALTROVE[2] - 45 : -20;
    if (l.target.position.z !== cz) {
      l.target.position.set(0, 0, cz);
      l.position.copy(SOLE).multiplyScalar(120).add(l.target.position);
    }
  });
  return (
    <>
      <hemisphereLight args={["#D2DCE8", "#8A6A52", 1.6]} />
      <directionalLight
        ref={sole}
        position={p}
        intensity={3.6}
        color="#FFD6A8"
        castShadow={ombre}
        shadow-mapSize={[2048, 2048]}
      />
    </>
  );
}

/* ------------------------------------------------------------------ la camera */

const verso = (da: THREE.Vector3, a: THREE.Vector3) => {
  const d = a.clone().sub(da);
  return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) };
};
const facile = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const angolo = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** I centri delle aree, per sapere dove si trova chi cammina. */
const AREE: [ZonaId, number, number][] = [
  ["arrivo", -7, 44],
  ["agrumeto", 7, 20],
  ["piscina", -21, 12],
  ["casa", 3, -4],
  ["pollaio", -12, -28],
  ["uliveto", -24, -56],
  ["chiaramonte", 6, -50 + ALTROVE[2]],
  ["frantoio", -14, -43 + ALTROVE[2]],
];

/** Le strade del trattore: in partenza da casa, in arrivo a Chiaramonte, e viceversa. */
const V = (x: number, z: number) => new THREE.Vector3(x, 0, z);
const VA = (x: number, z: number) => new THREE.Vector3(...altrove([x, 0, z]));
const STRADE = {
  esceCasa: [V(-3.6, 2.4), V(-3.2, 7), V(-4.8, 13), V(-7.3, 21.4), V(-7.1, 41.5), V(-5.3, 66.6), V(-6.2, 80)],
  // rientrando gira sull'aia, per fermarsi di nuovo col muso verso la strada
  entraCasa: [V(-6.2, 80), V(-5.3, 66.6), V(-7.1, 41.5), V(-7.3, 21.4), V(-4.6, 13), V(-1.6, 5), V(1.6, -2.6), V(-0.8, -6.6), V(-3.8, -5.4), V(TRATTORE_CASA.p[0], TRATTORE_CASA.p[2])],
  esceLontano: [VA(12, -22), VA(8, -19), VA(10, -8), VA(13.6, 6), VA(14, 40), VA(14, 75)],
  entraLontano: [VA(14, 75), VA(14, 30), VA(14, 0), VA(14, -16)],
};
type Viaggio = { fase: "sale" | "parte" | "buio" | "arriva"; t: number; andata: THREE.CatmullRomCurve3; ritorno: THREE.CatmullRomCurve3; verso: "lontano" | "casa" };

function Regia({
  modo,
  zonaId,
  movimento,
  onVicina,
  onMosso,
  stretto,
  furgone,
  onVelo,
  onScritta,
  onCammina,
  testi,
}: Pick<Props, "modo" | "zonaId" | "movimento" | "onVicina" | "onMosso" | "stretto" | "onVelo" | "onScritta" | "onCammina"> & {
  furgone: React.RefObject<THREE.Group | null>;
  testi: { andata: string; ritorno: string };
}) {
  const get = useThree((s) => s.get);
  const gl = useThree((s) => s.gl);
  const st = useRef({
    yaw: 0,
    pitch: 0,
    offYaw: 0,
    offPitch: 0,
    volo: null as null | { da: THREE.Vector3; a: THREE.Vector3; ctrl: THREE.Vector3; daYaw: number; aYaw: number; daPitch: number; aPitch: number; t: number; durata: number },
    vicina: "arrivo" as ZonaId,
    premuto: false,
    puntatore: -1,
    ultimo: { x: 0, y: 0 },
    tasti: new Set<string>(),
    viaggio: null as Viaggio | null,
    zona: zonaId,
  });
  useEffect(() => {
    st.current.zona = zonaId;
  }, [zonaId]);
  const subito = typeof location !== "undefined" && location.search.includes("subito");

  /** Prepara il volo della camera verso un punto, guardando un altro. */
  const vola = (a: THREE.Vector3, guarda: THREE.Vector3, durata?: number) => {
    const s = st.current;
    const camera = get().camera;
    const da = camera.position.clone();
    const fine = verso(a, guarda);
    const d = da.distanceTo(a);
    const ctrl = da.clone().add(a).multiplyScalar(0.5);
    ctrl.y += Math.min(d * 0.32, 26);
    const yawAttuale = s.yaw + s.offYaw, pitchAttuale = s.pitch + s.offPitch;
    s.offYaw = 0;
    s.offPitch = 0;
    s.volo = {
      da,
      a,
      ctrl,
      daYaw: yawAttuale,
      aYaw: yawAttuale + angolo(fine.yaw - yawAttuale),
      daPitch: pitchAttuale,
      aPitch: fine.pitch,
      t: 0,
      // ?subito: niente volo (serve alle prove automatiche)
      durata: subito ? 0.001 : (durata ?? THREE.MathUtils.clamp(d / 14, 1.4, 3.6)),
    };
  };
  /** Dietro il furgone, come in un gioco di guida. */
  const dietroAlFurgone = () => {
    const f = furgone.current as THREE.Group;
    const avanti = new THREE.Vector3(-Math.sin(f.rotation.y), 0, -Math.cos(f.rotation.y));
    return {
      pos: f.position.clone().addScaledVector(avanti, -9.5).add(new THREE.Vector3(0, 3.4, 0)),
      guarda: f.position.clone().addScaledVector(avanti, 5).add(new THREE.Vector3(0, 1.2, 0)),
    };
  };

  // posizione iniziale: sulla strada, guardando la casa
  useEffect(() => {
    const camera = get().camera;
    const z = zona("arrivo");
    camera.position.set(...z.camera);
    const v = verso(camera.position, new THREE.Vector3(...z.guarda));
    st.current.yaw = v.yaw;
    st.current.pitch = v.pitch;
    camera.rotation.set(v.pitch, v.yaw, 0, "YXZ");
    if (location.search.includes("subito")) {
      // per le prove automatiche: mettere la camera in un punto, guardando un altro
      const w = window as unknown as { __camera: THREE.Camera; __guarda: (p: number[], t: number[]) => void };
      w.__camera = camera;
      (window as unknown as { __scena: THREE.Scene }).__scena = get().scene;
      w.__guarda = (p, t) => {
        camera.position.set(p[0], p[1], p[2]);
        const v = verso(camera.position, new THREE.Vector3(t[0], t[1], t[2]));
        st.current.yaw = v.yaw;
        st.current.pitch = v.pitch;
        st.current.offYaw = st.current.offPitch = 0;
      };
    }
  }, [get]);

  // il volo verso la zona scelta; se la zona sta nell'altra area, prima il viaggio in furgone
  useEffect(() => {
    if (modo !== "guida") return;
    const s = st.current;
    const camera = get().camera;
    if (s.viaggio) return; // a viaggio finito si va comunque alla zona scelta per ultima
    const z = zona(zonaId);
    const vaLontano = ZONE_LONTANE.includes(zonaId);
    if (vaLontano !== lontano(camera.position.z) && furgone.current) {
      const daFattoria = !vaLontano;
      s.viaggio = {
        fase: "sale",
        t: 0,
        verso: vaLontano ? "lontano" : "casa",
        andata: new THREE.CatmullRomCurve3([furgone.current.position.clone(), ...(daFattoria ? STRADE.esceLontano : STRADE.esceCasa)]),
        ritorno: new THREE.CatmullRomCurve3(daFattoria ? STRADE.entraCasa : STRADE.entraLontano),
      };
      const d = dietroAlFurgone();
      vola(d.pos, d.guarda, 1.8);
      onScritta(vaLontano ? testi.andata : testi.ritorno);
      return;
    }
    const a = new THREE.Vector3(...z.camera);
    const fine = verso(a, new THREE.Vector3(...z.guarda));
    if (a.distanceTo(camera.position) < 0.05 && Math.abs(angolo(fine.yaw - s.yaw)) < 0.01) return;
    vola(a, new THREE.Vector3(...z.guarda));
  }, [modo, zonaId, get]); // eslint-disable-line react-hooks/exhaustive-deps

  // passando alla camminata si parte da dove si guarda, a terra
  useEffect(() => {
    if (modo !== "cammina") return;
    const s = st.current;
    s.volo = null;
    s.yaw += s.offYaw;
    s.pitch = THREE.MathUtils.clamp(s.pitch + s.offPitch, -0.6, 0.6);
    s.offYaw = s.offPitch = 0;
  }, [modo]);

  // trascinare per guardarsi intorno; tasti per camminare
  useEffect(() => {
    const el = gl.domElement;
    const s = st.current;
    const giu = (e: PointerEvent) => {
      s.premuto = true;
      s.puntatore = e.pointerId;
      s.ultimo = { x: e.clientX, y: e.clientY };
    };
    const muovi = (e: PointerEvent) => {
      if (!s.premuto || e.pointerId !== s.puntatore) return;
      const dx = e.clientX - s.ultimo.x, dy = e.clientY - s.ultimo.y;
      s.ultimo = { x: e.clientX, y: e.clientY };
      const k = e.pointerType === "touch" ? 0.0055 : 0.0035;
      if (Math.abs(dx) + Math.abs(dy) > 0) onMosso();
      if (modo === "cammina") {
        s.yaw += dx * k;
        s.pitch = THREE.MathUtils.clamp(s.pitch + dy * k, -1.2, 1.2);
      } else {
        s.offYaw = THREE.MathUtils.clamp(s.offYaw + dx * k, -1.3, 1.3);
        s.offPitch = THREE.MathUtils.clamp(s.offPitch + dy * k, -0.5, 0.5);
      }
    };
    const su = (e: PointerEvent) => {
      if (e.pointerId === s.puntatore) s.premuto = false;
    };
    const tasto = (e: KeyboardEvent, giuTasto: boolean) => {
      if ((e.target as HTMLElement)?.closest?.("input, textarea")) return;
      const k = e.key.toLowerCase();
      if (["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright", "shift"].includes(k)) {
        if (giuTasto) s.tasti.add(k);
        else s.tasti.delete(k);
        if (k.startsWith("arrow")) e.preventDefault();
      }
    };
    const kd = (e: KeyboardEvent) => tasto(e, true);
    const ku = (e: KeyboardEvent) => tasto(e, false);
    el.addEventListener("pointerdown", giu);
    window.addEventListener("pointermove", muovi);
    window.addEventListener("pointerup", su);
    window.addEventListener("pointercancel", su);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    return () => {
      el.removeEventListener("pointerdown", giu);
      window.removeEventListener("pointermove", muovi);
      window.removeEventListener("pointerup", su);
      window.removeEventListener("pointercancel", su);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
    };
  }, [gl, modo, onMosso]);

  useEffect(() => {
    const c = get().camera as THREE.PerspectiveCamera;
    c.fov = stretto ? 68 : 55;
    c.updateProjectionMatrix();
  }, [get, stretto]);

  useFrame(({ camera }, dtGrezzo) => {
    const dt = Math.min(dtGrezzo, 0.1);
    const s = st.current;
    const f = furgone.current;
    if (s.viaggio && !s.volo && f) {
      const v = s.viaggio;
      v.t += subito ? 10 : dt;
      const velo = (o: number) => onVelo(THREE.MathUtils.clamp(o, 0, 1));
      const sullaStrada = (curva: THREE.CatmullRomCurve3, u: number) => {
        const p = curva.getPointAt(THREE.MathUtils.clamp(u, 0, 1));
        const tg = curva.getTangentAt(THREE.MathUtils.clamp(u, 0, 1));
        f.position.copy(p);
        f.rotation.set(0, Math.atan2(-tg.x, -tg.z), 0);
        // la camera insegue il furgone, morbida
        const d = dietroAlFurgone();
        if (v.fase === "arriva" && v.t < dt * 1.5) camera.position.copy(d.pos);
        camera.position.lerp(d.pos, 1 - Math.exp(-5 * dt));
        const g = verso(camera.position, d.guarda);
        s.yaw = s.yaw + angolo(g.yaw - s.yaw) * (1 - Math.exp(-6 * dt));
        s.pitch = THREE.MathUtils.lerp(s.pitch, g.pitch, 1 - Math.exp(-6 * dt));
      };
      if (v.fase === "sale") {
        v.fase = "parte";
        v.t = 0;
      } else if (v.fase === "parte") {
        const D = 3.6;
        sullaStrada(v.andata, Math.pow(Math.min(v.t / D, 1), 1.7));
        velo((v.t - 2.5) / 0.9);
        if (v.t >= D) {
          v.fase = "buio";
          v.t = 0;
          velo(1);
        }
      } else if (v.fase === "buio") {
        if (v.t >= 1.1) {
          v.fase = "arriva";
          v.t = 0;
          sullaStrada(v.ritorno, 0);
          camera.position.copy(dietroAlFurgone().pos);
        }
      } else {
        const D = 3.4;
        sullaStrada(v.ritorno, 1 - Math.pow(1 - Math.min(v.t / D, 1), 1.8));
        velo(1 - v.t / 0.9);
        if (v.t >= D) {
          velo(0);
          s.viaggio = null;
          const z = zona(s.zona);
          vola(new THREE.Vector3(...z.camera), new THREE.Vector3(...z.guarda), 2.2);
        }
      }
      camera.rotation.set(s.pitch, s.yaw, 0, "YXZ");
      return;
    }
    if (s.volo) {
      const v = s.volo;
      v.t = Math.min(1, v.t + dt / v.durata);
      const k = facile(v.t);
      // bezier quadratica: si alza un poco a metà strada, per non passare attraverso il casale
      const a = v.da.clone().multiplyScalar((1 - k) * (1 - k));
      const b = v.ctrl.clone().multiplyScalar(2 * (1 - k) * k);
      const c = v.a.clone().multiplyScalar(k * k);
      camera.position.copy(a.add(b).add(c));
      s.yaw = THREE.MathUtils.lerp(v.daYaw, v.aYaw, k);
      s.pitch = THREE.MathUtils.lerp(v.daPitch, v.aPitch, k);
      if (v.t >= 1) s.volo = null;
    } else if (modo === "guida") {
      // un tasto di movimento (o il joystick) e si torna a camminare
      const t = s.tasti;
      if (t.has("w") || t.has("a") || t.has("s") || t.has("d") || t.has("arrowup") || t.has("arrowdown") || t.has("arrowleft") || t.has("arrowright") || movimento.current.x || movimento.current.y) onCammina();
      // lo sguardo spostato col trascinamento torna piano al centro
      if (!s.premuto) {
        s.offYaw *= Math.exp(-0.25 * dt);
        s.offPitch *= Math.exp(-0.25 * dt);
      }
    } else {
      // camminata
      const t = s.tasti;
      let av = movimento.current.y, la = movimento.current.x;
      if (t.has("w") || t.has("arrowup")) av += 1;
      if (t.has("s") || t.has("arrowdown")) av -= 1;
      if (t.has("d")) la += 1;
      if (t.has("a")) la -= 1;
      if (t.has("arrowleft")) s.yaw += dt * 1.6;
      if (t.has("arrowright")) s.yaw -= dt * 1.6;
      const vel = (t.has("shift") ? 9 : 4.2) * dt;
      if (av || la) {
        onMosso();
        const fx = -Math.sin(s.yaw), fz = -Math.cos(s.yaw);
        const p = camera.position;
        const prima = { x: p.x, z: p.z };
        p.x += (fx * av + -fz * la) * vel;
        p.z += (fz * av + fx * la) * vel;
        const base = lontano(p.z) ? ALTROVE[2] : 0;
        p.x = THREE.MathUtils.clamp(p.x, base ? -60 : -70, base ? 60 : 70);
        p.z = base ? THREE.MathUtils.clamp(p.z, base - 84, base + 60) : THREE.MathUtils.clamp(p.z, -92, 72);
        // il muretto davanti, tranne il cancello
        if (bloccato(prima.x, prima.z, p.x, p.z)) {
          // si prova a scivolare lungo l'ostacolo: prima solo in x, poi solo in z
          if (!bloccato(prima.x, prima.z, p.x, prima.z)) p.z = prima.z;
          else if (!bloccato(prima.x, prima.z, prima.x, p.z)) p.x = prima.x;
          else {
            p.x = prima.x;
            p.z = prima.z;
          }
        }
      }
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, OCCHI, 1 - Math.exp(-4 * dt));
      // in che zona si è
      let migliore: ZonaId = s.vicina, dm = Infinity;
      for (const [id, x, z] of AREE) {
        const d = Math.hypot(camera.position.x - x, camera.position.z - z);
        if (d < dm) {
          dm = d;
          migliore = id;
        }
      }
      if (migliore !== s.vicina) {
        s.vicina = migliore;
        onVicina(migliore);
      }
    }
    camera.rotation.set(s.pitch + s.offPitch, s.yaw + s.offYaw, 0, "YXZ");
  });
  return null;
}

/* ------------------------------------------------------------------ i segnaposti delle zone */

function Segnaposto({ id, attivo, lingua, vai, onVai }: { id: ZonaId; attivo: boolean; lingua: Lingua; vai: string; onVai: (id: ZonaId) => void }) {
  const z = zona(id);
  const pill = useMemo(() => pillola(z.nome[lingua], vai), [z.nome, lingua, vai]);
  const sprite = useRef<THREE.Sprite>(null);
  const anello = useRef<THREE.Mesh>(null);
  const materialeAnello = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    if (anello.current && materialeAnello.current) {
      const k = (t * 0.6) % 1;
      anello.current.scale.setScalar(0.6 + k * 1.6);
      materialeAnello.current.opacity = (1 - k) * 0.7;
      anello.current.visible = !attivo && ZONE_LONTANE.includes(id) === lontano(camera.position.z);
    }
    if (sprite.current) {
      // più grande da lontano, per restare leggibile; nascosto nella zona in cui si è
      const d = camera.position.distanceTo(sprite.current.position);
      const h = THREE.MathUtils.clamp(d * 0.042, 0.55, 3.4);
      sprite.current.scale.set(h * pill.rapporto, h, 1);
      sprite.current.position.y = z.segno[1] + Math.sin(t * 1.4 + z.segno[0]) * 0.12;
      const m = sprite.current.material as THREE.SpriteMaterial;
      const altraArea = ZONE_LONTANE.includes(id) !== lontano(camera.position.z);
      m.opacity = THREE.MathUtils.lerp(m.opacity, attivo || altraArea ? 0 : 1, 0.08);
      sprite.current.visible = m.opacity > 0.03;
    }
  });
  const clic = (e: ThreeEvent<MouseEvent>) => {
    if (attivo || e.delta > 8) return;
    e.stopPropagation();
    onVai(id);
  };
  return (
    <group>
      <sprite
        ref={sprite}
        position={z.segno}
        renderOrder={20}
        onClick={clic}
        onPointerOver={() => {
          if (!attivo) document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <spriteMaterial map={pill.texture} transparent depthTest={false} depthWrite={false} />
      </sprite>
      <mesh ref={anello} position={[z.segno[0], 0.08, z.segno[2]]} rotation-x={-Math.PI / 2}>
        <ringGeometry args={[0.8, 0.95, 40]} />
        <meshBasicMaterial ref={materialeAnello} color="#D9C26A" transparent depthWrite={false} />
      </mesh>
    </group>
  );
}

function Pronta({ onPronta }: { onPronta: () => void }) {
  const n = useRef(0);
  useFrame(() => {
    n.current++;
    if (n.current === 4) onPronta();
  });
  return null;
}

export default function Scena(props: Props & { testi: { andata: string; ritorno: string; vai: string } }) {
  const ombre = !props.stretto;
  const furgone = useRef<THREE.Group>(null);
  // il trattore parcheggiato all'aia, col muso verso la strada (valori fissi: r3f non li riapplica)
  const parcheggio = useMemo(() => ({ p: TRATTORE_CASA.p, r: Math.PI }), []);
  return (
    <Canvas
      className="tela"
      shadows={ombre ? "soft" : false}
      dpr={props.stretto ? [1, 1.5] : [1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ fov: 55, near: 0.1, far: 600, position: [0, OCCHI, 46] }}
    >
      <Cielo />
      <Luci ombre={ombre} />
      <Regia
        modo={props.modo}
        zonaId={props.zonaId}
        movimento={props.movimento}
        onVicina={props.onVicina}
        onMosso={props.onMosso}
        onCammina={props.onCammina}
        stretto={props.stretto}
        furgone={furgone}
        onVelo={props.onVelo}
        onScritta={props.onScritta}
        testi={props.testi}
      />
      <Terreno ridotto={props.stretto} />
      <CasaInCampagna faseAgrumeto={props.fasi.agrumeto} />
      <Uliveto fase={props.fasi.uliveto} dove="casa" />
      <group position={ALTROVE}>
        <Uliveto fase={3} dove="lontano" />
        <Frantoio fase={props.fasi.frantoio} />
        <Cassone p={CASSONE.p} r={CASSONE.r} />
      </group>
      <Furgone ref={furgone} position={parcheggio.p} rotation={[0, parcheggio.r, 0]} lingua={props.lingua} onClic={(qui) => props.onVai(qui ? "casa" : "chiaramonte")} />
      <Cartello p={CARTELLO_CASA} verso={0.5} lingua={props.lingua} onClic={() => props.onVai("chiaramonte")} />
      <Oggetti faseUliveto={props.fasi.uliveto} />
      <Quadri lingua={props.lingua} onApri={props.onApri} />
      <Percorsi visibile={props.modo === "cammina"} lingua={props.lingua} />
      <Persone zonaLivio={props.zonaId} parlante={props.parlante} lingua={props.lingua} onParla={props.onParla} />
      {ZONE.map((z) => (
        <Segnaposto key={z.id} id={z.id} attivo={props.modo === "guida" && props.zonaId === z.id} lingua={props.lingua} vai={props.testi.vai} onVai={props.onVai} />
      ))}
      <Pronta onPronta={props.onPronta} />
    </Canvas>
  );
}
