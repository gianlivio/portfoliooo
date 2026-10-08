"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * La storia sul pavimento della stanza, in pittogrammi da segnaletica:
 * bosco → due persone si incontrano → caccia → fuoco → ruota → capanne → case → città
 * → l'inquadratura si allontana e le città si collegano in rete. Poi ricomincia.
 * Un ciclo di CICLO secondi. Con "riduci movimento" resta ferma sulla città in rete.
 */

const CICLO = 104;
const SUOLO = -1.55;
const R_STORIA = 4.95;
const GRUPPI = 6;

type Icona =
  | "albero" | "persona0" | "persona1" | "cacciatore" | "cervo" | "fuoco"
  | "carro" | "capanna" | "casa" | "palazzo0" | "palazzo1" | "palazzo2" | "punto";

/* ------------------------------------------------------------ pittogrammi */

function tela(disegna: (c: CanvasRenderingContext2D) => void) {
  const t = document.createElement("canvas");
  t.width = t.height = 256;
  const c = t.getContext("2d");
  if (c) {
    c.fillStyle = c.strokeStyle = "#FFFFFF";
    c.lineCap = c.lineJoin = "round";
    disegna(c);
  }
  const tx = new THREE.CanvasTexture(t);
  tx.colorSpace = THREE.SRGBColorSpace;
  return tx;
}

function persona(c: CanvasRenderingContext2D, passo: number) {
  c.beginPath();
  c.arc(128, 42, 22, 0, Math.PI * 2);
  c.fill();
  c.beginPath();
  c.roundRect(106, 72, 44, 82, 16);
  c.fill();
  c.lineWidth = 17;
  c.beginPath();
  c.moveTo(108, 84); c.lineTo(94 - passo * 10, 146);
  c.moveTo(148, 84); c.lineTo(162 + passo * 10, 146);
  c.moveTo(118, 150); c.lineTo(106 - passo * 18, 240);
  c.moveTo(138, 150); c.lineTo(150 + passo * 18, 240);
  c.stroke();
}

function disegnaIcone(): Record<Icona, THREE.CanvasTexture> {
  return {
    albero: tela((c) => {
      c.fillRect(118, 196, 20, 50);
      for (const [y, w] of [[30, 60], [80, 90], [130, 116]] as const) {
        c.beginPath();
        c.moveTo(128, y); c.lineTo(128 - w, y + 80); c.lineTo(128 + w, y + 80);
        c.closePath(); c.fill();
      }
    }),
    persona0: tela((c) => persona(c, 1)),
    persona1: tela((c) => persona(c, 0.15)),
    cacciatore: tela((c) => {
      persona(c, 0.6);
      c.lineWidth = 7;
      c.beginPath(); c.moveTo(196, 12); c.lineTo(170, 246); c.stroke();
      c.beginPath(); c.moveTo(196, 0); c.lineTo(186, 30); c.lineTo(206, 30); c.closePath(); c.fill();
    }),
    cervo: tela((c) => {
      c.beginPath(); c.ellipse(118, 140, 70, 30, 0, 0, Math.PI * 2); c.fill();
      c.lineWidth = 13;
      c.beginPath();
      for (const x of [66, 88, 148, 170]) { c.moveTo(x, 156); c.lineTo(x + (x < 120 ? -6 : 6), 240); }
      c.moveTo(176, 126); c.lineTo(204, 70);
      c.stroke();
      c.beginPath(); c.ellipse(212, 62, 22, 13, -0.5, 0, Math.PI * 2); c.fill();
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(204, 52); c.lineTo(188, 18); c.moveTo(194, 32); c.lineTo(174, 26);
      c.moveTo(214, 50); c.lineTo(226, 14); c.moveTo(222, 30); c.lineTo(240, 22);
      c.stroke();
    }),
    fuoco: tela((c) => {
      const fiamma = (x: number, h: number, w: number) => {
        c.beginPath();
        c.moveTo(x, 236 - h);
        c.bezierCurveTo(x + w, 236 - h * 0.45, x + w * 0.8, 236, x, 236);
        c.bezierCurveTo(x - w * 0.8, 236, x - w, 236 - h * 0.45, x, 236 - h);
        c.fill();
      };
      fiamma(128, 190, 58); fiamma(80, 110, 34); fiamma(178, 124, 36);
    }),
    carro: tela((c) => {
      c.fillRect(30, 120, 196, 54);
      c.lineWidth = 10;
      for (const x of [76, 180]) {
        c.beginPath(); c.arc(x, 196, 40, 0, Math.PI * 2); c.stroke();
        for (let k = 0; k < 4; k++) {
          const a = (k * Math.PI) / 4;
          c.beginPath();
          c.moveTo(x - Math.cos(a) * 40, 196 - Math.sin(a) * 40);
          c.lineTo(x + Math.cos(a) * 40, 196 + Math.sin(a) * 40);
          c.stroke();
        }
      }
    }),
    capanna: tela((c) => {
      c.beginPath(); c.moveTo(128, 40); c.lineTo(20, 244); c.lineTo(236, 244); c.closePath(); c.fill();
      c.globalCompositeOperation = "destination-out";
      c.beginPath(); c.moveTo(128, 150); c.lineTo(100, 244); c.lineTo(156, 244); c.closePath(); c.fill();
    }),
    casa: tela((c) => {
      c.beginPath(); c.moveTo(128, 30); c.lineTo(16, 120); c.lineTo(240, 120); c.closePath(); c.fill();
      c.fillRect(40, 116, 176, 130);
      c.globalCompositeOperation = "destination-out";
      c.fillRect(110, 176, 36, 70);
      c.fillRect(60, 146, 30, 30); c.fillRect(166, 146, 30, 30);
    }),
    palazzo0: tela((c) => palazzo(c, 70, 20, 4)),
    palazzo1: tela((c) => palazzo(c, 100, 60, 3)),
    palazzo2: tela((c) => palazzo(c, 160, 10, 5)),
    punto: tela((c) => {
      c.beginPath(); c.arc(128, 128, 60, 0, Math.PI * 2); c.fill();
    }),
  };
}

