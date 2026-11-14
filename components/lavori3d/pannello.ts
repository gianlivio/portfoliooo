import * as THREE from "three";
import { adatta, cantiere, motivo, rettangoloArrotondato, type DatiCopertina, type Famiglie } from "../copertina";

/*
 * Il pannello di un lavoro: un totem verticale, alto e stretto, piantato a terra.
 * In alto lo schermo, dove la pagina del sito scorre dall'alto in basso e poi si allontana per mostrarsi
 * intera; in basso la fascia col numero, il tipo, il titolo e l'indirizzo.
 * La tela del pannello ha la finestra vuota: dietro c'è il piano dello schermo, con il suo materiale.
 */

/** Il pannello in metri, prima della grandezza del piano (content/lavori.ts). */
export const PANNELLO = { largo: 1.22, alto: 2.12, daTerra: 0.1 };
/** La tela: stesse proporzioni del pannello. */
const TL = 640;
const TA = Math.round((TL * PANNELLO.alto) / PANNELLO.largo);
const M = 22; // margine attorno alla finestra, in pixel
const FASCIA = 250; // la fascia del testo, in basso
/** La finestra dello schermo, in pixel della tela. */
const FIN = { x: M, y: M, w: TL - 2 * M, h: TA - M - FASCIA };
/** La finestra in metri, nel piano del pannello (centro del pannello in 0,0). */
export const SCHERMO = {
  largo: (FIN.w / TL) * PANNELLO.largo,
  alto: (FIN.h / TA) * PANNELLO.alto,
  x: ((FIN.x + FIN.w / 2) / TL - 0.5) * PANNELLO.largo,
  y: (0.5 - (FIN.y + FIN.h / 2) / TA) * PANNELLO.alto,
};

const INCHIOSTRO = "#16171A";
const GRIGIO = "#77786F";

/** Disegna il pannello sulla tela. Senza schermata (lavori in costruzione) la finestra ha il suo motivo. */
export function disegnaPannello(
  tela: HTMLCanvasElement,
  dati: Omit<DatiCopertina, "immagine" | "finestraVuota">,
  famiglie: Famiglie,
  seme: number,
  carta: string,
  conSchermo: boolean
) {
  tela.width = TL;
  tela.height = TA;
  const x = tela.getContext("2d");
  if (!x) return;
  x.clearRect(0, 0, TL, TA);
  rettangoloArrotondato(x, 0, 0, TL, TA, 24);
  x.fillStyle = carta;
  x.fill();
  x.save();
  x.clip();
  rettangoloArrotondato(x, FIN.x, FIN.y, FIN.w, FIN.h, 12);
  if (conSchermo) {
    x.save();
    x.globalCompositeOperation = "destination-out";
    x.fill();
    x.restore();
  } else {
    x.fillStyle = dati.tinta;
    x.fill();
    x.save();
    x.clip();
    if (dati.motivo === "cantiere") cantiere(x, FIN.x, FIN.y, FIN.w, FIN.h, dati.avviso ?? "", famiglie);
    else motivo(x, dati.motivo, FIN.x, FIN.y, FIN.w, FIN.h, seme);
    x.restore();
  }

  // la fascia: numero e tipo, il titolo grande, l'indirizzo
  const y0 = FIN.y + FIN.h + 52;
  x.textBaseline = "alphabetic";
  x.fillStyle = GRIGIO;
  x.font = `500 19px ${famiglie.mono}`;
  x.fillText(dati.numero, M + 2, y0);
  x.font = `400 19px ${famiglie.mono}`;
  const tipo = [dati.tipo.toUpperCase(), dati.anno].filter(Boolean).join("  ·  ");
  x.fillText(adatta(x, tipo, TL - 2 * M - 52), M + 48, y0);
  x.fillStyle = INCHIOSTRO;
  let corpo = 62;
  x.font = `300 ${corpo}px ${famiglie.serif}`;
  while (x.measureText(dati.titolo).width > TL - 2 * M && corpo > 38) {
    corpo -= 2;
    x.font = `300 ${corpo}px ${famiglie.serif}`;
  }
  x.fillText(adatta(x, dati.titolo, TL - 2 * M), M - 2, y0 + 84);
  x.fillStyle = GRIGIO;
  x.font = `400 20px ${famiglie.mono}`;
  x.fillText(adatta(x, dati.dominio, TL - 2 * M), M + 2, TA - M - 14);
  x.restore();
}

