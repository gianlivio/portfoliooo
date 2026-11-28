// Cattura le pagine dei siti dei lavori in public/lavori/<id>.jpg (pagina intera, fino a 2800 px)
// e scrive in content/schermate.json l'elenco delle catture riuscite.
// Gira nell'azione GitHub .github/workflows/schermate.yml; in locale: node scripts/schermate.mjs
import { chromium } from "playwright";
import { writeFileSync, mkdirSync, existsSync } from "node:fs";

// shop.puntoluce.net e puntoluce.net/comefare sono dietro la verifica anti-bot di Cloudflare:
// le loro schermate si aggiungono a mano in public/lavori/ (shop.jpg, blog.jpg).
// Un lavoro può chiedere la vista da telefono, che mette in primo piano ciò che sta in alto nella pagina
// (per l'Osservatorio, il mappamondo coi flussi della pagina «Da dove arrivano»).
const TELEFONO = new Set(["osservatorio"]);
const lavori = {
  bellelli: "https://www.bellelliufficio.it",
  "8fly": "https://www.8fly.it",
  sanires: "https://www.sanires.com",
  ghigomiranda: "https://www.ghigomiranda.it",
  osservatorio: "https://osservatorioaccoglienza.org/paesi",
  livellozero: "https://livellozero.games",
  ndnluxury: "https://www.ndnluxury.com",
  esh: "https://www.eshousing.com",
  beautybroker: "https://www.beautybrokerworld.com",
  allstudios: "https://www.allstudia.com",
  jointoyou: "https://jointoyou.it",
  copystudio: "https://www.copystudio.it",
  hetaweb: "https://hetaweb.it",
};

// banner dei cookie: si nascondono, non si accettano
const NASCONDI = `#CybotCookiebotDialog,#CybotCookiebotDialogBodyUnderlay,.iubenda-cs-container,#iubenda-cs-banner,
#onetrust-banner-sdk,#onetrust-consent-sdk,.cky-consent-container,.cmplz-cookiebanner,#cookie-law-info-bar,
.cookie-notice-container,#cookie-notice,[id*="cookie-banner"],[class*="cookie-banner"],#moove_gdpr_cookie_info_bar
{display:none!important}`;

mkdirSync("public/lavori", { recursive: true });
// WebGL anche senza scheda grafica: i mappamondi e le animazioni in canvas vengono disegnati
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const desktop = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.75 });
// telefono: 390 px di larghezza, a 2x (780 px di immagine); fino a 1400 px di pagina
const telefono = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })).newPage();
const fatte = [];
for (const [id, url] of Object.entries(lavori)) {
  const tel = TELEFONO.has(id);
  const pagina = tel ? telefono : desktop;
  const largo = tel ? 390 : 1280, basso = tel ? 844 : 800, tetto = tel ? 1400 : 2800;
  try {
    await pagina.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await pagina.addStyleTag({ content: NASCONDI });
    // popup e veli a tutto schermo: via tutto ciò che è fisso e copre più di metà della finestra
    await pagina.evaluate(() => {
      for (const el of document.querySelectorAll("body *")) {
        const st = getComputedStyle(el);
        if (st.position !== "fixed" && st.position !== "sticky") continue;
        const r = el.getBoundingClientRect();
        if (r.height > innerHeight * 0.5 && r.width > innerWidth * 0.5) el.style.setProperty("display", "none", "important");
      }
      document.documentElement.style.overflow = "auto";
      document.body.style.overflow = "auto";
    });
    // le animazioni (il mappamondo) hanno bisogno di qualche secondo per disegnare i flussi
    await pagina.waitForTimeout(tel ? 6000 : 2500);
    const alta = await pagina.evaluate((t) => Math.min(document.documentElement.scrollHeight, t), tetto);
    await pagina.setViewportSize({ width: largo, height: Math.max(basso, alta) });
    await pagina.waitForTimeout(tel ? 3000 : 1200);
    await pagina.screenshot({ path: `public/lavori/${id}.jpg`, type: "jpeg", quality: 78 });
    await pagina.setViewportSize({ width: largo, height: basso });
    fatte.push(id);
    console.log("ok", id);
  } catch (e) {
    console.log("non riuscita", id, e.message);
  }
}
await browser.close();
// le schermate aggiunte a mano restano valide
for (const id of ["shop", "blog"]) if (existsSync(`public/lavori/${id}.jpg`)) fatte.push(id);
writeFileSync("content/schermate.json", JSON.stringify(fatte) + "\n");
