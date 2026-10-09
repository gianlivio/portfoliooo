"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { PELO_ACQUA, gocce } from "./condivisi";
import { type Ospite, assi, attesa, azzeraTurni, casuale, solo } from "./ospiti/comuni";
import { Nave } from "./ospiti/nave";
import { Drago } from "./ospiti/drago";
import { Achille } from "./ospiti/achille";
import { Icaro } from "./ospiti/icaro";
import { Aereo, Jet } from "./ospiti/cieli";
import { Tralicci } from "./ospiti/tralicci";
import { Metafisica } from "./ospiti/metafisica";
import { SOLE } from "./condivisi";

/**
 * Ciò che ogni tanto passa per la stanza, davanti a dove si sta guardando.
 * Notte: stelle cadenti; gocce che cadono sull'acqua e la increspano in cerchi;
 * la nave di Ulisse, fantasma, che attraversa l'acqua a remi; di rado un drago nel cielo.
 * e, a turno col drago, un aereo di linea con le sue luci.
 * Giorno: Achille che insegue la tartaruga senza raggiungerla mai;
 * di rado Icaro e, a turno con lui, un jet con le scie.
 * Sempre, di notte, due elettrodotti all'orizzonte con le luci rosse in cima ai tralicci.
 * Con "riduci movimento" non passa niente. Con ?ospiti nell'indirizzo passano subito e spesso.
 */

/** Direzione orizzontale verso cui guarda la camera, come angolo (0 = −z). */
function yawCamera(camera: THREE.Camera) {
  const d = camera.getWorldDirection(new THREE.Vector3());
  return Math.atan2(d.x, -d.z);
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
        s.slot = (s.slot + 1) % 4; // le altre sono dei remi della nave
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

/* --------------------------------------------------------------------- ospiti */

/** Monta un ospite (oggetto three con il suo ciclo) e lo fa vivere a ogni fotogramma. */
function Presenza({ crea }: { crea: () => Ospite }) {
  const o = useMemo(() => crea(), [crea]);
  useEffect(() => () => o.libera(), [o]);
  useFrame(({ clock, camera }, dt) => o.aggiorna(clock.elapsedTime, Math.min(dt, 0.1), camera));
  return <primitive object={o.gruppo} />;
}

const creaNave = () => new Nave();
const creaDrago = () => new Drago();
const creaAchille = () => new Achille();
const creaIcaro = () => new Icaro();
const creaAereo = () => new Aereo();
const creaJet = () => new Jet();
const creaTralicci = () => new Tralicci();
const creaMetafisica = () => new Metafisica();

/* --------------------------------------------------------------------- insieme */

export default function Fauna({ notte, ridotto }: { notte: boolean; ridotto: boolean; stretto?: boolean }) {
  const scelto = useMemo(() => solo(), []);
  // la scena si rimonta a ogni cambio di tema o lingua, con l'orologio da capo: i turni pure
  useEffect(() => azzeraTurni(), []);
  if (ridotto) return null;
  const c = (nome: string) => !scelto || scelto === nome;
  return notte ? (
    <>
      {c("stelle") && <StelleCadenti />}
      {c("gocce") && <Gocce />}
      {c("nave") && <Presenza crea={creaNave} />}
      {c("drago") && <Presenza crea={creaDrago} />}
      {c("aereo") && <Presenza crea={creaAereo} />}
      <Presenza crea={creaTralicci} />
    </>
  ) : (
    <>
      {/* la luce bassa e dorata della piazza: illumina gli edifici e gli ospiti, le carte no */}
      <hemisphereLight args={["#CFE0CF", "#B9946A", 0.95]} />
      <directionalLight position={[SOLE.x * 30, SOLE.y * 30, SOLE.z * 30]} intensity={2.3} color="#FFD7A0" />
      <Presenza crea={creaMetafisica} />
      {c("tartaruga") && <Presenza crea={creaAchille} />}
      {c("icaro") && <Presenza crea={creaIcaro} />}
      {c("jet") && <Presenza crea={creaJet} />}
    </>
  );
}