/** La scritta "Apri ↗" che compare sullo schermo quando ci si passa sopra. */
export function disegnaApri(testo: string, mono: string) {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 96;
  const x = c.getContext("2d") as CanvasRenderingContext2D;
  rettangoloArrotondato(x, 4, 4, 312, 88, 44);
  x.fillStyle = "#1B3FD1";
  x.fill();
  x.fillStyle = "#FFFFFF";
  x.font = `500 34px ${mono}`;
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(testo, 160, 50);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/*
 * Lo schermo: mostra un rettangolo della pagina (uRett: u, v, larghezza, altezza in coordinate della texture);
 * fuori dalla pagina, il fondo. Così la pagina può scorrere e allontanarsi restando in proporzione.
 */
const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = `
uniform sampler2D uPagina;
uniform vec4 uRett;
uniform vec3 uFondo;
uniform float uOpacita;
varying vec2 vUv;
void main(){
  vec2 t = uRett.xy + vUv * uRett.zw;
  vec3 c = uFondo;
  if (t.x >= 0.0 && t.x <= 1.0 && t.y >= 0.0 && t.y <= 1.0) c = texture2D(uPagina, t).rgb;
  gl_FragColor = vec4(c, uOpacita);
  #include <colorspace_fragment>
}`;

export type Schermo = THREE.ShaderMaterial & {
  uniforms: { uPagina: { value: THREE.Texture }; uRett: { value: THREE.Vector4 }; uFondo: { value: THREE.Color }; uOpacita: { value: number } };
};

export function materialeSchermo(pagina: THREE.Texture) {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uPagina: { value: pagina },
      uRett: { value: new THREE.Vector4(0, 0, 1, 1) },
      uFondo: { value: new THREE.Color("#E4E2DC") },
      uOpacita: { value: 0 },
    },
    transparent: true,
    toneMapped: false,
  }) as Schermo;
}

/**
 * Il giro della pagina nello schermo: ferma in cima, scorre fino in fondo, si allontana per mostrarsi intera,
 * torna in cima. velocita in altezze di pagina al secondo; fase per sfasare i pannelli fra loro.
 * Torna il rettangolo da mostrare.
 */
export function giroPagina(t: number, rapportoPagina: number, velocita: number, out: THREE.Vector4) {
  const aS = SCHERMO.largo / SCHERMO.alto; // larghezza / altezza dello schermo
  const q = Math.min(1, rapportoPagina / aS); // quanta altezza di pagina entra a piena larghezza
  const corsa = 1 - q;
  const FERMA = 1.2, ZOOM = 1.1, INTERA = 1.8;
  const scorre = corsa / velocita;
  const durata = FERMA + scorre + 0.4 + ZOOM + INTERA + ZOOM;
  let k = t % durata;
  const liscio = (v: number) => v * v * (3 - 2 * v);
  // dv: quanta altezza di pagina si vede; cy: il centro, dall'alto (0 = cima)
  let dv = q, cy = q / 2;
  if (k < FERMA) {
    cy = q / 2;
  } else if ((k -= FERMA) < scorre) {
    cy = q / 2 + corsa * liscio(k / scorre);
  } else if ((k -= scorre) < 0.4) {
    cy = 1 - q / 2;
  } else if ((k -= 0.4) < ZOOM) {
    const f = liscio(k / ZOOM);
    dv = THREE.MathUtils.lerp(q, 1.08, f);
    cy = THREE.MathUtils.lerp(1 - q / 2, 0.5, f);
  } else if ((k -= ZOOM) < INTERA) {
    dv = 1.08;
    cy = 0.5;
  } else {
    const f = liscio(Math.min(1, (k - INTERA) / ZOOM));
    dv = THREE.MathUtils.lerp(1.08, q, f);
    cy = THREE.MathUtils.lerp(0.5, q / 2, f);
  }
  const du = (dv * aS) / rapportoPagina;
  // la texture ha v = 1 in cima alla pagina
  out.set(0.5 - du / 2, 1 - cy - dv / 2, du, dv);
  return out;
}
