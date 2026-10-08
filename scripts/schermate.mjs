// Cattura le pagine dei siti dei lavori in public/lavori/<id>.jpg (pagina intera, fino a 2800 px)
// e scrive in content/schermate.json l'elenco delle catture riuscite.
// Gira nell'azione GitHub .github/workflows/schermate.yml; in locale: node scripts/schermate.mjs
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const lavori = {
  shop: "https://shop.puntoluce.net/",
  osservatorio: "https://osservatorioaccoglienza.org",
  livellozero: "https://livellozero.games",
  ndnluxury: "https://www.ndnluxury.com",
  esh: "https://www.eshousing.com",
  blog: "https://www.puntoluce.net/comefare/",
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
const browser = await chromium.launch();
const pagina = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.75 });
const fatte = [];
for (const [id, url] of Object.entries(lavori)) {
  try {
    await pagina.goto(url, { waitUntil: "networkidle", timeout: 45000 });
    await pagina.addStyleTag({ content: NASCONDI });
    await pagina.waitForTimeout(2500);
    const alta = await pagina.evaluate(() => Math.min(document.documentElement.scrollHeight, 2800));
    await pagina.setViewportSize({ width: 1280, height: Math.max(800, alta) });
    await pagina.waitForTimeout(1200);
    await pagina.screenshot({ path: `public/lavori/${id}.jpg`, type: "jpeg", quality: 78 });
    await pagina.setViewportSize({ width: 1280, height: 800 });
    fatte.push(id);
    console.log("ok", id);
  } catch (e) {
    console.log("non riuscita", id, e.message);
  }
}
await browser.close();
writeFileSync("content/schermate.json", JSON.stringify(fatte) + "\n");