function palazzo(c: CanvasRenderingContext2D, largo: number, alto: number, colonne: number) {
  const x0 = 128 - largo / 2;
  c.fillRect(x0, alto, largo, 256 - alto);
  c.globalCompositeOperation = "destination-out";
  const passo = largo / colonne;
  for (let y = alto + 16; y < 236; y += 24) {
    for (let k = 0; k < colonne; k++) c.fillRect(x0 + k * passo + passo * 0.3, y, passo * 0.4, 12);
  }
  c.globalCompositeOperation = "source-over";
}

/* -------------------------------------------------------------- scenario */

type Elemento = {
  icona: Icona;
  angolo: number;
  raggio: number;
  alto: number;
  /** restituisce visibilità 0–1, angolo e scala al tempo t del ciclo */
  stato: (t: number) => { v: number; angolo?: number; scala?: number; icona?: Icona };
};

const tra = (t: number, a: number, b: number) => THREE.MathUtils.clamp((t - a) / (b - a), 0, 1);
const finestra = (t: number, entra: number, esce: number, morbido = 2.5) =>
  Math.min(tra(t, entra, entra + morbido), 1 - tra(t, esce - morbido, esce));

function costruisciScenario(): Elemento[] {
  let s = 1234;
  const rnd = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const el: Elemento[] = [];
  const centri = Array.from({ length: GRUPPI }, (_, k) => (k / GRUPPI) * Math.PI * 2 + 0.27);

  // il bosco: c'è all'inizio, si dirada con le capanne, sparisce con le città
  for (let k = 0; k < 44; k++) {
    const angolo = rnd() * Math.PI * 2;
    const resta = rnd() < 0.3;
    el.push({
      icona: "albero", angolo, raggio: 4.4 + rnd() * 1.1, alto: 0.32 + rnd() * 0.22,
      stato: (t) => ({ v: finestra(t, 0.5 + rnd0(k) * 3, resta ? 80 : 58 + rnd0(k) * 6) }),
    });
  }

  centri.forEach((c, g) => {
    const dopo = g * 0.6;
    // due persone vengono una incontro all'altra
    for (const lato of [-1, 1]) {
      const da = c + lato * 0.3;
      const a = c + lato * 0.045;
      el.push({
        icona: "persona0", angolo: da, raggio: R_STORIA - 0.15, alto: 0.3,
        stato: (t) => {
          const p = THREE.MathUtils.smootherstep(t, 10 + dopo, 21 + dopo);
          const cammina = p > 0 && p < 1;
          const caccia = lato === -1 && t > 25 && t < 37;
          return {
            v: finestra(t, 9 + dopo, 66),
            angolo: THREE.MathUtils.lerp(da, a, p),
            icona: caccia ? "cacciatore" : cammina && Math.floor(t * 3.2) % 2 ? "persona1" : "persona0",
          };
        },
      });
    }
    // il cervo: compare e scappa
    el.push({
      icona: "cervo", angolo: c + 0.4, raggio: R_STORIA + 0.2, alto: 0.3,
      stato: (t) => ({
        v: finestra(t, 25 + dopo * 0.5, 34 + dopo * 0.5, 1.5),
        angolo: c + 0.4 + THREE.MathUtils.smoothstep(t, 28, 34) * 0.5,
      }),
    });
    // il fuoco fra le due persone
    el.push({
      icona: "fuoco", angolo: c, raggio: R_STORIA - 0.35, alto: 0.2,
      stato: (t) => ({ v: finestra(t, 36 + dopo * 0.4, 64), scala: 1 + Math.sin(t * 9 + g) * 0.06 }),
    });
    // capanne, poi case, poi palazzi intorno al fuoco
    for (let k = 0; k < 4; k++) {
      const a = c + (k - 1.5) * 0.13 + (rnd() - 0.5) * 0.03;
      const r = R_STORIA + 0.15 + rnd() * 0.45;
      el.push({ icona: "capanna", angolo: a, raggio: r, alto: 0.28, stato: (t) => ({ v: finestra(t, 55 + k, 67 + k * 0.5) }) });
    }
    for (let k = 0; k < 6; k++) {
      const a = c + (k - 2.5) * 0.11 + (rnd() - 0.5) * 0.03;
      const r = R_STORIA + 0.1 + rnd() * 0.55;
      el.push({ icona: "casa", angolo: a, raggio: r, alto: 0.3, stato: (t) => ({ v: finestra(t, 66 + k * 0.6, 78 + k * 0.4) }) });
    }
    for (let k = 0; k < 9; k++) {
      const a = c + (k - 4) * 0.075 + (rnd() - 0.5) * 0.02;
      const r = R_STORIA + 0.05 + rnd() * 0.6;
      const tipo = (["palazzo0", "palazzo1", "palazzo2"] as const)[Math.floor(rnd() * 3)];
      const h = 0.38 + rnd() * 0.5;
      el.push({
        icona: tipo, angolo: a, raggio: r, alto: h,
        // nella veduta da lontano i palazzi si rimpiccioliscono e si stringono intorno al centro
        stato: (t) => {
          const lontano = THREE.MathUtils.smootherstep(t, 86, 92);
          return {
            v: finestra(t, 76 + k * 0.5, 101),
            scala: 1 - lontano * 0.55,
            angolo: THREE.MathUtils.lerp(a, c + (a - c) * 0.55, lontano),
          };
        },
      });
    }
  });

  // la ruota: un carro fa il giro della stanza
  el.push({
    icona: "carro", angolo: 0, raggio: R_STORIA - 0.25, alto: 0.24,
    stato: (t) => ({ v: finestra(t, 44, 57, 1.5), angolo: 0.27 + ((t - 44) / 13) * Math.PI * 0.9 }),
  });

  // nella veduta da lontano compaiono città piccole fra un gruppo e l'altro
  for (let k = 0; k < 30; k++) {
    const angolo = rnd() * Math.PI * 2;
    el.push({
      icona: (["palazzo0", "palazzo1", "palazzo2"] as const)[k % 3], angolo, raggio: 5.2 + rnd() * 0.5, alto: 0.14 + rnd() * 0.16,
      stato: (t) => ({ v: finestra(t, 88 + rnd0(k) * 4, 101) }),
    });
  }
  return el;
}

/** un numero pseudo-casuale fisso per indice, usato dentro le funzioni di stato */
function rnd0(k: number) {
  const x = Math.sin(k * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/* -------------------------------------------------------------- componente */

export default function Storia({
  colore, opacita, ridotto, attenuata,
}: {
  colore: string;
  opacita: number;
  ridotto: boolean;
  attenuata: boolean;
}) {
  const icone = useMemo(() => disegnaIcone(), []);
  const scenario = useMemo(() => costruisciScenario(), []);
  const sprite = useRef<(THREE.Sprite | null)[]>([]);
  const rete = useRef<THREE.Group>(null);
  const forza = useRef(0);

  const centri = useMemo(
    () => Array.from({ length: GRUPPI }, (_, k) => (k / GRUPPI) * Math.PI * 2 + 0.27),
    []
  );

  // archi della rete fra città vicine, con un punto che li percorre
  const archi = useMemo(
    () =>
      centri.map((a, k) => {
        const b = centri[(k + 1) % GRUPPI] + (k === GRUPPI - 1 ? Math.PI * 2 : 0);
        const p0 = new THREE.Vector3(Math.sin(a) * R_STORIA, SUOLO + 0.3, -Math.cos(a) * R_STORIA);
        const p2 = new THREE.Vector3(Math.sin(b) * R_STORIA, SUOLO + 0.3, -Math.cos(b) * R_STORIA);
        const m = (a + b) / 2;
        const p1 = new THREE.Vector3(Math.sin(m) * R_STORIA * 0.82, SUOLO + 1.1, -Math.cos(m) * R_STORIA * 0.82);
        return new THREE.QuadraticBezierCurve3(p0, p1, p2);
      }),
    [centri]
  );
  const linee = useMemo(
    () =>
      archi.map(
        (curva) =>
          new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(curva.getPoints(48)),
            new THREE.LineBasicMaterial({ color: colore, transparent: true, opacity: 0, depthWrite: false })
          )
      ),
    [archi, colore]
  );
  const punti = useRef<(THREE.Sprite | null)[]>([]);

  useEffect(
    () => () => {
      Object.values(icone).forEach((t) => t.dispose());
      linee.forEach((l) => {
        l.geometry.dispose();
        (l.material as THREE.Material).dispose();
      });
    },
    [icone, linee]
  );

  useFrame((stato, dt) => {
    // con "riduci movimento" la storia resta sulla città in rete
    const t = ridotto ? 95 : stato.clock.elapsedTime % CICLO;
    forza.current = THREE.MathUtils.lerp(forza.current, attenuata ? 0.25 : 1, 1 - Math.exp(-dt * 3));
    const base = opacita * forza.current;

    scenario.forEach((e, i) => {
      const sp = sprite.current[i];
      if (!sp) return;
      const st = e.stato(t);
      const ang = st.angolo ?? e.angolo;
      const sc = st.scala ?? 1;
      sp.visible = st.v > 0.01;
      if (!sp.visible) return;
      sp.position.set(Math.sin(ang) * e.raggio, SUOLO, -Math.cos(ang) * e.raggio);
      sp.scale.set(e.alto * sc, e.alto * sc, 1);
      const mat = sp.material as THREE.SpriteMaterial;
      mat.opacity = st.v * base;
      const ic = icone[st.icona ?? e.icona];
      if (mat.map !== ic) {
        mat.map = ic;
        mat.needsUpdate = true;
      }
    });

    const r = THREE.MathUtils.smoothstep(t, 90, 94) * (1 - tra(t, 99, 101.5));
    linee.forEach((l) => ((l.material as THREE.LineBasicMaterial).opacity = r * base * 0.8));
    archi.forEach((curva, k) => {
      const p = punti.current[k];
      if (!p) return;
      p.visible = r > 0.01;
      curva.getPoint(((t * 0.18 + k * 0.37) % 1), p.position);
      (p.material as THREE.SpriteMaterial).opacity = r * base;
    });
    if (rete.current) rete.current.visible = r > 0.01;
  });

  return (
    <group>
      {scenario.map((e, i) => (
        <sprite
          key={i}
          ref={(s) => {
            sprite.current[i] = s;
          }}
          center={[0.5, 0]}
          raycast={() => null}
          visible={false}
        >
          <spriteMaterial map={icone[e.icona]} color={colore} transparent opacity={0} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
      <group ref={rete}>
        {linee.map((l, k) => (
          <primitive key={k} object={l} raycast={() => null} />
        ))}
        {archi.map((_, k) => (
          <sprite
            key={k}
            ref={(s) => {
              punti.current[k] = s;
            }}
            scale={[0.07, 0.07, 1]}
            raycast={() => null}
          >
            <spriteMaterial map={icone.punto} color={colore} transparent opacity={0} depthWrite={false} toneMapped={false} />
          </sprite>
        ))}
      </group>
    </group>
  );
}
